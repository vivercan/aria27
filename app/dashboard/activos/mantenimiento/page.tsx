"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus, Search, Edit2, Trash2, Check, XCircle,
  Loader2, Wrench, AlertTriangle, Calendar, ClipboardList,
  Clock, CheckCircle2, Settings, Package, DollarSign, Play,
} from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";
import ConfirmModal from "@/components/ConfirmModal";

/* ────────── types ────────── */
interface Orden {
  id: string; folio: string; activo_id: string; programa_id: string | null;
  tipo: string; prioridad: string; descripcion: string; diagnostico: string | null;
  fecha_solicitud: string; fecha_programada: string | null; fecha_inicio: string | null; fecha_fin: string | null;
  responsable: string | null; proveedor: string | null;
  costo_estimado: number; costo_real: number;
  km_actual: number | null; horas_actual: number | null;
  estatus: string; observaciones: string | null;
  created_at: string; activo_nombre?: string;
}
interface Programa {
  id: string; activo_id: string; nombre: string; tipo: string;
  frecuencia_dias: number; frecuencia_km: number | null; descripcion: string | null;
  proveedor: string | null; costo_estimado: number;
  ultima_ejecucion: string | null; proxima_ejecucion: string | null; activo: boolean;
  created_at: string; activo_nombre?: string;
}
interface Activo { id: string; nombre: string; tipo: string | null; ubicacion: string | null; }

/* ────────── constants ────────── */
const TABS = ["Órdenes", "Programas", "Historial"] as const;
type Tab = typeof TABS[number];

const TIPO_ORDEN = ["PREVENTIVO", "CORRECTIVO", "PREDICTIVO", "EMERGENCIA"] as const;
const PRIORIDAD = ["BAJA", "NORMAL", "ALTA", "URGENTE"] as const;
const ESTATUS_ORDEN = ["ABIERTA", "EN_PROCESO", "COMPLETADA", "CANCELADA", "ESPERANDO_REFACCIONES"] as const;

const PRIO_COLORS: Record<string, string> = {
  BAJA: "bg-slate-500/20 text-slate-400", NORMAL: "bg-aria-primary-light text-aria-accent",
  ALTA: "bg-amber-500/20 text-amber-400", URGENTE: "bg-red-500/20 text-red-400",
};
const EST_COLORS: Record<string, string> = {
  ABIERTA: "bg-aria-primary-light text-aria-accent", EN_PROCESO: "bg-amber-500/20 text-amber-400",
  COMPLETADA: "bg-emerald-500/20 text-emerald-400", CANCELADA: "bg-slate-500/20 text-slate-400",
  ESPERANDO_REFACCIONES: "bg-purple-500/20 text-purple-400",
};
const TIPO_COLORS: Record<string, string> = {
  PREVENTIVO: "bg-emerald-500/20 text-emerald-400", CORRECTIVO: "bg-red-500/20 text-red-400",
  PREDICTIVO: "bg-aria-accent-bg text-aria-accent", EMERGENCIA: "bg-red-600/30 text-red-300",
};

const ORDEN_INIT = {
  activo_id: "", tipo: "CORRECTIVO", prioridad: "NORMAL", descripcion: "",
  diagnostico: "", fecha_programada: "", responsable: "", proveedor: "",
  costo_estimado: "", km_actual: "", horas_actual: "", observaciones: "",
};
const PROG_INIT = {
  activo_id: "", nombre: "", tipo: "PREVENTIVO", frecuencia_dias: "30",
  frecuencia_km: "", descripcion: "", proveedor: "", costo_estimado: "",
};

const fmt = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
const fmtDate = (d: string | null) => { if (!d) return "—"; try { return new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }); } catch { return d; } };
const diasPara = (d: string | null) => { if (!d) return null; return Math.ceil((new Date(d + "T12:00:00").getTime() - Date.now()) / 86400000); };

/* ────────── component ────────── */
export default function MantenimientoPage() {
  const [tab, setTab] = useState<Tab>("Órdenes");
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [activos, setActivos] = useState<Activo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("TODOS");
  const [filterEstatus, setFilterEstatus] = useState("TODOS");

  const [showOrdenForm, setShowOrdenForm] = useState(false);
  const [ordenForm, setOrdenForm] = useState(ORDEN_INIT);
  const [editOrdenId, setEditOrdenId] = useState<string | null>(null);
  const [showProgForm, setShowProgForm] = useState(false);
  const [progForm, setProgForm] = useState(PROG_INIT);
  const [editProgId, setEditProgId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; msg: string; onOk: () => void }>({ open: false, msg: "", onOk: () => {} });
  const flash = (tipo: "ok" | "err", texto: string) => { setMsg({ tipo, texto }); setTimeout(() => setMsg(null), 3200); };

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [oRes, pRes, aRes] = await Promise.all([
      supabase.from("mantenimiento_ordenes").select("*").order("fecha_solicitud", { ascending: false }),
      supabase.from("mantenimiento_programas").select("*").order("proxima_ejecucion"),
      supabase.from("activos").select("id, nombre, tipo, ubicacion").order("nombre"),
    ]);
    const activosArr = (aRes.data || []) as Activo[];
    const aMap = Object.fromEntries(activosArr.map(a => [a.id, a.nombre]));
    setOrdenes((oRes.data || []).map((o: any) => ({ ...o, activo_nombre: aMap[o.activo_id] || "?" })));
    setProgramas((pRes.data || []).map((p: any) => ({ ...p, activo_nombre: aMap[p.activo_id] || "?" })));
    setActivos(activosArr);
    setLoading(false);
  }

  /* ── stats ── */
  const stats = useMemo(() => {
    const abiertas = ordenes.filter(o => o.estatus === "ABIERTA" || o.estatus === "EN_PROCESO" || o.estatus === "ESPERANDO_REFACCIONES").length;
    const completadas = ordenes.filter(o => o.estatus === "COMPLETADA").length;
    const urgentes = ordenes.filter(o => (o.prioridad === "URGENTE" || o.tipo === "EMERGENCIA") && o.estatus !== "COMPLETADA" && o.estatus !== "CANCELADA").length;
    const costoMes = ordenes.filter(o => {
      const d = new Date(); const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return o.fecha_solicitud.startsWith(m);
    }).reduce((s, o) => s + Number(o.costo_real), 0);
    const progVencidos = programas.filter(p => p.activo && p.proxima_ejecucion && diasPara(p.proxima_ejecucion)! < 0).length;
    const progProx = programas.filter(p => p.activo && p.proxima_ejecucion && diasPara(p.proxima_ejecucion)! >= 0 && diasPara(p.proxima_ejecucion)! <= 7).length;
    return { abiertas, completadas, urgentes, costoMes, progVencidos, progProx };
  }, [ordenes, programas]);

  /* ── CRUD Órdenes ── */
  async function guardarOrden() {
    if (!ordenForm.activo_id) { flash("err", "Selecciona un activo"); return; }
    if (!ordenForm.descripcion.trim()) { flash("err", "Descripción requerida"); return; }
    const costo = parseFloat(ordenForm.costo_estimado);
    if (isNaN(costo) || costo < 0) { flash("err", "Costo estimado no puede ser negativo"); return; }
    setSaving(true);
    const payload: any = {
      activo_id: ordenForm.activo_id,
      tipo: ordenForm.tipo,
      prioridad: ordenForm.prioridad,
      descripcion: ordenForm.descripcion.trim(),
      diagnostico: ordenForm.diagnostico || null,
      fecha_programada: ordenForm.fecha_programada || null,
      responsable: ordenForm.responsable || null,
      proveedor: ordenForm.proveedor || null,
      costo_estimado: parseFloat(ordenForm.costo_estimado) || 0,
      km_actual: ordenForm.km_actual ? parseInt(ordenForm.km_actual) : null,
      horas_actual: ordenForm.horas_actual ? parseInt(ordenForm.horas_actual) : null,
      observaciones: ordenForm.observaciones || null,
    };
    if (editOrdenId) {
      const { error } = await supabase.from("mantenimiento_ordenes").update(payload).eq("id", editOrdenId);
      if (error) { flash("err", error.message); setSaving(false); return; }
      flash("ok", "Orden actualizada");
    } else {
      payload.folio = `OT-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
      payload.fecha_solicitud = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("mantenimiento_ordenes").insert(payload);
      if (error) { flash("err", error.message); setSaving(false); return; }
      flash("ok", `Orden ${payload.folio} creada`);
    }
    setShowOrdenForm(false); setEditOrdenId(null); setOrdenForm(ORDEN_INIT);
    setSaving(false); loadAll();
  }

  function editarOrden(o: Orden) {
    setOrdenForm({
      activo_id: o.activo_id, tipo: o.tipo, prioridad: o.prioridad,
      descripcion: o.descripcion, diagnostico: o.diagnostico || "",
      fecha_programada: o.fecha_programada || "", responsable: o.responsable || "",
      proveedor: o.proveedor || "", costo_estimado: String(o.costo_estimado),
      km_actual: o.km_actual ? String(o.km_actual) : "",
      horas_actual: o.horas_actual ? String(o.horas_actual) : "",
      observaciones: o.observaciones || "",
    });
    setEditOrdenId(o.id); setShowOrdenForm(true);
  }

  async function cambiarEstatus(o: Orden, nuevoEstatus: string) {
    const payload: any = { estatus: nuevoEstatus };
    if (nuevoEstatus === "EN_PROCESO" && !o.fecha_inicio) payload.fecha_inicio = new Date().toISOString().slice(0, 10);
    if (nuevoEstatus === "COMPLETADA") payload.fecha_fin = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("mantenimiento_ordenes").update(payload).eq("id", o.id);
    if (error) flash("err", error.message); else { flash("ok", `Orden ${o.folio} → ${nuevoEstatus}`); loadAll(); }
  }

  async function eliminarOrden(id: string) {
    setConfirmState({
      open: true,
      msg: "¿Eliminar esta orden de trabajo?",
      onOk: async () => {
        const { error } = await supabase.from("mantenimiento_ordenes").delete().eq("id", id);
        if (error) flash("err", error.message); else { flash("ok", "Orden eliminada"); loadAll(); }
      }
    });
  }

  /* ── CRUD Programas ── */
  async function guardarProg() {
    if (!progForm.activo_id) { flash("err", "Selecciona un activo"); return; }
    if (!progForm.nombre.trim()) { flash("err", "Nombre del programa requerido"); return; }
    const freq = parseInt(progForm.frecuencia_dias);
    if (!freq || freq <= 0) { flash("err", "Frecuencia en días debe ser > 0"); return; }
    const costo = parseFloat(progForm.costo_estimado);
    if (isNaN(costo) || costo < 0) { flash("err", "Costo estimado no puede ser negativo"); return; }
    setSaving(true);
    const payload: any = {
      activo_id: progForm.activo_id,
      nombre: progForm.nombre.trim(),
      tipo: progForm.tipo,
      frecuencia_dias: freq,
      frecuencia_km: progForm.frecuencia_km ? parseInt(progForm.frecuencia_km) : null,
      descripcion: progForm.descripcion || null,
      proveedor: progForm.proveedor || null,
      costo_estimado: parseFloat(progForm.costo_estimado) || 0,
    };
    if (!editProgId) {
      payload.proxima_ejecucion = new Date(Date.now() + freq * 86400000).toISOString().slice(0, 10);
    }
    if (editProgId) {
      const { error } = await supabase.from("mantenimiento_programas").update(payload).eq("id", editProgId);
      if (error) { flash("err", error.message); setSaving(false); return; }
      flash("ok", "Programa actualizado");
    } else {
      const { error } = await supabase.from("mantenimiento_programas").insert(payload);
      if (error) { flash("err", error.message); setSaving(false); return; }
      flash("ok", "Programa preventivo creado");
    }
    setShowProgForm(false); setEditProgId(null); setProgForm(PROG_INIT);
    setSaving(false); loadAll();
  }

  function editarProg(p: Programa) {
    setProgForm({
      activo_id: p.activo_id, nombre: p.nombre, tipo: p.tipo,
      frecuencia_dias: String(p.frecuencia_dias),
      frecuencia_km: p.frecuencia_km ? String(p.frecuencia_km) : "",
      descripcion: p.descripcion || "", proveedor: p.proveedor || "",
      costo_estimado: String(p.costo_estimado),
    });
    setEditProgId(p.id); setShowProgForm(true);
  }

  async function toggleProg(p: Programa) {
    const { error } = await supabase.from("mantenimiento_programas").update({ activo: !p.activo, updated_at: new Date().toISOString() }).eq("id", p.id);
    if (error) flash("err", error.message); else { flash("ok", p.activo ? "Programa pausado" : "Programa activado"); loadAll(); }
  }

  async function generarOrdenDesdePrograma(p: Programa) {
    const folio = `OT-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const { error } = await supabase.from("mantenimiento_ordenes").insert({
      folio,
      activo_id: p.activo_id,
      programa_id: p.id,
      tipo: "PREVENTIVO",
      prioridad: "NORMAL",
      descripcion: `${p.nombre} — Mantenimiento preventivo programado`,
      fecha_solicitud: new Date().toISOString().slice(0, 10),
      fecha_programada: p.proxima_ejecucion,
      proveedor: p.proveedor,
      costo_estimado: p.costo_estimado,
      estatus: "ABIERTA",
    });
    if (error) flash("err", error.message); else { flash("ok", `Orden ${folio} generada desde programa`); loadAll(); setTab("Órdenes"); }
  }

  /* ── filters ── */
  const filteredOrdenes = useMemo(() => {
    const q = search.toLowerCase();
    const base = tab === "Historial" ? ordenes.filter(o => o.estatus === "COMPLETADA" || o.estatus === "CANCELADA") : ordenes.filter(o => o.estatus !== "COMPLETADA" && o.estatus !== "CANCELADA");
    return base.filter(o =>
      (!q || o.folio.toLowerCase().includes(q) || o.descripcion.toLowerCase().includes(q) || (o.activo_nombre || "").toLowerCase().includes(q)) &&
      (filterTipo === "TODOS" || o.tipo === filterTipo) &&
      (filterEstatus === "TODOS" || o.estatus === filterEstatus)
    );
  }, [ordenes, search, filterTipo, filterEstatus, tab]);

  const filteredProgs = useMemo(() => {
    const q = search.toLowerCase();
    return programas.filter(p =>
      (!q || p.nombre.toLowerCase().includes(q) || (p.activo_nombre || "").toLowerCase().includes(q))
    );
  }, [programas, search]);

  const inputClass = "w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500/40";

  /* ────────── render ────────── */
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-none px-6 pt-6 pb-4 flex items-center gap-4">
        <AriaBackButton href="/dashboard/activos" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wrench className="w-6 h-6 text-orange-400" /> Mantenimiento de Activos
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Órdenes de trabajo · Programas preventivos · Historial</p>
        </div>
      </div>

      {msg && (
        <div className={`mx-6 px-4 py-2 rounded-lg text-sm flex-none ${msg.tipo === "ok" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
          {msg.texto}
        </div>
      )}

      {/* Stats */}
      <div className="flex-none px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: "OTs Abiertas", value: stats.abiertas, icon: ClipboardList, color: "text-aria-accent", bg: "bg-aria-primary/10" },
            { label: "Completadas", value: stats.completadas, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Urgentes", value: stats.urgentes, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
            { label: "Costo del Mes", value: fmt(stats.costoMes), icon: DollarSign, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Prog. Vencidos", value: stats.progVencidos, icon: Calendar, color: "text-red-400", bg: "bg-red-500/10" },
            { label: "Prog. Próx. 7d", value: stats.progProx, icon: Clock, color: "text-orange-400", bg: "bg-orange-500/10" },
          ].map(s => (
            <div key={s.label} className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
              <div className={`inline-flex p-1.5 rounded-lg ${s.bg} mb-1`}><s.icon className={`w-3.5 h-3.5 ${s.color}`} /></div>
              <p className="text-lg font-bold text-white">{s.value}</p>
              <p className="text-[11px] text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs + Filters */}
      <div className="flex-none px-6 pb-3 flex flex-col md:flex-row gap-2">
        <div className="flex gap-1">
          {TABS.map(t => (
            <button key={t} onClick={() => { setTab(t); setSearch(""); setFilterTipo("TODOS"); setFilterEstatus("TODOS"); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar folio, activo, descripción..." className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-orange-500/40" />
          </div>
          {tab !== "Programas" && (
            <>
              <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none">
                <option value="TODOS">Todos tipos</option>
                {TIPO_ORDEN.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {tab === "Órdenes" && (
                <select value={filterEstatus} onChange={e => setFilterEstatus(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none">
                  <option value="TODOS">Todos estatus</option>
                  {["ABIERTA","EN_PROCESO","ESPERANDO_REFACCIONES"].map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              )}
            </>
          )}
          <button onClick={() => {
            if (tab === "Programas") { setProgForm(PROG_INIT); setEditProgId(null); setShowProgForm(true); }
            else { setOrdenForm(ORDEN_INIT); setEditOrdenId(null); setShowOrdenForm(true); }
          }} className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
            <Plus className="w-4 h-4" />
            {tab === "Programas" ? "Nuevo Programa" : "Nueva OT"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-orange-400" /></div>
        ) : (
          <>
            {/* ══════ Órdenes / Historial Tab ══════ */}
            {(tab === "Órdenes" || tab === "Historial") && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
                    <tr className="text-left text-xs text-slate-400 border-b border-white/[0.06]">
                      <th className="px-3 py-2.5">Folio</th>
                      <th className="px-3 py-2.5">Activo</th>
                      <th className="px-3 py-2.5">Tipo</th>
                      <th className="px-3 py-2.5">Prioridad</th>
                      <th className="px-3 py-2.5">Descripción</th>
                      <th className="px-3 py-2.5">Fechas</th>
                      <th className="px-3 py-2.5 text-right">Costo Est.</th>
                      <th className="px-3 py-2.5 text-right">Costo Real</th>
                      <th className="px-3 py-2.5">Estatus</th>
                      <th className="px-3 py-2.5 w-28">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrdenes.length === 0 ? (
                      <tr><td colSpan={10} className="text-center py-16 text-slate-500">
                        <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>{tab === "Historial" ? "Sin órdenes completadas." : "Sin órdenes abiertas."}</p>
                      </td></tr>
                    ) : filteredOrdenes.map(o => (
                      <tr key={o.id} className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${o.prioridad === "URGENTE" || o.tipo === "EMERGENCIA" ? "bg-red-500/[0.03]" : ""}`}>
                        <td className="px-3 py-2.5 text-white font-mono text-xs font-medium">{o.folio}</td>
                        <td className="px-3 py-2.5 text-slate-300 text-xs max-w-[120px] truncate">{o.activo_nombre}</td>
                        <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded text-[10px] font-medium ${TIPO_COLORS[o.tipo] || ""}`}>{o.tipo}</span></td>
                        <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${PRIO_COLORS[o.prioridad] || ""}`}>{o.prioridad}</span></td>
                        <td className="px-3 py-2.5 text-slate-300 text-xs max-w-[200px] truncate">{o.descripcion}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-400 whitespace-nowrap">
                          <p>Sol: {fmtDate(o.fecha_solicitud)}</p>
                          {o.fecha_programada && <p className="text-slate-500">Prog: {fmtDate(o.fecha_programada)}</p>}
                          {o.fecha_fin && <p className="text-emerald-400/70">Fin: {fmtDate(o.fecha_fin)}</p>}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-400 font-mono text-xs">{Number(o.costo_estimado) > 0 ? fmt(Number(o.costo_estimado)) : "—"}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs">
                          {Number(o.costo_real) > 0 ? <span className="text-white">{fmt(Number(o.costo_real))}</span> : <span className="text-slate-500">—</span>}
                        </td>
                        <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${EST_COLORS[o.estatus] || ""}`}>{o.estatus.replace(/_/g, " ")}</span></td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            {o.estatus === "ABIERTA" && (
                              <button onClick={() => cambiarEstatus(o, "EN_PROCESO")} className="p-1 bg-amber-500/10 hover:bg-amber-500/20 rounded text-amber-400" title="Iniciar"><Play className="w-3.5 h-3.5" /></button>
                            )}
                            {o.estatus === "EN_PROCESO" && (
                              <button onClick={() => cambiarEstatus(o, "COMPLETADA")} className="p-1 bg-emerald-500/10 hover:bg-emerald-500/20 rounded text-emerald-400" title="Completar"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                            )}
                            {o.estatus === "ESPERANDO_REFACCIONES" && (
                              <button onClick={() => cambiarEstatus(o, "EN_PROCESO")} className="p-1 bg-amber-500/10 hover:bg-amber-500/20 rounded text-amber-400" title="Reanudar"><Play className="w-3.5 h-3.5" /></button>
                            )}
                            <button onClick={() => editarOrden(o)} className="p-1 bg-aria-primary/10 hover:bg-aria-primary-light rounded text-aria-accent" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => eliminarOrden(o.id)} className="p-1 bg-red-500/10 hover:bg-red-500/20 rounded text-red-400" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {filteredOrdenes.length > 0 && (
                    <tfoot className="border-t border-white/[0.06]">
                      <tr className="text-xs font-medium">
                        <td colSpan={6} className="px-3 py-2.5 text-right text-slate-400">Totales:</td>
                        <td className="px-3 py-2.5 text-right text-slate-300 font-mono">{fmt(filteredOrdenes.reduce((s, o) => s + Number(o.costo_estimado), 0))}</td>
                        <td className="px-3 py-2.5 text-right text-white font-mono">{fmt(filteredOrdenes.reduce((s, o) => s + Number(o.costo_real), 0))}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {/* ══════ Programas Tab ══════ */}
            {tab === "Programas" && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProgs.length === 0 ? (
                  <div className="col-span-full text-center py-16 text-slate-500">
                    <Settings className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Sin programas preventivos.</p>
                  </div>
                ) : filteredProgs.map(p => {
                  const dias = diasPara(p.proxima_ejecucion);
                  const vencido = dias !== null && dias < 0;
                  const proximo = dias !== null && dias >= 0 && dias <= 7;
                  return (
                    <div key={p.id} className={`p-4 bg-white/[0.03] border rounded-xl transition-colors ${vencido ? "border-red-500/30" : proximo ? "border-orange-500/20" : "border-white/[0.06]"} ${!p.activo ? "opacity-50" : ""}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-sm font-semibold text-white">{p.nombre}</h3>
                          <p className="text-xs text-slate-400">{p.activo_nombre}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${p.activo ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"}`}>{p.activo ? "Activo" : "Pausado"}</span>
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-400 mb-3">
                        <p>Cada <span className="text-white">{p.frecuencia_dias} días</span>{p.frecuencia_km ? ` ó ${p.frecuencia_km.toLocaleString()} km` : ""}</p>
                        <p>Última: <span className="text-slate-300">{fmtDate(p.ultima_ejecucion)}</span></p>
                        <p>Próxima: <span className={vencido ? "text-red-400 font-medium" : proximo ? "text-orange-400 font-medium" : "text-white"}>{fmtDate(p.proxima_ejecucion)}</span>
                          {vencido && <span className="ml-1 text-red-400">¡VENCIDO {Math.abs(dias!)}d!</span>}
                          {proximo && <span className="ml-1 text-orange-400">({dias}d)</span>}
                        </p>
                        {p.proveedor && <p>Proveedor: {p.proveedor}</p>}
                        {Number(p.costo_estimado) > 0 && <p>Costo est: <span className="text-white">{fmt(Number(p.costo_estimado))}</span></p>}
                      </div>
                      <div className="flex gap-2 pt-3 border-t border-white/[0.06]">
                        <button onClick={() => generarOrdenDesdePrograma(p)} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 rounded-lg text-xs text-orange-400 transition-colors" disabled={!p.activo}>
                          <ClipboardList className="w-3 h-3" /> Generar OT
                        </button>
                        <button onClick={() => editarProg(p)} className="flex items-center gap-1 px-2 py-1.5 bg-aria-primary/10 hover:bg-aria-primary-light rounded-lg text-xs text-aria-accent transition-colors">
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button onClick={() => toggleProg(p)} className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors ${p.activo ? "bg-slate-500/10 hover:bg-slate-500/20 text-slate-400" : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"}`}>
                          {p.activo ? "Pausar" : "Activar"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal: Nueva/Editar Orden ── */}
      {showOrdenForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowOrdenForm(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-xl mx-4 max-h-[85vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h3 className="text-lg font-semibold text-white">{editOrdenId ? "Editar Orden de Trabajo" : "Nueva Orden de Trabajo"}</h3>
              <button onClick={() => setShowOrdenForm(false)} className="text-slate-400 hover:text-white"><XCircle className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Activo *</label>
                  <select value={ordenForm.activo_id} onChange={e => setOrdenForm({ ...ordenForm, activo_id: e.target.value })} required className={inputClass}>
                    <option value="">Seleccionar...</option>
                    {activos.map(a => <option key={a.id} value={a.id}>{a.nombre}{a.tipo ? ` (${a.tipo})` : ""}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Tipo *</label>
                  <select value={ordenForm.tipo} onChange={e => setOrdenForm({ ...ordenForm, tipo: e.target.value })} required className={inputClass}>
                    {TIPO_ORDEN.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Prioridad</label>
                  <select value={ordenForm.prioridad} onChange={e => setOrdenForm({ ...ordenForm, prioridad: e.target.value })} className={inputClass}>
                    {PRIORIDAD.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Fecha programada</label>
                  <input type="date" value={ordenForm.fecha_programada} onChange={e => setOrdenForm({ ...ordenForm, fecha_programada: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Descripción *</label>
                <textarea value={ordenForm.descripcion} onChange={e => setOrdenForm({ ...ordenForm, descripcion: e.target.value })} rows={2} placeholder="Describe el trabajo a realizar..." required className={inputClass + " resize-none"} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Diagnóstico</label>
                <input value={ordenForm.diagnostico} onChange={e => setOrdenForm({ ...ordenForm, diagnostico: e.target.value })} placeholder="Falla detectada..." className={inputClass} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Responsable</label>
                  <input value={ordenForm.responsable} onChange={e => setOrdenForm({ ...ordenForm, responsable: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Proveedor</label>
                  <input value={ordenForm.proveedor} onChange={e => setOrdenForm({ ...ordenForm, proveedor: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Costo estimado</label>
                  <input type="number" step="0.01" min="0" value={ordenForm.costo_estimado} onChange={e => setOrdenForm({ ...ordenForm, costo_estimado: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Km actual</label>
                  <input type="number" min="0" value={ordenForm.km_actual} onChange={e => setOrdenForm({ ...ordenForm, km_actual: e.target.value })} placeholder="Odómetro" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Horas actual</label>
                  <input type="number" min="0" value={ordenForm.horas_actual} onChange={e => setOrdenForm({ ...ordenForm, horas_actual: e.target.value })} placeholder="Horómetro" className={inputClass} />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Observaciones</label>
                <input value={ordenForm.observaciones} onChange={e => setOrdenForm({ ...ordenForm, observaciones: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-white/[0.06]">
              <button onClick={() => setShowOrdenForm(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancelar</button>
              <button onClick={guardarOrden} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editOrdenId ? "Actualizar" : "Crear OT"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Nuevo/Editar Programa ── */}
      {showProgForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowProgForm(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md mx-4 max-h-[85vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h3 className="text-lg font-semibold text-white">{editProgId ? "Editar Programa" : "Nuevo Programa Preventivo"}</h3>
              <button onClick={() => setShowProgForm(false)} className="text-slate-400 hover:text-white"><XCircle className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh]">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Activo *</label>
                <select value={progForm.activo_id} onChange={e => setProgForm({ ...progForm, activo_id: e.target.value })} required className={inputClass}>
                  <option value="">Seleccionar...</option>
                  {activos.map(a => <option key={a.id} value={a.id}>{a.nombre}{a.tipo ? ` (${a.tipo})` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Nombre del programa *</label>
                <input value={progForm.nombre} onChange={e => setProgForm({ ...progForm, nombre: e.target.value })} placeholder="Ej: Cambio de aceite" required className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Frecuencia (días) *</label>
                  <input type="number" min="1" required value={progForm.frecuencia_dias} onChange={e => setProgForm({ ...progForm, frecuencia_dias: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Frecuencia (km)</label>
                  <input type="number" min="0" value={progForm.frecuencia_km} onChange={e => setProgForm({ ...progForm, frecuencia_km: e.target.value })} placeholder="Opcional" className={inputClass} />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Descripción</label>
                <input value={progForm.descripcion} onChange={e => setProgForm({ ...progForm, descripcion: e.target.value })} placeholder="Detalle del mantenimiento..." className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Proveedor</label>
                  <input value={progForm.proveedor} onChange={e => setProgForm({ ...progForm, proveedor: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Costo estimado</label>
                  <input type="number" step="0.01" min="0" value={progForm.costo_estimado} onChange={e => setProgForm({ ...progForm, costo_estimado: e.target.value })} className={inputClass} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-white/[0.06]">
              <button onClick={() => setShowProgForm(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancelar</button>
              <button onClick={guardarProg} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editProgId ? "Actualizar" : "Crear Programa"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmState.open}
        message={confirmState.msg}
        onConfirm={() => {
          confirmState.onOk();
          setConfirmState(p => ({...p, open: false}));
        }}
        onCancel={() => setConfirmState(p => ({...p, open: false}))}
      />
    </div>
  );
}
