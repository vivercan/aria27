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

/**
 * FIX 544 · 25-Jun-2026 · Modal captura CLABE al vuelo.
 * PATCH -> Actualiza bank_name / bank_clabe / bank_account_number / nombre_cuenta
 * de un proveedor. Autoriza a CUALQUIER usuario con sesion valida (decision JJ:
 * capturar rapido para no bloquear al residente en obra que necesita crear requi).
 *
 * Body: {
 *   bank_name?: string,
 *   bank_clabe: string,          // requerido, 18 digitos
 *   bank_account_number?: string,
 *   nombre_cuenta?: string,      // titular
 *   payment_method?: string,     // opcional cambia a TRANSFERENCIA si viene EFECTIVO
 * }
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const __auth = await requireUser(req);
    if (!__auth.ok) return __auth.res;
    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const clabe = String(body.bank_clabe || "").replace(/\s+/g, "");
    if (!/^\d{18}$/.test(clabe)) {
      return NextResponse.json({ error: "CLABE debe tener 18 digitos numericos" }, { status: 400 });
    }

    // Update mínimo — solo campos bancarios
    const update: Record<string, string> = {
      bank_clabe: clabe,
    };
    if (body.bank_name) update.bank_name = String(body.bank_name).trim();
    if (body.bank_account_number) update.bank_account_number = String(body.bank_account_number).trim();
    if (body.nombre_cuenta) update.nombre_cuenta = String(body.nombre_cuenta).trim();
    if (body.payment_method) update.payment_method = String(body.payment_method).trim();

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("suppliers")
      .update(update)
      .eq("id", id)
      .select("id, name, bank_name, bank_clabe, bank_account_number, payment_method")
      .maybeSingle();

    if (error) {
      log.error("PATCH error", { err: error.message, id, user: __auth.email });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });

    log.info("banking actualizado", { id, user: __auth.email, bank: update.bank_name });
    return NextResponse.json({ ok: true, supplier: data });
  } catch (e: unknown) {
    log.error("PATCH exception", { e });
    return NextResponse.json({ error: (e as { message?: string })?.message || "Error" }, { status: 500 });
  }
}
