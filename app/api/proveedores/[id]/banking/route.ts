/**
 * /api/proveedores/[id]/banking
 * GET -> Devuelve datos bancarios (CLABE, banco, cuenta) de UN proveedor.
 *
 * FIX 541.1 24-Jun-2026: separado de /api/proveedores/search para minimizar
 * superficie de datos sensibles en endpoints generales.
 *
 * AUTH: requireUser + rol en allowlist (compras | admin | caja | finanzas).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const log = logger("PROVEEDORES-BANKING");
const ALLOWED_ROLES = new Set(["admin", "compras", "caja", "finanzas", "director", "owner"]);

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const __auth = await requireUser(req);
    if (!__auth.ok) return __auth.res;
    const role = (__auth.role || "").toLowerCase();
    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: "Rol sin permiso para datos bancarios" }, { status: 403 });
    }
    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("suppliers")
      .select("id, name, payment_method, bank_name, bank_clabe, bank_account_number, bank_account, account_number, cuenta")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      log.error("query error", { err: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });

    const banking = {
      id: data.id,
      name: data.name,
      payment_method: data.payment_method || null,
      bank_name: data.bank_name || null,
      bank_clabe: data.bank_clabe || null,
      bank_account_number:
        data.bank_account_number || data.bank_account || data.account_number || data.cuenta || null,
    };
    return NextResponse.json({ banking }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (e: unknown) {
    log.error("GET error", { e });
    return NextResponse.json({ error: (e as { message?: string })?.message || "Error" }, { status: 500 });
  }
}
