"use client";
import { clientLogger } from "@/lib/client-logger";
import ConfirmModal from "@/components/ConfirmModal";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Plus, Edit2, X, Save, Loader2, ShieldCheck, Trash2, Search } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";

interface SirocRegistro {
  id: string;
  obra: string;
  registro_patronal: string;
  numero_siroc: string;
  clase_riesgo: string;
  tipo_obra: string;
  modalidad: string;
  fecha_inicio: string;
  fecha_fin_estimada: string;
  fecha_fin_real: string;
  importe_total: number;
  monto_ejercido: number;
  superficie_construccion: number;
  trabajadores_promedio: number;
  estado: string;
  ultima_incidencia: string;
  ultima_incidencia_fecha: string;
  fecha_suspension: string;
  motivo_suspension: string;
  fecha_reanudacion: string;
  fecha_cancelacion: string;
  motivo_cancelacion: string;
  notas: string;
  created_at: string;
}

const EMPTY: Record<string, unknown> = {
  obra: "", registro_patronal: "", numero_siroc: "", clase_riesgo: "III",
  tipo_obra: "", modalidad: "PROPIA", fecha_inicio: "", fecha_fin_estimada: "",
  fecha_fin_real: "", importe_total: 0, monto_ejercido: 0, superficie_construccion: 0,
  trabajadores_promedio: 0, estado: "REGISTRADA", ultima_incidencia: "", ultima_incidencia_fecha: "",
  fecha_suspension: "", motivo_suspension: "", fecha_reanudacion: "",
  fecha_cancelacion: "", motivo_cancelacion: "", notas: ""
};

const ESTADOS = ["REGISTRADA", "EN_CURSO", "SUSPENDIDA", "TERMINADA", "CANCELADA"];
const MODALIDADES = ["PROPIA", "CONTRATADA", "SUBCONTRATADA"];
const CLASES_RIESGO = ["I", "II", "III", "IV", "V"];
const INCIDENCIAS = ["", "SUSPENSION", "REANUDACION", "MODIFICACION_IMPORTE", "AMPLIACION_PLAZO", "TERMINACION", "CANCELACION"];

function colorEstado(e: string) {
  switch (e) {
    case "REGISTRADA": return "bg-aria-primary-light text-aria-accent border-aria-primary/40";
    case "EN_CURSO": return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    case "SUSPENDIDA": return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    case "TERMINADA": return "bg-slate-500/20 text-[#c9d8ed] border-white/[0.1]/40";
    case "CANCELADA": return "bg-rose-500/20 text-rose-300 border-rose-500/40";
    default: return "bg-slate-500/20 text-[#c9d8ed] border-white/[0.1]/40";
  }
}

export default function SirocRegistrosPage() {
  const log = clientLogger("REGISTROS");
  const { msg, flash, clear } = useFlashMessage();
  const [confirmState, setConfirmState] = useState<{ open: boolean; msg: string; onOk: () => void }>({ open: false, msg: "", onOk: () => {} });
  const [registros, setRegistros] = useState<SirocRegistro[]>([]);
  const [obras, setObras] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [search, setSearch] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => { cargar(); }, []);

  const validar = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.obra || !form.obra.trim()) {
      errors.obra = "Obra es requerida";
    }
    if (!form.numero_siroc || !form.numero_siroc.trim()) {
      errors.numero_siroc = "Número SIROC es requerido";
    }
    if (!form.fecha_inicio) {
      errors.fecha_inicio = "Fecha de inicio es requerida";
    }
    if (form.importe_total && isNaN(Number(form.importe_total))) {
      errors.importe_total = "El importe debe ser un número válido";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  async function cargar() {
    setLoading(true);
    const { data: ct } = await supabase.from("centros_trabajo").select("*");
    setObras((ct || []).map((o: { nombre: string }) => o.nombre).sort());
    const { data, error } = await supabase.from("siroc_registros").select("*").order("created_at", { ascending: false });
    if (error) log.error("siroc_registros error:", { error: error });
    setRegistros(data || []);
    setLoading(false);
  }

  async function guardar() {
    if (!validar()) { flash("err", "Por favor corrige los errores en el formulario"); return; }
    setGuardando(true);
    const payload = {
      obra: form.obra,
      registro_patronal: form.registro_patronal || null,
      numero_siroc: form.numero_siroc,
      clase_riesgo: form.clase_riesgo,
      tipo_obra: form.tipo_obra || null,
      modalidad: form.modalidad,
      fecha_inicio: form.fecha_inicio,
      fecha_fin_estimada: form.fecha_fin_estimada || null,
      fecha_fin_real: form.fecha_fin_real || null,
      importe_total: Number(form.importe_total) || 0,
      monto_ejercido: Number(form.monto_ejercido) || 0,
      superficie_construccion: Number(form.superficie_construccion) || 0,
      trabajadores_promedio: Number(form.trabajadores_promedio) || 0,
      estado: form.estado,
      ultima_incidencia: form.ultima_incidencia || null,
      ultima_incidencia_fecha: form.ultima_incidencia_fecha || null,
      fecha_suspension: form.fecha_suspension || null,
      motivo_suspension: form.motivo_suspension || null,
      fecha_reanudacion: form.fecha_reanudacion || null,
      fecha_cancelacion: form.fecha_cancelacion || null,
      motivo_cancelacion: form.motivo_cancelacion || null,
      notas: form.notas || null,
    };
    let error;
    if (editando) ({ error } = await supabase.from("siroc_registros").update(payload).eq("id", editando));
    else ({ error } = await supabase.from("siroc_registros").insert(payload));
    setGuardando(false);
    if (error) { flash("err", "Error: " + (error as {message?: string})?.message || "Error desconocido"); return; }
    setShowForm(false); setEditando(null); setForm(EMPTY); cargar();
  }

  async function eliminar(id: string) {
    setConfirmState({ open: true, msg: "¿Eliminar este registro SIROC?", onOk: async () => {
      const { error } = await supabase.from("siroc_registros").delete().eq("id", id);
      if (error) { flash("err", "Error: " + (error as {message?: string})?.message || "Error desconocido"); return; }
      cargar();
    }});
  }

  function abrirEditar(r: SirocRegistro) {
    setEditando(r.id);
    setForm({ ...EMPTY, ...r });
    setShowForm(true);
  }

  const filtradas = registros.filter(r => {
    const s = search.toLowerCase();
    return !s || r.obra.toLowerCase().includes(s) || r.numero_siroc?.toLowerCase().includes(s);
  });

  const stats = {
    total: registros.length,
    enCurso: registros.filter(r => r.estado === "EN_CURSO").length,
    suspendidas: registros.filter(r => r.estado === "SUSPENDIDA").length,
    terminadas: registros.filter(r => r.estado === "TERMINADA").length,
    importeTotal: registros.reduce((s, r) => s + (Number(r.importe_total) || 0), 0),
  };

  return (
    <div className="space-y-6">
      <FlashBanner msg={msg} className="mx-6" />
      <div className="flex items-center gap-4">
        <AriaBackButton href="/dashboard/obras" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3"><ShieldCheck className="w-8 h-8 text-red-400" />SIROC IMSS · Registros</h1>
          <p className="text-[#7f93b0] mt-1">Registro estructurado de obras ante IMSS.</p>
        </div>
        <Link href="/dashboard/obras/siroc/bimestrales" className="px-3 py-2 bg-amber-600/80 hover:bg-amber-600 text-white rounded-lg text-sm">Reportes bimestrales</Link>
        <Link href="/dashboard/obras/siroc" className="px-3 py-2 bg-white/[0.05] hover:bg-[#0f2448] text-white rounded-lg text-sm">Carpetas</Link>
        <button onClick={() => { setEditando(null); setForm(EMPTY); setShowForm(true); }}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 font-medium">
          <Plus className="w-5 h-5" /> Nuevo registro
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { l: "Total", v: stats.total, c: "text-white" },
          { l: "En curso", v: stats.enCurso, c: "text-emerald-300" },
          { l: "Suspendidas", v: stats.suspendidas, c: "text-amber-300" },
          { l: "Terminadas", v: stats.terminadas, c: "text-[#c9d8ed]" },
          { l: "Importe total", v: `$${stats.importeTotal.toLocaleString("es-MX")}`, c: "text-aria-accent" },
        ].map((k, i) => (
          <div key={i} className="rounded-xl bg-[#0c1d38]/50 border border-white/[0.05] p-4">
            <div className="text-xs text-[#7f93b0] uppercase">{k.l}</div>
            <div className={`text-2xl font-bold ${k.c}`}>{k.v}</div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7f93b0]" />
        <input type="text" placeholder="Buscar por obra o número SIROC..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-[#0c1d38]/50 border border-white/[0.08] rounded-lg text-white placeholder-[#4a6080] focus:outline-none focus:border-red-500" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-red-400" /></div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-12 text-[#7f93b0]">No hay registros SIROC.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.05]">
          <table className="w-full text-sm">
            <thead className="bg-[#0c1d38]/80 text-[#c9d8ed] sticky top-0">
              <tr>
                <th className="text-left p-3">Obra</th>
                <th className="text-left p-3"># SIROC</th>
                <th className="text-left p-3">Modalidad</th>
                <th className="text-left p-3">Clase R.</th>
                <th className="text-left p-3">Inicio</th>
                <th className="text-left p-3">Fin estim.</th>
                <th className="text-right p-3">Importe</th>
                <th className="text-center p-3">Trab.</th>
                <th className="text-center p-3">Estado</th>
                <th className="text-center p-3">Acc.</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(r => (
                <tr key={r.id} className="border-t border-white/[0.08]/30 hover:bg-[#0c1d38]/30">
                  <td className="p-3 text-white font-medium">{r.obra}</td>
                  <td className="p-3 text-[#c9d8ed] font-mono">{r.numero_siroc}</td>
                  <td className="p-3 text-[#c9d8ed]">{r.modalidad}</td>
                  <td className="p-3 text-[#c9d8ed]">{r.clase_riesgo}</td>
                  <td className="p-3 text-[#c9d8ed]">{r.fecha_inicio ? new Date(r.fecha_inicio).toLocaleDateString("es-MX") : "—"}</td>
                  <td className="p-3 text-[#c9d8ed]">{r.fecha_fin_estimada ? new Date(r.fecha_fin_estimada).toLocaleDateString("es-MX") : "—"}</td>
                  <td className="p-3 text-right text-white">${(Number(r.importe_total) || 0).toLocaleString("es-MX")}</td>
                  <td className="p-3 text-center text-[#c9d8ed]">{r.trabajadores_promedio || 0}</td>
                  <td className="p-3 text-center"><span className={`px-2 py-1 text-xs rounded-full border ${colorEstado(r.estado)}`}>{r.estado}</span></td>
                  <td className="p-3">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => abrirEditar(r)} className="p-1.5 bg-white/[0.05] hover:bg-[#0f2448] rounded"><Edit2 className="w-4 h-4 text-white" /></button>
                      <button onClick={() => eliminar(r.id)} className="p-1.5 bg-rose-600/80 hover:bg-rose-600 rounded"><Trash2 className="w-4 h-4 text-white" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0a1628] border border-white/[0.08] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#0a1628] border-b border-white/[0.08] p-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{editando ? "Editar registro SIROC" : "Nuevo registro SIROC"}</h2>
              <button onClick={() => { setShowForm(false); setEditando(null); setForm(EMPTY); }} className="p-1 rounded hover:bg-white/[0.06]"><X className="w-5 h-5 text-[#7f93b0]" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#7f93b0] mb-1 block">Obra *</label>
                  <select value={form.obra} onChange={e => setForm({ ...form, obra: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-red-500">
                    <option value="">Seleccionar...</option>
                    {obras.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {formErrors.obra && <p className="text-red-400 text-xs mt-1">{formErrors.obra}</p>}
                </div>
                <div><label className="text-sm text-[#7f93b0] mb-1 block">Número SIROC *</label><input type="text" value={form.numero_siroc} onChange={e => setForm({ ...form, numero_siroc: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white font-mono focus:outline-none focus:border-red-500" />{formErrors.numero_siroc && <p className="text-red-400 text-xs mt-1">{formErrors.numero_siroc}</p>}</div>
                <div><label className="text-sm text-[#7f93b0] mb-1 block">Registro patronal</label><input type="text" value={form.registro_patronal} onChange={e => setForm({ ...form, registro_patronal: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white font-mono focus:outline-none focus:border-red-500" /></div>
                <div><label className="text-sm text-[#7f93b0] mb-1 block">Clase de riesgo</label><select value={form.clase_riesgo} onChange={e => setForm({ ...form, clase_riesgo: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-red-500">{CLASES_RIESGO.map(c => <option key={c} value={c}>Clase {c}</option>)}</select></div>
                <div><label className="text-sm text-[#7f93b0] mb-1 block">Tipo de obra</label><input type="text" value={form.tipo_obra} onChange={e => setForm({ ...form, tipo_obra: e.target.value })} placeholder="Edificación, Vivienda..." className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-red-500" /></div>
                <div><label className="text-sm text-[#7f93b0] mb-1 block">Modalidad</label><select value={form.modalidad} onChange={e => setForm({ ...form, modalidad: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-red-500">{MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                <div><label className="text-sm text-[#7f93b0] mb-1 block">Fecha inicio *</label><input type="date" value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-red-500" />{formErrors.fecha_inicio && <p className="text-red-400 text-xs mt-1">{formErrors.fecha_inicio}</p>}</div>
                <div><label className="text-sm text-[#7f93b0] mb-1 block">Fecha fin estimada</label><input type="date" value={form.fecha_fin_estimada} onChange={e => setForm({ ...form, fecha_fin_estimada: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-red-500" /></div>
                <div><label className="text-sm text-[#7f93b0] mb-1 block">Importe total contrato ($)</label><input type="number" min="0" value={form.importe_total} onChange={e => setForm({ ...form, importe_total: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-red-500" />{formErrors.importe_total && <p className="text-red-400 text-xs mt-1">{formErrors.importe_total}</p>}</div>
                <div><label className="text-sm text-[#7f93b0] mb-1 block">Monto ejercido acum. ($)</label><input type="number" min="0" value={form.monto_ejercido} onChange={e => setForm({ ...form, monto_ejercido: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-red-500" /></div>
                <div><label className="text-sm text-[#7f93b0] mb-1 block">Superficie construcción (m²)</label><input type="number" min="0" step="0.01" value={form.superficie_construccion} onChange={e => setForm({ ...form, superficie_construccion: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-red-500" /></div>
                <div><label className="text-sm text-[#7f93b0] mb-1 block">Trabajadores promedio</label><input type="number" min="0" value={form.trabajadores_promedio} onChange={e => setForm({ ...form, trabajadores_promedio: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-red-500" /></div>
                <div><label className="text-sm text-[#7f93b0] mb-1 block">Estado</label><select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-red-500">{ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
                <div><label className="text-sm text-[#7f93b0] mb-1 block">Fecha fin real</label><input type="date" value={form.fecha_fin_real} onChange={e => setForm({ ...form, fecha_fin_real: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-red-500" /></div>
                <div><label className="text-sm text-[#7f93b0] mb-1 block">Última incidencia</label><select value={form.ultima_incidencia} onChange={e => setForm({ ...form, ultima_incidencia: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-red-500">{INCIDENCIAS.map(i => <option key={i} value={i}>{i || "Ninguna"}</option>)}</select></div>
                <div><label className="text-sm text-[#7f93b0] mb-1 block">Fecha incidencia</label><input type="date" value={form.ultima_incidencia_fecha} onChange={e => setForm({ ...form, ultima_incidencia_fecha: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-red-500" /></div>
                <div><label className="text-sm text-[#7f93b0] mb-1 block">Fecha suspensión</label><input type="date" value={form.fecha_suspension} onChange={e => setForm({ ...form, fecha_suspension: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-red-500" /></div>
                <div><label className="text-sm text-[#7f93b0] mb-1 block">Fecha reanudación</label><input type="date" value={form.fecha_reanudacion} onChange={e => setForm({ ...form, fecha_reanudacion: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-red-500" /></div>
                <div className="col-span-2"><label className="text-sm text-[#7f93b0] mb-1 block">Motivo suspensión</label><input type="text" value={form.motivo_suspension} onChange={e => setForm({ ...form, motivo_suspension: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-red-500" /></div>
                <div><label className="text-sm text-[#7f93b0] mb-1 block">Fecha cancelación</label><input type="date" value={form.fecha_cancelacion} onChange={e => setForm({ ...form, fecha_cancelacion: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-red-500" /></div>
                <div><label className="text-sm text-[#7f93b0] mb-1 block">Motivo cancelación</label><input type="text" value={form.motivo_cancelacion} onChange={e => setForm({ ...form, motivo_cancelacion: e.target.value })} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-red-500" /></div>
              </div>
              <div><label className="text-sm text-[#7f93b0] mb-1 block">Notas</label><textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={3} className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-red-500" /></div>
            </div>
            <div className="sticky bottom-0 bg-[#0a1628] border-t border-white/[0.08] p-5 flex justify-end gap-3">
              <button onClick={() => { setShowForm(false); setEditando(null); setForm(EMPTY); }} className="px-4 py-2 bg-[#0f2448] hover:bg-[#162040] text-white rounded-lg">Cancelar</button>
              <button onClick={guardar} disabled={guardando} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50">
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Guardar
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
