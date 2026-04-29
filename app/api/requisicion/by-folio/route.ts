import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-api";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const folio = req.nextUrl.searchParams.get("folio");
  if (!folio) return NextResponse.json({ error: "folio requerido" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("requisitions")
    .select("id, folio, status, cost_center_name, monto, proveedor, descripcion_compra, motivo_solicitud, cotizacion_data")
    .eq("folio", folio)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  // Items
  const { data: items } = await sb
    .from("requisition_items")
    .select("id, product_name, unit, quantity, comments, selected_price")
    .eq("requisition_id", data.id);

  return NextResponse.json({ ...data, items: items || [] });
}
