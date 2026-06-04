import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const k = req.nextUrl.searchParams.get("k");
  if (k !== "aria27-debug-2026") return NextResponse.json({ error: "nope" }, { status: 403 });
  const db = getSupabaseAdmin();
  // Sample de requisiciones_historico
  const { data: hist, error: e1 } = await db
    .from("requisiciones_historico")
    .select("*")
    .limit(3);
  return NextResponse.json({
    sample: hist,
    error: e1?.message,
  });
}
