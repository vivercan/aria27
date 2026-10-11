/** ARIA Doménica · Plantillas y recurrentes (lógica pura, probada en tests/plantillas.test.ts) · 11-Oct-2026 */
export type ItemPlantilla = { titulo: string; dia: number; duracion: number; prioridad: string; checklist: string[]; depende?: number | null };
export type Plantilla = { id: string; nombre: string; descripcion: string | null; items: ItemPlantilla[]; creada_por: string | null; activa: boolean; created_at?: string };
export type Frecuencia = "DIARIA" | "SEMANAL" | "MENSUAL";
export type Recurrente = { id: string; titulo: string; descripcion: string | null; asignado_id: string; obra_id: string | null; prioridad: string; frecuencia: Frecuencia; dia: number | null; dias_para_entregar: number; checklist: string[]; activa: boolean; creada_por: string | null; proxima: string; ultima_creada: string | null };

const PRIOS = ["URGENTE", "ALTA", "MEDIA", "BAJA"];
export const DIAS_SEMANA = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]; // 1..7 (ISO)

/** Limpia y valida los renglones de una plantilla. Devuelve error legible o los items limpios. */
export function limpiarItems(raw: unknown): { items?: ItemPlantilla[]; error?: string } {
  if (!Array.isArray(raw) || raw.length === 0) return { error: "Agrega al menos una actividad" };
  if (raw.length > 40) return { error: "Máximo 40 actividades por plantilla" };
  const items: ItemPlantilla[] = [];
  for (let i = 0; i < raw.length; i++) {
    const r = (raw[i] || {}) as Record<string, unknown>;
    const titulo = String(r.titulo || "").trim().slice(0, 200);
    if (!titulo) return { error: `La actividad ${i + 1} no tiene nombre` };
    const dia = Math.max(0, Math.min(365, Math.round(Number(r.dia) || 0)));
    const duracion = Math.max(1, Math.min(365, Math.round(Number(r.duracion) || 1)));
    const prioridad = PRIOS.includes(String(r.prioridad || "").toUpperCase()) ? String(r.prioridad).toUpperCase() : "MEDIA";
    const checklist = Array.isArray(r.checklist) ? (r.checklist as unknown[]).map(x => String(x || "").trim().slice(0, 200)).filter(Boolean).slice(0, 30) : [];
    let depende: number | null = null;
    if (r.depende !== undefined && r.depende !== null && r.depende !== "") {
      const d = Math.round(Number(r.depende));
      if (!Number.isInteger(d) || d < 0 || d >= i) return { error: `La actividad ${i + 1} solo puede esperar a una que esté antes en la lista` };
      depende = d;
    }
    items.push({ titulo, dia, duracion, prioridad, checklist, depende });
  }
  return { items };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
export function sumarDias(fecha: string, n: number): string { const d = new Date(fecha + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return iso(d); }

/** Fechas reales de cada renglón a partir del día de arranque. */
export function programar(items: ItemPlantilla[], inicio: string): { fecha_inicio: string; fecha_compromiso: string }[] {
  return items.map(it => { const fi = sumarDias(inicio, it.dia); return { fecha_inicio: fi, fecha_compromiso: sumarDias(fi, Math.max(1, it.duracion) - 1) }; });
}

/** Día ISO de la semana (1=lunes..7=domingo) de una fecha YYYY-MM-DD */
export function diaSemana(fecha: string): number { const g = new Date(fecha + "T12:00:00Z").getUTCDay(); return g === 0 ? 7 : g; }

/** Siguiente fecha (>= desde) en que toca crear la actividad recurrente. */
export function siguienteFecha(frecuencia: Frecuencia, dia: number | null, desde: string): string {
  if (frecuencia === "DIARIA") {
    let f = desde; for (let i = 0; i < 3 && diaSemana(f) === 7; i++) f = sumarDias(f, 1); // sin domingos
    return f;
  }
  if (frecuencia === "SEMANAL") {
    const objetivo = Math.max(1, Math.min(7, dia || 1));
    return sumarDias(desde, (objetivo - diaSemana(desde) + 7) % 7);
  }
  // MENSUAL: día 1..28 (o 31 = último día del mes)
  const d = Math.max(1, Math.min(31, dia || 1));
  const [y, m] = desde.split("-").map(Number);
  const enMes = (yy: number, mm: number) => { const ultimo = new Date(Date.UTC(yy, mm, 0)).getUTCDate(); return `${yy}-${String(mm).padStart(2, "0")}-${String(Math.min(d, ultimo)).padStart(2, "0")}`; };
  const este = enMes(y, m);
  if (este >= desde) return este;
  return m === 12 ? enMes(y + 1, 1) : enMes(y, m + 1);
}

export function describirRecurrencia(f: Frecuencia, dia: number | null): string {
  if (f === "DIARIA") return "Todos los días (lunes a sábado)";
  if (f === "SEMANAL") return `Cada ${DIAS_SEMANA[Math.max(1, Math.min(7, dia || 1))]}`;
  return (dia || 1) >= 31 ? "El último día de cada mes" : `El día ${dia || 1} de cada mes`;
}

/** Hoy en México (YYYY-MM-DD) */
export function hoyMX(now = new Date()): string { return new Date(now.getTime() - 6 * 3600 * 1000).toISOString().slice(0, 10); }

/** Menciones: ids de personas cuyo @Nombre sigue en el texto */
export function mencionesEnTexto(texto: string, candidatos: { id: string; nombre: string }[]): string[] {
  const t = (texto || "").toLowerCase();
  return candidatos.filter(c => c.nombre && t.includes("@" + c.nombre.toLowerCase())).map(c => c.id);
}

const FRECS: Frecuencia[] = ["DIARIA", "SEMANAL", "MENSUAL"];

export function limpiarRecurrente(b: Record<string, unknown>) {
  const titulo = String(b.titulo || "").trim().slice(0, 200);
  if (!titulo) return { error: "Escribe qué hay que hacer" };
  if (!b.asignado_id) return { error: "Elige quién la hace" };
  const frecuencia = String(b.frecuencia || "") as Frecuencia;
  if (!FRECS.includes(frecuencia)) return { error: "Elige cada cuánto" };
  const dia = frecuencia === "DIARIA" ? null : Math.max(1, Math.min(frecuencia === "SEMANAL" ? 7 : 31, Math.round(Number(b.dia) || 1)));
  return { row: {
    titulo, descripcion: b.descripcion ? String(b.descripcion).slice(0, 2000) : null, asignado_id: String(b.asignado_id), obra_id: b.obra_id ? String(b.obra_id) : null,
    prioridad: PRIOS.includes(String(b.prioridad || "").toUpperCase()) ? String(b.prioridad).toUpperCase() : "MEDIA", frecuencia, dia,
    dias_para_entregar: Math.max(0, Math.min(60, Math.round(Number(b.dias_para_entregar) || 0))),
    checklist: Array.isArray(b.checklist) ? (b.checklist as unknown[]).map(x => String(x || "").trim().slice(0, 200)).filter(Boolean).slice(0, 30) : [],
  } };
}

