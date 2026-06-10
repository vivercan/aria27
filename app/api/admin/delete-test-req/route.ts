import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (req.nextUrl.searchParams.get("k") !== "aria27-debug-2026") {
    return NextResponse.json({ error: "nope" }, { status: 403 });
  }
  const db = getSupabaseAdmin();
  const { error } = await db.from("requisitions").delete().eq("id", "f7cef006-50ba-4c20-b5f5-e898f7812f39");
  return NextResponse.json({ ok: !error, error: error?.message });
}
