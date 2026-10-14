/** POST /api/actividades/[id]/reenviar — vuelve a mandar el aviso por WhatsApp a quien hace la actividad (14-Oct-2026).
 *  Pueden: quien la encargó o un jefe (admin, rh, dirección, validador). */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { reenviarAvisoAsignacion } from "@/lib/actividades-server";

export const dynamic = "force-dynamic";
const JEFES = ["admin", "administrador", "rh", "direccion", "validador"];

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const { id } = await ctx.params;
  const db = getSupabaseAdmin();
  const { data } = await db.from("tareas_asignadas").select("asignado_por, asignado_por_email").eq("id", id).maybeSingle();
  const t = data as { asignado_por?: string | null; asignado_por_email?: string | null } | null;
  if (!t) return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });
  const me = auth.email.toLowerCase();
  const esDueño = String(t.asignado_por_email || t.asignado_por || "").toLowerCase() === me;
  if (!esDueño && !JEFES.includes(String(auth.role || "").toLowerCase())) return NextResponse.json({ error: "Solo quien la encargó (o un jefe) puede reenviar el aviso" }, { status: 403 });
  const r = await reenviarAvisoAsignacion(db, id, me);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, para: r.para });
}
