"use client";
import { clientLogger } from "@/lib/client-logger";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { DollarSign, TrendingUp, TrendingDown, HardHat, Search, BarChart3, AlertTriangle, Loader2 } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";

interface CentroDeTrabajo {
  id: string;
  code?: string;
  codigo?: string;
  name?: string;
  nombre?: string;
  active?: boolean;
  activo?: boolean;
  budget?: number;
  presupuesto?: number;
  client?: string;
  cliente?: string;
  status?: string;
  estado?: string;
  start_date?: string;
  fecha_inicio?: string;
  end_date?: string;
  fecha_fin?: string;
  description?: string;
  descripcion?: string;
  location?: string;
  direccion?: string;
}

interface PurchaseOrderRow {
  obra_nombre?: string;
  total?: number;
  categoria?: string;
  monto_pagado?: number;
}

interface GastoRow {
  obra?: string;
  monto?: number;
  categoria?: string;
}

interface CosteoObra {
  id: string;
  obra: string;
  presupuesto: number;
  materiales: number;
  mano_obra: number;
  subcontratos: number;
  indirectos: number;
  total_real: number;
  diferencia: number;
  porcentaje: number;
}

export default function CosteoPage() {
  const log = clientLogger("COSTEO");
  const [obras, setObras] = useState<CosteoObra[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      // Cargar centros de costo (obras)
      const { data: centers } = await supabase.from("centros_trabajo").select("id, code:codigo, name:nombre, active:activo, budget:presupuesto, client:cliente, status:estado, start_date:fecha_inicio, end_date:fecha_fin, description:descripcion, location:direccion");

      // Cargar OCs para calcular costos reales por obra
      const { data: ocs } = await supabase.from("purchase_orders").select("obra_nombre, total, categoria");

      // Cargar gastos de obra
      const { data: gastos } = await supabase.from("gastos").select("obra, monto, categoria");

      const obraMap: Record<string, { materiales: number; mano_obra: number; subcontratos: number; indirectos: number }> = {};

      // Sumar OCs por obra
      (ocs || []).forEach((oc: PurchaseOrderRow) => {
        const key = oc.obra_nombre || "Sin Obra";
        if (!obraMap[key]) obraMap[key] = { materiales: 0, mano_obra: 0, subcontratos: 0, indirectos: 0 };
        obraMap[key].materiales += oc.total || 0;
      });

      // Sumar gastos por obra y categoría
      (gastos || []).forEach((g: GastoRow) => {
        const key = g.obra || "Sin Obra";
        if (!obraMap[key]) obraMap[key] = { materiales: 0, mano_obra: 0, subcontratos: 0, indirectos: 0 };
        const cat = (g.categoria || "").toLowerCase();
        if (cat.includes("mano") || cat.includes("salario") || cat.includes("nomina")) {
          obraMap[key].mano_obra += g.monto || 0;
        } else if (cat.includes("sub")) {
          obraMap[key].subcontratos += g.monto || 0;
        } else if (cat.includes("indirect") || cat.includes("admin")) {
          obraMap[key].indirectos += g.monto || 0;
        } else {
          obraMap[key].materiales += g.monto || 0;
        }
      });

      const result = (centers || []).map((c: CentroDeTrabajo) => {
        const nombre = c.name || c.nombre || "Sin nombre";
        const costos = obraMap[nombre] || { materiales: 0, mano_obra: 0, subcontratos: 0, indirectos: 0 };
        const presupuesto = c.presupuesto || c.budget || 0;
        const totalReal = costos.materiales + costos.mano_obra + costos.subcontratos + costos.indirectos;
        const diferencia = presupuesto - totalReal;
        const porcentaje = presupuesto > 0 ? (totalReal / presupuesto) * 100 : 0;

        return {
          id: c.id,
          obra: nombre,
          presupuesto,
          ...costos,
          total_real: totalReal,
          diferencia,
          porcentaje,
        };
      });

      setObras(result);
    } catch (e: unknown) { log.error(String(e)); }
    finally { setLoading(false); }
  }

  const totalPresupuesto = obras.reduce((s, o) => s + o.presupuesto, 0);
  const totalReal = obras.reduce((s, o) => s + o.total_real, 0);
  const totalDiferencia = totalPresupuesto - totalReal;

  const filtered = obras.filter(o => !search || o.obra?.toLowerCase().includes(search.toLowerCase()));

  const getStatusColor = (porcentaje: number) => {
    if (porcentaje > 100) return "text-red-400";
    if (porcentaje > 85) return "text-amber-400";
    return "text-emerald-400";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="sticky top-0 z-10 bg-gradient-to-b from-slate-950 via-slate-950/95 to-transparent pb-4">
        <AriaBackButton href="/dashboard/finanzas" />

        <div className="mt-4">
          <h1 className="text-2xl font-bold text-white">Costeo por Obra</h1>
          <p className="text-[#7f93b0] text-sm">Presupuesto vs costo real — materiales, mano de obra, subcontratos e indirectos</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Presupuesto Total", value: `$${totalPresupuesto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, icon: BarChart3, color: "text-aria-accent", bg: "bg-aria-primary/10" },
          { label: "Costo Real", value: `$${totalReal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-violet-400", bg: "bg-violet-500/10" },
          { label: "Diferencia", value: `$${totalDiferencia.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, icon: totalDiferencia >= 0 ? TrendingUp : TrendingDown, color: totalDiferencia >= 0 ? "text-emerald-400" : "text-red-400", bg: totalDiferencia >= 0 ? "bg-emerald-500/10" : "bg-red-500/10" },
          { label: "Obras", value: obras.length, icon: HardHat, color: "text-amber-400", bg: "bg-amber-500/10" },
        ].map((s, i) => (
          <div key={i} className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-2`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
            <p className="text-xl font-bold text-white">{loading ? "..." : s.value}</p>
            <p className="text-xs text-[#7f93b0]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7f93b0]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar obra..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-[#4a6080] focus:border-aria-primary/50 focus:outline-none" />
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[rgba(4,8,16,0.98)] backdrop-blur z-10">
              <tr className="text-[#7f93b0] text-xs uppercase">
                <th className="text-left p-3">Obra</th>
                <th className="text-right p-3">Presupuesto</th>
                <th className="text-right p-3">Materiales</th>
                <th className="text-right p-3">Mano Obra</th>
                <th className="text-right p-3">Subcontratos</th>
                <th className="text-right p-3">Indirectos</th>
                <th className="text-right p-3">Costo Real</th>
                <th className="text-right p-3">Diferencia</th>
                <th className="text-center p-3">% Avance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="p-8 text-center text-[#7f93b0]"><Loader2 className="w-6 h-6 animate-spin text-aria-accent mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-[#7f93b0]">Sin datos de costeo</td></tr>
              ) : filtered.map(o => (
                <tr key={o.id} className={`border-t border-white/[0.05] hover:bg-white/[0.02] ${o.porcentaje > 100 ? "bg-red-500/[0.03]" : ""}`}>
                  <td className="p-3 text-white font-medium">{o.obra}</td>
                  <td className="p-3 text-right text-[#c9d8ed]">${o.presupuesto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 text-right text-aria-accent">${o.materiales.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 text-right text-violet-400">${o.mano_obra.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 text-right text-aria-accent">${o.subcontratos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 text-right text-[#7f93b0]">${o.indirectos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 text-right text-white font-medium">${o.total_real.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                  <td className={`p-3 text-right font-medium ${o.diferencia >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {o.diferencia >= 0 ? "+" : "-"}${Math.abs(o.diferencia).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${o.porcentaje > 100 ? "bg-red-500" : o.porcentaje > 85 ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${Math.min(o.porcentaje, 100)}%` }} />
                      </div>
                      <span className={`text-xs font-medium ${getStatusColor(o.porcentaje)}`}>{o.porcentaje.toFixed(0)}%</span>
                      {o.porcentaje > 100 && <AlertTriangle className="w-3 h-3 text-red-400" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex gap-6 text-xs text-[#7f93b0]">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Dentro de presupuesto</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /> Cerca del límite (&gt;85%)</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /> Sobrepasado</div>
      </div>
    </div>
  );
}
