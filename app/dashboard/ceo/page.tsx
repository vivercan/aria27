"use client";
import AriaBackButton from "@/components/AriaBackButton";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Loader2, TrendingUp, AlertTriangle, DollarSign, Wallet, Building2,
  FileText, ShoppingCart, Activity, RefreshCw,
} from "lucide-react";
import { formatMoneyShort as fmt, fmt as fmt2 } from "@/lib/format-utils";

interface Cot { id: string; folio: string | null; cliente_nombre: string; total: number; estatus: string; fecha: string; vigencia_dias: number; }
interface Cob { obra_nombre: string | null; cliente_nombre: string; monto: number; saldo: number; estatus: string; fecha: string; }
interface PO { id: string; total: number; status: string; created_at: string; requisition_id: string | null; po_number?: string | null; }
interface Req { id: string; cost_center_name: string | null; }
interface Nom { obra: string | null; sueldo_neto: number; status: string; semana_iso: string | null; }
interface Part { obra_nombre: string; importe: number; }
interface Av { obra_nombre: string; semana_iso: string; pct_fisico: number; }

function isThisMonth(iso: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
}

export default function CeoDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [cots, setCots] = useState<Cot[]>([]);
  const [cobs, setCobs] = useState<Cob[]>([]);
  const [pos, setPos] = useState<PO[]>([]);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [nom, setNom] = useState<Nom[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [avs, setAvs] = useState<Av[]>([]);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const [c, co, p, r, n, pp, a] = await Promise.all([
        supabase.from("cotizaciones_clientes").select("id,folio,cliente_nombre,total,estatus,fecha,vigencia_dias").order("fecha", { ascending: false }),
        supabase.from("cobros_manuales").select("obra_nombre,cliente_nombre,monto,saldo,estatus,fecha").neq("estatus", "CANCELADO"),
        supabase.from("purchase_orders").select("id,po_number,total,status,created_at,requisition_id"),
        supabase.from("requisitions").select("id,cost_center_name"),
        supabase.from("nomina_historico").select("obra,sueldo_neto,status,semana_iso").eq("status", "CONFIRMADA"),
        supabase.from("presupuestos_partidas").select("obra_nombre,importe"),
        supabase.from("obra_avances").select("obra_nombre,semana_iso,pct_fisico").order("semana_iso", { ascending: false }),
      ]);
      setCots((c.data as any[]) || []);
      setCobs((co.data as any[]) || []);
      setPos((p.data as any[]) || []);
      setReqs((r.data as any[]) || []);
      setNom((n.data as any[]) || []);
      setParts((pp.data as any[]) || []);
      setAvs((a.data as any[]) || []);
    } catch (e) { /* error handled */ }
    setLoading(false);
  }

  const reqMap = useMemo(() => {
    const m = new Map<string, string>();
    reqs.forEach(r => { if (r.cost_center_name) m.set(r.id, r.cost_center_name); });
    return m;
  }, [reqs]);

  // KPIs globales
  const kpis = useMemo(() => {
    const hoy = new Date().toISOString().split("T")[0];
    const cotsVigentes = cots.filter(c => {
      if (["CANCELADA", "RECHAZADA", "APROBADA", "VENCIDA"].includes(c.estatus)) return false;
      const limite = new Date(c.fecha);
      limite.setDate(limite.getDate() + (c.vigencia_dias || 30));
      return limite.toISOString().split("T")[0] >= hoy;
    });
    const cotsAprobadas = cots.filter(c => c.estatus === "APROBADA");
    const cotsVencidas = cots.filter(c => {
      if (c.estatus === "VENCIDA") return true;
      if (["BORRADOR", "ENVIADA"].includes(c.estatus)) {
        const limite = new Date(c.fecha);
        limite.setDate(limite.getDate() + (c.vigencia_dias || 30));
        return limite.toISOString().split("T")[0] < hoy;
      }
      return false;
    });
    const pipelineMonto = cotsVigentes.reduce((s, c) => s + Number(c.total || 0), 0);
    const aprobadoMonto = cotsAprobadas.reduce((s, c) => s + Number(c.total || 0), 0);
    const cobradoTotal = cobs.reduce((s, c) => s + (Number(c.monto) - Number(c.saldo) || 0), 0);
    const porCobrarTotal = cobs.reduce((s, c) => s + (Number(c.saldo) || 0), 0);
    const gastoOCMes = pos.filter(p => p.status !== "CANCELADA" && isThisMonth(p.created_at)).reduce((s, p) => s + Number(p.total || 0), 0);
    const gastoOCTotal = pos.filter(p => p.status !== "CANCELADA").reduce((s, p) => s + Number(p.total || 0), 0);
    const gastoNomTotal = nom.reduce((s, x) => s + Number(x.sueldo_neto || 0), 0);
    const gastoTotal = gastoOCTotal + gastoNomTotal;
    const margenTotal = cobradoTotal - gastoTotal;
    return {
      pipelineMonto, pipelineCount: cotsVigentes.length,
      aprobadoMonto, aprobadoCount: cotsAprobadas.length,
      cobradoTotal, porCobrarTotal,
      gastoOCMes, gastoOCTotal, gastoNomTotal, gastoTotal,
      margenTotal,
      cotsVencidas,
    };
  }, [cots, cobs, pos, nom]);

  // Margen real por obra
  const ultFis = useMemo(() => {
    const m = new Map<string, { pct: number; semana: string }>();
    for (const a of avs) {
      const ex = m.get(a.obra_nombre);
      if (!ex || a.semana_iso > ex.semana) m.set(a.obra_nombre, { pct: Number(a.pct_fisico) || 0, semana: a.semana_iso });
    }
    return m;
  }, [avs]);

  const obras = useMemo(() => {
    const set = new Set<string>();
    parts.forEach(p => p.obra_nombre && set.add(p.obra_nombre));
    pos.forEach(po => { const o = po.requisition_id ? reqMap.get(po.requisition_id) : null; if (o) set.add(o); });
    nom.forEach(n => n.obra && set.add(n.obra));
    cobs.forEach(c => c.obra_nombre && set.add(c.obra_nombre));
    avs.forEach(a => a.obra_nombre && set.add(a.obra_nombre));
    return Array.from(set).map(nombre => {
      const presupuesto = parts.filter(p => p.obra_nombre === nombre).reduce((s, p) => s + Number(p.importe || 0), 0);
      const gastoOC = pos.filter(p => p.status !== "CANCELADA" && p.requisition_id && reqMap.get(p.requisition_id) === nombre).reduce((s, p) => s + Number(p.total || 0), 0);
      const gastoNom = nom.filter(n => n.obra === nombre).reduce((s, n) => s + Number(n.sueldo_neto || 0), 0);
      const gastoTotal = gastoOC + gastoNom;
      const cobs2 = cobs.filter(c => c.obra_nombre === nombre);
      const cobrado = cobs2.reduce((s, c) => s + (Number(c.monto) - Number(c.saldo) || 0), 0);
      const margen = cobrado - gastoTotal;
      const avFin = presupuesto > 0 ? (gastoTotal / presupuesto) * 100 : 0;
      const fis = ultFis.get(nombre);
      const delta = fis && presupuesto > 0 ? (fis.pct - avFin) : null;
      const rebasada = presupuesto > 0 && gastoTotal > presupuesto;
      return { nombre, presupuesto, gastoTotal, cobrado, margen, avFin, pctFis: fis?.pct ?? null, delta, rebasada };
    });
  }, [parts, pos, reqMap, nom, cobs, avs, ultFis]);

  const topMargen = useMemo(() => [...obras].sort((a, b) => b.margen - a.margen).slice(0, 5), [obras]);
  const obrasRebasadas = useMemo(() => obras.filter(o => o.rebasada), [obras]);
  const obrasDeltaNeg = useMemo(() => obras.filter(o => o.delta !== null && (o.delta as number) < -10), [obras]);
  const ocGrandesPend = useMemo(() => pos.filter(p => ["BORRADOR", "PENDIENTE", "PENDING", "ENVIADA"].includes(p.status) && Number(p.total || 0) >= 50000), [pos]);

  // Flujo caja 12 semanas: cobranza vs gasto OC por semana ISO
  const flujoCaja = useMemo(() => {
    const semanas: string[] = [];
    const hoy = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(d.getDate() - i * 7);
      const y = d.getFullYear();
      const start = new Date(y, 0, 1);
      const days = Math.floor((d.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      const week = Math.ceil((days + start.getDay() + 1) / 7);
      semanas.push(`${y}-W${String(week).padStart(2, "0")}`);
    }
    const cobroPorSem = new Map<string, number>();
    const gastoPorSem = new Map<string, number>();
    cobs.forEach(c => {
      if (!c.fecha) return;
      const d = new Date(c.fecha);
      const y = d.getFullYear();
      const start = new Date(y, 0, 1);
      const days = Math.floor((d.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      const week = Math.ceil((days + start.getDay() + 1) / 7);
      const key = `${y}-W${String(week).padStart(2, "0")}`;
      cobroPorSem.set(key, (cobroPorSem.get(key) || 0) + (Number(c.monto) - Number(c.saldo)));
    });
    pos.filter(p => p.status !== "CANCELADA").forEach(p => {
      const d = new Date(p.created_at);
      const y = d.getFullYear();
      const start = new Date(y, 0, 1);
      const days = Math.floor((d.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      const week = Math.ceil((days + start.getDay() + 1) / 7);
      const key = `${y}-W${String(week).padStart(2, "0")}`;
      gastoPorSem.set(key, (gastoPorSem.get(key) || 0) + Number(p.total || 0));
    });
    const maxVal = Math.max(
      ...semanas.map(s => Math.max(cobroPorSem.get(s) || 0, gastoPorSem.get(s) || 0)),
      1,
    );
    return semanas.map(s => ({
      semana: s.slice(5),
      cobro: cobroPorSem.get(s) || 0,
      gasto: gastoPorSem.get(s) || 0,
      maxVal,
    }));
  }, [cobs, pos]);

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-slate-950 via-slate-950/95 to-transparent pb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <AriaBackButton href="/dashboard" />
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20">
            <Activity className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard CEO</h1>
            <p className="text-slate-400 text-sm">Vista ejecutiva consolidada — pipeline, cobranza, gasto, margen real y alertas</p>
          </div>
        </div>
        <button onClick={cargar} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10">
          <RefreshCw className="w-4 h-4" /> Refrescar
        </button>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={<FileText className="w-5 h-5" />} label="Pipeline vigente" value={fmt(kpis.pipelineMonto)} sub={`${kpis.pipelineCount} cotizaciones`} color="blue" />
        <KpiCard icon={<TrendingUp className="w-5 h-5" />} label="Aprobado" value={fmt(kpis.aprobadoMonto)} sub={`${kpis.aprobadoCount} cotizaciones`} color="emerald" />
        <KpiCard icon={<Wallet className="w-5 h-5" />} label="Cobrado" value={fmt(kpis.cobradoTotal)} sub="histórico" color="teal" />
        <KpiCard icon={<DollarSign className="w-5 h-5" />} label="Por cobrar" value={fmt(kpis.porCobrarTotal)} sub="saldo pendiente" color="amber" />
        <KpiCard icon={<ShoppingCart className="w-5 h-5" />} label="Gasto OC del mes" value={fmt(kpis.gastoOCMes)} sub={`OC total ${fmt(kpis.gastoOCTotal)}`} color="orange" />
        <KpiCard icon={<Activity className="w-5 h-5" />} label="Margen Real" value={fmt(kpis.margenTotal)} sub={kpis.margenTotal >= 0 ? "positivo" : "negativo"} color={kpis.margenTotal >= 0 ? "emerald" : "rose"} />
      </div>

      {/* Alertas */}
      {(obrasRebasadas.length > 0 || obrasDeltaNeg.length > 0 || kpis.cotsVencidas.length > 0 || ocGrandesPend.length > 0) && (
        <div className="rounded-2xl bg-rose-500/5 border border-rose-500/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <h2 className="text-lg font-bold text-rose-200">Alertas operativas</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <AlertBox title="Obras rebasadas" count={obrasRebasadas.length} items={obrasRebasadas.map(o => `${o.nombre} (${fmt(o.gastoTotal - o.presupuesto)} sobre ppto)`)} link="/dashboard/obras/control" />
            <AlertBox title="Δ Físico−Fin < −10%" count={obrasDeltaNeg.length} items={obrasDeltaNeg.map(o => `${o.nombre} (${(o.delta as number).toFixed(1)}%)`)} link="/dashboard/obras/control" />
            <AlertBox title="Cotizaciones vencidas" count={kpis.cotsVencidas.length} items={kpis.cotsVencidas.slice(0, 5).map(c => `${c.folio || c.id.slice(0, 6)} · ${c.cliente_nombre} · ${fmt(Number(c.total))}`)} link="/dashboard/clientes/cotizaciones" />
            <AlertBox title="OC ≥ $50k sin autorizar" count={ocGrandesPend.length} items={ocGrandesPend.slice(0, 5).map(p => `${p.po_number || p.id.slice(0, 6)} · ${fmt(Number(p.total))}`)} link="/dashboard/requisiciones/requisiciones/ordenes" />
          </div>
        </div>
      )}

      {/* Flujo caja 12 semanas */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-bold text-white">Flujo de caja · últimas 12 semanas</h2>
          <span className="ml-auto text-xs text-slate-500">verde=cobros · naranja=gasto OC</span>
        </div>
        <div className="grid grid-cols-12 gap-2 items-end h-40">
          {flujoCaja.map((f, i) => (
            <div key={i} className="flex flex-col items-center gap-1 h-full">
              <div className="flex-1 w-full flex gap-0.5 items-end">
                <div className="flex-1 bg-emerald-500/60 rounded-t" style={{ height: `${(f.cobro / f.maxVal) * 100}%` }} title={`Cobrado: ${fmt(f.cobro)}`} />
                <div className="flex-1 bg-orange-500/60 rounded-t" style={{ height: `${(f.gasto / f.maxVal) * 100}%` }} title={`Gasto OC: ${fmt(f.gasto)}`} />
              </div>
              <p className="text-[9px] text-slate-500">{f.semana}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top obras por margen */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-white">Top 5 obras por margen real</h2>
        </div>
        {topMargen.length === 0 ? (
          <p className="p-8 text-center text-slate-500 text-sm">Sin obras con datos.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-slate-900/40">
                <th className="text-left p-3 text-slate-400 text-xs">Obra</th>
                <th className="text-right p-3 text-slate-400 text-xs">Presupuesto</th>
                <th className="text-right p-3 text-slate-400 text-xs">Gasto Total</th>
                <th className="text-right p-3 text-slate-400 text-xs">Cobrado</th>
                <th className="text-right p-3 text-slate-400 text-xs">Margen Real</th>
                <th className="text-center p-3 text-slate-400 text-xs">Av Fin</th>
                <th className="text-center p-3 text-slate-400 text-xs">Av Fís</th>
              </tr>
            </thead>
            <tbody>
              {topMargen.map(o => (
                <tr key={o.nombre} className="border-b border-white/5">
                  <td className="p-3 text-white font-medium">{o.nombre}</td>
                  <td className="p-3 text-right text-cyan-300">{fmt2(o.presupuesto)}</td>
                  <td className="p-3 text-right text-orange-300">{fmt2(o.gastoTotal)}</td>
                  <td className="p-3 text-right text-emerald-300">{fmt2(o.cobrado)}</td>
                  <td className={`p-3 text-right font-bold ${o.margen >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{fmt2(o.margen)}</td>
                  <td className="p-3 text-center text-slate-300 text-xs">{o.avFin.toFixed(1)}%</td>
                  <td className="p-3 text-center text-emerald-300 text-xs">{o.pctFis !== null ? o.pctFis.toFixed(1) + "%" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-slate-400">
        Vista ejecutiva consolidada. Pipeline = cotizaciones BORRADOR/ENVIADA dentro de vigencia. Aprobado = cotizaciones APROBADA. Cobrado/Por cobrar = suma sobre cobros_manuales no canceladas. Gasto OC del mes = purchase_orders no canceladas creadas en el mes actual. Margen Real = Cobrado − (Gasto OC + Nómina CONFIRMADA). Alertas: rebasadas = gasto mayor a presupuesto; delta Fis-Fin menor a -10% = obra atrasada vs gasto.
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  const map: Record<string, string> = {
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-300",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
    teal: "bg-teal-500/10 border-teal-500/20 text-teal-300",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-300",
    orange: "bg-orange-500/10 border-orange-500/20 text-orange-300",
    rose: "bg-rose-500/10 border-rose-500/20 text-rose-300",
  };
  return (
    <div className={`p-4 rounded-xl border ${map[color] || map.blue}`}>
      <div className="flex items-center gap-2 mb-2 opacity-80">{icon}<span className="text-[11px] uppercase tracking-wide">{label}</span></div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[10px] text-slate-500 mt-1">{sub}</p>
    </div>
  );
}

function AlertBox({ title, count, items, link }: { title: string; count: number; items: string[]; link: string }) {
  return (
    <Link href={link} className="block p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.05] transition">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-400 uppercase">{title}</p>
        <span className={`text-2xl font-bold ${count > 0 ? "text-rose-300" : "text-emerald-300"}`}>{count}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-600">— sin items —</p>
      ) : (
        <ul className="space-y-1">
          {items.slice(0, 5).map((it, i) => <li key={i} className="text-[11px] text-slate-300 truncate">• {it}</li>)}
        </ul>
      )}
    </Link>
  );
}
