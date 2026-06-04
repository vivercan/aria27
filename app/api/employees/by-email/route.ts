import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

interface EmployeeShape {
  full_name?: string;
  name?: string;
  email?: string;
  employee_number?: string;
  position?: string;
  status?: string;
  [k: string]: unknown;
}

async function findEmployee(
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
    for (const col of ["full_name", "name", "nombre"]) {
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
    const debug = req.nextUrl.searchParams.get("debug") === "1";

    const db = getSupabaseAdmin();

    // Probar tablas: employees, Personal (VIEW), Users
    const tables = ["employees", "Personal", "personal", "Users"];
    let found: EmployeeShape | null = null;
    let source = "none";
    for (const t of tables) {
      const r = await findEmployee(db, email, name, t);
      if (r) {
        found = r;
        source = t;
        break;
      }
    }

    const full = found?.full_name || found?.name;
    if (full) {
      return NextResponse.json(
        { full_name: full, source, ...found },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (debug) {
      // Listar primeras 3 de cada tabla
      const samples: Record<string, unknown> = {};
      for (const t of tables) {
        try {
          const { data, error } = await db.from(t).select("*").limit(2);
          samples[t] = error ? { error: error.message } : data;
        } catch (e) {
          samples[t] = { exception: String(e) };
        }
      }
      return NextResponse.json({ full_name: null, source: "none", samples });
    }

    return NextResponse.json({ full_name: null, source: "none" });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as { message?: string })?.message || "Error", full_name: null },
      { status: 500 }
    );
  }
}
