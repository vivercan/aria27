/**
 * FIX 543 · 25-Jun-2026
 *
 * Hidrata datos bancarios de un proveedor DESDE `suppliers` (service_role),
 * ignorando lo que envíe el frontend. Elimina la dependencia del rol del
 * creador de la requi + de que `/api/proveedores/search` devuelva bank_*.
 *
 * Uso:
 *   const bank = await hydrateSupplierBanking({ id, name });
 *   // → { banco, clabe_interbancaria, numero_cuenta, nombre_cuenta } o null
 *
 * Estrategia:
 *   1. Si viene `id` → SELECT WHERE id = $1 (path rápido)
 *   2. Si viene `name` → SELECT WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND status = 'ACTIVO'
 *   3. Si ninguno matchea → devuelve null y el caller decide qué hacer
 *
 * No tirar excepciones: cualquier error de red/BD retorna null + log warn.
 */

import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

const log = logger("HYDRATE-SUPPLIER-BANKING");

export interface SupplierBankingSnapshot {
  banco: string | null;
  clabe_interbancaria: string | null;
  numero_cuenta: string | null;
  nombre_cuenta: string | null;
}

interface HydrateInput {
  id?: string | number | null;
  name?: string | null;
}

interface SupplierRow {
  bank_name: string | null;
  bank_clabe: string | null;
  bank_account_number: string | null;
  name: string | null;
  razon_social: string | null;
}

export async function hydrateSupplierBanking(
  input: HydrateInput
): Promise<SupplierBankingSnapshot | null> {
  const { id, name } = input || {};
  const cleanName = typeof name === "string" ? name.trim() : "";

  if (!id && !cleanName) return null;

  try {
    const db = getSupabaseAdmin();
    const SELECT = "bank_name, bank_clabe, bank_account_number, name, razon_social";

    let row: SupplierRow | null = null;

    // 1) Path rápido por id
    if (id != null && id !== "") {
      const { data, error } = await db
        .from("suppliers")
        .select(SELECT)
        .eq("id", id)
        .maybeSingle();
      if (!error && data) row = data as SupplierRow;
    }

    // 2) Fallback por nombre normalizado
    if (!row && cleanName) {
      const { data, error } = await db
        .from("suppliers")
        .select(SELECT)
        .ilike("name", cleanName)
        .eq("status", "ACTIVO")
        .limit(1);
      if (!error && data && data.length > 0) row = data[0] as SupplierRow;
    }

    if (!row) {
      log.warn("supplier no encontrado", { id, name: cleanName });
      return null;
    }

    const snapshot: SupplierBankingSnapshot = {
      banco: row.bank_name || null,
      clabe_interbancaria: row.bank_clabe || null,
      numero_cuenta: row.bank_account_number || null,
      nombre_cuenta: row.razon_social || row.name || null,
    };

    return snapshot;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn("hydrate falló", { err: msg, id, name: cleanName });
    return null;
  }
}
