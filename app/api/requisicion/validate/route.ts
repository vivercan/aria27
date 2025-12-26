import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";

const BASE_URL = "https://aria.jjcrm27.com";
const COMPRAS_EMAIL = "timonfx@hotmail.com";

export async function GET(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const action = searchParams.get("action");

  if (!token) return new Response("<h1>Token invalido</h1>", { headers: { "Content-Type": "text/html" } });

  const { data: req, error } = await supabase.from("requisitions").select("*").eq("authorization_comments", token).single();
  if (error || !req) return new Response("<h1>Requisicion no encontrada</h1>", { headers: { "Content-Type": "text/html" } });

  const { data: items } = await supabase.from("requisition_items").select("*").eq("requisition_id", req.id);
  const { data: comprasUser } = await supabase.from("users").select("*").eq("email", COMPRAS_EMAIL).single();

  const daysUntil = Math.ceil((new Date(req.required_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const urgencyText = daysUntil <= 0 ? "HOY" : daysUntil === 1 ? "MANANA" : `${daysUntil} dias`;
  const urgencyColor = daysUntil <= 2 ? "#ef4444" : daysUntil <= 5 ? "#f59e0b" : "#10b981";
  const fechaReq = new Date(req.required_date).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const materialesHtml = (items || []).map((m: any) => `<tr><td style="padding:10px;border:1px solid #e2e8f0">${m.product_name}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${m.unit}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${m.quantity}</td></tr>`).join("");
  const tablaHtml = `<table style="width:100%;border-collapse:collapse"><thead><tr style="background:#1e3a5f;color:white"><th style="padding:12px;text-align:left">Material</th><th style="padding:12px">Unidad</th><th style="padding:12px">Cantidad</th></tr></thead><tbody>${materialesHtml}</tbody></table>`;

  if (action === "APROBADA") {
    await supabase.from("requisitions").update({ status: "APROBADA" }).eq("id", req.id);

    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>", to: COMPRAS_EMAIL,
      subject: `🛒 COTIZAR: ${req.folio} - ${urgencyText}`,
      html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:#3b82f6;color:white;padding:25px;text-align:center"><h1 style="margin:0">Nueva Requisición para Compras</h1></div><div style="background:${urgencyColor};color:white;padding:20px;text-align:center"><div style="font-size:36px;font-weight:bold">${urgencyText}</div><div>para surtir - ${fechaReq}</div></div><div style="padding:25px"><div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px"><p><strong>Folio:</strong> ${req.folio}</p><p><strong>Obra:</strong> ${req.cost_center_name}</p><p><strong>Solicitante:</strong> ${req.created_by}</p></div>${tablaHtml}<div style="text-align:center;margin-top:30px"><a href="${BASE_URL}/dashboard/supply-desk/requisitions/purchasing" style="display:inline-block;background:#3b82f6;color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold">IR A COTIZAR</a></div></div></div>`
    });

    if (comprasUser?.phone) {
      await sendWhatsAppTemplate("requisicion_compras", [req.folio, req.created_by, req.cost_center_name, urgencyText], comprasUser.phone);
    }

    return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#f0fdf4"><div style="text-align:center;background:white;padding:50px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.1)"><div style="font-size:80px">✅</div><h1 style="color:#10b981">Requisición Validada</h1><p style="color:#64748b">${req.folio}</p><p>Se notificó a Compras (${COMPRAS_EMAIL})</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });

  } else if (action === "RECHAZADA") {
    await supabase.from("requisitions").update({ status: "RECHAZADA" }).eq("id", req.id);

    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>", to: req.user_email,
      subject: `❌ Requisición ${req.folio} RECHAZADA`,
      html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:#ef4444;color:white;padding:25px;text-align:center"><h1 style="margin:0">Requisición Rechazada</h1></div><div style="padding:25px"><p>La requisición <strong>${req.folio}</strong> ha sido rechazada.</p></div></div>`
    });

    return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#fef2f2"><div style="text-align:center;background:white;padding:50px;border-radius:20px"><div style="font-size:80px">❌</div><h1 style="color:#ef4444">Requisición Rechazada</h1><p>${req.folio}</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });
  }

  return new Response("<h1>Accion no valida</h1>", { headers: { "Content-Type": "text/html" } });
}


