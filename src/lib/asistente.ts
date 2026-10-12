/**
 * Pregúntale a Doménica · lógica pura (tests/asistente.test.ts) · 11-Oct-2026
 * - pareceRegunta: decide si lo dicho es una PREGUNTA (se contesta) o una ORDEN (se arma actividad/pedido).
 * - accionesSeguras: solo deja pasar botones hacia pantallas conocidas y ids que existen en los datos que se mandaron.
 */
const n = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function pareceRegunta(texto: string): boolean {
  const t = n(texto);
  if (!t) return false;
  if (texto.trim().startsWith("¿") || /\?\s*$/.test(texto.trim())) return true;
  // "Qué ..." con acento siempre es pregunta; "que ..." sin acento solo si sigue algo de pregunta
  // ("que me toca", "que hay", "que falta"), porque "Que Miguel revise…" es una ORDEN.
  if (/^\s*¿?\s*qu[eé]/i.test(texto) && /^\s*¿?\s*qué/i.test(texto)) return true;
  if (/^que (me|nos|le|hay|esta|estan|falta|faltan|tengo|tenemos|paso|pasa|sigue|llevo|llevamos|tal|onda|obras?|actividades|solicitudes|pendientes)\b/.test(t)) return true;
  if (/^hay que\b/.test(t)) return false; // "hay que comprar…" es orden, no pregunta
  if (/^(cuanto|cuantos|cuantas|cuando|como|quien|quienes|donde|cual|cuales|hay|tengo|tenemos|me toca|dime|ensename|muestrame|resumen|resume|en que)\b/.test(t)) return true;
  return false;
}

export type Accion = { label: string; tipo: "actividad" | "solicitud" | "obra" | "autorizar" | "pantalla"; id?: string; ruta?: string };
const PANTALLAS: Record<string, string> = {
  actividades: "/dashboard/actividades?vista=mi", solicitudes: "/dashboard/requisiciones/requisiciones/estatus", autorizar: "/dashboard/campo/autorizar",
  obras: "/dashboard/domenica/obras", calendario: "/dashboard/campo/calendario", entregas: "/dashboard/campo/evidencia", pedir: "/dashboard/requisiciones/requisiciones/nuevo",
};

export function accionesSeguras(raw: unknown, ids: { actividades: Set<string>; solicitudes: Set<string>; obras: Set<string> }): { label: string; href: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { label: string; href: string }[] = [];
  for (const x of raw.slice(0, 6)) {
    if (!x || typeof x !== "object") continue;
    const a = x as Partial<Accion>; const label = String(a.label || "").trim().slice(0, 40); if (!label) continue;
    let href = "";
    if (a.tipo === "actividad" && a.id && ids.actividades.has(a.id)) href = `/dashboard/actividades?abrir=${a.id}`;
    else if (a.tipo === "solicitud" && a.id && ids.solicitudes.has(a.id)) href = `/dashboard/requisiciones/requisiciones/estatus?open=${a.id}`;
    else if (a.tipo === "obra" && a.id && ids.obras.has(a.id)) href = `/dashboard/domenica/obras/${a.id}`;
    else if (a.tipo === "autorizar") href = PANTALLAS.autorizar;
    else if (a.tipo === "pantalla" && a.ruta && PANTALLAS[a.ruta]) href = PANTALLAS[a.ruta];
    if (href && !out.some(o => o.href === href)) out.push({ label, href });
    if (out.length >= 3) break;
  }
  return out;
}

/** Quita markdown que la IA a veces pone (asteriscos, #, viñetas raras) */
export function limpiarRespuesta(s: string): string {
  return String(s || "").replace(/\*\*|__/g, "").replace(/^#+\s*/gm, "").replace(/^\s*[-*]\s+/gm, "• ").trim();
}
