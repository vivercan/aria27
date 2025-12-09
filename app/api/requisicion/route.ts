import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";

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
  const resend = new Resend(process.env.RESEND_API_KEY!);

  try {
    const body = await request.json();
    const { usuario, obra, comentarios, materiales, requiredDate, costCenterId } = body;

    const folio = await getNextFolio();
    const token = crypto.randomUUID();

    // Obtener display_name del usuario
    const { data: userData } = await supabase
      .from("users")
      .select("display_name, name")
      .eq("email", usuario.email)
      .single();
    
    const displayName = userData?.display_name || userData?.name || usuario.nombre;

    // Guardar requisición
    const { data: req, error: reqErr } = await supabase.from("requisitions").insert({
      folio,
      cost_center_id: costCenterId,
      cost_center_name: obra,
      instructions: comentarios,
      required_date: requiredDate,
      status: "PENDIENTE",
      created_by: displayName,
      user_email: usuario.email,
      authorization_comments: token
    }).select().single();

    if (reqErr) throw reqErr;

    // Guardar items
    const items = materiales.map((m: any) => ({
      requisition_id: req.id,
      product_name: m.name,
      sku: m.sku || "",
      unit: m.unit,
      quantity: m.qty,
      comments: m.comments || "",
      category: m.category || "",
      subcategory: m.subcategory || ""
    }));

    const { error: itemsErr } = await supabase.from("requisition_items").insert(items);
    if (itemsErr) throw itemsErr;

    // Calcular días para entrega
    const daysUntil = Math.ceil((new Date(requiredDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const urgencyColor = daysUntil <= 2 ? "#ef4444" : daysUntil <= 5 ? "#f59e0b" : "#10b981";
    const urgencyText = daysUntil <= 0 ? "¡HOY!" : daysUntil === 1 ? "¡MAÑANA!" : `${daysUntil} días`;

    const fechaGeneracion = new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const fechaReq = new Date(requiredDate).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const materialesHtml = materiales.map((m: any) =>
      `<tr><td style="padding:10px;border:1px solid #e2e8f0">${m.name}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${m.unit}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${m.qty}</td><td style="padding:10px;border:1px solid #e2e8f0">${m.comments || "-"}</td></tr>`
    ).join("");

    const tablaHtml = `<table style="width:100%;border-collapse:collapse;margin:20px 0"><thead><tr style="background:#1e3a5f;color:white"><th style="padding:12px;text-align:left">Material</th><th style="padding:12px">Unidad</th><th style="padding:12px">Cantidad</th><th style="padding:12px;text-align:left">Observaciones</th></tr></thead><tbody>${materialesHtml}</tbody></table>`;

    // Email al usuario
    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>",
      to: usuario.email,
      subject: `Requisición ${folio} generada`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);color:white;padding:25px;text-align:center">
            <h1 style="margin:0;font-size:24px">ARIA27 ERP</h1>
          </div>
          <div style="padding:25px;background:#ffffff">
            <h2 style="color:#1e3a5f;margin-top:0">Requisición Generada</h2>
            <p>Hola <strong>${displayName}</strong>,</p>
            <p>Tu requisición ha sido registrada correctamente.</p>
            
            <div style="background:#f8fafc;border-radius:8px;padding:20px;margin:20px 0">
              <table style="width:100%">
                <tr><td style="color:#64748b;padding:5px 0">Folio:</td><td style="font-weight:bold">${folio}</td></tr>
                <tr><td style="color:#64748b;padding:5px 0">Obra/Destino:</td><td style="font-weight:bold">${obra}</td></tr>
                <tr><td style="color:#64748b;padding:5px 0">Generada:</td><td>${fechaGeneracion}</td></tr>
                <tr><td style="color:#64748b;padding:5px 0">Fecha requerida:</td><td style="font-weight:bold;color:${urgencyColor}">${fechaReq}</td></tr>
              </table>
            </div>
            
            <h3 style="color:#1e3a5f">Materiales solicitados:</h3>
            ${tablaHtml}
          </div>
          <div style="background:#f1f5f9;padding:15px;text-align:center;color:#64748b;font-size:12px">
            ARIA27 ERP - Grupo Constructor Avante
          </div>
        </div>
      `
    });

    // Email a RH
    if (usuario.email !== "recursos.humanos@gcuavante.com") {
      await resend.emails.send({
        from: "ARIA27 <noreply@mail.jjcrm27.com>",
        to: "recursos.humanos@gcuavante.com",
        subject: `Nueva requisición ${folio} - ${obra}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto">
            <div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);color:white;padding:25px;text-align:center">
              <h1 style="margin:0">Nueva Requisición</h1>
            </div>
            <div style="padding:25px">
              <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px">
                <p style="margin:5px 0"><strong>Folio:</strong> ${folio}</p>
                <p style="margin:5px 0"><strong>Solicitante:</strong> ${displayName}</p>
                <p style="margin:5px 0"><strong>Obra:</strong> ${obra}</p>
                <p style="margin:5px 0"><strong>Generada:</strong> ${fechaGeneracion}</p>
                <p style="margin:5px 0;color:${urgencyColor}"><strong>Fecha requerida:</strong> ${fechaReq} (${urgencyText})</p>
              </div>
              ${tablaHtml}
            </div>
          </div>
        `
      });
    }

    // Email al validador
    const validateUrl = `${BASE_URL}/api/requisicion/validate?token=${token}&action=APROBADA`;
    const rejectUrl = `${BASE_URL}/api/requisicion/validate?token=${token}&action=RECHAZADA`;
    const returnUrl = `${BASE_URL}/api/requisicion/validate?token=${token}&action=REVISION`;

    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>",
      to: "vivercan@yahoo.com",
      subject: `Validar requisición ${folio} - ${displayName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);color:white;padding:25px;text-align:center">
            <h1 style="margin:0">Requisición Pendiente de Validación</h1>
          </div>
          
          <div style="background:${urgencyColor};color:white;padding:15px;text-align:center">
            <div style="font-size:12px">TIEMPO PARA ENTREGA</div>
            <div style="font-size:32px;font-weight:bold">${urgencyText}</div>
          </div>
          
          <div style="padding:25px">
            <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px">
              <p style="margin:5px 0"><strong>Folio:</strong> ${folio}</p>
              <p style="margin:5px 0"><strong>Solicitante:</strong> ${displayName}</p>
              <p style="margin:5px 0"><strong>Obra:</strong> ${obra}</p>
              <p style="margin:5px 0"><strong>Generada:</strong> ${fechaGeneracion}</p>
              <p style="margin:5px 0"><strong>Para cuando:</strong> ${fechaReq}</p>
            </div>
            
            <h3 style="color:#1e3a5f">Materiales solicitados:</h3>
            ${tablaHtml}
            
            <div style="text-align:center;margin:30px 0">
              <a href="${validateUrl}" style="display:inline-block;background:#10b981;color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold;margin:5px">VALIDAR</a>
              <a href="${rejectUrl}" style="display:inline-block;background:#ef4444;color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold;margin:5px">RECHAZAR</a>
              <a href="${returnUrl}" style="display:inline-block;background:#f59e0b;color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold;margin:5px">DEVOLVER</a>
            </div>
          </div>
        </div>
      `
    });

    return NextResponse.json({ success: true, folio, message: "Requisición generada" });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
