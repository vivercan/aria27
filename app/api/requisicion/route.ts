import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://yhylkvpynzyorqortbkk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0MzQzNzAsImV4cCI6MjA0OTAxMDM3MH0.SBHH6fHuhGPOwGMDVCVNDzSZ-4MZwL1mXxqr8CFxvMo";
const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = "https://aria.jjcrm27.com";

async function getNextFolio(): Promise<string> {
  const { data } = await supabase
    .from("sequences")
    .select("current_value")
    .eq("id", "requisitions")
    .single();
  
  const next = (data?.current_value || 0) + 1;
  await supabase
    .from("sequences")
    .update({ current_value: next })
    .eq("id", "requisitions");
  
  const year = new Date().getFullYear();
  return `REQ-${year}-${String(next).padStart(5, "0")}`;
}

export async function POST(request: Request) {
  const resend = new Resend("re_4zCzGpfh_BrRuEinLAHVxms2kNqetqNkP");
  
  try {
    const body = await request.json();
    const { usuario, obra, comentarios, materiales, requiredDate, costCenterId } = body;

    // Generar folio consecutivo
    const folio = await getNextFolio();
    const token = crypto.randomUUID();

    // Guardar en BD
    const { data: req, error: reqErr } = await supabase.from("requisitions").insert({
      folio,
      cost_center_id: costCenterId,
      cost_center_name: obra,
      instructions: comentarios,
      required_date: requiredDate,
      status: "PENDIENTE",
      created_by: usuario.email,
      authorization_comments: token
    }).select().single();

    if (reqErr) throw reqErr;

    // Guardar partidas
    const items = materiales.map((m: any) => ({
      requisition_id: req.id,
      product_id: m.id,
      product_name: m.name,
      unit: m.unit,
      quantity: m.qty,
      observations: m.comments || ""
    }));
    await supabase.from("requisition_items").insert(items);

    // HTML de materiales para emails
    const materialesHtml = materiales.map((m: any) => 
      `<tr><td style="padding:8px;border:1px solid #ddd">${m.name}</td><td style="padding:8px;border:1px solid #ddd;text-align:center">${m.unit}</td><td style="padding:8px;border:1px solid #ddd;text-align:center">${m.qty}</td><td style="padding:8px;border:1px solid #ddd">${m.comments || "-"}</td></tr>`
    ).join("");

    const tablaHtml = `
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <tr style="background:#1e3a5f;color:white">
          <th style="padding:10px;text-align:left">Material</th>
          <th style="padding:10px">Unidad</th>
          <th style="padding:10px">Cantidad</th>
          <th style="padding:10px;text-align:left">Observaciones</th>
        </tr>
        ${materialesHtml}
      </table>
    `;

    const fechaReq = new Date(requiredDate).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    // EMAIL 1: Confirmación al usuario que creó
    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>",
      to: usuario.email,
      subject: `✅ Requisición ${folio} generada`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#0f172a;color:white;padding:20px;text-align:center">
            <h1 style="margin:0">ARIA27 ERP</h1>
            <p style="margin:5px 0 0;opacity:0.8">Sistema de Requisiciones</p>
          </div>
          <div style="padding:20px;background:#f8fafc">
            <h2 style="color:#0f172a">Requisición Generada ✅</h2>
            <p>Hola <strong>${usuario.nombre}</strong>,</p>
            <p>Tu requisición ha sido registrada exitosamente y está pendiente de validación.</p>
            <div style="background:white;padding:15px;border-radius:8px;margin:15px 0">
              <p style="margin:5px 0"><strong>Folio:</strong> ${folio}</p>
              <p style="margin:5px 0"><strong>Obra/Centro:</strong> ${obra}</p>
              <p style="margin:5px 0"><strong>Fecha requerida:</strong> ${fechaReq}</p>
              ${comentarios ? `<p style="margin:5px 0"><strong>Instrucciones:</strong> ${comentarios}</p>` : ""}
            </div>
            <h3>Materiales solicitados:</h3>
            ${tablaHtml}
            <p style="color:#64748b;font-size:12px;margin-top:20px">Recibirás una notificación cuando tu requisición sea validada.</p>
          </div>
        </div>
      `
    });

    // EMAIL 2: Notificación a Recursos Humanos (si no es el mismo)
    if (usuario.email !== "recursos.humanos@gcuavante.com") {
      await resend.emails.send({
        from: "ARIA27 <noreply@mail.jjcrm27.com>",
        to: "recursos.humanos@gcuavante.com",
        subject: `📋 Nueva requisición ${folio} - ${obra}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#0f172a;color:white;padding:20px;text-align:center">
              <h1 style="margin:0">ARIA27 ERP</h1>
            </div>
            <div style="padding:20px;background:#f8fafc">
              <h2 style="color:#0f172a">Nueva Requisición Registrada</h2>
              <p>Se ha generado una nueva requisición:</p>
              <div style="background:white;padding:15px;border-radius:8px;margin:15px 0">
                <p style="margin:5px 0"><strong>Folio:</strong> ${folio}</p>
                <p style="margin:5px 0"><strong>Solicitante:</strong> ${usuario.nombre} (${usuario.email})</p>
                <p style="margin:5px 0"><strong>Obra/Centro:</strong> ${obra}</p>
                <p style="margin:5px 0"><strong>Fecha requerida:</strong> ${fechaReq}</p>
              </div>
              ${tablaHtml}
            </div>
          </div>
        `
      });
    }

    // EMAIL 3: Al validador con botones de acción
    const validateUrl = `${BASE_URL}/api/requisicion/validate?token=${token}&action=APROBADA`;
    const rejectUrl = `${BASE_URL}/api/requisicion/validate?token=${token}&action=RECHAZADA`;
    const returnUrl = `${BASE_URL}/api/requisicion/validate?token=${token}&action=REVISION`;

    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>",
      to: "vivercan@yahoo.com",
      subject: `🔔 Validar requisición ${folio} - ${obra}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#0f172a;color:white;padding:20px;text-align:center">
            <h1 style="margin:0">ARIA27 ERP</h1>
            <p style="margin:5px 0 0;opacity:0.8">Validación de Requisiciones</p>
          </div>
          <div style="padding:20px;background:#f8fafc">
            <h2 style="color:#0f172a">Requisición Pendiente de Validación</h2>
            <div style="background:white;padding:15px;border-radius:8px;margin:15px 0">
              <p style="margin:5px 0"><strong>Folio:</strong> ${folio}</p>
              <p style="margin:5px 0"><strong>Solicitante:</strong> ${usuario.nombre} (${usuario.email})</p>
              <p style="margin:5px 0"><strong>Obra/Centro:</strong> ${obra}</p>
              <p style="margin:5px 0"><strong>Fecha requerida:</strong> ${fechaReq}</p>
              ${comentarios ? `<p style="margin:5px 0"><strong>Instrucciones:</strong> ${comentarios}</p>` : ""}
            </div>
            <h3>Materiales solicitados:</h3>
            ${tablaHtml}
            <div style="text-align:center;margin:30px 0">
              <a href="${validateUrl}" style="display:inline-block;background:#10b981;color:white;padding:12px 30px;text-decoration:none;border-radius:25px;font-weight:bold;margin:5px">✓ VALIDAR</a>
              <a href="${rejectUrl}" style="display:inline-block;background:#ef4444;color:white;padding:12px 30px;text-decoration:none;border-radius:25px;font-weight:bold;margin:5px">✗ RECHAZAR</a>
              <a href="${returnUrl}" style="display:inline-block;background:#f59e0b;color:white;padding:12px 30px;text-decoration:none;border-radius:25px;font-weight:bold;margin:5px">↩ DEVOLVER</a>
            </div>
            <p style="color:#64748b;font-size:12px;text-align:center">También puedes validar desde el sistema ARIA27</p>
          </div>
        </div>
      `
    });

    return NextResponse.json({ success: true, folio, message: "Requisición generada y notificaciones enviadas" });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
