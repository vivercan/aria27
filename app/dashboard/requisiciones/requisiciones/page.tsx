"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { FilePlus, ListChecks, ShieldCheck, ShoppingCart, ClipboardList, ArrowLeft, Search, Download, Calendar, Building2, Filter, X, Loader2, History, FileSpreadsheet, TrendingUp } from "lucide-react";

interface ReqHist {
  id: string;
  folio_excel: string;
  fecha: string;
  solicitante: string;
  obra: string;
  proveedor: string;
  descripcion: string;
  monto: number;
  status: string;
}

const submodules = [
  { title: "Nueva Requisición", description: "Crear solicitud", icon: FilePlus, href: "/dashboard/requisiciones/requisiciones/nuevo", color: "from-emerald-500 to-emerald-600" },
  { title: "Estatus", description: "Monitor de solicitudes", icon: ListChecks, href: "/dashboard/requisiciones/requisiciones/estatus", color: "from-aria-primary to-aria-primary" },
  { title: "Autorizar", description: "Aprobar pendientes", icon: ShieldCheck, href: "/dashboard/requisiciones/requisiciones/autorizar", color: "from-amber-500 to-amber-600" },
  { title: "Compras", description: "Cotizaciones", icon: ShoppingCart, href: "/dashboard/requisiciones/requisiciones/tramite", color: "from-purple-500 to-purple-600" },
  { title: "Órdenes de Compra", description: "OC autorizadas", icon: ClipboardList, href: "/dashboard/requisiciones/requisiciones/ordenes", color: "from-cyan-500 to-cyan-600" },
];

export default function RequisicionesPage() {
  const [registros, setRegistros] = useState<ReqHist[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [filtros, setFiltros] = useState({ buscar: "", obra: "", status: "", solicitante: "", fechaInicio: "", fechaFin: "", mes: "" });
  const [obras, setObras] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [solicitantes, setSolicitantes] = useState<string[]>([]);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    setLoading(true);
    const { data } = await supabase.from("requisiciones_historico").select("*").order("fecha", { ascending: false });
    if (data) {
      setRegistros(data);
      setObras([...new Set(data.map(r => r.obra).filter(Boolean))].sort());
      setStatuses([...new Set(data.map(r => r.status).filter(Boolean))].sort());
      setSolicitantes([...new Set(data.map(r => r.solicitante).filter(Boolean))].sort());
    }
    setLoading(false);
  };

  const registrosFiltrados = registros.filter(r => {
    if (filtros.buscar && !r.descripcion?.toLowerCase().includes(filtros.buscar.toLowerCase()) && !r.proveedor?.toLowerCase().includes(filtros.buscar.toLowerCase())) return false;
    if (filtros.obra && r.obra !== filtros.obra) return false;
    if (filtros.status && r.status !== filtros.status) return false;
    if (filtros.solicitante && r.solicitante !== filtros.solicitante) return false;
    if (filtros.fechaInicio && r.fecha < filtros.fechaInicio) return false;
    if (filtros.fechaFin && r.fecha > filtros.fechaFin) return false;
    if (filtros.mes && r.fecha && !r.fecha.startsWith(filtros.mes)) return false;
    return true;
  });

  const totalFiltrado = registrosFiltrados.reduce((s, r) => s + (r.monto || 0), 0);
  const limpiarFiltros = () => setFiltros({ buscar: "", obra: "", status: "", solicitante: "", fechaInicio: "", fechaFin: "", mes: "" });
  const formatMoney = (n: number) => `$${(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  const exportarExcel = async () => {
    setExportando(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "requisiciones", filtros: { obra: filtros.obra, status: filtros.status, solicitante: filtros.solicitante, fechaInicio: filtros.fechaInicio, fechaFin: filtros.fechaFin } })
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Requisiciones_ARIA_${new Date().toISOString().split("T")[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
    setExportando(false);
  };

  const statusColor = (s: string) => {
    if (s?.includes("TERMINADO")) return "bg-emerald-500/20 text-emerald-400";
    if (s?.includes("FALTANTE")) return "bg-amber-500/20 text-amber-400";
    if (s?.includes("COTIZACION")) return "bg-aria-primary-light text-aria-accent";
    if (s?.includes("CANCELADA")) return "bg-red-500/20 text-red-400";
    return "bg-slate-500/20 text-slate-400";
  };

  const meses = [...new Set(registros.map(r => r.fecha?.substring(0,7)).filter(Boolean))].sort().reverse();

  // Resumen por obra
  const resumenObras = Object.entries(registrosFiltrados.reduce((acc, r) => {
    const obra = r.obra || "Sin asignar";
    acc[obra] = (acc[obra] || 0) + (r.monto || 0);
    return acc;
  }, {} as Record<string, number>)).map(([nombre, total]) => ({ nombre, total })).sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/requisiciones" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20">
            <ClipboardList className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Requisiciones</h1>
            <p className="text-slate-400 text-sm">Gestión de solicitudes de materiales</p>
          </div>
        </div>
        <button onClick={() => setMostrarHistorico(!mostrarHistorico)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm transition-all ${mostrarHistorico ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25" : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"}`}>
          <History className="w-4 h-4" />{mostrarHistorico ? "Ocultar Histórico" : `Ver Histórico (${registros.length})`}
        </button>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-5 gap-4">
        {submodules.map((mod, idx) => (
          <Link key={idx} href={mod.href} className="group block">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-white/20 hover:bg-white/[0.05] transition-all">
              <div className={`absolute inset-0 bg-gradient-to-br ${mod.color} opacity-0 group-hover:opacity-10 transition-all duration-300`} />
              <mod.icon className="w-8 h-8 text-white/70 mb-3 group-hover:text-white transition-colors" />
              <h3 className="text-white font-medium text-sm">{mod.title}</h3>
              <p className="text-slate-500 text-xs mt-1">{mod.description}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Histórico con filtros */}
      {mostrarHistorico && (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-5 gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
              <span className="text-slate-400 text-xs">Total $</span>
              <p className="text-xl font-bold text-white mt-1">{formatMoney(totalFiltrado)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-aria-primary/10 to-cyan-500/5 border border-aria-primary/20">
              <span className="text-slate-400 text-xs">Registros</span>
              <p className="text-xl font-bold text-aria-accent mt-1">{registrosFiltrados.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20">
              <span className="text-slate-400 text-xs">Obras</span>
              <p className="text-xl font-bold text-amber-400 mt-1">{[...new Set(registrosFiltrados.map(r => r.obra))].length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-aria-primary/5 border border-cyan-500/20">
              <span className="text-slate-400 text-xs">Proveedores</span>
              <p className="text-xl font-bold text-cyan-400 mt-1">{[...new Set(registrosFiltrados.map(r => r.proveedor).filter(Boolean))].length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-500/20">
              <span className="text-slate-400 text-xs">Solicitantes</span>
              <p className="text-xl font-bold text-purple-400 mt-1">{[...new Set(registrosFiltrados.map(r => r.solicitante))].length}</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="text" placeholder="Buscar descripción, proveedor..." value={filtros.buscar} onChange={e => setFiltros({...filtros, buscar: e.target.value})} className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:border-amber-500/50 focus:outline-none" />
              </div>
              <select value={filtros.mes} onChange={e => setFiltros({...filtros, mes: e.target.value})} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white">
                <option value="">📅 Todos los meses</option>
                {meses.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={filtros.obra} onChange={e => setFiltros({...filtros, obra: e.target.value})} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white">
                <option value="">🏗️ Todas las obras</option>
                {obras.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <select value={filtros.status} onChange={e => setFiltros({...filtros, status: e.target.value})} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white">
                <option value="">📋 Todos los estatus</option>
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filtros.solicitante} onChange={e => setFiltros({...filtros, solicitante: e.target.value})} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white">
                <option value="">👤 Solicitante</option>
                {solicitantes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <input type="date" value={filtros.fechaInicio} onChange={e => setFiltros({...filtros, fechaInicio: e.target.value})} className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white" />
                <span className="text-slate-500">→</span>
                <input type="date" value={filtros.fechaFin} onChange={e => setFiltros({...filtros, fechaFin: e.target.value})} className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white" />
              </div>
              <button onClick={limpiarFiltros} className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20" title="Limpiar">
                <X className="w-4 h-4" />
              </button>
              <button onClick={exportarExcel} disabled={exportando} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 hover:from-amber-500/30 hover:to-orange-500/30 disabled:opacity-50">
                {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                {exportando ? "..." : "Excel"}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="grid grid-cols-3 gap-6">
            {/* Tabla */}
            <div className="col-span-2 p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-amber-400" />Detalle de Requisiciones
              </h2>
              {loading ? <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400" /></div> : (
                <div className="max-h-[400px] overflow-y-auto rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-800/90 backdrop-blur-sm">
                        <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase rounded-tl-lg">#</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase">Fecha</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase">Solicitante</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase">Obra</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase">Descripción</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-slate-400 uppercase">Monto</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase rounded-tr-lg">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {registrosFiltrados.slice(0, 150).map((r, idx) => (
                        <tr key={r.id} className={`${idx % 2 === 0 ? 'bg-white/[0.01]' : 'bg-white/[0.03]'} hover:bg-white/[0.06] transition-colors`}>
                          <td className="px-3 py-2.5 text-cyan-400 font-mono text-xs">{r.folio_excel}</td>
                          <td className="px-3 py-2.5 text-slate-300 text-xs">{r.fecha || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-300 text-xs truncate max-w-[100px]">{r.solicitante?.split(" ").slice(-2).join(" ") || "—"}</td>
                          <td className="px-3 py-2.5"><span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs truncate block max-w-[100px]">{r.obra?.substring(0,18) || "—"}</span></td>
                          <td className="px-3 py-2.5 text-white text-xs truncate max-w-[180px]">{r.descripcion || "—"}</td>
                          <td className="px-3 py-2.5 text-right"><span className="font-semibold text-emerald-400 text-xs">{formatMoney(r.monto)}</span></td>
                          <td className="px-3 py-2.5"><span className={`px-2 py-1 rounded-lg text-xs font-medium ${statusColor(r.status)}`}>{r.status?.substring(0,14) || "—"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {registrosFiltrados.length > 150 && <p className="text-center text-slate-500 text-xs mt-4 py-2 bg-white/5 rounded-lg">Mostrando 150 de {registrosFiltrados.length}</p>}
            </div>

            {/* Resumen */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-400" />Top Obras
              </h2>
              <div className="space-y-3">
                {resumenObras.map((o, i) => (
                  <div key={i} className="p-4 rounded-xl bg-gradient-to-r from-white/[0.03] to-transparent border border-white/5 hover:border-amber-500/30 transition-all cursor-pointer" onClick={() => setFiltros({...filtros, obra: o.nombre})}>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-medium text-white truncate flex-1">{o.nombre}</p>
                      <span className="text-emerald-400 font-bold text-sm">{formatMoney(o.total)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all" style={{width: `${Math.min((o.total / (resumenObras[0]?.total || 1)) * 100, 100)}%`}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
