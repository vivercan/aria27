/**
 * Cron cada 30 min · ARIA Domingo · corre las automatizaciones activas (10-Oct-2026)
 * Solo manda avisos de 7:00 a 20:00 de Aguascalientes; fuera de horario no corre (los casos se avisan en la siguiente ventana).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { correrRegla } from "@/lib/automatizaciones-server";
import { enHorario, type Regla } from "@/lib/automatizaciones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const expected = process.env.CRON_SECRET || "";
  const isVercelCron = req.headers.get("x-vercel-cron") === "1" || req.headers.get("user-agent")?.startsWith("vercel-cron") === true;
  if (!isVercelCron && (!expected || auth !== `Bearer ${expected}`)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!enHorario() && new URL(req.url).searchParams.get("forzar") !== "1") return NextResponse.json({ ok: true, fueraDeHorario: true });
  const db = getSupabaseAdmin();
  const { data } = await db.from("automatizaciones").select("*").eq("activa", true);
  const out: { id: string; nombre: string; resumen: string }[] = [];
  for (const r of (data || []) as Regla[]) {
    try {
      const res = await correrRegla(db, r);
      await db.from("automatizaciones").update({ ultima_corrida: new Date().toISOString(), ultimo_resultado: res.resumen }).eq("id", r.id);
      out.push({ id: r.id, nombre: r.nombre, resumen: res.resumen });
    } catch (e: unknown) {
      const msg = `Error: ${(e as Error)?.message || e}`.slice(0, 300);
      await db.from("automatizaciones").update({ ultima_corrida: new Date().toISOString(), ultimo_resultado: msg }).eq("id", r.id);
      out.push({ id: r.id, nombre: r.nombre, resumen: msg });
    }
  }
  return NextResponse.json({ ok: true, reglas: out.length, out });
}
