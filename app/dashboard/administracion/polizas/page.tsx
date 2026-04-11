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
  Search, Shield, AlertTriangle, Calendar
} from "lucide-react";

interface Obra { id: number; nombre: string; }

interface Poliza {
  id: string;
  obra_id: number;
  obra_nombre: string;
  numero_poliza: string;
  tipo: string;
  aseguradora: string;
  fecha_inicio: string;
  fecha_vencimiento: string;
  cobertura: string;
  prima: number;
  estatus: string;
  documento_url: string;
  contacto: string;
  observaciones: string;
  created_at: string;
}

const TIPO_OPTIONS = [
  { value: "RC", label: "Responsabilidad Civil" },
  { value: "todo_riesgo", label: "Todo Riesgo" },
  { value: "equipo", label: "Equipo" },
  { value: "caucion", label: "Caución" },
  { value: "vida", label: "Vida" },
];

const ESTATUS_OPTIONS = [
  { value: "vigente", label: "Vigente", color: "bg-emerald-500/20 text-emerald-400" },
  { value: "por_vencer", label: "Por Vencer", color: "bg-amber-500/20 text-amber-400" },
  { value: "vencida", label: "Vencida", color: "bg-red-500/20 text-red-400" },
  { value: "cancelada", label: "Cancelada", color: "bg-slate-500/20 text-slate-400" },
];

interface PolizaForm {
  obra_id: string;
  numero_poliza: string;
  tipo: string;
  aseguradora: string;
  fecha_inicio: string;
  fecha_vencimiento: string;
  cobertura: string;
  prima: string | number;
  estatus: string;
  documento_url: string;
  contacto: string;
  observaciones: string;
  file: File | null;
}

const EMPTY_FORM: PolizaForm = {
  obra_id: "", numero_poliza: "", tipo: "RC", aseguradora: "",
  fecha_inicio: "", fecha_vencimiento: "", cobertura: "", prima: "",
  estatus: "vigente", documento_url: "", contacto: "",
  observaciones: "", file: null,
};

export default function PolizasPage() {
  const [polizas, setPolizas] = useState<Poliza[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const { userEmail, canDelete } = useDeletePermission();
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PolizaForm>({ ...EMPTY_FORM });
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
    const { data } = await supabase.from("polizas_seguro").select("*").order("fecha_vencimiento", { ascending: true });
    if (data) setPolizas(data);
    setLoading(false);
  };

  const msg = (tipo: "success" | "error", texto: string) => { setMensaje({ tipo, texto }); setTimeout(() => setMensaje(null), 3000); };

  const getEstatusActualizado = (estatus: string, fechaVencimiento: string): string => {
    if (estatus === "cancelada") return "cancelada";
    if (!fechaVencimiento) return estatus;
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento + "T23:59:59");
    const diferencia = vencimiento.getTime() - hoy.getTime();
    const diasFaltantes = Math.ceil(diferencia / (1000 * 60 * 60 * 24));
    if (diasFaltantes < 0) return "vencida";
    if (diasFaltantes <= 30) return "por_vencer";
    return "vigente";
  };

  const validar = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.obra_id?.trim()) errors.obra_id = "Selecciona una obra";
    if (!form.numero_poliza?.trim()) errors.numero_poliza = "El número de póliza es obligatorio";
    if (!form.aseguradora?.trim()) errors.aseguradora = "La aseguradora es obligatoria";
    if (form.prima && (isNaN(parseFloat(String(form.prima))) || parseFloat(String(form.prima)) < 0)) errors.prima = "Prima debe ser >= 0";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;

    setGuardando(true);
    const obra = obras.find(o => String(o.id) === form.obra_id);
    const estatusActualizado = getEstatusActualizado(form.estatus, form.fecha_vencimiento);
    const basePayload: Record<string, unknown> = {
      obra_id: form.obra_id, obra_nombre: obra?.nombre || "",
      numero_poliza: form.numero_poliza.trim(), tipo: form.tipo,
      aseguradora: form.aseguradora.trim(), fecha_inicio: form.fecha_inicio || null,
      fecha_vencimiento: form.fecha_vencimiento || null, cobertura: form.cobertura?.trim() || null,
      prima: form.prima ? parseFloat(String(form.prima)) : null,
      estatus: estatusActualizado,
      contacto: form.contacto?.trim() || null, observaciones: form.observaciones?.trim() || null,
    };

    try {
      if (!editId) {
        if (form.file) {
          const path = buildPath({ module: "polizas", scope: [form.obra_id, form.tipo], file: form.file });
          await uploadAndInsert({ bucket: "expedientes", path, file: form.file, table: "polizas_seguro", payload: basePayload, urlField: "documento_url" });
        } else {
          const { error } = await supabase.from("polizas_seguro").insert({ ...basePayload, documento_url: form.documento_url || null });
          if (error) throw new Error((error as {message?: string})?.message || "Error desconocido");
        }
        msg("success", "Póliza registrada"); setShowForm(false); cargar();
      } else {
        const newPath = form.file ? buildPath({ module: "polizas", scope: [form.obra_id, form.tipo], file: form.file }) : undefined;
        await uploadAndUpdate({
          bucket: "expedientes", table: "polizas_seguro", id: editId,
          newFile: form.file, newPath,
          payload: basePayload,
          oldUrl: form.documento_url || null,
          urlField: "documento_url",
        });
        msg("success", "Póliza actualizada"); setShowForm(false); setEditId(null); cargar();
      }
    } catch (e: unknown) {
      msg("error", (e as {message?: string})?.message || "Error");
    }
    setGuardando(false);
  };

  const editar = (p: Poliza) => {
    setEditId(p.id);
    setForm({
      obra_id: String(p.obra_id), numero_poliza: p.numero_poliza || "",
      tipo: p.tipo || "RC", aseguradora: p.aseguradora || "",
      fecha_inicio: p.fecha_inicio || "", fecha_vencimiento: p.fecha_vencimiento || "",
      cobertura: p.cobertura || "", prima: p.prima ? String(p.prima) : "",
      estatus: p.estatus || "vigente", documento_url: p.documento_url || "",
      contacto: p.contacto || "", observaciones: p.observaciones || "",
      file: null,
    });
    setShowForm(true);
  };

  const confirmDelete = async () => {
    try {
      const r = await deleteRowAndBlob({ table: "polizas_seguro", id: deleteModal.id, userEmail, bucket: "expedientes", blobUrlField: "documento_url" });
      msg(r.blobDeleted ? "success" : "error", r.blobDeleted ? "Eliminado" : `Fila borrada pero blob persiste: ${r.orphanPath || ""}`);
    } catch (e: unknown) { msg("error", (e as {message?: string})?.message || "Error"); }
    setDeleteModal({ open: false, id: "", name: "" }); cargar();
  };

  const getTipo = (t: string) => TIPO_OPTIONS.find(o => o.value === t);
  const getEstatus = (s: string) => ESTATUS_OPTIONS.find(o => o.value === s);
  const totalPolizas = polizas.length;
  const vigentes = polizas.filter(p => getEstatusActualizado(p.estatus, p.fecha_vencimiento) === "vigente").length;
  const porVencer = polizas.filter(p => getEstatusActualizado(p.estatus, p.fecha_vencimiento) === "por_vencer").length;

  const filtrados = polizas.filter(p => {
    if (filtroObra && String(p.obra_id) !== filtroObra) return false;
    if (busqueda) { const q = busqueda.toLowerCase(); return p.numero_poliza?.toLowerCase().includes(q) || p.aseguradora?.toLowerCase().includes(q) || p.obra_nombre?.toLowerCase().includes(q); }
    return true;
  });

  const inputClass = "w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-aria-primary focus:outline-none placeholder-slate-600";

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/administracion" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
          <div><h1 className="text-xl font-bold text-white">Pólizas de Seguro</h1><p className="text-xs text-slate-400">{polizas.length} pólizas registradas</p></div>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY_FORM }); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-aria-primary text-white text-sm hover:bg-aria-primary-hover"><Plus className="w-4 h-4" /> Nueva Póliza</button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4 flex-shrink-0">
        <div className="bg-aria-primary/10 border border-aria-primary/20 rounded-xl p-3"><p className="text-aria-accent text-2xl font-bold">{totalPolizas}</p><p className="text-aria-accent/70 text-xs">Total Pólizas</p></div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3"><p className="text-emerald-400 text-2xl font-bold">{vigentes}</p><p className="text-emerald-400/70 text-xs">Vigentes</p></div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3"><p className="text-amber-400 text-2xl font-bold">{porVencer}</p><p className="text-amber-400/70 text-xs">Por Vencer</p></div>
      </div>

      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <div className="relative flex-1 max-w-xs"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar póliza, aseguradora..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-aria-primary focus:outline-none placeholder-slate-600" /></div>
        <select value={filtroObra} onChange={e => setFiltroObra(e.target.value)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-aria-primary focus:outline-none"><option value="">Todas las obras</option>{obras.map(o => <option key={o.id} value={String(o.id)}>{o.nombre}</option>)}</select>
      </div>

      {mensaje && (<div className={`mb-3 px-4 py-2 rounded-lg text-sm flex-shrink-0 ${mensaje.tipo === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>{mensaje.texto}</div>)}

      <div className="flex-1 overflow-y-auto rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <table className="w-full">
          <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10"><tr className="border-b border-white/10">
            <th className="text-left p-3 text-slate-400 font-medium text-xs">Póliza</th>
            <th className="text-left p-3 text-slate-400 font-medium text-xs">Obra</th>
            <th className="text-center p-3 text-slate-400 font-medium text-xs">Tipo</th>
            <th className="text-left p-3 text-slate-400 font-medium text-xs">Aseguradora</th>
            <th className="text-center p-3 text-slate-400 font-medium text-xs">Vencimiento</th>
            <th className="text-center p-3 text-slate-400 font-medium text-xs">Estatus</th>
            <th className="text-center p-3 text-slate-400 font-medium text-xs">Acc</th>
          </tr></thead>
          <tbody>
            {loading ? (<tr><td colSpan={7} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-aria-accent" /></td></tr>
            ) : filtrados.length === 0 ? (<tr><td colSpan={7} className="p-8 text-center"><Shield className="w-10 h-10 text-slate-600 mx-auto mb-2" /><p className="text-slate-500 text-sm">{polizas.length === 0 ? "No hay pólizas registradas" : "Sin resultados"}</p></td></tr>
            ) : filtrados.map(p => {
              const estatusActual = getEstatusActualizado(p.estatus, p.fecha_vencimiento);
              return (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="p-3"><p className="text-white text-sm font-medium">{p.numero_poliza}</p><p className="text-slate-500 text-xs">{p.cobertura || "â"}</p></td>
                <td className="p-3 text-slate-400 text-sm">{p.obra_nombre || "â"}</td>
                <td className="p-3 text-center text-sm text-white">{getTipo(p.tipo)?.label || p.tipo}</td>
                <td className="p-3 text-slate-400 text-sm">{p.aseguradora}</td>
                <td className="p-3 text-center text-sm text-white">{p.fecha_vencimiento ? new Date(p.fecha_vencimiento + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "â"}</td>
                <td className="p-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${getEstatus(estatusActual)?.color || "bg-slate-500/20 text-slate-400"}`}>{getEstatus(estatusActual)?.label || estatusActual}</span></td>
                <td className="p-3 text-center"><div className="flex items-center justify-center gap-1">
                  <button onClick={() => editar(p)} className="p-1.5 rounded-lg bg-aria-primary-light text-aria-accent hover:bg-aria-primary-hover/30"><Edit2 className="w-3.5 h-3.5" /></button>
                  {canDelete && <button onClick={() => setDeleteModal({ open: true, id: p.id, name: p.numero_poliza })} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"><Trash2 className="w-3.5 h-3.5" /></button>}
                </div></td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-[#0f1729] border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">{editId ? "Editar Póliza" : "Nueva Póliza"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
              <div><label className="block text-xs text-slate-400 mb-1">Obra *</label><select value={form.obra_id} onChange={e => setForm({ ...form, obra_id: e.target.value })} className={inputClass}><option value="">Seleccionar...</option>{obras.map(o => <option key={o.id} value={String(o.id)}>{o.nombre}</option>)}</select>{formErrors.obra_id && <p className="text-red-400 text-xs mt-1">{formErrors.obra_id}</p>}</div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Número *</label><input type="text" value={form.numero_poliza} onChange={e => setForm({ ...form, numero_poliza: e.target.value })} placeholder="POL-2026-001" className={inputClass} />{formErrors.numero_poliza && <p className="text-red-400 text-xs mt-1">{formErrors.numero_poliza}</p>}</div>
                <div><label className="block text-xs text-slate-400 mb-1">Tipo</label><select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className={inputClass}>{TIPO_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              </div>
              <div><label className="block text-xs text-slate-400 mb-1">Aseguradora *</label><input type="text" value={form.aseguradora} onChange={e => setForm({ ...form, aseguradora: e.target.value })} placeholder="AXA, Allianz, etc." className={inputClass} />{formErrors.aseguradora && <p className="text-red-400 text-xs mt-1">{formErrors.aseguradora}</p>}</div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Fecha inicio</label><input type="date" value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} className={inputClass} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Fecha vencimiento</label><input type="date" value={form.fecha_vencimiento} onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })} className={inputClass} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Cobertura</label><input type="text" value={form.cobertura} onChange={e => setForm({ ...form, cobertura: e.target.value })} placeholder="Monto de cobertura" className={inputClass} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Prima</label><input type="number" min="0" step="0.01" value={form.prima} onChange={e => setForm({ ...form, prima: e.target.value })} placeholder="0.00" className={inputClass} />{formErrors.prima && <p className="text-red-400 text-xs mt-1">{formErrors.prima}</p>}</div>
              </div>
              <div><label className="block text-xs text-slate-400 mb-1">Contacto</label><input type="text" value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} placeholder="Nombre, teléfono" className={inputClass} /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Documento</label><input type="file" onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })} className={inputClass} /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Observaciones</label><input type="text" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} className={inputClass} /></div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 text-sm">Cancelar</button>
              <button onClick={guardar} disabled={guardando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-aria-primary text-white hover:bg-aria-primary-hover text-sm disabled:opacity-50">{guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{editId ? "Actualizar" : "Registrar"}</button>
            </div>
          </div>
        </div>
      )}

      <DeleteModal open={deleteModal.open} onClose={() => setDeleteModal({ open: false, id: "", name: "" })} onConfirm={confirmDelete} count={1} itemLabel="Póliza" />
    </div>
  );
}
