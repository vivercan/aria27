import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("k") !== "aria27-debug-2026") {
    return NextResponse.json({ error: "nope" }, { status: 403 });
  }
  const db = getSupabaseAdmin();

  // 1. Todos los employees con whatsapp o whatsapp_phone
  const { data: emps } = await db
    .from("employees")
    .select("id, full_name, employee_number, position, whatsapp, whatsapp_phone, status")
    .eq("status", "ACTIVO")
    .order("full_name")
    .limit(200);

  // 2. Especificamente Daisy y Osita
  const { data: daisyOsita } = await db
    .from("employees")
    .select("*")
    .or("full_name.ilike.%Daisy%,full_name.ilike.%Lizbeth%,full_name.ilike.%Osita%,full_name.ilike.%Montalvo%");

  // 3. Ultimas 10 entradas en asistencia_log o wa_log para ver el "from" que llegó
  const { data: waLog } = await db
    .from("wa_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(15);

  return NextResponse.json({
    employees_activos: emps?.length || 0,
    employees: emps,
    daisy_osita: daisyOsita,
    wa_log_reciente: waLog,
  });
}
