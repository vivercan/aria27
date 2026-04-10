import { cookies } from "next/headers";

const COOKIE_NAME = "zoho_creds";

/**
 * Lee credenciales Zoho de la cookie httpOnly.
 * Retorna { email, password } o null si no hay sesión.
 */
export async function getZohoCreds(): Promise<{ email: string; password: string } | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(COOKIE_NAME)?.value;
    if (!raw) return null;
    const decoded = Buffer.from(raw, "base64").toString("utf-8");
    const { email, password } = JSON.parse(decoded);
    if (!email || !password) return null;
    return { email, password };
  } catch {
    return null;
  }
}
