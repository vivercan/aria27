"use client";
import DeleteModal from "@/components/DeleteModal";
import { useDeletePermission } from "@/lib/use-delete-permission";
import { backupAndDelete } from "@/lib/backup-delete";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Plus, Edit2, Trash2, X, Save, Loader2,
  Search, Droplets
} from "lucide-react";

interface Obra { id: number; nombre: string; }

interface Colado {
  id: string;
  obra_id: number;
  obra_nombre: string;
  fecha_colado: string;
  resistencia: string;
  volumen_m3: number;
  proveedor: string;
  remision: string;
  elemento: string;
  ubicacion: string;
  responsable: string;
  observaciones: string;
  estatus: string;
  created_at: string;
}

const ESTATUS_OPTIONS = [
  { value: "programado", label: "Programado", color: "bg-blue-500/20 text-blue-400" },
  { value: "colado", label: "Colado", color: "bg-amber-500/20 text-amber-400" },
  { value: "curado", label: "Curado", color: "bg-purple-500/20 text-purple-400" },
  { value: "verificado", label: "Verificado", color: "bg-emerald-500/20 text-emerald-400" },
];

const EMPTY_FORM = {
  obra_id: "", fecha_colado: "", resistencia: "", volumen_m3: "",
  proveedor: "", remision: "", elemento: "", ubicacion: "",
  responsable: "", observaciones: "", estatus: "programado",
};

export default function ConcretoPage() {
  const [colados, setColados] = useState<Colado[]>([]);
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
    const { data } = await supabase.from("concreto").select("*").order("fecha_colado", { ascending: false });
    if (data) setColados(data);
    setLoading(false);
  };

  const msg = (tipo: "success" | "error", texto: string) => { setMensaje({ tipo, texto }); setTimeout(() => setMensaje(null), 3000); };

  const guardar = async () => {
    if (!form.obra_id) { msg("error", "Selecciona una obra"); return; }
    if (!form.elemento?.trim()) { msg("error", "El elemento es obligatorio"); return; }
    setGuardando(true);
    const obra = obras.find(o => o.id === Number(form.obra_id));
    const payload: any = {
      obra_id: Number(form.obra_id), obra_nombre: obra?.nombre || "",
      fecha_colado: form.fecha_colado || null, resistencia: form.resistencia?.trim() || null,
      volumen_m3: form.volumen_m3 ? parseFloat(form.volumen_m3) : null,
      proveedor: form.proveedor?.trim() || null, remision: form.remision?.trim() || null,
      elemento: form.elemento.trim(), ubicacion: form.ubicacion?.trim() || null,
      responsable: form.responsable?.trim() || null, observaciones: form.observaciones?.trim() || null,
      estatus: form.estatus || "programado",
    };
    if (editId) {
      const { error } = await supabase.from("concreto").update(payload).eq("id", editId);
      if (error) msg("error", error?.message ?? "Error"); else { msg("success", "Colado actualizado"); setShowForm(false); setEditId(null); cargar(); }
    } else {
      const { error } = await supabase.from("concreto").insert(payload);
      if (error) msg("error", error?.message ?? "Error"); else { msg("success", "Colado registrado"); setShowForm(false); cargar(); }
    }
    setGuardando(false);
  };

  const editar = (c: Colado) => {
    setEditId(c.id);
    setForm({ obra_id: String(c.obra_id), fecha_colado: c.fecha_colado || "", resistencia: c.resistencia || "", volumen_m3: c.volumen_m3 ? String(c.volumen_m3) : "", proveedor: c.proveedor || "", remision: c.remision || "", elemento: c.elemento || "", ubicacion: c.ubicacion || "", responsable: c.responsable || "", observaciones: c.observaciones || "", estatus: c.estatus || "programado" });
    setShowForm(true);
  };

  const confirmDelete = async () => {
    try { await backupAndDelete({ table: "concreto", id: deleteModal.id, userEmail }); msg("success", "Eliminado"); } catch (e: any) { msg("error", e?.message || "Error"); }
    setDeleteModal({ open: false, id: "", name: "" }); cargar();
  };

  const getEstatus = (s: string) => ESTATUS_OPTIONS.find(o => o.value === s);
  const totalM3 = colados.reduce((s, c) => s + (c.volumen_m3 || 0), 0);
  const verificados = colados.filter(c => c.estatus === "verificado").length;

  const filtrados = colados.filter(c => {
    if (filtroObra && String(c.obra_id) !== filtroObra) return false;
    if (busqueda) { const q = busqueda.toLowerCase(); return c.elemento?.toLowerCase().includes(q) || c.proveedor?.toLowerCase().includes(q) || c.obra_nombre?.toLowerCase().includes(q); }
    return true;
  });

  const inputClass = "w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-blue-500 focus:outline-none placeholder-slate-600";

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/obras" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
          <div><h1 className="text-xl font-bold text-white">Control de Concreto</h1><p className="text-xs text-slate-400">{colados.length} colados registrados</p></div>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY_FORM }); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"><Plus className="w-4 h-4" /> Nuevo Colado</button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4 flex-shrink-0">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3"><p className="text-blue-400 text-2xl font-bold">{colados.length}</p><p className="text-blue-400/70 text-xs">Total Colados</p></div>
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3"><p className="text-cyan-400 text-2xl font-bold">{totalM3.toFixed(1)}</p><p className="text-cyan-400/70 text-xs">mÂ³ Total</p></div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3"><p className="text-emerald-400 text-2xl font-bold">{verificados}</p><p className="text-emerald-400/70 text-xs">Verificados</p></div>
      </div>

      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <div className="relative flex-1 max-w-xs"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar elemento, proveedor..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-blue-500 focus:outline-none placeholder-slate-600" /></div>
        <select value={filtroObra} onChange={e => setFiltroObra(e.target.value)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-blue-500 focus:outline-none"><option value="">Todas las obras</option>{obras.map(o => <option key={o.id} value={String(o.id)}>{o.nombre}</option>)}</select>
      </div>

      {mensaje && (<div className={`mb-3 px-4 py-2 rounded-lg text-sm flex-shrink-0 ${mensaje.tipo === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>{mensaje.texto}</div>)}

      <div className="flex-1 overflow-y-auto rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <table className="w-full">
          <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10"><tr className="border-b border-white/10">
            <th className="text-left p-3 text-slate-400 font-medium text-xs">Elemento</th>
            <th className="text-left p-3 text-slate-400 font-medium text-xs">Obra</th>
            <th className="text-center p-3 text-slate-400 font-medium text-xs">Resistencia</th>
            <th className="text-right p-3 text-slate-400 font-medium text-xs">mÂ³</th>
            <th className="text-left p-3 text-slate-400 font-medium text-xs">Proveedor</th>
            <th className="text-center p-3 text-slate-400 font-medium text-xs">Fecha</th>
            <th className="text-center p-3 text-slate-400 font-medium text-xs">Estatus</th>
            <th className="text-center p-3 text-slate-400 font-medium text-xs">Acc</th>
          </tr></thead>
          <tbody>
            {loading ? (<tr><td colSpan={8} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-400" /></td></tr>
            ) : filtrados.length === 0 ? (<tr><td colSpan={8} className="p-8 text-center"><Droplets className="w-10 h-10 text-slate-600 mx-auto mb-2" /><p className="text-slate-500 text-sm">{colados.length === 0 ? "No hay colados registrados" : "Sin resultados"}</p></td></tr>
            ) : filtrados.map(c => (
              <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="p-3"><p className="text-white text-sm font-medium">{c.elemento}</p>{c.remision && <p className="text-slate-500 text-xs">Rem: {c.remision}</p>}</td>
                <td className="p-3 text-slate-400 text-sm">{c.obra_nombre || "â"}</td>
                <td className="p-3 text-center text-sm text-white">{c.resistencia || "â"}</td>
                <td className="p-3 text-right text-sm text-cyan-400 font-medium">{c.volumen_m3 ? Number(c.volumen_m3).toFixed(1) : "â"}</td>
                <td className="p-3 text-slate-400 text-sm">{c.proveedor || "â"}</td>
                <td className="p-3 text-center text-xs text-slate-400">{c.fecha_colado ? new Date(c.fecha_colado + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) : "â"}</td>
                <td className="p-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${getEstatus(c.estatus)?.color || "bg-slate-500/20 text-slate-400"}`}>{getEstatus(c.estatus)?.label || c.estatus}</span></td>
                <td className="p-3 text-center"><div className="flex items-center justify-center gap-1">
                  <button onClick={() => editar(c)} className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"><Edit2 className="w-3.5 h-3.5" /></button>
                  {canDelete && <button onClick={() => setDeleteModal({ open: true, id: c.id, name: c.elemento })} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"><Trash2 className="w-3.5 h-3.5" /></button>}
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
              <h2 className="text-lg font-bold text-white">{editId ? "Editar Colado" : "Nuevo Colado"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
              <div><label className="block text-xs text-slate-400 mb-1">Obra *</label><select value={form.obra_id} onChange={e => setForm({ ...form, obra_id: e.target.value })} className={inputClass}><option value="">Seleccionar...</option>{obras.map(o => <option key={o.id} value={String(o.id)}>{o.nombre}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Elemento *</label><input type="text" value={form.elemento} onChange={e => setForm({ ...form, elemento: e.target.value })} placeholder="Zapata Z-1, Losa N+3" className={inputClass} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Fecha colado</label><input type="date" value={form.fecha_colado} onChange={e => setForm({ ...form, fecha_colado: e.target.value })} className={inputClass} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Resistencia</label><input type="text" value={form.resistencia} onChange={e => setForm({ ...form, resistencia: e.target.value })} placeholder="f'c 250" className={inputClass} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Volumen mÂ³</label><input type="number" step="0.1" value={form.volumen_m3} onChange={e => setForm({ ...form, volumen_m3: e.target.value })} placeholder="0.0" className={inputClass} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">RemisiÃ³n</label><input type="text" value={form.remision} onChange={e => setForm({ ...form, remision: e.target.value })} placeholder="#12345" className={inputClass} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Proveedor</label><input type="text" value={form.proveedor} onChange={e => setForm({ ...form, proveedor: e.target.value })} placeholder="CEMEX, Holcim..." className={inputClass} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Estatus</label><select value={form.estatus} onChange={e => setForm({ ...form, estatus: e.target.value })} className={inputClass}>{ESTATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">UbicaciÃ³n</label><input type="text" value={form.ubicacion} onChange={e => setForm({ ...form, ubicacion: e.target.value })} placeholder="Eje A-B / 1-3" className={inputClass} /></div>
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

      <DeleteModal open={deleteModal.open} onClose={() => setDeleteModal({ open: false, id: "", name: "" })} onConfirm={confirmDelete} count={1} itemLabel="Colado" />
    </div>
  );
}
