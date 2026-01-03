import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";

const BASE_URL = "https://aria.jjcrm27.com";

const ADMIN_EMAIL = "recursos.humanos@gcuavante.com";
const VALIDADOR_EMAIL = "vivercan@yahoo.com";
const COMPRAS_EMAIL = "timonfx@hotmail.com";

async function getNextFolio(): Promise<string> {
  const { data } = await supabase.from("sequences").select("current_value").eq("id", "Requisiciones").single();
  const next = (data?.current_value || 0) + 1;
  await supabase.from("sequences").update({ current_value: next }).eq("id", "Requisiciones");
  return `REQ-${new Date().getFullYear()}-${String(next).padStart(5, "0")}`;
}

async function getUserByEmail(email: string) {
  const { data } = await supabase.from("Users").select("*").eq("email", email).single();
  return data;
}

export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  
  try {
    const body = await request.json();
    const { usuario, obra, comentarios, materiales, requiredDate, costCenterId } = body;

    const folio = await getNextFolio();
    const token = crypto.randomUUID();

    // Obtener Users del sistema
    const creatorUser = await getUserByEmail(usuario.email);
    const adminUser = await getUserByEmail(ADMIN_EMAIL);
    const validadorUser = await getUserByEmail(VALIDADOR_EMAIL);
    const comprasUser = await getUserByEmail(COMPRAS_EMAIL);

    const displayName = creatorUser?.display_name || creatorUser?.name || usuario.nombre;
    const isValidador = usuario.email === VALIDADOR_EMAIL;
    const isAdmin = usuario.email === ADMIN_EMAIL;

    // Guardar requisición
    const { data: req, error: reqErr } = await supabase.from("Requisiciones").insert({
      folio, cost_center_id: costCenterId, cost_center_name: obra, instructions: comentarios,
      required_date: requiredDate, 
      status: isValidador ? "APROBADA" : "PENDIENTE",
      created_by: displayName,
      user_email: usuario.email, 
      authorization_comments: token
    }).select().single();

    if (reqErr) throw reqErr;

    // Guardar items
    const items = materiales.map((m: any) => ({
      requisition_id: req.id, product_name: m.name, sku: m.sku || "", unit: m.unit,
      quantity: m.qty, comments: m.comments || "", category: m.category || "", subcategory: m.subcategory || ""
    }));
    await supabase.from("requisition_items").insert(items);

    // Calcular urgencia
    const daysUntil = Math.ceil((new Date(requiredDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const urgencyText = daysUntil <= 0 ? "HOY" : daysUntil === 1 ? "MANANA" : `${daysUntil} dias`;
    const urgencyColor = daysUntil <= 2 ? "#ef4444" : daysUntil <= 5 ? "#f59e0b" : "#10b981";
    const fechaGen = new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const fechaReq = new Date(requiredDate).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const validateUrl = `${BASE_URL}/api/requisicion/validate?token=${token}&action=APROBADA`;
    const rejectUrl = `${BASE_URL}/api/requisicion/validate?token=${token}&action=RECHAZADA`;

    const materialesHtml = materiales.map((m: any) => `<tr><td style="padding:10px;border:1px solid #e2e8f0">${m.name}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${m.unit}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${m.qty}</td><td style="padding:10px;border:1px solid #e2e8f0">${m.comments || "-"}</td></tr>`).join("");
    const tablaHtml = `<table style="width:100%;border-collapse:collapse;margin:20px 0"><thead><tr style="background:#1e3a5f;color:white"><th style="padding:12px;text-align:left">Material</th><th style="padding:12px">Unidad</th><th style="padding:12px">Cantidad</th><th style="padding:12px;text-align:left">Obs</th></tr></thead><tbody>${materialesHtml}</tbody></table>`;

    const notificados: string[] = [];

    // ========== 1. NOTIFICAR AL CREADOR ==========
    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>", to: usuario.email,
      subject: `✅ Requisición ${folio} generada`,
      html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);color:white;padding:25px;text-align:center"><h1 style="margin:0">ARIA27 ERP</h1></div><div style="padding:25px"><h2 style="color:#1e3a5f">✅ Requisición Generada</h2><p>Hola <strong>${displayName}</strong>, tu requisición ha sido registrada${isValidador ? " y validada automáticamente" : ""}.</p><div style="background:#f8fafc;border-radius:8px;padding:20px;margin:20px 0"><table style="width:100%"><tr><td style="color:#64748b">Folio:</td><td style="font-weight:bold">${folio}</td></tr><tr><td style="color:#64748b">Obra:</td><td style="font-weight:bold">${obra}</td></tr><tr><td style="color:#64748b">Generada:</td><td>${fechaGen}</td></tr><tr><td style="color:#64748b">Requerida:</td><td style="font-weight:bold;color:${urgencyColor}">${fechaReq}</td></tr></table></div>${tablaHtml}</div></div>`
    });
    if (creatorUser?.phone) {
      await sendWhatsAppTemplate("requisicion_creada", [folio, displayName, obra, fechaReq], creatorUser.phone);
    }
    notificados.push(`Creador: ${usuario.email}`);

    // ========== 2. NOTIFICAR AL VALIDADOR (si no es quien creó) ==========
    if (!isValidador && validadorUser) {
      await resend.emails.send({
        from: "ARIA27 <noreply@mail.jjcrm27.com>", to: VALIDADOR_EMAIL,
        subject: `🔔 Validar ${folio} - ${displayName}`,
        html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);color:white;padding:25px;text-align:center"><h1 style="margin:0">Requisición Pendiente</h1></div><div style="background:${urgencyColor};color:white;padding:15px;text-align:center"><div style="font-size:32px;font-weight:bold">${urgencyText}</div></div><div style="padding:25px"><div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px"><p><strong>Folio:</strong> ${folio}</p><p><strong>Solicitante:</strong> ${displayName}</p><p><strong>Obra:</strong> ${obra}</p><p><strong>Para:</strong> ${fechaReq}</p></div>${tablaHtml}<div style="text-align:center;margin:30px 0"><a href="${validateUrl}" style="display:inline-block;background:#10b981;color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold;margin:5px">✅ VALIDAR</a><a href="${rejectUrl}" style="display:inline-block;background:#ef4444;color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold;margin:5px">❌ RECHAZAR</a></div></div></div>`
      });
      if (validadorUser.phone) {
        await sendWhatsAppTemplate("requisicion_validar", [folio, displayName, obra, urgencyText, token], validadorUser.phone, token);
      }
      notificados.push(`Validador: ${VALIDADOR_EMAIL} (${validadorUser.phone})`);
    }

    // ========== 3. NOTIFICAR AL ADMIN (si no es quien creó) ==========
    if (!isAdmin && adminUser) {
      await resend.emails.send({
        from: "ARIA27 <noreply@mail.jjcrm27.com>", to: ADMIN_EMAIL,
        subject: `📋 Nueva requisición ${folio} - ${displayName}`,
        html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);color:white;padding:25px;text-align:center"><h1 style="margin:0">Nueva Requisición</h1></div><div style="background:${urgencyColor};color:white;padding:15px;text-align:center"><div style="font-size:32px;font-weight:bold">${urgencyText}</div></div><div style="padding:25px"><div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px"><p><strong>Folio:</strong> ${folio}</p><p><strong>Solicitante:</strong> ${displayName}</p><p><strong>Obra:</strong> ${obra}</p><p><strong>Para:</strong> ${fechaReq}</p></div>${tablaHtml}</div></div>`
      });
      if (adminUser.phone) {
        await sendWhatsAppTemplate("requisicion_creada", [folio, displayName, obra, fechaReq], adminUser.phone);
      }
      notificados.push(`Admin: ${ADMIN_EMAIL} (${adminUser.phone})`);
    }

    // ========== 4. SI ES VALIDADOR, NOTIFICAR DIRECTO A COMPRAS ==========
    if (isValidador && comprasUser) {
      await resend.emails.send({
        from: "ARIA27 <noreply@mail.jjcrm27.com>", to: COMPRAS_EMAIL,
        subject: `🛒 COTIZAR: ${folio} - ${urgencyText}`,
        html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:#3b82f6;color:white;padding:25px;text-align:center"><h1 style="margin:0">Nueva Requisición para Compras</h1></div><div style="background:${urgencyColor};color:white;padding:20px;text-align:center"><div style="font-size:36px;font-weight:bold">${urgencyText}</div><div>para surtir - ${fechaReq}</div></div><div style="padding:25px"><div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px"><p><strong>Folio:</strong> ${folio}</p><p><strong>Obra:</strong> ${obra}</p><p><strong>Solicitante:</strong> ${displayName}</p></div>${tablaHtml}<div style="text-align:center;margin-top:30px"><a href="${BASE_URL}/dashboard/requisiciones/Requisiciones/Compras" style="display:inline-block;background:#3b82f6;color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold">IR A COTIZAR</a></div></div></div>`
      });
      if (comprasUser.phone) {
        await sendWhatsAppTemplate("requisicion_compras", [folio, displayName, obra, urgencyText], comprasUser.phone);
      }
      notificados.push(`Compras: ${COMPRAS_EMAIL} (${comprasUser.phone})`);
    }

    console.log(`✅ ${folio} creada - Notificados: ${notificados.join(", ")}`);
    return NextResponse.json({ success: true, folio, notificados });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


