/**
 * WhatsApp → Actividades (11-Oct-2026)
 * El bot real de WhatsApp es /api/webhook/attendance (asistencia, pedidos, gastos). Las respuestas a las actividades
 * ("ya quedó", "50", "no hay cemento", "APROBAR") NUNCA llegaban a las actividades: caían en el menú de ayuda o en gastos.
 * Aquí se decide, antes que nada, si el mensaje es de una actividad y se procesa; si no, el bot sigue como siempre.
 * Fotos y notas de voz: se guardan como evidencia en la actividad que la persona tenga activa.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { leerRespuestaWA } from "@/lib/respuesta-wa";
import { leerAprobacionWA } from "@/lib/aprobacion";
import { downloadWhatsAppMedia } from "@/lib/image-watermark";

type Msg = { type: string; id?: string; text?: { body?: string }; image?: { id: string; caption?: string; mime_type?: string }; audio?: { id: string; mime_type?: string; voice?: boolean } };
export type ResultadoWA = { manejado: false } | { manejado: true; accion: string; respuesta?: string };

const PEDIDO = /^(pedir|pide|req|necesito|solicitar|ocupo)\b|requisici|pedir materiales/;
const PALABRAS_EVIDENCIA = /\b(avance|evidencia|tarea|actividad|quedo|termin|listo|ya esta|asi va|asi quedo|foto)\b/;
const n = (s: string) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

async function persona(db: SupabaseClient, phone10: string) {
  const { data: emps } = await db.from("employees").select("id, full_name, usuario_email, email, whatsapp, status").ilike("whatsapp", `%${phone10}%`);
  const e = ((emps || []) as { id: string; full_name: string; usuario_email: string | null; email: string | null; whatsapp: string | null; status: string | null }[])
    .find(x => (x.whatsapp || "").replace(/\D/g, "").slice(-10) === phone10 && x.status !== "BAJA") || null;
  const { data: us } = await db.from("users").select("email").eq("phone", phone10);
  const correos = new Set<string>();
  if (e?.usuario_email) correos.add(e.usuario_email.toLowerCase()); if (e?.email) correos.add(e.email.toLowerCase());
  for (const u of (us || []) as { email: string }[]) correos.add(u.email.toLowerCase());
  return { e, correos: [...correos] };
}

async function abiertas(db: SupabaseClient, empId: string | null, correos: string[]) {
  if (!empId && !correos.length) return [];
  let q = db.from("tareas_asignadas").select("id, titulo, respuesta_ultima_at, updated_at, created_at").not("estatus", "in", "(COMPLETADA,CANCELADA)");
  q = empId ? q.or(`asignado_id.eq.${empId}${correos.length ? `,asignado_email.in.(${correos.join(",")})` : ""}`) : q.in("asignado_email", correos);
  const { data } = await q.order("updated_at", { ascending: false }).limit(20);
  return (data || []) as { id: string; titulo: string; respuesta_ultima_at: string | null; updated_at: string | null; created_at: string }[];
}

/** Manda el texto al procesador de respuestas de actividades (ruta interna protegida) */
async function procesarTexto(origen: string, phoneRaw: string, text: string): Promise<{ ok: boolean; intent?: string; action?: string }> {
  const r = await fetch(`${origen}/api/tareas/respuesta`, { method: "POST", headers: { "Content-Type": "application/json", "x-aria-interno": process.env.CRON_SECRET || "" }, body: JSON.stringify({ phone: phoneRaw, text }) });
  return await r.json().catch(() => ({ ok: false }));
}

async function guardarMedia(db: SupabaseClient, mediaId: string, tareaId: string, tipo: "foto" | "audio"): Promise<string | null> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN || "";
  const meta = await fetch(`https://graph.facebook.com/v22.0/${mediaId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => null) as { url?: string; mime_type?: string } | null;
  if (!meta?.url) return null;
  const m = await downloadWhatsAppMedia(meta.url, token); if (!m) return null;
  const mime = m.mimeType || meta.mime_type || (tipo === "foto" ? "image/jpeg" : "audio/ogg");
  const ext = tipo === "foto" ? (mime.includes("png") ? "png" : "jpg") : (mime.includes("mpeg") ? "mp3" : mime.includes("mp4") ? "m4a" : "ogg");
  const path = `actividades/${tareaId}/wa_${Date.now()}_${mediaId.slice(-6)}.${ext}`;
  const { error } = await db.storage.from("expedientes").upload(path, m.buffer, { contentType: mime.split(";")[0], upsert: false });
  if (error) return null;
  return db.storage.from("expedientes").getPublicUrl(path).data.publicUrl;
}

/** Decisión pura (tests/wa-actividades.test.ts): ¿este texto es de una actividad, una aprobación, o del resto del bot? */
export function clasificarTextoWA(texto: string, tieneTareas: boolean, tieneAprobaciones: boolean): "aprobacion" | "actividad" | "otro" {
  const t = n(texto);
  if (!t || PEDIDO.test(t)) return "otro";
  if (/\b(gasto|gaste|compre|pague|ticket|factura)\b/.test(t)) return "otro";
  if (tieneAprobaciones && leerAprobacionWA(texto)) return "aprobacion";
  if (tieneTareas && leerRespuestaWA(texto).intent !== "DESCONOCIDO") return "actividad";
  return "otro";
}

export async function mensajeDeActividad(db: SupabaseClient, origen: string, msg: Msg, from: string, phone10: string): Promise<ResultadoWA> {
  const { e, correos } = await persona(db, phone10);
  if (!e && !correos.length) return { manejado: false };
  const mias = await abiertas(db, e?.id || null, correos);
  let porAprobar = 0;
  if (correos.length) { const { count } = await db.from("tareas_asignadas").select("id", { count: "exact", head: true }).eq("por_aprobar", true).in("asignado_por_email", correos); porAprobar = count || 0; }
  if (!mias.length && !porAprobar) return { manejado: false };

  // TEXTO
  if (msg.type === "text") {
    const texto = String(msg.text?.body || "");
    const c = clasificarTextoWA(texto, mias.length > 0, porAprobar > 0);
    if (c === "otro") return { manejado: false };
    const r = await procesarTexto(origen, from, texto);
    return { manejado: true, accion: `${c}:${r.action || r.intent || "?"}` };
  }

  // FOTO o NOTA DE VOZ → evidencia de la actividad activa
  if ((msg.type === "image" && msg.image?.id) || (msg.type === "audio" && msg.audio?.id)) {
    if (!mias.length) return { manejado: false };
    const esFoto = msg.type === "image";
    const caption = n(msg.image?.caption || "");
    if (esFoto) {
      if (caption && PEDIDO.test(caption)) return { manejado: false };
      if (/\boc-\d{4}-\d{5}\b/.test(caption) || /\b(gasto|ticket|factura|inventario|entrada|salida|transferencia)\b/.test(caption)) return { manejado: false };
      // Sin palabras de evidencia, solo si la persona contestó algo de su actividad hace poco (30 min)
      const reciente = mias.some(x => x.respuesta_ultima_at && Date.now() - new Date(x.respuesta_ultima_at).getTime() < 30 * 60_000);
      if (!(caption && (PALABRAS_EVIDENCIA.test(caption) || leerRespuestaWA(caption).intent !== "DESCONOCIDO")) && !reciente) return { manejado: false };
    }
    const tarea = [...mias].sort((a, b) => new Date(b.respuesta_ultima_at || b.updated_at || b.created_at).getTime() - new Date(a.respuesta_ultima_at || a.updated_at || a.created_at).getTime())[0];
    const url = await guardarMedia(db, esFoto ? msg.image!.id : msg.audio!.id, tarea.id, esFoto ? "foto" : "audio");
    if (!url) return { manejado: true, accion: "media-fallo", respuesta: `No pude guardar ${esFoto ? "la foto" : "la nota de voz"}. Intenta otra vez.` };
    await db.from("tarea_actualizaciones").insert({ tarea_id: tarea.id, autor_email: e?.usuario_email || correos[0] || null, autor_nombre: e?.full_name || "WhatsApp", tipo: esFoto ? "foto" : "archivo",
      texto: esFoto ? (msg.image?.caption ? `Foto por WhatsApp: ${msg.image.caption}` : "Foto por WhatsApp") : "Nota de voz por WhatsApp", foto_url: esFoto ? url : null, archivo_url: esFoto ? null : url, archivo_nombre: esFoto ? null : "Nota de voz" });
    await db.from("tareas_asignadas").update({ respuesta_ultima_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", tarea.id);
    // Si la foto dice "ya quedó", además la marca terminada
    if (esFoto && caption && leerRespuestaWA(caption).intent !== "DESCONOCIDO") await procesarTexto(origen, from, msg.image?.caption || "");
    return { manejado: true, accion: esFoto ? "foto" : "audio", respuesta: `${esFoto ? "📷 Foto" : "🎤 Nota de voz"} agregada a tu actividad "${tarea.titulo}". Si ya quedó, contesta LISTO.` };
  }
  return { manejado: false };
}
