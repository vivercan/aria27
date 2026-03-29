import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
const log = logger("REQ-DELETE");

// Roles autorizados para eliminar requisiciones
const AUTHORIZED_ROLES = ["admin", "rh"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requisitionIds, userEmail, confirmation } = body;

    // Validar usuario por rol
    if (!userEmail) {
      return NextResponse.json({ error: "Email de usuario requerido" }, { status: 400 });
    }

    const { data: callerUser } = await supabase
      .from("Users")
      .select("role, email, name")
      .eq("email", userEmail)
      .single();

    if (!callerUser || !AUTHORIZED_ROLES.includes(callerUser.role)) {
      return NextResponse.json({ error: "No autorizado \u2014 se requiere rol admin o rh" }, { status: 403 });
    }

    if (confirmation !== "Borrar") {
      return NextResponse.json({ error: "Confirmacion invalida. Debe escribir Borrar" }, { status: 400 });
    }

    if (!requisitionIds || requisitionIds.length === 0) {
      return NextResponse.json({ error: "No se especificaron requisiciones" }, { status: 400 });
    }

    const { data: Requisiciones } = await supabase
      .from("Requisiciones")
      .select("*")
      .in("id", requisitionIds);

    let deletedCount = 0;

    for (const req of Requisiciones || []) {
      // 1. Obtener items para backup
      const { data: items } = await supabase
        .from("requisition_items")
        .select("*")
        .eq("requisition_id", req.id);

      // 2. Obtener POs relacionadas para backup
      const { data: purchaseOrders } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("requisition_id", req.id);

      // 3. Obtener cotizaciones de items
      const itemIds = (items || []).map((i: { id: string }) => i.id);
      let itemQuotes: unknown[] = [];
      if (itemIds.length > 0) {
        const { data: qData } = await supabase
          .from("requisition_item_quotes")
          .select("*")
          .in("requisition_item_id", itemIds);
        itemQuotes = qData || [];
      }

      // 4. Obtener entregas relacionadas (via PO ids)
      let entregas: unknown[] = [];
      if (purchaseOrders && purchaseOrders.length > 0) {
        const poIds = purchaseOrders.map((po: { id: string }) => po.id);
        const { data: entregasData } = await supabase
          .from("entregas")
          .select("*")
          .in("purchase_order_id", poIds);
        entregas = entregasData || [];
      }

      // 5. Crear backup completo en deleted_records (JSONB)
      await supabase.from("deleted_records").insert({
        source_table: "requisitions",
        source_id: req.id,
        data: req,
        related_data: {
          items: items || [],
          item_quotes: itemQuotes,
          purchase_orders: purchaseOrders || [],
          entregas: entregas,
        },
        deleted_by: userEmail,
        restore_notes: `Folio: ${req.folio || "N/A"} | Obra: ${req.cost_center_name || "N/A"} | Solicitante: ${req.created_by || "N/A"} | Status: ${req.status || "N/A"}`,
      });

      // 6. CASCADE DELETE: entregas -> item_quotes -> POs -> items
      if (entregas.length > 0) {
        const entregaIds = (entregas as { id: string }[]).map((e) => e.id);
        await supabase.from("entregas").delete().in("id", entregaIds);
        log.info(`[DELETE] ${entregas.length} entregas eliminadas para req ${req.folio}`);
      }

      if (itemIds.length > 0) {
        await supabase.from("requisition_item_quotes").delete().in("requisition_item_id", itemIds);
        log.info(`[DELETE] cotizaciones de items eliminadas para req ${req.folio}`);
      }

      if (purchaseOrders && purchaseOrders.length > 0) {
        const poIds = purchaseOrders.map((po: { id: string }) => po.id);
        await supabase.from("purchase_orders").delete().in("id", poIds);
        log.info(`[DELETE] ${purchaseOrders.length} POs eliminadas para req ${req.folio}`);
      }

      await supabase.from("requisition_items").delete().eq("requisition_id", req.id);

      deletedCount++;
    }

    // Eliminar las requisiciones
    await supabase.from("Requisiciones").delete().in("id", requisitionIds);

    log.info(`[DELETE] ${deletedCount} requisiciones eliminadas por ${callerUser.name} (${userEmail}). Backup en deleted_records.`);

    return NextResponse.json({
      success: true,
      message: `${deletedCount} requisicion(es) eliminada(s). Respaldo guardado.`,
      deletedCount,
    });
  } catch (error) {
    log.error("[DELETE] Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
