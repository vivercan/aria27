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

    // Guardar requisición
    const { data: req, error: reqErr } = await supabase.from("requisitions").insert({
      folio,
      cost_center_id: costCenterId,
      cost_center_name: obra,
      instructions: comentarios,
      required_date: requiredDate,
      status: "PENDIENTE",
      created_by: usuario.email,
      user_email: usuario.email,
      authorization_comments: token
    }).select().single();

    if (reqErr) {
      console.error("Error guardando requisicion:", reqErr);
      throw reqErr;
    }

    // Guardar items con columnas correctas
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
    if (itemsErr) {
      console.error("Error guardando items:", itemsErr);
      throw itemsErr;
    }

    // HTML para emails
    const materialesHtml = materiales.map((m: any) =>
      `<tr><td style="padding:8px;border:1px solid #ddd">${m.name}</td><td style="padding:8px;border:1px solid #ddd;text-align:center">${m.unit}</td><td style="padding:8px;border:1px solid #ddd;text-align:center">${m.qty}</td><td style="padding:8px;border:1px solid #ddd">${m.comments || "-"}</td></tr>`
    ).join("");

    const tablaHtml = `<table style="width:100%;border-collapse:collapse;margin:20px 0"><tr style="background:#1e3a5f;color:white"><th style="padding:10px;text-align:left">Material</th><th style="padding:10px">Unidad</th><th style="padding:10px">Cantidad</th><th style="padding:10px;text-align:left">Observaciones</th></tr>${materialesHtml}</table>`;

    const fechaReq = new Date(requiredDate).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    // Email al usuario
    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>",
      to: usuario.email,
      subject: `Requisicion ${folio} generada`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><div style="background:#0f172a;color:white;padding:20px;text-align:center"><h1 style="margin:0">ARIA27 ERP</h1></div><div style="padding:20px;background:#f8fafc"><h2>Requisicion Generada</h2><p>Hola <strong>${usuario.nombre}</strong>,</p><p>Tu requisicion ha sido registrada.</p><div style="background:white;padding:15px;border-radius:8px;margin:15px 0"><p><strong>Folio:</strong> ${folio}</p><p><strong>Obra:</strong> ${obra}</p><p><strong>Fecha requerida:</strong> ${fechaReq}</p></div>${tablaHtml}</div></div>`
    });

    // Email a RH
    if (usuario.email !== "recursos.humanos@gcuavante.com") {
      await resend.emails.send({
        from: "ARIA27 <noreply@mail.jjcrm27.com>",
        to: "recursos.humanos@gcuavante.com",
        subject: `Nueva requisicion ${folio} - ${obra}`,
        html: `<div style="font-family:Arial,sans-serif"><h2>Nueva Requisicion</h2><p><strong>Folio:</strong> ${folio}</p><p><strong>Solicitante:</strong> ${usuario.nombre}</p><p><strong>Obra:</strong> ${obra}</p>${tablaHtml}</div>`
      });
    }

    // Email al validador
    const validateUrl = `${BASE_URL}/api/requisicion/validate?token=${token}&action=APROBADA`;
    const rejectUrl = `${BASE_URL}/api/requisicion/validate?token=${token}&action=RECHAZADA`;
    const returnUrl = `${BASE_URL}/api/requisicion/validate?token=${token}&action=REVISION`;

    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>",
      to: "vivercan@yahoo.com",
      subject: `Validar requisicion ${folio} - ${obra}`,
      html: `<div style="font-family:Arial,sans-serif"><h2>Requisicion Pendiente</h2><p><strong>Folio:</strong> ${folio}</p><p><strong>Solicitante:</strong> ${usuario.nombre}</p><p><strong>Obra:</strong> ${obra}</p>${tablaHtml}<div style="text-align:center;margin:30px 0"><a href="${validateUrl}" style="display:inline-block;background:#10b981;color:white;padding:12px 30px;text-decoration:none;border-radius:25px;font-weight:bold;margin:5px">VALIDAR</a><a href="${rejectUrl}" style="display:inline-block;background:#ef4444;color:white;padding:12px 30px;text-decoration:none;border-radius:25px;font-weight:bold;margin:5px">RECHAZAR</a><a href="${returnUrl}" style="display:inline-block;background:#f59e0b;color:white;padding:12px 30px;text-decoration:none;border-radius:25px;font-weight:bold;margin:5px">DEVOLVER</a></div></div>`
    });

    return NextResponse.json({ success: true, folio, message: "Requisicion generada" });
  } catch (error: any) {
    console.error("Error completo:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
