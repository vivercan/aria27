"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Activity, AlertTriangle, TrendingUp, Download, Search, Loader2, ChevronDown, ChevronRight, FileText } from "lucide-react";

interface Partida { obra_nombre: string; categoria: string; importe: number; }
interface PO { id: string; total: number; status: string; requisition_id: string | null; }
interface Req { id: string; cost_center_name: string | null; }
interface NomRec { obra: string; sueldo_neto: number; status: string; }
interface CobroRec { obra_nombre: string | null; monto: number; saldo: number; estatus: string; }
interface AvanceRec { obra_nombre: string; semana_iso: string; pct_fisico: number; }

interface ObraRow {
  nombre: string;
  presupuesto: number;
  presupuestoCat: Record<string, number>;
  gastoOC: number;
  gastoNomina: number;
  gastoTotal: number;
  cobrado: number;
  porCobrar: number;
  margen: number;
  pctFisico: number | null;
  semanaFisico: string | null;
  deltaFisFin: number | null;
  avance: number;
  saldo: number;
  semaforo: "VERDE" | "AMARILLO" | "ROJO" | "REBASADO" | "SIN_PRESUPUESTO";
}

const CATS = ["MATERIALES", "MANO_OBRA", "HERRAMIENTA", "SUBCONTRATO", "INDIRECTOS", "OTROS"];

const fmt = (n: number) => `$${(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function semaforoOf(avance: number, presupuesto: number): ObraRow["semaforo"] {
  if (presupuesto <= 0) return "SIN_PRESUPUESTO";
  if (avance > 100) return "REBASADO";
  if (avance >= 90) return "ROJO";
  if (avance >= 70) return "AMARILLO";
  return "VERDE";
}

const semColor: Record<ObraRow["semaforo"], string> = {
  VERDE: "bg-emerald-500/20 border-emerald-500/30 text-emerald-300",
  AMARILLO: "bg-amber-500/20 border-amber-500/30 text-amber-300",
  ROJO: "bg-red-500/20 border-red-500/30 text-red-300",
  REBASADO: "bg-rose-600/30 border-rose-600/50 text-rose-200",
  SIN_PRESUPUESTO: "bg-slate-500/20 border-slate-500/30 text-slate-400",
};

const semLabel: Record<ObraRow["semaforo"], string> = {
  VERDE: "VERDE",
  AMARILLO: "AMARILLO",
  ROJO: "ROJO",
  REBASADO: "REBASADO",
  SIN_PRESUPUESTO: "S/PPTO",
};

export default function ControlObrasPage() {
  const [loading, setLoading] = useState(true);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [pos, setPos] = useState<PO[]>([]);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [nomina, setNomina] = useState<NomRec[]>([]);
  const [cobros, setCobros] = useState<CobroRec[]>([]);
  const [avancesFis, setAvancesFis] = useState<AvanceRec[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroSem, setFiltroSem] = useState<string>("");
  const [expandida, setExpandida] = useState<string | null>(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const [pp, po, rq, nh, co, av] = await Promise.all([
        supabase.from("presupuestos_partidas").select("obra_nombre,categoria,importe"),
        supabase.from("purchase_orders").select("id,total,status,requisition_id"),
        supabase.from("requisitions").select("id,cost_center_name"),
        supabase.from("nomina_historico").select("obra,sueldo_neto,status").eq("status", "CONFIRMADA"),
        supabase.from("cobros_manuales").select("obra_nombre,monto,saldo,estatus").neq("estatus", "CANCELADO"),
        supabase.from("obra_avances").select("obra_nombre,semana_iso,pct_fisico").order("semana_iso", { ascending: false }),
      ]);
      setPartidas((pp.data as any[]) || []);
      setPos((po.data as any[]) || []);
      setReqs((rq.data as any[]) || []);
      setNomina((nh.data as any[]) || []);
      setCobros((co.data as any[]) || []);
      setAvancesFis((av.data as any[]) || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const reqMap = useMemo(() => {
    const m = new Map<string, string>();
    reqs.forEach(r => { if (r.cost_center_name) m.set(r.id, r.cost_center_name); });
    return m;
  }, [reqs]);

  const ultimoFisicoPorObra = useMemo(() => {
    const m = new Map<string, { pct: number; semana: string }>();
    for (const a of avancesFis) {
      const ex = m.get(a.obra_nombre);
      if (!ex || a.semana_iso > ex.semana) m.set(a.obra_nombre, { pct: Number(a.pct_fisico) || 0, semana: a.semana_iso });
    }
    return m;
  }, [avancesFis]);

  const filas: ObraRow[] = useMemo(() => {
    const obras = new Set<string>();
    partidas.forEach(p => p.obra_nombre && obras.add(p.obra_nombre));
    pos.forEach(po => { const o = po.requisition_id ? reqMap.get(po.requisition_id) : null; if (o) obras.add(o); });
    nomina.forEach(n => n.obra && obras.add(n.obra));
    cobros.forEach(c => c.obra_nombre && obras.add(c.obra_nombre));

    return Array.from(obras).sort().map(nombre => {
      const presupuestoCat: Record<string, number> = {};
      CATS.forEach(c => presupuestoCat[c] = 0);
      partidas.filter(p => p.obra_nombre === nombre).forEach(p => {
        const c = p.categoria || "OTROS";
        presupuestoCat[c] = (presupuestoCat[c] || 0) + (p.importe || 0);
      });
      const presupuesto = Object.values(presupuestoCat).reduce((s, v) => s + v, 0);

      const gastoOC = pos.filter(po => po.status !== "CANCELADA" && po.requisition_id && reqMap.get(po.requisition_id) === nombre)
        .reduce((s, po) => s + (po.total || 0), 0);
      const gastoNomina = nomina.filter(n => n.obra === nombre).reduce((s, n) => s + (n.sueldo_neto || 0), 0);
      const gastoTotal = gastoOC + gastoNomina;
      const cobrosObra = cobros.filter(c => c.obra_nombre === nombre);
      const cobrado = cobrosObra.reduce((s, c) => s + ((Number(c.monto) || 0) - (Number(c.saldo) || 0)), 0);
      const porCobrar = cobrosObra.reduce((s, c) => s + (Number(c.saldo) || 0), 0);
      const margen = cobrado - gastoTotal;
      const avance = presupuesto > 0 ? (gastoTotal / presupuesto) * 100 : 0;
      const saldo = presupuesto - gastoTotal;
      const fis = ultimoFisicoPorObra.get(nombre);
      const pctFisico = fis ? fis.pct : null;
      const semanaFisico = fis ? fis.semana : null;
      const deltaFisFin = fis && presupuesto > 0 ? (fis.pct - avance) : null;
      return {
        nombre, presupuesto, presupuestoCat, gastoOC, gastoNomina, gastoTotal,
        cobrado, porCobrar, margen,
        pctFisico, semanaFisico, deltaFisFin,
        avance, saldo, semaforo: semaforoOf(avance, presupuesto)
      };
    });
  }, [partidas, pos, reqMap, nomina, cobros, ultimoFisicoPorObra]);

  const filtradas = useMemo(() => filas.filter(f => {
    if (busqueda && !f.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false;
    if (filtroSem && f.semaforo !== filtroSem) return false;
    return true;
  }), [filas, busqueda, filtroSem]);

  const totales = useMemo(() => ({
    presupuesto: filtradas.reduce((s, f) => s + f.presupuesto, 0),
    gastoOC: filtradas.reduce((s, f) => s + f.gastoOC, 0),
    gastoNomina: filtradas.reduce((s, f) => s + f.gastoNomina, 0),
    gastoTotal: filtradas.reduce((s, f) => s + f.gastoTotal, 0),
    cobrado: filtradas.reduce((s, f) => s + f.cobrado, 0),
    porCobrar: filtradas.reduce((s, f) => s + f.porCobrar, 0),
    margen: filtradas.reduce((s, f) => s + f.margen, 0),
    saldo: filtradas.reduce((s, f) => s + f.saldo, 0),
    obras: filtradas.length,
    rebasadas: filtradas.filter(f => f.semaforo === "REBASADO").length,
    rojas: filtradas.filter(f => f.semaforo === "ROJO").length,
  }), [filtradas]);

  const exportCSV = () => {
    if (filtradas.length === 0) return;
    const headers = ["Obra", "Presupuesto", "Gasto_OC", "Gasto_Nomina", "Gasto_Total", "Cobrado", "Por_Cobrar", "Margen_Real", "Saldo", "Avance_Fin_%", "Avance_Fis_%", "Delta_Fis_Fin", "Semana_Fis", "Semaforo"];
    const rows = filtradas.map(f => [f.nombre, f.presupuesto, f.gastoOC, f.gastoNomina, f.gastoTotal, f.cobrado, f.porCobrar, f.margen, f.saldo, f.avance.toFixed(2), f.pctFisico !== null ? f.pctFisico.toFixed(2) : "", f.deltaFisFin !== null ? f.deltaFisFin.toFixed(2) : "", f.semanaFisico || "", f.semaforo]);
    const csv = "\uFEFF" + headers.join(",") + "\n" + rows.map(r => r.map(v => typeof v === "string" && v.includes(",") ? `"${v}"` : v).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `control_obras_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/obras" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20">
            <Activity className="w-7 h-7 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Centro de Control de Obras</h1>
            <p className="text-slate-400 text-sm">Presupuesto vs Gasto Real (OC + Nómina) por obra</p>
          </div>
        </div>
        <button onClick={exportCSV} disabled={filtradas.length === 0} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40">
          <Download className="w-4 h-4" /> CSV
        </button>
      </div>

      {/* Totales */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-slate-400 text-xs">Obras</p>
          <p className="text-xl font-bold text-blue-300">{totales.obras}</p>
        </div>
        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <p className="text-slate-400 text-xs">Presupuesto</p>
          <p className="text-lg font-bold text-cyan-300">{fmt(totales.presupuesto)}</p>
        </div>
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <p className="text-slate-400 text-xs">Gasto OC</p>
          <p className="text-lg font-bold text-orange-300">{fmt(totales.gastoOC)}</p>
        </div>
        <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
          <p className="text-slate-400 text-xs">Gasto Nómina</p>
          <p className="text-lg font-bold text-violet-300">{fmt(totales.gastoNomina)}</p>
        </div>
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-slate-400 text-xs">Gasto Total</p>
          <p className="text-lg font-bold text-red-300">{fmt(totales.gastoTotal)}</p>
        </div>
        <div className={`p-4 rounded-xl border ${totales.saldo >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"}`}>
          <p className="text-slate-400 text-xs">Saldo Ppto</p>
          <p className={`text-lg font-bold ${totales.saldo >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{fmt(totales.saldo)}</p>
        </div>
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-slate-400 text-xs">Cobrado</p>
          <p className="text-lg font-bold text-emerald-300">{fmt(totales.cobrado)}</p>
        </div>
        <div className={`p-4 rounded-xl border ${totales.margen >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"}`}>
          <p className="text-slate-400 text-xs">Margen Real</p>
          <p className={`text-lg font-bold ${totales.margen >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{fmt(totales.margen)}</p>
        </div>
      </div>

      {(totales.rebasadas > 0 || totales.rojas > 0) && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          <p className="text-rose-200 text-sm">
            <b>{totales.rebasadas}</b> obras REBASADAS · <b>{totales.rojas}</b> obras en ROJO (≥90% de presupuesto consumido)
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar obra..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50" />
        </div>
        <select value={filtroSem} onChange={e => setFiltroSem(e.target.value)} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50">
          <option value="">Todos los semáforos</option>
          <option value="VERDE">🟢 Verde (&lt;70%)</option>
          <option value="AMARILLO">🟡 Amarillo (70-90%)</option>
          <option value="ROJO">🔴 Rojo (≥90%)</option>
          <option value="REBASADO">⛔ Rebasado (&gt;100%)</option>
          <option value="SIN_PRESUPUESTO">⚪ Sin presupuesto</option>
        </select>
        <span className="text-slate-500 text-xs">{filtradas.length} de {filas.length}</span>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden">
        <div className="overflow-auto max-h-[600px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <tr className="border-b border-white/10">
                <th className="text-left p-3 text-slate-400 text-xs">Obra</th>
                <th className="text-right p-3 text-slate-400 text-xs">Presupuesto</th>
                <th className="text-right p-3 text-slate-400 text-xs">OC</th>
                <th className="text-right p-3 text-slate-400 text-xs">Nómina</th>
                <th className="text-right p-3 text-slate-400 text-xs">Gasto Total</th>
                <th className="text-right p-3 text-slate-400 text-xs">Cobrado</th>
                <th className="text-right p-3 text-slate-400 text-xs">Margen</th>
                <th className="text-right p-3 text-slate-400 text-xs">Saldo</th>
                <th className="text-center p-3 text-slate-400 text-xs">Avance Fin</th>
                <th className="text-center p-3 text-slate-400 text-xs">Avance Fís</th>
                <th className="text-center p-3 text-slate-400 text-xs">Δ Fís−Fin</th>
                <th className="text-center p-3 text-slate-400 text-xs">Estado</th>
                <th className="text-center p-3 text-slate-400 text-xs">Reporte</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr><td colSpan={13} className="p-8 text-center text-slate-500">Sin obras con datos</td></tr>
              ) : filtradas.map(f => (
                <>
                  <tr key={f.nombre} className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer" onClick={() => setExpandida(expandida === f.nombre ? null : f.nombre)}>
                    <td className="p-3 text-white font-medium flex items-center gap-2">
                      {expandida === f.nombre ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                      {f.nombre}
                    </td>
                    <td className="p-3 text-right text-cyan-300">{fmt(f.presupuesto)}</td>
                    <td className="p-3 text-right text-orange-300">{fmt(f.gastoOC)}</td>
                    <td className="p-3 text-right text-violet-300">{fmt(f.gastoNomina)}</td>
                    <td className="p-3 text-right text-white font-medium">{fmt(f.gastoTotal)}</td>
                    <td className="p-3 text-right text-emerald-300">{fmt(f.cobrado)}</td>
                    <td className={`p-3 text-right font-medium ${f.margen >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{fmt(f.margen)}</td>
                    <td className={`p-3 text-right font-medium ${f.saldo >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{fmt(f.saldo)}</td>
                    <td className="p-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-white text-xs font-medium">{f.avance.toFixed(1)}%</span>
                        <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div className={`h-full ${f.semaforo === "REBASADO" ? "bg-rose-500" : f.semaforo === "ROJO" ? "bg-red-400" : f.semaforo === "AMARILLO" ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${Math.min(f.avance, 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {f.pctFisico !== null ? (
                        <div className="flex flex-col items-center">
                          <span className="text-emerald-300 text-xs font-medium">{f.pctFisico.toFixed(1)}%</span>
                          <span className="text-[9px] text-slate-500">{f.semanaFisico}</span>
                        </div>
                      ) : <span className="text-slate-600 text-xs">—</span>}
                    </td>
                    <td className="p-3 text-center">
                      {f.deltaFisFin !== null ? (
                        <span className={`text-xs font-medium ${f.deltaFisFin >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                          {f.deltaFisFin >= 0 ? "+" : ""}{f.deltaFisFin.toFixed(1)}%
                        </span>
                      ) : <span className="text-slate-600 text-xs">—</span>}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${semColor[f.semaforo]}`}>{semLabel[f.semaforo]}</span>
                    </td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <a href={`/dashboard/obras/reporte?obra=${encodeURIComponent(f.nombre)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 text-[10px]">
                        <FileText className="w-3 h-3" /> PDF
                      </a>
                      <a href={`/dashboard/obras/bitacora?obra=${encodeURIComponent(f.nombre)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-[10px] ml-1">
                        Bitácora
                      </a>
                      <a
                        href={`/api/obras/export-excel?obra=${encodeURIComponent(f.nombre)}`}
                        onClick={(e) => {
                          const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") : null;
                          if (!email) return;
                          e.preventDefault();
                          fetch(`/api/obras/export-excel?obra=${encodeURIComponent(f.nombre)}`, { headers: { "x-user-email": email } })
                            .then(r => r.blob())
                            .then(b => {
                              const url = URL.createObjectURL(b);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `reporte-${f.nombre}-${new Date().toISOString().slice(0,10)}.xlsx`;
                              a.click();
                              URL.revokeObjectURL(url);
                            });
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 text-[10px] ml-1"
                      >
                        Excel
                      </a>
                    </td>
                  </tr>
                  {expandida === f.nombre && (
                    <tr key={f.nombre + "_d"} className="bg-slate-900/40 border-b border-white/5">
                      <td colSpan={13} className="p-4">
                        <p className="text-slate-400 text-xs uppercase mb-2">Presupuesto por categoría</p>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                          {CATS.map(c => (
                            <div key={c} className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                              <p className="text-[10px] text-slate-500">{c.replace("_", " ")}</p>
                              <p className="text-xs text-white font-medium">{fmt(f.presupuestoCat[c] || 0)}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-slate-500 text-[10px] mt-3">
                          MATERIALES/HERRAMIENTA/SUBCONTRATO se compara contra Gasto OC ({fmt(f.gastoOC)}) ·
                          MANO_OBRA se compara contra Gasto Nómina ({fmt(f.gastoNomina)})
                        </p>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-start gap-3">
        <TrendingUp className="w-5 h-5 text-blue-400 mt-0.5" />
        <div className="text-xs text-slate-400">
          <p className="text-blue-300 font-medium mb-1">Cómo se calcula</p>
          <p><b>Presupuesto:</b> suma de partidas en /obras/presupuestos por obra. <b>Gasto OC:</b> suma de purchase_orders no canceladas asociadas vía requisición a la obra (cost_center_name). <b>Gasto Nómina:</b> suma de sueldo_neto en nomina_historico por obra. <b>Cobrado:</b> suma de (monto - saldo) en cobros_manuales no canceladas vinculadas a la obra del catálogo. <b>Margen Real:</b> Cobrado − Gasto Total. <b>Avance Fin:</b> Gasto Total / Presupuesto. <b>Avance Físico:</b> último % capturado en /obras/avance por obra. <b>Δ Fís−Fin:</b> avance físico − avance financiero (positivo = obra adelantada al gasto, negativo = sobrecosto encubierto).</p>
        </div>
      </div>
    </div>
  );
}
