"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus, Search, Edit2, Trash2, Check, XCircle,
  Loader2, Shield, AlertTriangle, Calendar, DollarSign,
  FileText, TrendingDown, Clock, CreditCard, Building2,
} from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";
import ConfirmModal from "@/components/ConfirmModal";
import { useFlashMessage } from "@/lib/use-flash-message";
import FlashBanner from "@/components/FlashBanner";

/* ────────── types ────────── */
interface Linea {
  id: string; tipo: string; periodo: string; obra_id: string | null; obra_nombre: string | null;
  num_trabajadores: number | null; linea_captura: string | null;
  monto_base: number; recargos: number; actualizacion: number; total: number;
  vigencia: string | null; monto_pagado: number; fecha_pago: string | null;
  banco: string | null; referencia_pago: string | null; estatus: string;
  comprobante_url: string | null; notas: string | null;
  created_at: string; updated_at: string;
}
interface Obra { id: string; nombre: string; }

/* ────────── constants ────────── */
const TIPOS = ["IMSS", "INFONAVIT", "RCV", "AMORTIZACION", "MULTA"] as const;
const ESTATUS_COLORS: Record<string, string> = {
  PENDIENTE: "bg-amber-500/20 text-amber-400",
  PAGADA: "bg-emerald-500/20 text-emerald-400",
  VENCIDA: "bg-red-500/20 text-red-400",
  PARCIAL: "bg-blue-500/20 text-blue-400",
};
const FORM_INIT = {
  tipo: "IMSS", periodo: "", obra_id: "", num_trabajadores: "",
  linea_captura: "", monto_base: "", recargos: "0", actualizacion: "0",
  vigencia: "", banco: "", referencia_pago: "", notas: "",
  monto_pagado: "0", fecha_pago: "",
};

const fmt = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
const fmtDate = (d: string | null) => { if (!d) return "—"; try { return new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }); } catch { return d; } };
const diasPara = (d: string | null) => { if (!d) return null; const diff = Math.ceil((new Date(d + "T12:00:00").getTime() - Date.now()) / 86400000); return diff; };

/* ────────── component ────────── */
export default function SUAFinanzasPage() {

  const [lineas, setLineas] = useState<Linea[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("TODOS");
  const [filterEstatus, setFilterEstatus] = useState("TODOS");
  const [filterObra, setFilterObra] = useState("TODOS");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_INIT);
  const [editId, setEditId] = useState<string | null>(null);
  const [showPago, setShowPago] = useState(false);
  const [pagoTarget, setPagoTarget] = useState<Linea | null>(null);
  const [pagoForm, setPagoForm] = useState({ monto: "", fecha: new Date().toISOString().slice(0, 10), banco: "", referencia: "" });

  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<{ open: boolean; msg: string; onOk: () => void }>({ open: false, msg: "", onOk: () => {} });
  const { msg: flashMsg, flash, clear } = useFlashMessage();

  /* ── load ── */
  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [lRes, oRes] = await Promise.all([
      supabase.from("sua_lineas_captura").select("*").order("periodo", { ascending: false }).order("tipo"),
      supabase.from("centros_trabajo").select("id, nombre").order("nombre"),
    ]);
    setLineas((lRes.data || []) as Linea[]);
    setObras((oRes.data || []) as Obra[]);
    setLoading(false);
  }

  /* ── stats ── */
  const stats = useMemo(() => {
    const pendientes = lineas.filter(l => l.estatus === "PENDIENTE" || l.estatus === "PARCIAL");
    const vencidas = lineas.filter(l => l.estatus === "VENCIDA");
    const pagadas = lineas.filter(l => l.estatus === "PAGADA");
    const deudaTotal = pendientes.reduce((s, l) => s + (Number(l.total) - Number(l.monto_pagado)), 0) + vencidas.reduce((s, l) => s + (Number(l.total) - Number(l.monto_pagado)), 0);
    const pagadoTotal = lineas.reduce((s, l) => s + Number(l.monto_pagado), 0);
    const proxVencer = pendientes.filter(l => { const d = diasPara(l.vigencia); return d !== null && d >= 0 && d <= 15; }).length;
    return { pendientes: pendientes.length, vencidas: vencidas.length, pagadas: pagadas.length, deudaTotal, pagadoTotal, proxVencer };
  }, [lineas]);

  /* ── CRUD ── */
  async function guardar() {
    if (!form.periodo.trim()) { flash("err", "Periodo requerido (ej: 2026-03)"); return; }
    const montoBase = parseFloat(form.monto_base);
    if (isNaN(montoBase) || montoBase <= 0) { flash("err", "Monto base requerido y debe ser mayor a 0"); return; }
    const recargos = parseFloat(form.recargos) || 0;
    if (recargos < 0) { flash("err", "Recargos no pueden ser negativos"); return; }
    const actualizacion = parseFloat(form.actualizacion) || 0;
    if (actualizacion < 0) { flash("err", "Actualización no puede ser negativa"); return; }
    const total = montoBase + recargos + actualizacion;
    const obraObj = obras.find(o => o.id === form.obra_id);

    setSaving(true);
    const payload: any = {
      tipo: form.tipo,
      periodo: form.periodo.trim(),
      obra_id: form.obra_id || null,
      obra_nombre: obraObj?.nombre || null,
      num_trabajadores: form.num_trabajadores ? parseInt(form.num_trabajadores) : null,
      linea_captura: form.linea_captura || null,
      monto_base: montoBase,
      recargos,
      actualizacion,
      total,
      vigencia: form.vigencia || null,
      banco: form.banco || null,
      referencia_pago: form.referencia_pago || null,
      notas: form.notas || null,
    };

    if (editId) {
      payload.monto_pagado = parseFloat(form.monto_pagado) || 0;
      payload.fecha_pago = form.fecha_pago || null;
      const { error } = await supabase.from("sua_lineas_captura").update(payload).eq("id", editId);
      if (error) { flash("err", error.message); setSaving(false); return; }
      flash("ok", "Línea actualizada");
    } else {
      const { error } = await supabase.from("sua_lineas_captura").insert(payload);
      if (error) { flash("err", error.message); setSaving(false); return; }
      flash("ok", "Línea de captura registrada");
    }
    setShowForm(false); setEditId(null); setForm(FORM_INIT);
    setSaving(false); loadAll();
  }

  function editar(l: Linea) {
    setForm({
      tipo: l.tipo, periodo: l.periodo, obra_id: l.obra_id || "",
      num_trabajadores: l.num_trabajadores ? String(l.num_trabajadores) : "",
      linea_captura: l.linea_captura || "", monto_base: String(l.monto_base),
      recargos: String(l.recargos), actualizacion: String(l.actualizacion),
      vigencia: l.vigencia || "", banco: l.banco || "",
      referencia_pago: l.referencia_pago || "", notas: l.notas || "",
      monto_pagado: String(l.monto_pagado), fecha_pago: l.fecha_pago || "",
    });
    setEditId(l.id); setShowForm(true);
  }

  async function eliminar(id: string) {
    setConfirmState({
      open: true,
      msg: "¿Eliminar esta línea de captura?",
      onOk: async () => {
        const { error } = await supabase.from("sua_lineas_captura").delete().eq("id", id);
        if (error) flash("err", error.message); else { flash("ok", "Eliminada"); loadAll(); }
      }
    });
  }

  /* ── Pago rápido ── */
  function abrirPago(l: Linea) {
    setPagoTarget(l);
    const restante = Number(l.total) - Number(l.monto_pagado);
    setPagoForm({ monto: String(restante), fecha: new Date().toISOString().slice(0, 10), banco: l.banco || "", referencia: "" });
    setShowPago(true);
  }

  async function registrarPago() {
    if (!pagoTarget) return;
    const monto = parseFloat(pagoForm.monto);
    if (isNaN(monto) || monto <= 0) { flash("err", "Monto de pago requerido y debe ser mayor a 0"); return; }
    if (!pagoForm.fecha) { flash("err", "Fecha de pago requerida"); return; }
    const maxPago = Number(pagoTarget.total) - Number(pagoTarget.monto_pagado);
    if (monto > maxPago) { flash("err", `Pago excede el monto adeudado. Máximo: ${maxPago.toFixed(2)}`); return; }
    const nuevoPagado = Number(pagoTarget.monto_pagado) + monto;
    setSaving(true);
    const { error } = await supabase.from("sua_lineas_captura").update({
      monto_pagado: nuevoPagado,
      fecha_pago: pagoForm.fecha,
      banco: pagoForm.banco || pagoTarget.banco || null,
      referencia_pago: pagoForm.referencia || pagoTarget.referencia_pago || null,
    }).eq("id", pagoTarget.id);
    if (error) { flash("err", error.message); setSaving(false); return; }
    flash("ok", `Pago de ${fmt(monto)} registrado`);
    setShowPago(false); setPagoTarget(null); setSaving(false); loadAll();
  }

  /* ── filter ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return lineas.filter(l =>
      (!q || l.periodo.toLowerCase().includes(q) || (l.obra_nombre || "").toLowerCase().includes(q) || (l.linea_captura || "").toLowerCase().includes(q)) &&
      (filterTipo === "TODOS" || l.tipo === filterTipo) &&
      (filterEstatus === "TODOS" || l.estatus === filterEstatus) &&
      (filterObra === "TODOS" || l.obra_id === filterObra)
    );
  }, [lineas, search, filterTipo, filterEstatus, filterObra]);

  const totalComputed = useMemo(() => {
    const base = parseFloat(form.monto_base) || 0;
    const rec = parseFloat(form.recargos) || 0;
    const act = parseFloat(form.actualizacion) || 0;
    return base + rec + act;
  }, [form.monto_base, form.recargos, form.actualizacion]);

  /* ────────── render ────────── */
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <FlashBanner msg={flashMsg} />
      {/* Header */}
      <div className="flex-none px-6 pt-6 pb-4 flex items-center gap-4">
        <AriaBackButton href="/dashboard/finanzas" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-400" /> SUA · Control Financiero
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Líneas de captura IMSS · Infonavit · RCV · Pagos · Conciliación</p>
        </div>
      </div>


      {/* Stats */}
      <div className="flex-none px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: "Deuda Total", value: fmt(stats.deudaTotal), icon: TrendingDown, color: "text-red-400", bg: "bg-red-500/10" },
            { label: "Pagado Total", value: fmt(stats.pagadoTotal), icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Pendientes", value: stats.pendientes, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Vencidas", value: stats.vencidas, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
            { label: "Pagadas", value: stats.pagadas, icon: Check, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Próx. Vencer (15d)", value: stats.proxVencer, icon: Calendar, color: "text-orange-400", bg: "bg-orange-500/10" },
          ].map(s => (
            <div key={s.label} className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
              <div className={`inline-flex p-1.5 rounded-lg ${s.bg} mb-1`}><s.icon className={`w-3.5 h-3.5 ${s.color}`} /></div>
              <p className="text-lg font-bold text-white">{s.value}</p>
              <p className="text-[11px] text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters + Action */}
      <div className="flex-none px-6 pb-3 flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar periodo, obra, línea de captura..." className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500/40" />
        </div>
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none">
          <option value="TODOS">Todos tipos</option>
          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterEstatus} onChange={e => setFilterEstatus(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none">
          <option value="TODOS">Todos estatus</option>
          {["PENDIENTE","PAGADA","VENCIDA","PARCIAL"].map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={filterObra} onChange={e => setFilterObra(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none">
          <option value="TODOS">Todas obras</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
        </select>
        <button onClick={() => { setForm(FORM_INIT); setEditId(null); setShowForm(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
          <Plus className="w-4 h-4" /> Nueva Línea
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
                <tr className="text-left text-xs text-slate-400 border-b border-white/[0.06]">
                  <th className="px-3 py-2.5">Periodo</th>
                  <th className="px-3 py-2.5">Tipo</th>
                  <th className="px-3 py-2.5">Obra</th>
                  <th className="px-3 py-2.5">Línea Captura</th>
                  <th className="px-3 py-2.5 text-center">Trabs</th>
                  <th className="px-3 py-2.5 text-right">Base</th>
                  <th className="px-3 py-2.5 text-right">Recargos</th>
                  <th className="px-3 py-2.5 text-right">Total</th>
                  <th className="px-3 py-2.5 text-right">Pagado</th>
                  <th className="px-3 py-2.5">Vigencia</th>
                  <th className="px-3 py-2.5">Estatus</th>
                  <th className="px-3 py-2.5 w-28">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={12} className="text-center py-16 text-slate-500">
                    <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Sin líneas de captura.</p>
                  </td></tr>
                ) : filtered.map(l => {
                  const dias = diasPara(l.vigencia);
                  const urgente = dias !== null && dias >= 0 && dias <= 5 && l.estatus !== "PAGADA";
                  const restante = Number(l.total) - Number(l.monto_pagado);
                  return (
                    <tr key={l.id} className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${urgente ? "bg-red-500/[0.03]" : ""}`}>
                      <td className="px-3 py-2.5 text-white font-medium whitespace-nowrap">{l.periodo}</td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          l.tipo === "IMSS" ? "bg-blue-500/20 text-blue-400" :
                          l.tipo === "INFONAVIT" ? "bg-purple-500/20 text-purple-400" :
                          l.tipo === "RCV" ? "bg-cyan-500/20 text-cyan-400" :
                          "bg-slate-500/20 text-slate-400"
                        }`}>{l.tipo}</span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-300 text-xs max-w-[140px] truncate">{l.obra_nombre || "—"}</td>
                      <td className="px-3 py-2.5 text-slate-400 text-xs font-mono">{l.linea_captura || "—"}</td>
                      <td className="px-3 py-2.5 text-center text-slate-300">{l.num_trabajadores || "—"}</td>
                      <td className="px-3 py-2.5 text-right text-slate-300 font-mono">{fmt(Number(l.monto_base))}</td>
                      <td className="px-3 py-2.5 text-right text-amber-400/70 font-mono text-xs">{Number(l.recargos) > 0 ? `+${fmt(Number(l.recargos))}` : "—"}</td>
                      <td className="px-3 py-2.5 text-right text-white font-mono font-medium">{fmt(Number(l.total))}</td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        {Number(l.monto_pagado) > 0 ? (
                          <span className="text-emerald-400">{fmt(Number(l.monto_pagado))}</span>
                        ) : <span className="text-slate-500">—</span>}
                        {restante > 0 && l.estatus !== "PAGADA" && (
                          <p className="text-[10px] text-red-400/70">Resta {fmt(restante)}</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={`text-xs ${urgente ? "text-red-400 font-medium" : "text-slate-400"}`}>
                          {fmtDate(l.vigencia)}
                        </span>
                        {dias !== null && dias >= 0 && dias <= 15 && l.estatus !== "PAGADA" && (
                          <p className="text-[10px] text-orange-400">{dias === 0 ? "¡HOY!" : `${dias}d`}</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ESTATUS_COLORS[l.estatus] || "bg-slate-500/20 text-slate-400"}`}>{l.estatus}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          {l.estatus !== "PAGADA" && (
                            <button onClick={() => abrirPago(l)} className="p-1 bg-emerald-500/10 hover:bg-emerald-500/20 rounded text-emerald-400 transition-colors" title="Registrar pago">
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => editar(l)} className="p-1 bg-blue-500/10 hover:bg-blue-500/20 rounded text-blue-400 transition-colors" title="Editar">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => eliminar(l.id)} className="p-1 bg-red-500/10 hover:bg-red-500/20 rounded text-red-400 transition-colors" title="Eliminar">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {filtered.length > 0 && (
                <tfoot className="border-t border-white/[0.06]">
                  <tr className="text-xs font-medium">
                    <td colSpan={7} className="px-3 py-2.5 text-right text-slate-400">Totales filtrados:</td>
                    <td className="px-3 py-2.5 text-right text-white font-mono">{fmt(filtered.reduce((s, l) => s + Number(l.total), 0))}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-400 font-mono">{fmt(filtered.reduce((s, l) => s + Number(l.monto_pagado), 0))}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* ── Modal: Nueva/Editar Línea ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-xl mx-4 max-h-[85vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h3 className="text-lg font-semibold text-white">{editId ? "Editar Línea de Captura" : "Nueva Línea de Captura"}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><XCircle className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Tipo *</label>
                  <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Periodo *</label>
                  <input value={form.periodo} onChange={e => setForm({ ...form, periodo: e.target.value })} placeholder="2026-03" required className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/40" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Trabajadores</label>
                  <input type="number" min="0" value={form.num_trabajadores} onChange={e => setForm({ ...form, num_trabajadores: e.target.value })} placeholder="0" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Obra</label>
                  <select value={form.obra_id} onChange={e => setForm({ ...form, obra_id: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
                    <option value="">Sin obra</option>
                    {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Línea de captura</label>
                  <input value={form.linea_captura} onChange={e => setForm({ ...form, linea_captura: e.target.value })} placeholder="Número SIPARE" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Monto base *</label>
                  <input type="number" step="0.01" min="0.01" required value={form.monto_base} onChange={e => setForm({ ...form, monto_base: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/40" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Recargos</label>
                  <input type="number" step="0.01" min="0" value={form.recargos} onChange={e => setForm({ ...form, recargos: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Actualización</label>
                  <input type="number" step="0.01" min="0" value={form.actualizacion} onChange={e => setForm({ ...form, actualizacion: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
                </div>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex justify-between items-center">
                <span className="text-xs text-blue-400">Total calculado</span>
                <span className="text-lg font-bold text-white">{fmt(totalComputed)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Vigencia</label>
                  <input type="date" value={form.vigencia} onChange={e => setForm({ ...form, vigencia: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Banco</label>
                  <input value={form.banco} onChange={e => setForm({ ...form, banco: e.target.value })} placeholder="BBVA, Banorte..." className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Notas</label>
                <input value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} placeholder="Observaciones..." className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-white/[0.06]">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancelar</button>
              <button onClick={guardar} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editId ? "Actualizar" : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Pago rápido ── */}
      {showPago && pagoTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowPago(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm mx-4 p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" /> Registrar Pago
            </h3>
            <div className="text-xs text-slate-400 space-y-1">
              <p>{pagoTarget.tipo} · {pagoTarget.periodo} · {pagoTarget.obra_nombre || "Sin obra"}</p>
              <p>Total: {fmt(Number(pagoTarget.total))} · Pagado: {fmt(Number(pagoTarget.monto_pagado))} · Resta: <span className="text-red-400">{fmt(Number(pagoTarget.total) - Number(pagoTarget.monto_pagado))}</span></p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Monto a pagar *</label>
                <input type="number" step="0.01" min="0.01" required value={pagoForm.monto} onChange={e => setPagoForm({ ...pagoForm, monto: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500/40" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Fecha de pago *</label>
                <input type="date" value={pagoForm.fecha} onChange={e => setPagoForm({ ...pagoForm, fecha: e.target.value })} required className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Banco</label>
                  <input value={pagoForm.banco} onChange={e => setPagoForm({ ...pagoForm, banco: e.target.value })} placeholder="BBVA" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Referencia</label>
                  <input value={pagoForm.referencia} onChange={e => setPagoForm({ ...pagoForm, referencia: e.target.value })} placeholder="No. operación" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowPago(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancelar</button>
              <button onClick={registrarPago} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Pagar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmState.open}
        message={confirmState.msg}
        onConfirm={() => { confirmState.onOk(); setConfirmState(p => ({...p, open: false})); }}
        onCancel={() => setConfirmState(p => ({...p, open: false}))}
      />
    </div>
  );
}
