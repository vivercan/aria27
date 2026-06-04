/**
 * /api/employees/by-email?email=X&name=Y
 * GET -> resuelve nombre legal completo:
 *   1) employees.email = email -> employees.full_name
 *   2) employees.full_name ilike name (fuzzy match)
 *   3) Users.email = email -> Users.name
 *   4) null
 *
 * Para imprimibles donde apodos no son aceptables.
 * 04-Jun-2026 v2 — fallback por nombre cuando employees.email no matchea.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const email = (req.nextUrl.searchParams.get("email") || "").trim().toLowerCase();
    const name = (req.nextUrl.searchParams.get("name") || "").trim();
    const debug = req.nextUrl.searchParams.get("debug") === "1";

    const db = getSupabaseAdmin();

    // 1. Por email exacto en employees (probar varios nombres de columna)
    let emp = null;
    if (email) {
      const tryColumns = ["email", "correo", "mail", "email_address"];
      for (const col of tryColumns) {
        try {
          const { data } = await db
            .from("employees")
            .select("full_name, employee_number, position, email, status")
            .ilike(col, email)
            .limit(1)
            .maybeSingle();
          if (data) {
            emp = data;
            break;
          }
        } catch {
          // columna no existe, seguir intentando
        }
      }
    }

    // 2. Por nombre fuzzy si no se encontro por email
    if (!emp && name) {
      const { data } = await db
        .from("employees")
        .select("full_name, employee_number, position, status")
        .ilike("full_name", `%${name}%`)
        .limit(1)
        .maybeSingle();
      if (data) emp = data;
    }

    if (emp?.full_name) {
      return NextResponse.json(
        {
          full_name: emp.full_name,
          source: "employees",
          employee_number: emp.employee_number,
          position: emp.position,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // 3. Users
    if (email) {
      const { data: usr } = await db
        .from("Users")
        .select("name, role")
        .ilike("email", email)
        .maybeSingle();
      if (usr?.name) {
        return NextResponse.json(
          { full_name: usr.name, source: "users" },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    if (debug) {
      // Mostrar primeros 3 employees con columnas para discoverability
      const { data: sample } = await db
        .from("employees")
        .select("*")
        .ilike("full_name", `%${name || "deya"}%`)
        .limit(3);
      return NextResponse.json({ full_name: null, source: "none", debug_sample: sample });
    }

    return NextResponse.json({ full_name: null, source: "none" });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as { message?: string })?.message || "Error", full_name: null },
      { status: 500 }
    );
  }
}
