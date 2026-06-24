/**
 * ARIA27 · FIX 541.1 · 24-Jun-2026
 * Sesión opaca server-side. Token = CSPRNG 32 bytes hex. NO JWT.
 * BD guarda SHA-256(token). Cookie HttpOnly Secure SameSite=Strict.
 * Validación: hash el token entrante, busca en auth_sessions, verifica expires/revoked.
 */
import { randomBytes, createHash } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const SESSION_COOKIE_NAME = "__Host-aria_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 horas

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function hashHeader(header: string | null | undefined): string | null {
  if (!header) return null;
  return createHash("sha256").update(header).digest("hex");
}

/** Crea sesión nueva en BD y devuelve el token raw (para set-cookie). */
export async function createSession(opts: {
  userEmail: string;
  userAgent?: string | null;
  ip?: string | null;
}): Promise<{ token: string; expiresAt: Date } | null> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  const db = getSupabaseAdmin();
  const { error } = await db.from("auth_sessions").insert({
    token_hash: tokenHash,
    user_email: opts.userEmail.toLowerCase().trim(),
    expires_at: expiresAt.toISOString(),
    user_agent_hash: hashHeader(opts.userAgent || null),
    created_ip_hash: hashHeader(opts.ip || null),
  });
  if (error) return null;
  return { token, expiresAt };
}

/** Valida cookie. Devuelve user_email o null. NO confía en el token sin verificar BD. */
export async function verifySession(token: string | undefined | null): Promise<{
  email: string;
  sessionId: string;
} | null> {
  if (!token || token.length < 32) return null;
  const tokenHash = hashToken(token);
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("auth_sessions")
    .select("id, user_email, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error || !data) return null;
  if (data.revoked_at) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  // Update last_seen_at (fire-and-forget)
  void db.from("auth_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", data.id);
  return { email: (data.user_email as string).toLowerCase().trim(), sessionId: data.id as string };
}

/** Revoca una sesión específica por token. Para logout. */
export async function revokeSession(token: string | undefined | null, reason = "logout"): Promise<void> {
  if (!token) return;
  const tokenHash = hashToken(token);
  const db = getSupabaseAdmin();
  await db
    .from("auth_sessions")
    .update({ revoked_at: new Date().toISOString(), revocation_reason: reason })
    .eq("token_hash", tokenHash);
}

/** Revoca todas las sesiones activas de un usuario. Para password change o force logout. */
export async function revokeAllSessionsFor(userEmail: string, reason = "force_logout"): Promise<void> {
  const db = getSupabaseAdmin();
  await db
    .from("auth_sessions")
    .update({ revoked_at: new Date().toISOString(), revocation_reason: reason })
    .eq("user_email", userEmail.toLowerCase().trim())
    .is("revoked_at", null);
}

export function buildSessionCookieHeader(token: string): string {
  // __Host- prefix exige Path=/ + Secure + sin Domain
  return `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function buildClearCookieHeader(): string {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

/** Helper para extraer token de cookie en NextRequest. */
export function getSessionTokenFromCookies(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(/;\s*/);
  for (const p of parts) {
    const [k, v] = p.split("=");
    if (k === SESSION_COOKIE_NAME) return v ?? null;
  }
  return null;
}
