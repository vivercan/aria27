import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
const supabase = getSupabaseAdmin();
import { sendWhatsAppFallback } from "@/lib/whatsapp";
import { sendEmailLogged } from "@/lib/email-log";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
const log = logger("REGISTRAR-ENTREGA");

interface Material {
  product_name?: string;
  producto?: string;
  quantity?: number;
  cantidad_recibida?: number;
  unit?: string;
  unidad?: string;
}

async function sendEmail(to: string, subject: string, html: string, enviadoPor?: string) {
  await sendEmailLogged({
    template: "requisicion_entrega_registrada",
    to,
    subject,
    html,
    origen: "req-entrega-registrada",
    enviadoPor: enviadoPor || "registrar-entrega",
  });
}

// PL07 17-Abr-2026: aplica materiales a inventario_obra vía RPC atómico.
// Reemplaza el read-then-write que tenía race condition bajo entregas concurrentes.
// Requiere migración sql/pl06-pl07-atomic-rpcs.sql aplicada en Supabase.
async function actualizarInventario(obraId: number, obraNombre: string, materiales: Material[]): Promise<{ ok: number; errors: number }> {
  const { data, error } = await supabase.rpc("aplicar_entrega_inventario", {
    p_obra_id: obraId,
    p_obra_nombre: obraNombre,
    p_materiales: materiales,
  });

  if (error) {
    log.error("[INVENTARIO] RPC aplicar_entrega_inventario fail", { obraId, error: error.message });
    return { ok: 0, errors: materiales.length };
  }

  const r = data as { ok?: number; errors?: number } | null;
  return { ok: r?.ok ?? 0, errors: r?.errors ?? 0 };
}

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(getClientIdentifier(req), { key: "req:entrega", ...RATE_LIMITS.WRITE });
    if (!rl.allowed) return rateLimitResponse(rl);

    const body = await req.json().catch(() => ({}));
    const {
      purchase_order_id,
      purchase_order_folio,
      supplier_name,
      obra_id,
      obra_nombre,
      materiales,
      requisition_id,
      solicitante_email,
      solicitante_phone,
      user_email,
      recibido_por_nombre,  // B3 fix: UI lo envía pero API lo ignoraba — hardcodeaba "Pendiente confirmar"
    } = body;

    // Validación básica de datos requeridos
    if (!purchase_order_folio || !materiales || materiales.length === 0) {
      return NextResponse.json({ error: "Faltan datos requeridos (purchase_order_folio, materiales)" }, { status: 400 });
    }

    // P0 hardening 7-Abr-2026: auth OBLIGATORIA
    if (!user_email) {
      log.warn("[REGISTRAR-ENTREGA] user_email ausente - 401");
      return NextResponse.json({ error: "user_email requerido" }, { status: 401 });
    }
    const { data: callerUser } = await supabase.from("Users").select("role,active").eq("email", user_email).single();
    if (!callerUser || callerUser.active === false || !["admin", "compras", "almacen", "rh"].includes(callerUser.role)) {
      log.warn(`[REGISTRAR-ENTREGA] denegado para ${user_email} (rol=${callerUser?.role})`);
      return NextResponse.json({ error: "No autorizado para registrar entregas" }, { status: 403 });
    }

    // Generar folio de entrega
    const { count, error: countErr } = await supabase.from("entregas").select("*", { count: "exact", head: true });
    if (countErr) log.error("[REGISTRAR-ENTREGA] Error obteniendo count:", countErr.message);
    const folioEntrega = `ENT-${String((count || 0) + 1).padStart(5, "0")}`;

    // Crear registro de entrega
    const { data: entrega, error } = await supabase.from("entregas").insert({
      folio: folioEntrega,
      fecha_entrega: new Date().toISOString().split("T")[0],
      hora_entrega: new Date().toTimeString().slice(0, 5),
      proveedor_nombre: supplier_name,
      obra_nombre: obra_nombre,
      recibido_por_nombre: recibido_por_nombre || "Pendiente confirmar",
      status: "COMPLETA",
      materiales_recibidos: materiales,
      purchase_order_id: purchase_order_id || null,
      purchase_order_folio,
      solicitante_email,
    }).select().single();

    if (error) throw error;

    // Actualizar inventario
    let inventarioResult = { ok: 0, errors: 0 };
    let obraIdFinal = obra_id;

    if (!obraIdFinal && obra_nombre) {
      const { data: obraData } = await supabase
        .from("centros_trabajo")
        .select("id")
        .eq("nombre", obra_nombre)
        .single();
      obraIdFinal = obraData?.id;

      if (!obraData) {
        log.warn("[ENTREGA] Obra no encontrada en centros_trabajo:", obra_nombre);
      }
    }

    if (obraIdFinal && materiales && materiales.length > 0) {
      inventarioResult = await actualizarInventario(obraIdFinal, obra_nombre, materiales);
      if (inventarioResult.errors > 0) {
        log.warn("[ENTREGA] Inventario parcialmente actualizado", { ok: inventarioResult.ok, errors: inventarioResult.errors, obraIdFinal });
      }
    } else {
      log.warn("[ENTREGA] Sin obra_id o sin materiales - inventario no actualizado", { obra_id: obraIdFinal, materiales: materiales?.length });
    }

    // WhatsApp con plantilla al solicitante
    if (solicitante_phone) {
      await sendWhatsAppFallback(
        "entrega_material",
        [purchase_order_folio, obra_nombre || "N/A", supplier_name || "N/A", folioEntrega],
        solicitante_phone,
        `📦 *Material Entregado*\n\n🛒 OC: ${purchase_order_folio}\n🏗️ Obra: ${obra_nombre || "N/A"}\n🏪 Proveedor: ${supplier_name || "N/A"}\n📄 Folio entrega: ${folioEntrega}\n\n✅ Registrado en ARIA27`,
        { origen: "entrega-material", enviadoPor: solicitante_email || "registrar-entrega" }
      );
    }

    // Email al solicitante
    if (solicitante_email) {
      const inventarioHtml = inventarioResult.ok > 0
        ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Inventario:</td><td style="padding:8px;border-bottom:1px solid #eee;"><strong style="color:#10b981;">${inventarioResult.ok} items actualizados &#x2713;${inventarioResult.errors > 0 ? ` (${inventarioResult.errors} con error)` : ""}</strong></td></tr>`
        : `<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Inventario:</td><td style="padding:8px;border-bottom:1px solid #eee;"><span style="color:#f59e0b;">Pendiente de procesar</span></td></tr>`;

      await sendEmail(
        solicitante_email,
        `&#x2705; Material Recibido - ${purchase_order_folio}`,
        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#10b981;">&#x2705; Material Recibido</h2>
          <p>Tu material de la orden <strong>${purchase_order_folio}</strong> ha sido recibido.</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Obra:</td><td style="padding:8px;border-bottom:1px solid #eee;"><strong>${obra_nombre || "N/A"}</strong></td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Proveedor:</td><td style="padding:8px;border-bottom:1px solid #eee;"><strong>${supplier_name || "N/A"}</strong></td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Entrega:</td><td style="padding:8px;border-bottom:1px solid #eee;"><strong>${folioEntrega}</strong></td></tr>
            ${inventarioHtml}
          </table>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
          <p style="color:#999;font-size:12px;">ARIA27 - Grupo Constructor Urbano Avante</p>
        </div>`
      );
    }

    return NextResponse.json({
      success: true,
      entrega,
      folio: folioEntrega,
      inventario_actualizado: inventarioResult.ok,
      inventario_errores: inventarioResult.errors,
      obra_id_usado: obraIdFinal
    });
  } catch (error: unknown) {
    log.error("[REGISTRAR-ENTREGA]", error);
    return NextResponse.json({ error: (error as {message?: string})?.message || "Unknown error" }, { status: 500 });
  }
}
