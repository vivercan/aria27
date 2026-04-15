import { cookies } from "next/headers";

const COOKIE_NAME = "zoho_creds";

/**
 * Lee credenciales Zoho.
 * Prioridad: 1) cookie httpOnly de sesión personal
 *            2) ZOHO_EMAIL + ZOHO_PASSWORD del sistema (env vars Vercel)
 * Retorna { email, password } o null si no hay credenciales.
 */
export async function getZohoCreds(): Promise<{ email: string; password: string } | null> {
  // 1. Cookie de sesión personal (usuario logueó manualmente)
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(COOKIE_NAME)?.value;
    if (raw) {
      const decoded = Buffer.from(raw, "base64").toString("utf-8");
      const { email, password } = JSON.parse(decoded);
      if (email && password) return { email, password };
    }
  } catch { /* continuar al fallback */ }

  // 2. Credenciales del sistema (env vars) — cuenta corporativa compartida
  const envEmail    = process.env.ZOHO_EMAIL;
  const envPassword = process.env.ZOHO_PASSWORD;
  if (envEmail && envPassword) {
    return { email: envEmail, password: envPassword };
  }

  return null;
}
