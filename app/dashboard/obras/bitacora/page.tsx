"use client";
import { clientLogger } from "@/lib/client-logger";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BookOpen, Plus, X, Loader2, Cloud, Users, AlertTriangle, Camera } from "lucide-react";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import AriaBackButton from "@/components/AriaBackButton";

interface Obra { id: number; nombre: string; }
interface Entrada {
  id: string;
  obra_id: number | null;
  obra_nombre: string;
  fecha: string;
  clima: string | null;
  personal_en_obra: number | null;
  maquinaria: string | null;
  actividades: string | null;
  observaciones: string | null;
  incidentes: string | null;
  fotos: string[] | null;
  residente_nombre: string | null;
  hora_registro: string | null;
  created_at: string;
}

const FORM_INIT = {
  fecha: new Date().toISOString().slice(0,10),
  clima: "Soleado",
  personal_en_obra: 0,
  maquinaria: "",
  actividades: "",
  observaciones: "",
  incidentes: "",
  fotos: "",
};

function BitacoraContent() {
  const log = clientLogger("BITACORA");
  const sp = useSearchParams();
  const obraQuery = sp.get("obra") || "";
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraSel, setObraSel] = useState<string>(obraQuery);
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...FORM_INIT });
  const { msg, flash, clear } = useFlashMessage();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("centros_trabajo").select("id, nombre").order("nombre");
      setObras((data as Obra[]) || []);
    })();
  }, []);

  useEffect(() => { loadEntradas(); }, [obraSel]);

  async function loadEntradas() {
    setLoading(true);
    let q = supabase.from("bitacora_obra").select("*").order("fecha", { ascending: false }).order("created_at", { ascending: false }).limit(200);
    if (obraSel) q = q.eq("obra_nombre", obraSel);
    const { data, error } = await q;
    if (error) log.error((error as {message?: string})?.message || "Error desconocido");
    setEntradas((data as Entrada[]) || []);
    setLoading(false);
  }

  async function guardar() {
    if (!obraSel) { flash("err", "Selecciona una obra"); return; }
    if (!form.fecha) { flash("err", "Fecha es requerida"); return; }
    if (!form.actividades?.trim()) { flash("err", "Las actividades son requeridas"); return; }
    if (isNaN(Number(form.personal_en_obra)) || Number(form.personal_en_obra) < 0) { flash("err", "Personal en obra debe ser >= 0"); return; }
    const obra = obras.find(o => o.nombre === obraSel);
    const fotosArr = form.fotos.split(",").map(s => s.trim()).filter(Boolean);
    const payload = {
      obra_id: obra?.id || null,
      obra_nombre: obraSel,
      fecha: form.fecha,
      clima: form.clima,
      personal_en_obra: Number(form.personal_en_obra) || 0,
      maquinaria: form.maquinaria,
      actividades: form.actividades,
      observaciones: form.observaciones,
      incidentes: form.incidentes,
      fotos: fotosArr,
      residente_nombre: typeof window !== "undefined" ? localStorage.getItem("userEmail") || null : null,
      hora_registro: new Date().toTimeString().slice(0,8),
      recibido_por_whatsapp: false,
    };
    const { error } = await supabase.from("bitacora_obra").insert(payload);
    if (error) { flash("err", "Error: " + (error as {message?: string})?.message || "Error desconocido"); return; }
    setForm({ ...FORM_INIT });
    setShowForm(false);
    loadEntradas();
    flash("ok", "Entrada registrada exitosamente");
  }

  const totalEntradas = entradas.length;
  const conIncidentes = entradas.filter(e => e.incidentes && e.incidentes.trim().length > 0).length;
  const personalProm = entradas.length > 0 ? Math.round(entradas.reduce((s, e) => s + (e.personal_en_obra || 0), 0) / entradas.length) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <FlashBanner msg={msg} className="mx-6 mt-3" />
      <div className="sticky top-0 z-10 bg-gradient-to-b from-slate-950 via-slate-950/95 to-transparent pb-4">
        <div className="flex items-center gap-4">
          <AriaBackButton href="/dashboard/obras" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-amber-400" /> Bitácora de Obra
            </h1>
            <p className="text-[#7f93b0] text-sm">Registro diario de actividades, personal, clima e incidencias</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} disabled={!obraSel} className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-50 text-amber-300 rounded-lg flex items-center gap-2 text-sm">
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancelar" : "Nueva entrada"}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <select value={obraSel} onChange={e => setObraSel(e.target.value)} className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm min-w-[280px]">
            <option value="">— Selecciona obra —</option>
            {obras.map(o => <option key={o.id} value={o.nombre}>{o.nombre}</option>)}
          </select>
        </div>
      </div>

      {obraSel && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 aria-card-steel">
            <p className="text-sm text-[#7f93b0]">Entradas registradas</p>
            <p className="text-2xl font-bold text-white">{totalEntradas}</p>
          </div>
          <div className="p-4 aria-card-steel">
            <p className="text-sm text-[#7f93b0]">Personal promedio</p>
            <p className="text-2xl font-bold text-white">{personalProm}</p>
          </div>
          <div className="p-4 aria-card-steel">
            <p className="text-sm text-[#7f93b0]">Días con incidentes</p>
            <p className="text-2xl font-bold text-red-400">{conIncidentes}</p>
          </div>
        </div>
      )}

      {showForm && obraSel && (
        <div className="p-6 aria-card-steel space-y-4">
          <h3 className="text-lg font-semibold text-white">Nueva entrada · {obraSel}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-[#7f93b0]">Fecha *</label>
              <input type="date" required value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-[#7f93b0]">Clima</label>
              <select value={form.clima} onChange={e => setForm({ ...form, clima: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm">
                <option>Soleado</option><option>Nublado</option><option>Lluvioso</option><option>Tormenta</option><option>Frío</option><option>Caluroso</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#7f93b0]">Personal en obra *</label>
              <input type="number" required min="0" value={form.personal_en_obra} onChange={e => setForm({ ...form, personal_en_obra: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm" />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-[#7f93b0]">Actividades del día *</label>
              <textarea required value={form.actividades} onChange={e => setForm({ ...form, actividades: e.target.value })} rows={3} placeholder="Avance, áreas trabajadas, materiales colocados..." className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm" />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-[#7f93b0]">Maquinaria utilizada</label>
              <input value={form.maquinaria} onChange={e => setForm({ ...form, maquinaria: e.target.value })} placeholder="Retro, vibrocompactador, ..." className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm" />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-[#7f93b0]">Observaciones</label>
              <textarea value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} rows={2} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm" />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-[#7f93b0]">Incidentes (vacío si todo OK)</label>
              <textarea value={form.incidentes} onChange={e => setForm({ ...form, incidentes: e.target.value })} rows={2} placeholder="Accidentes, retrasos, problemas..." className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm" />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-[#7f93b0]">Fotos (URLs separadas por coma)</label>
              <input value={form.fotos} onChange={e => setForm({ ...form, fotos: e.target.value })} placeholder="https://..., https://..." className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={guardar} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm">Guardar entrada</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-white/[0.04] text-[#c9d8ed] rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {loading && <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-amber-400" /></div>}
        {!loading && entradas.length === 0 && (
          <div className="text-center py-12 text-[#7f93b0] aria-card-steel">
            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>{obraSel ? "Sin entradas en bitácora" : "Selecciona una obra para ver su bitácora"}</p>
          </div>
        )}
        {!loading && entradas.map(e => (
          <div key={e.id} className="p-5 aria-card-steel">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-white font-semibold text-lg">{new Date(e.fecha).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
                <p className="text-xs text-[#7f93b0]">{e.obra_nombre} · {e.residente_nombre || "—"} · {e.hora_registro || ""}</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {e.clima && <span className="inline-flex items-center gap-1 px-2 py-1 bg-aria-primary-light text-aria-accent rounded"><Cloud className="w-3 h-3" />{e.clima}</span>}
                {e.personal_en_obra !== null && <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-aria-accent rounded"><Users className="w-3 h-3" />{e.personal_en_obra}</span>}
                {e.fotos && e.fotos.length > 0 && <span className="inline-flex items-center gap-1 px-2 py-1 bg-aria-primary-light text-aria-accent rounded"><Camera className="w-3 h-3" />{e.fotos.length}</span>}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-[#7f93b0] text-xs uppercase">Actividades</p>
                <p className="text-white whitespace-pre-line">{e.actividades || "—"}</p>
              </div>
              {e.maquinaria && <div><p className="text-[#7f93b0] text-xs uppercase">Maquinaria</p><p className="text-[#c9d8ed]">{e.maquinaria}</p></div>}
              {e.observaciones && <div><p className="text-[#7f93b0] text-xs uppercase">Observaciones</p><p className="text-[#c9d8ed]">{e.observaciones}</p></div>}
              {e.incidentes && (
                <div className="p-3 bg-white/[0.02] border border-white/[0.08] rounded-lg">
                  <p className="text-red-300 text-xs uppercase flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Incidentes</p>
                  <p className="text-red-200">{e.incidentes}</p>
                </div>
              )}
              {e.fotos && e.fotos.length > 0 && (
                <div className="flex gap-2 flex-wrap pt-2">
                  {e.fotos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-aria-accent underline hover:text-[#c9d8ed]">Foto {i+1}</a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BitacoraPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-amber-400" /></div>}>
      <BitacoraContent />
    </Suspense>
  );
}
