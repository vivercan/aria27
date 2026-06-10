import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("k") !== "aria27-debug-2026") {
    return NextResponse.json({ error: "nope" }, { status: 403 });
  }
  const db = getSupabaseAdmin();

  // Buscar requisiciones de combustible historicas
  const { data: reqs } = await db
    .from("requisitions")
    .select("folio, cost_center_name, motivo_solicitud, descripcion_compra, categoria, subcategoria, proveedor, monto, created_at")
    .or("categoria.ilike.%combust%,subcategoria.ilike.%combust%,motivo_solicitud.ilike.%diesel%,motivo_solicitud.ilike.%gasolin%,motivo_solicitud.ilike.%retro%,motivo_solicitud.ilike.%camion%,motivo_solicitud.ilike.%maquina%")
    .order("created_at", { ascending: false })
    .limit(50);

  // Tambien items de combustible
  const { data: items } = await db
    .from("requisition_items")
    .select("product_name, quantity, unit, requisition:requisitions(folio, cost_center_name, motivo_solicitud)")
    .or("product_name.ilike.%diesel%,product_name.ilike.%gasolin%,product_name.ilike.%magna%,product_name.ilike.%premium%")
    .limit(50);

  // Obras activas
  const { data: obras } = await db
    .from("centros_trabajo")
    .select("id, nombre, codigo")
    .eq("activo", true)
    .order("nombre");

  // Operadores
  const { data: operadores } = await db
    .from("employees")
    .select("id, full_name, position, status")
    .ilike("position", "%operad%")
    .eq("status", "ACTIVO");

  return NextResponse.json({
    requisiciones_combustible: reqs?.length || 0,
    requisiciones: reqs,
    items_combustible: items?.length || 0,
    items,
    obras_activas: obras?.length || 0,
    obras,
    operadores: operadores?.length || 0,
    operadores_lista: operadores,
  });
}
