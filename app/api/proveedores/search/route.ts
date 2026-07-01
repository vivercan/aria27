/**
 * /api/proveedores/search?q=SANTA
 * GET -> Server-side search de proveedores ACTIVO. Usa service_role.
 *
 * 04-Jun-2026 v3 — bug Daisy "mecanico Sin resultados":
 *   - Causa: bundle stale en browser de Daisy.
 *   - Fix preventivo: amplia busqueda a `name` + `razon_social` (.or)
 *     porque algunos proveedores estan dados de alta solo con razon_social.
 *   - Anti-cache: no-store en respuesta y dynamic en route.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const log = logger("PROVEEDORES-SEARCH");

export async function GET(req: NextRequest) {
  try {
    const __auth = await requireUser(req);
    if (!__auth.ok) return __auth.res;
    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    if (q.length < 2) {
      return NextResponse.json(
        { proveedores: [] },
        { headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }
    const db = getSupabaseAdmin();
    // OR busca en name + razon_social. Si una columna no existe en la BD,
    // Supabase rechaza el .or — por eso usamos columnas confirmadas.
    const pattern = `%${q.replace(/[%_]/g, "")}%`;
    const { data, error } = await db
      .from("suppliers")
      .select("id, name, razon_social, payment_method, status, bank_name, bank_clabe, bank_account_number")
      .eq("status", "ACTIVO")
      .or(`name.ilike.${pattern},razon_social.ilike.${pattern}`)
      .order("name")
      .limit(20);
    if (error) {
      log.error("query error", { err: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    // FIX 542 25-Jun-2026 Opción B: payload minimizado por defecto, campos bancarios
    // solo si el rol del solicitante está en allowlist. Compras/caja/finanzas necesitan
    // bank_* para pagar por transferencia. Rol rh y similares NO ven CLABE.
    // Backend enforcement, no confiar en frontend.
    const ALLOWED_BANKING_ROLES = new Set([
      "admin", "compras", "caja", "finanzas", "director", "owner"
    ]);
    const canSeeBanking = ALLOWED_BANKING_ROLES.has((__auth.role || "").toLowerCase().trim());
    type Row = {
      id: string;
      name: string;
      razon_social?: string | null;
      payment_method?: string | null;
      status?: string | null;
      bank_name?: string | null;
      bank_clabe?: string | null;
      bank_account_number?: string | null;
      bank_account?: string | null;
      account_number?: string | null;
      cuenta?: string | null;
      [k: string]: unknown;
    };
    const proveedores = ((data || []) as Row[]).map((r) => {
      const base = {
        id: r.id,
        name: r.name,
        razon_social: r.razon_social || null,
        payment_method: r.payment_method || null,
        status: r.status || null,
      };
      if (!canSeeBanking) return base;
      return {
        ...base,
        bank_name: r.bank_name || null,
        bank_clabe: r.bank_clabe || null,
        bank_account_number: r.bank_account_number || null,
      };
    });
    return NextResponse.json(
      { proveedores },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e: unknown) {
    log.error("GET error", { e });
    return NextResponse.json(
      { error: (e as { message?: string })?.message || "Error" },
      { status: 500 }
    );
  }
}
