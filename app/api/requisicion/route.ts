import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";

const BASE_URL = "https://aria.jjcrm27.com";

async function getNextFolio(): Promise<string> {
  const { data } = await supabase.from("sequences").select("current_value").eq("id", "Requisiciones").single();
  const next = (data?.current_value || 0) + 1;
  await supabase.from("sequences").update({ current_value: next }).eq("id", "Requisiciones");
  return `REQ-${new Date().getFullYear()}-${String(next).padStart(5, "0")}`;
}

async function getUserByEmail(email: string) {
  const { data } = await supabase.from("users").select("*").eq("email", email).single();
  return data;
}

async function getUserByRole(role: string) {
  const { data } = await supabase.from("users").select("*").eq("role", role).eq("active", true).single();
  return data;
}

export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const logs: string[] = [];

  try {
    const body = await request.json();
    const { usuario, obra, comentarios, materiales, requiredDate, costCenterId } = body;

    const folio = await getNextFolio();
    const token = crypto.randomUUID();
    logs.push(`Folio generado: ${folio}`);

    // Obtener usuarios
    const creatorUser = await getUserByEmail(usuario.email);
    const adminUser = await getUserByRole("admin");
    const validadorUser = await getUserByRole("validador");
    const comprasUser = await getUserByRole("compras");

    logs.push(`Creator: ${creatorUser?.email || 'NO ENCONTRADO'}`);
    logs.push(`Admin: ${adminUser?.email || 'NO ENCONTRADO'}`);
    logs.push(`Validador: ${validadorUser?.email || 'NO ENCONTRADO'}`);
    logs.push(`Compras: ${comprasUser?.email || 'NO ENCONTRADO'}`);

    const displayName = creatorUser?.display_name || creatorUser?.name || usuario.nombre;
    const isValidador = creatorUser?.role === "validador";
    const isAdmin = creatorUser?.role === "admin";

    // Guardar requisicion
    const { data: req, error: reqErr } = await supabase.from("Requisiciones").insert({
      folio, cost_center_id: costCenterId, cost_center_name: obra, instructions: comentarios,
      required_date: requiredDate,
      status: isValidador ? "APROBADA" : "PENDIENTE",
      created_by: displayName,
      user_email: usuario.email,
      authorization_comments: token
    }).select().single();

    if (reqErr) {
      logs.push(`Error BD: ${reqErr.message}`);
      throw reqErr;
    }
    logs.push(`Requisicion guardada: ${req.id}`);

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
    
    const fechaGen = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const fechaReq = new Date(requiredDate).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

    const validateUrl = `${BASE_URL}/api/requisicion/validate?token=${token}&action=APROBADA`;
    const rejectUrl = `${BASE_URL}/api/requisicion/validate?token=${token}&action=RECHAZADA`;

    // Tabla de materiales (HTML simple)
    const materialesRows = materiales.map((m: any) => 
      `<tr><td style="padding:10px;border:1px solid #ddd">${m.name}</td><td style="padding:10px;border:1px solid #ddd;text-align:center">${m.unit}</td><td style="padding:10px;border:1px solid #ddd;text-align:center">${m.qty}</td><td style="padding:10px;border:1px solid #ddd">${m.comments || "-"}</td></tr>`
    ).join("");
    
    const tablaHtml = `<table style="width:100%;border-collapse:collapse;margin:20px 0"><thead><tr style="background:#1e3a5f;color:white"><th style="padding:12px;text-align:left">Material</th><th style="padding:12px">Unidad</th><th style="padding:12px">Cantidad</th><th style="padding:12px;text-align:left">Obs</th></tr></thead><tbody>${materialesRows}</tbody></table>`;

    const notificados: string[] = [];

    // ========== 1. EMAIL AL CREADOR ==========
    try {
      const htmlCreador = `
        <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto">
          <div style="background:#1e3a5f;color:white;padding:25px;text-align:center">
            <h1 style="margin:0">ARIA27 ERP</h1>
          </div>
          <div style="padding:25px">
            <h2 style="color:#1e3a5f">Requisicion Generada</h2>
            <p>Hola <strong>${displayName}</strong>, tu requisicion ha sido registrada${isValidador ? " y validada automaticamente" : ""}.</p>
            <div style="background:#f8fafc;border-radius:8px;padding:20px;margin:20px 0">
              <p><strong>Folio:</strong> ${folio}</p>
              <p><strong>Obra:</strong> ${obra}</p>
              <p><strong>Generada:</strong> ${fechaGen}</p>
              <p><strong>Requerida:</strong> <span style="color:${urgencyColor};font-weight:bold">${fechaReq}</span></p>
            </div>
            ${tablaHtml}
          </div>
        </div>
      `;
      
      const resCreador = await resend.emails.send({
        from: "ARIA27 <noreply@mail.jjcrm27.com>",
        to: usuario.email,
        subject: `Requisicion ${folio} generada`,
        html: htmlCreador
      });
      logs.push(`Email creador: OK - ${resCreador.data?.id || 'sin id'}`);
      notificados.push(`Creador: ${usuario.email}`);
    } catch (e: any) {
      logs.push(`Email creador ERROR: ${e.message}`);
    }

    // WhatsApp al creador
    if (creatorUser?.phone) {
      const waRes = await sendWhatsAppTemplate("requisicion_creada", [folio, displayName, obra, fechaReq], creatorUser.phone);
      logs.push(`WA creador: ${waRes.success ? 'OK' : waRes.error}`);
    }

    // ========== 2. EMAIL AL VALIDADOR (si creador no es validador) ==========
    if (!isValidador && validadorUser) {
      try {
        const htmlValidador = `
          <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto">
            <div style="background:#1e3a5f;color:white;padding:25px;text-align:center">
              <h1 style="margin:0">Requisicion Pendiente de Validar</h1>
            </div>
            <div style="background:${urgencyColor};color:white;padding:15px;text-align:center">
              <div style="font-size:32px;font-weight:bold">${urgencyText}</div>
            </div>
            <div style="padding:25px">
              <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px">
                <p><strong>Folio:</strong> ${folio}</p>
                <p><strong>Solicitante:</strong> ${displayName}</p>
                <p><strong>Obra:</strong> ${obra}</p>
                <p><strong>Para:</strong> ${fechaReq}</p>
              </div>
              ${tablaHtml}
              <div style="text-align:center;margin:30px 0">
                <a href="${validateUrl}" style="display:inline-block;background:#10b981;color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold;margin:5px">VALIDAR</a>
                <a href="${rejectUrl}" style="display:inline-block;background:#ef4444;color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold;margin:5px">RECHAZAR</a>
              </div>
            </div>
          </div>
        `;
        
        const resValidador = await resend.emails.send({
          from: "ARIA27 <noreply@mail.jjcrm27.com>",
          to: validadorUser.email,
          subject: `VALIDAR ${folio} - ${displayName} - ${obra}`,
          html: htmlValidador
        });
        logs.push(`Email validador (${validadorUser.email}): OK - ${resValidador.data?.id || 'sin id'}`);
        notificados.push(`Validador: ${validadorUser.email}`);
      } catch (e: any) {
        logs.push(`Email validador ERROR: ${e.message}`);
      }

      // WhatsApp al validador
      if (validadorUser.phone) {
        const waRes = await sendWhatsAppTemplate("requisicion_validar", [folio, displayName, obra, urgencyText, token], validadorUser.phone, token);
        logs.push(`WA validador: ${waRes.success ? 'OK' : waRes.error}`);
      }
    } else {
      logs.push(`Validador skip: isValidador=${isValidador}, validadorUser=${!!validadorUser}`);
    }

    // ========== 3. EMAIL AL ADMIN (si creador no es admin) ==========
    if (!isAdmin && adminUser) {
      try {
        const htmlAdmin = `
          <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto">
            <div style="background:#1e3a5f;color:white;padding:25px;text-align:center">
              <h1 style="margin:0">Nueva Requisicion</h1>
            </div>
            <div style="background:${urgencyColor};color:white;padding:15px;text-align:center">
              <div style="font-size:32px;font-weight:bold">${urgencyText}</div>
            </div>
            <div style="padding:25px">
              <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px">
                <p><strong>Folio:</strong> ${folio}</p>
                <p><strong>Solicitante:</strong> ${displayName}</p>
                <p><strong>Obra:</strong> ${obra}</p>
                <p><strong>Para:</strong> ${fechaReq}</p>
              </div>
              ${tablaHtml}
            </div>
          </div>
        `;
        
        const resAdmin = await resend.emails.send({
          from: "ARIA27 <noreply@mail.jjcrm27.com>",
          to: adminUser.email,
          subject: `Nueva requisicion ${folio} - ${displayName}`,
          html: htmlAdmin
        });
        logs.push(`Email admin (${adminUser.email}): OK - ${resAdmin.data?.id || 'sin id'}`);
        notificados.push(`Admin: ${adminUser.email}`);
      } catch (e: any) {
        logs.push(`Email admin ERROR: ${e.message}`);
      }

      if (adminUser.phone) {
        const waRes = await sendWhatsAppTemplate("requisicion_creada", [folio, displayName, obra, fechaReq], adminUser.phone);
        logs.push(`WA admin: ${waRes.success ? 'OK' : waRes.error}`);
      }
    } else {
      logs.push(`Admin skip: isAdmin=${isAdmin}, adminUser=${!!adminUser}`);
    }

    // ========== 4. SI ES VALIDADOR, NOTIFICAR A COMPRAS DIRECTO ==========
    if (isValidador && comprasUser) {
      try {
        const htmlCompras = `
          <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto">
            <div style="background:#3b82f6;color:white;padding:25px;text-align:center">
              <h1 style="margin:0">Nueva Requisicion para Cotizar</h1>
            </div>
            <div style="background:${urgencyColor};color:white;padding:20px;text-align:center">
              <div style="font-size:36px;font-weight:bold">${urgencyText}</div>
              <div>para surtir - ${fechaReq}</div>
            </div>
            <div style="padding:25px">
              <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px">
                <p><strong>Folio:</strong> ${folio}</p>
                <p><strong>Obra:</strong> ${obra}</p>
                <p><strong>Solicitante:</strong> ${displayName}</p>
              </div>
              ${tablaHtml}
              <div style="text-align:center;margin-top:30px">
                <a href="${BASE_URL}/dashboard/requisiciones/requisiciones/tramite" style="display:inline-block;background:#3b82f6;color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold">IR A COTIZAR</a>
              </div>
            </div>
          </div>
        `;
        
        const resCompras = await resend.emails.send({
          from: "ARIA27 <noreply@mail.jjcrm27.com>",
          to: comprasUser.email,
          subject: `COTIZAR: ${folio} - ${urgencyText} - ${obra}`,
          html: htmlCompras
        });
        logs.push(`Email compras (${comprasUser.email}): OK - ${resCompras.data?.id || 'sin id'}`);
        notificados.push(`Compras: ${comprasUser.email}`);
      } catch (e: any) {
        logs.push(`Email compras ERROR: ${e.message}`);
      }

      if (comprasUser.phone) {
        const waRes = await sendWhatsAppTemplate("requisicion_compras", [folio, obra, urgencyText], comprasUser.phone);
        logs.push(`WA compras: ${waRes.success ? 'OK' : waRes.error}`);
      }
    }

    console.log("[REQUISICION] Logs:", logs.join(" | "));
    return NextResponse.json({ success: true, folio, notificados, logs });

  } catch (error: any) {
    logs.push(`FATAL: ${error.message}`);
    console.error("[REQUISICION] Error:", error.message, "Logs:", logs);
    return NextResponse.json({ error: error.message, logs }, { status: 500 });
  }
}
