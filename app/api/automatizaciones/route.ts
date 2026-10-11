/** GET/POST /api/automatizaciones — ARIA Doménica · 10-Oct-2026 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { EDITORES, limpiarRegla } from "@/lib/automatizaciones-api";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("automatizaciones").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const ids = (data || []).map((r: { id: string }) => r.id);
  const { data: logs } = ids.length ? await db.from("automatizacion_log").select("automatizacion_id, created_at, enviado").in("automatizacion_id", ids).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()) : { data: [] };
  const conteo: Record<string, number> = {}; for (const l of (logs || []) as { automatizacion_id: string }[]) conteo[l.automatizacion_id] = (conteo[l.automatizacion_id] || 0) + 1;
  return NextResponse.json({ reglas: data || [], casos7d: conteo, puedeEditar: EDITORES.includes(auth.role) });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  if (!EDITORES.includes(auth.role)) return NextResponse.json({ error: "Tu rol no puede crear automatizaciones" }, { status: 403 });
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const c = limpiarRegla(b); if ("error" in c) return NextResponse.json({ error: c.error }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().from("automatizaciones").insert({ ...c.row, activa: !!b.activa, modo_prueba: b.modo_prueba === undefined ? true : !!b.modo_prueba, creada_por: auth.email.toLowerCase() }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, regla: data });
}
