/** PATCH (resolver/reabrir) y DELETE de una marca del plano · 11-Oct-2026 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const { id } = await ctx.params; const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const estado = b.estado === "RESUELTA" ? "RESUELTA" : "ABIERTA";
  const { data, error } = await getSupabaseAdmin().from("plano_marcas").update({ estado, resuelta_at: estado === "RESUELTA" ? new Date().toISOString() : null }).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, marca: data });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const { id } = await ctx.params; const db = getSupabaseAdmin();
  const { data: m } = await db.from("plano_marcas").select("creado_por").eq("id", id).maybeSingle();
  if (!m) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if ((m as { creado_por: string }).creado_por !== auth.email.toLowerCase() && !["admin", "administrador", "rh", "direccion", "validador"].includes(String(auth.role).toLowerCase())) return NextResponse.json({ error: "Solo quien la puso o un jefe puede quitarla" }, { status: 403 });
  const { error } = await db.from("plano_marcas").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
