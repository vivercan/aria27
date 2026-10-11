/**
 * Entrar con huella o rostro (WebAuthn / passkeys) · 11-Oct-2026
 * - Registrar: solo con sesión ya abierta (después de entrar con contraseña).
 * - Entrar: sin contraseña; el teléfono valida huella/rostro y firma el reto.
 * - Retos de un solo uso, vencen en 5 min. Llaves revocables. Usuario dado de baja no entra.
 */
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import { isoBase64URL, isoUint8Array } from "@simplewebauthn/server/helpers";
import type { RegistrationResponseJSON, AuthenticationResponseJSON, AuthenticatorTransport } from "@simplewebauthn/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const RP_NAME = "Doménica 27 · ARIA27";
export function rp(req: Request): { id: string; origin: string } {
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "aria.jjcrm27.com").split(",")[0].trim().split(":")[0];
  const id = process.env.WEBAUTHN_RP_ID || (host === "localhost" ? "localhost" : host);
  const origin = process.env.WEBAUTHN_ORIGIN || (id === "localhost" ? "http://localhost:3000" : `https://${id}`);
  return { id, origin };
}

async function guardarReto(challenge: string, tipo: "registro" | "entrar", email: string | null): Promise<string> {
  const db = getSupabaseAdmin();
  await db.from("auth_challenges").delete().lt("expires_at", new Date(Date.now() - 3600_000).toISOString());
  const { data, error } = await db.from("auth_challenges").insert({ challenge, tipo, user_email: email, expires_at: new Date(Date.now() + 5 * 60_000).toISOString() }).select("id").single();
  if (error || !data) throw new Error("No se pudo preparar el reto");
  return (data as { id: string }).id;
}
async function usarReto(id: string, tipo: "registro" | "entrar"): Promise<{ challenge: string; email: string | null } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id || "")) return null;
  const db = getSupabaseAdmin();
  const { data } = await db.from("auth_challenges").update({ used_at: new Date().toISOString() }).eq("id", id).eq("tipo", tipo).is("used_at", null).gt("expires_at", new Date().toISOString()).select("challenge, user_email").maybeSingle();
  const r = data as { challenge: string; user_email: string | null } | null;
  return r ? { challenge: r.challenge, email: r.user_email } : null;
}

export async function opcionesRegistro(req: Request, email: string, nombre: string) {
  const db = getSupabaseAdmin(); const { id: rpID } = rp(req);
  const { data: llaves } = await db.from("auth_passkeys").select("credential_id, transports").eq("user_email", email.toLowerCase()).is("revoked_at", null);
  const opts = await generateRegistrationOptions({
    rpName: RP_NAME, rpID, userName: email, userDisplayName: nombre || email,
    userID: isoUint8Array.fromUTF8String(email.toLowerCase()), attestationType: "none",
    excludeCredentials: ((llaves || []) as { credential_id: string; transports: string[] | null }[]).map(l => ({ id: l.credential_id, transports: (l.transports || undefined) as AuthenticatorTransport[] | undefined })),
    authenticatorSelection: { residentKey: "required", userVerification: "required", authenticatorAttachment: "platform" },
  });
  const retoId = await guardarReto(opts.challenge, "registro", email.toLowerCase());
  return { opciones: opts, retoId };
}

export async function verificarRegistro(req: Request, email: string, retoId: string, respuesta: RegistrationResponseJSON, dispositivo: string) {
  const reto = await usarReto(retoId, "registro");
  if (!reto || reto.email !== email.toLowerCase()) return { ok: false as const, error: "El reto venció. Inténtalo otra vez." };
  const { id: rpID, origin } = rp(req);
  const v = await verifyRegistrationResponse({ response: respuesta, expectedChallenge: reto.challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true });
  if (!v.verified || !v.registrationInfo) return { ok: false as const, error: "No se pudo verificar" };
  const c = v.registrationInfo.credential;
  const { error } = await getSupabaseAdmin().from("auth_passkeys").insert({
    user_email: email.toLowerCase(), credential_id: c.id, public_key: isoBase64URL.fromBuffer(c.publicKey), counter: c.counter,
    transports: c.transports || null, device_name: dispositivo.slice(0, 80) || null,
  });
  if (error) return { ok: false as const, error: "Este teléfono ya estaba registrado" };
  return { ok: true as const };
}

export async function opcionesEntrar(req: Request) {
  const { id: rpID } = rp(req);
  const opts = await generateAuthenticationOptions({ rpID, userVerification: "required", allowCredentials: [] });
  const retoId = await guardarReto(opts.challenge, "entrar", null);
  return { opciones: opts, retoId };
}

export async function verificarEntrar(req: Request, retoId: string, respuesta: AuthenticationResponseJSON): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const reto = await usarReto(retoId, "entrar");
  if (!reto) return { ok: false, error: "El reto venció. Inténtalo otra vez." };
  const db = getSupabaseAdmin();
  const { data: llave } = await db.from("auth_passkeys").select("id, user_email, public_key, counter, transports, revoked_at").eq("credential_id", respuesta.id).maybeSingle();
  const l = llave as { id: string; user_email: string; public_key: string; counter: number; transports: string[] | null; revoked_at: string | null } | null;
  if (!l || l.revoked_at) return { ok: false, error: "Este teléfono no está registrado. Entra con tu contraseña y vuelve a activarlo." };
  const { id: rpID, origin } = rp(req);
  const v = await verifyAuthenticationResponse({
    response: respuesta, expectedChallenge: reto.challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true,
    credential: { id: respuesta.id, publicKey: isoBase64URL.toBuffer(l.public_key), counter: Number(l.counter) || 0, transports: (l.transports || undefined) as AuthenticatorTransport[] | undefined },
  });
  if (!v.verified) return { ok: false, error: "No se pudo verificar" };
  // Usuario debe existir y estar activo
  const { data: u } = await db.from("users").select("active").eq("email", l.user_email.toLowerCase()).maybeSingle();
  if (!u || (u as { active?: boolean | null }).active === false) return { ok: false, error: "Tu usuario no está activo en ARIA27. Contacta a Recursos Humanos." };
  await db.from("auth_passkeys").update({ counter: v.authenticationInfo.newCounter, last_used_at: new Date().toISOString() }).eq("id", l.id);
  return { ok: true, email: l.user_email.toLowerCase() };
}
