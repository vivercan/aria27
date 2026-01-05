"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { DollarSign, Search, Download, Calendar, Users, Filter, X, ArrowLeft, Loader2, FileSpreadsheet, TrendingUp } from "lucide-react";
import Link from "next/link";

interface NominaHist {
  id: string;
  semana: number;
  nombre: string;
  puesto: string;
  salario_mensual: number;
  salario_semanal: number;
  sueldo_total: number;
}

export default function NominaPage() {
  const [registros, setRegistros] = useState<NominaHist[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [filtros, setFiltros] = useState({ buscar: "", semana: "", empleado: "" });
  const [semanas, setSemanas] = useState<number[]>([]);
  const [empleados, setEmpleados] = useState<string[]>([]);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    setLoading(true);
    const { data } = await supabase.from("nomina_historico").select("*").order("semana", { ascending: false });
    if (data) {
      setRegistros(data);
      setSemanas([...new Set(data.map(r => r.semana).filter(Boolean))].sort((a,b) => b - a));
      setEmpleados([...new Set(data.map(r => r.nombre).filter(Boolean))].sort());
    }
    setLoading(false);
  };

  const registrosFiltrados = registros.filter(r => {
    if (filtros.buscar && !r.nombre?.toLowerCase().includes(filtros.buscar.toLowerCase()) && !r.puesto?.toLowerCase().includes(filtros.buscar.toLowerCase())) return false;
    if (filtros.semana && r.semana !== parseInt(filtros.semana)) return false;
    if (filtros.empleado && r.nombre !== filtros.empleado) return false;
    return true;
  });

  const totalFiltrado = registrosFiltrados.reduce((s, r) => s + (r.sueldo_total || 0), 0);
  const limpiarFiltros = () => setFiltros({ buscar: "", semana: "", empleado: "" });
  const formatMoney = (n: number) => `$${(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  const resumenSemanas = semanas.map(sem => {
    const regs = registros.filter(r => r.semana === sem);
    return { semana: sem, empleados: regs.length, total: regs.reduce((s, r) => s + (r.sueldo_total || 0), 0) };
  });

  const exportarExcel = async () => {
    setExportando(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "nomina", filtros: { semana: filtros.semana, empleado: filtros.empleado } })
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Nomina_ARIA_${new Date().toISOString().split("T")[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
    setExportando(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /><span className="ml-3 text-white/60">Cargando nómina...</span></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/talento" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-500/20">
            <DollarSign className="w-7 h-7 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Nómina Histórica</h1>
            <p className="text-slate-400 text-sm">{registros.length} registros | {empleados.length} empleados | {semanas.length} semanas</p>
          </div>
        </div>
        <button onClick={exportarExcel} disabled={exportando} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500/20 to-violet-500/20 border border-purple-500/30 text-purple-300 hover:from-purple-500/30 hover:to-violet-500/30 transition-all disabled:opacity-50">
          {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
          {exportando ? "Generando..." : "Exportar Excel"}
        </button>
      </div>

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
          <p className="text-2xl font-bold text-blue-400">{registrosFiltrados.length}</p>
        </div>
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-amber-500/20"><Users className="w-5 h-5 text-amber-400" /></div>
            <span className="text-slate-400 text-sm">Empleados</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">{empleados.length}</p>
        </div>
        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-500/20 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-purple-500/20"><Calendar className="w-5 h-5 text-purple-400" /></div>
            <span className="text-slate-400 text-sm">Semanas</span>
          </div>
          <p className="text-2xl font-bold text-purple-400">{semanas.length}</p>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" placeholder="Buscar nombre, puesto..." value={filtros.buscar} onChange={e => setFiltros({...filtros, buscar: e.target.value})} className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:border-purple-500/50 focus:outline-none transition-all" />
          </div>
          <select value={filtros.semana} onChange={e => setFiltros({...filtros, semana: e.target.value})} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:border-purple-500/50 focus:outline-none">
            <option value="">📅 Todas las semanas</option>
            {semanas.map(s => <option key={s} value={s}>Semana {s}</option>)}
          </select>
          <select value={filtros.empleado} onChange={e => setFiltros({...filtros, empleado: e.target.value})} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:border-purple-500/50 focus:outline-none">
            <option value="">👤 Todos los empleados</option>
            {empleados.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <button onClick={limpiarFiltros} className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all" title="Limpiar filtros">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />Detalle por Empleado
          </h2>
          <div className="max-h-[450px] overflow-y-auto rounded-xl">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-800/90 backdrop-blur-sm">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider rounded-tl-lg">Sem</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Puesto</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Sal. Semanal</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider rounded-tr-lg">Sueldo Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {registrosFiltrados.slice(0, 150).map((r, idx) => (
                  <tr key={r.id} className={`${idx % 2 === 0 ? 'bg-white/[0.01]' : 'bg-white/[0.03]'} hover:bg-white/[0.06] transition-colors`}>
                    <td className="px-4 py-3"><span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-medium">{r.semana}</span></td>
                    <td className="px-4 py-3 text-white">{r.nombre || "—"}</td>
                    <td className="px-4 py-3"><span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-medium">{r.puesto || "—"}</span></td>
                    <td className="px-4 py-3 text-right text-slate-400">{formatMoney(r.salario_semanal)}</td>
                    <td className="px-4 py-3 text-right"><span className="font-semibold text-emerald-400">{formatMoney(r.sueldo_total)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {registrosFiltrados.length > 150 && <p className="text-center text-slate-500 text-xs mt-4 py-2 bg-white/5 rounded-lg">Mostrando 150 de {registrosFiltrados.length}</p>}
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />Resumen por Semana
          </h2>
          <div className="space-y-3 max-h-[450px] overflow-y-auto">
            {resumenSemanas.map(s => (
              <div key={s.semana} className="p-4 rounded-xl bg-gradient-to-r from-white/[0.03] to-transparent border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer" onClick={() => setFiltros({...filtros, semana: s.semana.toString()})}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-purple-400">{s.semana}</span>
                    <span className="text-xs text-slate-400 bg-white/5 px-2 py-1 rounded">{s.empleados} emp</span>
                  </div>
                  <span className="text-emerald-400 font-bold">{formatMoney(s.total)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all" style={{width: `${Math.min((s.total / (resumenSemanas[0]?.total || 1)) * 100, 100)}%`}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
