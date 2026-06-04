/**
 * /api/proveedores/search?q=SANTA
 * GET -> Server-side search de proveedores ACTIVO con ilike. Usa service_role,
 * ignora RLS, limites de paginacion del cliente anon, y cualquier issue de
 * caching. Fuente de verdad para autocomplete de proveedores.
 *
 * 04-Jun-2026 (Daisy bug3 fix definitivo) — Auto-detecta columnas bancarias
 * porque el cliente Supabase fallaba silenciosamente cuando incluia columnas
 * inexistentes (bank_account_number etc).
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
    // Query con * para evitar errores de columnas inexistentes
    const { data, error } = await db
      .from("suppliers")
      .select("*")
      .eq("status", "ACTIVO")
      .ilike("name", `%${q}%`)
      .order("name")
      .limit(20);
    if (error) {
      log.error("query error", { err: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    // Mapear a shape consumido por el front
    type Row = {
      id: string;
      name: string;
      razon_social?: string | null;
      payment_method?: string | null;
      bank_name?: string | null;
      bank_clabe?: string | null;
      // Variantes posibles del nombre de cuenta
      bank_account_number?: string | null;
      bank_account?: string | null;
      account_number?: string | null;
      cuenta?: string | null;
      [k: string]: unknown;
    };
    const proveedores = ((data || []) as Row[]).map((r) => ({
      id: r.id,
      name: r.name,
      razon_social: r.razon_social || null,
      payment_method: r.payment_method || null,
      bank_name: r.bank_name || null,
      bank_clabe: r.bank_clabe || null,
      bank_account_number:
        r.bank_account_number || r.bank_account || r.account_number || r.cuenta || null,
    }));
    return NextResponse.json({ proveedores });
  } catch (e: unknown) {
    log.error("POST error", { e });
    return NextResponse.json(
      { error: (e as { message?: string })?.message || "Error" },
      { status: 500 }
    );
  }
}
