import { RESEND_FROM } from "@/lib/email-config";
import { NextResponse, NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { sendWhatsAppLogged } from "@/lib/whatsapp";
import { ariaEmailHeader, ariaEmailFooter, ariaEmailWrapper } from "@/lib/email-templates";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
const log = logger("AUTORIZAR-PICKING");

// Status enum para flujo de requisiciones
const REQUISITION_STATUS = {
  PENDIENTE: "PENDIENTE",
  APROBADA: "APROBADA",
  EN_COTIZACION: "EN_COTIZACION",
  EN_AUTORIZACION: "EN_AUTORIZACION",
  AUTORIZADA: "AUTORIZADA",
  OC_GENERADA: "OC_GENERADA",
  RECHAZADA: "RECHAZADA",
  RECHAZADA_DIRECCION: "RECHAZADA_DIRECCION",
} as const;

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  try {
    const rl = checkRateLimit(getClientIdentifier(req), { key: "req:auth-picking", ...RATE_LIMITS.WRITE });
    if (!rl.allowed) return rateLimitResponse(rl);

    // Validación básica: verificar que el request viene con datos esperados
    const body = await req.json().catch(() => ({}));
    const { requisition_id, folio, obra, urgency, selections, user_email } = body;

    if (!requisition_id || !selections || selections.length === 0) {
      return NextResponse.json({ error: "Faltan datos requeridos (requisition_id, selections)" }, { status: 400 });
    }

    // P0 hardening 7-Abr-2026: auth OBLIGATORIA (no opt-in)
    if (!user_email) {
      log.warn("[AUTORIZAR-PICKING] user_email ausente - 401");
      return NextResponse.json({ error: "user_email requerido" }, { status: 401 });
    }
    const { data: callerUser } = await supabase.from("Users").select("role,active").eq("email", user_email).single();
    if (!callerUser || callerUser.active === false || !["admin", "compras", "direccion"].includes(callerUser.role)) {
      log.warn(`[AUTORIZAR-PICKING] denegado para ${user_email} (rol=${callerUser?.role})`);
      return NextResponse.json({ error: "No autorizado para esta acción" }, { status: 403 });
    }

    const { getResend } = await import("@/lib/resend");
    const resend = getResend();

    interface Selection {
      supplier_name: string;
      item_id?: string | number;
      total_price?: number;
      unit_price?: number;
      forma_pago?: string;
      dias_credito?: number;
      product_name?: string;
      quantity?: number;
      unit?: string;
      [key: string]: unknown;
    }

    // Group by supplier
    const grouped: Record<string, Selection[]> = {};
    for (const sel of selections) {
      if (!grouped[sel.supplier_name]) grouped[sel.supplier_name] = [];
      grouped[sel.supplier_name].push(sel as Selection);
    }

    // Get next OC number using sequence table (atomic)
    let nextNum: number;
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("increment_sequence", { seq_id: "OC" });
      if (!rpcError && rpcData !== null) {
        nextNum = typeof rpcData === "number" ? rpcData : rpcData.current_value;
      } else {
        // Fallback: read count
        const { count } = await supabase.from("purchase_orders").select("*", { count: "exact", head: true });
        nextNum = (count || 0) + 1;
      }
    } catch {
      const { count } = await supabase.from("purchase_orders").select("*", { count: "exact", head: true });
      nextNum = (count || 0) + 1;
    }

    const ocFolios: string[] = [];
    let grandTotal = 0;

    // Create one PO per supplier
    for (const [supplierName, supplierItems] of Object.entries(grouped)) {
      const ocFolio = `OC-${new Date().getFullYear()}-${String(nextNum).padStart(5, "0")}`;
      const total = supplierItems.reduce((s: number, i: Selection) => s + (i.total_price || 0), 0);

      if (total <= 0) {
        log.warn(`[AUTORIZAR-PICKING] Proveedor ${supplierName} con total $0 â verificar precios`);
      }

      grandTotal += total;

      const { error: poError } = await supabase.from("purchase_orders").insert({
        folio: ocFolio,
        requisition_id: Number(requisition_id),
        supplier_name: supplierName,
        obra_nombre: obra || null,
        total: total,
        status: "GENERADA",
        payment_method: supplierItems[0].forma_pago || "Transferencia",
        credit_days: supplierItems[0].dias_credito || 0,
        created_by: user_email || "direccion",
        authorized_by: user_email || "direccion",
        authorized_at: new Date().toISOString(),
      });
      if (poError) throw new Error(`Error creando OC ${ocFolio}: ${poError?.message}`);

      // Update each item with selected supplier and price
      for (const item of supplierItems) {
        const { error: itemErr } = await supabase.from("requisition_items").update({
          selected_supplier_name: supplierName,
          selected_price: item.unit_price || 0,
        }).eq("id", item.item_id);
        if (itemErr) log.error(`[AUTORIZAR-PICKING] Error item ${item.item_id}:`, itemErr.message);
      }

      ocFolios.push(`${ocFolio} - ${supplierName}: $${total.toLocaleString()}`);
      nextNum++;
    }

    // Update requisition status
    const { error: reqError } = await supabase.from("requisitions").update({
      status: REQUISITION_STATUS.OC_GENERADA,
    }).eq("id", requisition_id);
    if (reqError) throw new Error(`Error actualizando requisición: ${reqError?.message}`);

    // Notify Compras
    const { data: compras } = await supabase.from("Users").select("*").eq("role", "compras").single();

    // WhatsApp — template oc_generada (6 params: Req, OC, Obra, Proveedor, Total, FormaPago)
    if (compras?.phone) {
      const firstOcFolio = ocFolios[0]?.split(" - ")[0] || "OC";
      const supplierNames = Object.keys(grouped);
      const firstSupplierName = supplierNames.length === 1
        ? supplierNames[0]
        : `${supplierNames[0]} (+${supplierNames.length - 1})`;
      const firstFormaPago = Object.values(grouped)[0]?.[0]?.forma_pago || "Transferencia";
      await sendWhatsAppLogged(
        "oc_generada",
        [folio, firstOcFolio, obra || "N/A", firstSupplierName, `$${grandTotal.toLocaleString()}`, firstFormaPago],
        compras.phone,
        { origen: "oc-generada-picking", enviadoPor: "autorizar-picking" }
      );
    }

    // Email
    if (compras?.email) {
      try {
        const emailResult = await resend.emails.send({
          from: RESEND_FROM,
          to: compras.email,
          subject: `Compra Autorizada ${folio} - ${obra || "N/A"} ($${grandTotal.toLocaleString()})`,
          html: ariaEmailWrapper(ariaEmailHeader("Compra autorizada") + `<div style="padding:25px;font-size:13px;color:#1e293b;line-height:1.55"><div style="background:#f0fdf4;border:2px solid #10b981;border-radius:8px;padding:18px;margin-bottom:18px;text-align:center"><p style="margin:0;font-size:18px;font-weight:bold;color:#10b981">COMPRA AUTORIZADA</p></div><div style="background:#f8fafc;border-radius:6px;padding:14px;margin-bottom:14px"><p style="margin:0"><strong>Requisicion:</strong> ${folio}</p><p style="margin:6px 0 0"><strong>Obra:</strong> ${obra || "N/A"}</p><p style="margin:6px 0 0"><strong>Total:</strong> <span style="color:#10b981;font-size:18px;font-weight:bold">$${grandTotal.toLocaleString()}</span></p></div><p style="color:#475569;font-weight:600;margin:14px 0 8px">Ordenes de compra:</p>${Object.entries(grouped).map(([name, sitems]: [string, unknown[]]) => { const t = (sitems as Array<{total_price?: number}>).reduce((s: number, i) => s + (i.total_price || 0), 0); return `<div style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px;border-radius:6px;margin:6px 0"><p style="margin:0;color:#0f172a;font-weight:bold">${name} - $${t.toLocaleString()}</p>${(sitems as Array<{product_name?: string; quantity?: number; unit?: string; unit_price?: number}>).map((i) => `<p style="margin:4px 0 0;color:#475569;font-size:12px">&bull; ${i.product_name} (${i.quantity} ${i.unit}) @ $${(i.unit_price || 0).toLocaleString()}</p>`).join("")}</div>`; }).join("")}</div>` + ariaEmailFooter())
        });
        if ((emailResult as Record<string, unknown>)?.error) {
          log.error("Email compras error", { folio, error: ((emailResult as Record<string, unknown>).error as Record<string, unknown>)?.message });
        }
      } catch (emailErr: unknown) {
        log.error("Email compras exception", { folio, error: (emailErr as Error).message });
      }
    }

    return NextResponse.json({ success: true, purchase_orders: ocFolios.length, folios: ocFolios });
  } catch (error: unknown) {
    log.error("[AUTORIZAR-PICKING]", error);
    return NextResponse.json({ error: (error as Error)?.message || "Error interno" }, { status: 500 });
  }
}
