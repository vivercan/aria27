import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-api";
import { logger } from "@/lib/logger";

const log = logger("WIPE-REQUISICIONES");

// POST /api/admin/wipe-requisiciones
// Body: { confirmation: "BORRAR-TODO" }
// DELETE en cascade manual:
//   1. requisition_item_quotes (FK a requisition_items)
//   2. requisition_items (FK a requisitions)
//   3. purchase_orders WHERE requisition_id IS NOT NULL (FK a requisitions)
//   4. requisitions
//   5. Reset sequences.requisitions = 0
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => ({}));
  if (body.confirmation !== "BORRAR-TODO") {
    return NextResponse.json({ error: "Confirmacion incorrecta. Esperaba 'BORRAR-TODO'" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const result: Record<string, unknown> = {};

  try {
    // 1. requisition_item_quotes
    const { count: qBefore } = await sb.from("requisition_item_quotes").select("id", { count: "exact", head: true });
    const { error: e1 } = await sb.from("requisition_item_quotes").delete().not("id", "is", null);
    if (e1) throw new Error(`requisition_item_quotes: ${e1.message}`);
    result.requisition_item_quotes = qBefore || 0;

    // 2. requisition_items
    const { count: iBefore } = await sb.from("requisition_items").select("id", { count: "exact", head: true });
    const { error: e2 } = await sb.from("requisition_items").delete().not("id", "is", null);
    if (e2) throw new Error(`requisition_items: ${e2.message}`);
    result.requisition_items = iBefore || 0;

    // 3. purchase_orders (solo las vinculadas a requisitions)
    const { count: poBefore } = await sb.from("purchase_orders").select("id", { count: "exact", head: true }).not("requisition_id", "is", null);
    const { error: e3 } = await sb.from("purchase_orders").delete().not("requisition_id", "is", null);
    if (e3) throw new Error(`purchase_orders: ${e3.message}`);
    result.purchase_orders = poBefore || 0;

    // 4. requisitions
    const { count: rBefore } = await sb.from("requisitions").select("id", { count: "exact", head: true });
    const { error: e4 } = await sb.from("requisitions").delete().not("id", "is", null);
    if (e4) throw new Error(`requisitions: ${e4.message}`);
    result.requisitions = rBefore || 0;

    // 5. Reset sequence
    const { error: e5 } = await sb.from("sequences").update({ current_value: 0 }).eq("id", "requisitions");
    if (e5) log.warn("No pudo resetear sequence", { err: e5.message });
    result.sequence_reset = !e5;

    // Audit
    try {
      await sb.from("audit_log").insert({
        actor_email: auth.email,
        action: "admin.wipe-requisiciones",
        payload: result,
      });
    } catch { /* ignore */ }

    log.info("WIPE completado", { actor: auth.email, deleted: result });
    return NextResponse.json({ ok: true, deleted: result });
  } catch (err: unknown) {
    log.error("WIPE falló", { error: (err as Error).message, partial: result });
    return NextResponse.json({ error: (err as Error).message, partial: result }, { status: 500 });
  }
}
