/**
 * Versión nueva publicada → el teléfono se pone al día solo, sin sacar a nadie de lo que está haciendo.
 * 11-Oct-2026 · JJ vio la ficha de una solicitud con la versión vieja (no salían las entregas) y luego
 * la pantalla "se salió y volvió a entrar" sin aviso. Ahora:
 *  - Se revisa al cambiar de pantalla, al volver a la app (desde WhatsApp, etc.) y cada minuto.
 *  - Solo se actualiza en un momento seguro: sin ventana/ficha abierta y sin estar escribiendo.
 *  - Mientras se actualiza se ve "Actualizando Doménica…" y al terminar "Listo, Doménica está al día".
 */
const MIA = process.env.NEXT_PUBLIC_BUILD || "dev";
let nueva: string | null = null;
let ultima = 0;

/** ¿Se puede recargar sin perder nada? (exportada para pruebas) */
export function momentoSeguro(doc: Document = document): boolean {
  if (doc.querySelector('.aria-sheet, [role="dialog"], [aria-modal="true"], [data-no-actualizar], [class*="fixed"][class*="inset-0"][class*="bg-black"]')) return false;
  const a = doc.activeElement as HTMLElement | null;
  if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT" || a.isContentEditable)) return false;
  return true;
}

function avisar(texto: string, ms: number) {
  try {
    const d = document.createElement("div");
    d.setAttribute("role", "status");
    d.textContent = texto;
    d.style.cssText = "position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:99999;background:#0f172a;color:#fff;padding:12px 18px;border-radius:14px;font:600 15px system-ui;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:88vw;text-align:center";
    document.body.appendChild(d);
    if (ms > 0) setTimeout(() => d.remove(), ms);
  } catch { /* nada */ }
}

async function hayNueva(): Promise<string | null> {
  if (MIA === "dev" || typeof window === "undefined" || !navigator.onLine) return null;
  if (Date.now() - ultima < 5000) return null; // no preguntar más de 1 vez cada 5 s
  ultima = Date.now();
  try {
    const r = await fetch("/api/version", { cache: "no-store", credentials: "omit" });
    if (!r.ok) return null;
    const { v } = await r.json() as { v?: string };
    return v && v !== "dev" && v !== MIA ? v : null;
  } catch { return null; }
}

function recargar(v: string): boolean {
  if (sessionStorage.getItem("aria:recargado") === v) return false; // ya lo intentamos: no ciclar
  if (!momentoSeguro()) return false;
  sessionStorage.setItem("aria:recargado", v);
  sessionStorage.setItem("aria:actualizada", "1");
  avisar("Actualizando Doménica…", 0);
  setTimeout(() => window.location.reload(), 250);
  return true;
}

/** Revisa si hay versión nueva y, si es momento seguro, actualiza. */
export async function revisarVersion(): Promise<boolean> {
  const v = nueva || await hayNueva();
  if (!v) return false;
  nueva = v;
  return recargar(v);
}

/** Se llama una vez desde el layout: avisa tras actualizar y vigila mientras la app está abierta. */
export function vigilarVersion(): () => void {
  try { if (sessionStorage.getItem("aria:actualizada")) { sessionStorage.removeItem("aria:actualizada"); setTimeout(() => avisar("Listo, Doménica está al día", 2500), 600); } } catch { /* nada */ }
  const alVolver = () => { if (document.visibilityState === "visible") revisarVersion(); };
  document.addEventListener("visibilitychange", alVolver);
  window.addEventListener("focus", alVolver);
  // cada minuto pregunta; si ya sabe que hay nueva, cada 20 s espera el momento seguro (p. ej. al cerrar la ficha)
  let n = 0;
  const t = setInterval(() => { n++; if (nueva) { recargar(nueva); } else if (n % 3 === 0 && document.visibilityState === "visible") { revisarVersion(); } }, 20000);
  return () => { document.removeEventListener("visibilitychange", alVolver); window.removeEventListener("focus", alVolver); clearInterval(t); };
}
