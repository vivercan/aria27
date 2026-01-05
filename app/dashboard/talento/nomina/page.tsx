"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { DollarSign, Search, Download, Calendar, Users, Filter, X, ArrowLeft, Loader2 } from "lucide-react";
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

  const exportarCSV = () => {
    let csv = "\uFEFF";
    csv += "Semana,Nombre,Puesto,Salario Mensual,Salario Semanal,Sueldo Total\n";
    registrosFiltrados.forEach(r => {
      csv += `${r.semana || ""},"${r.nombre || ""}","${r.puesto || ""}",${r.salario_mensual || 0},${r.salario_semanal || 0},${r.sueldo_total || 0}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Nomina_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  // Agrupar por semana para resumen
  const resumenSemanas = semanas.map(sem => {
    const regs = registros.filter(r => r.semana === sem);
    return { semana: sem, empleados: regs.length, total: regs.reduce((s, r) => s + (r.sueldo_total || 0), 0) };
  });

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/talento" className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft className="w-5 h-5 text-slate-400" /></Link>
          <div className="p-3 rounded-xl bg-emerald-500/20"><DollarSign className="w-6 h-6 text-emerald-400" /></div>
          <div><h1 className="text-2xl font-bold text-white">Nómina Histórica</h1><p className="text-slate-400 text-sm">{registros.length} registros | {empleados.length} empleados | {semanas.length} semanas</p></div>
        </div>
        <button onClick={exportarCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"><Download className="w-4 h-4" />Exportar</button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"><div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-emerald-400" /><span className="text-slate-400 text-xs">Total Filtrado</span></div><p className="text-xl font-bold text-white">{formatMoney(totalFiltrado)}</p></div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"><div className="flex items-center gap-2 mb-2"><Filter className="w-4 h-4 text-blue-400" /><span className="text-slate-400 text-xs">Registros</span></div><p className="text-xl font-bold text-blue-400">{registrosFiltrados.length}</p></div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"><div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-amber-400" /><span className="text-slate-400 text-xs">Empleados</span></div><p className="text-xl font-bold text-amber-400">{empleados.length}</p></div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"><div className="flex items-center gap-2 mb-2"><Calendar className="w-4 h-4 text-purple-400" /><span className="text-slate-400 text-xs">Semanas</span></div><p className="text-xl font-bold text-purple-400">{semanas.length}</p></div>
      </div>

      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Buscar nombre, puesto..." value={filtros.buscar} onChange={e => setFiltros({...filtros, buscar: e.target.value})} className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white" /></div>
          <select value={filtros.semana} onChange={e => setFiltros({...filtros, semana: e.target.value})} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white"><option value="">Todas las semanas</option>{semanas.map(s => <option key={s} value={s}>Semana {s}</option>)}</select>
          <select value={filtros.empleado} onChange={e => setFiltros({...filtros, empleado: e.target.value})} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white"><option value="">Todos los empleados</option>{empleados.map(e => <option key={e} value={e}>{e}</option>)}</select>
          <button onClick={limpiarFiltros} className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"><X className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <h2 className="text-lg font-semibold text-white mb-4">Detalle por Empleado</h2>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#0a1628] z-10">
                <tr className="border-b border-white/10 text-left text-xs text-slate-400">
                  <th className="px-3 py-2">Sem</th><th className="px-3 py-2">Nombre</th><th className="px-3 py-2">Puesto</th><th className="px-3 py-2 text-right">Sal. Semanal</th><th className="px-3 py-2 text-right">Sueldo Total</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.slice(0, 150).map(r => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-3 py-2 text-purple-400 font-mono text-xs">{r.semana}</td>
                    <td className="px-3 py-2 text-white text-xs">{r.nombre || "—"}</td>
                    <td className="px-3 py-2"><span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs">{r.puesto || "—"}</span></td>
                    <td className="px-3 py-2 text-right text-slate-400 text-xs">{formatMoney(r.salario_semanal)}</td>
                    <td className="px-3 py-2 text-right font-medium text-emerald-400">{formatMoney(r.sueldo_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <h2 className="text-lg font-semibold text-white mb-4">Resumen por Semana</h2>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {resumenSemanas.map(s => (
              <div key={s.semana} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer" onClick={() => setFiltros({...filtros, semana: s.semana.toString()})}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-purple-400">{s.semana}</span>
                  <span className="text-xs text-slate-400">{s.empleados} emp</span>
                </div>
                <span className="text-emerald-400 font-bold">{formatMoney(s.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
