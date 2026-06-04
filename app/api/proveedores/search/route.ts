/**
 * /api/proveedores/search?q=SANTA
 * GET -> Server-side search de proveedores ACTIVO con ilike. Usa service_role,
 * ignora RLS, limites de paginacion del cliente anon, y cualquier issue de
 * caching. Fuente de verdad para autocomplete de proveedores.
 *
 * 04-Jun-2026 (Daisy bug3 fix definitivo)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

const log = logger("PROVEEDORES-SEARCH");

export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    if (q.length < 2) {
      return NextResponse.json({ proveedores: [] });
    }
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("Proveedores")
      .select("id, name, bank_name, bank_clabe, bank_account_number, payment_method, razon_social")
      .eq("status", "ACTIVO")
      .ilike("name", `%${q}%`)
      .order("name")
      .limit(20);
    if (error) {
      log.error("query error", { err: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ proveedores: data || [] });
  } catch (e: unknown) {
    log.error("POST error", { e });
    return NextResponse.json(
      { error: (e as { message?: string })?.message || "Error" },
      { status: 500 }
    );
  }
}
