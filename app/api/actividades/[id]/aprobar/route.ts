/** POST /api/actividades/[id]/aprobar { accion: "aprobar" | "regresar", motivo? } — visto bueno del que la encargó (11-Oct-2026) */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { resolverAprobacion } from "@/lib/aprobacion";

export const dynamic = "force-dynamic";
const JEFES = ["admin", "Administrador", "rh", "direccion", "validador"];

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const { id } = await ctx.params;
  const b = await req.json().catch(() => ({})) as { accion?: string; motivo?: string };
  const accion = b.accion === "regresar" ? "regresar" : b.accion === "aprobar" ? "aprobar" : null;
  if (!accion) return NextResponse.json({ error: "Elige aprobar o regresar" }, { status: 400 });
  const db = getSupabaseAdmin();
  const { data } = await db.from("tareas_asignadas").select("id, titulo, obra, asignado_nombre, asignado_email, asignado_por, asignado_por_email, por_aprobar").eq("id", id).maybeSingle();
  const t = data as { id: string; titulo: string; asignado_por_email?: string | null; asignado_por?: string | null; por_aprobar?: boolean | null } | null;
  if (!t) return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });
  const me = auth.email.toLowerCase();
  const esDueño = String(t.asignado_por_email || t.asignado_por || "").toLowerCase() === me;
  if (!esDueño && !JEFES.includes(auth.role)) return NextResponse.json({ error: "Solo quien la encargó (o un jefe) puede aprobarla" }, { status: 403 });
  const motivo = String(b.motivo || "").trim().slice(0, 500);
  if (accion === "regresar" && !motivo) return NextResponse.json({ error: "Escribe qué le falta" }, { status: 400 });
  await resolverAprobacion(db, t, accion, motivo, me);
  return NextResponse.json({ ok: true });
}
