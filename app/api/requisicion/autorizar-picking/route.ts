import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendWhatsAppLogged } from "@/lib/whatsapp";
import { logger } from "@/lib/logger";
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

export async function POST(req: Request) {
  try {
    // Validación básica: verificar que el request viene con datos esperados
    const body = await req.json();
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

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Group by supplier
    const grouped: Record<string, any[]> = {};
    for (const sel of selections) {
      if (!grouped[sel.supplier_name]) grouped[sel.supplier_name] = [];
      grouped[sel.supplier_name].push(sel);
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
      const total = supplierItems.reduce((s: number, i: any) => s + (i.total_price || 0), 0);

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

    // WhatsApp â usar template aprobado oc_generada
    if (compras?.phone) {
      const firstOcFolio = ocFolios[0]?.split(" - ")[0] || "OC";
      await sendWhatsAppLogged(
        "oc_generada",
        [folio, firstOcFolio, obra || "N/A", `$${grandTotal.toLocaleString()}`, urgency || "normal"],
        compras.phone,
        { origen: "oc-generada-picking", enviadoPor: "autorizar-picking" }
      );
    }

    // Email
    if (compras?.email) {
      try {
        const emailResult = await resend.emails.send({
          from: "ARIA27 <noreply@mail.jjcrm27.com>",
          to: compras.email,
          subject: `Compra Autorizada ${folio} - ${obra || "N/A"} ($${grandTotal.toLocaleString()})`,
          html: `
            <div style="font-family:Arial;max-width:600px;margin:0 auto;background:#0f172a;color:white;padding:30px;border-radius:8px;">
              <div style="text-align:center;margin-bottom:20px;">
                <div style="font-size:28px;font-weight:900;letter-spacing:2px;color:#22d3ee">ARIA</div>
                <div style="font-size:10px;text-transform:uppercase;color:#94a3b8;letter-spacing:3px">Operations OS</div>
              </div>
              <div style="background:#064e3b;padding:15px;border-radius:8px;text-align:center;margin-bottom:20px;">
                <p style="margin:0;font-size:20px;font-weight:bold;color:#34d399">COMPRA AUTORIZADA</p>
              </div>
              <p><strong style="color:#94a3b8">Requisici&oacute;n:</strong> ${folio}</p>
              <p><strong style="color:#94a3b8">Obra:</strong> ${obra || "N/A"}</p>
              <p><strong style="color:#94a3b8">Total:</strong> <span style="color:#34d399;font-size:20px;font-weight:bold">$${grandTotal.toLocaleString()}</span></p>
              <hr style="border-color:#334155;margin:20px 0">
              <p style="color:#94a3b8;font-weight:bold">&Oacute;rdenes de Compra:</p>
              ${Object.entries(grouped).map(([name, sitems]: [string, any[]]) => {
                const t = sitems.reduce((s: number, i: any) => s + (i.total_price || 0), 0);
                return `<div style="background:#1e293b;padding:12px;border-radius:6px;margin:8px 0">
                  <p style="margin:0;color:white;font-weight:bold">${name} - $${t.toLocaleString()}</p>
                  ${sitems.map((i: any) => `<p style="margin:4px 0 0;color:#94a3b8;font-size:13px">&bull; ${i.product_name} (${i.quantity} ${i.unit}) @ $${(i.unit_price || 0).toLocaleString()}</p>`).join("")}
                </div>`;
              }).join("")}
            </div>
          `
        });
        if ((emailResult as any)?.error) {
          log.error("Email compras error", { folio, error: (emailResult as any).error?.message });
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
