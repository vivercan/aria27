"use client";
import { useEffect, useState } from "react";
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Shield, Database, FileCheck, FlaskConical, KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import CanonPageHeader from "@/components/ui/CanonPageHeader";
import KpiCard from "@/components/ui/KpiCard";

interface MonRow {
  id: string;
  run_id: string;
  category: string;
  check_name: string;
  status: "ok" | "warn" | "error";
  message: string;
  duration_ms: number | null;
  created_at: string;
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  HEALTH: <Activity className="w-4 h-4" />,
  SMOKE_CRUD: <Database className="w-4 h-4" />,
  CONTRACT: <FileCheck className="w-4 h-4" />,
  PEN_TEST: <Shield className="w-4 h-4" />,
  ENV: <KeyRound className="w-4 h-4" />,
};

export default function MonitoringPage() {
  const [rows, setRows] = useState<MonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("monitoring_log").select("*").order("created_at", { ascending: false }).limit(300);
    if (filterCat) q = q.eq("category", filterCat);
    if (filterStatus) q = q.eq("status", filterStatus);
    const { data } = await q;
    setRows((data as MonRow[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filterCat, filterStatus]);

  // Calcular ultima corrida (run_id mas reciente)
  const ultimaCorrida = rows.length > 0 ? rows[0].run_id : null;
  const checksUltima = rows.filter(r => r.run_id === ultimaCorrida);
  const counts = {
    total: checksUltima.length,
    ok: checksUltima.filter(r => r.status === "ok").length,
    warn: checksUltima.filter(r => r.status === "warn").length,
    err: checksUltima.filter(r => r.status === "error").length,
  };

  // Uptime: % de ok en las ultimas 100 filas (ignorando categoria)
  const uptimePct = rows.length > 0
    ? Math.round((rows.filter(r => r.status === "ok").length / rows.length) * 100)
    : 0;

  // Duracion p50 (median) de la ultima corrida
  const durs = checksUltima.map(r => r.duration_ms || 0).filter(d => d > 0).sort((a, b) => a - b);
  const p50 = durs.length > 0 ? durs[Math.floor(durs.length / 2)] : 0;

  // Corridas distintas en las ultimas 300 filas
  const corridas = new Set(rows.map(r => r.run_id)).size;

  return (
    <div className="aria-page-canon space-y-6 max-w-7xl mx-auto">
      <CanonPageHeader
        title="Synthetic Monitoring"
        subtitle="Auditoria continua: HEALTH + SMOKE_CRUD + CONTRACT + PEN_TEST + ENV cada 2 minutos"
        backHref="/dashboard"
        icon={<Activity className="w-6 h-6" />}
        right={
          <button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[#c9d8ed] text-sm hover:bg-white/[0.06]">
            <RefreshCw className="w-4 h-4" /> Refrescar
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Uptime ultimas 300" value={`${uptimePct}%`} variant={uptimePct >= 98 ? "emerald" : uptimePct >= 90 ? "neutral" : "rose"} icon={<Activity className="w-5 h-5" />} />
        <KpiCard label="Ultima corrida (errores)" value={counts.err} variant={counts.err === 0 ? "emerald" : "rose"} icon={<XCircle className="w-5 h-5" />} />
        <KpiCard label="Ultima corrida (warnings)" value={counts.warn} variant={counts.warn === 0 ? "neutral" : "neutral"} icon={<AlertTriangle className="w-5 h-5" />} />
        <KpiCard label="Latencia p50" value={`${p50}ms`} variant="neutral" />
        <KpiCard label="Corridas registradas" value={corridas} variant="neutral" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-3 py-2 bg-[#0a1628] border border-white/[0.08] rounded text-white text-sm">
          <option value="">Todas las categorias</option>
          {["HEALTH", "SMOKE_CRUD", "CONTRACT", "PEN_TEST", "ENV"].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 bg-[#0a1628] border border-white/[0.08] rounded text-white text-sm">
          <option value="">Todos los estados</option>
          <option value="ok">OK</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
        </select>
        <span className="text-sm text-[#7f93b0]">{rows.length} filas</span>
      </div>

      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden">
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] sticky top-0">
              <tr className="text-left text-[#c9d8ed]">
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Categoria</th>
                <th className="px-3 py-2">Check</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Mensaje</th>
                <th className="px-3 py-2 text-right">ms</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="px-3 py-6 text-center text-[#7f93b0]">Cargando...</td></tr>}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-[#4a6080]">
                  Sin registros aun. El cron `/api/cron/health-monitor` aun no ha corrido o la tabla esta vacia.
                </td></tr>
              )}
              {rows.map(r => (
                <tr key={r.id} className="border-t border-white/[0.05] text-[#c9d8ed]">
                  <td className="px-3 py-2 text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString("es-MX")}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className="inline-flex items-center gap-1.5">{CATEGORY_ICON[r.category] || <FlaskConical className="w-4 h-4" />} {r.category}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{r.check_name}</td>
                  <td className="px-3 py-2">
                    {r.status === "ok" && <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-4 h-4" />OK</span>}
                    {r.status === "warn" && <span className="inline-flex items-center gap-1 text-amber-400"><AlertTriangle className="w-4 h-4" />WARN</span>}
                    {r.status === "error" && <span className="inline-flex items-center gap-1 text-rose-400"><XCircle className="w-4 h-4" />ERROR</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-[#7f93b0] max-w-md truncate" title={r.message}>{r.message}</td>
                  <td className="px-3 py-2 text-xs text-right text-[#7f93b0] tabular-nums">{r.duration_ms || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
