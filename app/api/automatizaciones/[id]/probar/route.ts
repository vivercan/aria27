/** POST /api/automatizaciones/[id]/probar — muestra que pasaria ahora, sin mandar nada · 10-Oct-2026 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { correrRegla } from "@/lib/automatizaciones-server";
import { evaluar, type Regla } from "@/lib/automatizaciones";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const { id } = await ctx.params;
  const db = getSupabaseAdmin();
  const { data } = await db.from("automatizaciones").select("*").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "No existe" }, { status: 404 });
  const r = { ...(data as Regla), modo_prueba: false };
  const casos = await evaluar(db, r);
  const sim = await correrRegla(db, r, { dry: true });
  return NextResponse.json({ ok: true, casos: casos.slice(0, 30), total: casos.length, simulacion: sim });
}
