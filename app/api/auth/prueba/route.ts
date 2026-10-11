/**
 * Perfiles de prueba de JJ · 11-Oct-2026
 * Entrar como admin / direccion / rh / validador / compras / residente / ejecutivo con la clave de JJ.
 * Son cuentas en modo prueba: todo el proceso corre, pero los avisos (WhatsApp, correo, push) llegan solo a JJ.
 * No pasan por Zoho (no tienen buzón). La clave se guarda como hash scrypt, nunca en texto.
 * Si el usuario escrito no es un perfil de prueba responde { prueba: false } y la pantalla sigue con el login normal.
 */
import { NextRequest, NextResponse } from "next/server";
import { scryptSync, timingSafeEqual } from "crypto";
import { createSession, buildSessionCookieHeader, SESSION_TTL_SECONDS, SESSION_TTL_RECORDAR } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
export const dynamic = "force-dynamic";
const log = logger("AUTH-PRUEBA");

function claveOk(clave: string, guardado: string | null | undefined): boolean {
  const p = String(guardado || "").split("$");
  if (p.length !== 6 || p[0] !== "scrypt") return false;
  const [, N, r, pp, sal, hash] = p;
  try {
    const esperado = Buffer.from(hash, "hex");
    const d = scryptSync(clave, Buffer.from(sal, "hex"), esperado.length, { N: Number(N), r: Number(r), p: Number(pp), maxmem: 64 * 1024 * 1024 });
    return d.length === esperado.length && timingSafeEqual(d, esperado);
  } catch { return false; }
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({})) as { usuario?: string; password?: string; recordar?: boolean };
  const usuario = String(b.usuario || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (!usuario || usuario.includes("@") || usuario.length > 40) return NextResponse.json({ prueba: false });
  const db = getSupabaseAdmin();
  const { data: u } = await db.from("users").select("email, role, permissions, active, modo_prueba, prueba_hash").eq("usuario_prueba", usuario).maybeSingle();
  if (!u) return NextResponse.json({ prueba: false });
  // Límite estricto: 8 intentos cada 15 minutos por dispositivo/IP
  const rl = checkRateLimit(getClientIdentifier(req), { key: "auth:prueba", max: 8, windowMs: 15 * 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl);
  const row = u as { email: string; role: string; permissions: unknown; active: boolean | null; modo_prueba: boolean | null; prueba_hash: string | null };
  if (row.active === false || row.modo_prueba !== true) return NextResponse.json({ prueba: true, error: "Este perfil de prueba está apagado" }, { status: 403 });
  if (!claveOk(String(b.password || ""), row.prueba_hash)) {
    log.warn("clave incorrecta en perfil de prueba", { usuario });
    return NextResponse.json({ prueba: true, error: "Contraseña incorrecta" }, { status: 401 });
  }
  const ttl = b.recordar ? SESSION_TTL_RECORDAR : SESSION_TTL_SECONDS;
  const ua = req.headers.get("user-agent"); const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip");
  const s = await createSession({ userEmail: row.email, userAgent: ua, ip, ttlSeconds: ttl });
  if (!s) return NextResponse.json({ prueba: true, error: "No se pudo abrir la sesión" }, { status: 500 });
  log.info("entrada con perfil de prueba", { usuario });
  const res = NextResponse.json({ prueba: true, ok: true, email: row.email, role: row.role, permissions: row.permissions || {} });
  res.headers.set("Set-Cookie", buildSessionCookieHeader(s.token, ttl));
  return res;
}
