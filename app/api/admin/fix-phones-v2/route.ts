import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (req.nextUrl.searchParams.get("k") !== "aria27-debug-2026") {
    return NextResponse.json({ error: "nope" }, { status: 403 });
  }
  const db = getSupabaseAdmin();

  const { data: deyaAntes } = await db.from("employees").select("employee_number, full_name, whatsapp").eq("employee_number", "EMP-022").maybeSingle();
  const { error: e1 } = await db.from("employees").update({ whatsapp: "4492788797" }).eq("employee_number", "EMP-022");

  const { data: baudAntes } = await db.from("employees").select("employee_number, full_name, whatsapp").eq("employee_number", "EMP-021").maybeSingle();
  const { error: e2 } = await db.from("employees").update({ whatsapp: "4491425197" }).eq("employee_number", "EMP-021");

  const { data: deyaDespues } = await db.from("employees").select("employee_number, full_name, whatsapp").eq("employee_number", "EMP-022").maybeSingle();
  const { data: baudDespues } = await db.from("employees").select("employee_number, full_name, whatsapp").eq("employee_number", "EMP-021").maybeSingle();

  // Validar findEmpleado para ambos
  async function findEmp(phone10: string) {
    const { data } = await db.from("employees").select("id, full_name, whatsapp, status").or(`whatsapp.eq.${phone10},whatsapp.eq.52${phone10},whatsapp.eq.521${phone10}`).eq("status", "ACTIVO").single();
    return data;
  }
  const valDeya = await findEmp("4492788797");
  const valBaud = await findEmp("4491425197");

  return NextResponse.json({
    deya: { antes: deyaAntes, despues: deyaDespues, error: e1?.message, validacion_findEmpleado: valDeya },
    baudelio: { antes: baudAntes, despues: baudDespues, error: e2?.message, validacion_findEmpleado: valBaud },
  });
}
