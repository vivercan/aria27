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
  Search, Building2, ClipboardList
} from "lucide-react";

interface Obra { id: number; nombre: string; }

interface SIROC {
  id: string;
  obra_id: number;
  obra_nombre: string;
  numero_registro: string;
  fecha_registro: string;
  clasificacion_riesgo: string;
  bimestre: string;
  num_trabajadores: number;
  incidencias: number;
  estatus: string;
  documento_url: string;
  responsable: string;
  observaciones: string;
  created_at: string;
}

const BIMESTRE_OPTIONS = [
  { value: "01-02", label: "Enero-Febrero" },
  { value: "03-04", label: "Marzo-Abril" },
  { value: "05-06", label: "Mayo-Junio" },
  { value: "07-08", label: "Julio-Agosto" },
  { value: "09-10", label: "Septiembre-Octubre" },
  { value: "11-12", label: "Noviembre-Diciembre" },
];

const ESTATUS_OPTIONS = [
  { value: "pendiente", label: "Pendiente", color: "bg-amber-500/20 text-amber-400" },
  { value: "registrado", label: "Registrado", color: "bg-aria-primary-light text-aria-accent" },
  { value: "actualizado", label: "Actualizado", color: "bg-emerald-500/20 text-emerald-400" },
];

const EMPTY_FORM = {
  obra_id: "", numero_registro: "", fecha_registro: "", clasificacion_riesgo: "",
  bimestre: "01-02", num_trabajadores: "", incidencias: "0",
  estatus: "pendiente", documento_url: "", responsable: "",
  observaciones: "", file: null as File | null,
};

export default function SIROCPage() {
  const [registros, setRegistros] = useState<SIROC[]>([]);
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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from("centros_trabajo").select("id,nombre").order("nombre").then(({ data }) => { if (data) setObras(data); });
    cargar();
  }, []);

  const cargar = async () => {
    const { data } = await supabase.from("siroc").select("*").order("fecha_registro", { ascending: false });
    if (data) setRegistros(data);
    setLoading(false);
  };

  const msg = (tipo: "success" | "error", texto: string) => { setMensaje({ tipo, texto }); setTimeout(() => setMensaje(null), 3000); };

  const validar = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.obra_id?.trim()) errors.obra_id = "Selecciona una obra";
    if (!form.numero_registro?.trim()) errors.numero_registro = "El número de registro es obligatorio";
    if (form.num_trabajadores && (isNaN(parseInt(form.num_trabajadores)) || parseInt(form.num_trabajadores) < 0)) errors.num_trabajadores = "Trabajadores debe ser >= 0";
    if (form.incidencias && (isNaN(parseInt(form.incidencias)) || parseInt(form.incidencias) < 0)) errors.incidencias = "Incidencias debe ser >= 0";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;

    setGuardando(true);
    const obra = obras.find(o => String(o.id) === form.obra_id);
    const basePayload: any = {
      obra_id: form.obra_id, obra_nombre: obra?.nombre || "",
      numero_registro: form.numero_registro.trim(), fecha_registro: form.fecha_registro || null,
      clasificacion_riesgo: form.clasificacion_riesgo?.trim() || null,
      bimestre: form.bimestre, num_trabajadores: form.num_trabajadores ? parseInt(form.num_trabajadores) : null,
      incidencias: parseInt(form.incidencias) || 0, estatus: form.estatus,
      responsable: form.responsable?.trim() || null,
      observaciones: form.observaciones?.trim() || null,
    };

    try {
      if (!editId) {
        if (form.file) {
          const path = buildPath({ module: "siroc", scope: [form.obra_id, form.bimestre], file: form.file });
          await uploadAndInsert({ bucket: "expedientes", path, file: form.file, table: "siroc", payload: basePayload, urlField: "documento_url" });
        } else {
          const { error } = await supabase.from("siroc").insert({ ...basePayload, documento_url: form.documento_url || null });
          if (error) throw new Error(error.message);
        }
        msg("success", "Registro registrado"); setShowForm(false); cargar();
      } else {
        const newPath = form.file ? buildPath({ module: "siroc", scope: [form.obra_id, form.bimestre], file: form.file }) : undefined;
        await uploadAndUpdate({
          bucket: "expedientes", table: "siroc", id: editId,
          newFile: form.file, newPath,
          payload: basePayload,
          oldUrl: form.documento_url || null,
          urlField: "documento_url",
        });
        msg("success", "Registro actualizado"); setShowForm(false); setEditId(null); cargar();
      }
    } catch (e: any) {
      msg("error", e?.message || "Error");
    }
    setGuardando(false);
  };

  const editar = (s: SIROC) => {
    setEditId(s.id);
    setForm({
      obra_id: String(s.obra_id), numero_registro: s.numero_registro || "",
      fecha_registro: s.fecha_registro || "", clasificacion_riesgo: s.clasificacion_riesgo || "",
      bimestre: s.bimestre || "01-02", num_trabajadores: s.num_trabajadores ? String(s.num_trabajadores) : "",
      incidencias: String(s.incidencias || 0), estatus: s.estatus || "pendiente",
      documento_url: s.documento_url || "", responsable: s.responsable || "",
      observaciones: s.observaciones || "", file: null,
    });
    setShowForm(true);
  };

  const confirmDelete = async () => {
    try {
      const r = await deleteRowAndBlob({ table: "siroc", id: deleteModal.id, userEmail, bucket: "expedientes", blobUrlField: "documento_url" });
      msg(r.blobDeleted ? "success" : "error", r.blobDeleted ? "Eliminado" : `Fila borrada pero blob persiste: ${r.orphanPath || ""}`);
    } catch (e: any) { msg("error", e?.message || "Error"); }
    setDeleteModal({ open: false, id: "", name: "" }); cargar();
  };

  const getBimestre = (b: string) => BIMESTRE_OPTIONS.find(o => o.value === b);
  const getEstatus = (s: string) => ESTATUS_OPTIONS.find(o => o.value === s);
  const totalRegistros = registros.length;
  const registrados = registros.filter(r => r.estatus === "registrado" || r.estatus === "actualizado").length;
  const pendientes = registros.filter(r => r.estatus === "pendiente").length;

  const filtrados = registros.filter(r => {
    if (filtroObra && String(r.obra_id) !== filtroObra) return false;
    if (busqueda) { const q = busqueda.toLowerCase(); return r.numero_registro?.toLowerCase().includes(q) || r.obra_nombre?.toLowerCase().includes(q) || r.bimestre?.toLowerCase().includes(q); }
    return true;
  });

  const inputClass = "w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-aria-primary focus:outline-none placeholder-slate-600";

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/administracion" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
          <div><h1 className="text-xl font-bold text-white">SIROC / Registro IMSS</h1><p className="text-xs text-slate-400">{registros.length} registros</p></div>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY_FORM }); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-aria-primary text-white text-sm hover:bg-aria-primary-hover"><Plus className="w-4 h-4" /> Nuevo Registro</button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4 flex-shrink-0">
        <div className="bg-aria-primary/10 border border-aria-primary/20 rounded-xl p-3"><p className="text-aria-accent text-2xl font-bold">{totalRegistros}</p><p className="text-aria-accent/70 text-xs">Total Registros</p></div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3"><p className="text-emerald-400 text-2xl font-bold">{registrados}</p><p className="text-emerald-400/70 text-xs">Registrados</p></div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3"><p className="text-amber-400 text-2xl font-bold">{pendientes}</p><p className="text-amber-400/70 text-xs">Pendientes</p></div>
      </div>

      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <div className="relative flex-1 max-w-xs"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar registro, bimestre..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-aria-primary focus:outline-none placeholder-slate-600" /></div>
        <select value={filtroObra} onChange={e => setFiltroObra(e.target.value)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-aria-primary focus:outline-none"><option value="">Todas las obras</option>{obras.map(o => <option key={o.id} value={String(o.id)}>{o.nombre}</option>)}</select>
      </div>

      {mensaje && (<div className={`mb-3 px-4 py-2 rounded-lg text-sm flex-shrink-0 ${mensaje.tipo === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>{mensaje.texto}</div>)}

      <div className="flex-1 overflow-y-auto rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <table className="w-full">
          <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10"><tr className="border-b border-white/10">
            <th className="text-left p-3 text-slate-400 font-medium text-xs">Registro</th>
            <th className="text-left p-3 text-slate-400 font-medium text-xs">Obra</th>
            <th className="text-center p-3 text-slate-400 font-medium text-xs">Bimestre</th>
            <th className="text-center p-3 text-slate-400 font-medium text-xs">Trabajadores</th>
            <th className="text-center p-3 text-slate-400 font-medium text-xs">Incidencias</th>
            <th className="text-center p-3 text-slate-400 font-medium text-xs">Estatus</th>
            <th className="text-center p-3 text-slate-400 font-medium text-xs">Acc</th>
          </tr></thead>
          <tbody>
            {loading ? (<tr><td colSpan={7} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-aria-accent" /></td></tr>
            ) : filtrados.length === 0 ? (<tr><td colSpan={7} className="p-8 text-center"><ClipboardList className="w-10 h-10 text-slate-600 mx-auto mb-2" /><p className="text-slate-500 text-sm">{registros.length === 0 ? "No hay registros" : "Sin resultados"}</p></td></tr>
            ) : filtrados.map(s => (
              <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="p-3"><p className="text-white text-sm font-medium">{s.numero_registro}</p><p className="text-slate-500 text-xs">{s.responsable || "â"}</p></td>
                <td className="p-3 text-slate-400 text-sm">{s.obra_nombre || "â"}</td>
                <td className="p-3 text-center text-sm text-white">{getBimestre(s.bimestre)?.label || s.bimestre}</td>
                <td className="p-3 text-center text-sm text-aria-accent font-medium">{s.num_trabajadores || "â"}</td>
                <td className="p-3 text-center text-sm text-white">{s.incidencias || 0}</td>
                <td className="p-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${getEstatus(s.estatus)?.color || "bg-slate-500/20 text-slate-400"}`}>{getEstatus(s.estatus)?.label || s.estatus}</span></td>
                <td className="p-3 text-center"><div className="flex items-center justify-center gap-1">
                  <button onClick={() => editar(s)} className="p-1.5 rounded-lg bg-aria-primary-light text-aria-accent hover:bg-aria-primary-hover/30"><Edit2 className="w-3.5 h-3.5" /></button>
                  {canDelete && <button onClick={() => setDeleteModal({ open: true, id: s.id, name: s.numero_registro })} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"><Trash2 className="w-3.5 h-3.5" /></button>}
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
              <h2 className="text-lg font-bold text-white">{editId ? "Editar Registro" : "Nuevo Registro"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
              <div><label className="block text-xs text-slate-400 mb-1">Obra *</label><select value={form.obra_id} onChange={e => setForm({ ...form, obra_id: e.target.value })} className={inputClass}><option value="">Seleccionar...</option>{obras.map(o => <option key={o.id} value={String(o.id)}>{o.nombre}</option>)}</select>{formErrors.obra_id && <p className="text-red-400 text-xs mt-1">{formErrors.obra_id}</p>}</div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Número Registro *</label><input type="text" value={form.numero_registro} onChange={e => setForm({ ...form, numero_registro: e.target.value })} placeholder="REG-2026-001" className={inputClass} />{formErrors.numero_registro && <p className="text-red-400 text-xs mt-1">{formErrors.numero_registro}</p>}</div>
                <div><label className="block text-xs text-slate-400 mb-1">Fecha Registro</label><input type="date" value={form.fecha_registro} onChange={e => setForm({ ...form, fecha_registro: e.target.value })} className={inputClass} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Bimestre</label><select value={form.bimestre} onChange={e => setForm({ ...form, bimestre: e.target.value })} className={inputClass}>{BIMESTRE_OPTIONS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}</select></div>
                <div><label className="block text-xs text-slate-400 mb-1">Clasificación Riesgo</label><input type="text" value={form.clasificacion_riesgo} onChange={e => setForm({ ...form, clasificacion_riesgo: e.target.value })} placeholder="I, II, III, IV, V" className={inputClass} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Trabajadores</label><input type="number" min="0" value={form.num_trabajadores} onChange={e => setForm({ ...form, num_trabajadores: e.target.value })} placeholder="0" className={inputClass} />{formErrors.num_trabajadores && <p className="text-red-400 text-xs mt-1">{formErrors.num_trabajadores}</p>}</div>
                <div><label className="block text-xs text-slate-400 mb-1">Incidencias</label><input type="number" min="0" value={form.incidencias} onChange={e => setForm({ ...form, incidencias: e.target.value })} placeholder="0" className={inputClass} />{formErrors.incidencias && <p className="text-red-400 text-xs mt-1">{formErrors.incidencias}</p>}</div>
              </div>
              <div><label className="block text-xs text-slate-400 mb-1">Estatus</label><select value={form.estatus} onChange={e => setForm({ ...form, estatus: e.target.value })} className={inputClass}>{ESTATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
              <div><label className="block text-xs text-slate-400 mb-1">Documento</label><input type="file" onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })} className={inputClass} /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Responsable</label><input type="text" value={form.responsable} onChange={e => setForm({ ...form, responsable: e.target.value })} className={inputClass} /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Observaciones</label><input type="text" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} className={inputClass} /></div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 text-sm">Cancelar</button>
              <button onClick={guardar} disabled={guardando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-aria-primary text-white hover:bg-aria-primary-hover text-sm disabled:opacity-50">{guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{editId ? "Actualizar" : "Registrar"}</button>
            </div>
          </div>
        </div>
      )}

      <DeleteModal open={deleteModal.open} onClose={() => setDeleteModal({ open: false, id: "", name: "" })} onConfirm={confirmDelete} count={1} itemLabel="Registro" />
    </div>
  );
}
