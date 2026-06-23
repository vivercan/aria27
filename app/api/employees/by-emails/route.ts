import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const __auth = await requireUser(req);
    if (!__auth.ok) return __auth.res;
    const body = (await req.json().catch(() => ({}))) as { emails?: string[] };
    const emails = Array.from(
      new Set((body.emails || []).map((e) => (e || "").trim().toLowerCase()).filter(Boolean))
    );
    if (emails.length === 0) {
      return NextResponse.json({ map: {} });
    }
    const db = getSupabaseAdmin();
    const map: Record<string, string> = {};

    const { data: emps } = await db
      .from("employees")
      .select("email, full_name")
      .or(emails.map((e) => `email.ilike.${e}`).join(","));
    for (const e of (emps || []) as Array<{ email?: string; full_name?: string }>) {
      if (e.email && e.full_name) {
        map[e.email.toLowerCase()] = e.full_name;
      }
    }

    const faltantes = emails.filter((e) => !map[e]);
    if (faltantes.length > 0) {
      const { data: usrs } = await db
        .from("Users")
        .select("email, name")
        .or(faltantes.map((e) => `email.ilike.${e}`).join(","));
      for (const u of (usrs || []) as Array<{ email?: string; name?: string }>) {
        if (u.email && u.name) {
          map[u.email.toLowerCase()] = u.name;
        }
      }
    }

    return NextResponse.json(
      { map },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as { message?: string })?.message || "Error", map: {} },
      { status: 500 }
    );
  }
}
