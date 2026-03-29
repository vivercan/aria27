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

    // Validar usuario por rol en lugar de email hardcodeado
    if (!userEmail) {
      return NextResponse.json({ error: "Email de usuario requerido" }, { status: 400 });
    }

    const { data: callerUser } = await supabase
      .from("Users")
      .select("role, email")
      .eq("email", userEmail)
      .single();

    if (!callerUser || !AUTHORIZED_ROLES.includes(callerUser.role)) {
      return NextResponse.json({ error: "No autorizado → se requiere rol admin o rh" }, { status: 403 });
    }

    if (confirmation !== "DELETE") {
      return NextResponse.json({ error: "Confirmacion invalida" }, { status: 400 });
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

      // 3. Obtener entregas relacionadas (via PO folios)
      let entregas: any[] = [];
      if (purchaseOrders && purchaseOrders.length > 0) {
        const poIds = purchaseOrders.map((po: any) => po.id);
        const { data: entregasData } = await supabase
          .from("entregas")
          .select("*")
          .in("purchase_order_id", poIds);
        entregas = entregasData || [];
      }

      // 4. Crear backup completo
      await supabase.from("Requisiciones_backup").insert({
        original_id: req.id,
        folio: req.folio,
        cost_center_id: req.cost_center_id,
        cost_center_name: req.cost_center_name,
        instructions: req.instructions,
        required_date: req.required_date,
        status: req.status,
        created_by: req.created_by,
        user_email: req.user_email,
        created_at: req.created_at,
        updated_at: req.updated_at,
        authorization_comments: req.authorization_comments,
        items: items,
        deleted_by: userEmail
      });

      // 5. CASCADE DELETE: eliminar entregas → POs → items → requisición
      if (entregas.length > 0) {
        const entregaIds = entregas.map((e: any) => e.id);
        await supabase.from("entregas").delete().in("id", entregaIds);
        log.info(`[DELETE] ${entregas.length} entregas eliminadas para req ${req.folio}`);
      }

      if (purchaseOrders && purchaseOrders.length > 0) {
        const poIds = purchaseOrders.map((po: any) => po.id);
        await supabase.from("purchase_orders").delete().in("id", poIds);
        log.info(`[DELETE] ${purchaseOrders.length} POs eliminadas para req ${req.folio}`);
      }

      await supabase.from("requisition_items").delete().eq("requisition_id", req.id);

      deletedCount++;
    }

    // Eliminar las requisiciones
    await supabase.from("Requisiciones").delete().in("id", requisitionIds);

    return NextResponse.json({
      success: true,
      message: `${deletedCount} requisicion(es) eliminada(s) con sus dependencias`,
      deletedCount
    });

  } catch (error) {
    log.error("Error en delete requisicion:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
