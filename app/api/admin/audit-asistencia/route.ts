import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("k") !== "aria27-debug-2026") {
    return NextResponse.json({ error: "nope" }, { status: 403 });
  }
  const db = getSupabaseAdmin();
  const phone10 = req.nextUrl.searchParams.get("phone") || "4951198249";

  // 1. Misma query que findEmpleado
  const { data: emp1, error: e1 } = await db
    .from("employees")
    .select("id, full_name, status, whatsapp, whatsapp_phone")
    .or(`whatsapp.eq.${phone10},whatsapp.eq.52${phone10},whatsapp.eq.521${phone10}`)
    .eq("status", "ACTIVO")
    .single();

  // 2. Misma query sin .single() (por si hay duplicados)
  const { data: empAll, error: e2 } = await db
    .from("employees")
    .select("id, full_name, status, whatsapp, whatsapp_phone")
    .or(`whatsapp.eq.${phone10},whatsapp.eq.52${phone10},whatsapp.eq.521${phone10}`);

  // 3. Buscar exacto sin filtros
  const { data: exact, error: e3 } = await db
    .from("employees")
    .select("id, full_name, status, whatsapp, whatsapp_phone")
    .eq("whatsapp", phone10);

  return NextResponse.json({
    phone10_probado: phone10,
    findEmpleado_resultado: emp1,
    findEmpleado_error: e1?.message,
    findEmpleado_error_code: e1?.code,
    sin_single_resultado: empAll,
    sin_single_error: e2?.message,
    exact_whatsapp_eq: exact,
    exact_error: e3?.message,
  });
}
