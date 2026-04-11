import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const log = logger("REQ-DELETE");
const AUTHORIZED_ROLES = ["admin", "rh"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    log.info("delete-start", { user: userData.name, email: userEmail, role: userData.role, count: requisitionIds.length });

    // ── Backup + Delete por cada requisición ───────────────
    let deletedCount = 0;
    const errors: string[] = [];

    for (const reqId of requisitionIds) {
      try {
        // 1. Obtener datos completos de la requisición
        const { data: reqData } = await supabase
          .from("requisitions")
          .select("*")
          .eq("id", reqId)
          .single();

        if (!reqData) {
          errors.push(`Requisición ${reqId} no encontrada`);
          continue;
        }

        // 2. Obtener items relacionados
        const { data: itemsData } = await supabase
          .from("requisition_items")
          .select("*")
          .eq("requisition_id", reqId);

        // 3. Obtener cotizaciones de items
        const itemIds = (itemsData || []).map((i: { id: string }) => i.id);
        let quotesData: unknown[] = [];
        if (itemIds.length > 0) {
          const { data: qData } = await supabase
            .from("requisition_item_quotes")
            .select("*")
            .in("requisition_item_id", itemIds);
          quotesData = qData || [];
        }

        // 4. Obtener OCs relacionadas
        const { data: posData } = await supabase
          .from("purchase_orders")
          .select("*")
          .eq("requisition_id", reqId);

        // 5. Obtener entregas relacionadas
        const { data: entregasData } = await supabase
          .from("entregas")
          .select("*")
          .eq("requisition_id", reqId);

        // 6. Guardar backup completo en deleted_records
        const { error: backupError } = await supabase.from("deleted_records").insert({
          source_table: "requisitions",
          source_id: reqId,
          data: reqData,
          related_data: {
            items: itemsData || [],
            item_quotes: quotesData,
            purchase_orders: posData || [],
            entregas: entregasData || [],
          },
          deleted_by: userEmail,
          restore_notes: `Folio: ${reqData.folio || "N/A"} | Obra: ${reqData.cost_center_name || "N/A"} | Solicitante: ${reqData.created_by || "N/A"} | Status: ${reqData.status || "N/A"}`,
        });

        if (backupError) {
          log.error("backup-fail", { reqId, error: backupError?.message });
          errors.push(`Error al respaldar ${reqData.folio || reqId}`);
          continue;
        }

        // 7. Eliminar en orden: nietos → hijos → padre
        // 7a. Eliminar entregas
        if (entregasData && entregasData.length > 0) {
          await supabase.from("entregas").delete().eq("requisition_id", reqId);
        }

        // 7b. Eliminar cotizaciones de items
        if (itemIds.length > 0) {
          await supabase.from("requisition_item_quotes").delete().in("requisition_item_id", itemIds);
        }

        // 7c. Eliminar OCs
        if (posData && posData.length > 0) {
          await supabase.from("purchase_orders").delete().eq("requisition_id", reqId);
        }

        // 7d. Eliminar items
        await supabase.from("requisition_items").delete().eq("requisition_id", reqId);

        // 7e. Eliminar requisición
        const { error: deleteError } = await supabase
          .from("requisitions")
          .delete()
          .eq("id", reqId);

        if (deleteError) {
          log.error("delete-fail", { reqId, error: deleteError?.message });
          errors.push(`Error al eliminar ${reqData.folio || reqId}`);
          continue;
        }

        deletedCount++;
        log.info("deleted", { folio: reqData.folio, reqId });
      } catch (err) {
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
  } catch (error) {
    log.error("general", { error: String(error) });
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
