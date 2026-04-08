"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, HardHat, Package, TrendingUp, AlertTriangle, Loader2 } from "lucide-react";

const fmt = (n: number) => `$${(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

interface ObraCard {
  nombre: string;
  presupuesto: number;
  gastoOC: number;
  avance: number;
  pctFisico: number | null;
  ultimaBitacora: string | null;
  reqsPendientes: number;
}

export default function PanelObras() {
  const [loading, setLoading] = useState(true);
  const [obras, setObras] = useState<ObraCard[]>([]);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const { data: ct } = await supabase.from("centros_trabajo").select("nombre,presupuesto,estado").eq("estado", "ACTIVA").order("nombre");
    const nombres = (ct || []).map((c: any) => c.nombre);

    const out: ObraCard[] = [];
    for (const nom of nombres) {
      const ppto = (ct || []).find((c: any) => c.nombre === nom)?.presupuesto || 0;

      const { data: rqs } = await supabase.from("requisitions").select("id,status").eq("cost_center_name", nom);
      const reqIds = (rqs || []).map((r: any) => r.id);
      const reqsPendientes = (rqs || []).filter((r: any) => r.status === "PENDIENTE").length;

      let gastoOC = 0;
      if (reqIds.length > 0) {
        const { data: pos } = await supabase.from("purchase_orders").select("total,status").in("requisition_id", reqIds).neq("status", "CANCELADA");
        gastoOC = (pos || []).reduce((s: number, p: any) => s + (Number(p.total) || 0), 0);
      }

      const { data: av } = await supabase.from("obra_avances").select("pct_fisico,semana_iso").eq("obra_nombre", nom).order("semana_iso", { ascending: false }).limit(1);
      const pctFisico = av && av[0] ? Number(av[0].pct_fisico) : null;

      const { data: bit } = await supabase.from("obra_bitacora").select("fecha").eq("obra_nombre", nom).order("fecha", { ascending: false }).limit(1);
      const ultimaBitacora = bit && bit[0] ? bit[0].fecha : null;

      const avance = ppto > 0 ? (gastoOC / ppto) * 100 : 0;
      out.push({ nombre: nom, presupuesto: ppto, gastoOC, avance, pctFisico, ultimaBitacora, reqsPendientes });
    }
    setObras(out);
    setLoading(false);
  }

  const totalPpto = obras.reduce((s, o) => s + o.presupuesto, 0);
  const totalGasto = obras.reduce((s, o) => s + o.gastoOC, 0);
  const totalReqs = obras.reduce((s, o) => s + o.reqsPendientes, 0);

  return (
    <div className="h-full flex flex-col overflow-hidden p-6">
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <Link href="/dashboard/obras" className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft className="w-5 h-5 text-white" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><HardHat className="w-6 h-6 text-amber-400" /> Panel Obras</h1>
          <p className="text-sm text-slate-400">Vista operativa del jefe de obra · presupuesto, avance y pendientes</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 flex-shrink-0">
        <KPI label="Obras activas" value={String(obras.length)} color="cyan" />
        <KPI label="Presupuesto total" value={fmt(totalPpto)} color="blue" />
        <KPI label="Gasto OC total" value={fmt(totalGasto)} color="orange" />
        <KPI label="Reqs pendientes" value={String(totalReqs)} color="amber" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div> :
        obras.length === 0 ? <div className="text-center py-12 text-slate-500">Sin obras activas</div> :
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {obras.map(o => {
            const delta = o.pctFisico !== null ? o.pctFisico - o.avance : null;
            const sem = o.avance > 100 ? "red" : o.avance >= 90 ? "red" : o.avance >= 70 ? "amber" : "emerald";
            const bitDias = o.ultimaBitacora ? Math.floor((Date.now() - new Date(o.ultimaBitacora).getTime()) / 86400000) : null;
            return (
              <Link key={o.nombre} href={`/dashboard/obras/reporte?obra=${encodeURIComponent(o.nombre)}`}
                className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition block">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold truncate">{o.nombre}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs bg-${sem}-500/20 text-${sem}-300`}>{o.avance.toFixed(0)}%</span>
                </div>
                <div className="space-y-1 text-xs text-slate-400">
                  <div>Ppto: <span className="text-white">{fmt(o.presupuesto)}</span></div>
                  <div>Gasto OC: <span className="text-orange-300">{fmt(o.gastoOC)}</span></div>
                  {o.pctFisico !== null && (
                    <div>Avance físico: <span className="text-white">{o.pctFisico.toFixed(1)}%</span> {delta !== null && <span className={delta >= 0 ? "text-emerald-400" : "text-red-400"}>(Δ {delta >= 0 ? "+" : ""}{delta.toFixed(1)}%)</span>}</div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    {o.reqsPendientes > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">{o.reqsPendientes} req pend</span>}
                    {bitDias !== null && bitDias > 3 && <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px]">Bitácora hace {bitDias}d</span>}
                    {bitDias === null && <span className="px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-400 text-[10px]">Sin bitácora</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>}
      </div>
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`p-3 rounded-lg bg-${color}-500/10 border border-${color}-500/20`}>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-xl font-bold text-${color}-300`}>{value}</p>
    </div>
  );
}
