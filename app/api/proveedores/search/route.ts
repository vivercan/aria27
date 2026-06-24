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
      .select("id, name, razon_social, payment_method, status")
      .eq("status", "ACTIVO")
      .or(`name.ilike.${pattern},razon_social.ilike.${pattern}`)
      .order("name")
      .limit(20);
    if (error) {
      log.error("query error", { err: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    // FIX 541.1 24-Jun-2026: MINIMIZAR payload — solo lo necesario para selector.
    // CLABE / banco / cuenta NO viajan en el dropdown.
    // Para datos bancarios usar /api/proveedores/[id]/banking con auth + rol explicito.
    type Row = {
      id: string;
      name: string;
      razon_social?: string | null;
      payment_method?: string | null;
      status?: string | null;
      [k: string]: unknown;
    };
    const proveedores = ((data || []) as Row[]).map((r) => ({
      id: r.id,
      name: r.name,
      razon_social: r.razon_social || null,
      payment_method: r.payment_method || null,
      status: r.status || null,
    }));
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
