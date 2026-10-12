/**
 * ARIA27 Actividades · helpers de servidor (10-Oct-2026)
 * Avisos por WhatsApp con la plantilla aprobada aria_tarea_status (funciona fuera de la ventana de 24 h).
 * Meta no acepta saltos de linea en parametros: todo mensaje va en una sola linea.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { siguienteFolio } from "@/lib/folio";
import { sendWhatsAppLogged } from "@/lib/whatsapp";
import { pushAEmail } from "@/lib/push";

export type Persona = { nombre: string; email: string | null; phone: string | null };

const limpiar = (s: string) => String(s || "").replace(/[\r\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim();

/** Busca nombre y celular de una persona por correo de usuario (users) o por empleado. */
export async function personaPorEmail(db: SupabaseClient, email?: string | null): Promise<Persona | null> {
  const em = String(email || "").toLowerCase().trim();
  if (!em) return null;
  const { data: u } = await db.from("Users").select("email, name, display_name, phone").ilike("email", em).maybeSingle();
  const uu = u as { email?: string; name?: string; display_name?: string; phone?: string } | null;
  let phone = uu?.phone || null; let nombre = uu?.display_name || uu?.name || "";
  if (!phone || !nombre) {
    const { data: e } = await db.from("employees").select("full_name, whatsapp").or(`usuario_email.eq.${em},email.eq.${em}`).limit(1).maybeSingle();
    const ee = e as { full_name?: string; whatsapp?: string } | null;
    phone = phone || ee?.whatsapp || null; nombre = nombre || ee?.full_name || em;
  }
  return { nombre: nombre || em, email: em, phone };
}

export async function personaPorEmpleado(db: SupabaseClient, empleadoId?: string | null): Promise<Persona | null> {
  if (!empleadoId) return null;
  const { data: e } = await db.from("employees").select("full_name, whatsapp, email, usuario_email").eq("id", empleadoId).maybeSingle();
  const ee = e as { full_name?: string; whatsapp?: string; email?: string; usuario_email?: string } | null;
  if (!ee) return null;
  return { nombre: ee.full_name || "", email: (ee.usuario_email || ee.email || null)?.toLowerCase() || null, phone: ee.whatsapp || null };
}

export async function avisarWA(p: Persona | null, mensaje: string, origen: string, enviadoPor: string, push?: { title: string; url: string; tag?: string }): Promise<boolean> {
  if (/\bqa\b[\s\S]*no procesar/i.test(mensaje)) return false; // pruebas "QA … NO PROCESAR": no avisan a nadie
  // 10-Oct-2026: ademas del WhatsApp, notificacion en el telefono si la persona la activo
  if (p?.email && push) { try { await pushAEmail(p.email, { title: push.title, body: limpiar(mensaje).slice(0, 220), url: push.url, tag: push.tag }); } catch { /* push best effort */ } }
  if (!p?.phone) return false;
  const nombre = limpiar(p.nombre).split(" ")[0] || "Hola";
  const r = await sendWhatsAppLogged("aria_tarea_status", [nombre, "0", limpiar(mensaje).slice(0, 700)], p.phone, { origen, enviadoPor });
  return !!r.success;
}

/** 11-Oct-2026 (JJ): al que encarga (gente de oficina) se le avisa en la APP, no por WhatsApp.
 *  Notificación del teléfono/computadora si la activó; y siempre queda en Inicio como "por revisar". */
export async function avisarEnApp(email: string | null | undefined, msg: { title: string; body: string; url: string; tag?: string }): Promise<boolean> {
  if (/\bqa\b[\s\S]*no procesar/i.test(`${msg.title} ${msg.body}`)) return false;
  try { return (await pushAEmail(email, { title: msg.title, body: limpiar(msg.body).slice(0, 220), url: msg.url, tag: msg.tag })) > 0; } catch { return false; }
}

export async function registrarActualizacion(db: SupabaseClient, row: { tarea_id: string; autor_email: string; autor_nombre?: string | null; tipo: string; texto?: string | null; foto_url?: string | null; archivo_url?: string | null; archivo_nombre?: string | null }) {
  await db.from("tarea_actualizaciones").insert({ ...row, autor_nombre: row.autor_nombre || row.autor_email });
}

export function urlActividad(id: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://aria.jjcrm27.com";
  return `${base.replace(/\/$/, "")}/dashboard/actividades?abrir=${id}`;
}

// ── 11-Oct-2026: creación compartida (botón Nueva, plantillas, recurrentes, automatizaciones) ──
import { sendWhatsAppTemplateOrFallback } from "@/lib/whatsapp";
import { fechaCorta } from "@/lib/actividades";

const PRIOS_CREAR = ["URGENTE", "ALTA", "MEDIA", "BAJA"];
export type NuevaActividad = {
  titulo: string; descripcion?: string | null; asignado_id: string; fecha_compromiso: string; fecha_inicio?: string | null;
  obra_id?: string | null; obra?: string | null; prioridad?: string | null; checklist?: string[]; depende_de?: string | null; origen?: string | null;
  hora?: string | null;
};
/** Crea una actividad. avisar: "todo" = push + WhatsApp al responsable; "push" = solo notificación; "nada" = sin avisos. */
export async function crearActividad(db: SupabaseClient, a: NuevaActividad, porEmail: string, avisar: "todo" | "push" | "nada" = "todo"):
  Promise<{ ok: true; id: string; notificado: boolean; asignado: Persona } | { ok: false; error: string; status: number }> {
  // 11-Oct-2026: si no hay título pero sí pasos o detalles, se usa el primer renglón (no se atora)
  const titulo = (String(a.titulo || "").trim() || [...(a.checklist || []), String(a.descripcion || "")].join("\n").split("\n").map(x => x.trim()).find(Boolean) || "").slice(0, 200);
  if (!titulo) return { ok: false, error: "Escribe qué hay que hacer", status: 400 };
  if (!a.asignado_id) return { ok: false, error: "Elige quién la hace", status: 400 };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.fecha_compromiso || "")) return { ok: false, error: "Elige la fecha de entrega", status: 400 };
  const asignado = await personaPorEmpleado(db, a.asignado_id);
  if (!asignado) return { ok: false, error: "Esa persona no está en el personal", status: 400 };
  const por = porEmail.toLowerCase();
  const yo = await personaPorEmail(db, por);
  let obra: string | null = null; let obraId: string | null = null;
  if (a.obra_id) {
    const { data: o } = await db.from("centros_trabajo").select("id, nombre").eq("id", a.obra_id).maybeSingle();
    if (o) { obraId = (o as { id: string }).id; obra = (o as { nombre: string }).nombre; }
  }
  const prioridad = PRIOS_CREAR.includes(String(a.prioridad || "").toUpperCase()) ? String(a.prioridad).toUpperCase() : "MEDIA";
  const fechaInicio = /^\d{4}-\d{2}-\d{2}$/.test(String(a.fecha_inicio || "")) ? String(a.fecha_inicio) : null;
  const hora = normHora(a.hora);
  const folio = await siguienteFolio(db, "TAR"); // mismo consecutivo que las requisiciones
  const { data: ins, error } = await db.from("tareas_asignadas").insert({
    folio, titulo, descripcion: String(a.descripcion || "").trim().slice(0, 2000) || null,
    asignado_id: a.asignado_id, asignado_nombre: asignado.nombre, asignado_email: asignado.email,
    asignado_por: por, asignado_por_email: por,
    obra: obra || (String(a.obra || "").trim() || null), obra_id: obraId,
    fecha_inicio: fechaInicio, fecha_compromiso: a.fecha_compromiso, hora_compromiso: hora,
    prioridad, estatus: "PENDIENTE", avance: 0, depende_de: a.depende_de || null, origen: a.origen || null,
  }).select("id").single();
  if (error || !ins) return { ok: false, error: error?.message || "No se pudo crear", status: 500 };
  const id = (ins as { id: string }).id;
  const checklist = (a.checklist || []).map(x => String(x || "").trim()).filter(Boolean).slice(0, 30);
  if (checklist.length) await db.from("tarea_checklist").insert(checklist.map((texto, i) => ({ tarea_id: id, texto: texto.slice(0, 200), orden: i })));
  await registrarActualizacion(db, { tarea_id: id, autor_email: por, autor_nombre: yo?.nombre, tipo: "sistema", texto: `Creó la actividad y se la asignó a ${asignado.nombre}${a.origen ? ` (${a.origen})` : ""}` });

  let notificado = false;
  const esOtro = (asignado.email || "") !== por;
  if (avisar !== "nada" && esOtro && asignado.email) {
    try { await pushAEmail(asignado.email, { title: "📋 Nueva actividad", body: limpiar(`${yo?.nombre || por}: ${titulo}${obra ? ` · ${obra}` : ""} · entrega ${cuando(a.fecha_compromiso, hora)}`).slice(0, 220), url: `/dashboard/actividades?abrir=${id}`, tag: `act-${id}` }); } catch { /* push best effort */ }
  }
  if (avisar === "todo" && esOtro && asignado.phone) {
    const nombre = (asignado.nombre || "").split(" ")[0] || "Hola";
    const fecha = cuando(a.fecha_compromiso, hora);
    const r = await sendWhatsAppTemplateOrFallback(
      { template: "aria_actividad_asignada", params: [nombre, titulo.slice(0, 80), (obra || "oficina").slice(0, 60), fecha], buttonToken: id },
      { template: "aria_tarea_status", params: [nombre, "1", limpiar(`Nueva actividad de ${yo?.nombre || por}: ${titulo.slice(0, 120)}${obra ? ` en ${obra}` : ""}. Entrega: ${fecha}. Contesta LISTO, AVANCE 50 o BLOQUEADO y el motivo.`)] },
      asignado.phone, { origen: "actividad-asignada", enviadoPor: por },
    );
    notificado = !!r.success;
  }
  // 11-Oct-2026 (JJ): también por correo (Resend) a quien se la asignaron, con fecha y hora
  if (avisar === "todo" && esOtro && asignado.email) {
    const ok = await correoActividad(db, asignado, { id, titulo, obra, cuando: cuando(a.fecha_compromiso, hora), de: yo?.nombre || por, prioridad, descripcion: a.descripcion || null }, por);
    notificado = notificado || ok;
  }
  return { ok: true, id, notificado, asignado };
}

/** Cuando una actividad se termina, avisa a quienes la estaban esperando (dependencias). */
export async function avisarDependientes(db: SupabaseClient, terminada: { id: string; titulo: string; obra?: string | null }, porEmail: string): Promise<number> {
  const { data } = await db.from("tareas_asignadas").select("id, titulo, asignado_id, estatus").eq("depende_de", terminada.id).in("estatus", ["PENDIENTE", "EN_PROGRESO"]);
  let n = 0;
  for (const s of (data || []) as { id: string; titulo: string; asignado_id: string }[]) {
    const p = await personaPorEmpleado(db, s.asignado_id);
    if (!p || p.email === porEmail.toLowerCase()) continue;
    await registrarActualizacion(db, { tarea_id: s.id, autor_email: porEmail, tipo: "sistema", texto: `Ya puedes empezar: se terminó "${terminada.titulo}"` });
    if (await avisarWA(p, `Ya puedes empezar "${s.titulo}"${terminada.obra ? ` (${terminada.obra})` : ""}: se terminó "${terminada.titulo}".`, "actividad-dependencia", porEmail, { title: "▶️ Ya puedes empezar", url: `/dashboard/actividades?abrir=${s.id}`, tag: `act-${s.id}` })) n++;
  }
  return n;
}

// ── 11-Oct-2026: recorrer las que siguen cuando una se atrasa (dependencias tipo Monday) ──
import { recorrerSiguientes, type ActDep } from "@/lib/dependencias";
export async function aplicarRecorrido(db: SupabaseClient, id: string, nuevoFin: string, porEmail: string, avisar = true): Promise<number> {
  const { data } = await db.from("tareas_asignadas").select("id, titulo, depende_de, fecha_inicio, fecha_compromiso, estatus, asignado_id, obra").neq("estatus", "CANCELADA").limit(3000);
  const acts = (data || []) as (ActDep & { titulo: string; asignado_id: string | null })[];
  const origen = acts.find(a => a.id === id);
  const cambios = recorrerSiguientes(acts, id, nuevoFin);
  for (const c of cambios) {
    await db.from("tareas_asignadas").update({ fecha_inicio: c.fecha_inicio, fecha_compromiso: c.fecha_compromiso, updated_at: new Date().toISOString() }).eq("id", c.id);
    const a = acts.find(x => x.id === c.id);
    const texto = `Se recorrió ${c.dias} día${c.dias === 1 ? "" : "s"} (inicia ${fechaCorta(c.fecha_inicio)}, entrega ${fechaCorta(c.fecha_compromiso)}) porque "${origen?.titulo || "la anterior"}" terminará después`;
    await registrarActualizacion(db, { tarea_id: c.id, autor_email: porEmail, tipo: "sistema", texto });
    if (avisar && a?.asignado_id) {
      const p = await personaPorEmpleado(db, a.asignado_id);
      if (p && p.email !== porEmail.toLowerCase()) await avisarWA(p, `Tu actividad "${a.titulo}"${a.obra ? ` (${a.obra})` : ""} se recorrió ${c.dias} día${c.dias === 1 ? "" : "s"}: ahora inicia ${fechaCorta(c.fecha_inicio)} y se entrega ${fechaCorta(c.fecha_compromiso)}, porque "${origen?.titulo || "la anterior"}" se atrasó.`, "actividad-recorrida", porEmail, { title: "📅 Se recorrió tu actividad", url: `/dashboard/actividades?abrir=${c.id}`, tag: `act-${c.id}` });
    }
  }
  return cambios.length;
}

// ── 11-Oct-2026: hora de entrega + correo de actividad asignada ──
import { sendEmailLogged } from "@/lib/email-log";
/** "9", "9:5", "09:30", "9:30 am" → "09:30"; inválida → null */
export function normHora(h?: string | null): string | null {
  const m = String(h || "").trim().toLowerCase().match(/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let H = Number(m[1]); const M = Number(m[2] || 0);
  if (m[3] === "pm" && H < 12) H += 12; if (m[3] === "am" && H === 12) H = 0;
  if (H > 23 || M > 59) return null;
  return `${String(H).padStart(2, "0")}:${String(M).padStart(2, "0")}`;
}
/** "vie 17 oct, 10:00" (o solo la fecha si no hay hora) */
export function cuando(fecha?: string | null, hora?: string | null): string {
  const f = fecha ? fechaCorta(fecha) : "sin fecha"; const h = normHora(hora);
  return h ? `${f}, ${h} h` : f;
}
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
async function correoActividad(db: SupabaseClient, p: Persona, a: { id: string; titulo: string; obra: string | null; cuando: string; de: string; prioridad: string; descripcion: string | null }, por: string): Promise<boolean> {
  try {
    // Respeta users.notif_email = false (la persona pidió no recibir correos)
    const { data: u } = await db.from("users").select("notif_email").eq("email", p.email).maybeSingle();
    if ((u as { notif_email?: boolean | null } | null)?.notif_email === false) return false;
    const url = urlActividad(a.id); const nombre = esc((p.nombre || "").split(" ")[0] || "Hola");
    const urgente = a.prioridad === "URGENTE" || a.prioridad === "ALTA";
    const fila = (k: string, v: string) => `<tr><td style="padding:6px 0;color:#55657c;font-size:13px;width:110px">${k}</td><td style="padding:6px 0;color:#0f172a;font-size:15px;font-weight:600">${esc(v)}</td></tr>`;
    const html = `<div style="background:#f6f7fa;padding:24px 12px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e8ee;border-radius:18px;overflow:hidden">
<div style="background:#0060c7;padding:18px 22px;color:#ffffff"><div style="font-size:13px;opacity:.85">Doménica 27 · Nueva actividad</div><div style="font-size:20px;font-weight:800;margin-top:4px">${esc(a.titulo)}</div></div>
<div style="padding:20px 22px"><p style="margin:0 0 12px;color:#0f172a;font-size:15px">${nombre}, ${esc(a.de)} te asignó esta actividad.</p>
<table style="width:100%;border-collapse:collapse">${fila("Entrega", a.cuando)}${fila("Obra", a.obra || "Oficina")}${fila("Prioridad", urgente ? (a.prioridad === "URGENTE" ? "Urgente" : "Alta") : "Normal")}</table>
${a.descripcion ? `<p style="margin:14px 0 0;color:#334155;font-size:14px;line-height:1.45">${esc(a.descripcion.slice(0, 600))}</p>` : ""}
<a href="${url}" style="display:block;margin-top:20px;background:#0073ea;color:#ffffff;text-decoration:none;text-align:center;font-weight:700;font-size:15px;padding:14px;border-radius:12px">Abrir la actividad</a>
<p style="margin:14px 0 0;color:#55657c;font-size:12px">También puedes contestar por WhatsApp: LISTO, AVANCE 50 o BLOQUEADO y el motivo.</p></div></div></div>`;
    const r = await sendEmailLogged({ template: "actividad_asignada", to: p.email as string, subject: `Nueva actividad: ${a.titulo.slice(0, 80)} · entrega ${a.cuando}`, html, origen: "actividad-asignada", enviadoPor: por, sinCopiaAdmin: true });
    return r.success;
  } catch { return false; }
}
