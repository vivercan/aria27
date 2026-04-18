import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
const supabase = getSupabaseAdmin();
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const log = logger("REQ-DELETE");
const AUTHORIZED_ROLES = ["admin", "rh"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { requisitionIds, userEmail, confirmation } = body;

    // ── Validación de entrada ──────────────────────────────
    if (!requisitionIds || !Array.isArray(requisitionIds) || requisitionIds.length === 0) {
      return NextResponse.json({ error: "No se proporcionaron IDs de requisiciones" }, { status: 400 });
    }

    if (confirmation !== "Borrar") {
      return NextResponse.json({ error: "Confirmación incorrecta. Debe escribir 'Borrar'" }, { status: 400 });
    }

    if (!userEmail) {
      return NextResponse.json({ error: "Email de usuario requerido" }, { status: 400 });
    }

    // ── Verificar rol: solo RH puede eliminar ──────────────
    const { data: userData, error: userError } = await supabase
      .from("Users")
      .select("role, name")
      .eq("email", userEmail)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 403 });
    }

    if (!AUTHORIZED_ROLES.includes(userData.role)) {
      return NextResponse.json(
        { error: "Solo el usuario de Recursos Humanos puede eliminar registros" },
        { status: 403 }
      );
    }

    // RATE LIMIT: accion destructiva — 60 por minuto por usuario autorizado
    const clientId = getClientIdentifier(request, userEmail);
    const rl = checkRateLimit(clientId, { key: "req:delete", ...RATE_LIMITS.WRITE });
    if (!rl.allowed) {
      log.warn("Rate limit excedido", { clientId, retryAfter: rl.retryAfter });
      return rateLimitResponse(rl);
    }

    log.info("delete-start", { user: userData.name, role: userData.role, count: requisitionIds.length });

    // ── PL06 17-Abr-2026: delete atómico vía RPC delete_requisition_cascade
    //    Transacción única: lock + backup + cascade delete. Si algo falla,
    //    ROLLBACK automático y el registro queda como estaba.
    //    Requiere migración sql/pl06-pl07-atomic-rpcs.sql aplicada en Supabase.
    let deletedCount = 0;
    const errors: string[] = [];

    for (const reqId of requisitionIds) {
      try {
        const { data: result, error: rpcError } = await supabase.rpc("delete_requisition_cascade", {
          p_req_id: reqId,
          p_deleted_by: userEmail,
        });

        if (rpcError) {
          log.error("rpc-fail", { reqId, error: rpcError.message });
          errors.push(`Error RPC en ${reqId}: ${rpcError.message}`);
          continue;
        }

        const r = result as { ok?: boolean; folio?: string; error?: string; code?: string } | null;
        if (!r || r.ok !== true) {
          if (r?.error === "not_found") {
            errors.push(`Requisición ${reqId} no encontrada`);
          } else {
            log.error("rpc-rollback", { reqId, error: r?.error, code: r?.code });
            errors.push(`Error al eliminar ${reqId}: ${r?.error || "desconocido"}`);
          }
          continue;
        }

        deletedCount++;
        log.info("deleted", { folio: r.folio, reqId });
      } catch (err: unknown) {
        log.error("unexpected", { reqId, error: String(err) });
        errors.push(`Error inesperado en ${reqId}`);
      }
    }

    // ── Respuesta ──────────────────────────────────────────
    const message =
      deletedCount === requisitionIds.length
        ? `${deletedCount} requisición(es) eliminada(s) correctamente. Respaldo guardado.`
        : `${deletedCount} de ${requisitionIds.length} eliminadas. ${errors.length > 0 ? "Errores: " + errors.join(", ") : ""}`;

    log.info("delete-result", { deletedCount, total: requisitionIds.length, errors: errors.length });

    return NextResponse.json({
      success: true,
      message,
      deletedCount,
      totalRequested: requisitionIds.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    log.error("general", { error: String(error) });
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
