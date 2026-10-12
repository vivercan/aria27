/**
 * GET /api/folio?q=788 — busca un número en TODO lo que lleva folio consecutivo (requisiciones, pagos de servicio y tareas).
 * 11-Oct-2026 · JJ: un solo consecutivo; si buscas en requisiciones y el número es de una tarea, te dice dónde está.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.res;
  const m = String(req.nextUrl.searchParams.get("q") || "").match(/(\d{1,6})/);
  if (!m) return NextResponse.json({ items: [] });
  const n = String(parseInt(m[1], 10)).padStart(5, "0");
  const db = getSupabaseAdmin();
  const [r, t] = await Promise.all([
    db.from("requisitions").select("id, folio, cost_center_name, status, purchase_status, total").like("folio", `%-${n}`).limit(5),
    db.from("tareas_asignadas").select("id, folio, titulo, estatus, asignado_nombre").like("folio", `%-${n}`).limit(5),
  ]);
  const items = [
    ...((r.data || []) as { id: string; folio: string; cost_center_name: string | null; status: string | null; purchase_status: string | null }[]).map(x => ({
      tipo: x.purchase_status === "GASTO_EFECTIVO_PENDIENTE" ? "Pago de servicio" : "Requisición", folio: x.folio, titulo: x.cost_center_name || "", estado: x.status || "",
      href: `/dashboard/requisiciones/requisiciones/estatus?tab=todas&open=${x.id}` })),
    ...((t.data || []) as { id: string; folio: string; titulo: string; estatus: string | null; asignado_nombre: string | null }[]).map(x => ({
      tipo: "Tarea", folio: x.folio, titulo: `${x.titulo}${x.asignado_nombre ? ` · ${x.asignado_nombre}` : ""}`, estado: x.estatus || "",
      href: `/dashboard/actividades?abrir=${x.id}` })),
  ];
  return NextResponse.json({ items });
}
