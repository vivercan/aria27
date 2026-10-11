/**
 * GET /api/requisicion/por-autorizar — Doménica 27 · 11-Oct-2026
 * Lista lo que ESTE usuario puede autorizar, ya armado para el celular:
 *  - nivel OBRA: PENDIENTE_RESPONSABLE (responsable de la obra, Superintendencia, Dirección, admin)
 *  - nivel DIRECCION: EN_AUTORIZACION (Dirección, admin)
 * Incluye resumen de lo que se pide, total y días esperando. Lectura con admin client, filtrada por rol.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type R = {
  id: string; folio: string; created_at: string; required_date: string | null; status: string; user_email: string | null;
  cost_center_name: string | null; created_by: string | null; solicitante_nombre_completo: string | null; purchase_status: string | null;
  proveedor: string | null; proveedor_nombre: string | null; forma_pago: string | null; total: number | null; monto: number | null;
  motivo_solicitud: string | null; descripcion_corta: string | null; subcategoria: string | null; tipo_solicitud: string | null;
  destajo_concepto: string | null; responsable_email: string | null; cotizacion_data: unknown; authorization_comments: string | null; prioridad: string | null;
};
type I = { requisition_id: string; product_name: string | null; quantity: number | null; unit: string | null; precio_total: number | null; selected_price: number | null; precio_unitario: number | null };

const tieneCot = (c: unknown) => {
  if (!c || typeof c !== "object") return false;
  const o = c as { quotes?: unknown[]; suppliers?: unknown[] };
  return (Array.isArray(o.quotes) && o.quotes.length > 0) || (Array.isArray(o.suppliers) && o.suppliers.length > 0);
};

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.res;
  const me = auth.email.toLowerCase(); const role = (auth.role || "").toLowerCase();
  const esDir = role === "direccion" || role === "admin";
  const db = getSupabaseAdmin();

  const estados = esDir ? ["PENDIENTE_RESPONSABLE", "EN_AUTORIZACION"] : ["PENDIENTE_RESPONSABLE"];
  let q = db.from("requisitions").select("id, folio, created_at, required_date, status, user_email, cost_center_name, created_by, solicitante_nombre_completo, purchase_status, proveedor, proveedor_nombre, forma_pago, total, monto, motivo_solicitud, descripcion_corta, subcategoria, tipo_solicitud, destajo_concepto, responsable_email, cotizacion_data, authorization_comments, prioridad")
    .in("status", estados).order("created_at", { ascending: true }).limit(300);
  if (!esDir && role !== "validador") q = q.ilike("responsable_email", me);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data || []) as R[];

  const ids = rows.map(r => r.id);
  const items: Record<string, I[]> = {};
  for (let i = 0; i < ids.length; i += 100) {
    const { data: it } = await db.from("requisition_items").select("requisition_id, product_name, quantity, unit, precio_total, selected_price, precio_unitario").in("requisition_id", ids.slice(i, i + 100));
    for (const x of (it || []) as I[]) (items[x.requisition_id] ||= []).push(x);
  }

  const ahora = Date.now();
  const lista = rows.map(r => {
    const its = items[r.id] || [];
    const sumaItems = its.reduce((s, x) => s + (Number(x.precio_total) || (Number(x.selected_price || x.precio_unitario) || 0) * (Number(x.quantity) || 0)), 0);
    const total = Number(r.total) || Number(r.monto) || sumaItems || 0;
    const cot = tieneCot(r.cotizacion_data);
    return {
      id: r.id, folio: r.folio, obra: r.cost_center_name, nivel: r.status === "PENDIENTE_RESPONSABLE" ? "OBRA" : "DIRECCION",
      quien: r.solicitante_nombre_completo || r.created_by || r.user_email, para: r.required_date, prioridad: r.prioridad,
      dias: Math.max(0, Math.floor((ahora - Date.parse(r.created_at)) / 864e5)),
      que: r.tipo_solicitud === "DESTAJO" ? (r.destajo_concepto || r.motivo_solicitud || "Destajo") : (r.motivo_solicitud || r.descripcion_corta || r.subcategoria || ""),
      tipo: r.tipo_solicitud || "MATERIALES", efectivo: r.purchase_status === "GASTO_EFECTIVO_PENDIENTE" || /EFECTIVO|CAJA/i.test(r.forma_pago || ""),
      proveedor: r.proveedor_nombre || r.proveedor, total,
      partidas: its.slice(0, 8).map(x => ({ n: x.product_name, c: x.quantity, u: x.unit })), mas: Math.max(0, its.length - 8),
      // con comparativa de Compras: se autoriza eligiendo proveedor en la pantalla de comparativa (genera OC)
      comparativa: r.status === "EN_AUTORIZACION" && cot && esDir ? `/autorizar/${r.authorization_comments}` : null,
    };
  });
  return NextResponse.json({ lista, puedeDireccion: esDir });
}
