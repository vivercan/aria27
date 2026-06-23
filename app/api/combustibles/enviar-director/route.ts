// 23-Jun-2026 — Combustibles 2.0
// POST /api/combustibles/enviar-director
// Jessica dispara: marca consolidado como ENVIADO_DIRECTOR + manda WA a Fernando.

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { sendCombParaAutorizar } from "@/lib/wa-comb-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FERNANDO_WA = "4959588588"; // del audit BD

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.res;

  const body = (await req.json().catch(() => ({}))) as { consolidado_id?: string };
  if (!body.consolidado_id) {
    return NextResponse.json({ ok: false, error: "consolidado_id requerido" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: cons, error } = await db
    .from("combustible_consolidados")
    .select("*")
    .eq("id", body.consolidado_id)
    .maybeSingle();
  if (error || !cons) {
    return NextResponse.json({ ok: false, error: "consolidado no encontrado" }, { status: 404 });
  }
  if (cons.status !== "BORRADOR") {
    return NextResponse.json(
      { ok: false, error: `consolidado en status ${cons.status}, debe ser BORRADOR` },
      { status: 400 }
    );
  }

  const totalL = Number(cons.total_litros_gasolina || 0) + Number(cons.total_litros_diesel || 0) + Number(cons.total_litros_otro || 0);
  const estimado = cons.monto_estimado || (totalL * 25); // fallback $25/L

  // Update consolidado
  await db
    .from("combustible_consolidados")
    .update({ status: "ENVIADO_DIRECTOR", enviado_director_at: new Date().toISOString(), monto_estimado: estimado })
    .eq("id", body.consolidado_id);

  // Mandar WA a Fernando
  const wa = await sendCombParaAutorizar(
    FERNANDO_WA,
    cons.folio,
    String(cons.total_solicitudes),
    String(totalL),
    Number(estimado).toLocaleString("es-MX")
  );

  // Solicitudes pasan a ENVIADA_DIRECTOR
  await db
    .from("combustible_solicitudes")
    .update({ status: "ENVIADA_DIRECTOR" })
    .eq("consolidado_id", body.consolidado_id)
    .eq("status", "CONSOLIDADA");

  return NextResponse.json({ ok: true, consolidado: cons.folio, wa_sent: wa.ok, wa_error: wa.error });
}
