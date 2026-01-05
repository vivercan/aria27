"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { FilePlus, ListChecks, ShieldCheck, ShoppingCart, ClipboardList, ArrowLeft, Search, Download, Calendar, Building2, Filter, X, Loader2, History } from "lucide-react";

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
  { title: "Estatus", description: "Monitor de solicitudes", icon: ListChecks, href: "/dashboard/requisiciones/requisiciones/estatus", color: "from-blue-500 to-blue-600" },
  { title: "Autorizar", description: "Aprobar pendientes", icon: ShieldCheck, href: "/dashboard/requisiciones/requisiciones/autorizar", color: "from-amber-500 to-amber-600" },
  { title: "Compras", description: "Cotizaciones", icon: ShoppingCart, href: "/dashboard/requisiciones/requisiciones/tramite", color: "from-purple-500 to-purple-600" },
  { title: "Órdenes de Compra", description: "OC autorizadas", icon: ClipboardList, href: "/dashboard/requisiciones/requisiciones/ordenes", color: "from-cyan-500 to-cyan-600" },
];

export default function RequisicionesPage() {
  const [registros, setRegistros] = useState<ReqHist[]>([]);
  const [loading, setLoading] = useState(true);
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

  const exportarCSV = () => {
    let csv = "\uFEFF";
    csv += "Folio,Fecha,Solicitante,Obra,Proveedor,Descripcion,Monto,Status\n";
    registrosFiltrados.forEach(r => {
      csv += `${r.folio_excel || ""},${r.fecha || ""},"${r.solicitante || ""}","${r.obra || ""}","${r.proveedor || ""}","${(r.descripcion || "").substring(0,100)}",${r.monto || 0},"${r.status || ""}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Requisiciones_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const statusColor = (s: string) => {
    if (s?.includes("TERMINADO")) return "bg-emerald-500/20 text-emerald-400";
    if (s?.includes("FALTANTE")) return "bg-amber-500/20 text-amber-400";
    if (s?.includes("COTIZACION")) return "bg-blue-500/20 text-blue-400";
    if (s?.includes("CANCELADA")) return "bg-red-500/20 text-red-400";
    return "bg-slate-500/20 text-slate-400";
  };

  const meses = [...new Set(registros.map(r => r.fecha?.substring(0,7)).filter(Boolean))].sort().reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/requisiciones" className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft className="w-5 h-5 text-slate-400" /></Link>
          <div><h1 className="text-2xl font-bold text-white">Requisiciones</h1><p className="text-slate-400 text-sm">Gestión de solicitudes de materiales</p></div>
        </div>
        <button onClick={() => setMostrarHistorico(!mostrarHistorico)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${mostrarHistorico ? "bg-purple-500 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}>
          <History className="w-4 h-4" />{mostrarHistorico ? "Ocultar Histórico" : "Ver Histórico (883)"}
        </button>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-5 gap-4">
        {submodules.map((mod, idx) => (
          <Link key={idx} href={mod.href} className="group block">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 hover:border-white/20 hover:bg-white/10 transition">
              <div className={`absolute inset-0 bg-gradient-to-br ${mod.color} opacity-0 group-hover:opacity-10 transition`} />
              <mod.icon className="w-8 h-8 text-white/80 mb-2" />
              <h3 className="text-white font-medium text-sm">{mod.title}</h3>
              <p className="text-slate-400 text-xs">{mod.description}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Histórico con filtros */}
      {mostrarHistorico && (
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"><span className="text-slate-400 text-xs">Total $</span><p className="text-xl font-bold text-white">{formatMoney(totalFiltrado)}</p></div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"><span className="text-slate-400 text-xs">Registros</span><p className="text-xl font-bold text-blue-400">{registrosFiltrados.length}</p></div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"><span className="text-slate-400 text-xs">Obras</span><p className="text-xl font-bold text-amber-400">{[...new Set(registrosFiltrados.map(r => r.obra))].length}</p></div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"><span className="text-slate-400 text-xs">Proveedores</span><p className="text-xl font-bold text-cyan-400">{[...new Set(registrosFiltrados.map(r => r.proveedor).filter(Boolean))].length}</p></div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"><span className="text-slate-400 text-xs">Solicitantes</span><p className="text-xl font-bold text-purple-400">{[...new Set(registrosFiltrados.map(r => r.solicitante))].length}</p></div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Buscar..." value={filtros.buscar} onChange={e => setFiltros({...filtros, buscar: e.target.value})} className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white" /></div>
              <select value={filtros.mes} onChange={e => setFiltros({...filtros, mes: e.target.value})} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white"><option value="">Todos los meses</option>{meses.map(m => <option key={m} value={m}>{m}</option>)}</select>
              <select value={filtros.obra} onChange={e => setFiltros({...filtros, obra: e.target.value})} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white"><option value="">Todas las obras</option>{obras.map(o => <option key={o} value={o}>{o}</option>)}</select>
              <select value={filtros.status} onChange={e => setFiltros({...filtros, status: e.target.value})} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white"><option value="">Todos</option>{statuses.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <select value={filtros.solicitante} onChange={e => setFiltros({...filtros, solicitante: e.target.value})} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white"><option value="">Solicitante</option>{solicitantes.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <input type="date" value={filtros.fechaInicio} onChange={e => setFiltros({...filtros, fechaInicio: e.target.value})} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white" title="Desde" />
              <input type="date" value={filtros.fechaFin} onChange={e => setFiltros({...filtros, fechaFin: e.target.value})} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white" title="Hasta" />
              <button onClick={limpiarFiltros} className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"><X className="w-4 h-4" /></button>
              <button onClick={exportarCSV} className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"><Download className="w-4 h-4" /></button>
            </div>
          </div>

          {loading ? <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400" /></div> : (
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#0a1628] z-10">
                    <tr className="border-b border-white/10 text-left text-xs text-slate-400">
                      <th className="px-2 py-2">#</th><th className="px-2 py-2">Fecha</th><th className="px-2 py-2">Solicitante</th><th className="px-2 py-2">Obra</th><th className="px-2 py-2">Descripción</th><th className="px-2 py-2">Proveedor</th><th className="px-2 py-2 text-right">Monto</th><th className="px-2 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrosFiltrados.slice(0, 150).map(r => (
                      <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="px-2 py-2 text-cyan-400 font-mono text-xs">{r.folio_excel}</td>
                        <td className="px-2 py-2 text-slate-300 text-xs">{r.fecha || "—"}</td>
                        <td className="px-2 py-2 text-slate-300 text-xs truncate max-w-[80px]">{r.solicitante?.split(" ").slice(-2).join(" ") || "—"}</td>
                        <td className="px-2 py-2"><span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs">{r.obra?.substring(0,15) || "—"}</span></td>
                        <td className="px-2 py-2 text-white text-xs truncate max-w-[180px]">{r.descripcion || "—"}</td>
                        <td className="px-2 py-2 text-slate-400 text-xs truncate max-w-[80px]">{r.proveedor || "—"}</td>
                        <td className="px-2 py-2 text-right font-medium text-emerald-400 text-xs">{formatMoney(r.monto)}</td>
                        <td className="px-2 py-2"><span className={`px-1.5 py-0.5 rounded text-xs ${statusColor(r.status)}`}>{r.status?.substring(0,12) || "—"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {registrosFiltrados.length > 150 && <p className="text-center text-slate-500 text-xs mt-3">Mostrando 150 de {registrosFiltrados.length}</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
