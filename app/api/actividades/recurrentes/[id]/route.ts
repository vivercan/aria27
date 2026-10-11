/** PATCH/DELETE /api/actividades/recurrentes/[id] · 11-Oct-2026 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { limpiarRecurrente, siguienteFecha, hoyMX, type Recurrente } from "@/lib/plantillas";
import { puedeEditar } from "@/lib/plantillas-server";

async function cargar(id: string) { const db = getSupabaseAdmin(); const { data } = await db.from("actividad_recurrentes").select("*").eq("id", id).maybeSingle(); return { db, r: data as Recurrente | null }; }

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const { id } = await ctx.params; const { db, r } = await cargar(id);
  if (!r) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (!puedeEditar(auth.role, auth.email, r.creada_por)) return NextResponse.json({ error: "Solo quien la creó, Superintendencia, Dirección o RH pueden cambiarla" }, { status: 403 });
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  let cambios: Record<string, unknown> = {};
  if (typeof b.activa === "boolean" && Object.keys(b).length === 1) {
    cambios = { activa: b.activa };
    if (b.activa) cambios.proxima = siguienteFecha(r.frecuencia, r.dia, hoyMX());
  } else {
    const l = limpiarRecurrente({ ...r, ...b }); if (l.error || !l.row) return NextResponse.json({ error: l.error }, { status: 400 });
    cambios = { ...l.row, proxima: siguienteFecha(l.row.frecuencia, l.row.dia, hoyMX()) };
    if (typeof b.activa === "boolean") cambios.activa = b.activa;
  }
  cambios.updated_at = new Date().toISOString();
  const { data, error } = await db.from("actividad_recurrentes").update(cambios).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, recurrente: data });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const { id } = await ctx.params; const { db, r } = await cargar(id);
  if (!r) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (!puedeEditar(auth.role, auth.email, r.creada_por)) return NextResponse.json({ error: "Solo quien la creó, Superintendencia, Dirección o RH pueden borrarla" }, { status: 403 });
  const { error } = await db.from("actividad_recurrentes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
