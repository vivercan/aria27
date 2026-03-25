"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, HardHat, Search, BarChart3, AlertTriangle } from "lucide-react";

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
  const router = useRouter();
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
      (ocs || []).forEach((oc: any) => {
        const key = oc.obra_nombre || "Sin Obra";
        if (!obraMap[key]) obraMap[key] = { materiales: 0, mano_obra: 0, subcontratos: 0, indirectos: 0 };
        obraMap[key].materiales += oc.total || 0;
      });

      // Sumar gastos por obra y categoría
      (gastos || []).forEach((g: any) => {
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

      const result = (centers || []).map((c: any) => {
        const nombre = c.name || c.nombre;
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
    } catch (e) { console.error(e); }
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
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
        <div className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></div>
        <span className="text-sm font-medium">Regresar</span>
      </button>

      <div>
        <h1 className="text-2xl font-bold text-white">Costeo por Obra</h1>
        <p className="text-slate-400 text-sm">Presupuesto vs costo real — materiales, mano de obra, subcontratos e indirectos</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Presupuesto Total", value: `$${totalPresupuesto.toLocaleString()}`, icon: BarChart3, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Costo Real", value: `$${totalReal.toLocaleString()}`, icon: DollarSign, color: "text-violet-400", bg: "bg-violet-500/10" },
          { label: "Diferencia", value: `$${totalDiferencia.toLocaleString()}`, icon: totalDiferencia >= 0 ? TrendingUp : TrendingDown, color: totalDiferencia >= 0 ? "text-emerald-400" : "text-red-400", bg: totalDiferencia >= 0 ? "bg-emerald-500/10" : "bg-red-500/10" },
          { label: "Obras", value: obras.length, icon: HardHat, color: "text-amber-400", bg: "bg-amber-500/10" },
        ].map((s, i) => (
          <div key={i} className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-2`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
            <p className="text-xl font-bold text-white">{loading ? "..." : s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar obra..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none" />
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <tr className="text-slate-400 text-xs uppercase">
                <th className="text-left p-3">Obra</th>
                <th className="text-right p-3">Presupuesto</th>
                <th className="text-right p-3">Materiales</th>
                <th className="text-right p-3">Mano Obra</th>
                <th className="text-right p-3">Subcontratos</th>
                <th className="text-right p-3">Indirectos</th>
                <th className="text-right p-3">Costo Real</th>
                <th className="text-center p-3">% Avance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Sin datos de costeo</td></tr>
              ) : filtered.map(o => (
                <tr key={o.id} className={`border-t border-white/5 hover:bg-white/[0.02] ${o.porcentaje > 100 ? "bg-red-500/[0.03]" : ""}`}>
                  <td className="p-3 text-white font-medium">{o.obra}</td>
                  <td className="p-3 text-right text-slate-300">${o.presupuesto.toLocaleString()}</td>
                  <td className="p-3 text-right text-blue-400">${o.materiales.toLocaleString()}</td>
                  <td className="p-3 text-right text-violet-400">${o.mano_obra.toLocaleString()}</td>
                  <td className="p-3 text-right text-cyan-400">${o.subcontratos.toLocaleString()}</td>
                  <td className="p-3 text-right text-slate-400">${o.indirectos.toLocaleString()}</td>
                  <td className="p-3 text-right text-white font-medium">${o.total_real.toLocaleString()}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
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
      <div className="flex gap-6 text-xs text-slate-400">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Dentro de presupuesto</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /> Cerca del límite (&gt;85%)</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /> Sobrepasado</div>
      </div>
    </div>
  );
}
