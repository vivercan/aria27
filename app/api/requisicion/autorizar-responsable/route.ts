/**
 * /api/requisicion/autorizar-responsable — ARIA27 Campo F2 (10-Oct-2026)
 * POST { id, action: "AUTORIZAR" | "RECHAZAR", comentario? }
 *
 * Primer nivel de autorización: el responsable de la obra (centros_trabajo.responsable_email),
 * Dirección o admin. Al AUTORIZAR la requi sigue su flujo normal (Compras o Dirección) y se
 * disparan los avisos que antes salían al crearla. Al RECHAZAR se avisa al creador.
 *
 * AUTH: requireUser (cookie). Permiso: email == responsable_email || rol admin|direccion|validador (superintendencia como respaldo).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { sendWhatsAppLogged, sendWhatsAppTemplateOrFallback } from "@/lib/whatsapp";
import { sendEmailLogged } from "@/lib/email-log";
import { emailAllowed } from "@/lib/notif-policy";
import { ariaEmailHeader, ariaEmailFooter, ariaEmailWrapper } from "@/lib/email-templates";
import { notifyOps } from "@/lib/notify-ops";

export const dynamic = "force-dynamic";
const log = logger("AUTORIZAR-RESPONSABLE");
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://aria.jjcrm27.com";

type U = { email: string; role: string; phone?: string | null; name?: string | null; display_name?: string | null; notif_email?: boolean | null };

function urgencia(requiredDate?: string | null): string {
  if (!requiredDate) return "SIN FECHA";
  const d = Math.ceil((new Date(requiredDate).getTime() - Date.now()) / 86400000);
  if (d <= 0) return "HOY"; if (d === 1) return "MAÑANA"; return `${d} DÍAS`;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.res;
    const body = await req.json().catch(() => ({}));
    const id = String(body.id || ""); const action = String(body.action || "").toUpperCase(); const comentario = String(body.comentario || "").trim().slice(0, 500);
    if (!id || !["AUTORIZAR", "RECHAZAR"].includes(action)) return NextResponse.json({ error: "id y action (AUTORIZAR|RECHAZAR) requeridos" }, { status: 400 });
    if (action === "RECHAZAR" && !comentario) return NextResponse.json({ error: "Escribe el motivo del rechazo" }, { status: 400 });

    const db = getSupabaseAdmin();
    const { data: r, error } = await db.from("requisitions").select("*").eq("id", id).maybeSingle();
    if (error || !r) return NextResponse.json({ error: "Requisición no encontrada" }, { status: 404 });
    if (r.status !== "PENDIENTE_RESPONSABLE") return NextResponse.json({ error: `La requisición ya no está esperando al responsable (status ${r.status})` }, { status: 409 });

    const me = auth.email.toLowerCase(); const role = (auth.role || "").toLowerCase();
    const esResp = (r.responsable_email || "").toLowerCase() === me;
    // 10-Oct: validador (superintendencia) es respaldo del residente (residente sin telefono, ausente o de vacaciones)
    if (!esResp && role !== "admin" && role !== "direccion" && role !== "validador") return NextResponse.json({ error: "Solo el responsable de la obra, Superintendencia, Dirección o admin pueden autorizar" }, { status: 403 });

    const folio = r.folio as string; const obra = r.cost_center_name as string; const fechaReq = r.required_date ? new Date(r.required_date).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "";
    const creador = r.created_by as string; const creadorEmail = r.user_email as string;
    const { data: creadorU } = await db.from("Users").select("email, role, phone, name, display_name, notif_email").eq("email", creadorEmail).maybeSingle();

    if (action === "RECHAZAR") {
      await db.from("requisitions").update({ status: "RECHAZADA_RESPONSABLE", responsable_comentario: comentario, responsable_autorizo_at: new Date().toISOString(), responsable_autorizo_by: me }).eq("id", id);
      const cu = creadorU as U | null;
      try { const { pushAEmail } = await import("@/lib/push"); await pushAEmail(creadorEmail, { title: `❌ ${folio} rechazada`, body: `${obra}: ${comentario}`, url: `/dashboard/requisiciones/requisiciones/estatus?open=${id}`, tag: `req-${id}` }); } catch { /* push best effort */ }
      if (cu?.phone) {
        const nom = (cu.display_name || cu.name || creador || "Equipo").slice(0, 60);
        await sendWhatsAppTemplateOrFallback(
          { template: "aria_solicitud_estado", params: [nom, folio, obra, `rechazada en obra: ${comentario}`.slice(0, 200)], buttonToken: id },
          { template: "aria_tarea_status", params: [nom, "0", `❌ ${folio} ${obra} fue rechazada por ${me}: ${comentario}`.slice(0, 700)] },
          cu.phone, { origen: "responsable-rechazo", enviadoPor: me });
      }
      await db.from("event_log").insert({ tipo: "REQUISICION_RECHAZADA_RESPONSABLE", resumen: `${folio} ${obra} rechazada por responsable`, detalle: comentario, actor: me, metadata: { folio, id } }).then(() => {}, () => {});
      log.info("rechazada", { folio, by: me });
      return NextResponse.json({ success: true, status: "RECHAZADA_RESPONSABLE" });
    }

    // AUTORIZAR → flujo normal
    let flujo = "compras";
    if (r.tipo_solicitud === "DESTAJO") flujo = "direccion";
    else if (r.subcategoria) {
      const { data: cat } = await db.from("catalogos_requisiciones").select("flujo").eq("tipo", "SUBCATEGORIA").eq("valor", r.subcategoria).maybeSingle();
      if ((cat as { flujo?: string } | null)?.flujo) flujo = String((cat as { flujo?: string }).flujo);
    }
    const nuevoStatus = flujo === "direccion" ? "EN_AUTORIZACION" : "PENDIENTE";
    const { error: upErr } = await db.from("requisitions").update({ status: nuevoStatus, responsable_autorizo_at: new Date().toISOString(), responsable_autorizo_by: me, ...(comentario ? { responsable_comentario: comentario } : {}) }).eq("id", id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    const urg = urgencia(r.required_date as string | null);
    const { data: items } = await db.from("requisition_items").select("product_name, quantity, unit").eq("requisition_id", id);
    const resumen = ((items || []) as Array<{ product_name: string; quantity: number; unit: string }>).map(i => `${i.product_name} (${i.quantity} ${i.unit})`).join(", ").slice(0, 900) || String(r.motivo_solicitud || r.descripcion_compra || "");
    const tabla = `<table style="width:100%;border-collapse:collapse;margin:16px 0"><thead><tr style="background:#1e3a5f;color:#fff"><th style="padding:8px;text-align:left">Material</th><th style="padding:8px">Cant.</th></tr></thead><tbody>${((items || []) as Array<{ product_name: string; quantity: number; unit: string }>).map(i => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.product_name}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity} ${i.unit}</td></tr>`).join("")}</tbody></table>`;
    const footer = ariaEmailFooter();
    const notificados: string[] = [];

    if (flujo === "compras") {
      const { data: cU } = await db.from("Users").select("email, role, phone, name, display_name, notif_email").eq("role", "compras").eq("active", true).limit(1).maybeSingle();
      const compras = cU as U | null;
      if (compras?.phone) { await sendWhatsAppLogged("requisicion_compras", [folio, obra, urg, resumen.slice(0, 300)], compras.phone, { origen: "responsable-ok-compras", enviadoPor: me }); notificados.push(`Compras WA`); }
      if (compras?.email && emailAllowed("compras", compras.notif_email)) {
        await sendEmailLogged({ template: "requisicion_creada_compras", to: compras.email, subject: `[COTIZAR] ${folio} - ${obra} - ${urg}`, html: ariaEmailWrapper(ariaEmailHeader("Nueva Requisicion para Cotizar") + `<div style="padding:25px"><p><strong>Folio:</strong> ${folio}<br><strong>Obra:</strong> ${obra}<br><strong>Solicitante:</strong> ${creador}<br><strong>Autorizó en obra:</strong> ${me}</p>${tabla}<div style="text-align:center;margin-top:24px"><a href="${BASE_URL}/dashboard/requisiciones/requisiciones/tramite" style="display:inline-block;background:#3b82f6;color:#fff;padding:14px 36px;text-decoration:none;border-radius:30px;font-weight:bold">IR A COTIZAR</a></div></div>` + footer), origen: "responsable-ok-compras", enviadoPor: me });
        notificados.push(`Compras email`);
      }
    } else {
      const { data: dU } = await db.from("Users").select("email, role, phone, name, display_name, notif_email").eq("role", "direccion").eq("active", true).limit(1).maybeSingle();
      const dir = dU as U | null; const token = r.authorization_comments as string;
      if (dir?.phone) { await sendWhatsAppLogged("requisicion_creada", [folio, creador, obra, fechaReq], dir.phone, { origen: "responsable-ok-direccion", enviadoPor: me }); notificados.push(`Dirección WA`); }
      if (dir?.email && emailAllowed("direccion_accion", dir.notif_email)) {
        const ok = `${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=AUTORIZADA`; const no = `${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=RECHAZADA`;
        await sendEmailLogged({ template: "requisicion_creada_direccion", to: dir.email, subject: `[AUTORIZAR] ${folio} - ${obra} - ${r.subcategoria || ""} - ${urg}`, html: ariaEmailWrapper(ariaEmailHeader("Solicitud de Autorizacion") + `<div style="padding:25px"><p><strong>Folio:</strong> ${folio}<br><strong>Obra:</strong> ${obra}<br><strong>Solicitante:</strong> ${creador}<br><strong>Autorizó en obra:</strong> ${me}</p>${tabla}<div style="text-align:center;margin:28px 0"><a href="${ok}" style="display:inline-block;background:#10b981;color:#fff;padding:14px 36px;text-decoration:none;border-radius:30px;font-weight:bold;margin:4px">AUTORIZAR</a><a href="${no}" style="display:inline-block;background:#ef4444;color:#fff;padding:14px 36px;text-decoration:none;border-radius:30px;font-weight:bold;margin:4px">RECHAZAR</a></div></div>` + footer), origen: "responsable-ok-direccion", enviadoPor: me });
        notificados.push(`Dirección email`);
      }
    }
    // Admin (solo WA por política) + notifyOps global
    const { data: aU } = await db.from("Users").select("email, role, phone, notif_email").eq("role", "admin").eq("active", true).limit(1).maybeSingle();
    const admin = aU as U | null;
    if (admin?.phone && admin.email.toLowerCase() !== creadorEmail.toLowerCase()) await sendWhatsAppLogged("requisicion_creada", [folio, creador, obra, fechaReq], admin.phone, { origen: "responsable-ok-admin", enviadoPor: me });
    void notifyOps({ evento: "REQUISICION_CREADA", resumen: `${folio} ${obra} - ${creador} (autorizó ${me})`, detalle: `Folio: ${folio}\nObra: ${obra}\nSolicitante: ${creador}\nFlujo: ${flujo}\nUrgencia: ${urg}`, actor: me, metadata: { folio, obra, flujo, urgency: urg, nivel1: true } }).catch(() => {});
    // Creador: WA de avance
    const cu = creadorU as U | null;
    if (creadorEmail && creadorEmail.toLowerCase() !== me) { try { const { pushAEmail } = await import("@/lib/push"); await pushAEmail(creadorEmail, { title: `✅ ${folio} autorizada en obra`, body: `${obra} · sigue ${flujo === "direccion" ? "Dirección" : "Compras"}`, url: `/dashboard/requisiciones/requisiciones/estatus?open=${id}`, tag: `req-${id}` }); } catch { /* push best effort */ } }
    if (cu?.phone && cu.email.toLowerCase() !== me) {
      const nom = (cu.display_name || cu.name || creador || "Equipo").slice(0, 60);
      await sendWhatsAppTemplateOrFallback(
        { template: "aria_solicitud_estado", params: [nom, folio, obra, `autorizada en obra; sigue ${flujo === "direccion" ? "Dirección" : "Compras"}`], buttonToken: id },
        { template: "aria_tarea_status", params: [nom, "0", `✅ ${folio} ${obra} autorizada en obra por ${me}. Sigue: ${flujo === "direccion" ? "Dirección" : "Compras"}.`.slice(0, 700)] },
        cu.phone, { origen: "responsable-ok-creador", enviadoPor: me });
    }

    log.info("autorizada", { folio, by: me, flujo, nuevoStatus });
    return NextResponse.json({ success: true, status: nuevoStatus, flujo, notificados });
  } catch (e: unknown) {
    log.error("exception", { err: (e as Error)?.message });
    return NextResponse.json({ error: (e as Error)?.message || "Error" }, { status: 500 });
  }
}
