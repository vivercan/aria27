/**
 * Número consecutivo único para todo lo que se solicita (11-Oct-2026 · JJ y Deyanira):
 * requisiciones y tareas salen del mismo contador. Si el pago es la 780 y luego se encarga una tarea, la tarea es la 781,
 * y la siguiente requisición la 782. Requisición = REQ-2026-00782, tarea = TAR-2026-00781.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const numeroCorto = (folio?: string | null) => { const m = String(folio || "").match(/(\d{3,})$/); return m ? `#${m[1]}` : ""; };

export async function siguienteFolio(db: SupabaseClient, prefijo: "REQ" | "TAR"): Promise<string | null> {
  try {
    const { data, error } = await db.rpc("increment_sequence", { seq_id: "requisitions" });
    if (error || data == null) return null;
    const n = typeof data === "number" ? data : (data as { current_value: number }).current_value;
    return `${prefijo}-${new Date().getFullYear()}-${String(n).padStart(5, "0")}`;
  } catch { return null; }
}
