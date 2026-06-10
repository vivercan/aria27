import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (req.nextUrl.searchParams.get("k") !== "aria27-debug-2026") {
    return NextResponse.json({ error: "nope" }, { status: 403 });
  }
  const db = getSupabaseAdmin();

  // Borrar req test E2E + cualquier otra con cost_center_name "E2E_OBRA" o "E2E_TEST_OBRA"
  const { data: testReqs } = await db
    .from("requisitions")
    .select("id, folio, cost_center_name")
    .or("cost_center_name.ilike.%E2E%,solicitante_nombre_completo.eq.E2E Test");

  const ids = (testReqs || []).map((r: { id: string }) => r.id);
  const folios = (testReqs || []).map((r: { folio: string }) => r.folio);

  let deletedReqs = 0;
  if (ids.length > 0) {
    const { error } = await db.from("requisitions").delete().in("id", ids);
    if (!error) deletedReqs = ids.length;
  }

  // Borrar equipos test residuales (activo=false con alias E2E)
  const { data: testEquipos } = await db
    .from("equipo_combustible")
    .select("id, alias")
    .or("alias.ilike.%E2E%,alias.ilike.%TEST%");
  const eqIds = (testEquipos || []).map((e: { id: string }) => e.id);
  let deletedEquipos = 0;
  if (eqIds.length > 0) {
    const { error } = await db.from("equipo_combustible").delete().in("id", eqIds);
    if (!error) deletedEquipos = eqIds.length;
  }

  return NextResponse.json({
    ok: true,
    reqs_deleted: deletedReqs,
    reqs_folios: folios,
    equipos_deleted: deletedEquipos,
    equipos_aliases: (testEquipos || []).map((e: { alias: string }) => e.alias),
  });
}
