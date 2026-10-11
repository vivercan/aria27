/** Cron diario 6:00 Aguascalientes · ARIA Doménica · crea las actividades recurrentes que tocan hoy (11-Oct-2026) */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { correrRecurrentes } from "@/lib/plantillas-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const expected = process.env.CRON_SECRET || "";
  const isVercelCron = req.headers.get("x-vercel-cron") === "1" || req.headers.get("user-agent")?.startsWith("vercel-cron") === true;
  if (!isVercelCron && (!expected || auth !== `Bearer ${expected}`)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const r = await correrRecurrentes(getSupabaseAdmin());
  return NextResponse.json({ ok: true, ...r });
}
