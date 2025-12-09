import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";


const BASE_URL = "https://aria.jjcrm27.com";

export async function GET(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const action = searchParams.get("action");

  if (!token) {
    return new Response("<h1>Token inválido</h1>", { headers: { "Content-Type": "text/html" } });
  }

  const { data: req, error } = await supabase
    .from("requisitions")
    .select("*")
    .eq("authorization_comments", token)
    .single();

  if (error || !req) {
    return new Response("<h1>Requisición no encontrada o ya procesada</h1>", { headers: { "Content-Type": "text/html" } });
  }

  // Obtener items
  const { data: items } = await supabase
    .from("requisition_items")
    .select("*")
    .eq("requisition_id", req.id);

  const materialesHtml = (items || []).map((m: any) =>
    `<tr><td style="padding:10px;border:1px solid #e2e8f0">${m.product_name}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${m.unit}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${m.quantity}</td><td style="padding:10px;border:1px solid #e2e8f0">${m.comments || "-"}</td></tr>`
  ).join("");

  const tablaHtml = `<table style="width:100%;border-collapse:collapse"><thead><tr style="background:#1e3a5f;color:white"><th style="padding:12px;text-align:left">Material</th><th style="padding:12px">Unidad</th><th style="padding:12px">Cantidad</th><th style="padding:12px;text-align:left">Observaciones</th></tr></thead><tbody>${materialesHtml}</tbody></table>`;

  // Calcular deadline
  const daysUntil = Math.ceil((new Date(req.required_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const urgencyColor = daysUntil <= 2 ? "#ef4444" : daysUntil <= 5 ? "#f59e0b" : "#10b981";
  const urgencyText = daysUntil <= 0 ? "¡HOY!" : daysUntil === 1 ? "¡MAÑANA!" : `${daysUntil} días`;
  const fechaReq = new Date(req.required_date).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  if (action === "APROBADA") {
    await supabase.from("requisitions").update({ status: "APROBADA" }).eq("id", req.id);

    // Email a Compras con deadline claro
    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>",
      to: "juanviverosv@gmail.com",
      subject: `🛒 NUEVA COMPRA: ${req.folio} - ${urgencyText} para entregar`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto">
          <div style="background:#3b82f6;color:white;padding:25px;text-align:center">
            <h1 style="margin:0">Nueva Requisición para Compras</h1>
          </div>
          
          <div style="background:${urgencyColor};color:white;padding:25px;text-align:center">
            <div style="font-size:14px;opacity:0.9">⏰ TIENES</div>
            <div style="font-size:48px;font-weight:bold">${urgencyText}</div>
            <div style="font-size:14px">para surtir este pedido</div>
            <div style="font-size:12px;margin-top:10px;opacity:0.8">Fecha compromiso: ${fechaReq}</div>
          </div>
          
          <div style="padding:25px">
            <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin-bottom:20px">
              <strong>⚡ Acción requerida:</strong> Cotizar y enviar a autorización
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
            
            <div style="text-align:center;margin:30px 0">
              <a href="${BASE_URL}/dashboard/supply-desk/requisitions/purchasing" style="display:inline-block;background:#3b82f6;color:white;padding:18px 50px;text-decoration:none;border-radius:30px;font-weight:bold;font-size:16px">
                Ir a Compras
              </a>
            </div>
          </div>
        </div>
      `
    });

    return new Response(`
      <html><head><meta charset="UTF-8"><title>Validada</title></head>
      <body style="font-family:Arial;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f1f5f9">
        <div style="text-align:center;background:white;padding:50px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.1)">
          <div style="width:80px;height:80px;background:#10b981;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
            <span style="font-size:40px;color:white">✓</span>
          </div>
          <h1 style="color:#10b981">REQUISICIÓN VALIDADA</h1>
          <p style="color:#64748b">${req.folio}</p>
          <p style="color:#64748b">Se ha enviado a Compras para cotización</p>
        </div>
      </body></html>
    `, { headers: { "Content-Type": "text/html; charset=utf-8" } });

  } else if (action === "RECHAZADA") {
    await supabase.from("requisitions").update({ status: "RECHAZADA" }).eq("id", req.id);
    return new Response(`
      <html><head><meta charset="UTF-8"><title>Rechazada</title></head>
      <body style="font-family:Arial;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f1f5f9">
        <div style="text-align:center;background:white;padding:50px;border-radius:20px">
          <div style="width:80px;height:80px;background:#ef4444;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
            <span style="font-size:40px;color:white">✗</span>
          </div>
          <h1 style="color:#ef4444">REQUISICIÓN RECHAZADA</h1>
          <p style="color:#64748b">${req.folio}</p>
        </div>
      </body></html>
    `, { headers: { "Content-Type": "text/html; charset=utf-8" } });

  } else if (action === "REVISION") {
    await supabase.from("requisitions").update({ status: "REVISION" }).eq("id", req.id);
    return new Response(`
      <html><head><meta charset="UTF-8"><title>Devuelta</title></head>
      <body style="font-family:Arial;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f1f5f9">
        <div style="text-align:center;background:white;padding:50px;border-radius:20px">
          <div style="width:80px;height:80px;background:#f59e0b;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
            <span style="font-size:40px;color:white">↩</span>
          </div>
          <h1 style="color:#f59e0b">REQUISICIÓN DEVUELTA</h1>
          <p style="color:#64748b">${req.folio}</p>
          <p style="color:#64748b">Se ha notificado al solicitante</p>
        </div>
      </body></html>
    `, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  return new Response("<h1>Acción no válida</h1>", { headers: { "Content-Type": "text/html" } });
}

