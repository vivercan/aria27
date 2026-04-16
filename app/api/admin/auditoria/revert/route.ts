import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-api";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const log = logger("ADMIN-REVERT");

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(getClientIdentifier(req), { key: "admin:revert", ...RATE_LIMITS.ADMIN });
    if (!rl.allowed) return rateLimitResponse(rl);

    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.res;

    const { audit_id } = await req.json().catch(() => ({}));
    if (!audit_id) return NextResponse.json({ error: "audit_id requerido" }, { status: 400 });

    const sb = getSupabaseAdmin();
    const { data: row, error: e1 } = await sb.from("audit_log").select("*").eq("id", audit_id).maybeSingle();
    if (e1 || !row) return NextResponse.json({ error: e1?.message || "No encontrado" }, { status: 404 });

    if (row.op !== "UPDATE" || !row.before) {
      return NextResponse.json({ error: "Solo se puede revertir un UPDATE con snapshot before" }, { status: 400 });
    }

    const before = row.before as Record<string, unknown>;
    const rowId = row.row_pk;
    if (!rowId) return NextResponse.json({ error: "Sin row_pk" }, { status: 400 });

    // Reaplicar el estado anterior — el trigger captura el nuevo update automáticamente
    const { error: e2 } = await sb.from(row.table_name).update(before).eq("id", rowId);
    if (e2) return NextResponse.json({ error: `Error al revertir: ${e2.message}` }, { status: 500 });

    return NextResponse.json({ ok: true, reverted_table: row.table_name, row_id: rowId, by: auth.email });
  } catch (err: unknown) {
    log.error("POST /admin/auditoria/revert falló", { error: err });
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
