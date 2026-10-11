/** Cron diario 6:00 Aguascalientes · ARIA Doménica · crea las actividades recurrentes que tocan hoy (11-Oct-2026) */
import { cronAutorizado } from "@/lib/cron-auth";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { correrRecurrentes } from "@/lib/plantillas-server";
import { aplicarRecorrido } from "@/lib/actividades-server";
import { hoyMX } from "@/lib/plantillas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!cronAutorizado(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getSupabaseAdmin();
  const r = await correrRecurrentes(db);
  // Dependencias: si una actividad sigue sin terminarse después de su entrega, las que la esperan se recorren (sin avisar todos los días)
  const hoy = hoyMX(); let recorridas = 0;
  const { data: padres } = await db.from("tareas_asignadas").select("id, fecha_compromiso").in("estatus", ["PENDIENTE", "EN_PROGRESO"]).lt("fecha_compromiso", hoy).limit(500);
  const { data: hijos } = await db.from("tareas_asignadas").select("depende_de").not("depende_de", "is", null).in("estatus", ["PENDIENTE", "EN_PROGRESO"]);
  const conHijos = new Set(((hijos || []) as { depende_de: string }[]).map(h => h.depende_de));
  for (const p of (padres || []) as { id: string }[]) if (conHijos.has(p.id)) recorridas += await aplicarRecorrido(db, p.id, hoy, "sistema@aria27", false);
  return NextResponse.json({ ok: true, ...r, recorridas });
}
