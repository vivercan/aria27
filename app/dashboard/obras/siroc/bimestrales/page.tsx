"use client";
import { clientLogger } from "@/lib/client-logger";
import ConfirmModal from "@/components/ConfirmModal";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Plus, Save, Loader2, Calendar, Trash2, AlertTriangle, CheckCircle2, X } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";
import { fmtMoney } from "@/lib/formatters";

interface Bimestre {
  id: string;
  siroc_registro_id: string;
  obra: string;
  numero_siroc: string;
  anio: number;
  bimestre: string;
  monto_ejercido_periodo: number;
  monto_ejercido_acumulado: number;
  trabajadores_promedio: number;
  fecha_reporte: string;
  plazo_limite: string;
  estatus: string;
  observaciones: string;
  created_at: string;
}

interface SirocRegistro { id: string; obra: string; numero_siroc: string; importe_total: number; }

const BIMESTRES = [
  { code: "ENE_FEB", label: "Ene-Feb", limiteMes: 3 },
  { code: "MAR_ABR", label: "Mar-Abr", limiteMes: 5 },
  { code: "MAY_JUN", label: "May-Jun", limiteMes: 7 },
  { code: "JUL_AGO", label: "Jul-Ago", limiteMes: 9 },
  { code: "SEP_OCT", label: "Sep-Oct", limiteMes: 11 },
  { code: "NOV_DIC", label: "Nov-Dic", limiteMes: 1 },
];

function calcPlazo(anio: number, bimestreCode: string): string {
  const b = BIMESTRES.find(x => x.code === bimestreCode);
  if (!b) return "";
  const y = bimestreCode === "NOV_DIC" ? anio + 1 : anio;
  const m = String(b.limiteMes).padStart(2, "0");
  return `${y}-${m}-17`;
}

function bimestreActual(): { anio: number; bimestre: string } {
  const d = new Date();
  const m = d.getMonth();
  const anio = d.getFullYear();
  const codes = ["ENE_FEB", "ENE_FEB", "MAR_ABR", "MAR_ABR", "MAY_JUN", "MAY_JUN", "JUL_AGO", "JUL_AGO", "SEP_OCT", "SEP_OCT", "NOV_DIC", "NOV_DIC"];
  return { anio, bimestre: codes[m] };
}

const EMPTY: Record<string, unknown> = {
  siroc_registro_id: "", anio: new Date().getFullYear(), bimestre: bimestreActual().bimestre,
  monto_ejercido_periodo: 0, monto_ejercido_acumulado: 0, trabajadores_promedio: 0,
  fecha_reporte: new Date().toISOString().slice(0, 10), estatus: "PRESENTADO", observaciones: ""
};

export default function SirocBimestralesPage() {
  const log = clientLogger("BIMESTRALES");
  const { msg, flash, clear } = useFlashMessage();
  const [confirmState, setConfirmState] = useState<{ open: boolean; msg: string; onOk: () => void }>({ open: false, msg: "", onOk: () => {} });
  const [bimestres, setBimestres] = useState<Bimestre[]>([]);
  const [registros, setRegistros] = useState<SirocRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => { cargar(); }, []);

  const validar = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.siroc_registro_id) {
      errors.siroc_registro_id = "Registro SIROC es requerido";
    }
    if (!form.anio || isNaN(Number(form.anio))) {
      errors.anio = "Año válido es requerido";
    }
    if (!form.bimestre) {
      errors.bimestre = "Bimestre es requerido";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  async function cargar() {
    setLoading(true);
    const { data: regs } = await supabase.from("siroc_registros").select("id, obra, numero_siroc, importe_total").order("obra");
    setRegistros(regs || []);
    const { data, error } = await supabase.from("siroc_bimestrales").select("*").order("anio", { ascending: false }).order("bimestre");
    if (error) log.error("siroc_bimestrales error:", { error: error });
    setBimestres(data || []);
    setLoading(false);
  }

  async function guardar() {
    if (!validar()) { flash("err", "Por favor corrige los errores en el formulario"); return; }
    setGuardando(true);
    const reg = registros.find(r => r.id === form.siroc_registro_id);
    const payload = {
      siroc_registro_id: form.siroc_registro_id,
      obra: reg?.obra || "",
      numero_siroc: reg?.numero_siroc || "",
      anio: Number(form.anio),
      bimestre: form.bimestre,
      monto_ejercido_periodo: Number(form.monto_ejercido_periodo) || 0,
      monto_ejercido_acumulado: Number(form.monto_ejercido_acumulado) || 0,
      trabajadores_promedio: Number(form.trabajadores_promedio) || 0,
      fecha_reporte: form.fecha_reporte,
      plazo_limite: calcPlazo(Number(form.anio), form.bimestre),
      estatus: form.estatus,
      observaciones: form.observaciones || null,
    };
    const { error } = await supabase.from("siroc_bimestrales").insert(payload);
    setGuardando(false);
    if (error) { flash("err", "Error: " + (error as {message?: string})?.message || "Error desconocido"); return; }
    setShowForm(false); setForm(EMPTY); cargar();
  }

  async function eliminar(id: string) {
    setConfirmState({ open: true, msg: "¿Eliminar este reporte bimestral?", onOk: async () => {
      await supabase.from("siroc_bimestrales").delete().eq("id", id);
      cargar();
    }});
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const stats = {
    total: bimestres.length,
    presentados: bimestres.filter(b => b.estatus === "PRESENTADO").length,
    vencidos: bimestres.filter(b => b.estatus === "PENDIENTE" && b.plazo_limite < hoy).length,
    pendientes: bimestres.filter(b => b.estatus === "PENDIENTE" && b.plazo_limite >= hoy).length,
  };

  return (
    <div className="space-y-6">
      <FlashBanner msg={msg} className="mx-6" />
      <div className="flex items-center gap-4">
        <AriaBackButton href="/dashboard/obras/siroc/registros" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3"><Calendar className="w-8 h-8 text-aria-accent" />SIROC · Reportes Bimestrales</h1>
          <p className="text-[#7f93b0] mt-1">Avance financiero bimestral · plazo 17 días naturales de ene/mar/may/jul/sep/nov.</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setShowForm(true); }}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center gap-2 font-medium">
          <Plus className="w-5 h-5" /> Nuevo reporte
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { l: "Total", v: stats.total, c: "text-white" },
          { l: "Presentados", v: stats.presentados, c: "text-emerald-300" },
          { l: "Pendientes", v: stats.pendientes, c: "text-amber-300" },
          { l: "Vencidos", v: stats.vencidos, c: "text-rose-300" },
        ].map((k, i) => (
          <div key={i} className="rounded-xl bg-[#0c1d38]/50 border border-white/[0.05] p-4">
            <div className="text-xs text-[#7f93b0] uppercase">{k.l}</div>
            <div className={`text-2xl font-bold ${k.c}`}>{k.v}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-amber-400" /></div>
      ) : bimestres.length === 0 ? (
        <div className="text-center py-12 text-[#7f93b0]">No hay reportes bimestrales.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.05]">
          <table className="w-full text-sm">
            <thead className="bg-[#0c1d38]/80 text-[#c9d8ed] sticky top-0">
              <tr>
                <th className="text-left p-3">Obra</th>
                <th className="text-left p-3"># SIROC</th>
                <th className="text-left p-3">Año</th>
                <th className="text-left p-3">Bimestre</th>
                <th className="text-right p-3">Ejercido periodo</th>
                <th className="text-right p-3">Acumulado</th>
                <th className="text-center p-3">Trab.</th>
                <th className="text-left p-3">Fecha reporte</th>
                <th className="text-left p-3">Plazo límite</th>
                <th className="text-center p-3">Estatus</th>
                <th className="text-center p-3">Acc.</th>
              </tr>
            </thead>
            <tbody>
              {bimestres.map(b => {
                const vencido = b.estatus === "PENDIENTE" && b.plazo_limite < hoy;
                return (
                  <tr key={b.id} className={`border-t border-white/[0.08]/30 hover:bg-[#0c1d38]/30 ${vencido ? "bg-rose-900/10" : ""}`}>
                    <td className="p-3 text-white font-medium">{b.obra}</td>
                    <td className="p-3 text-[#c9d8ed] font-mono">{b.numero_siroc}</td>
                    <td className="p-3 text-[#c9d8ed]">{b.anio}</td>
                    <td className="p-3 text-[#c9d8ed]">{BIMESTRES.find(x => x.code === b.bimestre)?.label || b.bimestre}</td>
                    <td className="p-3 text-right text-white">{fmtMoney(Number(b.monto_ejercido_periodo), { noDecimals: true })}</td>
                    <td className="p-3 text-right text-aria-accent">{fmtMoney(Number(b.monto_ejercido_acumulado), { noDecimals: true })}</td>
                    <td className="p-3 text-center text-[#c9d8ed]">{b.trabajadores_promedio}</td>
                    <td className="p-3 text-[#c9d8ed]">{b.fecha_reporte ? new Date(b.fecha_reporte).toLocaleDateString("es-MX") : "—"}</td>
                    <td className={`p-3 ${vencido ? "text-rose-400 font-bold" : "text-[#c9d8ed]"}`}>{b.plazo_limite ? new Date(b.plazo_limite).toLocaleDateString("es-MX") : "—"}</td>
                    <td className="p-3 text-center">
                      {b.estatus === "PRESENTADO" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"><CheckCircle2 className="w-3 h-3" />Presentado</span>
                      ) : vencido ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40"><AlertTriangle className="w-3 h-3" />Vencido</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">Pendiente</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => eliminar(b.id)} className="p-1.5 bg-rose-600/80 hover:bg-rose-600 rounded"><Trash2 className="w-4 h-4 text-white" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0a1628] border border-white/[0.08] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#0a1628] border-b border-white/[0.08] p-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Nuevo reporte bimestral</h2>
              <button onClick={() => { setShowForm(false); setForm(EMPTY); }} className="p-1 rounded hover:bg-white/[0.06]"><X className="w-5 h-5 text-[#7f93b0]" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm text-[#7f93b0] mb-1 block">Registro SIROC *</label>
                <select value={form.siroc_registro_id} onChange={e => setForm({ ...form, siroc_registro_id: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-amber-500">
                  <option value="">Seleccionar...</option>
                  {registros.map(r => <option key={r.id} value={r.id}>{r.obra} · {r.numero_siroc}</option>)}
                </select>
                {formErrors.siroc_registro_id && <p className="text-red-400 text-xs mt-1">{formErrors.siroc_registro_id}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm text-[#7f93b0] mb-1 block">Año *</label><input type="number" min="0" value={form.anio} onChange={e => setForm({ ...form, anio: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-amber-500" />{formErrors.anio && <p className="text-red-400 text-xs mt-1">{formErrors.anio}</p>}</div>
                <div>
                  <label className="text-sm text-[#7f93b0] mb-1 block">Bimestre *</label>
                  <select value={form.bimestre} onChange={e => setForm({ ...form, bimestre: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-amber-500">
                    {BIMESTRES.map(b => <option key={b.code} value={b.code}>{b.label}</option>)}
                  </select>
                  {formErrors.bimestre && <p className="text-red-400 text-xs mt-1">{formErrors.bimestre}</p>}
                </div>
                <div><label className="text-sm text-[#7f93b0] mb-1 block">Monto ejercido del periodo ($)</label><input type="number" min="0" value={form.monto_ejercido_periodo} onChange={e => setForm({ ...form, monto_ejercido_periodo: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-amber-500" /></div>
                <div><label className="text-sm text-[#7f93b0] mb-1 block">Monto ejercido acumulado ($)</label><input type="number" min="0" value={form.monto_ejercido_acumulado} onChange={e => setForm({ ...form, monto_ejercido_acumulado: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-amber-500" /></div>
                <div><label className="text-sm text-[#7f93b0] mb-1 block">Trabajadores promedio</label><input type="number" min="0" value={form.trabajadores_promedio} onChange={e => setForm({ ...form, trabajadores_promedio: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-amber-500" /></div>
                <div><label className="text-sm text-[#7f93b0] mb-1 block">Fecha de reporte</label><input type="date" value={form.fecha_reporte} onChange={e => setForm({ ...form, fecha_reporte: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-amber-500" /></div>
                <div className="col-span-2">
                  <label className="text-sm text-[#7f93b0] mb-1 block">Estatus</label>
                  <select value={form.estatus} onChange={e => setForm({ ...form, estatus: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-amber-500">
                    <option value="PRESENTADO">Presentado</option>
                    <option value="PENDIENTE">Pendiente</option>
                  </select>
                </div>
              </div>
              <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                Plazo límite calculado: <strong>{calcPlazo(Number(form.anio), form.bimestre) ? new Date(calcPlazo(Number(form.anio), form.bimestre)).toLocaleDateString("es-MX") : "—"}</strong>
              </div>
              <div><label className="text-sm text-[#7f93b0] mb-1 block">Observaciones</label><textarea value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} rows={2} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-amber-500" /></div>
            </div>
            <div className="sticky bottom-0 bg-[#0a1628] border-t border-white/[0.08] p-5 flex justify-end gap-3">
              <button onClick={() => { setShowForm(false); setForm(EMPTY); }} className="px-4 py-2 bg-[#0f2448] hover:bg-[#162040] text-white rounded-lg">Cancelar</button>
              <button onClick={guardar} disabled={guardando} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50">{guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Guardar</button>
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
