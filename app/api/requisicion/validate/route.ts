import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";

const BASE_URL = "https://aria.jjcrm27.com";
const WHATSAPP_API_URL = "https://graph.facebook.com/v22.0";
const PHONE_NUMBER_ID = "869940452874474";
const TEST_PHONE = "528112392266";

async function sendWhatsAppText(message: string) {
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!ACCESS_TOKEN) return null;
  try {
    const response = await fetch(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: TEST_PHONE,
        type: "text",
        text: { preview_url: true, body: message }
      })
    });
    return await response.json();
  } catch (e) {
    console.error("WhatsApp error:", e);
    return null;
  }
}

export async function GET(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const action = searchParams.get("action");

  if (!token) {
    return new Response("<h1>Token invalido</h1>", { headers: { "Content-Type": "text/html" } });
  }

  const { data: req, error } = await supabase
    .from("requisitions")
    .select("*")
    .eq("authorization_comments", token)
    .single();

  if (error || !req) {
    return new Response("<h1>Requisicion no encontrada o ya procesada</h1>", { headers: { "Content-Type": "text/html" } });
  }

  const { data: items } = await supabase
    .from("requisition_items")
    .select("*")
    .eq("requisition_id", req.id);

  const materialesHtml = (items || []).map((m: any) =>
    `<tr><td style="padding:10px;border:1px solid #e2e8f0">${m.product_name}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${m.unit}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${m.quantity}</td><td style="padding:10px;border:1px solid #e2e8f0">${m.comments || "-"}</td></tr>`
  ).join("");

  const tablaHtml = `<table style="width:100%;border-collapse:collapse"><thead><tr style="background:#1e3a5f;color:white"><th style="padding:12px;text-align:left">Material</th><th style="padding:12px">Unidad</th><th style="padding:12px">Cantidad</th><th style="padding:12px;text-align:left">Observaciones</th></tr></thead><tbody>${materialesHtml}</tbody></table>`;

  const daysUntil = Math.ceil((new Date(req.required_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const urgencyColor = daysUntil <= 2 ? "#ef4444" : daysUntil <= 5 ? "#f59e0b" : "#10b981";
  const urgencyText = daysUntil <= 0 ? "HOY!" : daysUntil === 1 ? "MANANA!" : `${daysUntil} dias`;
  const fechaReq = new Date(req.required_date).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const materialesList = (items || []).map((m: any, i: number) => `${i + 1}. ${m.product_name} - ${m.quantity} ${m.unit}`).join("\n");

  if (action === "APROBADA") {
    await supabase.from("requisitions").update({ status: "APROBADA" }).eq("id", req.id);

    // Email a Compras
    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>",
      to: "juanviverosv@gmail.com",
      subject: `NUEVA COMPRA: ${req.folio} - ${urgencyText} para entregar`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto">
          <div style="background:#3b82f6;color:white;padding:25px;text-align:center">
            <h1 style="margin:0">Nueva Requisicion para Compras</h1>
          </div>
          <div style="background:${urgencyColor};color:white;padding:25px;text-align:center">
            <div style="font-size:14px;opacity:0.9">TIENES</div>
            <div style="font-size:48px;font-weight:bold">${urgencyText}</div>
            <div style="font-size:14px">para surtir este pedido</div>
            <div style="font-size:12px;margin-top:10px;opacity:0.8">Fecha compromiso: ${fechaReq}</div>
          </div>
          <div style="padding:25px">
            <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin-bottom:20px">
              <strong>Accion requerida:</strong> Cotizar y enviar a autorizacion
            </div>
            <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px">
              <table style="width:100%">
                <tr><td style="color:#64748b;padding:5px 0">Folio:</td><td style="font-weight:bold;font-size:18px">${req.folio}</td></tr>
                <tr><td style="color:#64748b;padding:5px 0">Obra/Centro:</td><td style="font-weight:bold">${req.cost_center_name}</td></tr>
                <tr><td style="color:#64748b;padding:5px 0">Solicitante:</td><td>${req.created_by}</td></tr>
              </table>
            </div>
            <h3 style="color:#1e3a5f">Materiales solicitados:</h3>
            ${tablaHtml}
            <div style="text-align:center;margin-top:30px">
              <a href="${BASE_URL}/dashboard/supply-desk/requisitions/purchasing" style="display:inline-block;background:#3b82f6;color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold">IR A COTIZAR</a>
            </div>
          </div>
        </div>
      `
    });

    // WhatsApp a Compras
    await sendWhatsAppText(`*REQUISICION VALIDADA - COTIZAR*

Folio: ${req.folio}
Obra: ${req.cost_center_name}
Solicitante: ${req.created_by}
Urgencia: ${urgencyText}
Para: ${fechaReq}

*Materiales:*
${materialesList}

Favor de cotizar y enviar a autorizacion.

_ARIA27 ERP_`);

    return new Response(`
      <html><head><meta charset="utf-8"><title>Validada</title></head>
      <body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#f0fdf4">
        <div style="text-align:center;background:white;padding:50px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.1)">
          <div style="font-size:80px">✅</div>
          <h1 style="color:#10b981">Requisicion Validada</h1>
          <p style="color:#64748b">Folio: ${req.folio}</p>
          <p style="color:#64748b">Se ha notificado a Compras</p>
        </div>
      </body></html>
    `, { headers: { "Content-Type": "text/html" } });

  } else if (action === "RECHAZADA") {
    await supabase.from("requisitions").update({ status: "RECHAZADA" }).eq("id", req.id);

    // Email al solicitante
    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>",
      to: req.user_email,
      subject: `Requisicion ${req.folio} RECHAZADA`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto">
          <div style="background:#ef4444;color:white;padding:25px;text-align:center">
            <h1 style="margin:0">Requisicion Rechazada</h1>
          </div>
          <div style="padding:25px">
            <p>La requisicion <strong>${req.folio}</strong> ha sido rechazada.</p>
            <p>Contacta al validador para mas informacion.</p>
          </div>
        </div>
      `
    });

    // WhatsApp al solicitante
    await sendWhatsAppText(`*REQUISICION RECHAZADA*

Folio: ${req.folio}
Obra: ${req.cost_center_name}

Tu requisicion ha sido rechazada. Contacta al validador para mas informacion.

_ARIA27 ERP_`);

    return new Response(`
      <html><head><meta charset="utf-8"><title>Rechazada</title></head>
      <body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#fef2f2">
        <div style="text-align:center;background:white;padding:50px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.1)">
          <div style="font-size:80px">❌</div>
          <h1 style="color:#ef4444">Requisicion Rechazada</h1>
          <p style="color:#64748b">Folio: ${req.folio}</p>
        </div>
      </body></html>
    `, { headers: { "Content-Type": "text/html" } });

  } else if (action === "REVISION") {
    await supabase.from("requisitions").update({ status: "EN_REVISION" }).eq("id", req.id);

    // WhatsApp al solicitante
    await sendWhatsAppText(`*REQUISICION EN REVISION*

Folio: ${req.folio}
Obra: ${req.cost_center_name}

Tu requisicion fue devuelta para revision. Revisa los comentarios y vuelve a enviar.

_ARIA27 ERP_`);

    return new Response(`
      <html><head><meta charset="utf-8"><title>En Revision</title></head>
      <body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#fffbeb">
        <div style="text-align:center;background:white;padding:50px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.1)">
          <div style="font-size:80px">↩️</div>
          <h1 style="color:#f59e0b">Devuelta para Revision</h1>
          <p style="color:#64748b">Folio: ${req.folio}</p>
        </div>
      </body></html>
    `, { headers: { "Content-Type": "text/html" } });
  }

  return new Response("<h1>Accion no valida</h1>", { headers: { "Content-Type": "text/html" } });
}
