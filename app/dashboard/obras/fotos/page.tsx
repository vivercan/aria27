"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useDeletePermission } from "@/lib/use-delete-permission";
import { backupAndDelete } from "@/lib/backup-delete";
import DeleteModal from "@/components/DeleteModal";
import {
  ArrowLeft, Plus, Camera, Search, Upload, Eye, Trash2, X, Loader2, Image
} from "lucide-react";

interface Obra { id: number; nombre: string; }

interface Foto {
  id: string;
  obra_id: number;
  obra_nombre: string;
  fecha: string;
  url: string;
  descripcion: string;
  fase: string;
  ubicacion: string;
  responsable: string;
  created_at: string;
}

const FASE_OPTIONS = [
  { value: "excavacion", label: "Excavación" },
  { value: "cimentacion", label: "Cimentación" },
  { value: "estructura", label: "Estructura" },
  { value: "acabados", label: "Acabados" },
  { value: "entrega", label: "Entrega" },
];

const EMPTY_FORM = {
  obra_id: "", fecha: "", descripcion: "", fase: "estructura",
  ubicacion: "", responsable: "", file: null as File | null,
};

export default function FotosPage() {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const { userEmail, canDelete } = useDeletePermission();
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ ...EMPTY_FORM });
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroObra, setFiltroObra] = useState("");

  useEffect(() => {
    supabase.from("centros_trabajo").select("id,nombre").order("nombre").then(({ data }) => { if (data) setObras(data); });
    cargar();
  }, []);

  const cargar = async () => {
    const { data } = await supabase.from("fotos_avance").select("*").order("fecha", { ascending: false });
    if (data) setFotos(data);
    setLoading(false);
  };

  const msg = (tipo: "success" | "error", texto: string) => { setMensaje({ tipo, texto }); setTimeout(() => setMensaje(null), 3000); };

  const guardar = async () => {
    if (!form.obra_id) { msg("error", "Selecciona una obra"); return; }
    if (!form.file) { msg("error", "Selecciona una imagen"); return; }

    setGuardando(true);
    const obra = obras.find(o => String(o.id) === form.obra_id);

    const timestamp = Date.now();
    const ext = form.file.name.split(".").pop() || "jpg";
    const path = `fotos/${form.obra_id}/${timestamp}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("expedientes")
      .upload(path, form.file, { upsert: false });

    if (uploadError) {
      msg("error", uploadError.message);
      setGuardando(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("expedientes")
      .getPublicUrl(path);

    const payload: any = {
      obra_id: form.obra_id, obra_nombre: obra?.nombre || "",
      fecha: form.fecha || new Date().toISOString().split("T")[0],
      url: publicUrl, descripcion: form.descripcion?.trim() || null,
      fase: form.fase, ubicacion: form.ubicacion?.trim() || null,
      responsable: form.responsable?.trim() || null,
    };

    const { error } = await supabase.from("fotos_avance").insert(payload);
    if (error) msg("error", error?.message ?? "Error");
    else { msg("success", "Foto registrada"); setShowForm(false); cargar(); }
    setGuardando(false);
  };

  const confirmDelete = async () => {
    try { await backupAndDelete({ table: "fotos_avance", id: deleteModal.id, userEmail }); msg("success", "Eliminado"); } catch (e: any) { msg("error", e?.message || "Error"); }
    setDeleteModal({ open: false, id: "", name: "" }); cargar();
  };

  const getFase = (f: string) => FASE_OPTIONS.find(o => o.value === f);
  const totalFotos = fotos.length;
  const estesMes = fotos.filter(f => {
    const fecha = new Date(f.fecha);
    const hoy = new Date();
    return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
  }).length;
  const ultimaCarga = fotos.length > 0 ? new Date(fotos[0].fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) : "â";

  const filtrados = fotos.filter(f => {
    if (filtroObra && String(f.obra_id) !== filtroObra) return false;
    if (busqueda) { const q = busqueda.toLowerCase(); return f.descripcion?.toLowerCase().includes(q) || f.obra_nombre?.toLowerCase().includes(q) || f.fase?.toLowerCase().includes(q); }
    return true;
  });

  const inputClass = "w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-blue-500 focus:outline-none placeholder-slate-600";

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/obras" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
          <div><h1 className="text-xl font-bold text-white">Fotos de Avance</h1><p className="text-xs text-slate-400">{fotos.length} fotos registradas</p></div>
        </div>
        <button onClick={() => { setShowForm(true); setForm({ ...EMPTY_FORM }); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"><Plus className="w-4 h-4" /> Nueva Foto</button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4 flex-shrink-0">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3"><p className="text-blue-400 text-2xl font-bold">{totalFotos}</p><p className="text-blue-400/70 text-xs">Total Fotos</p></div>
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3"><p className="text-cyan-400 text-2xl font-bold">{estesMes}</p><p className="text-cyan-400/70 text-xs">Este Mes</p></div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3"><p className="text-emerald-400 text-2xl font-bold">{ultimaCarga}</p><p className="text-emerald-400/70 text-xs">Última Carga</p></div>
      </div>

      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <div className="relative flex-1 max-w-xs"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar foto, descripción..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-blue-500 focus:outline-none placeholder-slate-600" /></div>
        <select value={filtroObra} onChange={e => setFiltroObra(e.target.value)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-blue-500 focus:outline-none"><option value="">Todas las obras</option>{obras.map(o => <option key={o.id} value={String(o.id)}>{o.nombre}</option>)}</select>
      </div>

      {mensaje && (<div className={`mb-3 px-4 py-2 rounded-lg text-sm flex-shrink-0 ${mensaje.tipo === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>{mensaje.texto}</div>)}

      <div className="flex-1 overflow-y-auto rounded-xl bg-white/[0.02] border border-white/[0.06]">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-400" /></div>
        ) : filtrados.length === 0 ? (
          <div className="p-8 text-center"><Image className="w-10 h-10 text-slate-600 mx-auto mb-2" /><p className="text-slate-500 text-sm">{fotos.length === 0 ? "No hay fotos registradas" : "Sin resultados"}</p></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
            {filtrados.map(f => (
              <div key={f.id} className="group relative aspect-square rounded-lg overflow-hidden bg-slate-900 border border-white/10 hover:border-white/20 transition-all">
                <img src={f.url} alt={f.descripcion} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors duration-200 flex flex-col justify-between p-2">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-green-500/80 text-white hover:bg-green-500"><Eye className="w-3 h-3" /></a>
                    {canDelete && <button onClick={() => setDeleteModal({ open: true, id: f.id, name: f.descripcion || "Foto" })} className="p-1.5 rounded-lg bg-red-500/80 text-white hover:bg-red-500"><Trash2 className="w-3 h-3" /></button>}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <p className="text-white text-xs font-medium line-clamp-2">{f.descripcion || "Sin descripción"}</p>
                    <p className="text-slate-300 text-xs">{f.obra_nombre}</p>
                    <p className="text-slate-400 text-xs">{new Date(f.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-[#0f1729] border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Nueva Foto</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
              <div><label className="block text-xs text-slate-400 mb-1">Obra *</label><select value={form.obra_id} onChange={e => setForm({ ...form, obra_id: e.target.value })} className={inputClass}><option value="">Seleccionar...</option>{obras.map(o => <option key={o.id} value={String(o.id)}>{o.nombre}</option>)}</select></div>
              <div><label className="block text-xs text-slate-400 mb-1">Imagen *</label><input type="file" accept="image/*" onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })} className={inputClass} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Fecha</label><input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className={inputClass} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Fase</label><select value={form.fase} onChange={e => setForm({ ...form, fase: e.target.value })} className={inputClass}>{FASE_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select></div>
              </div>
              <div><label className="block text-xs text-slate-400 mb-1">Descripción</label><input type="text" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Ej: Colado de zapatas, zona A" className={inputClass} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Ubicación</label><input type="text" value={form.ubicacion} onChange={e => setForm({ ...form, ubicacion: e.target.value })} placeholder="Eje A-B" className={inputClass} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Responsable</label><input type="text" value={form.responsable} onChange={e => setForm({ ...form, responsable: e.target.value })} className={inputClass} /></div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 text-sm">Cancelar</button>
              <button onClick={guardar} disabled={guardando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50">{guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}Subir Foto</button>
            </div>
          </div>
        </div>
      )}

      <DeleteModal open={deleteModal.open} onClose={() => setDeleteModal({ open: false, id: "", name: "" })} onConfirm={confirmDelete} count={1} itemLabel="Foto" />
    </div>
  );
}
