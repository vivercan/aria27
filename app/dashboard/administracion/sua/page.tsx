"use client";
import DeleteModal from "@/components/DeleteModal";
import { useDeletePermission } from "@/lib/use-delete-permission";
import { backupAndDelete } from "@/lib/backup-delete";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Plus, Edit2, Trash2, X, Save, Loader2,
  Search, DollarSign, Users, FileText
} from "lucide-react";

interface Obra { id: number; nombre: string; }

interface SUA {
  id: string;
  obra_id: number;
  obra_nombre: string;
  periodo: string;
  tipo: string;
  num_trabajadores: number;
  monto: number;
  fecha_pago: string;
  documento_url: string;
  estatus: string;
  observaciones: string;
  responsable: string;
  created_at: string;
}

const TIPO_OPTIONS = [
  { value: "SUA", label: "SUA" },
  { value: "INFONAVIT", label: "Infonavit" },
  { value: "IMSS", label: "IMSS" },
];

const ESTATUS_OPTIONS = [
  { value: "pendiente", label: "Pendiente", color: "bg-amber-500/20 text-amber-400" },
  { value: "pagado", label: "Pagado", color: "bg-blue-500/20 text-blue-400" },
  { value: "comprobado", label: "Comprobado", color: "bg-emerald-500/20 text-emerald-400" },
];

const EMPTY_FORM = {
  obra_id: "", periodo: "", tipo: "SUA", num_trabajadores: "",
  monto: "", fecha_pago: "", documento_url: "", estatus: "pendiente",
  observaciones: "", responsable: "", file: null as File | null,
};

export default function SUAPage() {
  const [aportaciones, setAportaciones] = useState<SUA[]>([]);
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
    const { data } = await supabase.from("sua_aportaciones").select("*").order("periodo", { ascending: false });
    if (data) setAportaciones(data);
    setLoading(false);
  };

  const msg = (tipo: "success" | "error", texto: string) => { setMensaje({ tipo, texto }); setTimeout(() => setMensaje(null), 3000); };

  const guardar = async () => {
    if (!form.obra_id) { msg("error", "Selecciona una obra"); return; }
    if (!form.periodo?.trim()) { msg("error", "El período es obligatorio"); return; }
    if (!form.monto) { msg("error", "El monto es obligatorio"); return; }

    setGuardando(true);
    const obra = obras.find(o => String(o.id) === form.obra_id);

    let urlFile = form.documento_url || null;

    if (form.file) {
      const timestamp = Date.now();
      const ext = form.file.name.split(".").pop() || "pdf";
      const path = `sua/${form.obra_id}/${timestamp}.${ext}`;

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

      urlFile = publicUrl;
    }

    const payload: any = {
      obra_id: form.obra_id, obra_nombre: obra?.nombre || "",
      periodo: form.periodo.trim(), tipo: form.tipo,
      num_trabajadores: form.num_trabajadores ? parseInt(form.num_trabajadores) : null,
      monto: parseFloat(form.monto), fecha_pago: form.fecha_pago || null,
      documento_url: urlFile, estatus: form.estatus,
      observaciones: form.observaciones?.trim() || null,
      responsable: form.responsable?.trim() || null,
    };

    if (editId) {
      const { error } = await supabase.from("sua_aportaciones").update(payload).eq("id", editId);
      if (error) msg("error", error?.message ?? "Error"); else { msg("success", "Aportación actualizada"); setShowForm(false); setEditId(null); cargar(); }
    } else {
      const { error } = await supabase.from("sua_aportaciones").insert(payload);
      if (error) msg("error", error?.message ?? "Error"); else { msg("success", "Aportación registrada"); setShowForm(false); cargar(); }
    }
    setGuardando(false);
  };

  const editar = (s: SUA) => {
    setEditId(s.id);
    setForm({
      obra_id: String(s.obra_id), periodo: s.periodo || "", tipo: s.tipo || "SUA",
      num_trabajadores: s.num_trabajadores ? String(s.num_trabajadores) : "",
      monto: s.monto ? String(s.monto) : "", fecha_pago: s.fecha_pago || "",
      documento_url: s.documento_url || "", estatus: s.estatus || "pendiente",
      observaciones: s.observaciones || "", responsable: s.responsable || "",
      file: null,
    });
    setShowForm(true);
  };

  const confirmDelete = async () => {
    try { await backupAndDelete({ table: "sua_aportaciones", id: deleteModal.id, userEmail }); msg("success", "Eliminado"); } catch (e: any) { msg("error", e?.message || "Error"); }
    setDeleteModal({ open: false, id: "", name: "" }); cargar();
  };

  const getTipo = (t: string) => TIPO_OPTIONS.find(o => o.value === t);
  const getEstatus = (s: string) => ESTATUS_OPTIONS.find(o => o.value === s);
  const totalAportaciones = aportaciones.length;
  const montoPagado = aportaciones.filter(a => a.estatus === "pagado" || a.estatus === "comprobado").reduce((s, a) => s + (a.monto || 0), 0);
  const montoPendiente = aportaciones.filter(a => a.estatus === "pendiente").reduce((s, a) => s + (a.monto || 0), 0);

  const formatCurrency = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

  const filtrados = aportaciones.filter(a => {
    if (filtroObra && String(a.obra_id) !== filtroObra) return false;
    if (busqueda) { const q = busqueda.toLowerCase(); return a.periodo?.toLowerCase().includes(q) || a.obra_nombre?.toLowerCase().includes(q) || a.tipo?.toLowerCase().includes(q); }
    return true;
  });

  const inputClass = "w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-blue-500 focus:outline-none placeholder-slate-600";

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/finanzas" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
          <div><h1 className="text-xl font-bold text-white">SUA / Infonavit</h1><p className="text-xs text-slate-400">{aportaciones.length} aportaciones registradas</p></div>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY_FORM }); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"><Plus className="w-4 h-4" /> Nueva Aportación</button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4 flex-shrink-0">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3"><p className="text-blue-400 text-2xl font-bold">{totalAportaciones}</p><p className="text-blue-400/70 text-xs">Total</p></div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3"><p className="text-emerald-400 text-lg font-bold">{formatCurrency(montoPagado).split(".")[0]}</p><p className="text-emerald-400/70 text-xs">Pagado</p></div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3"><p className="text-amber-400 text-lg font-bold">{formatCurrency(montoPendiente).split(".")[0]}</p><p className="text-amber-400/70 text-xs">Pendiente</p></div>
      </div>

      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <div className="relative flex-1 max-w-xs"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar período, tipo..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-blue-500 focus:outline-none placeholder-slate-600" /></div>
        <select value={filtroObra} onChange={e => setFiltroObra(e.target.value)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-blue-500 focus:outline-none"><option value="">Todas las obras</option>{obras.map(o => <option key={o.id} value={String(o.id)}>{o.nombre}</option>)}</select>
      </div>

      {mensaje && (<div className={`mb-3 px-4 py-2 rounded-lg text-sm flex-shrink-0 ${mensaje.tipo === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>{mensaje.texto}</div>)}

      <div className="flex-1 overflow-y-auto rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <table className="w-full">
          <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10"><tr className="border-b border-white/10">
            <th className="text-left p-3 text-slate-400 font-medium text-xs">Período</th>
            <th className="text-left p-3 text-slate-400 font-medium text-xs">Obra</th>
            <th className="text-center p-3 text-slate-400 font-medium text-xs">Tipo</th>
            <th className="text-center p-3 text-slate-400 font-medium text-xs">Trabajadores</th>
            <th className="text-right p-3 text-slate-400 font-medium text-xs">Monto</th>
            <th className="text-center p-3 text-slate-400 font-medium text-xs">Estatus</th>
            <th className="text-center p-3 text-slate-400 font-medium text-xs">Acc</th>
          </tr></thead>
          <tbody>
            {loading ? (<tr><td colSpan={7} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-400" /></td></tr>
            ) : filtrados.length === 0 ? (<tr><td colSpan={7} className="p-8 text-center"><Users className="w-10 h-10 text-slate-600 mx-auto mb-2" /><p className="text-slate-500 text-sm">{aportaciones.length === 0 ? "No hay aportaciones registradas" : "Sin resultados"}</p></td></tr>
            ) : filtrados.map(a => (
              <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="p-3"><p className="text-white text-sm font-medium">{a.periodo}</p><p className="text-slate-500 text-xs">{a.responsable || "â"}</p></td>
                <td className="p-3 text-slate-400 text-sm">{a.obra_nombre || "â"}</td>
                <td className="p-3 text-center text-sm text-white">{getTipo(a.tipo)?.label || a.tipo}</td>
                <td className="p-3 text-center text-sm text-cyan-400 font-medium">{a.num_trabajadores || "â"}</td>
                <td className="p-3 text-right text-sm text-white font-medium">{formatCurrency(a.monto || 0)}</td>
                <td className="p-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${getEstatus(a.estatus)?.color || "bg-slate-500/20 text-slate-400"}`}>{getEstatus(a.estatus)?.label || a.estatus}</span></td>
                <td className="p-3 text-center"><div className="flex items-center justify-center gap-1">
                  <button onClick={() => editar(a)} className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"><Edit2 className="w-3.5 h-3.5" /></button>
                  {canDelete && <button onClick={() => setDeleteModal({ open: true, id: a.id, name: a.periodo })} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"><Trash2 className="w-3.5 h-3.5" /></button>}
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
              <h2 className="text-lg font-bold text-white">{editId ? "Editar Aportación" : "Nueva Aportación"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
              <div><label className="block text-xs text-slate-400 mb-1">Obra *</label><select value={form.obra_id} onChange={e => setForm({ ...form, obra_id: e.target.value })} className={inputClass}><option value="">Seleccionar...</option>{obras.map(o => <option key={o.id} value={String(o.id)}>{o.nombre}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Período *</label><input type="text" value={form.periodo} onChange={e => setForm({ ...form, periodo: e.target.value })} placeholder="2026-01" className={inputClass} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Tipo</label><select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className={inputClass}>{TIPO_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Trabajadores</label><input type="number" value={form.num_trabajadores} onChange={e => setForm({ ...form, num_trabajadores: e.target.value })} placeholder="0" className={inputClass} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Monto *</label><input type="number" step="0.01" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} placeholder="0.00" className={inputClass} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Fecha pago</label><input type="date" value={form.fecha_pago} onChange={e => setForm({ ...form, fecha_pago: e.target.value })} className={inputClass} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Estatus</label><select value={form.estatus} onChange={e => setForm({ ...form, estatus: e.target.value })} className={inputClass}>{ESTATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
              </div>
              <div><label className="block text-xs text-slate-400 mb-1">Documento</label><input type="file" onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })} className={inputClass} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Responsable</label><input type="text" value={form.responsable} onChange={e => setForm({ ...form, responsable: e.target.value })} className={inputClass} /></div>
              </div>
              <div><label className="block text-xs text-slate-400 mb-1">Observaciones</label><input type="text" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} className={inputClass} /></div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 text-sm">Cancelar</button>
              <button onClick={guardar} disabled={guardando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50">{guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{editId ? "Actualizar" : "Registrar"}</button>
            </div>
          </div>
        </div>
      )}

      <DeleteModal open={deleteModal.open} onClose={() => setDeleteModal({ open: false, id: "", name: "" })} onConfirm={confirmDelete} count={1} itemLabel="Aportación" />
    </div>
  );
}
