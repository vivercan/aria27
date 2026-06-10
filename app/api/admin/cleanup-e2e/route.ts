import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (req.nextUrl.searchParams.get("k") !== "aria27-debug-2026") {
    return NextResponse.json({ error: "nope" }, { status: 403 });
  }
  const db = getSupabaseAdmin();
  const targetId = "f7cef006-50ba-4c20-b5f5-e898f7812f39";

  const { data: existe } = await db
    .from("requisitions")
    .select("id, folio, cost_center_name, status, monto, created_at")
    .eq("id", targetId)
    .maybeSingle();

  if (!existe) {
    const { data: alts } = await db
      .from("requisitions")
      .select("id, folio, cost_center_name, status, created_at")
      .or("folio.eq.1,cost_center_name.ilike.%E2E%,solicitante_nombre_completo.ilike.%E2E%")
      .order("created_at", { ascending: false })
      .limit(10);
    return NextResponse.json({ target_not_found: true, alternativas: alts });
  }

  const { error } = await db.from("requisitions").delete().eq("id", targetId);
  return NextResponse.json({ borrada: !error, error: error?.message, req: existe });
}
