/**
 * Modo prueba de JJ (11-Oct-2026): todo lo que JJ haga en el sistema genera sus avisos normalmente,
 * pero los WhatsApp, correos y notificaciones que iban a otras personas le llegan SOLO a él, marcados "PRUEBA".
 * Así valida todo sin molestar a nadie. Quién está en modo prueba: env MODO_PRUEBA_EMAILS (coma) o por defecto JJ.
 * El actor se toma de la sesión (cookie) de la petición en curso; crons y webhooks no tienen actor → no se tocan.
 */
import { getSupabaseAdmin } from "@/lib/supabase-server";

const ACTORES = (process.env.MODO_PRUEBA_EMAILS || "juanviverosv@gmail.com").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
export const esActorPrueba = (email?: string | null) => !!email && ACTORES.includes(String(email).toLowerCase().trim());

type Destino = { email: string; phone: string | null };
const cacheSes = new Map<string, { email: string | null; t: number }>();
const cacheDest = new Map<string, { d: Destino | null; t: number }>();
const ult10 = (p?: string | null) => String(p || "").replace(/\D/g, "").slice(-10);

/** Si la petición en curso la hizo alguien en modo prueba, devuelve a dónde mandar todo. */
export async function destinoPrueba(): Promise<Destino | null> {
  if (process.env.MODO_PRUEBA_APAGADO === "1") return null;
  let token: string | null = null;
  try {
    const { cookies } = await import("next/headers");
    const { SESSION_COOKIE_NAME } = await import("@/lib/session");
    token = (await cookies()).get(SESSION_COOKIE_NAME)?.value || null;
  } catch { return null; } // fuera de una petición (cron, script)
  if (!token) return null;
  let email: string | null = null;
  const c = cacheSes.get(token);
  if (c && Date.now() - c.t < 60_000) email = c.email;
  else {
    try { const { verifySession } = await import("@/lib/session"); email = (await verifySession(token))?.email || null; } catch { email = null; }
    cacheSes.set(token, { email, t: Date.now() });
  }
  if (!email) return null;
  const k = String(email).toLowerCase();
  const cd = cacheDest.get(k);
  if (cd && Date.now() - cd.t < 60_000) return cd.d || null;
  const { data } = await getSupabaseAdmin().from("users").select("email, phone, modo_prueba").eq("email", k).maybeSingle();
  const u = data as { phone?: string | null; modo_prueba?: boolean | null } | null;
  const activo = u?.modo_prueba === true || (u?.modo_prueba == null && esActorPrueba(k));
  const d: Destino | null = activo ? { email: k, phone: u?.phone || process.env.E2E_TEST_OVERRIDE_PHONE || null } : null;
  cacheDest.set(k, { d: d as Destino, t: Date.now() });
  return d;
}

/** Teléfono final + nota de a quién iba (null si no se redirigió) */
export async function telefonoPrueba(phone: string): Promise<{ phone: string; iba: string | null }> {
  const d = await destinoPrueba();
  if (!d || !d.phone || ult10(d.phone) === ult10(phone)) return { phone, iba: null };
  return { phone: d.phone, iba: phone };
}
/** Correo final + nota de a quién iba */
export async function correoPrueba(to: string | string[]): Promise<{ to: string | string[]; iba: string | null }> {
  const d = await destinoPrueba();
  const lista = Array.isArray(to) ? to : [to];
  if (!d || lista.every(x => String(x).toLowerCase() === d.email)) return { to, iba: null };
  return { to: d.email, iba: lista.join(", ") };
}
