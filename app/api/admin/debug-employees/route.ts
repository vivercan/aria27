import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Proteccion minima: solo aceptar con token correcto
  const token = req.nextUrl.searchParams.get("k");
  if (token !== "aria27-debug-2026") {
    return NextResponse.json({ error: "nope" }, { status: 403 });
  }
  const q = req.nextUrl.searchParams.get("q") || "deyanira";
  const db = getSupabaseAdmin();

  // 1. Columnas de employees
  const { data: cols } = await db
    .rpc("pg_columns", { tname: "employees" })
    .then((r) => r as { data: unknown[] | null })
    .catch(() => ({ data: null }));

  // 2. Buscar empleado por nombre
  const { data: emps } = await db
    .from("employees")
    .select("*")
    .ilike("full_name", `%${q}%`)
    .limit(5);

  // 3. Users que puedan matchear
  const { data: users } = await db
    .from("Users")
    .select("*")
    .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(5);

  return NextResponse.json({ cols, employees: emps, users });
}
