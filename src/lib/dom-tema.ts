/** Tema de Doménica (claro por defecto, oscuro opcional) · 10-Oct-2026 */
import { useSyncExternalStore } from "react";
export type TemaDom = "claro" | "oscuro";
const KEY = "dom:tema";
export function leerTema(): TemaDom { try { return localStorage.getItem(KEY) === "oscuro" ? "oscuro" : "claro"; } catch { return "claro"; } }
export function aplicarTema(t: TemaDom) { if (typeof document === "undefined") return; document.body.classList.toggle("dom-oscuro", t === "oscuro"); }
export function guardarTema(t: TemaDom) { try { localStorage.setItem(KEY, t); } catch { /* sin storage */ } aplicarTema(t); try { window.dispatchEvent(new Event("dom:tema")); } catch { /* */ } }
/** Rutas que usan el diseño Doménica */
export function esRutaDomenica(path: string | null | undefined): boolean {
  const p = path || "";
  return p.startsWith("/dashboard/campo") || p.startsWith("/dashboard/actividades") || p.startsWith("/dashboard/domenica") || p.startsWith("/dashboard/domingo");
}
/** Hook: tema actual de Doménica (se actualiza al cambiarlo en cualquier lado) */
function suscribir(cb: () => void) { window.addEventListener("dom:tema", cb); window.addEventListener("storage", cb); return () => { window.removeEventListener("dom:tema", cb); window.removeEventListener("storage", cb); }; }
export function useTemaDom(): TemaDom { return useSyncExternalStore(suscribir, leerTema, () => "claro"); }
