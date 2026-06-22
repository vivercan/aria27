/**
 * /api/combustible/historial?obra_id=&desde=&hasta=&tipo=
 * GET -> resumen y detalle de cargas de combustible
 *
 * 04-Jun-2026
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOriginOrUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const __auth = await requireOriginOrUser(req);
    if (!__auth.ok) return __auth.res;
    const db = getSupabaseAdmin();
    const obraId = req.nextUrl.searchParams.get("obra_id");
    const desde = req.nextUrl.searchParams.get("desde");
    const hasta = req.nextUrl.searchParams.get("hasta");
    const tipo = req.nextUrl.searchParams.get("tipo");

    let q = db
      .from("combustible_cargas")
      .select(`
        id, requisition_id, equipo_id, equipo_alias_snapshot, tipo_combustible,
        litros_solicitados, litros_cargados_reales, precio_litro_estimado, total_estimado,
        horometro_lectura, horometro_foto_url, ticket_foto_url, notas, created_at,
        requisition:requisitions(id, folio, cost_center_id, cost_center_name, status, created_at),
        equipo:equipo_combustible(id, alias, tipo_combustible, numero_economico)
      `)
      .order("created_at", { ascending: false });

    if (tipo) q = q.eq("tipo_combustible", tipo);
    if (desde) q = q.gte("created_at", desde);
    if (hasta) q = q.lte("created_at", hasta);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Filtrar por obra (post-fetch porque viene en relacion)
    type CargaRow = {
      id: string;
      equipo_id: string;
      equipo_alias_snapshot: string;
      tipo_combustible: string;
      litros_solicitados: number;
      total_estimado: number | null;
      horometro_lectura: number | null;
      horometro_foto_url: string | null;
      created_at: string;
      requisition: { folio: string; cost_center_id: string | null; cost_center_name: string; status: string } | null;
      equipo: { id: string; alias: string } | null;
    };
    let rows = (data || []) as unknown as CargaRow[];
    if (obraId) {
      rows = rows.filter((r) => r.requisition?.cost_center_id === obraId);
    }

    // Resumen pivote por maquina x mes
    const pivoteMap = new Map<string, Record<string, number>>();
    const totalesMaq = new Map<string, { litros: number; cargas: number; tipo: string; foto?: string }>();
    for (const r of rows) {
      const mes = (r.created_at || "").slice(0, 7); // YYYY-MM
      const maqKey = r.equipo_alias_snapshot || "Sin alias";
      if (!pivoteMap.has(maqKey)) pivoteMap.set(maqKey, {});
      const meses = pivoteMap.get(maqKey)!;
      meses[mes] = (meses[mes] || 0) + Number(r.litros_solicitados || 0);

      const tot = totalesMaq.get(maqKey) || { litros: 0, cargas: 0, tipo: r.tipo_combustible };
      tot.litros += Number(r.litros_solicitados || 0);
      tot.cargas += 1;
      totalesMaq.set(maqKey, tot);
    }

    const pivote = Array.from(pivoteMap.entries()).map(([maq, meses]) => {
      const tot = totalesMaq.get(maq)!;
      return { maquina: maq, tipo: tot.tipo, total_litros: tot.litros, total_cargas: tot.cargas, meses };
    }).sort((a, b) => b.total_litros - a.total_litros);

    const totalLitros = rows.reduce((s, r) => s + Number(r.litros_solicitados || 0), 0);
    const totalMonto = rows.reduce((s, r) => s + Number(r.total_estimado || 0), 0);

    return NextResponse.json({
      resumen: {
        total_litros: totalLitros,
        total_monto: totalMonto,
        total_cargas: rows.length,
        maquinas_distintas: pivoteMap.size,
      },
      pivote,
      cargas: rows,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
