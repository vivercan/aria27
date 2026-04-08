"use client";
import DeleteModal from "@/components/DeleteModal";
import { useDeletePermission } from "@/lib/use-delete-permission";
import { backupAndDelete } from "@/lib/backup-delete";
import { uploadAndInsert, uploadAndUpdate, deleteRowAndBlob, buildPath } from "@/lib/storage";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Plus, Edit2, Trash2, X, Save, Loader2,
  Search, FileText, Upload, Eye
} from "lucide-react";

interface Obra { id: number; nombre: string; }

interface Plano {
  id: string;
  obra_id: number;
  obra_nombre: string;
  nombre: string;
  disciplina: string;
  revision: string;
  url: string;
  tipo_archivo: string;
  fecha_recepcion: string;
  responsable: string;
  observaciones: string;
  created_at: string;
}

const DISCIPLINA_OPTIONS = [
  { value: "arquitectura", label: "Arquitectura" },
  { value: "estructura", label: "Estructura" },
  { value: "instalaciones", label: "Instalaciones" },
  { value: "topografia", label: "Topografía" },
];

const REVISION_OPTIONS = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
];

const EMPTY_FORM = {
  obra_id: "", nombre: "", disciplina: "arquitectura", revision: "A",
  tipo_archivo: "pdf", fecha_recepcion: "", responsable: "",
  observaciones: "", file: null as File | null,
};

export default function PlanosPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const { userEmail, canDelete } = useDeletePermission();
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ ...EMPTY_FORM });
  const [editId, setEditId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroObra, setFiltroObra] = useState("");

  useEffect(() => {
    supabase.from("centros_trabajo").select("id,nombre").order("nombre").then(({ data }) => { if (data) setObras(data); });
    cargar();
  }, []);

  const cargar = async () => {
    const { data } = await supabase.from("planos").select("*").order("fecha_recepcion", { ascending: false });
    if (data) setPlanos(data);
    setLoading(false);
  };

  const msg = (tipo: "success" | "error", texto: string) => { setMensaje({ tipo, texto }); setTimeout(() => setMensaje(null), 3000); };

  const guardar = async () => {
    if (!form.obra_id) { msg("error", "Selecciona una obra"); return; }
    if (!form.nombre?.trim()) { msg("error", "El nombre es obligatorio"); return; }

    setGuardando(true);
    const obra = obras.find(o => String(o.id) === form.obra_id);
    const ext = form.file?.name?.split(".").pop()?.toLowerCase() || form.tipo_archivo || "pdf";
    const basePayload: any = {
      obra_id: form.obra_id, obra_nombre: obra?.nombre || "",
      nombre: form.nombre.trim(), disciplina: form.disciplina,
      revision: form.revision,
      tipo_archivo: ext,
      fecha_recepcion: editId ? (form.fecha_recepcion || null) : new Date().toISOString().slice(0, 10),
      responsable: form.responsable?.trim() || null,
      observaciones: form.observaciones?.trim() || null,
    };

    try {
      if (!editId) {
        // CREATE
        if (form.file) {
          const path = buildPath({ module: "planos", scope: [form.obra_id, form.disciplina], file: form.file });
          await uploadAndInsert({ bucket: "expedientes", path, file: form.file, table: "planos", payload: basePayload, urlField: "url" });
        } else {
          const { error } = await supabase.from("planos").insert({ ...basePayload, url: form.url || null });
          if (error) throw new Error(error.message);
        }
        msg("success", "Plano registrado"); setShowForm(false); cargar();
      } else {
        const newPath = form.file ? buildPath({ module: "planos", scope: [form.obra_id, form.disciplina], file: form.file }) : undefined;
        await uploadAndUpdate({
          bucket: "expedientes", table: "planos", id: editId,
          newFile: form.file, newPath,
          payload: basePayload,
          oldUrl: form.url || null,
          urlField: "url",
        });
        msg("success", "Plano actualizado"); setShowForm(false); setEditId(null); cargar();
      }
    } catch (e: any) {
      msg("error", e?.message || "Error");
    }
    setGuardando(false);
  };

  const editar = (p: Plano) => {
    setEditId(p.id);
    setForm({
      obra_id: String(p.obra_id), nombre: p.nombre || "", disciplina: p.disciplina || "arquitectura",
      revision: p.revision || "A", tipo_archivo: p.tipo_archivo || "pdf", url: p.url || "",
      fecha_recepcion: p.fecha_recepcion || "", responsable: p.responsable || "",
      observaciones: p.observaciones || "", file: null,
    });
    setShowForm(true);
  };

  const confirmDelete = async () => {
    try {
      const r = await deleteRowAndBlob({ table: "planos", id: deleteModal.id, userEmail, bucket: "expedientes" });
      msg(r.blobDeleted ? "success" : "error", r.blobDeleted ? "Eliminado" : `Fila borrada pero blob persiste: ${r.orphanPath || ""}`);
    } catch (e: any) { msg("error", e?.message || "Error"); }
    setDeleteModal({ open: false, id: "", name: "" }); cargar();
  };

  const getDisciplina = (d: string) => DISCIPLINA_OPTIONS.find(o => o.value === d);
  const totalPlanos = planos.length;
  const arquitectura = planos.filter(p => p.disciplina === "arquitectura").length;
  const ultimaRecepcion = planos.length > 0 ? new Date(planos[0].fecha_recepcion).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) : "â";

  const filtrados = planos.filter(p => {
    if (filtroObra && String(p.obra_id) !== filtroObra) return false;
    if (busqueda) { const q = busqueda.toLowerCase(); return p.nombre?.toLowerCase().includes(q) || p.obra_nombre?.toLowerCase().includes(q) || p.disciplina?.toLowerCase().includes(q); }
    return true;
  });

  const inputClass = "w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-blue-500 focus:outline-none placeholder-slate-600";

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/obras" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
          <div><h1 className="text-xl font-bold text-white">Planos y Documentos Técnicos</h1><p className="text-xs text-slate-400">{planos.length} planos registrados</p></div>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY_FORM }); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"><Plus className="w-4 h-4" /> Nuevo Plano</button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4 flex-shrink-0">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3"><p className="text-blue-400 text-2xl font-bold">{totalPlanos}</p><p className="text-blue-400/70 text-xs">Total Planos</p></div>
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3"><p className="text-cyan-400 text-2xl font-bold">{arquitectura}</p><p className="text-cyan-400/70 text-xs">Arquitectura</p></div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3"><p className="text-emerald-400 text-2xl font-bold">{ultimaRecepcion}</p><p className="text-emerald-400/70 text-xs">Última Recepción</p></div>
      </div>

      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <div className="relative flex-1 max-w-xs"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar plano, disciplina..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-blue-500 focus:outline-none placeholder-slate-600" /></div>
        <select value={filtroObra} onChange={e => setFiltroObra(e.target.value)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-blue-500 focus:outline-none"><option value="">Todas las obras</option>{obras.map(o => <option key={o.id} value={String(o.id)}>{o.nombre}</option>)}</select>
      </div>

      {mensaje && (<div className={`mb-3 px-4 py-2 rounded-lg text-sm flex-shrink-0 ${mensaje.tipo === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>{mensaje.texto}</div>)}

      <div className="flex-1 overflow-y-auto rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <table className="w-full">
          <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10"><tr className="border-b border-white/10">
            <th className="text-left p-3 text-slate-400 font-medium text-xs">Nombre</th>
            <th className="text-left p-3 text-slate-400 font-medium text-xs">Obra</th>
            <th className="text-center p-3 text-slate-400 font-medium text-xs">Disciplina</th>
            <th className="text-center p-3 text-slate-400 font-medium text-xs">Rev</th>
            <th className="text-center p-3 text-slate-400 font-medium text-xs">Tipo</th>
            <th className="text-center p-3 text-slate-400 font-medium text-xs">Fecha</th>
            <th className="text-center p-3 text-slate-400 font-medium text-xs">Acc</th>
          </tr></thead>
          <tbody>
            {loading ? (<tr><td colSpan={7} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-400" /></td></tr>
            ) : filtrados.length === 0 ? (<tr><td colSpan={7} className="p-8 text-center"><FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" /><p className="text-slate-500 text-sm">{planos.length === 0 ? "No hay planos registrados" : "Sin resultados"}</p></td></tr>
            ) : filtrados.map(p => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="p-3"><p className="text-white text-sm font-medium">{p.nombre}</p><p className="text-slate-500 text-xs">{p.responsable || "â"}</p></td>
                <td className="p-3 text-slate-400 text-sm">{p.obra_nombre || "â"}</td>
                <td className="p-3 text-center text-sm text-white">{getDisciplina(p.disciplina)?.label || p.disciplina}</td>
                <td className="p-3 text-center text-sm text-cyan-400 font-medium">{p.revision || "â"}</td>
                <td className="p-3 text-center text-xs text-slate-400">{p.tipo_archivo?.toUpperCase() || "â"}</td>
                <td className="p-3 text-center text-xs text-slate-400">{p.fecha_recepcion ? new Date(p.fecha_recepcion + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) : "â"}</td>
                <td className="p-3 text-center"><div className="flex items-center justify-center gap-1">
                  {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30"><Eye className="w-3.5 h-3.5" /></a>}
                  <button onClick={() => editar(p)} className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"><Edit2 className="w-3.5 h-3.5" /></button>
                  {canDelete && <button onClick={() => setDeleteModal({ open: true, id: p.id, name: p.nombre })} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"><Trash2 className="w-3.5 h-3.5" /></button>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-[#0f1729] border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">{editId ? "Editar Plano" : "Nuevo Plano"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
              <div><label className="block text-xs text-slate-400 mb-1">Obra *</label><select value={form.obra_id} onChange={e => setForm({ ...form, obra_id: e.target.value })} className={inputClass}><option value="">Seleccionar...</option>{obras.map(o => <option key={o.id} value={String(o.id)}>{o.nombre}</option>)}</select></div>
              <div><label className="block text-xs text-slate-400 mb-1">Nombre *</label><input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Plano Arquitectónico Nivel 3" className={inputClass} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Disciplina</label><select value={form.disciplina} onChange={e => setForm({ ...form, disciplina: e.target.value })} className={inputClass}>{DISCIPLINA_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}</select></div>
                <div><label className="block text-xs text-slate-400 mb-1">Revisión</label><select value={form.revision} onChange={e => setForm({ ...form, revision: e.target.value })} className={inputClass}>{REVISION_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
              </div>
              <div><label className="block text-xs text-slate-400 mb-1">Archivo</label><input type="file" onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })} className={inputClass} /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Observaciones</label><input type="text" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} className={inputClass} /></div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 text-sm">Cancelar</button>
              <button onClick={guardar} disabled={guardando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50">{guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{editId ? "Actualizar" : "Registrar"}</button>
            </div>
          </div>
        </div>
      )}

      <DeleteModal open={deleteModal.open} onClose={() => setDeleteModal({ open: false, id: "", name: "" })} onConfirm={confirmDelete} count={1} itemLabel="Plano" />
    </div>
  );
}
