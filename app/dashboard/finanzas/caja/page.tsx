"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus, Wallet, TrendingDown, TrendingUp, RefreshCw,
  Search, Edit2, XCircle, Check, Loader2, ClipboardList,
  DollarSign, FileText, Lock, Calendar, Tag, AlertTriangle,
} from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";
import ConfirmModal from "@/components/ConfirmModal";
import { useFlashMessage } from "@/lib/use-flash-message";
import FlashBanner from "@/components/FlashBanner";

/* ────────── types ────────── */
interface Fondo {
  id: string; nombre: string; obra_id: string | null; responsable_id: string | null;
  monto_autorizado: number; saldo_actual: number; estatus: string; notas: string | null;
  created_at: string; updated_at: string;
  obra_nombre?: string; responsable_nombre?: string;
}
interface Movimiento {
  id: string; fondo_id: string; tipo: string; concepto: string; monto: number;
  fecha: string; comprobante: string | null; responsable: string | null;
  categoria: string; notas: string | null; created_at: string;
  fondo_nombre?: string;
}
interface Corte {
  id: string; fondo_id: string; periodo: string; fecha_inicio: string; fecha_fin: string;
  total_gastos: number; total_reposiciones: number; num_movimientos: number;
  saldo_inicial: number; saldo_final: number; estatus: string;
  cerrado_por: string | null; cerrado_at: string | null; created_at: string;
  fondo_nombre?: string;
}
interface Obra { id: string; nombre: string; }
interface Empleado { id: string; nombre: string; }

/* ────────── constants ────────── */
const TABS = ["Fondos", "Movimientos", "Cortes"] as const;
type Tab = typeof TABS[number];

const CATEGORIAS = [
  "GENERAL","MATERIALES","TRANSPORTE","ALIMENTACION",
  "PAPELERIA","HERRAMIENTA","LIMPIEZA","COMBUSTIBLE","OTROS",
];

const FONDO_INIT = { nombre: "", obra_id: "", responsable_id: "", monto_autorizado: "", notas: "" };
const MOV_INIT = { fondo_id: "", tipo: "GASTO" as string, concepto: "", monto: "", fecha: new Date().toISOString().slice(0,10), comprobante: "", responsable: "", categoria: "GENERAL", notas: "" };

const fmt = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
const fmtDate = (d: string) => { try { return new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }); } catch { return d; } };

/* ────────── component ────────── */
export default function CajaChicaPage() {

  /* state */
  const [tab, setTab] = useState<Tab>("Fondos");
  const [fondos, setFondos] = useState<Fondo[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cortes, setCortes] = useState<Corte[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterFondo, setFilterFondo] = useState("TODOS");
  const [filterEstatus, setFilterEstatus] = useState("TODOS");

  /* forms */
  const [showFondoForm, setShowFondoForm] = useState(false);
  const [fondoForm, setFondoForm] = useState(FONDO_INIT);
  const [editFondoId, setEditFondoId] = useState<string | null>(null);
  const [showMovForm, setShowMovForm] = useState(false);
  const [movForm, setMovForm] = useState(MOV_INIT);
  const [showCorteForm, setShowCorteForm] = useState(false);
  const [corteForm, setCorteForm] = useState({ fondo_id: "", fecha_inicio: "", fecha_fin: "", periodo: "" });

  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<{ open: boolean; msg: string; onOk: () => void }>({ open: false, msg: "", onOk: () => {} });
  const { msg: flashMsg, flash, clear } = useFlashMessage();

  /* ── load ── */
  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [fRes, mRes, cRes, oRes, eRes] = await Promise.all([
        supabase.from("caja_chica_fondos").select("*").order("created_at", { ascending: false }),
        supabase.from("caja_chica_movimientos").select("*").order("fecha", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("caja_chica_cortes").select("*").order("created_at", { ascending: false }),
        supabase.from("centros_trabajo").select("id, nombre").order("nombre"),
        supabase.from("employees").select("id, nombre").eq("estatus", "Activo").order("nombre"),
      ]);
      const fondosRaw = (fRes.data || []) as Fondo[];
      const obrasArr = (oRes.data || []) as Obra[];
      const empleadosArr = (eRes.data || []) as Empleado[];

      const obraMap = Object.fromEntries(obrasArr.map(o => [o.id, o.nombre]));
      const empMap = Object.fromEntries(empleadosArr.map(e => [e.id, e.nombre]));
      const fondoMap = Object.fromEntries(fondosRaw.map(f => [f.id, f.nombre]));

      setFondos(fondosRaw.map(f => ({ ...f, obra_nombre: obraMap[f.obra_id || ""] || "—", responsable_nombre: empMap[f.responsable_id || ""] || "—" })));
      setMovimientos((mRes.data || []).map((m: any) => ({ ...m, fondo_nombre: fondoMap[m.fondo_id] || "?" })));
      setCortes((cRes.data || []).map((c: any) => ({ ...c, fondo_nombre: fondoMap[c.fondo_id] || "?" })));
      setObras(obrasArr);
      setEmpleados(empleadosArr);
    } catch (e) { /* error handled */ }
    finally { setLoading(false); }
  }

  /* ── stats ── */
  const stats = useMemo(() => {
    const activos = fondos.filter(f => f.estatus === "ACTIVO");
    const saldoTotal = activos.reduce((s, f) => s + Number(f.saldo_actual), 0);
    const autorizadoTotal = activos.reduce((s, f) => s + Number(f.monto_autorizado), 0);
    const now = new Date();
    const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const gastosMes = movimientos.filter(m => m.tipo === "GASTO" && m.fecha.startsWith(mesActual)).reduce((s, m) => s + Number(m.monto), 0);
    const reposMes = movimientos.filter(m => m.tipo === "REPOSICION" && m.fecha.startsWith(mesActual)).reduce((s, m) => s + Number(m.monto), 0);
    return { fondosActivos: activos.length, saldoTotal, autorizadoTotal, gastosMes, reposMes };
  }, [fondos, movimientos]);

  /* ── CRUD Fondos ── */
  async function guardarFondo() {
    const { nombre, monto_autorizado } = fondoForm;
    if (!nombre.trim()) { flash("err", "Nombre del fondo requerido"); return; }
    const monto = parseFloat(monto_autorizado);
    if (!monto || monto <= 0) { flash("err", "Monto autorizado debe ser mayor a 0"); return; }
    setSaving(true);
    const payload: any = {
      nombre: nombre.trim(),
      obra_id: fondoForm.obra_id || null,
      responsable_id: fondoForm.responsable_id || null,
      monto_autorizado: monto,
      notas: fondoForm.notas || null,
    };
    if (editFondoId) {
      const { error } = await supabase.from("caja_chica_fondos").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editFondoId);
      if (error) { flash("err", error.message); setSaving(false); return; }
      flash("ok", "Fondo actualizado");
    } else {
      payload.saldo_actual = monto; // saldo inicial = monto autorizado
      const { error } = await supabase.from("caja_chica_fondos").insert(payload);
      if (error) { flash("err", error.message); setSaving(false); return; }
      flash("ok", "Fondo creado con saldo " + fmt(monto));
    }
    setShowFondoForm(false); setEditFondoId(null); setFondoForm(FONDO_INIT);
    setSaving(false); loadAll();
  }

  function editFondo(f: Fondo) {
    setFondoForm({ nombre: f.nombre, obra_id: f.obra_id || "", responsable_id: f.responsable_id || "", monto_autorizado: String(f.monto_autorizado), notas: f.notas || "" });
    setEditFondoId(f.id); setShowFondoForm(true); setTab("Fondos");
  }

  async function toggleFondoEstatus(f: Fondo) {
    const next = f.estatus === "ACTIVO" ? "SUSPENDIDO" : "ACTIVO";
    const { error } = await supabase.from("caja_chica_fondos").update({ estatus: next, updated_at: new Date().toISOString() }).eq("id", f.id);
    if (error) flash("err", error.message); else { flash("ok", `Fondo ${next.toLowerCase()}`); loadAll(); }
  }

  /* ── CRUD Movimientos ── */
  async function guardarMov() {
    const { fondo_id, concepto, monto, fecha } = movForm;
    if (!fondo_id) { flash("err", "Selecciona un fondo"); return; }
    if (!concepto.trim()) { flash("err", "Concepto requerido"); return; }
    const m = parseFloat(monto);
    if (!m || m <= 0) { flash("err", "Monto debe ser mayor a 0"); return; }
    if (!fecha) { flash("err", "Fecha requerida"); return; }

    // Validar saldo suficiente para gastos
    if (movForm.tipo === "GASTO") {
      const fondo = fondos.find(f => f.id === fondo_id);
      if (fondo && m > Number(fondo.saldo_actual)) {
        flash("err", `Saldo insuficiente. Disponible: ${fmt(Number(fondo.saldo_actual))}`);
        return;
      }
    }

    setSaving(true);
    const payload = {
      fondo_id,
      tipo: movForm.tipo,
      concepto: concepto.trim(),
      monto: m,
      fecha,
      comprobante: movForm.comprobante || null,
      responsable: movForm.responsable || null,
      categoria: movForm.categoria,
      notas: movForm.notas || null,
    };
    const { error } = await supabase.from("caja_chica_movimientos").insert(payload);
    if (error) { flash("err", error.message); setSaving(false); return; }
    flash("ok", `${movForm.tipo === "GASTO" ? "Gasto" : "Reposición"} registrado: ${fmt(m)}`);
    setShowMovForm(false); setMovForm(MOV_INIT); setSaving(false); loadAll();
  }

  async function eliminarMov(id: string) {
    setConfirmState({
      open: true,
      msg: "¿Eliminar este movimiento? El saldo del fondo se ajustará automáticamente.",
      onOk: async () => {
        const { error } = await supabase.from("caja_chica_movimientos").delete().eq("id", id);
        if (error) flash("err", error.message); else { flash("ok", "Movimiento eliminado"); loadAll(); }
      }
    });
  }

  /* ── Cortes ── */
  async function generarCorte() {
    const { fondo_id, fecha_inicio, fecha_fin, periodo } = corteForm;
    if (!fondo_id || !fecha_inicio || !fecha_fin || !periodo.trim()) { flash("err", "Todos los campos del corte son requeridos"); return; }
    if (fecha_fin < fecha_inicio) { flash("err", "Fecha fin debe ser posterior a fecha inicio"); return; }

    setSaving(true);
    // Calcular totales del periodo
    const movsDelPeriodo = movimientos.filter(m => m.fondo_id === fondo_id && m.fecha >= fecha_inicio && m.fecha <= fecha_fin);
    const totalGastos = movsDelPeriodo.filter(m => m.tipo === "GASTO").reduce((s, m) => s + Number(m.monto), 0);
    const totalRepos = movsDelPeriodo.filter(m => m.tipo === "REPOSICION").reduce((s, m) => s + Number(m.monto), 0);
    const fondo = fondos.find(f => f.id === fondo_id);
    const saldoActual = fondo ? Number(fondo.saldo_actual) : 0;
    // saldo_inicial = saldo_actual + gastos del periodo - repos del periodo (reconstrucción)
    const saldoInicial = saldoActual + totalGastos - totalRepos;

    const payload = {
      fondo_id,
      periodo: periodo.trim(),
      fecha_inicio,
      fecha_fin,
      total_gastos: totalGastos,
      total_reposiciones: totalRepos,
      num_movimientos: movsDelPeriodo.length,
      saldo_inicial: saldoInicial,
      saldo_final: saldoActual,
      estatus: "ABIERTO",
    };
    const { error } = await supabase.from("caja_chica_cortes").insert(payload);
    if (error) { flash("err", error.message); setSaving(false); return; }
    flash("ok", `Corte generado: ${movsDelPeriodo.length} movimientos, gastos ${fmt(totalGastos)}`);
    setShowCorteForm(false); setCorteForm({ fondo_id: "", fecha_inicio: "", fecha_fin: "", periodo: "" });
    setSaving(false); loadAll();
  }

  async function cerrarCorte(c: Corte) {
    setConfirmState({
      open: true,
      msg: `¿Cerrar corte "${c.periodo}"? No se podrá reabrir.`,
      onOk: async () => {
        const { error } = await supabase.from("caja_chica_cortes").update({ estatus: "CERRADO", cerrado_at: new Date().toISOString(), cerrado_por: "admin" }).eq("id", c.id);
        if (error) flash("err", error.message); else { flash("ok", "Corte cerrado"); loadAll(); }
      }
    });
  }

  /* ── filtered data ── */
  const filteredFondos = useMemo(() => {
    const q = search.toLowerCase();
    return fondos.filter(f =>
      (!q || f.nombre.toLowerCase().includes(q) || (f.obra_nombre || "").toLowerCase().includes(q)) &&
      (filterEstatus === "TODOS" || f.estatus === filterEstatus)
    );
  }, [fondos, search, filterEstatus]);

  const filteredMovs = useMemo(() => {
    const q = search.toLowerCase();
    return movimientos.filter(m =>
      (!q || m.concepto.toLowerCase().includes(q) || (m.responsable || "").toLowerCase().includes(q) || (m.comprobante || "").toLowerCase().includes(q)) &&
      (filterFondo === "TODOS" || m.fondo_id === filterFondo)
    );
  }, [movimientos, search, filterFondo]);

  const filteredCortes = useMemo(() => {
    return cortes.filter(c => filterFondo === "TODOS" || c.fondo_id === filterFondo);
  }, [cortes, filterFondo]);

  const fondosActivos = fondos.filter(f => f.estatus === "ACTIVO");

  /* ────────── render ────────── */
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <FlashBanner msg={flashMsg} />
      {/* Header */}
      <div className="flex-none px-6 pt-6 pb-4 flex items-center gap-4">
        <AriaBackButton href="/dashboard/finanzas" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-amber-400" /> Caja Chica
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Fondos revolventes · gastos · reposiciones · cortes</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex-none px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Fondos Activos", value: stats.fondosActivos, icon: Wallet, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Saldo Disponible", value: fmt(stats.saldoTotal), icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Autorizado Total", value: fmt(stats.autorizadoTotal), icon: FileText, color: "text-slate-300", bg: "bg-slate-500/10" },
            { label: "Gastos del Mes", value: fmt(stats.gastosMes), icon: TrendingDown, color: "text-red-400", bg: "bg-red-500/10" },
            { label: "Reposiciones Mes", value: fmt(stats.reposMes), icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-500/10" },
          ].map(s => (
            <div key={s.label} className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
              <div className={`inline-flex p-1.5 rounded-lg ${s.bg} mb-1`}><s.icon className={`w-3.5 h-3.5 ${s.color}`} /></div>
              <p className="text-lg font-bold text-white">{s.value}</p>
              <p className="text-[11px] text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs + Search + Actions */}
      <div className="flex-none px-6 pb-3 flex flex-col md:flex-row gap-3">
        <div className="flex gap-1">
          {TABS.map(t => (
            <button key={t} onClick={() => { setTab(t); setSearch(""); setFilterFondo("TODOS"); setFilterEstatus("TODOS"); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tab === "Fondos" ? "Buscar fondo u obra..." : "Buscar concepto, responsable..."} className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-500/40" />
          </div>
          {tab !== "Fondos" && (
            <select value={filterFondo} onChange={e => setFilterFondo(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none">
              <option value="TODOS">Todos los fondos</option>
              {fondosActivos.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          )}
          {tab === "Fondos" && (
            <select value={filterEstatus} onChange={e => setFilterEstatus(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none">
              {["TODOS","ACTIVO","SUSPENDIDO","CERRADO"].map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          )}
          <button onClick={() => {
            if (tab === "Fondos") { setFondoForm(FONDO_INIT); setEditFondoId(null); setShowFondoForm(true); }
            else if (tab === "Movimientos") { setMovForm({ ...MOV_INIT, fondo_id: filterFondo !== "TODOS" ? filterFondo : (fondosActivos[0]?.id || "") }); setShowMovForm(true); }
            else { setCorteForm({ fondo_id: filterFondo !== "TODOS" ? filterFondo : (fondosActivos[0]?.id || ""), fecha_inicio: "", fecha_fin: "", periodo: "" }); setShowCorteForm(true); }
          }} className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
            <Plus className="w-4 h-4" />
            {tab === "Fondos" ? "Nuevo Fondo" : tab === "Movimientos" ? "Registrar" : "Generar Corte"}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>
        ) : (
          <>
            {/* ══════ Fondos Tab ══════ */}
            {tab === "Fondos" && (
              <>
                {showFondoForm && (
                  <div className="mb-4 p-5 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">{editFondoId ? "Editar Fondo" : "Nuevo Fondo de Caja Chica"}</h3>
                      <button onClick={() => { setShowFondoForm(false); setEditFondoId(null); }} className="text-slate-400 hover:text-white"><XCircle className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Nombre del fondo *</label>
                        <input value={fondoForm.nombre} onChange={e => setFondoForm({ ...fondoForm, nombre: e.target.value })} placeholder="Ej: Caja Obra Miravalle" required className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/40" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Obra (opcional)</label>
                        <select value={fondoForm.obra_id} onChange={e => setFondoForm({ ...fondoForm, obra_id: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
                          <option value="">Sin obra</option>
                          {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Responsable (opcional)</label>
                        <select value={fondoForm.responsable_id} onChange={e => setFondoForm({ ...fondoForm, responsable_id: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
                          <option value="">Sin asignar</option>
                          {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Monto autorizado *</label>
                        <input type="number" min="0.01" step="0.01" required value={fondoForm.monto_autorizado} onChange={e => setFondoForm({ ...fondoForm, monto_autorizado: e.target.value })} placeholder="5000.00" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/40" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs text-slate-400 mb-1 block">Notas</label>
                        <input value={fondoForm.notas} onChange={e => setFondoForm({ ...fondoForm, notas: e.target.value })} placeholder="Observaciones..." className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setShowFondoForm(false); setEditFondoId(null); }} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancelar</button>
                      <button onClick={guardarFondo} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {editFondoId ? "Actualizar" : "Crear Fondo"}
                      </button>
                    </div>
                  </div>
                )}
                {filteredFondos.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">
                    <Wallet className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No hay fondos de caja chica{filterEstatus !== "TODOS" ? ` con estatus ${filterEstatus}` : ""}.</p>
                    <p className="text-xs mt-1">Crea el primer fondo para empezar a registrar gastos.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredFondos.map(f => {
                      const pct = f.monto_autorizado > 0 ? Math.round(((Number(f.monto_autorizado) - Number(f.saldo_actual)) / Number(f.monto_autorizado)) * 100) : 0;
                      const barColor = pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-emerald-500";
                      return (
                        <div key={f.id} className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:border-amber-500/20 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-sm font-semibold text-white">{f.nombre}</h3>
                              <p className="text-xs text-slate-400">{f.obra_nombre} · {f.responsable_nombre}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${f.estatus === "ACTIVO" ? "bg-emerald-500/20 text-emerald-400" : f.estatus === "SUSPENDIDO" ? "bg-amber-500/20 text-amber-400" : "bg-slate-500/20 text-slate-400"}`}>{f.estatus}</span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Saldo disponible</span>
                              <span className="text-white font-medium">{fmt(Number(f.saldo_actual))}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Autorizado</span>
                              <span className="text-slate-300">{fmt(Number(f.monto_autorizado))}</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <p className="text-[10px] text-slate-500 text-right">{pct}% utilizado</p>
                          </div>
                          <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.06]">
                            <button onClick={() => editFondo(f)} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-slate-300 transition-colors">
                              <Edit2 className="w-3 h-3" /> Editar
                            </button>
                            <button onClick={() => toggleFondoEstatus(f)} className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors ${f.estatus === "ACTIVO" ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400" : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"}`}>
                              {f.estatus === "ACTIVO" ? <><AlertTriangle className="w-3 h-3" /> Suspender</> : <><Check className="w-3 h-3" /> Activar</>}
                            </button>
                            <button onClick={() => { setTab("Movimientos"); setFilterFondo(f.id); }} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg text-xs text-blue-400 transition-colors">
                              <ClipboardList className="w-3 h-3" /> Movimientos
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ══════ Movimientos Tab ══════ */}
            {tab === "Movimientos" && (
              <>
                {showMovForm && (
                  <div className="mb-4 p-5 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">Registrar Movimiento</h3>
                      <button onClick={() => setShowMovForm(false)} className="text-slate-400 hover:text-white"><XCircle className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Fondo *</label>
                        <select value={movForm.fondo_id} onChange={e => setMovForm({ ...movForm, fondo_id: e.target.value })} required className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
                          <option value="">Seleccionar...</option>
                          {fondosActivos.map(f => <option key={f.id} value={f.id}>{f.nombre} ({fmt(Number(f.saldo_actual))})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Tipo *</label>
                        <div className="flex gap-2">
                          {(["GASTO", "REPOSICION"] as const).map(t => (
                            <button key={t} onClick={() => setMovForm({ ...movForm, tipo: t })}
                              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${movForm.tipo === t ? (t === "GASTO" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30") : "bg-white/5 text-slate-400 border border-white/10"}`}>
                              {t === "GASTO" ? "Gasto" : "Reposición"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Monto *</label>
                        <input type="number" min="0.01" step="0.01" required value={movForm.monto} onChange={e => setMovForm({ ...movForm, monto: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/40" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Fecha *</label>
                        <input type="date" value={movForm.fecha} onChange={e => setMovForm({ ...movForm, fecha: e.target.value })} required className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs text-slate-400 mb-1 block">Concepto *</label>
                        <input value={movForm.concepto} onChange={e => setMovForm({ ...movForm, concepto: e.target.value })} placeholder="Descripción del gasto o reposición" required className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/40" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Categoría</label>
                        <select value={movForm.categoria} onChange={e => setMovForm({ ...movForm, categoria: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
                          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Comprobante</label>
                        <input value={movForm.comprobante} onChange={e => setMovForm({ ...movForm, comprobante: e.target.value })} placeholder="No. factura o vale" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Responsable</label>
                        <input value={movForm.responsable} onChange={e => setMovForm({ ...movForm, responsable: e.target.value })} placeholder="Quién hizo el gasto" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs text-slate-400 mb-1 block">Notas</label>
                        <input value={movForm.notas} onChange={e => setMovForm({ ...movForm, notas: e.target.value })} placeholder="Observaciones adicionales..." className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowMovForm(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancelar</button>
                      <button onClick={guardarMov} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Registrar
                      </button>
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
                      <tr className="text-left text-xs text-slate-400 border-b border-white/[0.06]">
                        <th className="px-3 py-2.5">Fecha</th>
                        <th className="px-3 py-2.5">Fondo</th>
                        <th className="px-3 py-2.5">Tipo</th>
                        <th className="px-3 py-2.5">Concepto</th>
                        <th className="px-3 py-2.5">Categoría</th>
                        <th className="px-3 py-2.5 text-right">Monto</th>
                        <th className="px-3 py-2.5">Comprobante</th>
                        <th className="px-3 py-2.5">Responsable</th>
                        <th className="px-3 py-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMovs.length === 0 ? (
                        <tr><td colSpan={9} className="text-center py-12 text-slate-500">Sin movimientos{filterFondo !== "TODOS" ? " en este fondo" : ""}.</td></tr>
                      ) : filteredMovs.map(m => (
                        <tr key={m.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                          <td className="px-3 py-2.5 text-slate-300 whitespace-nowrap">{fmtDate(m.fecha)}</td>
                          <td className="px-3 py-2.5 text-slate-300 text-xs">{m.fondo_nombre}</td>
                          <td className="px-3 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${m.tipo === "GASTO" ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                              {m.tipo === "GASTO" ? "↓ Gasto" : "↑ Repos."}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-white max-w-[200px] truncate">{m.concepto}</td>
                          <td className="px-3 py-2.5"><span className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-slate-400">{m.categoria}</span></td>
                          <td className={`px-3 py-2.5 text-right font-mono font-medium ${m.tipo === "GASTO" ? "text-red-400" : "text-emerald-400"}`}>
                            {m.tipo === "GASTO" ? "−" : "+"}{fmt(Number(m.monto))}
                          </td>
                          <td className="px-3 py-2.5 text-slate-400 text-xs">{m.comprobante || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-400 text-xs">{m.responsable || "—"}</td>
                          <td className="px-3 py-2.5">
                            <button onClick={() => eliminarMov(m.id)} className="p-1 text-slate-500 hover:text-red-400 transition-colors" title="Eliminar">
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ══════ Cortes Tab ══════ */}
            {tab === "Cortes" && (
              <>
                {showCorteForm && (
                  <div className="mb-4 p-5 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">Generar Corte de Caja</h3>
                      <button onClick={() => setShowCorteForm(false)} className="text-slate-400 hover:text-white"><XCircle className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Fondo *</label>
                        <select value={corteForm.fondo_id} onChange={e => setCorteForm({ ...corteForm, fondo_id: e.target.value })} required className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
                          <option value="">Seleccionar...</option>
                          {fondosActivos.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Periodo *</label>
                        <input value={corteForm.periodo} onChange={e => setCorteForm({ ...corteForm, periodo: e.target.value })} placeholder="Ej: Semana 15 - 2026" required className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/40" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Fecha inicio *</label>
                        <input type="date" value={corteForm.fecha_inicio} onChange={e => setCorteForm({ ...corteForm, fecha_inicio: e.target.value })} required className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Fecha fin *</label>
                        <input type="date" value={corteForm.fecha_fin} onChange={e => setCorteForm({ ...corteForm, fecha_fin: e.target.value })} required className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowCorteForm(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancelar</button>
                      <button onClick={generarCorte} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        Generar Corte
                      </button>
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
                      <tr className="text-left text-xs text-slate-400 border-b border-white/[0.06]">
                        <th className="px-3 py-2.5">Fondo</th>
                        <th className="px-3 py-2.5">Periodo</th>
                        <th className="px-3 py-2.5">Rango</th>
                        <th className="px-3 py-2.5 text-right">Saldo Inicial</th>
                        <th className="px-3 py-2.5 text-right">Gastos</th>
                        <th className="px-3 py-2.5 text-right">Reposiciones</th>
                        <th className="px-3 py-2.5 text-right">Saldo Final</th>
                        <th className="px-3 py-2.5 text-center">Movs</th>
                        <th className="px-3 py-2.5">Estatus</th>
                        <th className="px-3 py-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCortes.length === 0 ? (
                        <tr><td colSpan={10} className="text-center py-12 text-slate-500">Sin cortes{filterFondo !== "TODOS" ? " para este fondo" : ""}. Genera el primer corte de caja.</td></tr>
                      ) : filteredCortes.map(c => (
                        <tr key={c.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                          <td className="px-3 py-2.5 text-slate-300 text-xs">{c.fondo_nombre}</td>
                          <td className="px-3 py-2.5 text-white font-medium">{c.periodo}</td>
                          <td className="px-3 py-2.5 text-slate-400 text-xs whitespace-nowrap">{fmtDate(c.fecha_inicio)} → {fmtDate(c.fecha_fin)}</td>
                          <td className="px-3 py-2.5 text-right text-slate-300 font-mono">{fmt(Number(c.saldo_inicial))}</td>
                          <td className="px-3 py-2.5 text-right text-red-400 font-mono">−{fmt(Number(c.total_gastos))}</td>
                          <td className="px-3 py-2.5 text-right text-emerald-400 font-mono">+{fmt(Number(c.total_reposiciones))}</td>
                          <td className="px-3 py-2.5 text-right text-white font-mono font-medium">{fmt(Number(c.saldo_final))}</td>
                          <td className="px-3 py-2.5 text-center text-slate-400">{c.num_movimientos}</td>
                          <td className="px-3 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${c.estatus === "ABIERTO" ? "bg-blue-500/20 text-blue-400" : "bg-slate-500/20 text-slate-400"}`}>
                              {c.estatus === "ABIERTO" ? "Abierto" : "Cerrado"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            {c.estatus === "ABIERTO" && (
                              <button onClick={() => cerrarCorte(c)} className="p-1 text-slate-500 hover:text-amber-400 transition-colors" title="Cerrar corte">
                                <Lock className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        open={confirmState.open}
        message={confirmState.msg}
        onConfirm={() => { confirmState.onOk(); setConfirmState(p => ({...p, open: false})); }}
        onCancel={() => setConfirmState(p => ({...p, open: false}))}
      />
    </div>
  );
}
