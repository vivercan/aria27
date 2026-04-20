"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { uploadAndInsert, buildPath, deleteRowAndBlob } from "@/lib/storage";
import {
  Plus, Search, Edit2, Save, X, Loader2, Upload,
  FileText, Eye, Trash2, Power, Library, RefreshCw
} from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import AriaBackButton from "@/components/AriaBackButton";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";

/**
 * BIBLIOTECA GLOBAL DE PLANTILLAS — Bloque 5 cierre funcional ARIA27 (7-Abr-2026)
 *
 * Tabla: public.plantillas_globales (ver sql/clientes_plantillas.sql)
 * NO usa entity_documents — biblioteca global reusable independiente.
 * Soporta carga de archivo base (bucket 'expedientes') o contenido en texto.
 */

const CATEGORIAS = [
  "Contrato",
  "Cotización",
  "Orden de compra",
  "Carta",
  "Formato interno",
  "Reporte",
  "Checklist",
  "Solicitud",
  "Otro",
] as const;

interface Plantilla {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string | null;
  archivo_url: string | null;
  archivo_nombre: string | null;
  contenido: string | null;
  uploaded_by: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

const FORM_INIT = {
  nombre: "",
  categoria: "Contrato",
  descripcion: "",
  contenido: "",
};

export default function BibliotecaPlantillasPage() {
  const [items, setItems] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterEstatus, setFilterEstatus] = useState<"ACTIVAS" | "INACTIVAS" | "TODAS">("ACTIVAS");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...FORM_INIT });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  // EX-3 18-Abr-2026: flash canónico via useFlashMessage
  const { msg, flash } = useFlashMessage(2800);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; msg: string; onOk: () => void }>({ open: false, msg: "", onOk: () => {} });

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("plantillas_globales")
      .select("*")
      .order("categoria")
      .order("nombre");
    if (error) {
      if ((error as {code?: string}).code === "42P01") {
        flash("err", "Falta crear tabla plantillas_globales. Ver sql/clientes_plantillas.sql");
      } else {
        flash("err", (error as {message?: string})?.message || "Error desconocido");
      }
      setItems([]);
    } else if (data) {
      setItems(data as Plantilla[]);
    }
    setLoading(false);
  };

  const validar = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.nombre?.trim()) errors.nombre = "El nombre es obligatorio";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const reset = () => {
    setForm({ ...FORM_INIT });
    setFile(null);
    setEditId(null);
    setShowForm(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const abrirEdicion = (p: Plantilla) => {
    setEditId(p.id);
    setForm({
      nombre: p.nombre || "",
      categoria: p.categoria || "Otro",
      descripcion: p.descripcion || "",
      contenido: p.contenido || "",
    });
    setFile(null);
    setShowForm(true);
  };

  const guardar = async () => {
    if (!validar()) return;
    setSaving(true);

    const payload: Record<string, unknown> = {
      nombre: form.nombre.trim(),
      categoria: form.categoria,
      descripcion: form.descripcion || null,
      contenido: form.contenido || null,
    };

    try {
      if (editId) {
        // Si hay archivo nuevo, subir y actualizar URL
        if (file) {
          const path = buildPath({ module: "plantillas_globales", scope: ["edit", editId], file });
          const { error: upErr } = await supabase.storage.from("expedientes").upload(path, file, { upsert: false });
          if (upErr) throw new Error(upErr.message);
          payload.archivo_url = supabase.storage.from("expedientes").getPublicUrl(path).data.publicUrl;
          payload.archivo_nombre = file.name;
        }
        const { error } = await supabase.from("plantillas_globales").update(payload).eq("id", editId);
        if (error) throw new Error((error as {message?: string})?.message || "Error desconocido");
        flash("ok", "Plantilla actualizada");
      } else {
        if (file) {
          // Crear con archivo
          const path = buildPath({ module: "plantillas_globales", scope: ["new"], file });
          await uploadAndInsert({
            bucket: "expedientes",
            path,
            file,
            table: "plantillas_globales",
            payload: { ...payload, archivo_nombre: file.name, activo: true },
            urlField: "archivo_url",
          });
        } else {
          // Sin archivo, solo contenido / metadatos
          const { error } = await supabase.from("plantillas_globales").insert({ ...payload, activo: true });
          if (error) throw new Error((error as {message?: string})?.message || "Error desconocido");
        }
        flash("ok", "Plantilla creada");
      }
      reset();
      cargar();
    } catch (e: unknown) {
      flash("err", "Error: " + (e as Error).message);
    }
    setSaving(false);
  };

  const toggleActivo = async (p: Plantilla) => {
    const nuevo = !p.activo;
    setConfirmState({ open: true, msg: `¿${nuevo ? "Reactivar" : "Dar de baja"} la plantilla "${p.nombre}"?`, onOk: async () => {
      const { error } = await supabase.from("plantillas_globales").update({ activo: nuevo }).eq("id", p.id);
      if (error) { flash("err", (error as {message?: string})?.message || "Error desconocido"); return; }
      flash("ok", `Plantilla → ${nuevo ? "ACTIVA" : "INACTIVA"}`);
      cargar();
    }});
  };

  const eliminar = async (p: Plantilla) => {
    setConfirmState({ open: true, msg: `¿Eliminar definitivamente "${p.nombre}"? Se respalda en deleted_records.`, onOk: async () => {
    try {
      if (p.archivo_url) {
        await deleteRowAndBlob({
          table: "plantillas_globales",
          id: p.id,
          userEmail: "anon",
          bucket: "expedientes",
          blobUrlField: "archivo_url",
        });
      } else {
        const { error } = await supabase.from("plantillas_globales").delete().eq("id", p.id);
        if (error) throw new Error((error as {message?: string})?.message || "Error desconocido");
      }
      flash("ok", "Plantilla eliminada");
      cargar();
    } catch (e: unknown) {
      flash("err", "Error: " + (e as Error).message);
    }
    }});
  };

  const filtradas = items.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || p.nombre.toLowerCase().includes(q)
      || (p.descripcion || "").toLowerCase().includes(q)
      || p.categoria.toLowerCase().includes(q);
    const matchCat = !filterCat || p.categoria === filterCat;
    let matchEst = true;
    if (filterEstatus === "ACTIVAS") matchEst = p.activo;
    else if (filterEstatus === "INACTIVAS") matchEst = !p.activo;
    return matchSearch && matchCat && matchEst;
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-none p-6 pb-3 border-b border-white/[0.08]">
        <AriaBackButton href="/dashboard/plantillas" />
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Library className="w-6 h-6 text-aria-accent" /> Biblioteca de Plantillas
            </h1>
            <p className="text-xs text-[#7f93b0]">Plantillas y formatos base reutilizables · independiente del expediente por entidad</p>
          </div>
          <button
            onClick={() => { if (showForm) reset(); else { setForm({ ...FORM_INIT }); setShowForm(true); } }}
            className="px-4 py-2 bg-[#1E3E7A] border border-[rgba(130,170,230,0.25)] text-white rounded-full text-sm font-medium hover:bg-[#2A4A8E] flex items-center gap-2"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancelar" : "Nueva plantilla"}
          </button>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6080]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar nombre, descripción o categoría…"
              className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:border-aria-primary/30 focus:outline-none"
            />
          </div>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm">
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterEstatus} onChange={e => setFilterEstatus(e.target.value as "ACTIVAS" | "INACTIVAS" | "TODAS")} className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm">
            <option value="ACTIVAS">Activas</option>
            <option value="INACTIVAS">Inactivas</option>
            <option value="TODAS">Todas</option>
          </select>
          <button onClick={cargar} title="Recargar" className="p-2 text-[#7f93b0] hover:text-white hover:bg-white/[0.06] rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* EX-3 18-Abr-2026: FlashBanner canónico */}
      <FlashBanner msg={msg} className="mx-6 mt-3" />

      {showForm && (
        <div className="flex-none mx-6 mt-3 p-5 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <h3 className="text-base font-semibold text-white mb-3">{editId ? "Editar plantilla" : "Nueva plantilla"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-[#7f93b0] mb-1 block">Nombre *</label>
              <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm" />
              {formErrors.nombre && <p className="text-red-400 text-xs mt-1">{formErrors.nombre}</p>}
            </div>
            <div>
              <label className="text-xs text-[#7f93b0] mb-1 block">Categoría</label>
              <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm">
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-[#7f93b0] mb-1 block">Descripción</label>
              <input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm" />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-[#7f93b0] mb-1 block">Archivo base (opcional — pdf, docx, xlsx, jpg)</label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="text-xs text-[#7f93b0] file:mr-3 file:px-3 file:py-1.5 file:rounded file:border-0 file:bg-aria-primary-light file:text-aria-accent file:text-xs"
                />
                {file && <span className="text-xs text-aria-accent">{file.name}</span>}
              </div>
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-[#7f93b0] mb-1 block">Contenido base en texto (alternativa al archivo)</label>
              <textarea value={form.contenido} onChange={e => setForm({ ...form, contenido: e.target.value })} rows={4} placeholder="Texto base / variables / instrucciones para reusar la plantilla" className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm font-mono" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={guardar} disabled={saving} className="px-5 py-2 bg-[#1E3E7A] hover:bg-[#2A4A8E] text-white font-medium rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.25)] text-sm font-medium flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editId ? "Guardar cambios" : "Crear plantilla"}
            </button>
            <button onClick={reset} className="px-5 py-2 bg-white/[0.04] hover:bg-white/[0.06] text-[#c9d8ed] rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[rgba(4,8,16,0.98)] backdrop-blur z-10">
              <tr className="text-[#7f93b0] text-xs uppercase">
                <th className="text-left p-3">Plantilla</th>
                <th className="text-left p-3">Categoría</th>
                <th className="text-left p-3">Archivo / Contenido</th>
                <th className="text-left p-3">Última modif.</th>
                <th className="text-center p-3">Estatus</th>
                <th className="text-center p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-aria-accent mx-auto" /></td></tr>
              ) : filtradas.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-[#4a6080]">Sin plantillas. Crea la primera con "Nueva plantilla".</td></tr>
              ) : filtradas.map(p => (
                <tr key={p.id} className={`border-t border-white/[0.05] hover:bg-white/[0.02] ${!p.activo ? "opacity-60" : ""}`}>
                  <td className="p-3">
                    <p className="text-white font-medium">{p.nombre}</p>
                    {p.descripcion && <p className="text-xs text-[#4a6080] truncate max-w-md">{p.descripcion}</p>}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-aria-primary-light text-aria-accent">{p.categoria}</span>
                  </td>
                  <td className="p-3 text-xs text-[#7f93b0]">
                    {p.archivo_nombre && <p className="text-aria-accent/80 flex items-center gap-1"><FileText className="w-3 h-3" /> {p.archivo_nombre}</p>}
                    {p.contenido && <p>{p.contenido.length} chars de texto</p>}
                    {!p.archivo_nombre && !p.contenido && "—"}
                  </td>
                  <td className="p-3 text-xs text-[#4a6080]">
                    {p.updated_at ? new Date(p.updated_at).toLocaleDateString("es-MX") : "—"}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${p.activo ? "bg-emerald-500/20 text-aria-accent" : "bg-slate-500/20 text-[#7f93b0]"}`}>
                      {p.activo ? "ACTIVA" : "INACTIVA"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      {p.archivo_url && (
                        <a href={p.archivo_url} target="_blank" rel="noopener noreferrer" title="Ver archivo" className="p-1.5 text-aria-accent/70 hover:text-aria-accent hover:bg-aria-primary-hover/10 rounded">
                          <Eye className="w-4 h-4" />
                        </a>
                      )}
                      <button onClick={() => abrirEdicion(p)} title="Editar" className="p-1.5 text-aria-accent/70 hover:text-aria-accent hover:bg-aria-primary-hover/10 rounded">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleActivo(p)} title={p.activo ? "Dar de baja" : "Reactivar"} className="p-1.5 text-amber-400/70 hover:text-amber-400 hover:bg-amber-500/10 rounded">
                        <Power className="w-4 h-4" />
                      </button>
                      <button onClick={() => eliminar(p)} title="Eliminar definitivo" className="p-1.5 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
