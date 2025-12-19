import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const AUTHORIZED_EMAIL = "recursos.humanos@gcuavante.com";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requisitionIds, userEmail, confirmation } = body;

    if (userEmail !== AUTHORIZED_EMAIL) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (confirmation !== "DELETE") {
      return NextResponse.json({ error: "Confirmacion invalida" }, { status: 400 });
    }

    if (!requisitionIds || requisitionIds.length === 0) {
      return NextResponse.json({ error: "No se especificaron requisiciones" }, { status: 400 });
    }

    const { data: requisitions } = await supabase
      .from("requisitions")
      .select("*")
      .in("id", requisitionIds);

    for (const req of requisitions || []) {
      const { data: items } = await supabase
        .from("requisition_items")
        .select("*")
        .eq("requisition_id", req.id);

      await supabase.from("requisitions_backup").insert({
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

      await supabase.from("requisition_items").delete().eq("requisition_id", req.id);
    }

    await supabase.from("requisitions").delete().in("id", requisitionIds);

    return NextResponse.json({ 
      success: true, 
      message: requisitionIds.length + " requisicion(es) eliminada(s)",
      deletedCount: requisitionIds.length
    });

  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
