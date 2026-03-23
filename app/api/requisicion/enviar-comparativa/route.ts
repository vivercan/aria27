import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const body = await req.json();
    const { requisition_id, folio, obra, quotes, items, items_detail, suppliers } = body;

    const { data: director, error: dirError } = await supabase
      .from("Users").select("*").eq("role", "direccion").single();

    if (!director) return NextResponse.json({ error: "No se encontro director" }, { status: 404 });

    const { data: reqData } = await supabase
      .from("Requisiciones").select("created_by, urgency").eq("id", requisition_id).single();
    const solicitante = reqData?.created_by || "N/A";
    const urgencia = reqData?.urgency || "normal";
    const token = crypto.randomUUID();

    await supabase.from("Requisiciones").update({
      status: "EN_AUTORIZACION",
      authorization_comments: token,
      cotizacion_data: { quotes, items, items_detail, suppliers, obra, folio }
    }).eq("id", requisition_id);

    const supList = suppliers || [];
    const itemsDet = items_detail || (items || []).map((name: string) => ({ product_name: name, quantity: 1, unit: "PZA" }));

    const supTotals = supList.map((s: any) => {
      const subtotal = itemsDet.reduce((sum: number, item: any) => sum + ((s.items_prices?.[item.product_name] || 0) * (item.quantity || 1)), 0);
      const iva = subtotal * 0.16;
      return { ...s, subtotal, iva, total: subtotal + iva };
    });
    const bestTot = supTotals.length > 0 ? Math.min(...supTotals.filter((s: any) => s.subtotal > 0).map((s: any) => s.total)) : 0;

    const mejor = supTotals.find((s: any) => s.total === bestTot) || (quotes?.[0] ? quotes.reduce((m: any, q: any) => q.total < m.total ? q : m, quotes[0]) : { supplier: "N/A", total: 0 });

    // Guardar total estimado (mejor proveedor) en Requisiciones para visualizaciÃ³n en Estatus
    if (bestTot > 0) {
      await supabase.from("Requisiciones").update({ monto: bestTot }).eq("id", requisition_id);
    }

    const linkAutorizar = `https://aria.jjcrm27.com/autorizar/${token}`;

    const supH = supTotals.map((s: any) => `<th style="padding:8px;text-align:center;${s.total === bestTot && bestTot > 0 ? "background:#16a34a;color:white" : "background:#1e3a5f;color:white"};font-size:12px;border:1px solid #334155">${s.supplier}</th>`).join("");

    const prodRows = itemsDet.map((item: any, idx: number) => {
      const allP = supTotals.map((s: any) => s.items_prices?.[item.product_name] || 0).filter((p: number) => p > 0);
      const bestP = allP.length > 0 ? Math.min(...allP) : 0;
      const cells = supTotals.map((s: any) => {
        const p = s.items_prices?.[item.product_name] || 0;
        const bg = p > 0 && p === bestP ? "background:#dcfce7;" : s.total === bestTot && bestTot > 0 ? "background:#f0fdf4;" : "";
        return `<td style="padding:6px 8px;text-align:right;border:1px solid #e2e8f0;font-size:12px;${bg}">${p > 0 ? "$ " + p.toLocaleString("es-MX", {minimumFractionDigits: 2}) : "-"}</td>`;
      }).join("");
      return `<tr><td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:12px">${idx+1}</td><td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:12px">${item.product_name}</td><td style="padding:6px 8px;text-align:center;border:1px solid #e2e8f0;font-size:12px">${item.quantity}</td><td style="padding:6px 8px;text-align:center;border:1px solid #e2e8f0;font-size:12px">${item.unit || "PZA"}</td>${cells}</tr>`;
    }).join("");

    const mkRow = (lbl: string, fn: (s: any) => number, bold: boolean) => `<tr><td colspan="4" style="padding:6px 8px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;font-size:12px">${lbl}</td>${supTotals.map((s: any) => { const v = fn(s); const bg = s.total === bestTot && bestTot > 0 ? (bold ? "background:#16a34a;color:white;" : "background:#dcfce7;") : ""; return `<td style="padding:6px 8px;text-align:right;border:1px solid #e2e8f0;${bold?"font-weight:bold;":""}font-size:12px;${bg}">$ ${v.toLocaleString("es-MX",{minimumFractionDigits:2})}</td>`; }).join("")}</tr>`;

    const rebajaR = `<tr><td colspan="4" style="padding:6px 8px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;font-size:12px;color:#7c3aed">Â¿REBAJAN IVA?</td>${supTotals.map((s: any) => `<td style="padding:6px 8px;text-align:center;border:1px solid #e2e8f0;font-weight:bold;${s.rebaja_iva ? "background:#16a34a;color:white" : "background:#dc2626;color:white"}">${s.rebaja_iva ? "SI" : "NO"}</td>`).join("")}</tr>`;
    const obsR = `<tr><td colspan="4" style="padding:6px 8px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;font-size:12px">OBSERVACIONES</td>${supTotals.map((s: any) => `<td style="padding:6px 8px;text-align:center;border:1px solid #e2e8f0;font-size:11px">${s.observaciones || s.entrega || "-"}</td>`).join("")}</tr>`;

    const emailHTML = `<div style="font-family:Arial;max-width:900px;margin:0 auto"><div style="background:#1e3a5f;padding:15px;text-align:center;border-radius:8px 8px 0 0"><h1 style="color:white;margin:0;font-size:20px">COMPARATIVA DE COTIZACIONES</h1><p style="color:#93c5fd;margin:4px 0 0;font-size:14px">REQ ${folio} ${obra}</p></div><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f1f5f9"><th style="padding:8px;border:1px solid #e2e8f0;font-size:11px">#</th><th style="padding:8px;text-align:left;border:1px solid #e2e8f0;font-size:11px;color:#7c3aed">PRODUCTO</th><th style="padding:8px;border:1px solid #e2e8f0;font-size:11px;color:#7c3aed">CANT</th><th style="padding:8px;border:1px solid #e2e8f0;font-size:11px;color:#7c3aed">UNIDAD</th>${supH}</tr></thead><tbody>${prodRows}${mkRow("SUBTOTAL",(s: any)=>s.subtotal,false)}${mkRow("I.V.A. (16%)",(s: any)=>s.iva,false)}${mkRow("TOTAL",(s: any)=>s.total,true)}${rebajaR}${obsR}</tbody></table><div style="text-align:center;padding:20px"><a href="${linkAutorizar}" style="display:inline-block;padding:14px 48px;background:#1e3a5f;color:white;text-decoration:none;border-radius:6px;font-weight:bold">VER COMPARATIVA Y AUTORIZAR</a></div><p style="text-align:center;color:#94a3b8;font-size:10px">ARIA27 - Grupo Cuavante</p></div>`;

    await resend.emails.send({ from: "ARIA27 <noreply@mail.jjcrm27.com>", to: director.email, subject: `Comparativa: ${folio} - ${obra} (${supList.length || quotes?.length || 0} proveedores)`, html: emailHTML });

    if (director.phone) {
      const { sendWhatsAppTemplate } = await import("@/lib/whatsapp");
      const mejorText = `${mejor.supplier} $${(mejor.total || mejor.subtotal || 0).toLocaleString?.() || 0}`;
      await sendWhatsAppTemplate(
        "comparativa_enviar",
        [folio, obra, mejorText, String(supList.length || quotes?.length || 0)],
        director.phone,
        token
      );
    }

    return NextResponse.json({ success: true, enviado_a: director.email });
  } catch (error: any) {
    console.error("[COMPARATIVA] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         }
