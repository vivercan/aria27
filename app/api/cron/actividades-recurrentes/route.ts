/** Cron diario 6:00 Aguascalientes · ARIA Doménica · crea las actividades recurrentes que tocan hoy (11-Oct-2026) */
import { cronAutorizado } from "@/lib/cron-auth";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { correrRecurrentes } from "@/lib/plantillas-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!cronAutorizado(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const r = await correrRecurrentes(getSupabaseAdmin());
  return NextResponse.json({ ok: true, ...r });
}
