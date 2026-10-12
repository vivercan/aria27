/** ARIA Doménica · Espacio por obra: números de cada obra (11-Oct-2026). Lógica pura, probada en tests/obras-dom.test.ts */
import { columnaDe, diasAtraso, type Actividad } from "@/lib/actividades";

export type ObraDom = { id: string; nombre: string; cliente?: string | null; presupuesto?: number | null; presupuesto_contratado?: number | null; presupuesto_ampliaciones?: number | null; fecha_inicio?: string | null; fecha_fin?: string | null; responsable_email?: string | null; estado?: string | null };
export type RequiDom = { id: string; folio: string; cost_center_name: string | null; status: string | null; total: number | null; monto: number | null; proveedor?: string | null; created_at?: string | null };
export const ESTADOS_ABIERTOS = ["PENDIENTE_RESPONSABLE", "PENDIENTE", "EN_COTIZACION", "EN_AUTORIZACION"];
/** Detenida: sigue sin avanzar a autorizada después de 3 días */
/** Detenida = abierta, con más de 3 días y de los últimos 45 días (las más viejas son históricas que nunca se cerraron en el sistema, no "detenidas") */
export const estaDetenida = (r: RequiDom, ahora = Date.now()) => { if (!ESTADOS_ABIERTOS.includes(String(r.status || "")) || !r.created_at) return false; const e = ahora - Date.parse(r.created_at); return e > 3 * 864e5 && e < 45 * 864e5; };

export const normObra = (s?: string | null) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
const NO_CUENTA = ["CANCELADA", "RECHAZADA", "RECHAZADA_RESPONSABLE"];

export function presupuestoDe(o: ObraDom): number {
  const c = (Number(o.presupuesto_contratado) || 0) + (Number(o.presupuesto_ampliaciones) || 0);
  return c > 0 ? c : Number(o.presupuesto) || 0;
}

/** Junta actividades (por obra_id o por nombre) y solicitudes (por nombre de obra) de una obra */
export function numerosObra(o: ObraDom, acts: Actividad[], requis: RequiDom[]) {
  const n = normObra(o.nombre);
  const mias = acts.filter(a => a.obra_id === o.id || (!a.obra_id && normObra(a.obra) === n));
  const abiertas = mias.filter(a => columnaDe(a) !== "TERMINADA");
  const reqs = requis.filter(r => normObra(r.cost_center_name) === n && !NO_CUENTA.includes(String(r.status || "").toUpperCase()));
  const gastado = reqs.reduce((s, r) => s + (Number(r.monto) || Number(r.total) || 0), 0);
  const presupuesto = presupuestoDe(o);
  const avance = mias.length ? Math.round(mias.reduce((s, a) => s + (columnaDe(a) === "TERMINADA" ? 100 : Number(a.avance) || 0), 0) / mias.length) : 0;
  return {
    actividades: mias, abiertas, terminadas: mias.length - abiertas.length,
    atrasadas: abiertas.filter(a => diasAtraso(a) > 0).length, atoradas: abiertas.filter(a => columnaDe(a) === "BLOQUEADA").length,
    avance, requis: reqs, gastado, presupuesto, pctGasto: presupuesto > 0 ? Math.round((gastado / presupuesto) * 100) : null,
    detenidas: reqs.filter(r => estaDetenida(r)),
  };
}

/** Semáforo de la obra: rojo si hay atoradas o gasto > 100 %, ámbar si hay atrasadas o gasto > 85 %, verde si no */
export function semaforoObra(x: { atoradas: number; atrasadas: number; pctGasto: number | null; detenidas?: unknown[] }): { c: string; t: string } {
  if (x.atoradas > 0 || (x.pctGasto !== null && x.pctGasto > 100)) return { c: "#d0304a", t: "Atención" };
  if (x.atrasadas > 0 || (x.detenidas?.length || 0) > 0 || (x.pctGasto !== null && x.pctGasto > 85)) return { c: "#fdab3d", t: "Vigilar" };
  return { c: "#00873f", t: "En orden" };
}
