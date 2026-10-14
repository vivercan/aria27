/**
 * Seguimiento de solicitudes viejas · "¿Ya llegó?" (14-Oct-2026 · JJ)
 * Caso real: 124 solicitudes en "Pendiente" de más de 7 días y solo 1 marcada como Entregada en 30 días.
 * El material casi siempre ya llegó, pero nadie lo marcó: los tableros y recordatorios mentían.
 *
 * Regla: una solicitud abierta (no destajo) que lleva 15 días o más sin moverse se le pregunta a quien la pidió,
 * por WhatsApp y en la app: ¿ya llegó?
 *  - SÍ  → se cierra como Entregada (queda registro de quién confirmó y por dónde).
 *  - NO  → sigue viva, Compras lo ve en el tablero y se vuelve a preguntar si pasan otros 15 días sin moverse.
 *  - YA NO SE OCUPA (solo en la app) → se cancela.
 * A cada persona le llega como máximo un WhatsApp al día, con la lista; se le pregunta hasta 3 veces.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const DIAS_SIN_MOVER = 15;
export const DIAS_ENTRE_PREGUNTAS = 7;
export const MAX_PREGUNTAS = 3;
export const ABIERTAS = ["PENDIENTE", "EN_COTIZACION", "EN_AUTORIZACION", "APROBADA", "OC_GENERADA", "PAGADA", "ENTREGA_PARCIAL"];

export type RequiSeg = {
  id: string; folio: string | null; status: string | null; tipo_solicitud?: string | null; purchase_status?: string | null; forma_pago?: string | null;
  user_email?: string | null; cost_center_name?: string | null; descripcion_corta?: string | null; descripcion_compra?: string | null; instructions?: string | null;
  created_at: string; authorized_at?: string | null; responsable_autorizo_at?: string | null; fecha_entrega?: string | null;
  seg_preguntado_at?: string | null; seg_preguntas?: number | null; seg_respuesta?: string | null; seg_respuesta_at?: string | null;
};
export const COLS_SEG = "id, folio, status, tipo_solicitud, purchase_status, forma_pago, user_email, cost_center_name, descripcion_corta, descripcion_compra, instructions, created_at, authorized_at, responsable_autorizo_at, fecha_entrega, seg_preguntado_at, seg_preguntas, seg_respuesta, seg_respuesta_at";

const DIA = 864e5;
const ms = (s?: string | null) => (s ? new Date(s).getTime() : 0);

/** Último momento en que la solicitud se movió (creada, autorizada, o alguien contestó que sigue pendiente) */
export function ultimoMovimiento(r: RequiSeg): number {
  return Math.max(ms(r.created_at), ms(r.authorized_at), ms(r.responsable_autorizo_at), ms(r.seg_respuesta_at));
}
export function diasSinMover(r: RequiSeg, hoy = new Date()): number {
  return Math.max(0, Math.floor((hoy.getTime() - ultimoMovimiento(r)) / DIA));
}
const esQA = (r: RequiSeg) => /\bqa\b[\s\S]*no procesar/i.test(`${r.descripcion_corta || ""} ${r.descripcion_compra || ""} ${r.instructions || ""}`);

/** ¿Hay que preguntar "¿ya llegó?" por esta solicitud? (aparece en la app) */
export function esViejaSinCerrar(r: RequiSeg, hoy = new Date()): boolean {
  if (!ABIERTAS.includes(String(r.status || ""))) return false;
  if (String(r.tipo_solicitud || "MATERIALES").toUpperCase() === "DESTAJO") return false;
  if (esQA(r)) return false;
  return diasSinMover(r, hoy) >= DIAS_SIN_MOVER;
}
/** ¿Toca mandarle WhatsApp hoy por esta solicitud? (no más de 3 veces, una cada 7 días) */
export function tocaPreguntarHoy(r: RequiSeg, hoy = new Date()): boolean {
  if (!esViejaSinCerrar(r, hoy)) return false;
  if ((Number(r.seg_preguntas) || 0) >= MAX_PREGUNTAS) return false;
  return !r.seg_preguntado_at || hoy.getTime() - ms(r.seg_preguntado_at) >= DIAS_ENTRE_PREGUNTAS * DIA - 3_600_000;
}
export const numeroFolio = (folio?: string | null) => { const m = String(folio || "").match(/(\d+)\s*$/); return m ? Number(m[1]) : null; };
export const esEfectivo = (r: Pick<RequiSeg, "purchase_status" | "forma_pago">) => r.purchase_status === "GASTO_EFECTIVO_PENDIENTE" || /EFECTIVO|CAJA/i.test(String(r.forma_pago || ""));
export const queEs = (r: RequiSeg) => String(r.descripcion_corta || r.descripcion_compra || "material").replace(/\s+/g, " ").trim().slice(0, 40);

/** Respuesta por WhatsApp: "SI 757", "sí, llegó la 757", "NO 757", "SI TODAS". null si no es una respuesta de este seguimiento. */
export function leerRespuestaSeguimiento(texto: string): { accion: "si" | "no"; num: number | "todas" } | null {
  const t = String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[.,;:!¡¿?]/g, " ").replace(/\s+/g, " ").trim();
  const m = t.match(/^(.*?)\s*(?:\b(?:la|el|las|los)\s+)?(?:req(?:uisicion)?|solicitud|folio)?[\s#-]*(?:20\d\d[\s-]+)?0*(\d{1,5}|todas|todos|todo)$/);
  if (!m) return null;
  const cabeza = m[1].replace(/\b(la|el|las|los|ya)\s*$/, "").trim();
  const num: number | "todas" = /^tod/.test(m[2]) ? "todas" : Number(m[2]);
  if (num !== "todas" && !(num > 0)) return null;
  if (/^(si|ya|si ya|si si|llego|llegaron|ya llego|ya llegaron|si llego|si llegaron|si ya llego|si ya llegaron|recibida|recibido|recibidas|ya se recibio|ya la recibi|ya las recibi|ok si)$/.test(cabeza)) return { accion: "si", num };
  if (/^(no|aun no|todavia no|no ha llegado|no han llegado|no llego|no llegaron|falta|faltan|sigue pendiente|siguen pendientes|no todavia|no aun)$/.test(cabeza)) return { accion: "no", num };
  return null;
}

/** Correos de la persona que escribe desde ese teléfono (empleado y usuario) */
export async function correosDeTelefono(db: SupabaseClient, phone10: string): Promise<string[]> {
  const correos = new Set<string>();
  const { data: emps } = await db.from("employees").select("usuario_email, email, whatsapp, status").ilike("whatsapp", `%${phone10}%`);
  for (const e of (emps || []) as { usuario_email?: string | null; email?: string | null; whatsapp?: string | null; status?: string | null }[]) {
    if ((e.whatsapp || "").replace(/\D/g, "").slice(-10) !== phone10 || e.status === "BAJA") continue;
    if (e.usuario_email) correos.add(e.usuario_email.toLowerCase()); if (e.email) correos.add(e.email.toLowerCase());
  }
  const { data: us } = await db.from("users").select("email, phone");
  for (const u of (us || []) as { email: string; phone?: string | null }[]) if ((u.phone || "").replace(/\D/g, "").slice(-10) === phone10) correos.add(u.email.toLowerCase());
  return [...correos];
}

/** Aplica la respuesta a una solicitud. via: "app" | "whatsapp" */
export async function responderSeguimiento(db: SupabaseClient, r: RequiSeg, accion: "si" | "no" | "cancelar", porEmail: string, via: "app" | "whatsapp"):
  Promise<{ ok: boolean; error?: string }> {
  if (!ABIERTAS.includes(String(r.status || ""))) return { ok: false, error: `${r.folio} ya está cerrada` };
  const ahora = new Date(); const por = porEmail.toLowerCase();
  const donde = via === "whatsapp" ? "por WhatsApp" : "en Doménica";
  if (accion === "si") {
    const { count } = await db.from("entregas").select("*", { count: "exact", head: true });
    const folioEnt = `ENT-${String((count || 0) + 1).padStart(5, "0")}`;
    const nota = `Confirmado ${donde} por ${por}: ya llegó (pregunta automática por llevar ${diasSinMover(r, ahora)} días sin moverse)${esEfectivo(r) ? ". Gasto en efectivo: falta subir el comprobante de pago" : ""}.`;
    const { error } = await db.from("entregas").insert({
      folio: folioEnt, requisicion_id: r.id, fecha_entrega: ahora.toISOString().slice(0, 10), hora_entrega: ahora.toTimeString().slice(0, 5),
      obra_nombre: r.cost_center_name || null, recibido_por_nombre: por, registrado_por: por, status: "COMPLETA", materiales_recibidos: [],
      notas: nota, solicitante_email: r.user_email || null,
    });
    if (error) return { ok: false, error: error.message };
    await db.from("requisitions").update({ status: "ENTREGADA", fecha_entrega: ahora.toISOString().slice(0, 10), recibio: por, seg_respuesta: "SI", seg_respuesta_at: ahora.toISOString() }).eq("id", r.id);
    await db.from("event_log").insert({ tipo: "ENTREGA_CONFIRMADA", resumen: `${r.folio} ${r.cost_center_name || ""} confirmada como entregada ${donde}`, detalle: nota, actor: por, metadata: { folio: r.folio, via, seguimiento: true } }).then(() => {}, () => {});
    return { ok: true };
  }
  if (accion === "no") {
    await db.from("requisitions").update({ seg_respuesta: "NO", seg_respuesta_at: ahora.toISOString() }).eq("id", r.id);
    await db.from("event_log").insert({ tipo: "SEGUIMIENTO_NO_HA_LLEGADO", resumen: `${r.folio} ${r.cost_center_name || ""}: aún no llega (dicho ${donde})`, actor: por, metadata: { folio: r.folio, via } }).then(() => {}, () => {});
    return { ok: true };
  }
  await db.from("requisitions").update({ status: "CANCELADA", seg_respuesta: "CANCELADA", seg_respuesta_at: ahora.toISOString() }).eq("id", r.id);
  await db.from("event_log").insert({ tipo: "REQUISICION_CANCELADA", resumen: `${r.folio} ${r.cost_center_name || ""} cancelada: ya no se ocupa (dicho ${donde})`, actor: por, metadata: { folio: r.folio, via, seguimiento: true } }).then(() => {}, () => {});
  return { ok: true };
}

/** ¿Puede esta persona contestar por esta solicitud? Quien la pidió, o Compras / Administración / Superintendencia / admin */
export function puedeContestar(r: Pick<RequiSeg, "user_email">, email: string, role: string): boolean {
  return (r.user_email || "").toLowerCase() === email.toLowerCase() || ["admin", "administrador", "compras", "validador"].includes((role || "").toLowerCase());
}

/** WhatsApp → "SI 757" / "NO 757" / "SI TODAS". Si el texto no es de este seguimiento, { manejado: false } y el bot sigue normal. */
export async function mensajeDeSeguimiento(db: SupabaseClient, texto: string, phone10: string): Promise<{ manejado: boolean; respuesta?: string }> {
  const lr = leerRespuestaSeguimiento(texto);
  if (!lr) return { manejado: false };
  const correos = await correosDeTelefono(db, phone10);
  if (!correos.length) return { manejado: false };
  const { data: us } = await db.from("users").select("email, role").in("email", correos);
  const roles = ((us || []) as { email: string; role: string }[]);
  const quien = roles[0]?.email || correos[0]; const role = roles.find(u => ["admin", "compras", "validador"].includes(String(u.role).toLowerCase()))?.role || roles[0]?.role || "";
  const { data } = await db.from("requisitions").select(COLS_SEG).in("status", ABIERTAS).order("created_at", { ascending: false }).limit(3000);
  const abiertas = ((data || []) as RequiSeg[]).filter(r => correos.includes(String(r.user_email || "").toLowerCase()) || ["admin", "administrador", "compras", "validador"].includes(String(role).toLowerCase()));
  let objetivo: RequiSeg[];
  if (lr.num === "todas") {
    const hace8 = Date.now() - 8 * DIA; // las que venían en los mensajes de la última semana, y que pidió esta persona
    objetivo = abiertas.filter(r => correos.includes(String(r.user_email || "").toLowerCase()) && ms(r.seg_preguntado_at) >= hace8);
    if (!objetivo.length) return { manejado: true, respuesta: "No tengo solicitudes pendientes de confirmar a tu nombre. Si es otra, contesta con el número, por ejemplo: SI 757." };
  } else {
    const r = abiertas.find(x => numeroFolio(x.folio) === lr.num);
    if (!r) {
      // Si a esta persona no le hemos preguntado nada, el mensaje no era para esto: que lo atienda el resto del bot
      const lePreguntamos = abiertas.some(x => correos.includes(String(x.user_email || "").toLowerCase()) && ms(x.seg_preguntado_at) >= Date.now() - 22 * DIA);
      if (!lePreguntamos) return { manejado: false };
      return { manejado: true, respuesta: `No encontré la solicitud ${lr.num} abierta a tu nombre. Revisa el número en Doménica › Solicitudes.` };
    }
    objetivo = [r];
  }
  const ok: string[] = [];
  for (const r of objetivo) { const x = await responderSeguimiento(db, r, lr.accion, quien, "whatsapp"); if (x.ok) ok.push(`#${numeroFolio(r.folio)}`); }
  if (!ok.length) return { manejado: true, respuesta: "No pude actualizarla; ábrela en Doménica › Solicitudes." };
  return { manejado: true, respuesta: lr.accion === "si"
    ? `Listo, quedó${ok.length === 1 ? "" : "ron"} como entregada${ok.length === 1 ? "" : "s"}: ${ok.join(", ")}. Gracias.`
    : `Anotado: ${ok.join(", ")} sigue${ok.length === 1 ? "" : "n"} pendiente${ok.length === 1 ? "" : "s"}. Compras lo ve en Doménica.` };
}
