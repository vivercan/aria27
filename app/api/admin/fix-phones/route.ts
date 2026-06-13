import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (req.nextUrl.searchParams.get("k") !== "aria27-debug-2026") {
    return NextResponse.json({ error: "nope" }, { status: 403 });
  }
  const db = getSupabaseAdmin();

  // 1. Deya Montalvo (EMP-022): set whatsapp = 4492788797
  const { data: deyaAntes } = await db
    .from("employees")
    .select("id, full_name, whatsapp")
    .ilike("full_name", "%Deya Montalvo%")
    .maybeSingle();

  const { error: e1 } = await db
    .from("employees")
    .update({ whatsapp: "4492788797" })
    .eq("employee_number", "EMP-022");

  // 2. Baudelio Velador (EMP-021): quitar 521 prefix
  const { data: baudAntes } = await db
    .from("employees")
    .select("id, full_name, whatsapp")
    .eq("employee_number", "EMP-021")
    .maybeSingle();

  const { error: e2 } = await db
    .from("employees")
    .update({ whatsapp: "4491425197" })
    .eq("employee_number", "EMP-021");

  // Re-leer despues
  const { data: deyaDespues } = await db
    .from("employees")
    .select("id, full_name, whatsapp")
    .eq("employee_number", "EMP-022")
    .maybeSingle();
  const { data: baudDespues } = await db
    .from("employees")
    .select("id, full_name, whatsapp")
    .eq("employee_number", "EMP-021")
    .maybeSingle();

  return NextResponse.json({
    deya: { antes: deyaAntes, despues: deyaDespues, error: e1?.message },
    baudelio: { antes: baudAntes, despues: baudDespues, error: e2?.message },
  });
}
