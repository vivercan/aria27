/**
 * ARIA27 Actividades · helpers de servidor (10-Oct-2026)
 * Avisos por WhatsApp con la plantilla aprobada aria_tarea_status (funciona fuera de la ventana de 24 h).
 * Meta no acepta saltos de linea en parametros: todo mensaje va en una sola linea.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
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
  // 10-Oct-2026: ademas del WhatsApp, notificacion en el telefono si la persona la activo
  if (p?.email && push) { try { await pushAEmail(p.email, { title: push.title, body: limpiar(mensaje).slice(0, 220), url: push.url, tag: push.tag }); } catch { /* push best effort */ } }
  if (!p?.phone) return false;
  const nombre = limpiar(p.nombre).split(" ")[0] || "Hola";
  const r = await sendWhatsAppLogged("aria_tarea_status", [nombre, "0", limpiar(mensaje).slice(0, 700)], p.phone, { origen, enviadoPor });
  return !!r.success;
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
};
/** Crea una actividad. avisar: "todo" = push + WhatsApp al responsable; "push" = solo notificación; "nada" = sin avisos. */
export async function crearActividad(db: SupabaseClient, a: NuevaActividad, porEmail: string, avisar: "todo" | "push" | "nada" = "todo"):
  Promise<{ ok: true; id: string; notificado: boolean; asignado: Persona } | { ok: false; error: string; status: number }> {
  const titulo = String(a.titulo || "").trim().slice(0, 200);
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
  const { data: ins, error } = await db.from("tareas_asignadas").insert({
    titulo, descripcion: String(a.descripcion || "").trim().slice(0, 2000) || null,
    asignado_id: a.asignado_id, asignado_nombre: asignado.nombre, asignado_email: asignado.email,
    asignado_por: por, asignado_por_email: por,
    obra: obra || (String(a.obra || "").trim() || null), obra_id: obraId,
    fecha_inicio: fechaInicio, fecha_compromiso: a.fecha_compromiso,
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
    try { await pushAEmail(asignado.email, { title: "📋 Nueva actividad", body: limpiar(`${yo?.nombre || por}: ${titulo}${obra ? ` · ${obra}` : ""} · entrega ${fechaCorta(a.fecha_compromiso)}`).slice(0, 220), url: `/dashboard/actividades?abrir=${id}`, tag: `act-${id}` }); } catch { /* push best effort */ }
  }
  if (avisar === "todo" && esOtro && asignado.phone) {
    const nombre = (asignado.nombre || "").split(" ")[0] || "Hola";
    const fecha = fechaCorta(a.fecha_compromiso);
    const r = await sendWhatsAppTemplateOrFallback(
      { template: "aria_actividad_asignada", params: [nombre, titulo.slice(0, 80), (obra || "oficina").slice(0, 60), fecha], buttonToken: id },
      { template: "aria_tarea_status", params: [nombre, "1", limpiar(`Nueva actividad de ${yo?.nombre || por}: ${titulo.slice(0, 120)}${obra ? ` en ${obra}` : ""}. Entrega: ${fecha}. Contesta LISTO, AVANCE 50 o BLOQUEADO y el motivo.`)] },
      asignado.phone, { origen: "actividad-asignada", enviadoPor: por },
    );
    notificado = !!r.success;
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
