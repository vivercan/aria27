import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";

const COMPRAS_EMAIL = "compras@gcuavante.com";

export async function GET(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const action = searchParams.get("action");

  if (!token) return new Response("<h1>Token invalido</h1>", { headers: { "Content-Type": "text/html" } });

  const { data: req, error } = await supabase.from("requisitions").select("*").eq("authorization_comments", token).single();
  if (error || !req) return new Response("<h1>Requisicion no encontrada</h1>", { headers: { "Content-Type": "text/html" } });

  // Obtener datos de Compras
  const { data: comprasUser } = await supabase.from("users").select("*").eq("email", COMPRAS_EMAIL).single();

  if (action === "AUTORIZAR") {
    const { data: lastOC } = await supabase.from("purchase_orders").select("folio").order("created_at", { ascending: false }).limit(1);
    const nextNum = lastOC?.length ? parseInt(lastOC[0].folio.split("-")[2]) + 1 : 1;
    const ocFolio = `OC-${new Date().getFullYear()}-${String(nextNum).padStart(5, "0")}`;

    const { data: items } = await supabase.from("requisition_items").select("*").eq("requisition_id", req.id);
    const total = (items || []).reduce((sum, i) => sum + ((i.selected_price || 0) * i.quantity), 0);

    await supabase.from("purchase_orders").insert({
      folio: ocFolio, requisition_id: req.id, total, status: "AUTORIZADA",
      authorized_by: "juanviverosv@gmail.com", authorized_at: new Date().toISOString()
    });

    await supabase.from("requisitions").update({
      status: "OC_GENERADA", purchase_status: "AUTORIZADA",
      authorized_by: "juanviverosv@gmail.com", authorized_at: new Date().toISOString()
    }).eq("id", req.id);

    const daysUntil = Math.ceil((new Date(req.required_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const urgencyText = daysUntil <= 0 ? "HOY" : daysUntil === 1 ? "MANANA" : `${daysUntil} dias`;
    const urgencyColor = daysUntil <= 2 ? "#ef4444" : daysUntil <= 5 ? "#f59e0b" : "#10b981";
    const fechaReq = new Date(req.required_date).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const itemsHtml = (items || []).map((i: any) => `<tr><td style="padding:8px;border:1px solid #e2e8f0">${i.product_name}</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${i.quantity} ${i.unit}</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:right">$${((i.selected_price || 0) * i.quantity).toLocaleString()}</td></tr>`).join("");

    // EMAIL COMPRAS
    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>", to: COMPRAS_EMAIL,
      subject: `✅ AUTORIZADA: ${ocFolio} - $${total.toLocaleString()} MXN`,
      html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:#10b981;color:white;padding:25px;text-align:center"><h1 style="margin:0">COMPRA AUTORIZADA</h1><p style="font-size:24px;font-weight:bold;margin:5px 0">${ocFolio}</p></div><div style="background:${urgencyColor};color:white;padding:15px;text-align:center"><div style="font-size:32px;font-weight:bold">${urgencyText}</div><div>${fechaReq}</div></div><div style="padding:25px"><div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px"><table style="width:100%"><tr><td style="color:#64748b">Requisición:</td><td style="font-weight:bold">${req.folio}</td></tr><tr><td style="color:#64748b">OC:</td><td style="font-weight:bold;color:#10b981;font-size:18px">${ocFolio}</td></tr><tr><td style="color:#64748b">Obra:</td><td style="font-weight:bold">${req.cost_center_name}</td></tr><tr><td style="color:#64748b">Total:</td><td style="font-weight:bold;font-size:20px">$${total.toLocaleString()} MXN</td></tr></table></div><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#1e3a5f;color:white"><th style="padding:10px;text-align:left">Material</th><th style="padding:10px">Cantidad</th><th style="padding:10px;text-align:right">Subtotal</th></tr></thead><tbody>${itemsHtml}</tbody></table><div style="margin-top:30px;padding:20px;background:#d1fae5;border-radius:8px;text-align:center"><p style="margin:0;color:#065f46;font-weight:bold">Proceder con la compra</p></div></div></div>`
    });

    // WHATSAPP COMPRAS
    if (comprasUser?.phone) {
      await sendWhatsAppTemplate("oc_generada", [req.folio, ocFolio, req.cost_center_name, total.toLocaleString(), urgencyText]);
    }

    return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#f0fdf4"><div style="text-align:center;background:white;padding:50px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.1)"><div style="font-size:80px">✅</div><h1 style="color:#10b981">Compra Autorizada</h1><p style="color:#1e3a5f;font-size:24px;font-weight:bold">${ocFolio}</p><p style="color:#64748b">Requisición: ${req.folio}</p><p style="color:#64748b">Total: $${total.toLocaleString()} MXN</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });

  } else if (action === "RECHAZAR") {
    await supabase.from("requisitions").update({ status: "COMPRA_RECHAZADA", purchase_status: "RECHAZADA" }).eq("id", req.id);

    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>", to: COMPRAS_EMAIL,
      subject: `❌ RECHAZADA: ${req.folio}`,
      html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:#ef4444;color:white;padding:25px;text-align:center"><h1 style="margin:0">COMPRA RECHAZADA</h1></div><div style="padding:25px"><p>La compra para <strong>${req.folio}</strong> fue rechazada.</p></div></div>`
    });

    return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#fef2f2"><div style="text-align:center;background:white;padding:50px;border-radius:20px"><div style="font-size:80px">❌</div><h1 style="color:#ef4444">Compra Rechazada</h1><p>${req.folio}</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });
  }

  return new Response("<h1>Accion no valida</h1>", { headers: { "Content-Type": "text/html" } });
}
