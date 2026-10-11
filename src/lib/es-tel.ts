/**
 * ¿Se está viendo en teléfono? (Doménica 27 · 11-Oct-2026)
 * Lo decide el script de app/layout.tsx ANTES de pintar (html.es-tel), así no hay saltos.
 * "?web=1" fuerza la vista completa de computadora (por si algo solo existe ahí).
 */
import { useSyncExternalStore } from "react";
const nada = () => () => {};
const leer = () => { try { return document.documentElement.classList.contains("es-tel") && !/[?&]web=1\b/.test(window.location.search); } catch { return false; } };
export function useEsTel(): boolean { return useSyncExternalStore(nada, leer, () => false); }
