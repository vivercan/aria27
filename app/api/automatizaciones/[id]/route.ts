/** PATCH/DELETE /api/automatizaciones/[id] — ARIA Domingo · 10-Oct-2026 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { EDITORES, limpiarRegla } from "@/lib/automatizaciones-api";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  if (!EDITORES.includes(auth.role)) return NextResponse.json({ error: "Tu rol no puede editar automatizaciones" }, { status: 403 });
  const { id } = await ctx.params;
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const db = getSupabaseAdmin();
  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof b.activa === "boolean") upd.activa = b.activa;
  if (typeof b.modo_prueba === "boolean") upd.modo_prueba = b.modo_prueba;
  if (b.disparador) { const c = limpiarRegla(b); if ("error" in c) return NextResponse.json({ error: c.error }, { status: 400 }); Object.assign(upd, c.row); }
  const { data, error } = await db.from("automatizaciones").update(upd).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, regla: data });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  if (!EDITORES.includes(auth.role)) return NextResponse.json({ error: "Tu rol no puede borrar automatizaciones" }, { status: 403 });
  const { id } = await ctx.params;
  const { error } = await getSupabaseAdmin().from("automatizaciones").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
