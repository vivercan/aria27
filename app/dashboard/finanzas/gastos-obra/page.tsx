"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { DollarSign, Search, Download, Calendar, Building2, Filter, X, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

interface Gasto {
  id: string;
  fecha: string;
  semana: number;
  obra: string;
  solicitante: string;
  descripcion: string;
  proveedor: string;
  monto: number;
  estatus: string;
}

export default function GastosObraPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ buscar: "", obra: "", semana: "", fechaInicio: "", fechaFin: "" });
  const [obras, setObras] = useState<string[]>([]);
  const [semanas, setSemanas] = useState<number[]>([]);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    setLoading(true);
    const { data } = await supabase.from("gastos").select("*").order("fecha", { ascending: false });
    if (data) {
      setGastos(data);
      setObras([...new Set(data.map(g => g.obra).filter(Boolean))].sort());
      setSemanas([...new Set(data.map(g => g.semana).filter(Boolean))].sort((a,b) => b - a));
    }
    setLoading(false);
  };

  const gastosFiltrados = gastos.filter(g => {
    if (filtros.buscar && !g.descripcion?.toLowerCase().includes(filtros.buscar.toLowerCase()) && !g.solicitante?.toLowerCase().includes(filtros.buscar.toLowerCase()) && !g.proveedor?.toLowerCase().includes(filtros.buscar.toLowerCase())) return false;
    if (filtros.obra && g.obra !== filtros.obra) return false;
    if (filtros.semana && g.semana !== parseInt(filtros.semana)) return false;
    if (filtros.fechaInicio && g.fecha < filtros.fechaInicio) return false;
    if (filtros.fechaFin && g.fecha > filtros.fechaFin) return false;
    return true;
  });

  const totalFiltrado = gastosFiltrados.reduce((s, g) => s + (g.monto || 0), 0);
  const limpiarFiltros = () => setFiltros({ buscar: "", obra: "", semana: "", fechaInicio: "", fechaFin: "" });
  const formatMoney = (n: number) => `$${(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  const exportarCSV = () => {
    let csv = "\uFEFF";
    csv += "Fecha,Semana,Obra,Solicitante,Descripcion,Proveedor,Monto\n";
    gastosFiltrados.forEach(g => {
      csv += `${g.fecha || ""},${g.semana || ""},"${g.obra || ""}","${g.solicitante || ""}","${g.descripcion || ""}","${g.proveedor || ""}",${g.monto || 0}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Gastos_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/finanzas" className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft className="w-5 h-5 text-slate-400" /></Link>
          <div className="p-3 rounded-xl bg-emerald-500/20"><DollarSign className="w-6 h-6 text-emerald-400" /></div>
          <div><h1 className="text-2xl font-bold text-white">Gastos de Obra</h1><p className="text-slate-400 text-sm">{gastos.length} registros históricos</p></div>
        </div>
        <button onClick={exportarCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"><Download className="w-4 h-4" />Exportar</button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"><div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-emerald-400" /><span className="text-slate-400 text-xs">Total Filtrado</span></div><p className="text-xl font-bold text-white">{formatMoney(totalFiltrado)}</p></div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"><div className="flex items-center gap-2 mb-2"><Filter className="w-4 h-4 text-blue-400" /><span className="text-slate-400 text-xs">Registros</span></div><p className="text-xl font-bold text-blue-400">{gastosFiltrados.length}</p></div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"><div className="flex items-center gap-2 mb-2"><Building2 className="w-4 h-4 text-amber-400" /><span className="text-slate-400 text-xs">Obras</span></div><p className="text-xl font-bold text-amber-400">{[...new Set(gastosFiltrados.map(g => g.obra))].length}</p></div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"><div className="flex items-center gap-2 mb-2"><Calendar className="w-4 h-4 text-purple-400" /><span className="text-slate-400 text-xs">Semanas</span></div><p className="text-xl font-bold text-purple-400">{[...new Set(gastosFiltrados.map(g => g.semana))].length}</p></div>
      </div>

      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Buscar descripción, solicitante, proveedor..." value={filtros.buscar} onChange={e => setFiltros({...filtros, buscar: e.target.value})} className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white" /></div>
          <select value={filtros.obra} onChange={e => setFiltros({...filtros, obra: e.target.value})} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white"><option value="">Todas las obras</option>{obras.map(o => <option key={o} value={o}>{o}</option>)}</select>
          <select value={filtros.semana} onChange={e => setFiltros({...filtros, semana: e.target.value})} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white"><option value="">Todas las semanas</option>{semanas.map(s => <option key={s} value={s}>Semana {s}</option>)}</select>
          <input type="date" value={filtros.fechaInicio} onChange={e => setFiltros({...filtros, fechaInicio: e.target.value})} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white" />
          <input type="date" value={filtros.fechaFin} onChange={e => setFiltros({...filtros, fechaFin: e.target.value})} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white" />
          <button onClick={limpiarFiltros} className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"><X className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#0a1628] z-10">
              <tr className="border-b border-white/10 text-left text-xs text-slate-400">
                <th className="px-3 py-2">Fecha</th><th className="px-3 py-2">Sem</th><th className="px-3 py-2">Obra</th><th className="px-3 py-2">Solicitante</th><th className="px-3 py-2">Descripción</th><th className="px-3 py-2">Proveedor</th><th className="px-3 py-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {gastosFiltrados.slice(0, 200).map(g => (
                <tr key={g.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-3 py-2 text-slate-300 text-xs">{g.fecha || "—"}</td>
                  <td className="px-3 py-2 text-purple-400 font-mono text-xs">{g.semana || "—"}</td>
                  <td className="px-3 py-2"><span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs">{g.obra || "—"}</span></td>
                  <td className="px-3 py-2 text-slate-300 text-xs truncate max-w-[120px]">{g.solicitante || "—"}</td>
                  <td className="px-3 py-2 text-white text-xs truncate max-w-[200px]">{g.descripcion || "—"}</td>
                  <td className="px-3 py-2 text-slate-400 text-xs truncate max-w-[120px]">{g.proveedor || "—"}</td>
                  <td className="px-3 py-2 text-right font-medium text-emerald-400">{formatMoney(g.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {gastosFiltrados.length > 200 && <p className="text-center text-slate-500 text-xs mt-4">Mostrando 200 de {gastosFiltrados.length}</p>}
        </div>
      </div>
    </div>
  );
}
