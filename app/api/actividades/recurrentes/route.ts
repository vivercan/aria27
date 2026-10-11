/** GET/POST /api/actividades/recurrentes — actividades que se crean solas (cada lunes, cada día 1…) · 11-Oct-2026 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { siguienteFecha, hoyMX, limpiarRecurrente } from "@/lib/plantillas";
import { personaPorEmpleado } from "@/lib/actividades-server";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const { data, error } = await getSupabaseAdmin().from("actividad_recurrentes").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ recurrentes: data || [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const r = limpiarRecurrente(await req.json().catch(() => ({})) as Record<string, unknown>);
  if (r.error || !r.row) return NextResponse.json({ error: r.error }, { status: 400 });
  const db = getSupabaseAdmin();
  if (!(await personaPorEmpleado(db, r.row.asignado_id))) return NextResponse.json({ error: "Esa persona no está en el personal" }, { status: 400 });
  const proxima = siguienteFecha(r.row.frecuencia, r.row.dia, hoyMX());
  const { data, error } = await db.from("actividad_recurrentes").insert({ ...r.row, proxima, creada_por: auth.email.toLowerCase() }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, recurrente: data });
}
