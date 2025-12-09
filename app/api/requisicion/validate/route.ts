import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const action = searchParams.get("action") as "APROBADA" | "RECHAZADA" | "REVISION";

  if (!token || !action) {
    return new NextResponse(htmlPage("Error", "Parametros invalidos", "#ef4444"), { headers: { "Content-Type": "text/html" } });
  }

  try {
    const { data: req, error } = await supabase
      .from("requisitions")
      .select("*")
      .eq("authorization_comments", token)
      .single();

    if (error || !req) {
      return new NextResponse(htmlPage("Error", "Requisicion no encontrada o ya procesada", "#ef4444"), { headers: { "Content-Type": "text/html" } });
    }

    if (req.status !== "PENDIENTE") {
      return new NextResponse(htmlPage("Ya procesada", "Esta requisicion ya fue " + req.status.toLowerCase(), "#f59e0b"), { headers: { "Content-Type": "text/html" } });
    }

    await supabase.from("requisitions").update({
      status: action,
      authorized_by: "vivercan@yahoo.com",
      authorized_at: new Date().toISOString(),
      authorization_comments: action === "REVISION" ? "Devuelta para revision" : null
    }).eq("id", req.id);

    const { data: items } = await supabase
      .from("requisition_items")
      .select("*")
      .eq("requisition_id", req.id);

    const materialesHtml = (items || []).map((m: any) =>
      `<tr><td style="padding:8px;border:1px solid #ddd">${m.product_name}</td><td style="padding:8px;border:1px solid #ddd;text-align:center">${m.unit}</td><td style="padding:8px;border:1px solid #ddd;text-align:center">${m.quantity}</td><td style="padding:8px;border:1px solid #ddd">${m.observations || "-"}</td></tr>`
    ).join("");

    const tablaHtml = `<table style="width:100%;border-collapse:collapse;margin:20px 0"><tr style="background:#1e3a5f;color:white"><th style="padding:10px;text-align:left">Material</th><th style="padding:10px">Unidad</th><th style="padding:10px">Cantidad</th><th style="padding:10px">Observaciones</th></tr>${materialesHtml}</table>`;

    const statusText = action === "APROBADA" ? "VALIDADA" : action === "RECHAZADA" ? "RECHAZADA" : "DEVUELTA PARA REVISION";
    const statusColor = action === "APROBADA" ? "#10b981" : action === "RECHAZADA" ? "#ef4444" : "#f59e0b";
    const fechaReq = req.required_date ? new Date(req.required_date).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "No especificada";

    if (action === "APROBADA") {
      await supabase.from("requisitions").update({ purchase_status: "POR_COTIZAR" }).eq("id", req.id);
      
      await resend.emails.send({
        from: "ARIA27 <noreply@mail.jjcrm27.com>",
        to: "juanviverosv@gmail.com",
        subject: `COMPRAS: Requisicion ${req.folio} lista para cotizar`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#2563eb;color:white;padding:20px;text-align:center">
            <h1 style="margin:0">Nueva Requisicion para Compras</h1>
          </div>
          <div style="padding:20px;background:#f8fafc">
            <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin-bottom:20px">
              <strong>FECHA REQUERIDA:</strong> ${fechaReq}
            </div>
            <div style="background:white;padding:15px;border-radius:8px;margin-bottom:20px">
              <p style="margin:5px 0"><strong>Folio:</strong> ${req.folio}</p>
              <p style="margin:5px 0"><strong>Obra/Centro:</strong> ${req.cost_center_name}</p>
              <p style="margin:5px 0"><strong>Solicitante:</strong> ${req.created_by}</p>
              ${req.instructions ? `<p style="margin:5px 0"><strong>Instrucciones:</strong> ${req.instructions}</p>` : ""}
            </div>
            <h3>Materiales solicitados:</h3>
            ${tablaHtml}
            <div style="text-align:center;margin-top:20px">
              <a href="https://aria.jjcrm27.com/dashboard/supply-desk/requisitions/purchasing" style="display:inline-block;background:#2563eb;color:white;padding:12px 30px;text-decoration:none;border-radius:25px;font-weight:bold">Ir a Compras</a>
            </div>
          </div>
        </div>`
      });
    }

    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>",
      to: "recursos.humanos@gcuavante.com",
      subject: `Requisicion ${req.folio} ${statusText}`,
      html: `<div style="font-family:Arial,sans-serif"><div style="background:${statusColor};color:white;padding:20px;text-align:center"><h1>Requisicion ${statusText}</h1></div><div style="padding:20px"><p><strong>Folio:</strong> ${req.folio}</p><p><strong>Obra:</strong> ${req.cost_center_name}</p><p><strong>Fecha requerida:</strong> ${fechaReq}</p>${tablaHtml}</div></div>`
    });

    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>",
      to: req.created_by,
      subject: `Tu requisicion ${req.folio} fue ${statusText}`,
      html: `<div style="font-family:Arial,sans-serif"><div style="background:${statusColor};color:white;padding:20px;text-align:center"><h1>Requisicion ${statusText}</h1></div><div style="padding:20px"><p><strong>Folio:</strong> ${req.folio}</p><p><strong>Estado:</strong> ${statusText}</p>${tablaHtml}</div></div>`
    });

    return new NextResponse(htmlPage("Listo", "Requisicion " + statusText + ". Folio: " + req.folio, statusColor), { headers: { "Content-Type": "text/html" } });

  } catch (error: any) {
    console.error("Error:", error);
    return new NextResponse(htmlPage("Error", error.message, "#ef4444"), { headers: { "Content-Type": "text/html" } });
  }
}

function htmlPage(title: string, message: string, color: string) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ARIA27</title></head><body style="font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#0f172a"><div style="text-align:center;padding:40px;background:white;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,0.3)"><div style="width:80px;height:80px;border-radius:50%;background:${color};margin:0 auto 20px;display:flex;align-items:center;justify-content:center"><span style="font-size:40px;color:white">${color==="#10b981"?"✓":"!"}</span></div><h1 style="margin:0 0 10px;color:#0f172a">${title}</h1><p style="color:#64748b;margin:0">${message}</p><a href="https://aria.jjcrm27.com" style="display:inline-block;margin-top:20px;padding:10px 20px;background:#0f172a;color:white;text-decoration:none;border-radius:8px">Ir a ARIA27</a></div></body></html>`;
}
