/**
 * POST /api/db/respaldo — reenvía una petición PostgREST/Storage a Supabase cuando el navegador no alcanza supabase.co (23-Oct-2026)
 * Usa la LLAVE ANÓNIMA (no la de servicio): los mismos permisos que el navegador ya tiene. Exige sesión válida.
 * Solo /rest/v1/* y lectura de /storage/v1/object/*. Nada de /auth ni /functions.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const rl = checkRateLimit(getClientIdentifier(req, auth.email), { key: "db-respaldo", max: 600, windowMs: 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl);
  const b = await req.json().catch(() => null) as { method?: string; path?: string; headers?: Record<string, string>; body?: string | null } | null;
  if (!b?.path) return NextResponse.json({ error: "path requerido" }, { status: 400 });
  const path = String(b.path);
  const metodo = String(b.method || "GET").toUpperCase();
  const okRest = path.startsWith("/rest/v1/");
  const okStorage = path.startsWith("/storage/v1/object/") && metodo === "GET";
  if (!okRest && !okStorage) return NextResponse.json({ error: "Ruta no permitida" }, { status: 403 });
  if (!["GET", "HEAD", "POST", "PATCH", "DELETE"].includes(metodo)) return NextResponse.json({ error: "Método no permitido" }, { status: 405 });
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || ""; const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!base || !anon) return NextResponse.json({ error: "Servidor sin configuración de base" }, { status: 500 });
  const headers: Record<string, string> = { apikey: anon, Authorization: `Bearer ${anon}` };
  for (const [k, v] of Object.entries(b.headers || {})) {
    const kk = k.toLowerCase();
    if (["accept", "accept-profile", "content-profile", "content-type", "prefer", "range", "range-unit", "x-client-info"].includes(kk)) headers[k] = v;
  }
  const r = await fetch(base + path, { method: metodo, headers, body: metodo === "GET" || metodo === "HEAD" ? undefined : (b.body ?? undefined), cache: "no-store" });
  const out = new NextResponse(r.body, { status: r.status });
  for (const h of ["content-type", "content-range", "range-unit", "preference-applied", "location"]) { const v = r.headers.get(h); if (v) out.headers.set(h, v); }
  out.headers.set("Cache-Control", "no-store");
  out.headers.set("x-aria-respaldo", "1");
  return out;
}
