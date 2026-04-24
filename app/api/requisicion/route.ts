import { NextResponse, NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendWhatsAppLogged } from "@/lib/whatsapp";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { ariaEmailHeader, ariaEmailFooter, ariaEmailWrapper } from "@/lib/email-templates";
import { sendEmailLogged } from "@/lib/email-log";

const log = logger("REQUISICION");

// Lazy init — evita throw en module-level que bypassea try-catch del handler (B8 fix)
let _db: SupabaseClient | undefined;
function getDb(): SupabaseClient {
  if (!_db) _db = getSupabaseAdmin();
  return _db;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://aria.jjcrm27.com";

async function getNextFolio(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `REQ-${year}-`;

  // Estrategia 1: RPC atómico (ideal)
  try {
    const { data: rpcData, error: rpcError } = await getDb().rpc("increment_sequence", { seq_id: "requisitions" });
    if (!rpcError && rpcData !== null) {
      const next = typeof rpcData === "number" ? rpcData : rpcData.current_value;
      return `${prefix}${String(next).padStart(5, "0")}`;
    }
  } catch (rpcErr: unknown) {
    log.warn("[FOLIO] RPC increment_sequence falló, usando fallback", { error: (rpcErr as { message?: string })?.message });
  }

  // Estrategia 2: Leer MAX folio real de la tabla + sequence, tomar el mayor
  // NOTA: Esta ruta es solo fallback cuando el RPC falla. Se acepta la posibilidad
  // de colisión en concurrencia extrema (el INSERT fallará con constraint y el
  // usuario verá un error claro en lugar de duplicar el folio silenciosamente).
  const { data: maxFolioData } = await getDb()
    .from("requisitions")
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
  const { data: seqData } = await getDb()
    .from("sequences")
    .select("current_value")
    .eq("id", "requisitions")
    .single();
  const seqNum = seqData?.current_value || 0;

  // Usar el mayor entre ambos + 1
  const next = Math.max(maxNum, seqNum) + 1;

  // Upsert sequence para mantenerlo sincronizado (upsert en vez de update evita errores si no existe el registro)
  await getDb().from("sequences").upsert({ id: "requisitions", current_value: next }, { onConflict: "id", ignoreDuplicates: false });

  log.warn("[FOLIO] Usando fallback Strategy 2 (sin RPC atómico)", { next, maxNum, seqNum });
  return `${prefix}${String(next).padStart(5, "0")}`;
}

interface User {
  id: string;
  email: string;
  role: string;
  phone?: string;
  active?: boolean;
  display_name?: string;
  name?: string;
  [key: string]: unknown;
}

async function getUserByEmail(email: string): Promise<User | null> {
  const { data } = await getDb().from("Users").select("*").eq("email", email).single();
  return (data as User) || null;
}

async function getUserByRole(role: string): Promise<User | null> {
  try {
    const { data, error } = await getDb().from("Users").select("*").eq("role", role).eq("active", true).limit(1);
    if (error) { log.error(`Error buscando rol ${role}:`, (error as {message?: string})?.message || "Unknown error"); return null; }
    if (!data || data.length === 0) { log.error(`No se encontro usuario con rol: ${role}`); return null; }
    return (data[0] as User) || null;
  } catch (e: unknown) { log.error(`Excepcion buscando rol ${role}:`, (e as {message?: string})?.message); return null; }
}

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getClientIdentifier(request), { key: "req:create", ...RATE_LIMITS.WRITE });
  if (!rl.allowed) return rateLimitResponse(rl);

  const logs: string[] = [];

  try {
    const body = await request.json().catch(() => ({}));
    const { usuario, obra, comentarios, materiales, requiredDate, solicitante, subcategoria } = body;

    // P0 hardening 7-Abr-2026: validar usuario activo antes de crear requisicion
    if (!usuario?.email) {
      logger("REQUISICION").warn("[REQUISICION] usuario.email ausente - 401");
      return NextResponse.json({ error: "usuario.email requerido", logs }, { status: 401 });
    }
    const { data: callerCheck } = await getDb()
      .from("Users").select("email,role,active").eq("email", usuario.email).single();
    if (!callerCheck || callerCheck.active === false) {
      logger("REQUISICION").warn(`[REQUISICION] usuario no autorizado: ${usuario.email}`);
      return NextResponse.json({ error: "Usuario no autorizado", logs }, { status: 403 });
    }

    // ── Detección de duplicados (últimas 48h, misma obra, material similar) ──
    if (materiales?.length > 0) {
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const primerMat = String(materiales[0]?.name || "").trim().toLowerCase().substring(0, 5);
      if (primerMat.length >= 3) {
        const { data: recentReqs } = await getDb()
          .from("requisitions")
          .select("id, folio, cost_center_name, status")
          .ilike("cost_center_name", `%${obra.substring(0, 8)}%`)
          .gte("created_at", cutoff)
          .not("status", "in", '("RECHAZADA","RECHAZADA_DIRECCION")')
          .order("created_at", { ascending: false })
          .limit(10);

        if (recentReqs?.length) {
          for (const rr of recentReqs) {
            const { data: dupItems } = await getDb()
              .from("requisition_items")
              .select("product_name")
              .eq("requisition_id", rr.id)
              .ilike("product_name", `%${primerMat}%`)
              .limit(1);
            if (dupItems?.length) {
              // Posible duplicado — incluir advertencia en la respuesta pero NO bloquear
              logs.push(`⚠️ POSIBLE DUPLICADO detectado: ${rr.folio} (${rr.status}) tiene material similar "${dupItems[0].product_name}"`);
              log.warn(`[REQUISICION] Posible duplicado: ${rr.folio} para ${obra}`, { folio: rr.folio });
              break;
            }
          }
        }
      }
    }

    const folio = await getNextFolio();
    const token = crypto.randomUUID();

    // Determinar flujo: compras (default) o direccion (directo a autorización)
    let flujo = "compras";
    if (subcategoria) {
      const { data: catData } = await getDb()
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
    logger("REQUISICION").info(`[REQUISICION] Creador: ${usuario.email} (rol: ${creatorUser?.role})`);
    logs.push(`Flujo: ${flujo}`);
    if (comprasUser) logs.push(`Compras: ${comprasUser.email}`);
    logger("REQUISICION").info(`[REQUISICION] Compras: ${comprasUser?.email || "NO ENCONTRADO"}`);
    if (direccionUser) logs.push(`Dirección: ${direccionUser.email}`);

    const displayName = creatorUser?.display_name || creatorUser?.name || usuario.nombre;
    const isAdmin = creatorUser?.role === "admin";

    const initialStatus = flujo === "direccion" ? "EN_AUTORIZACION" : "PENDIENTE";

    const { data: req, error: reqErr } = await getDb().from("requisitions").insert({
      folio,
      cost_center_name: obra,
      instructions: comentarios,
      required_date: requiredDate,
      status: initialStatus,
      created_by: solicitante || displayName,
      user_email: usuario.email,
      authorization_comments: token,
      subcategoria: subcategoria || null,
      // ERP fields (additive — columnas opcionales, backwards compatible)
      ...(body.prioridad ? { prioridad: body.prioridad } : {}),
      ...(body.presupuesto_estimado ? { presupuesto_estimado: body.presupuesto_estimado } : {}),
      canal_origen: body.canal_origen || "WEB",
      ...(body.duplicado_de ? { duplicado_de: body.duplicado_de } : {}),
      ...(body.foto_ticket_url ? { foto_ticket_url: body.foto_ticket_url } : {}),
      // Datos de pago e IVA para PDF
      ...(body.forma_pago ? { forma_pago: body.forma_pago } : {}),
      ...(body.fecha_pago ? { fecha_pago: body.fecha_pago } : {}),
      ...(body.iva_porcentaje != null ? { iva_porcentaje: body.iva_porcentaje } : {}),
      // Datos de proveedor pre-seleccionado
      ...(body.proveedor_nombre ? { proveedor: body.proveedor_nombre } : {}),
      ...(body.proveedor_banco ? { banco: body.proveedor_banco } : {}),
      ...(body.proveedor_clabe ? { clabe_interbancaria: body.proveedor_clabe } : {}),
      ...(body.proveedor_cuenta ? { numero_cuenta: body.proveedor_cuenta } : {}),
      ...(body.proveedor_razon_social ? { nombre_cuenta: body.proveedor_razon_social } : {}),
    }).select().single();

    if (reqErr) throw reqErr;

    const items = materiales.map((m: Record<string, unknown>) => ({
      requisition_id: req.id, product_id: m.id || null, product_name: m.name, sku: m.sku || "", unit: m.unit,
      quantity: m.qty, comments: m.comments || "", category: m.category || "", subcategory: m.subcategory || "",
      // Precio capturado al crear (modo libre: monto por ítem; catálogo: null hasta picking)
      ...(m.price != null ? { selected_price: Number(m.price) } : {}),
    }));
    const { error: itemsErr } = await getDb().from("requisition_items").insert(items);
    if (itemsErr) throw itemsErr;

    const daysUntil = Math.ceil((new Date(requiredDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const urgencyText = daysUntil <= 0 ? "HOY" : daysUntil === 1 ? "MAÑANA" : `${daysUntil} días`;
    const urgencyColor = daysUntil <= 2 ? "#ef4444" : daysUntil <= 5 ? "#f59e0b" : "#10b981";
    const fechaGen = new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const fechaReq = new Date(requiredDate).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    // 22-Abr-2026: branding centralizado via src/lib/email-templates.ts
    const emailFooter = ariaEmailFooter(fechaGen);

    const materialesHtml = materiales.map((m: Record<string, unknown>) => `<tr><td style="padding:10px;border:1px solid #e2e8f0">${m.name}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${m.unit}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${m.qty}</td><td style="padding:10px;border:1px solid #e2e8f0">${m.comments || "-"}</td></tr>`).join("");
    const tablaHtml = `<table style="width:100%;border-collapse:collapse;margin:20px 0"><thead><tr style="background:#1e3a5f;color:white"><th style="padding:12px;text-align:left">Material</th><th style="padding:12px">Unidad</th><th style="padding:12px">Cantidad</th><th style="padding:12px;text-align:left">Obs</th></tr></thead><tbody>${materialesHtml}</tbody></table>`;
    const materialesResumen = materiales.map((m: Record<string, unknown>) => `${m.name} (${m.qty} ${m.unit})`).join(", ");

    const notificados: string[] = [];

    const destinoTexto = flujo === "direccion" ? "Dirección para autorización" : "Compras";

    // 1. EMAIL + WA AL CREADOR
    {
      const r = await sendEmailLogged({
        template: "requisicion_creada_creador",
        to: usuario.email,
        subject: `[CREADA] ${folio} - ${obra}`,
        html: ariaEmailWrapper(ariaEmailHeader("ARIA27 ERP") + `<div style="padding:25px"><h2 style="color:#1e3a5f;margin-top:0">Requisicion Generada</h2><p>Hola <strong>${displayName}</strong>, tu requisicion ha sido registrada y enviada a ${destinoTexto}.</p><div style="background:#f8fafc;border-radius:8px;padding:20px;margin:20px 0"><table style="width:100%"><tr><td style="color:#64748b">Folio:</td><td style="font-weight:bold">${folio}</td></tr><tr><td style="color:#64748b">Obra:</td><td style="font-weight:bold">${obra}</td></tr><tr><td style="color:#64748b">Generada:</td><td>${fechaGen}</td></tr><tr><td style="color:#64748b">Requerida:</td><td style="font-weight:bold;color:${urgencyColor}">${fechaReq}</td></tr></table></div>${tablaHtml}</div>` + emailFooter),
        origen: "req-creada-creador",
        enviadoPor: usuario.email,
      });
      if (r.success) { logs.push(`Email creador OK: ${usuario.email}`); logger("REQUISICION").info(`[REQUISICION] Email creador OK: ${usuario.email}`); }
      else { logs.push(`Email creador ERROR: ${r.error}`); logger("REQUISICION").error(`[REQUISICION] Email creador ERROR:`, r.error); }
    }

    if (creatorUser?.phone) {
      await sendWhatsAppLogged("requisicion_creada", [folio, displayName, obra, fechaReq], creatorUser.phone, { origen: "req-creada-creador", enviadoPor: usuario.email });
    }
    notificados.push(`Creador: ${usuario.email}`);

    // 2. EMAIL + WA A COMPRAS (solo flujo compras)
    if (flujo === "compras" && comprasUser) {
      {
        const r = await sendEmailLogged({
          template: "requisicion_creada_compras",
          to: comprasUser.email,
          subject: `[COTIZAR] ${folio} - ${obra} - ${urgencyText}`,
          html: ariaEmailWrapper(ariaEmailHeader("Nueva Requisicion para Compras") + `<div style="background:${urgencyColor};color:white;padding:18px;text-align:center"><div style="font-size:32px;font-weight:bold">${urgencyText}</div><div style="font-size:12px;opacity:0.9">para surtir - ${fechaReq}</div></div><div style="padding:25px"><div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px"><p><strong>Folio:</strong> ${folio}</p><p><strong>Obra:</strong> ${obra}</p><p><strong>Solicitante:</strong> ${displayName}</p></div>${tablaHtml}<div style="text-align:center;margin-top:30px"><a href="${BASE_URL}/dashboard/requisiciones/requisiciones/tramite" style="display:inline-block;background:#3b82f6;color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold">IR A COTIZAR</a></div></div>` + emailFooter),
          origen: "req-creada-compras",
          enviadoPor: usuario.email,
        });
        if (r.success) { logs.push(`Email compras OK: ${comprasUser.email}`); logger("REQUISICION").info(`[REQUISICION] Email compras OK: ${comprasUser.email}`); }
        else { logs.push(`Email compras ERROR: ${r.error}`); logger("REQUISICION").error(`[REQUISICION] Email compras ERROR:`, r.error); }
      }

      if (comprasUser.phone) {
        await sendWhatsAppLogged("requisicion_compras", [folio, obra, urgencyText, materialesResumen], comprasUser.phone, { origen: "req-creada-compras", enviadoPor: usuario.email });
      }
      notificados.push(`Compras: ${comprasUser.email}`);
    }

    // 2b. FLUJO DIRECCIÓN: Email + WA a dirección con botones AUTORIZAR/RECHAZAR
    if (flujo === "direccion" && direccionUser) {
      const approveUrl = `${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=AUTORIZADA`;
      const rejectUrl = `${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=RECHAZADA`;

      {
        const r = await sendEmailLogged({
          template: "requisicion_creada_direccion",
          to: direccionUser.email,
          subject: `[AUTORIZAR] ${folio} - ${obra} - ${subcategoria} - ${urgencyText}`,
          html: ariaEmailWrapper(ariaEmailHeader("Solicitud Directa de Autorizacion") + `<div style="background:${urgencyColor};color:white;padding:15px;text-align:center"><div style="font-size:28px;font-weight:bold">${urgencyText}</div><div style="font-size:12px;opacity:0.9">${subcategoria} - ${fechaReq}</div></div><div style="padding:25px"><div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px"><p><strong>Folio:</strong> ${folio}</p><p><strong>Obra:</strong> ${obra}</p><p><strong>Solicitante:</strong> ${displayName}</p><p><strong>Tipo:</strong> ${subcategoria}</p></div>${tablaHtml}<div style="text-align:center;margin:30px 0"><a href="${approveUrl}" style="display:inline-block;background:#10b981;color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold;margin:5px">AUTORIZAR</a><a href="${rejectUrl}" style="display:inline-block;background:#ef4444;color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold;margin:5px">RECHAZAR</a></div></div>` + emailFooter),
          origen: "req-creada-direccion",
          enviadoPor: usuario.email,
        });
        if (r.success) { logs.push(`Email dirección OK: ${direccionUser.email}`); logger("REQUISICION").info(`[REQUISICION] Email dirección OK: ${direccionUser.email}`); }
        else { logs.push(`Email dirección ERROR: ${r.error}`); logger("REQUISICION").error(`[REQUISICION] Email dirección ERROR:`, r.error); }
      }

      if (direccionUser.phone) {
        await sendWhatsAppLogged("requisicion_creada", [folio, displayName, obra, fechaReq], direccionUser.phone, { origen: "req-creada-direccion", enviadoPor: usuario.email });
      }
      notificados.push(`Dirección: ${direccionUser.email}`);
    }

    // 3. EMAIL AL ADMIN (informativo)
    if (!isAdmin && adminUser) {
      {
        const r = await sendEmailLogged({
          template: "requisicion_creada_admin",
          to: adminUser.email,
          subject: `[CREADA] ${folio} - ${obra} - ${displayName}`,
          html: ariaEmailWrapper(ariaEmailHeader("Nueva Requisicion") + `<div style="background:${urgencyColor};color:white;padding:15px;text-align:center"><div style="font-size:30px;font-weight:bold">${urgencyText}</div></div><div style="padding:25px"><div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px"><p><strong>Folio:</strong> ${folio}</p><p><strong>Solicitante:</strong> ${displayName}</p><p><strong>Obra:</strong> ${obra}</p><p><strong>Para:</strong> ${fechaReq}</p></div>${tablaHtml}</div>` + emailFooter),
          origen: "req-creada-admin",
          enviadoPor: usuario.email,
        });
        if (r.success) { logs.push(`Email admin OK: ${adminUser.email}`); logger("REQUISICION").info(`[REQUISICION] Email admin OK: ${adminUser.email}`); }
        else { logs.push(`Email admin ERROR: ${r.error}`); logger("REQUISICION").error(`[REQUISICION] Email admin ERROR:`, r.error); }
      }

      if (adminUser.phone) {
        await sendWhatsAppLogged("requisicion_creada", [folio, displayName, obra, fechaReq], adminUser.phone, { origen: "req-creada-admin", enviadoPor: usuario.email });
      }
      notificados.push(`Admin: ${adminUser.email}`);
    }

    const posibleDuplicado = logs.some(l => l.includes("POSIBLE DUPLICADO"));
    return NextResponse.json({ success: true, folio, flujo, notificados, logs, posibleDuplicado });
  } catch (error: unknown) {
    log.error(`ERROR:`, error);
    return NextResponse.json({ error: (error as {message?: string})?.message || "Unknown error", logs }, { status: 500 });
  }
}
