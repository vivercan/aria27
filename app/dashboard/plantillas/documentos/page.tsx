"use client";
import { clientLogger } from "@/lib/client-logger";
import DeleteModal from "@/components/DeleteModal";
import { useDeletePermission } from "@/lib/use-delete-permission";
import { backupAndDelete } from "@/lib/backup-delete";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { FileText, Search, Upload, Download, Eye, Loader2, FolderOpen, X, Save, Trash2 } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";

interface Documento {
  id: string;
  nombre: string;
  tipo: string;
  categoria: string;
  descripcion: string;
  archivo_url: string;
  obra_id: string;
  obra_nombre: string;
  created_at: string;
}

interface Obra { id: string; nombre: string; }

const TIPOS = ["Contrato", "Plano", "Licencia", "Permiso", "Factura", "Reporte", "Otro"];
const EMPTY = { nombre: "", tipo: "Contrato", categoria: "", descripcion: "", archivo_url: "", obra_id: "", obra_nombre: "" };

export default function DocumentosPage() {
  const log = clientLogger("DOCUMENTOS");
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const { userEmail, canDelete } = useDeletePermission();
  const [deleteModal, setDeleteModal] = useState<{open:boolean;id:string;name:string}>
    ({open:false,id:"",name:""});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState<any>({ ...EMPTY });
  const [obras, setObras] = useState<Obra[]>([]);
  // EX-3 18-Abr-2026: flash canónico via useFlashMessage (wrapper mantiene success/error)
  const { msg: mensaje, flash: _flash } = useFlashMessage(3000);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => { cargar(); cargarObras(); }, []);

  const cargar = async () => {
    const { data } = await supabase.from("documentos_plantilla").select("*").order("created_at", { ascending: false });
    setDocumentos(data || []);
    setLoading(false);
  };

  const cargarObras = async () => {
    const { data } = await supabase.from("centros_trabajo").select("id,nombre").order("nombre");
    setObras(data || []);
  };

  const msg = (tipo: "success" | "error" | "info", texto: string) => _flash(tipo === "success" ? "ok" : "err", texto);

  const validar = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.nombre?.trim()) errors.nombre = "El nombre es obligatorio";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;
    setGuardando(true);
    const payload: Record<string, unknown> = { ...form };
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
    if (payload.obra_id) {
      const obra = obras.find(o => o.id === payload.obra_id);
      if (obra) payload.obra_nombre = obra.nombre;
    }
    const { error } = await supabase.from("documentos_plantilla").insert(payload);
    if (error) { msg("error", error?.message ?? "Error"); } else { msg("success", "Documento registrado"); setShowForm(false); setForm({ ...EMPTY }); cargar(); }
    setGuardando(false);
  };

  const eliminar = async (id: string) => {
    setDeleteModal({open:true,id,name:""}); return; // Protected by DeleteModal
    const { error } = await supabase.from("documentos_plantilla").delete().eq("id", id);
    if (error) msg("error", error?.message ?? "Error"); else { msg("success", "Documento eliminado"); cargar(); }
  };

  const filtered = documentos.filter(d =>
    !search || d.nombre?.toLowerCase().includes(search.toLowerCase()) || d.tipo?.toLowerCase().includes(search.toLowerCase()) || d.obra_nombre?.toLowerCase().includes(search.toLowerCase())
  );
  const confirmDelete = async () => {
    try {
      await backupAndDelete({ table: "documentos_plantilla", id: deleteModal.id, userEmail });
    } catch (e: unknown) { log.error(String(e)); }
    setDeleteModal({open:false,id:"",name:""});
    cargar();
  };

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-auto">
      <FlashBanner msg={mensaje} />

      <AriaBackButton href="/dashboard/plantillas" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Centro de Documentación</h1>
          <p className="text-[#7f93b0] text-sm">Gestión y almacenamiento de documentos del proyecto</p>
        </div>
        <button onClick={() => { setForm({ ...EMPTY }); setShowForm(true); }} className="px-4 py-2 bg-aria-primary-light text-aria-accent rounded-xl text-sm font-medium hover:bg-aria-primary-hover/30 transition-colors flex items-center gap-2">
          <Upload className="w-4 h-4" /> Subir Documento
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40" onClick={() => setShowForm(false)}>
          <div className="bg-[#0a1628] border border-white/[0.08] rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Nuevo Documento</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-white/[0.06] rounded-lg"><X className="w-5 h-5 text-[#7f93b0]" /></button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-[#7f93b0] mb-1 block">Nombre *</label>
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:border-aria-primary/50 focus:outline-none" placeholder="Nombre del documento" />
                {formErrors.nombre && <p className="text-red-400 text-xs mt-1">{formErrors.nombre}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#7f93b0] mb-1 block">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:border-aria-primary/50 focus:outline-none">
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#7f93b0] mb-1 block">Categoría</label>
                  <input value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:border-aria-primary/50 focus:outline-none" placeholder="Ej: Legal, Técnico" />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#7f93b0] mb-1 block">Obra</label>
                <select value={form.obra_id} onChange={e => setForm({ ...form, obra_id: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:border-aria-primary/50 focus:outline-none">
                  <option value="">Sin obra específica</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#7f93b0] mb-1 block">Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={2} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:border-aria-primary/50 focus:outline-none resize-none" placeholder="Descripción opcional" />
              </div>
              <div>
                <label className="text-xs text-[#7f93b0] mb-1 block">URL del Archivo</label>
                <input value={form.archivo_url} onChange={e => setForm({ ...form, archivo_url: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:border-aria-primary/50 focus:outline-none" placeholder="https://..." />
              </div>
              <button onClick={guardar} disabled={guardando} className="mt-2 w-full py-2.5 bg-aria-primary hover:bg-aria-primary-hover disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {guardando ? "Guardando..." : "Guardar Documento"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <div className="inline-flex p-2 rounded-lg bg-emerald-500/10 mb-2"><FileText className="w-4 h-4 text-aria-accent" /></div>
          <p className="text-xl font-bold text-white">{loading ? "..." : documentos.length}</p>
          <p className="text-xs text-[#7f93b0]">Total Documentos</p>
        </div>
        <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <div className="inline-flep p-2 rounded-lg bg-aria-primary/10 mb-2"><FolderOpen className="w-4 h-4 text-aria-accent" /></div>
          <p className="text-xl font-bold text-white">{loading ? "..." : [...new Set(documentos.map(d => d.tipo).filter(Boolean))].length}</p>
          <p className="text-xs text-[#7f93b0]">Tipos</p>
        </div>
        <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <div className="inline-flex p-2 rounded-lg bg-amber-500/10 mb-2"><Download className="w-4 h-4 text-amber-400" /></div>
          <p className="text-xl font-bold text-white">—</p>
          <p className="text-xs text-[#7f93b0]">Descargas este mes</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7f93b0]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar documento por nombre, tipo u obra..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-[#4a6080] focus:border-aria-primary/50 focus:outline-none" />
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[rgba(4,8,16,0.98)] backdrop-blur z-10">
              <tr className="text-[#7f93b0] text-xs uppercase">
                <th className="text-left p-3">Nombre</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-left p-3">Obra</th>
                <th className="text-left p-3">Fecha</th>
                <th className="text-center p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-aria-accent mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-[#7f93b0]">
                  {documentos.length === 0 ? "No hay documentos registrados. Sube tu primer documento." : "No se encontraron resultados."}
                </td></tr>
              ) : filtered.map(d => (
                <tr key={d.id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                  <td className="p-3 text-white font-medium">{d.nombre}</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-aria-accent">{d.tipo || "General"}</span></td>
                  <td className="p-3 text-[#7f93b0]">{d.obra_nombre || "—"}</td>
                  <td className="p-3 text-[#7f93b0] text-xs">{d.created_at ? new Date(d.created_at).toLocaleDateString("es-MX") : "—"}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {d.archivo_url && <a href={d.archivo_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#7f93b0] hover:text-white transition"><Eye className="w-4 h-4" /></a>}
                      {canDelete && (<button onClick={() => eliminar(d.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-[#7f93b0] hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({open:false,id:"",name:""})}
        onConfirm={confirmDelete}
        count={1}
        itemLabel="Documento"
      />
    </div>
  );
}
