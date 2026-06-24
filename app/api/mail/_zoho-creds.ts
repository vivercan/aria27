import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

const log = logger("ZOHO-CREDS");
const COOKIE_NAME = "zoho_creds";

/**
 * Lee credenciales Zoho del usuario que hace la peticion.
 * Prioridad:
 *   1. Cookie httpOnly de sesion personal (set por POST /api/mail/auth)
 *   2. Tabla public.users.zoho_password_encrypted del usuario identificado
 *      por el header `x-user-email` (cifrado con pgcrypto, descifrado por RPC).
 * Sin fallback a env vars compartidas (eliminado 27-Abr-2026 para evitar cruce de inboxes
 * entre administracion@ y recursos.humanos@).
 */
export async function getZohoCreds(req?: NextRequest): Promise<{ email: string; password: string } | null> {
  // 1. Cookie de sesion personal
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(COOKIE_NAME)?.value;
    if (raw) {
      const decoded = Buffer.from(raw, "base64").toString("utf-8");
      const { email, password } = JSON.parse(decoded);
      if (email && password) return { email, password };
    }
  } catch { /* continuar */ }

  // 2. Credenciales del usuario en BD (cifradas)
  //    HOTFIX2 24-Jun-2026 PM: la cookie session ES OBLIGATORIA.
  //    El header x-user-email NO autoriza por si solo. Solo puede usarse como dato auxiliar
  //    SI coincide exactamente con el email de la sesion validada.
  if (!req) return null;
  // a) Cookie session opaca (FIX 541.1) — OBLIGATORIA
  let sessionEmail = "";
  try {
    const { verifySession, getSessionTokenFromCookies } = await import("@/lib/session");
    const token = getSessionTokenFromCookies(req.headers.get("cookie"));
    const session = await verifySession(token);
    if (session?.email) sessionEmail = session.email.toLowerCase().trim();
  } catch { /* silencioso: si session.ts falla, NO autorizar */ }
  if (!sessionEmail) {
    log.warn("getZohoCreds: sin cookie session valida — no se puede leer creds personales");
    return null;
  }
  // b) Header x-user-email opcional, solo OK si coincide con la cookie session
  const hdrEmail = (req.headers.get("x-user-email") || "").toLowerCase().trim();
  if (hdrEmail && hdrEmail !== sessionEmail) {
    log.warn("getZohoCreds: x-user-email no coincide con cookie session — rechazado", { hdrEmail, sessionEmail });
    return null;
  }
  const userEmail = sessionEmail;

  const cryptoKey = process.env.PORTALES_CRYPTO_KEY;
  if (!cryptoKey) {
    log.error("getZohoCreds: PORTALES_CRYPTO_KEY env var ausente");
    return null;
  }

  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb.rpc("get_user_zoho_creds", { p_email: userEmail, p_key: cryptoKey });
    if (error) {
      log.error("RPC get_user_zoho_creds fallo", { err: error.message, user: userEmail });
      return null;
    }
    if (!data || (data as Array<unknown>).length === 0) {
      log.info("Usuario sin creds Zoho configuradas", { user: userEmail });
      return null;
    }
    const row = (data as Array<{ zoho_email: string; zoho_password: string }>)[0];
    if (!row.zoho_email || !row.zoho_password) return null;
    return { email: row.zoho_email, password: row.zoho_password };
  } catch (e) {
    log.error("getZohoCreds: excepcion", { err: (e as Error).message, user: userEmail });
    return null;
  }
}
