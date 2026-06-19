"use client";
import { clientLogger } from "@/lib/client-logger";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { FilePlus, ListChecks, ShieldCheck, ShoppingCart, ClipboardList, Search, X, Loader2, History, FileSpreadsheet, TrendingUp, ChevronRight } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";
import { fmtMoney } from "@/lib/formatters";
import { ResponsiveTable } from "@/components/ui";
import HistorialButton from "@/components/HistorialButton";
import { getEntityColor } from "@/lib/entity-colors";

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
  { title: "Autorizar", description: "Aprobar pendientes", icon: ShieldCheck, href: "/dashboard/requisiciones/requisiciones/autorizar", color: "from-slate-600 to-slate-700" },
  { title: "Compras", description: "Cotizaciones", icon: ShoppingCart, href: "/dashboard/requisiciones/requisiciones/tramite", color: "from-indigo-500 to-indigo-600" },
  { title: "Órdenes de Compra", description: "OC autorizadas", icon: ClipboardList, href: "/dashboard/requisiciones/requisiciones/ordenes", color: "from-aria-accent to-aria-accent" },
];

export default function RequisicionesPage() {
  const log = clientLogger("REQUISICIONES");
  const [registros, setRegistros] = useState<ReqHist[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [filtros, setFiltros] = useState({ buscar: "", obra: "", status: "", solicitante: "", fechaInicio: "", fechaFin: "", mes: "" });
  const [obras, setObras] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [solicitantes, setSolicitantes] = useState<string[]>([]);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    setLoading(true);
    setFetchError(null);
    const { data, error } = await supabase.from("requisiciones_historico").select("*").order("fecha", { ascending: false });
    if (error) {
      log.error("Error cargando histórico de requisiciones", String(error.message));
      setFetchError("No se pudo cargar el histórico. Intenta recargar la página.");
    } else if (data) {
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
  const formatMoney = (n: number) => `${fmtMoney((n || 0))}`;

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
    } catch (e: unknown) { log.error(String(e)); }
    setExportando(false);
  };

  const statusColor = (s: string) => {
    if (s?.includes("TERMINADO")) return "bg-emerald-500/20 text-aria-accent";
    if (s?.includes("FALTANTE")) return "bg-amber-500/20 text-amber-400";
    if (s?.includes("COTIZACION")) return "bg-aria-primary-light text-aria-accent";
    if (s?.includes("CANCELADA")) return "bg-red-500/20 text-red-400";
    return "bg-slate-500/20 text-[#7f93b0]";
  };

  const meses = [...new Set(registros.map(r => r.fecha?.substring(0,7)).filter(Boolean))].sort().reverse();

  // Resumen por obra
  const resumenObras = Object.entries(registrosFiltrados.reduce((acc, r) => {
    const obra = r.obra || "Sin asignar";
    acc[obra] = (acc[obra] || 0) + (r.monto || 0);
    return acc;
  }, {} as Record<string, number>)).map(([nombre, total]) => ({ nombre, total })).sort((a, b) => b.total - a.total).slice(0, 5);

  /* ── Constantes de estilo — idénticos al HubCard del hub ── */
  const HUB_BG   = "radial-gradient(circle at 50% 20%, rgba(72,128,230,0.07) 0%, rgba(72,128,230,0.03) 25%, rgba(72,128,230,0.00) 48%), linear-gradient(180deg, #06152F 0%, #081E46 44%, #0A2450 100%)";
  const CARD_BG  = "linear-gradient(180deg, #2C3D52 0%, #263647 54%, #21303E 100%)";
  const CARD_SHD = "inset 0 1px 0 rgba(210,228,252,0.05), 0 8px 20px rgba(0,0,0,0.20)";
  const CARD_BDR = "rgba(120,158,204,0.18)";
  const PANEL_BG = "rgba(12,28,56,0.55)";
  const PANEL_BD = "rgba(120,158,204,0.14)";

  return (
    <div className="px-5 pt-4 pb-6 min-h-full overflow-y-auto" style={{ background: HUB_BG }}>
      {fetchError && (
        <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-red-400 text-sm">
          <X className="w-4 h-4 shrink-0" />{fetchError}
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between rounded-xl px-5 py-3 mb-5 flex-shrink-0"
        style={{ background: "linear-gradient(180deg, #123E92 0%, #103A86 100%)", border: "1px solid rgba(150,180,230,0.10)" }}>
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3.5">
          <AriaBackButton href="/dashboard/requisiciones" />
          <h1 style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.035em", color: "#F4F8FF", lineHeight: 1 }}>Requisiciones</h1>
          <span className="hidden sm:inline" style={{ color: "rgba(145,175,225,0.35)", fontSize: "15px" }}>·</span>
          <span style={{ fontSize: "13px", fontWeight: 500, color: "rgba(214,228,255,0.65)" }}>Gestión de solicitudes de materiales</span>
        </div>
        <button
          onClick={() => setMostrarHistorico(!mostrarHistorico)}
          className="btn-sku flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium flex-shrink-0"
          style={mostrarHistorico
            ? { background: "linear-gradient(135deg,#1D4ED8,#1E40AF)", color: "#ffffff", border: "1px solid rgba(59,130,246,0.35)" }
            : { background: "rgba(10,28,60,0.70)", color: "#c9d8ed", border: "1px solid rgba(120,160,210,0.25)" }
          }
        >
          <History className="w-4 h-4" />{mostrarHistorico ? "Ocultar Histórico" : `Ver Histórico (${registros.length})`}
        </button>
      </div>

      {/* ── ACCESOS RÁPIDOS — HubCard idéntico ── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-5">
        {submodules.map((mod, idx) => (
          <Link key={idx} href={mod.href}
            className="group relative flex flex-col justify-start rounded-2xl transition-all duration-200 ease-out"
            style={{ padding: "20px 18px 18px 20px", background: CARD_BG, border: `1px solid ${CARD_BDR}`, boxShadow: CARD_SHD }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-3px)"; el.style.boxShadow = "inset 0 1px 0 rgba(210,228,252,0.08), 0 16px 32px rgba(0,0,0,0.26)"; el.style.borderColor = "rgba(140,178,228,0.30)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(0)"; el.style.boxShadow = CARD_SHD; el.style.borderColor = CARD_BDR; }}
          >
            <mod.icon style={{ width: 28, height: 28, color: "#7BB6FF", flexShrink: 0 }} strokeWidth={1.5} />
            <div style={{ height: "14px", flexShrink: 0 }} />
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#EAF2FF", letterSpacing: "-0.018em", lineHeight: 1.2 }}>{mod.title}</h3>
            <p style={{ marginTop: "7px", fontSize: "12px", color: "rgba(200,220,248,0.72)", lineHeight: 1.5 }}>{mod.description}</p>
            <ChevronRight className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-25 transition-opacity duration-200" style={{ width: 12, height: 12, color: "#7BB6FF" }} />
          </Link>
        ))}
      </div>

      {/* Histórico con filtros */}
      {mostrarHistorico && (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1E3E7A]/15 to-[#0A2450]/25 border border-[#3A5E9A]/40 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
              <span className="text-[#7f93b0] text-xs">Total $</span>
              <p className="text-xl font-bold text-white mt-1">{formatMoney(totalFiltrado)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-aria-primary/10 to-aria-accent/5 border border-aria-primary/20">
              <span className="text-[#7f93b0] text-xs">Registros</span>
              <p className="text-xl font-bold text-white mt-1">{registrosFiltrados.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-aria-primary/10 to-aria-primary/5 border border-aria-primary/20">
              <span className="text-[#7f93b0] text-xs">Obras</span>
              <p className="text-xl font-bold text-white mt-1">{[...new Set(registrosFiltrados.map(r => r.obra))].length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-aria-accent/10 to-aria-primary/5 border border-aria-accent/20">
              <span className="text-[#7f93b0] text-xs">Proveedores</span>
              <p className="text-xl font-bold text-white mt-1">{[...new Set(registrosFiltrados.map(r => r.proveedor).filter(Boolean))].length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-aria-primary/10 to-aria-primary/5 border border-aria-primary/30">
              <span className="text-[#7f93b0] text-xs">Solicitantes</span>
              <p className="text-xl font-bold text-white mt-1">{[...new Set(registrosFiltrados.map(r => r.solicitante))].length}</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="p-5 rounded-2xl" style={{background:PANEL_BG,border:`1px solid ${PANEL_BD}`}}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a6080]" />
                <input type="text" placeholder="Buscar descripción, proveedor..." value={filtros.buscar} onChange={e => setFiltros({...filtros, buscar: e.target.value})} className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-[#4a6080] focus:border-aria-accent focus:outline-none" />
              </div>
              <select value={filtros.mes} onChange={e => setFiltros({...filtros, mes: e.target.value})} className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white">
                <option value="">📅 Todos los meses</option>
                {meses.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={filtros.obra} onChange={e => setFiltros({...filtros, obra: e.target.value})} className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white">
                <option value="">🏗️ Todas las obras</option>
                {obras.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <select value={filtros.status} onChange={e => setFiltros({...filtros, status: e.target.value})} className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white">
                <option value="">📋 Todos los estatus</option>
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filtros.solicitante} onChange={e => setFiltros({...filtros, solicitante: e.target.value})} className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white">
                <option value="">👤 Solicitante</option>
                {solicitantes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <input type="date" value={filtros.fechaInicio} onChange={e => setFiltros({...filtros, fechaInicio: e.target.value})} className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white" />
                <span className="text-[#4a6080]">→</span>
                <input type="date" value={filtros.fechaFin} onChange={e => setFiltros({...filtros, fechaFin: e.target.value})} className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white" />
              </div>
              <button onClick={limpiarFiltros} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.08] text-red-400 hover:bg-red-500/20" title="Limpiar">
                <X className="w-4 h-4" />
              </button>
              <button onClick={exportarExcel} disabled={exportando} className="btn-sku flex items-center gap-2 px-4 py-2.5 rounded-xl disabled:opacity-50" style={{background:"rgba(16,185,129,0.10)",color:"#34d399",border:"1px solid rgba(16,185,129,0.25)"}}>
                {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                {exportando ? "..." : "Excel"}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tabla */}
            <div className="col-span-2 p-5 rounded-2xl" style={{background:PANEL_BG,border:`1px solid ${PANEL_BD}`}}>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-aria-accent" />Detalle de Requisiciones
              </h2>
              {loading ? <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-aria-accent" /></div> : (
                <div className="max-h-[400px] overflow-y-auto rounded-xl">
                  <ResponsiveTable
                    columns={[
                      { key: "folio_excel", label: "#", primary: true },
                      { key: "fecha", label: "Fecha", primary: true },
                      { key: "solicitante", label: "Solicitante" },
                      { key: "obra", label: "Obra", primary: true },
                      { key: "descripcion", label: "Descripción" },
                      { key: "monto", label: "Monto", align: "right", primary: true },
                      { key: "status", label: "Status", primary: true },
                      { key: "historial", label: "Historial" },
                    ]}
                    rows={registrosFiltrados.slice(0, 150)}
                    rowKey={(r) => r.id}
                    render={(r, c) => {
                      if (c.key === "folio_excel") return <span className="text-aria-accent font-mono text-xs">{r.folio_excel}</span>;
                      if (c.key === "fecha") return <span className="text-[#c9d8ed] text-xs">{r.fecha || "—"}</span>;
                      if (c.key === "solicitante") return <span className="text-[#c9d8ed] text-xs">{r.solicitante || "—"}</span>;
                      if (c.key === "obra") return <span className={`px-2 py-1 rounded-lg text-xs ${getEntityColor(r.obra)}`}>{r.obra?.substring(0,18) || "—"}</span>;
                      if (c.key === "descripcion") return <span className="text-white text-xs">{r.descripcion || "—"}</span>;
                      if (c.key === "monto") return <span className="font-semibold text-aria-accent text-xs">{formatMoney(r.monto)}</span>;
                      if (c.key === "status") return <span className={`px-2 py-1 rounded-lg text-xs font-medium ${statusColor(r.status)}`}>{r.status?.substring(0,14) || "—"}</span>;
                      if (c.key === "historial") return <HistorialButton tabla="requisitions" id={r.id} label="Ver" size="sm" />;
                      return null;
                    }}
                  />
                </div>
              )}
              {registrosFiltrados.length > 150 && <p className="text-center text-[#4a6080] text-xs mt-4 py-2 bg-white/[0.04] rounded-lg">Mostrando 150 de {registrosFiltrados.length}</p>}
            </div>

            {/* Resumen */}
            <div className="p-5 rounded-2xl" style={{background:PANEL_BG,border:`1px solid ${PANEL_BD}`}}>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-aria-accent" />Top Obras
              </h2>
              <div className="space-y-3">
                {resumenObras.map((o, i) => (
                  <div key={i} className="p-4 rounded-xl bg-gradient-to-r from-white/[0.03] to-transparent border border-white/[0.05] hover:border-aria-primary/30 transition-all cursor-pointer" onClick={() => setFiltros({...filtros, obra: o.nombre})}>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-medium text-white truncate flex-1">{o.nombre}</p>
                      <span className="text-aria-accent font-bold text-sm">{formatMoney(o.total)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-aria-accent transition-all" style={{width: `${Math.min((o.total / (resumenObras[0]?.total || 1)) * 100, 100)}%`}}/>
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
