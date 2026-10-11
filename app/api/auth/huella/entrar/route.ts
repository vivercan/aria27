/** Entrar sin contraseña con huella o rostro · 11-Oct-2026 */
import { NextRequest, NextResponse } from "next/server";
import { opcionesEntrar, verificarEntrar } from "@/lib/passkeys";
import { createSession, buildSessionCookieHeader, SESSION_TTL_RECORDAR } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(getClientIdentifier(req), { key: "auth:huella", ...RATE_LIMITS.WRITE });
  if (!rl.allowed) return rateLimitResponse(rl);
  const b = await req.json().catch(() => ({})) as { paso?: string; retoId?: string; respuesta?: { id?: string } };
  try {
    if (b.paso === "opciones") return NextResponse.json(await opcionesEntrar(req));
    if (b.paso === "verificar" && b.respuesta && typeof b.respuesta.id === "string") {
      const r = await verificarEntrar(req, String(b.retoId || ""), b.respuesta as never);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 401 });
      const ua = req.headers.get("user-agent"); const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip");
      const s = await createSession({ userEmail: r.email, userAgent: ua, ip, ttlSeconds: SESSION_TTL_RECORDAR });
      if (!s) return NextResponse.json({ error: "No se pudo abrir la sesión" }, { status: 500 });
      const { data: u } = await getSupabaseAdmin().from("users").select("role, permissions").eq("email", r.email).maybeSingle();
      const res = NextResponse.json({ ok: true, email: r.email, role: (u as { role?: string } | null)?.role || "user", permissions: (u as { permissions?: unknown } | null)?.permissions || {} });
      res.headers.set("Set-Cookie", buildSessionCookieHeader(s.token, SESSION_TTL_RECORDAR));
      return res;
    }
    return NextResponse.json({ error: "Paso inválido" }, { status: 400 });
  } catch (e) { return NextResponse.json({ error: (e as Error).message || "No se pudo verificar" }, { status: 400 }); }
}
