/** Notificaciones del telefono · cliente · 10-Oct-2026 */
export function pushSoportado(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}
export function esIos(): boolean { return typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent); }
export function esStandalone(): boolean {
  return typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
}
export async function registrarSW(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try { return await navigator.serviceWorker.register("/sw.js", { scope: "/" }); } catch { return null; }
}
function b64ToUint8(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
/** Estado: "activo" | "pendiente" (no ha decidido) | "bloqueado" | "no-soportado" | "instalar-primero" (iPhone sin instalar) */
export async function estadoPush(): Promise<string> {
  if (!pushSoportado()) return esIos() && !esStandalone() ? "instalar-primero" : "no-soportado";
  if (Notification.permission === "denied") return "bloqueado";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return sub && Notification.permission === "granted" ? "activo" : "pendiente";
}
export async function activarPush(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSoportado()) return { ok: false, error: esIos() ? "En iPhone primero agrega ARIA27 a tu pantalla de inicio y ábrela desde ahí." : "Este navegador no permite notificaciones." };
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return { ok: false, error: "Falta configurar las notificaciones en el servidor." };
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, error: "No diste permiso. Puedes activarlo en los ajustes del navegador." };
  const reg = (await navigator.serviceWorker.getRegistration("/")) || (await registrarSW());
  if (!reg) return { ok: false, error: "No se pudo preparar el teléfono." };
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(key) as unknown as BufferSource });
  const r = await fetch("/api/push/subscribe", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
  if (!r.ok) return { ok: false, error: "No se pudo guardar en el servidor." };
  await fetch("/api/push/test", { method: "POST", credentials: "include" }).catch(() => {});
  return { ok: true };
}
