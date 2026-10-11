/** PATCH/DELETE /api/actividades/plantillas/[id] · 11-Oct-2026 (quien la creó, Superintendencia, Dirección, RH o admin) */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { limpiarItems } from "@/lib/plantillas";
import { puedeEditar } from "@/lib/plantillas-server";

async function cargar(id: string) { const db = getSupabaseAdmin(); const { data } = await db.from("actividad_plantillas").select("*").eq("id", id).maybeSingle(); return { db, p: data as { creada_por: string | null } | null }; }

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const { id } = await ctx.params; const { db, p } = await cargar(id);
  if (!p) return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
  if (!puedeEditar(auth.role, auth.email, p.creada_por)) return NextResponse.json({ error: "Solo quien la creó, Superintendencia, Dirección o RH pueden cambiarla" }, { status: 403 });
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const cambios: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (b.nombre !== undefined) { const n = String(b.nombre || "").trim().slice(0, 120); if (!n) return NextResponse.json({ error: "Ponle nombre" }, { status: 400 }); cambios.nombre = n; }
  if (b.descripcion !== undefined) cambios.descripcion = b.descripcion ? String(b.descripcion).slice(0, 500) : null;
  if (b.items !== undefined) { const r = limpiarItems(b.items); if (r.error) return NextResponse.json({ error: r.error }, { status: 400 }); cambios.items = r.items; }
  const { data, error } = await db.from("actividad_plantillas").update(cambios).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, plantilla: data });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const { id } = await ctx.params; const { db, p } = await cargar(id);
  if (!p) return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
  if (!puedeEditar(auth.role, auth.email, p.creada_por)) return NextResponse.json({ error: "Solo quien la creó, Superintendencia, Dirección o RH pueden borrarla" }, { status: 403 });
  const { error } = await db.from("actividad_plantillas").update({ activa: false, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
