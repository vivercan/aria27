/**
 * /api/employees/by-email?email=X
 * GET -> resuelve nombre completo del empleado para imprimibles.
 *
 * Estrategia multi-tabla:
 *   1) employees: email/correo/mail = X
 *   2) Personal (VIEW espanol)
 *   3) Users: email = X (fallback minimo)
 *
 * Para imprimibles donde se quiere el nombre completo en lugar del apodo
 * del username (req.created_by puede ser "daisy" pero queremos "Daisy Sánchez Calvillo").
 *
 * 04-Jun-2026
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

interface EmployeeShape {
  full_name?: string;
  name?: string;
  email?: string;
  employee_number?: string;
  position?: string;
  [k: string]: unknown;
}

async function tryLookup(
  db: ReturnType<typeof getSupabaseAdmin>,
  email: string,
  name: string,
  table: string
): Promise<EmployeeShape | null> {
  if (email) {
    for (const col of ["email", "correo", "mail"]) {
      try {
        const { data } = await db
          .from(table)
          .select("*")
          .ilike(col, email)
          .limit(1)
          .maybeSingle();
        if (data) return data as EmployeeShape;
      } catch {
        // skip
      }
    }
  }
  if (name) {
    for (const col of ["full_name", "name"]) {
      try {
        const { data } = await db
          .from(table)
          .select("*")
          .ilike(col, `%${name}%`)
          .limit(1)
          .maybeSingle();
        if (data) return data as EmployeeShape;
      } catch {
        // skip
      }
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const email = (req.nextUrl.searchParams.get("email") || "").trim().toLowerCase();
    const name = (req.nextUrl.searchParams.get("name") || "").trim();

    if (!email && !name) {
      return NextResponse.json({ full_name: null });
    }

    const db = getSupabaseAdmin();
    const tables = ["employees", "Personal", "Users"];
    let found: EmployeeShape | null = null;
    let source = "none";
    for (const t of tables) {
      const r = await tryLookup(db, email, name, t);
      if (r) {
        found = r;
        source = t;
        break;
      }
    }

    const full = found?.full_name || found?.name || null;
    return NextResponse.json(
      {
        full_name: full,
        source,
        employee_number: found?.employee_number || null,
        position: found?.position || null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as { message?: string })?.message || "Error", full_name: null },
      { status: 500 }
    );
  }
}
