/**
 * ARIA27 Actividades (tipo Monday) · 10-Oct-2026
 * Fuente unica: tareas_asignadas (la que ya usa el bot de WhatsApp: OK / AVANCE 50 / LISTO / BLOQUEADO).
 * Columnas del tablero derivadas de estatus + motivo_bloqueo, igual que el bot.
 */

export type Actividad = {
  id: string;
  folio?: string | null;
  titulo: string;
  descripcion?: string | null;
  asignado_id?: string | null;
  asignado_nombre?: string | null;
  asignado_email?: string | null;
  asignado_por?: string | null;
  asignado_por_email?: string | null;
  obra?: string | null;
  obra_id?: string | null;
  depende_de?: string | null;
  origen?: string | null;
  avance?: number | null;
  fecha_inicio?: string | null;
  fecha_compromiso?: string | null;
  hora_compromiso?: string | null;
  estatus: string;
  prioridad?: string | null;
  motivo_bloqueo?: string | null;
  respuesta_ultima?: string | null;
  respuesta_ultima_at?: string | null;
  completada_at?: string | null;
  foto_url?: string | null;
  por_aprobar?: boolean | null;
  aprobada_por?: string | null;
  aprobada_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  orden?: number | null;
};

export type ColumnaId = "POR_HACER" | "EN_PROCESO" | "BLOQUEADA" | "TERMINADA";

export const COLUMNAS: { id: ColumnaId; label: string; color: string; soft: string; text: string }[] = [
  { id: "POR_HACER", label: "Por hacer", color: "#0073ea", soft: "rgba(87,155,252,0.14)", text: "var(--d-link)" },
  { id: "EN_PROCESO", label: "En proceso", color: "#b85507", soft: "rgba(253,171,61,0.14)", text: "var(--d-warn)" },
  { id: "BLOQUEADA", label: "Atorada", color: "#d0304a", soft: "rgba(226,68,92,0.14)", text: "var(--d-danger)" },
  { id: "TERMINADA", label: "Terminada", color: "#3cde01", soft: "rgba(60,222,1,0.14)", text: "var(--d-ok)" },
];

export const PRIORIDADES: { id: string; label: string; color: string }[] = [
  // valores reales de la BD (check constraint tareas_asignadas_prioridad_check)
  { id: "URGENTE", label: "Urgente", color: "#d0304a" },
  { id: "ALTA", label: "Alta", color: "#b85507" },
  { id: "MEDIA", label: "Normal", color: "#0073ea" },
  { id: "BAJA", label: "Baja", color: "#64748b" },
];

/** Normaliza prioridad (acepta minusculas o "normal" heredados). */
export function prioridadDe(p?: string | null): string {
  const u = String(p || "").toUpperCase();
  return u === "NORMAL" || !u ? "MEDIA" : ["URGENTE", "ALTA", "MEDIA", "BAJA"].includes(u) ? u : "MEDIA";
}

export function columnaDe(a: Pick<Actividad, "estatus" | "motivo_bloqueo">): ColumnaId {
  const st = String(a.estatus || "").toUpperCase();
  if (st === "COMPLETADA") return "TERMINADA";
  if (st === "BLOQUEADA" || (a.motivo_bloqueo && a.motivo_bloqueo.trim())) return "BLOQUEADA";
  if (st === "EN_PROGRESO" || st === "EN_PROCESO") return "EN_PROCESO";
  return "POR_HACER";
}

/** Cambios a guardar cuando la tarjeta se mueve a otra columna. */
export function cambiosPorColumna(destino: ColumnaId, actual: Pick<Actividad, "avance">, motivo?: string): Record<string, unknown> {
  const av = Number(actual.avance) || 0;
  switch (destino) {
    case "POR_HACER": return { estatus: "PENDIENTE", motivo_bloqueo: null, completada_at: null };
    case "EN_PROCESO": return { estatus: "EN_PROGRESO", motivo_bloqueo: null, completada_at: null, avance: av >= 100 ? 75 : Math.max(av, 10) };
    case "BLOQUEADA": return { estatus: "EN_PROGRESO", motivo_bloqueo: (motivo || "").trim() || "Sin detalle" };
    case "TERMINADA": return { estatus: "COMPLETADA", motivo_bloqueo: null, avance: 100, completada_at: new Date().toISOString() };
  }
}

/** Estatus coherente al mover el avance con el slider. */
export function cambiosPorAvance(pct: number, actual: Pick<Actividad, "estatus" | "motivo_bloqueo">): Record<string, unknown> {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  if (p >= 100) return { avance: 100, estatus: "COMPLETADA", motivo_bloqueo: null, completada_at: new Date().toISOString() };
  const col = columnaDe(actual);
  if (p === 0 && col === "POR_HACER") return { avance: 0 };
  return { avance: p, estatus: "EN_PROGRESO", completada_at: null };
}

/** Dias de atraso respecto a la fecha compromiso (0 si a tiempo o terminada). */
export function diasAtraso(a: Pick<Actividad, "fecha_compromiso" | "estatus">, hoy: Date = new Date()): number {
  if (!a.fecha_compromiso || String(a.estatus).toUpperCase() === "COMPLETADA" || String(a.estatus).toUpperCase() === "CANCELADA") return 0;
  const f = new Date(a.fecha_compromiso.slice(0, 10) + "T00:00:00");
  const h = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const d = Math.round((h.getTime() - f.getTime()) / 86400000);
  return d > 0 ? d : 0;
}

export function venceHoy(a: Pick<Actividad, "fecha_compromiso" | "estatus">, hoy: Date = new Date()): boolean {
  if (!a.fecha_compromiso || String(a.estatus).toUpperCase() === "COMPLETADA") return false;
  const y = hoy.getFullYear(), m = String(hoy.getMonth() + 1).padStart(2, "0"), d = String(hoy.getDate()).padStart(2, "0");
  return a.fecha_compromiso.slice(0, 10) === `${y}-${m}-${d}`;
}

export function esMia(a: Pick<Actividad, "asignado_email" | "asignado_id">, email: string, miEmpleadoId?: string | null): boolean {
  const me = (email || "").toLowerCase();
  return (!!me && (a.asignado_email || "").toLowerCase() === me) || (!!miEmpleadoId && a.asignado_id === miEmpleadoId);
}

export function laAsigneYo(a: Pick<Actividad, "asignado_por" | "asignado_por_email">, email: string): boolean {
  const me = (email || "").toLowerCase();
  return !!me && ((a.asignado_por_email || "").toLowerCase() === me || (a.asignado_por || "").toLowerCase() === me);
}

export function iniciales(nombre?: string | null): string {
  const p = String(nombre || "").trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  return ((p[0][0] || "") + (p.length > 1 ? p[1][0] : "")).toUpperCase();
}

/** Color estable por persona para el avatar. */
export function colorPersona(nombre?: string | null): string {
  const pal = ["#0073ea", "#7e3bdd", "#007f48", "#c2461a", "#d0304a", "#0077ad", "#9d50dd", "#c2410c", "#037f4c", "#bb3354"]; // todos con contraste para texto blanco
  let h = 0; for (const c of String(nombre || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return pal[h % pal.length];
}

export function fechaCorta(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? iso + "T12:00:00" : iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export function haceCuanto(iso?: string | null, ahora: Date = new Date()): string {
  if (!iso) return "";
  const t = new Date(iso).getTime(); if (isNaN(t)) return "";
  const s = Math.max(0, Math.floor((ahora.getTime() - t) / 1000));
  if (s < 60) return "ahora";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400); return d === 1 ? "ayer" : `hace ${d} días`;
}

/** Resumen tipo "Mi trabajo" de Monday. */
export function resumen(list: Actividad[], hoy: Date = new Date()) {
  const abiertas = list.filter(a => columnaDe(a) !== "TERMINADA" && String(a.estatus).toUpperCase() !== "CANCELADA");
  return {
    abiertas: abiertas.length,
    porHacer: abiertas.filter(a => columnaDe(a) === "POR_HACER").length,
    enProceso: abiertas.filter(a => columnaDe(a) === "EN_PROCESO").length,
    atoradas: abiertas.filter(a => columnaDe(a) === "BLOQUEADA").length,
    atrasadas: abiertas.filter(a => diasAtraso(a, hoy) > 0).length,
    hoy: abiertas.filter(a => venceHoy(a, hoy)).length,
    terminadas: list.filter(a => columnaDe(a) === "TERMINADA").length,
  };
}

/** 11-Oct-2026 · Atraso en palabras de casa: "3 días tarde", "2 semanas tarde", "5 meses tarde" (antes "164d tarde") */
export function atrasoTexto(d: number): string {
  if (!d || d <= 0) return "";
  if (d === 1) return "1 día tarde";
  if (d < 14) return `${d} días tarde`;
  if (d < 60) return `${Math.round(d / 7)} semanas tarde`;
  const m = Math.round(d / 30); return m <= 1 ? "1 mes tarde" : `${m} meses tarde`;
}
