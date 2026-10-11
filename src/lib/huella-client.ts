"use client";
/** Huella / rostro en el navegador (WebAuthn) · 11-Oct-2026 */
import { startRegistration, startAuthentication, platformAuthenticatorIsAvailable, browserSupportsWebAuthn } from "@simplewebauthn/browser";

const FLAG = "dom:huella";
export async function huellaDisponible(): Promise<boolean> {
  try { return browserSupportsWebAuthn() && await platformAuthenticatorIsAvailable(); } catch { return false; }
}
export const huellaActivada = () => { try { return localStorage.getItem(FLAG) === "1"; } catch { return false; } };
const marcar = (v: boolean) => { try { if (v) localStorage.setItem(FLAG, "1"); else localStorage.removeItem(FLAG); } catch { /* */ } };
const post = async (url: string, body: unknown) => {
  const r = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "No se pudo"); return j;
};
const nombreDispositivo = () => { const u = navigator.userAgent; return /iPhone/.test(u) ? "iPhone" : /iPad/.test(u) ? "iPad" : /Android/.test(u) ? ((u.match(/Android[^;]*;\s*([^;)]+)/) || [])[1] || "Android").trim() : /Mac/.test(u) ? "Mac" : /Windows/.test(u) ? "Windows" : "Este equipo"; };

/** Registra este teléfono (requiere sesión abierta) */
export async function activarHuella(): Promise<void> {
  const { opciones, retoId } = await post("/api/auth/huella/registro", { paso: "opciones" });
  let respuesta;
  try { respuesta = await startRegistration({ optionsJSON: opciones }); }
  catch (e) { const n = (e as Error).name; if (n === "InvalidStateError") { marcar(true); return; } throw new Error(n === "NotAllowedError" ? "Se canceló" : "Tu teléfono no permitió registrar la huella o el rostro"); }
  await post("/api/auth/huella/registro", { paso: "verificar", retoId, respuesta, dispositivo: nombreDispositivo() });
  marcar(true);
}

/** Entra sin contraseña. Devuelve correo, rol y permisos. */
export async function entrarConHuella(): Promise<{ email: string; role: string; permissions: unknown }> {
  const { opciones, retoId } = await post("/api/auth/huella/entrar", { paso: "opciones" });
  let respuesta;
  try { respuesta = await startAuthentication({ optionsJSON: opciones }); }
  catch (e) { throw new Error((e as Error).name === "NotAllowedError" ? "Se canceló" : "No se pudo leer la huella o el rostro"); }
  try { return await post("/api/auth/huella/entrar", { paso: "verificar", retoId, respuesta }); }
  catch (e) { if (/no está registrado/.test((e as Error).message)) marcar(false); throw e; }
}
export const olvidarHuellaLocal = () => marcar(false);
