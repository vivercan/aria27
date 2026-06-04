/**
 * /api/employees/by-email?email=usuario@dominio
 * GET -> resuelve full_name del empleado por email (Users -> employees).
 *
 * Fallback chain:
 *   1. employees.email = email -> employees.full_name
 *   2. Users.email = email -> Users.name (no es legal, pero es lo unico)
 *   3. null
 *
 * 04-Jun-2026 — nombres completos formales en documentos imprimibles
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const log = logger("EMPLOYEE-BY-EMAIL");

export async function GET(req: NextRequest) {
  try {
    const email = (req.nextUrl.searchParams.get("email") || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ full_name: null });
    }
    const db = getSupabaseAdmin();
    const { data: emp } = await db
      .from("employees")
      .select("full_name, employee_number, position")
      .ilike("email", email)
      .maybeSingle();
    if (emp?.full_name) {
      return NextResponse.json(
        { full_name: emp.full_name, source: "employees", employee_number: emp.employee_number, position: emp.position },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    const { data: usr } = await db
      .from("Users")
      .select("name")
      .ilike("email", email)
      .maybeSingle();
    return NextResponse.json(
      { full_name: usr?.name || null, source: usr ? "users" : "none" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: unknown) {
    log.error("GET error", { e });
    return NextResponse.json(
      { error: (e as { message?: string })?.message || "Error", full_name: null },
      { status: 500 }
    );
  }
}
