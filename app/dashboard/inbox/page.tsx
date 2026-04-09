"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, AlertTriangle, AlertCircle, Info, Loader2, RefreshCw } from "lucide-react";

interface Alerta {
  id: string;
  tipo: "URGENTE" | "ATENCION" | "INFO";
  modulo: string;
  titulo: string;
  detalle: string;
  link?: string;
  fecha: string;
}

const ICONS = {
  URGENTE: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  ATENCION: { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  INFO: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
};

export default function InboxPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [counts, setCounts] = useState({ total: 0, urgentes: 0, atencion: 0, info: 0 });
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"TODAS" | "URGENTE" | "ATENCION" | "INFO">("TODAS");
  const [filtroModulo, setFiltroModulo] = useState("TODOS");

  async function load() {
    setLoading(true);
    try {
      const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
      const r = await fetch("/api/alertas", { headers: { "x-user-email": email } });
      const data = await r.json();
      if (r.ok) {
        setAlertas(data.alertas || []);
        setCounts({ total: data.total || 0, urgentes: data.urgentes || 0, atencion: data.atencion || 0, info: data.info || 0 });
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const modulos = Array.from(new Set(alertas.map(a => a.modulo))).sort();
  const visibles = alertas.filter(a => {
    if (filtro !== "TODAS" && a.tipo !== filtro) return false;
    if (filtroModulo !== "TODOS" && a.modulo !== filtroModulo) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-400" /> Inbox de Alertas
          </h1>
          <p className="text-slate-400 text-sm">Centro unificado de notificaciones · 7 fuentes (requisiciones, OC, cobros, bancos, cotizaciones, bitácora, inventario)</p>
        </div>
        <button onClick={load} disabled={loading} className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 text-blue-300 rounded-lg flex items-center gap-2 text-sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refrescar
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={() => setFiltro("TODAS")} className={`p-4 rounded-xl border transition-colors ${filtro === "TODAS" ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
          <p className="text-sm text-slate-400">Total</p>
          <p className="text-3xl font-bold text-white">{counts.total}</p>
        </button>
        <button onClick={() => setFiltro("URGENTE")} className={`p-4 rounded-xl border transition-colors ${filtro === "URGENTE" ? "bg-red-500/20 border-red-500/50" : "bg-red-500/5 border-red-500/20 hover:bg-red-500/10"}`}>
          <p className="text-sm text-red-300">Urgentes</p>
          <p className="text-3xl font-bold text-red-400">{counts.urgentes}</p>
        </button>
        <button onClick={() => setFiltro("ATENCION")} className={`p-4 rounded-xl border transition-colors ${filtro === "ATENCION" ? "bg-amber-500/20 border-amber-500/50" : "bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10"}`}>
          <p className="text-sm text-amber-300">Atención</p>
          <p className="text-3xl font-bold text-amber-400">{counts.atencion}</p>
        </button>
        <button onClick={() => setFiltro("INFO")} className={`p-4 rounded-xl border transition-colors ${filtro === "INFO" ? "bg-blue-500/20 border-blue-500/50" : "bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10"}`}>
          <p className="text-sm text-blue-300">Info</p>
          <p className="text-3xl font-bold text-blue-400">{counts.info}</p>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <select value={filtroModulo} onChange={e => setFiltroModulo(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm">
          <option value="TODOS">Todos los módulos</option>
          {modulos.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <span className="text-sm text-slate-400">{visibles.length} resultado(s)</span>
      </div>

      <div className="space-y-2">
        {loading && <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-amber-400" /></div>}
        {!loading && visibles.length === 0 && (
          <div className="text-center py-16 text-slate-400 bg-white/5 rounded-xl border border-white/10">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>Sin alertas. Todo bajo control.</p>
          </div>
        )}
        {!loading && visibles.map(a => {
          const cfg = ICONS[a.tipo];
          const Icon = cfg.icon;
          return (
            <Link key={a.id} href={a.link || "#"} className={`block p-4 rounded-xl border ${cfg.bg} ${cfg.border} hover:bg-white/10 transition-colors`}>
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-white font-semibold">{a.titulo}</p>
                    <span className="text-xs text-slate-400">{a.modulo} · {new Date(a.fecha).toLocaleDateString("es-MX")}</span>
                  </div>
                  <p className="text-sm text-slate-300 mt-1">{a.detalle}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
