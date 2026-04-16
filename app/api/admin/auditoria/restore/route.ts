import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-api";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const log = logger("ADMIN-RESTORE");

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(getClientIdentifier(req), { key: "admin:restore", ...RATE_LIMITS.ADMIN });
    if (!rl.allowed) return rateLimitResponse(rl);

    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.res;

    const { deleted_id } = await req.json().catch(() => ({}));
    if (!deleted_id) return NextResponse.json({ error: "deleted_id requerido" }, { status: 400 });

    const sb = getSupabaseAdmin();
    const { data: del, error: e1 } = await sb.from("deleted_records").select("*").eq("id", deleted_id).maybeSingle();
    if (e1 || !del) return NextResponse.json({ error: e1?.message || "No encontrado" }, { status: 404 });

    const payload = del.data as Record<string, unknown>;
    if (!payload || typeof payload !== "object") return NextResponse.json({ error: "Snapshot invalido" }, { status: 400 });

    // Re-insert en la tabla origen
    const { error: e2 } = await sb.from(del.source_table).upsert(payload);
    if (e2) return NextResponse.json({ error: `Error al restaurar: ${e2.message}` }, { status: 500 });

    // Remover del log de borrados (ya restaurado) — se audita automáticamente por trigger
    const { error: e3 } = await sb.from("deleted_records").delete().eq("id", deleted_id);
    if (e3) log.warn("No se pudo limpiar deleted_records tras restore", { deleted_id, error: e3.message });

    return NextResponse.json({ ok: true, restored_to: del.source_table, row_id: del.source_id, by: auth.email });
  } catch (err: unknown) {
    log.error("POST /admin/auditoria/restore falló", { error: err });
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
