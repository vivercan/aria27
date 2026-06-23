// 23-Jun-2026 — Cron diario 6 PM: si hay solicitudes SOLICITADAS sin consolidar,
// manda WA a Jessica recordándole consolidar.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { sendCombConsolidadoJessica } from "@/lib/wa-comb-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JESSICA_WA = "4495880244";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const expected = process.env.CRON_SECRET || "";
  const isVercelCron =
    req.headers.get("x-vercel-cron") === "1" ||
    req.headers.get("user-agent")?.startsWith("vercel-cron") === true;
  if (!isVercelCron && (!expected || auth !== `Bearer ${expected}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const { data: pendientes, error } = await db
    .from("combustible_solicitudes")
    .select("tipo_combustible, litros")
    .eq("status", "SOLICITADA")
    .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!pendientes || pendientes.length === 0) {
    return NextResponse.json({ ok: true, message: "Sin solicitudes pendientes", count: 0 });
  }

  let totalGas = 0, totalDie = 0;
  for (const s of pendientes) {
    const lit = Number(s.litros) || 0;
    if (["GASOLINA", "MAGNA", "PREMIUM"].includes(s.tipo_combustible)) totalGas += lit;
    else if (s.tipo_combustible === "DIESEL") totalDie += lit;
  }
  const estimado = (totalGas + totalDie) * 25;

  const wa = await sendCombConsolidadoJessica(
    JESSICA_WA,
    String(pendientes.length),
    String(totalGas),
    String(totalDie),
    estimado.toLocaleString("es-MX")
  );

  return NextResponse.json({ ok: true, pendientes: pendientes.length, wa_sent: wa.ok });
}
