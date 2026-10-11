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
    if (coarse && (navigator.maxTouchPoints || 0) > 0 && window.innerWidth < 900) return true;
    // 11-Oct-2026: ventana del tamaño de un teléfono (aunque el navegador diga "computadora") = modo teléfono.
    // Evita la mezcla de menú web + barra de Doménica que vio JJ en el teléfono virtual.
    return window.innerWidth < 600;
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

/** 10-Oct-2026: menus/hubs de la web. En celular nunca se muestran (regresar o un link viejo te llevaria al menu web); se manda a Inicio. */
export const HUBS_WEB = new Set([
  "/dashboard", "/dashboard/requisiciones", "/dashboard/obras", "/dashboard/talento", "/dashboard/finanzas",
  "/dashboard/activos", "/dashboard/administracion", "/dashboard/configuracion", "/dashboard/comunicacion",
  "/dashboard/reportes", "/dashboard/clientes", "/dashboard/admin", "/dashboard/plantillas",
]);

/** Regresar en celular: historial si hay, si no Inicio. Nunca a un menu web. */
export function rutaRegresoMovil(href?: string): string | null {
  if (!href) return null;
  const limpio = href.split("?")[0].replace(/\/$/, "");
  return HUBS_WEB.has(limpio) ? "/dashboard/campo" : href;
}
