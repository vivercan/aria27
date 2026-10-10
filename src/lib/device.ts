/**
 * ARIA27 Campo · detección de celular (10-Oct-2026).
 * Regla de JJ: en iPhone/Android el sistema entra solo a Modo Campo; en la web no hay botón.
 * Solo se usa en cliente. iPadOS moderno se presenta como Macintosh, por eso se revisa maxTouchPoints.
 */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  if (nav.userAgentData?.mobile === true) return true;
  if (/Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua)) return true;
  const ipadOs = /Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1;
  if (ipadOs) return true;
  try {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    return coarse && (navigator.maxTouchPoints || 0) > 0 && window.innerWidth < 900;
  } catch { return false; }
}

/** Ruta de entrada después de login según dispositivo. */
export function landingPath(): string {
  if (isMobileDevice()) {
    try { localStorage.setItem("aria:modo", "campo"); } catch {}
    return "/dashboard/campo";
  }
  return "/dashboard/requisiciones";
}

/** Rutas "de escritorio" a las que un celular recién llegado se redirige a Campo (nunca deep links). */
export const DESKTOP_LANDINGS = new Set(["/dashboard", "/dashboard/requisiciones"]);
