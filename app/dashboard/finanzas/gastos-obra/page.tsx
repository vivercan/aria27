"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { DollarSign, Search, Download, Calendar, Building2, Filter, X, ArrowLeft, Loader2, TrendingUp } from "lucide-react";
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

  // Resumen por obra
  const resumenObras = Object.entries(gastosFiltrados.reduce((acc, g) => {
    const obra = g.obra || "Sin asignar";
    acc[obra] = (acc[obra] || 0) + (g.monto || 0);
    return acc;
  }, {} as Record<string, number>)).map(([nombre, total]) => ({ nombre, total })).sort((a, b) => b.total - a.total).slice(0, 6);

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

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /><span className="ml-3 text-white/60">Cargando gastos...</span></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/finanzas" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/20">
            <DollarSign className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Gastos de Obra</h1>
            <p className="text-slate-400 text-sm">{gastos.length} registros históricos cargados</p>
          </div>
        </div>
        <button onClick={exportarCSV} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-500/30 text-emerald-300 hover:from-emerald-500/30 hover:to-green-500/30 transition-all">
          <Download className="w-4 h-4" />Exportar CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-500/20 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-emerald-500/20"><DollarSign className="w-5 h-5 text-emerald-400" /></div>
            <span className="text-slate-400 text-sm">Total Filtrado</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatMoney(totalFiltrado)}</p>
        </div>
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-blue-500/20"><Filter className="w-5 h-5 text-blue-400" /></div>
            <span className="text-slate-400 text-sm">Registros</span>
          </div>
          <p className="text-2xl font-bold text-blue-400">{gastosFiltrados.length}</p>
        </div>
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-amber-500/20"><Building2 className="w-5 h-5 text-amber-400" /></div>
            <span className="text-slate-400 text-sm">Obras</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">{[...new Set(gastosFiltrados.map(g => g.obra))].length}</p>
        </div>
        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-500/20 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-purple-500/20"><Calendar className="w-5 h-5 text-purple-400" /></div>
            <span className="text-slate-400 text-sm">Semanas</span>
          </div>
          <p className="text-2xl font-bold text-purple-400">{[...new Set(gastosFiltrados.map(g => g.semana))].length}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" placeholder="Buscar descripción, solicitante, proveedor..." value={filtros.buscar} onChange={e => setFiltros({...filtros, buscar: e.target.value})} className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none transition-all" />
          </div>
          <select value={filtros.obra} onChange={e => setFiltros({...filtros, obra: e.target.value})} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:border-emerald-500/50 focus:outline-none">
            <option value="">🏗️ Todas las obras</option>
            {obras.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={filtros.semana} onChange={e => setFiltros({...filtros, semana: e.target.value})} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:border-emerald-500/50 focus:outline-none">
            <option value="">📅 Todas las semanas</option>
            {semanas.map(s => <option key={s} value={s}>Semana {s}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <input type="date" value={filtros.fechaInicio} onChange={e => setFiltros({...filtros, fechaInicio: e.target.value})} className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:border-emerald-500/50 focus:outline-none" />
            <span className="text-slate-500">→</span>
            <input type="date" value={filtros.fechaFin} onChange={e => setFiltros({...filtros, fechaFin: e.target.value})} className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:border-emerald-500/50 focus:outline-none" />
          </div>
          <button onClick={limpiarFiltros} className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all" title="Limpiar filtros">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Tabla principal */}
        <div className="col-span-2 p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Detalle de Gastos
          </h2>
          <div className="max-h-[450px] overflow-y-auto rounded-xl">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-800/90 backdrop-blur-sm">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider rounded-tl-lg">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Sem</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Obra</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Descripción</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Proveedor</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider rounded-tr-lg">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {gastosFiltrados.slice(0, 150).map((g, idx) => (
                  <tr key={g.id} className={`${idx % 2 === 0 ? 'bg-white/[0.01]' : 'bg-white/[0.03]'} hover:bg-white/[0.06] transition-colors`}>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{g.fecha || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-medium">{g.semana || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-medium truncate max-w-[120px] block">{g.obra || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-white truncate max-w-[200px]">{g.descripcion || "—"}</td>
                    <td className="px-4 py-3 text-slate-400 truncate max-w-[120px]">{g.proveedor || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-emerald-400">{formatMoney(g.monto)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {gastosFiltrados.length > 150 && <p className="text-center text-slate-500 text-xs mt-4 py-2 bg-white/5 rounded-lg">Mostrando 150 de {gastosFiltrados.length} registros</p>}
        </div>

        {/* Resumen por Obra */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            Top Obras
          </h2>
          <div className="space-y-3">
            {resumenObras.map((o, i) => (
              <div key={i} className="p-4 rounded-xl bg-gradient-to-r from-white/[0.03] to-transparent border border-white/5 hover:border-white/10 transition-all cursor-pointer" onClick={() => setFiltros({...filtros, obra: o.nombre})}>
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm font-medium text-white truncate flex-1">{o.nombre}</p>
                  <span className="text-emerald-400 font-bold">{formatMoney(o.total)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all" style={{width: `${Math.min((o.total / (resumenObras[0]?.total || 1)) * 100, 100)}%`}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
