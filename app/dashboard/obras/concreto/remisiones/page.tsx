"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, Edit2, X, Save, Loader2, Droplet, Trash2, Search, FlaskConical, CheckCircle2, XCircle } from "lucide-react";
import FlashBanner from "@/components/FlashBanner";
import ConfirmModal from "@/components/ConfirmModal";
import { useFlashMessage } from "@/lib/use-flash-message";

interface Remision {
  id: string;
  obra: string;
  proveedor: string;
  numero_remision: string;
  fecha_colado: string;
  resistencia_fc: string;
  revenimiento: number;
  m3: number;
  elemento: string;
  temperatura: number;
  costo_unitario: number;
  costo_total: number;
  observaciones: string;
  created_by: string;
  created_at: string;
}

interface Cilindro {
  id: string;
  remision_id: string;
  numero_cilindro: string;
  fecha_prueba: string;
  dias_edad: number;
  resistencia_alcanzada: number;
  cumple: boolean;
  laboratorio: string;
  created_at: string;
}

const EMPTY_REM: any = { obra: "", proveedor: "", numero_remision: "", fecha_colado: "", resistencia_fc: "f'c=250 kg/cm2", revenimiento: 10, m3: 0, elemento: "", temperatura: 22, costo_unitario: 0, observaciones: "" };
const EMPTY_CIL: any = { numero_cilindro: "", fecha_prueba: "", dias_edad: 28, resistencia_alcanzada: 0, cumple: true, laboratorio: "" };

export default function ConcretoRemisionesPage() {
  const [remisiones, setRemisiones] = useState<Remision[]>([]);
  const [cilindros, setCilindros] = useState<Cilindro[]>([]);
  const [obras, setObras] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [showFormRem, setShowFormRem] = useState(false);
  const [showFormCil, setShowFormCil] = useState(false);
  const [remActiva, setRemActiva] = useState<Remision | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [formRem, setFormRem] = useState<any>(EMPTY_REM);
  const [formCil, setFormCil] = useState<any>(EMPTY_CIL);
  const [search, setSearch] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [formRemErrors, setFormRemErrors] = useState<Record<string, string>>({});
  const [formCilErrors, setFormCilErrors] = useState<Record<string, string>>({});
  const { msg, flash, clear } = useFlashMessage();
  const [confirmState, setConfirmState] = useState<{ open: boolean; msg: string; onOk: () => void }>({ open: false, msg: "", onOk: () => {} });

  useEffect(() => {
    if (typeof window !== "undefined") setUserEmail(localStorage.getItem("userEmail") || "");
    cargar();
  }, []);

  const validarRem = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formRem.obra || !formRem.obra.trim()) {
      errors.obra = "Obra es requerida";
    }
    if (!formRem.numero_remision || !formRem.numero_remision.trim()) {
      errors.numero_remision = "Número de remisión es requerido";
    }
    if (!formRem.fecha_colado) {
      errors.fecha_colado = "Fecha de colado es requerida";
    }
    if (!formRem.m3 || isNaN(Number(formRem.m3)) || Number(formRem.m3) <= 0) {
      errors.m3 = "m³ debe ser mayor a 0";
    }
    setFormRemErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validarCil = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formCil.numero_cilindro || !formCil.numero_cilindro.trim()) {
      errors.numero_cilindro = "Número de cilindro es requerido";
    }
    if (!formCil.fecha_prueba) {
      errors.fecha_prueba = "Fecha de prueba es requerida";
    }
    if (!formCil.resistencia_alcanzada || isNaN(Number(formCil.resistencia_alcanzada)) || Number(formCil.resistencia_alcanzada) <= 0) {
      errors.resistencia_alcanzada = "Resistencia debe ser mayor a 0";
    }
    setFormCilErrors(errors);
    return Object.keys(errors).length === 0;
  };

  async function cargar() {
    setLoading(true);
    const { data: ct } = await supabase.from("centros_trabajo").select("*");
    setObras((ct || []).map((o: any) => o.nombre).sort());
    const { data: rems, error } = await supabase.from("concreto_remisiones").select("*").order("fecha_colado", { ascending: false });
    if (error) console.error("concreto_remisiones error:", error);
    setRemisiones(rems || []);
    const { data: cils } = await supabase.from("concreto_cilindros").select("*").order("dias_edad");
    setCilindros(cils || []);
    setLoading(false);
  }

  async function guardarRem() {
    if (!validarRem()) { flash("err", "Por favor corrige los errores en el formulario"); return; }
    setGuardando(true);
    const m3 = Number(formRem.m3) || 0;
    const cu = Number(formRem.costo_unitario) || 0;
    const payload = {
      obra: formRem.obra,
      proveedor: formRem.proveedor || null,
      numero_remision: formRem.numero_remision,
      fecha_colado: formRem.fecha_colado,
      resistencia_fc: formRem.resistencia_fc,
      revenimiento: Number(formRem.revenimiento) || 0,
      m3,
      elemento: formRem.elemento || null,
      temperatura: Number(formRem.temperatura) || 0,
      costo_unitario: cu,
      costo_total: m3 * cu,
      observaciones: formRem.observaciones || null,
      created_by: userEmail || "sistema",
    };
    let error;
    if (editando) ({ error } = await supabase.from("concreto_remisiones").update(payload).eq("id", editando));
    else ({ error } = await supabase.from("concreto_remisiones").insert(payload));
    setGuardando(false);
    if (error) { flash("err", "Error: " + error.message); return; }
    setShowFormRem(false); setEditando(null); setFormRem(EMPTY_REM); cargar();
    flash("ok", editando ? "Remisión actualizada" : "Remisión guardada");
  }

  async function eliminarRem(id: string) {
    setConfirmState({
      open: true,
      msg: "¿Eliminar esta remisión y sus pruebas de cilindro?",
      onOk: async () => {
        await supabase.from("concreto_cilindros").delete().eq("remision_id", id);
        const { error } = await supabase.from("concreto_remisiones").delete().eq("id", id);
        if (error) { flash("err", "Error: " + error.message); return; }
        cargar();
        flash("ok", "Remisión eliminada");
      }
    });
  }

  async function guardarCil() {
    if (!remActiva || !validarCil()) { flash("err", "Por favor corrige los errores en el formulario"); return; }
    setGuardando(true);
    const payload = {
      remision_id: remActiva.id,
      numero_cilindro: formCil.numero_cilindro,
      fecha_prueba: formCil.fecha_prueba,
      dias_edad: Number(formCil.dias_edad) || 28,
      resistencia_alcanzada: Number(formCil.resistencia_alcanzada) || 0,
      cumple: formCil.cumple,
      laboratorio: formCil.laboratorio || null,
    };
    const { error } = await supabase.from("concreto_cilindros").insert(payload);
    setGuardando(false);
    if (error) { flash("err", "Error: " + error.message); return; }
    setFormCil(EMPTY_CIL); cargar();
    flash("ok", "Prueba de cilindro guardada");
  }

  async function eliminarCil(id: string) {
    setConfirmState({
      open: true,
      msg: "¿Eliminar esta prueba?",
      onOk: async () => {
        await supabase.from("concreto_cilindros").delete().eq("id", id);
        cargar();
        flash("ok", "Prueba eliminada");
      }
    });
  }

  function abrirEditarRem(r: Remision) {
    setEditando(r.id);
    setFormRem({ ...EMPTY_REM, ...r });
    setShowFormRem(true);
  }

  const filtradas = remisiones.filter(r => {
    const s = search.toLowerCase();
    return !s || r.obra?.toLowerCase().includes(s) || r.numero_remision?.toLowerCase().includes(s) || r.elemento?.toLowerCase().includes(s);
  });

  const stats = {
    totalRem: remisiones.length,
    totalM3: remisiones.reduce((s, r) => s + (Number(r.m3) || 0), 0),
    costoTotal: remisiones.reduce((s, r) => s + (Number(r.costo_total) || 0), 0),
    pruebasOk: cilindros.filter(c => c.cumple).length,
    pruebasFail: cilindros.filter(c => !c.cumple).length,
  };

  const cilindrosPorRem = (remId: string) => cilindros.filter(c => c.remision_id === remId);

  return (
    <div className="space-y-6">
      <FlashBanner msg={msg} className="mx-6 mt-3" />
      <ConfirmModal open={confirmState.open} message={confirmState.msg} onConfirm={() => { confirmState.onOk(); setConfirmState(p => ({...p, open: false})); }} onCancel={() => setConfirmState(p => ({...p, open: false}))} />
      <div className="flex items-center gap-4">
        <Link href="/dashboard/obras" className="p-2 rounded-lg hover:bg-white/10"><ArrowLeft className="w-5 h-5 text-white" /></Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3"><Droplet className="w-8 h-8 text-aria-accent" />Control de Concreto · Remisiones</h1>
          <p className="text-slate-400 mt-1">Remisiones de colado y pruebas de cilindro 7/14/28 días.</p>
        </div>
        <Link href="/dashboard/obras/concreto" className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg text-sm">Carpetas</Link>
        <button onClick={() => { setEditando(null); setFormRem(EMPTY_REM); setShowFormRem(true); }}
          className="px-4 py-2 bg-aria-accent/80 hover:bg-aria-accent/80 text-white rounded-lg flex items-center gap-2 font-medium">
          <Plus className="w-5 h-5" /> Nueva remisión
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { l: "Remisiones", v: stats.totalRem, c: "text-white" },
          { l: "m³ totales", v: stats.totalM3.toLocaleString("es-MX"), c: "text-aria-accent" },
          { l: "Costo total", v: `$${stats.costoTotal.toLocaleString("es-MX")}`, c: "text-emerald-300" },
          { l: "Pruebas OK", v: stats.pruebasOk, c: "text-emerald-300" },
          { l: "Pruebas fallidas", v: stats.pruebasFail, c: "text-rose-300" },
        ].map((k, i) => (
          <div key={i} className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4">
            <div className="text-xs text-slate-400 uppercase">{k.l}</div>
            <div className={`text-2xl font-bold ${k.c}`}>{k.v}</div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Buscar por obra, número o elemento..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-aria-accent" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-aria-accent" /></div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No hay remisiones registradas.</div>
      ) : (
        <div className="space-y-4">
          {filtradas.map(r => {
            const cils = cilindrosPorRem(r.id);
            return (
              <div key={r.id} className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-white font-bold text-lg">{r.numero_remision}</span>
                      <span className="text-xs text-slate-400">{r.fecha_colado ? new Date(r.fecha_colado).toLocaleDateString("es-MX") : "—"}</span>
                    </div>
                    <div className="text-sm text-slate-300">{r.obra} · {r.elemento || "—"} · {r.proveedor || "—"}</div>
                    <div className="text-xs text-slate-400 mt-1">{r.resistencia_fc} · rev. {r.revenimiento}cm · temp. {r.temperatura}°C</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-aria-accent">{r.m3} m³</div>
                    <div className="text-sm text-emerald-300">${(Number(r.costo_total) || 0).toLocaleString("es-MX")}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50 flex-wrap gap-2">
                  <div className="flex gap-2 flex-wrap">
                    {cils.length === 0 ? (
                      <span className="text-xs text-slate-500">Sin pruebas</span>
                    ) : cils.map(c => (
                      <div key={c.id} className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${c.cumple ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/40" : "bg-rose-500/10 text-rose-300 border-rose-500/40"}`}>
                        {c.cumple ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span className="font-mono">{c.numero_cilindro}</span> · {c.dias_edad}d · {c.resistencia_alcanzada}kg
                        <button onClick={() => eliminarCil(c.id)} className="ml-1 opacity-50 hover:opacity-100"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setRemActiva(r); setFormCil(EMPTY_CIL); setShowFormCil(true); }}
                      className="px-3 py-1 text-xs bg-aria-accent/80/80 hover:bg-aria-accent/80 text-white rounded flex items-center gap-1">
                      <FlaskConical className="w-3 h-3" /> Agregar prueba
                    </button>
                    <button onClick={() => abrirEditarRem(r)} className="p-1.5 bg-slate-700/50 hover:bg-slate-700 rounded"><Edit2 className="w-4 h-4 text-white" /></button>
                    <button onClick={() => eliminarRem(r.id)} className="p-1.5 bg-rose-600/80 hover:bg-rose-600 rounded"><Trash2 className="w-4 h-4 text-white" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showFormRem && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{editando ? "Editar remisión" : "Nueva remisión de concreto"}</h2>
              <button onClick={() => { setShowFormRem(false); setEditando(null); setFormRem(EMPTY_REM); }} className="p-1 rounded hover:bg-white/10"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm text-slate-400 mb-1 block">Obra *</label><select value={formRem.obra} onChange={e => setFormRem({ ...formRem, obra: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-aria-accent"><option value="">Seleccionar...</option>{obras.map(o => <option key={o} value={o}>{o}</option>)}</select>{formRemErrors.obra && <p className="text-red-400 text-xs mt-1">{formRemErrors.obra}</p>}</div>
                <div><label className="text-sm text-slate-400 mb-1 block">Número remisión *</label><input type="text" value={formRem.numero_remision} onChange={e => setFormRem({ ...formRem, numero_remision: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-aria-accent" />{formRemErrors.numero_remision && <p className="text-red-400 text-xs mt-1">{formRemErrors.numero_remision}</p>}</div>
                <div><label className="text-sm text-slate-400 mb-1 block">Proveedor</label><input type="text" value={formRem.proveedor} onChange={e => setFormRem({ ...formRem, proveedor: e.target.value })} placeholder="CEMEX, HOLCIM..." className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-aria-accent" /></div>
                <div><label className="text-sm text-slate-400 mb-1 block">Fecha colado *</label><input type="date" value={formRem.fecha_colado} onChange={e => setFormRem({ ...formRem, fecha_colado: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-aria-accent" />{formRemErrors.fecha_colado && <p className="text-red-400 text-xs mt-1">{formRemErrors.fecha_colado}</p>}</div>
                <div><label className="text-sm text-slate-400 mb-1 block">Resistencia f'c</label><input type="text" value={formRem.resistencia_fc} onChange={e => setFormRem({ ...formRem, resistencia_fc: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-aria-accent" /></div>
                <div><label className="text-sm text-slate-400 mb-1 block">Revenimiento (cm)</label><input type="number" min="0" step="0.5" value={formRem.revenimiento} onChange={e => setFormRem({ ...formRem, revenimiento: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-aria-accent" /></div>
                <div><label className="text-sm text-slate-400 mb-1 block">m³ *</label><input type="number" min="0" step="0.5" value={formRem.m3} onChange={e => setFormRem({ ...formRem, m3: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-aria-accent" />{formRemErrors.m3 && <p className="text-red-400 text-xs mt-1">{formRemErrors.m3}</p>}</div>
                <div><label className="text-sm text-slate-400 mb-1 block">Elemento</label><input type="text" value={formRem.elemento} onChange={e => setFormRem({ ...formRem, elemento: e.target.value })} placeholder="Losa N1, Castillo C-1, Zapata Z-3..." className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-aria-accent" /></div>
                <div><label className="text-sm text-slate-400 mb-1 block">Temperatura (°C)</label><input type="number" min="0" value={formRem.temperatura} onChange={e => setFormRem({ ...formRem, temperatura: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-aria-accent" /></div>
                <div><label className="text-sm text-slate-400 mb-1 block">Costo por m³ ($)</label><input type="number" min="0" value={formRem.costo_unitario} onChange={e => setFormRem({ ...formRem, costo_unitario: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-aria-accent" /></div>
              </div>
              <div><label className="text-sm text-slate-400 mb-1 block">Observaciones</label><textarea value={formRem.observaciones} onChange={e => setFormRem({ ...formRem, observaciones: e.target.value })} rows={2} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-aria-accent" /></div>
              <div className="text-sm text-slate-400">Total estimado: <span className="text-emerald-300 font-bold">${((Number(formRem.m3) || 0) * (Number(formRem.costo_unitario) || 0)).toLocaleString("es-MX")}</span></div>
            </div>
            <div className="sticky bottom-0 bg-slate-900 border-t border-slate-700 p-5 flex justify-end gap-3">
              <button onClick={() => { setShowFormRem(false); setEditando(null); setFormRem(EMPTY_REM); }} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">Cancelar</button>
              <button onClick={guardarRem} disabled={guardando} className="px-4 py-2 bg-aria-accent/80 hover:bg-aria-accent/80 text-white rounded-lg flex items-center gap-2 disabled:opacity-50">{guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Guardar</button>
            </div>
          </div>
        </div>
      )}

      {showFormCil && remActiva && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full">
            <div className="p-5 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Prueba de cilindro</h2>
                <p className="text-sm text-slate-400">Remisión {remActiva.numero_remision} · {remActiva.resistencia_fc}</p>
              </div>
              <button onClick={() => { setShowFormCil(false); setRemActiva(null); setFormCil(EMPTY_CIL); }} className="p-1 rounded hover:bg-white/10"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm text-slate-400 mb-1 block">N° cilindro *</label><input type="text" value={formCil.numero_cilindro} onChange={e => setFormCil({ ...formCil, numero_cilindro: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-aria-accent" />{formCilErrors.numero_cilindro && <p className="text-red-400 text-xs mt-1">{formCilErrors.numero_cilindro}</p>}</div>
                <div><label className="text-sm text-slate-400 mb-1 block">Edad (días)</label><select value={formCil.dias_edad} onChange={e => setFormCil({ ...formCil, dias_edad: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-aria-accent">{[3, 7, 14, 28, 56].map(d => <option key={d} value={d}>{d} días</option>)}</select></div>
                <div><label className="text-sm text-slate-400 mb-1 block">Fecha prueba *</label><input type="date" value={formCil.fecha_prueba} onChange={e => setFormCil({ ...formCil, fecha_prueba: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-aria-accent" />{formCilErrors.fecha_prueba && <p className="text-red-400 text-xs mt-1">{formCilErrors.fecha_prueba}</p>}</div>
                <div><label className="text-sm text-slate-400 mb-1 block">Resistencia (kg/cm²) *</label><input type="number" min="0" value={formCil.resistencia_alcanzada} onChange={e => setFormCil({ ...formCil, resistencia_alcanzada: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-aria-accent" />{formCilErrors.resistencia_alcanzada && <p className="text-red-400 text-xs mt-1">{formCilErrors.resistencia_alcanzada}</p>}</div>
                <div className="col-span-2"><label className="text-sm text-slate-400 mb-1 block">Laboratorio</label><input type="text" value={formCil.laboratorio} onChange={e => setFormCil({ ...formCil, laboratorio: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-aria-accent" /></div>
                <div className="col-span-2 flex items-center gap-3"><input type="checkbox" id="cumple" checked={formCil.cumple} onChange={e => setFormCil({ ...formCil, cumple: e.target.checked })} className="w-5 h-5 accent-emerald-500" /><label htmlFor="cumple" className="text-white font-medium">Cumple con f'c especificado</label></div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-700 flex justify-end gap-3">
              <button onClick={() => { setShowFormCil(false); setRemActiva(null); setFormCil(EMPTY_CIL); }} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">Cancelar</button>
              <button onClick={guardarCil} disabled={guardando} className="px-4 py-2 bg-aria-accent/80 hover:bg-aria-accent/80 text-white rounded-lg flex items-center gap-2 disabled:opacity-50">{guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Guardar prueba</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
