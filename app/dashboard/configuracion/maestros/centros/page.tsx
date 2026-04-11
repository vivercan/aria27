"use client";
import { useState, useEffect } from "react";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/lib/use-flash-message";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, MapPin, Edit2, Trash2, Save, X, Loader2 } from "lucide-react";
import Link from "next/link";

interface Centro {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  radio_metros: number;
  activo: boolean;
}

export default function CentrosPage() {
  const [centros, setCentros] = useState<Centro[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { msg, flash } = useFlashMessage();
  const [editando, setEditando] = useState<Centro | null>(null);
  const [form, setForm] = useState({ nombre: "", direccion: "", latitud: "", longitud: "", radio_metros: "100" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    const { data, error } = await supabase.from("centros_trabajo").select("*").order("nombre");
    if (error) {  setLoading(false); return; }
    if (data) setCentros(data);
    setLoading(false);
  };

  const abrirModal = (c?: Centro) => {
    if (c) {
      setEditando(c);
      setForm({ 
        nombre: c.nombre, 
        direccion: c.direccion || "", 
        latitud: c.latitud?.toString() || "", 
        longitud: c.longitud?.toString() || "",
        radio_metros: c.radio_metros?.toString() || "100"
      });
    } else {
      setEditando(null);
      setForm({ nombre: "", direccion: "", latitud: "", longitud: "", radio_metros: "100" });
    }
    setShowModal(true);
  };

  const validar = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.nombre.trim()) errors.nombre = "El nombre es obligatorio";
    if (form.latitud && (isNaN(parseFloat(form.latitud)) || parseFloat(form.latitud) < -90 || parseFloat(form.latitud) > 90)) {
      errors.latitud = "Latitud debe estar entre -90 y 90";
    }
    if (form.longitud && (isNaN(parseFloat(form.longitud)) || parseFloat(form.longitud) < -180 || parseFloat(form.longitud) > 180)) {
      errors.longitud = "Longitud debe estar entre -180 y 180";
    }
    if (form.radio_metros && (isNaN(parseInt(form.radio_metros)) || parseInt(form.radio_metros) < 1)) {
      errors.radio_metros = "Radio debe ser > 0";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;

    const datos = {
      nombre: form.nombre.trim(),
      direccion: form.direccion.trim() || null,
      latitud: form.latitud ? parseFloat(form.latitud) : null,
      longitud: form.longitud ? parseFloat(form.longitud) : null,
      radio_metros: parseInt(form.radio_metros) || 100
    };

    if (editando) {
      const { error } = await supabase.from("centros_trabajo").update(datos).eq("id", editando.id);
      if (error) {  flash("err", "Error: " + error?.message); return; }
      flash("ok", "Centro actualizado");
    } else {
      const nextNum = centros.length + 1;
      const { error } = await supabase.from("centros_trabajo").insert({ ...datos, codigo: `OBRA-${String(nextNum).padStart(3, "0")}`, activo: true });
      if (error) {  flash("err", "Error: " + error?.message); return; }
      flash("ok", "Centro creado");
    }
    setShowModal(false);
    cargar();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <FlashBanner msg={msg} className="mx-6 mt-3" />
      <div className="flex-none p-6 border-b border-white/10">
        <Link href="/dashboard/configuracion/maestros" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Maestros
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Centros de Trabajo</h1>
            <p className="text-slate-400">Obras con coordenadas GPS para geolocalización</p>
          </div>
          <button onClick={() => abrirModal()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            <Plus className="w-4 h-4" /> Nuevo Centro
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-center py-12 text-slate-400"><Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" /></div>
        ) : centros.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400 mb-4">No hay centros de trabajo</p>
            <p className="text-sm text-slate-500">Agrega obras con coordenadas GPS para el sistema de asistencias</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {centros.map(c => (
              <div key={c.id} className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.latitud ? "bg-emerald-500/20" : "bg-amber-500/20"}`}>
                      <MapPin className={`w-6 h-6 ${c.latitud ? "text-emerald-400" : "text-amber-400"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 bg-white/10 rounded text-slate-400">{c.codigo}</span>
                        <h3 className="font-semibold text-white">{c.nombre}</h3>
                      </div>
                      {c.direccion && <p className="text-sm text-slate-400">{c.direccion}</p>}
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                        {c.latitud && c.longitud ? (
                          <>
                            <span>📍 {c.latitud.toFixed(6)}, {c.longitud.toFixed(6)}</span>
                            <span>Radio: {c.radio_metros}m</span>
                          </>
                        ) : (
                          <span className="text-amber-400">⚠️ Sin coordenadas GPS</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => abrirModal(c)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">{editando ? "Editar" : "Nuevo"} Centro</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400">Nombre *</label>
                <input type="text" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                  className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white" placeholder="" />
                {formErrors.nombre && <p className="text-red-400 text-xs mt-1">{formErrors.nombre}</p>}
              </div>
              <div>
                <label className="text-sm text-slate-400">Dirección</label>
                <input type="text" value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})}
                  className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400">Latitud</label>
                  <input type="text" value={form.latitud} onChange={e => setForm({...form, latitud: e.target.value})}
                    className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white" placeholder="" />
                  {formErrors.latitud && <p className="text-red-400 text-xs mt-1">{formErrors.latitud}</p>}
                </div>
                <div>
                  <label className="text-sm text-slate-400">Longitud</label>
                  <input type="text" value={form.longitud} onChange={e => setForm({...form, longitud: e.target.value})}
                    className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white" placeholder="" />
                  {formErrors.longitud && <p className="text-red-400 text-xs mt-1">{formErrors.longitud}</p>}
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-400">Radio geocerca (metros)</label>
                <input type="number" value={form.radio_metros} onChange={e => setForm({...form, radio_metros: e.target.value})}
                  className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                {formErrors.radio_metros && <p className="text-red-400 text-xs mt-1">{formErrors.radio_metros}</p>}
              </div>
              <p className="text-xs text-slate-500">💡 Tip: Abre Google Maps, haz clic derecho en la ubicación y copia las coordenadas</p>
              <button onClick={guardar} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
