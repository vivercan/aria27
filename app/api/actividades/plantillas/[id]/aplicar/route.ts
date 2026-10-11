/** POST /api/actividades/plantillas/[id]/aplicar — crea todas las actividades de la plantilla en una obra · 11-Oct-2026 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { aplicarPlantilla } from "@/lib/plantillas-server";
import type { ItemPlantilla } from "@/lib/plantillas";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const { id } = await ctx.params;
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const inicio = String(b.fecha_inicio || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio)) return NextResponse.json({ error: "Elige el día de arranque" }, { status: 400 });
  const asignadoDefault = String(b.asignado_id || "");
  const asignaciones: Record<string, string> = {};
  for (const [k, v] of Object.entries((b.asignaciones || {}) as Record<string, unknown>)) if (v) asignaciones[k] = String(v);
  const db = getSupabaseAdmin();
  const { data: p } = await db.from("actividad_plantillas").select("nombre, items, activa").eq("id", id).maybeSingle();
  const pl = p as { nombre: string; items: ItemPlantilla[]; activa: boolean } | null;
  if (!pl || !pl.activa) return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
  const faltan = pl.items.map((_, i) => i).filter(i => !(asignaciones[String(i)] || asignadoDefault));
  if (faltan.length) return NextResponse.json({ error: "Elige quién hace cada actividad" }, { status: 400 });
  const r = await aplicarPlantilla(db, pl, { obra_id: b.obra_id ? String(b.obra_id) : null, inicio, asignado_default: asignadoDefault, asignaciones }, auth.email);
  if (!r.creadas) return NextResponse.json({ error: r.errores[0] || "No se pudo aplicar" }, { status: 400 });
  return NextResponse.json({ ok: true, ...r });
}
