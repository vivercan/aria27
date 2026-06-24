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
 *      por la cookie session opaca (cifrado con pgcrypto, descifrado por RPC). FIX 541.1.
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
  if (!req) return null;
  // FIX 541.1: cookie session opaca
  const { verifySession, getSessionTokenFromCookies } = await import("@/lib/session");
  const token = getSessionTokenFromCookies(req.headers.get("cookie"));
  const session = await verifySession(token);
  const userEmail = (session?.email || "").toLowerCase().trim();
  if (!userEmail) {
    log.warn("getZohoCreds: sin sesion valida — no se puede leer creds personales");
    return null;
  }

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
