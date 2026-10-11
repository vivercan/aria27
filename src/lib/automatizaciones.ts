/**
 * ARIA Domingo · Automatizaciones "si pasa X, haz Y" (10-Oct-2026)
 * Reglas configurables sin programar. El cron las evalua cada 30 min (solo de 7:00 a 20:00 de Aguascalientes).
 * Anti-spam: un solo mensaje por persona por corrida (resumen), el mismo caso no se repite antes de N horas,
 * se ignoran casos mas viejos que "antiguedad maxima" y existe modo prueba (solo le llega a quien creo la regla).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type Disparador = "REQUI_ESTANCADA" | "REQUI_SIN_PRECIO" | "REQUI_MONTO_ALTO" | "ACTIVIDAD_VENCIDA" | "ACTIVIDAD_ATORADA" | "ACTIVIDAD_POR_VENCER";
export type Accion = "AVISAR" | "CREAR_ACTIVIDAD";

export type Regla = {
  id: string; nombre: string; descripcion?: string | null; activa: boolean; modo_prueba: boolean;
  disparador: Disparador; params: Record<string, unknown>;
  destinatarios: { roles?: string[]; personas?: string[]; involucrado?: boolean };
  accion: Accion; accion_params: { empleado_id?: string; titulo?: string };
  mensaje?: string | null; repetir_cada_horas: number; creada_por?: string | null;
  ultima_corrida?: string | null; ultimo_resultado?: string | null;
};

export type Caso = { tipo: "requi" | "actividad"; id: string; etiqueta: string; obra: string; dias: number; involucrado: string | null; url: string; extra?: string };

export const ESTADOS_REQUI: { id: string; label: string }[] = [
  { id: "EN_AUTORIZACION", label: "esperando autorización de Dirección" },
  { id: "PENDIENTE_RESPONSABLE", label: "esperando al responsable de obra" },
  { id: "PENDIENTE", label: "esperando a Compras" },
  { id: "APROBADA", label: "aprobada y sin entregar" },
];

export const DISPARADORES: Record<Disparador, { titulo: string; frase: string; params: { key: string; label: string; tipo: "dias" | "monto" | "estado"; def: number | string }[]; mensaje: string }> = {
  REQUI_ESTANCADA: { titulo: "Requisición detenida", frase: "Cuando una requisición lleve más de {dias} días {estado}", params: [{ key: "estado", label: "Detenida en", tipo: "estado", def: "EN_AUTORIZACION" }, { key: "dias", label: "Días", tipo: "dias", def: 2 }], mensaje: "{n} requisición(es) llevan más de {dias} días {estado}: {lista}. Revísalas en ARIA27." },
  REQUI_SIN_PRECIO: { titulo: "Requisición sin precio", frase: "Cuando una requisición lleve más de {dias} días sin precio", params: [{ key: "dias", label: "Días", tipo: "dias", def: 2 }], mensaje: "{n} requisición(es) siguen sin precio después de {dias} días: {lista}. Captura el precio en ARIA27." },
  REQUI_MONTO_ALTO: { titulo: "Requisición de monto alto", frase: "Cuando se cree una requisición de más de ${monto}", params: [{ key: "monto", label: "Monto mínimo", tipo: "monto", def: 50000 }], mensaje: "Nueva(s) requisición(es) arriba de ${monto}: {lista}." },
  ACTIVIDAD_VENCIDA: { titulo: "Actividad atrasada", frase: "Cuando una actividad lleve {dias} días o más de atraso", params: [{ key: "dias", label: "Días de atraso", tipo: "dias", def: 1 }], mensaje: "{n} actividad(es) con {dias}+ días de atraso: {lista}." },
  ACTIVIDAD_ATORADA: { titulo: "Actividad atorada", frase: "Cuando una actividad lleve más de {dias} días atorada", params: [{ key: "dias", label: "Días", tipo: "dias", def: 2 }], mensaje: "{n} actividad(es) atoradas hace más de {dias} días: {lista}. Ayuda a destrabarlas." },
  ACTIVIDAD_POR_VENCER: { titulo: "Actividad por vencer", frase: "Cuando a una actividad le falten {dias} días o menos para su entrega", params: [{ key: "dias", label: "Días antes", tipo: "dias", def: 1 }], mensaje: "{n} actividad(es) vencen pronto: {lista}." },
};

export const ROLES_DESTINO: { id: string; label: string }[] = [
  { id: "direccion", label: "Dirección" }, { id: "compras", label: "Compras" }, { id: "validador", label: "Superintendencia" },
  { id: "rh", label: "Recursos Humanos" }, { id: "admin", label: "Administrador" }, { id: "usuario", label: "Caja / pagos" },
];

/** Plantillas de un clic (lo que mas piden en constructora). */
export const PLANTILLAS: Omit<Regla, "id" | "activa" | "modo_prueba" | "creada_por">[] = [
  { nombre: "Requi 2 días sin autorizar → Dirección", disparador: "REQUI_ESTANCADA", params: { estado: "EN_AUTORIZACION", dias: 2, antiguedad_max: 30 }, destinatarios: { roles: ["direccion"] }, accion: "AVISAR", accion_params: {}, repetir_cada_horas: 24 },
  { nombre: "Requi 1 día esperando al residente → Superintendencia", disparador: "REQUI_ESTANCADA", params: { estado: "PENDIENTE_RESPONSABLE", dias: 1, antiguedad_max: 30 }, destinatarios: { roles: ["validador"], involucrado: true }, accion: "AVISAR", accion_params: {}, repetir_cada_horas: 24 },
  { nombre: "Requi 2 días sin cotizar → Compras", disparador: "REQUI_ESTANCADA", params: { estado: "PENDIENTE", dias: 2, antiguedad_max: 30 }, destinatarios: { roles: ["compras"] }, accion: "AVISAR", accion_params: {}, repetir_cada_horas: 24 },
  { nombre: "Requi mayor a $50,000 → Dirección", disparador: "REQUI_MONTO_ALTO", params: { monto: 50000 }, destinatarios: { roles: ["direccion"] }, accion: "AVISAR", accion_params: {}, repetir_cada_horas: 720 },
  { nombre: "Actividad atorada 2 días → quien la asignó y Superintendencia", disparador: "ACTIVIDAD_ATORADA", params: { dias: 2, antiguedad_max: 60 }, destinatarios: { roles: ["validador"], involucrado: true }, accion: "AVISAR", accion_params: {}, repetir_cada_horas: 24 },
  { nombre: "Actividad 3 días atrasada → Dirección", disparador: "ACTIVIDAD_VENCIDA", params: { dias: 3, antiguedad_max: 60 }, destinatarios: { roles: ["direccion"] }, accion: "AVISAR", accion_params: {}, repetir_cada_horas: 48 },
];

const DAY = 86400000;
const diasDesde = (iso: string | null | undefined, ahora: Date) => iso ? Math.floor((ahora.getTime() - new Date(iso.length <= 10 ? iso + "T12:00:00" : iso).getTime()) / DAY) : 0;
const n = (v: unknown, d: number) => { const x = Number(v); return isFinite(x) && x >= 0 ? x : d; };

export function estadoLabel(id: string): string { return ESTADOS_REQUI.find(e => e.id === id)?.label || id; }

/** Frase legible de la regla: "Cuando ... → avisar a ..." */
export function describir(r: Pick<Regla, "disparador" | "params" | "destinatarios" | "accion">): string {
  const d = DISPARADORES[r.disparador]; if (!d) return r.disparador;
  const p = r.params || {};
  let f = d.frase.replace("{dias}", String(n(p.dias, 0))).replace("{monto}", Number(n(p.monto, 0)).toLocaleString("es-MX")).replace("{estado}", estadoLabel(String(p.estado || "")));
  const quienes = [...(r.destinatarios.roles || []).map(x => ROLES_DESTINO.find(k => k.id === x)?.label || x), ...(r.destinatarios.involucrado ? ["el involucrado"] : []), ...(r.destinatarios.personas || [])];
  f += r.accion === "CREAR_ACTIVIDAD" ? " → crear una actividad" : ` → avisar a ${quienes.join(", ") || "nadie"}`;
  return f;
}

/** Busca los casos que cumplen la regla ahora mismo. */
export async function evaluar(db: SupabaseClient, r: Regla, ahora: Date = new Date()): Promise<Caso[]> {
  const p = r.params || {}; const maxAnt = n(p.antiguedad_max, 60);
  const desde = new Date(ahora.getTime() - maxAnt * DAY).toISOString();
  const obraFiltro = String(p.obra || "").trim();
  if (r.disparador.startsWith("REQUI_")) {
    let q = db.from("requisitions").select("id, folio, cost_center_name, status, created_at, total, user_email, responsable_email, created_by").gte("created_at", r.disparador === "REQUI_MONTO_ALTO" ? new Date(ahora.getTime() - 2 * DAY).toISOString() : desde).limit(500);
    if (obraFiltro) q = q.ilike("cost_center_name", obraFiltro);
    if (r.disparador === "REQUI_ESTANCADA") q = q.eq("status", String(p.estado || "EN_AUTORIZACION"));
    if (r.disparador === "REQUI_SIN_PRECIO") q = q.not("status", "in", "(CANCELADA,RECHAZADA_DIRECCION,RECHAZADA_RESPONSABLE,ENTREGADA)");
    if (r.disparador === "REQUI_MONTO_ALTO") q = q.gte("total", n(p.monto, 50000));
    const { data } = await q;
    const out: Caso[] = [];
    for (const x of (data || []) as { id: string; folio: string; cost_center_name: string | null; status: string; created_at: string; total: number | null; user_email: string | null; responsable_email: string | null }[]) {
      const dias = diasDesde(x.created_at, ahora);
      if (r.disparador === "REQUI_ESTANCADA" && dias < n(p.dias, 2)) continue;
      if (r.disparador === "REQUI_SIN_PRECIO" && (dias < n(p.dias, 2) || Number(x.total) > 0)) continue;
      if (r.disparador === "REQUI_ESTANCADA" && String(p.estado) === "APROBADA") { /* aprobada sin entrega: status APROBADA ya implica sin entrega */ }
      const involucrado = x.status === "PENDIENTE_RESPONSABLE" ? x.responsable_email : x.user_email;
      out.push({ tipo: "requi", id: x.id, etiqueta: x.folio, obra: x.cost_center_name || "", dias, involucrado: involucrado ? involucrado.toLowerCase() : null, url: `/dashboard/requisiciones/requisiciones/estatus?open=${x.id}`, extra: r.disparador === "REQUI_MONTO_ALTO" ? `$${Number(x.total || 0).toLocaleString("es-MX")}` : undefined });
    }
    return out;
  }
  // Actividades
  let q = db.from("tareas_asignadas").select("id, titulo, obra, estatus, motivo_bloqueo, fecha_compromiso, updated_at, created_at, asignado_email, asignado_por_email, asignado_por").not("estatus", "in", "(COMPLETADA,CANCELADA)").gte("created_at", desde).limit(500);
  if (obraFiltro) q = q.ilike("obra", obraFiltro);
  const { data } = await q;
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const out: Caso[] = [];
  for (const a of (data || []) as { id: string; titulo: string; obra: string | null; estatus: string; motivo_bloqueo: string | null; fecha_compromiso: string | null; updated_at: string | null; created_at: string; asignado_email: string | null; asignado_por_email: string | null; asignado_por: string | null }[]) {
    const fc = a.fecha_compromiso ? new Date(a.fecha_compromiso.slice(0, 10) + "T00:00:00") : null;
    const atraso = fc ? Math.round((hoy.getTime() - fc.getTime()) / DAY) : 0;
    let dias = 0; let ok = false;
    if (r.disparador === "ACTIVIDAD_VENCIDA") { dias = atraso; ok = !!fc && atraso >= Math.max(1, n(p.dias, 1)); }
    if (r.disparador === "ACTIVIDAD_ATORADA") { dias = diasDesde(a.updated_at || a.created_at, ahora); ok = !!(a.motivo_bloqueo && a.motivo_bloqueo.trim()) && dias >= n(p.dias, 2); }
    if (r.disparador === "ACTIVIDAD_POR_VENCER") { dias = -atraso; ok = !!fc && atraso <= 0 && -atraso <= n(p.dias, 1); }
    if (!ok) continue;
    const involucrado = r.disparador === "ACTIVIDAD_ATORADA" ? (a.asignado_por_email || a.asignado_por) : a.asignado_email;
    out.push({ tipo: "actividad", id: a.id, etiqueta: a.titulo.slice(0, 50), obra: a.obra || "Oficina", dias, involucrado: involucrado && involucrado.includes("@") ? involucrado.toLowerCase() : null, url: `/dashboard/actividades?abrir=${a.id}`, extra: a.motivo_bloqueo || undefined });
  }
  return out;
}

/** Arma el mensaje (una sola linea, Meta no acepta saltos en parametros). */
export function componerMensaje(r: Regla, casos: Caso[]): string {
  const d = DISPARADORES[r.disparador]; const p = r.params || {};
  const lista = casos.slice(0, 6).map((c, i) => `${i + 1}) ${c.etiqueta}${c.obra ? ` ${c.obra}` : ""}${c.extra && r.disparador === "REQUI_MONTO_ALTO" ? ` ${c.extra}` : ""}${c.tipo === "requi" || r.disparador !== "ACTIVIDAD_POR_VENCER" ? ` (${c.dias}d)` : ` (en ${c.dias}d)`}`).join(" | ") + (casos.length > 6 ? ` y ${casos.length - 6} más` : "");
  const base = (r.mensaje && r.mensaje.trim()) || d.mensaje;
  return base.replace("{n}", String(casos.length)).replace("{dias}", String(n(p.dias, 0))).replace("{monto}", Number(n(p.monto, 0)).toLocaleString("es-MX")).replace("{estado}", estadoLabel(String(p.estado || ""))).replace("{lista}", lista).replace(/[\r\n\t]+/g, " ");
}

/** Horario permitido para mandar avisos (7:00 a 20:00 en Aguascalientes). */
export function enHorario(ahora: Date = new Date()): boolean {
  const h = Number(new Date(ahora.toLocaleString("en-US", { timeZone: "America/Mexico_City" })).getHours());
  return h >= 7 && h < 20;
}
