import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://yhylkvpynzyorqortbkk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0MzQzNzAsImV4cCI6MjA0OTAxMDM3MH0.SBHH6fHuhGPOwGMDVCVNDzSZ-4MZwL1mXxqr8CFxvMo";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  const resend = new Resend("re_4zCzGpfh_BrRuEinLAHVxms2kNqetqNkP");
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const action = searchParams.get("action") as "APROBADA" | "RECHAZADA" | "REVISION";

  if (!token || !action) {
    return new NextResponse(htmlPage("Error", "Parámetros inválidos", "red"), { headers: { "Content-Type": "text/html" } });
  }

  try {
    // Buscar requisición por token
    const { data: req, error } = await supabase
      .from("requisitions")
      .select("*")
      .eq("authorization_comments", token)
      .single();

    if (error || !req) {
      return new NextResponse(htmlPage("Error", "Requisición no encontrada o ya procesada", "red"), { headers: { "Content-Type": "text/html" } });
    }

    if (req.status !== "PENDIENTE") {
      return new NextResponse(htmlPage("Ya procesada", `Esta requisición ya fue ${req.status.toLowerCase()}`, "orange"), { headers: { "Content-Type": "text/html" } });
    }

    // Actualizar estado
    await supabase.from("requisitions").update({
      status: action,
      authorized_by: "vivercan@yahoo.com",
      authorized_at: new Date().toISOString(),
      authorization_comments: action === "REVISION" ? "Devuelta para revisión" : null
    }).eq("id", req.id);

    // Obtener partidas
    const { data: items } = await supabase
      .from("requisition_items")
      .select("*")
      .eq("requisition_id", req.id);

    const materialesHtml = (items || []).map((m: any) => 
      `<tr><td style="padding:8px;border:1px solid #ddd">${m.product_name}</td><td style="padding:8px;border:1px solid #ddd;text-align:center">${m.unit}</td><td style="padding:8px;border:1px solid #ddd;text-align:center">${m.quantity}</td></tr>`
    ).join("");

    const tablaHtml = `
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <tr style="background:#1e3a5f;color:white">
          <th style="padding:10px;text-align:left">Material</th>
          <th style="padding:10px">Unidad</th>
          <th style="padding:10px">Cantidad</th>
        </tr>
        ${materialesHtml}
      </table>
    `;

    const statusText = action === "APROBADA" ? "VALIDADA ✅" : action === "RECHAZADA" ? "RECHAZADA ❌" : "DEVUELTA PARA REVISIÓN ↩";
    const statusColor = action === "APROBADA" ? "#10b981" : action === "RECHAZADA" ? "#ef4444" : "#f59e0b";

    // EMAIL a Compras (solo si fue aprobada)
    if (action === "APROBADA") {
      await resend.emails.send({
        from: "ARIA27 <noreply@mail.jjcrm27.com>",
        to: "juanviverosv@gmail.com",
        subject: `✅ Requisición ${req.folio} VALIDADA - Proceder con compra`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#10b981;color:white;padding:20px;text-align:center">
              <h1 style="margin:0">Requisición Validada</h1>
            </div>
            <div style="padding:20px;background:#f8fafc">
              <p>La siguiente requisición ha sido <strong>VALIDADA</strong> y puede proceder con la compra:</p>
              <div style="background:white;padding:15px;border-radius:8px;margin:15px 0">
                <p style="margin:5px 0"><strong>Folio:</strong> ${req.folio}</p>
                <p style="margin:5px 0"><strong>Obra/Centro:</strong> ${req.cost_center_name}</p>
                <p style="margin:5px 0"><strong>Solicitante:</strong> ${req.created_by}</p>
                <p style="margin:5px 0"><strong>Fecha requerida:</strong> ${new Date(req.required_date).toLocaleDateString("es-MX")}</p>
              </div>
              ${tablaHtml}
            </div>
          </div>
        `
      });
    }

    // EMAIL a Recursos Humanos
    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>",
      to: "recursos.humanos@gcuavante.com",
      subject: `${action === "APROBADA" ? "✅" : action === "RECHAZADA" ? "❌" : "↩"} Requisición ${req.folio} ${statusText}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:${statusColor};color:white;padding:20px;text-align:center">
            <h1 style="margin:0">Requisición ${statusText}</h1>
          </div>
          <div style="padding:20px;background:#f8fafc">
            <div style="background:white;padding:15px;border-radius:8px;margin:15px 0">
              <p style="margin:5px 0"><strong>Folio:</strong> ${req.folio}</p>
              <p style="margin:5px 0"><strong>Obra/Centro:</strong> ${req.cost_center_name}</p>
              <p style="margin:5px 0"><strong>Solicitante:</strong> ${req.created_by}</p>
            </div>
            ${tablaHtml}
          </div>
        </div>
      `
    });

    // EMAIL al solicitante original
    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>",
      to: req.created_by,
      subject: `${action === "APROBADA" ? "✅" : action === "RECHAZADA" ? "❌" : "↩"} Tu requisición ${req.folio} fue ${statusText}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:${statusColor};color:white;padding:20px;text-align:center">
            <h1 style="margin:0">Requisición ${statusText}</h1>
          </div>
          <div style="padding:20px;background:#f8fafc">
            <h2>Tu requisición ha sido procesada</h2>
            <div style="background:white;padding:15px;border-radius:8px;margin:15px 0">
              <p style="margin:5px 0"><strong>Folio:</strong> ${req.folio}</p>
              <p style="margin:5px 0"><strong>Obra/Centro:</strong> ${req.cost_center_name}</p>
              <p style="margin:5px 0"><strong>Estado:</strong> <span style="color:${statusColor};font-weight:bold">${statusText}</span></p>
            </div>
            ${tablaHtml}
            ${action === "APROBADA" ? "<p>El área de compras procederá con la adquisición de los materiales.</p>" : ""}
            ${action === "REVISION" ? "<p>Por favor revisa los comentarios y genera una nueva requisición si es necesario.</p>" : ""}
          </div>
        </div>
      `
    });

    const successMsg = action === "APROBADA" ? "Requisición VALIDADA exitosamente" : action === "RECHAZADA" ? "Requisición RECHAZADA" : "Requisición devuelta para REVISIÓN";
    return new NextResponse(htmlPage("¡Listo!", successMsg + `. Folio: ${req.folio}`, statusColor), { headers: { "Content-Type": "text/html" } });

  } catch (error: any) {
    console.error("Error:", error);
    return new NextResponse(htmlPage("Error", error.message, "red"), { headers: { "Content-Type": "text/html" } });
  }
}

function htmlPage(title: string, message: string, color: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ARIA27 - ${title}</title></head>
    <body style="font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#0f172a">
      <div style="text-align:center;padding:40px;background:white;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,0.3)">
        <div style="width:80px;height:80px;border-radius:50%;background:${color};margin:0 auto 20px;display:flex;align-items:center;justify-content:center">
          <span style="font-size:40px;color:white">${color === "#10b981" ? "✓" : color === "#ef4444" ? "✗" : "!"}</span>
        </div>
        <h1 style="margin:0 0 10px;color:#0f172a">${title}</h1>
        <p style="color:#64748b;margin:0">${message}</p>
        <a href="https://aria.jjcrm27.com" style="display:inline-block;margin-top:20px;padding:10px 20px;background:#0f172a;color:white;text-decoration:none;border-radius:8px">Ir a ARIA27</a>
      </div>
    </body>
    </html>
  `;
}
