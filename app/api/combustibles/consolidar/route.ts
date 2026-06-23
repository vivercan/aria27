// 23-Jun-2026 — Combustibles 2.0 F3
// POST /api/combustibles/consolidar
// Agrupa todas las solicitudes SOLICITADAS del día (o las que se pasen en body.ids)
// y genera un consolidado. Las solicitudes pasan a CONSOLIDADA.

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.res;

  const body = (await req.json().catch(() => ({}))) as { ids?: string[]; armado_por_email?: string };
  const armadoPor = body.armado_por_email || auth.email;

  const db = getSupabaseAdmin();

  // Si vienen ids específicos, esos. Si no, todas las SOLICITADAS del día
  const query = db
    .from("combustible_solicitudes")
    .select("id, litros, tipo_combustible")
    .eq("status", "SOLICITADA");
  if (body.ids && body.ids.length > 0) {
    query.in("id", body.ids);
  }
  const { data: solicitudes, error: queryErr } = await query;
  if (queryErr) return NextResponse.json({ ok: false, error: queryErr.message }, { status: 500 });
  if (!solicitudes || solicitudes.length === 0) {
    return NextResponse.json({ ok: false, error: "No hay solicitudes pendientes" }, { status: 400 });
  }

  // Calcular totales
  let totalGas = 0, totalDie = 0, totalOtro = 0;
  for (const s of solicitudes) {
    const lit = Number(s.litros) || 0;
    if (s.tipo_combustible === "GASOLINA" || s.tipo_combustible === "MAGNA" || s.tipo_combustible === "PREMIUM") totalGas += lit;
    else if (s.tipo_combustible === "DIESEL") totalDie += lit;
    else totalOtro += lit;
  }

  // Folio CONS-YYYY-NNNN
  const { data: seqData } = await db.rpc("increment_sequence", { seq_id: "comb_consolidado" });
  const seqNum = (seqData as number) || 1;
  const year = new Date().getFullYear();
  const folio = `CONS-${year}-${String(seqNum).padStart(4, "0")}`;

  // INSERT consolidado
  const { data: cons, error: consErr } = await db
    .from("combustible_consolidados")
    .insert({
      folio,
      armado_por_email: armadoPor,
      total_litros_gasolina: totalGas,
      total_litros_diesel: totalDie,
      total_litros_otro: totalOtro,
      total_solicitudes: solicitudes.length,
      status: "BORRADOR",
    })
    .select("id, folio, total_litros_gasolina, total_litros_diesel, total_solicitudes")
    .single();
  if (consErr) return NextResponse.json({ ok: false, error: consErr.message }, { status: 500 });

  // Link solicitudes al consolidado y cambiar status
  await db
    .from("combustible_solicitudes")
    .update({ status: "CONSOLIDADA", consolidada_at: new Date().toISOString(), consolidado_id: cons.id })
    .in(
      "id",
      solicitudes.map((s) => s.id)
    );

  return NextResponse.json({ ok: true, consolidado: cons, solicitudes_count: solicitudes.length });
}
