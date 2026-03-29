import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";
import { logger } from "@/lib/logger";
const log = logger("REQUISICION");

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://aria.jjcrm27.com";

async function getNextFolio(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `REQ-${year}-`;

  // Estrategia 1: RPC atómico (ideal)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("increment_sequence", { seq_id: "requisitions" });
    if (!rpcError && rpcData !== null) {
      const next = typeof rpcData === "number" ? rpcData : rpcData.current_value;
      return `${prefix}${String(next).padStart(5, "0")}`;
    }
  } catch {}

  // Estrategia 2: Leer MAX folio real de la tabla (evita race condition del sequence)
  const { data: maxFolioData } = await supabase
    .from("Requisiciones")
    .select("folio")
    .like("folio", `${prefix}%`)
    .order("folio", { ascending: false })
    .limit(1);

  let maxNum = 0;
  if (maxFolioData && maxFolioData.length > 0) {
    const parts = maxFolioData[0].folio.split("-");
    maxNum = parseInt(parts[2], 10) || 0;
  }

  // También leer sequence por si está más adelante
  const { data: seqData } = await supabase
    .from("sequences")
    .select("current_value")
    .eq("id", "requisitions")
    .single();
  const seqNum = seqData?.current_value || 0;

  // Usar el mayor entre ambos + 1
  const next = Math.max(maxNum, seqNum) + 1;

  // Actualizar sequence para mantenerlo sincronizado
  await supabase.from("sequences").update({ current_value: next }).eq("id", "requisitions");

  return `${prefix}${String(next).padStart(5, "0")}`;
}

async function getUserByEmail(email: string) {
  const { data } = await supabase.from("Users").select("*").eq("email", email).single();
  return data;
}

async function getUserByRole(role: string) {
  try {
    const { data, error } = await supabase.from("Users").select("*").eq("role", role).eq("active", true).limit(1);
    if (error) { log.error(`Error buscando rol ${role}:`, error.message); return null; }
    if (!data || data.length === 0) { log.error(`No se encontro usuario con rol: ${role}`); return null; }
    return data[0];
  } catch (e: any) { log.error(`Excepcion buscando rol ${role}:`, e.message); return null; }
}

export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const logs: string[] = [];

  try {
    const body = await request.json();
    const { usuario, obra, comentarios, materiales, requiredDate, solicitante, subcategoria } = body;

    const folio = await getNextFolio();
    const token = crypto.randomUUID();

    // Determinar flujo: compras (default) o direccion (directo a autorización)
    let flujo = "compras";
    if (subcategoria) {
      const { data: catData } = await supabase
        .from("catalogos_requisiciones")
        .select("flujo")
        .eq("tipo", "SUBCATEGORIA")
        .eq("valor", subcategoria)
        .single();
      if (catData?.flujo) flujo = catData.flujo;
    }

    const creatorUser = await getUserByEmail(usuario.email);
    const adminUser = await getUserByRole("admin");
    const comprasUser = flujo === "compras" ? await getUserByRole("compras") : null;
    const direccionUser = flujo === "direccion" ? await getUserByRole("direccion") : null;

    logs.push(`Creador: ${usuario.email} (rol: ${creatorUser?.role})`);
    logs.push(`Flujo: ${flujo}`);
    if (comprasUser) logs.push(`Compras: ${comprasUser.email}`);
    if (direccionUser) logs.push(`Dirección: ${direccionUser.email}`);

    const displayName = creatorUser?.display_name || creatorUser?.name || usuario.nombre;
    const isAdmin = creatorUser?.role === "admin";

    const initialStatus = flujo === "direccion" ? "EN_AUTORIZACION" : "PENDIENTE";

    const { data: req, error: reqErr } = await supabase.from("Requisiciones").insert({
      folio, cost_center_name: obra, instructions: comentarios,
      required_date: requiredDate, status: initialStatus,
      created_by: solicitante || displayName, user_email: usuario.email, authorization_comments: token,
      subcategoria: subcategoria || null
    }).select().single();

    if (reqErr) throw reqErr;

    const items = materiales.map((m: any) => ({
      requisition_id: req.id, product_id: m.id || null, product_name: m.name, sku: m.sku || "", unit: m.unit,
      quantity: m.qty, comments: m.comments || "", category: m.category || "", subcategory: m.subcategory || ""
    }));
    const { error: itemsErr } = await supabase.from("requisition_items").insert(items);
    if (itemsErr) throw itemsErr;

    const daysUntil = Math.ceil((new Date(requiredDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const urgencyText = daysUntil <= 0 ? "HOY" : daysUntil === 1 ? "MAÑANA" : `${daysUntil} días`;
    const urgencyColor = daysUntil <= 2 ? "#ef4444" : daysUntil <= 5 ? "#f59e0b" : "#10b981";
    const fechaGen = new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const fechaReq = new Date(requiredDate).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const emailFooter = `<div style="background:#0a1628;padding:15px;text-align:center;border-top:1px solid #334155"><span style="color:#64748b;font-size:11px">ARIA27 ERP - Grupo Cuavante</span><br><span style="color:#475569;font-size:10px">${fechaGen}</span></div>`;

    const materialesHtml = materiales.map((m: any) => `<tr><td style="padding:10px;border:1px solid #e2e8f0">${m.name}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${m.unit}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${m.qty}</td><td style="padding:10px;border:1px solid #e2e8f0">${m.comments || "-"}</td></tr>`).join("");
    const tablaHtml = `<table style="width:100%;border-collapse:collapse;margin:20px 0"><thead><tr style="background:#1e3a5f;color:white"><th style="padding:12px;text-align:left">Material</th><th style="padding:12px">Unidad</th><th style="padding:12px">Cantidad</th><th style="padding:12px;text-align:left">Obs</th></tr></thead><tbody>${materialesHtml}</tbody></table>`;
    const materialesResumen = materiales.map((m: any) => `${m.name} (${m.qty} ${m.unit})`).join(", ");

    const notificados: string[] = [];

    const destinoTexto = flujo === "direccion" ? "Dirección para autorización" : "Compras";

    // 1. EMAIL + WA AL CREADOR
    try {
      await resend.emails.send({
        from: "ARIA27 <noreply@mail.jjcrm27.com>", to: usuario.email,
        subject: `Requisicion ${folio} generada`,
        html: `<div style="font-family:Arial;max-width:650px;margin:0 auto;border-radius:2px;overflow:hidden"><div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);color:white;padding:25px;text-align:center"><div style="font-size:28px;font-weight:900;letter-spacing:2px;color:#22d3ee">ARIA</div><div style="font-size:10px;text-transform:uppercase;color:#94a3b8;letter-spacing:3px;margin-top:4px">Operations OS</div><p style="margin:8px 0 0;font-size:16px;opacity:0.9">ARIA27 ERP</p></div><div style="padding:25px"><h2 style="color:#1e3a5f">Requisicion Generada</h2><p>Hola <strong>${displayName}</strong>, tu requisicion ha sido registrada y enviada a ${destinoTexto}.</p><div style="background:#f8fafc;border-radius:8px;padding:20px;margin:20px 0"><table style="width:100%"><tr><td style="color:#64748b">Folio:</td><td style="font-weight:bold">${folio}</td></tr><tr><td style="color:#64748b">Obra:</td><td style="font-weight:bold">${obra}</td></tr><tr><td style="color:#64748b">Generada:</td><td>${fechaGen}</td></tr><tr><td style="color:#64748b">Requerida:</td><td style="font-weight:bold;color:${urgencyColor}">${fechaReq}</td></tr></table></div>${tablaHtml}</div>${emailFooter}</div>`
      });
      logs.push(`Email creador OK: ${usuario.email}`);
    } catch (e: any) { logs.push(`Email creador ERROR: ${e.message}`); }

    if (creatorUser?.phone) {
      await sendWhatsAppTemplate("requisicion_creada", [folio, displayName, obra, fechaReq], creatorUser.phone);
    }
    notificados.push(`Creador: ${usuario.email}`);

    // 2. EMAIL + WA A COMPRAS (solo flujo compras)
    if (flujo === "compras" && comprasUser) {
      try {
        await resend.emails.send({
          from: "ARIA27 <noreply@mail.jjcrm27.com>", to: comprasUser.email,
          subject: `COTIZAR: ${folio} - ${urgencyText}`,
          html: `<div style="font-family:Arial;max-width:650px;margin:0 auto;border-radius:2px;overflow:hidden"><div style="background:#3b82f6;color:white;padding:25px;text-align:center"><div style="font-size:28px;font-weight:900;letter-spacing:2px;color:#22d3ee">ARIA</div><div style="font-size:10px;text-transform:uppercase;color:#94a3b8;letter-spacing:3px;margin-top:4px">Operations OS</div><p style="margin:8px 0 0;font-size:16px;opacity:0.9">Nueva Requisicion para Compras</p></div><div style="background:${urgencyColor};color:white;padding:20px;text-align:center"><div style="font-size:36px;font-weight:bold">${urgencyText}</div><div>para surtir - ${fechaReq}</div></div><div style="padding:25px"><div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px"><p><strong>Folio:</strong> ${folio}</p><p><strong>Obra:</strong> ${obra}</p><p><strong>Solicitante:</strong> ${displayName}</p></div>${tablaHtml}<div style="text-align:center;margin-top:30px"><a href="${BASE_URL}/dashboard/requisiciones/requisiciones/tramite" style="display:inline-block;background:#3b82f6;color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold">IR A COTIZAR</a></div></div>${emailFooter}</div>`
        });
        logs.push(`Email compras OK: ${comprasUser.email}`);
      } catch (e: any) { logs.push(`Email compras ERROR: ${e.message}`); }

      if (comprasUser.phone) {
        await sendWhatsAppTemplate("requisicion_compras", [folio, obra, urgencyText, materialesResumen], comprasUser.phone);
      }
      notificados.push(`Compras: ${comprasUser.email}`);
    }

    // 2b. FLUJO DIRECCIÓN: Email + WA a dirección con botones AUTORIZAR/RECHAZAR
    if (flujo === "direccion" && direccionUser) {
      const approveUrl = `${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=AUTORIZADA`;
      const rejectUrl = `${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=RECHAZADA`;

      try {
        await resend.emails.send({
          from: "ARIA27 <noreply@mail.jjcrm27.com>", to: direccionUser.email,
          subject: `AUTORIZAR: ${folio} - ${subcategoria} - ${urgencyText}`,
          html: `<div style="font-family:Arial;max-width:650px;margin:0 auto;border-radius:2px;overflow:hidden"><div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);color:white;padding:25px;text-align:center"><div style="font-size:28px;font-weight:900;letter-spacing:2px;color:#22d3ee">ARIA</div><div style="font-size:10px;text-transform:uppercase;color:#94a3b8;letter-spacing:3px;margin-top:4px">Operations OS</div><p style="margin:8px 0 0;font-size:16px;opacity:0.9">Solicitud Directa de Autorización</p></div><div style="background:${urgencyColor};color:white;padding:15px;text-align:center"><div style="font-size:28px;font-weight:bold">${urgencyText}</div><div>${subcategoria} - ${fechaReq}</div></div><div style="padding:25px"><div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px"><p><strong>Folio:</strong> ${folio}</p><p><strong>Obra:</strong> ${obra}</p><p><strong>Solicitante:</strong> ${displayName}</p><p><strong>Tipo:</strong> ${subcategoria}</p></div>${tablaHtml}<div style="text-align:center;margin:30px 0"><a href="${approveUrl}" style="display:inline-block;background:#10b981;color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold;margin:5px">AUTORIZAR</a><a href="${rejectUrl}" style="display:inline-block;background:#ef4444;color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold;margin:5px">RECHAZAR</a></div></div>${emailFooter}</div>`
        });
        logs.push(`Email dirección OK: ${direccionUser.email}`);
      } catch (e: any) { logs.push(`Email dirección ERROR: ${e.message}`); }

      if (direccionUser.phone) {
        await sendWhatsAppTemplate("requisicion_creada", [folio, displayName, obra, fechaReq], direccionUser.phone);
      }
      notificados.push(`Dirección: ${direccionUser.email}`);
    }

    // 3. EMAIL AL ADMIN (informativo)
    if (!isAdmin && adminUser) {
      try {
        await resend.emails.send({
          from: "ARIA27 <noreply@mail.jjcrm27.com>", to: adminUser.email,
          subject: `Nueva requisicion ${folio} - ${displayName}`,
          html: `<div style="font-family:Arial;max-width:650px;margin:0 auto;border-radius:2px;overflow:hidden"><div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);color:white;padding:25px;text-align:center"><div style="font-size:28px;font-weight:900;letter-spacing:2px;color:#22d3ee">ARIA</div><div style="font-size:10px;text-transform:uppercase;color:#94a3b8;letter-spacing:3px;margin-top:4px">Operations OS</div><p style="margin:8px 0 0;font-size:16px;opacity:0.9">Nueva Requisicion</p></div><div style="background:${urgencyColor};color:white;padding:15px;text-align:center"><div style="font-size:32px;font-weight:bold">${urgencyText}</div></div><div style="padding:25px"><div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px"><p><strong>Folio:</strong> ${folio}</p><p><strong>Solicitante:</strong> ${displayName}</p><p><strong>Obra:</strong> ${obra}</p><p><strong>Para:</strong> ${fechaReq}</p></div>${tablaHtml}</div>${emailFooter}</div>`
        });
        logs.push(`Email admin OK: ${adminUser.email}`);
      } catch (e: any) { logs.push(`Email admin ERROR: ${e.message}`); }

      if (adminUser.phone) {
        await sendWhatsAppTemplate("requisicion_creada", [folio, displayName, obra, fechaReq], adminUser.phone);
      }
      notificados.push(`Admin: ${adminUser.email}`);
    }

    return NextResponse.json({ success: true, folio, flujo, notificados, logs });
  } catch (error: any) {
    log.error(`ERROR:`, error);
    return NextResponse.json({ error: error.message, logs }, { status: 500 });
  }
}
