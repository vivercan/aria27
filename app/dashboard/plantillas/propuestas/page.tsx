"use client";
import { clientLogger } from "@/lib/client-logger";
import DeleteModal from "@/components/DeleteModal";
import { useDeletePermission } from "@/lib/use-delete-permission";
import { backupAndDelete } from "@/lib/backup-delete";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Presentation, Search, Plus, Eye, Copy, Loader2, DollarSign, Calendar, X, Save, Trash2 } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";

interface Propuesta {
  id: string;
  nombre: string;
  cliente: string;
  obra: string;
  monto_estimado: number;
  estado: string;
  fecha_entrega: string;
  created_at: string;
}

const ESTADOS = ["borrador", "enviada", "en_revision", "aprobada", "rechazada"];
const EMPTY = { nombre: "", cliente: "", obra: "", monto_estimado: "", estado: "borrador", fecha_entrega: "" };

export default function PropuestasPage() {
  const log = clientLogger("PROPUESTAS");
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const { userEmail, canDelete } = useDeletePermission();
  const [deleteModal, setDeleteModal] = useState<{open:boolean;id:string;name:string}>
    ({open:false,id:"",name:""});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState<any>({ ...EMPTY });
  const [editId, setEditId] = useState<string | null>(null);
  const [obras, setObras] = useState<string[]>([]);
  // EX-3 18-Abr-2026: flash canónico via useFlashMessage (wrapper mantiene success/error)
  const { msg: mensaje, flash: _flash } = useFlashMessage(3000);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => { cargar(); cargarObras(); }, []);

  const cargar = async () => {
    const { data } = await supabase.from("propuestas_licitacion").select("*").order("created_at", { ascending: false });
    setPropuestas(data || []);
    setLoading(false);
  };

  const cargarObras = async () => {
    const { data } = await supabase.from("centros_trabajo").select("nombre").order("nombre");
    setObras((data || []).map(o => o.nombre));
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
    if (payload.monto_estimado) payload.monto_estimado = parseFloat(String(payload.monto_estimado));
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });

    if (editId) {
      const { error } = await supabase.from("propuestas_licitacion").update(payload).eq("id", editId);
      if (error) { msg("error", error?.message ?? "Error"); } else { msg("success", "Propuesta actualizada"); setShowForm(false); setEditId(null); cargar(); }
    } else {
      const { error } = await supabase.from("propuestas_licitacion").insert(payload);
      if (error) { msg("error", error?.message ?? "Error"); } else { msg("success", "Propuesta creada"); setShowForm(false); cargar(); }
    }
    setForm({ ...EMPTY });
    setGuardando(false);
  };

  const editar = (p: Propuesta) => {
    setForm({ nombre: p.nombre, cliente: p.cliente || "", obra: p.obra || "", monto_estimado: p.monto_estimado?.toString() || "", estado: p.estado || "borrador", fecha_entrega: p.fecha_entrega || "" });
    setEditId(p.id);
    setShowForm(true);
  };

  const eliminar = async (id: string) => {
    setDeleteModal({open:true,id,name:""}); // Protegido por DeleteModal
  };

  const filtered = propuestas.filter(p =>
    !search || p.nombre?.toLowerCase().includes(search.toLowerCase()) || p.cliente?.toLowerCase().includes(search.toLowerCase()) || p.obra?.toLowerCase().includes(search.toLowerCase())
  );

  const estadoColors: Record<string, string> = {
    borrador: "bg-gray-500/20 text-gray-300",
    enviada: "bg-aria-primary-light text-aria-accent",
    aprobada: "bg-emerald-500/20 text-aria-accent",
    rechazada: "bg-red-500/20 text-red-300",
    en_revision: "bg-amber-500/20 text-amber-300",
  };
  const confirmDelete = async () => {
    try {
      await backupAndDelete({ table: "propuestas_licitacion", id: deleteModal.id, userEmail });
    } catch (e: unknown) { log.error(String(e)); }
    setDeleteModal({open:false,id:"",name:""});
    cargar();
  };

  return (
    <div className="aria-bg-canon flex flex-col gap-6 p-6 h-full overflow-auto">
      <FlashBanner msg={mensaje} />

      <AriaBackButton href="/dashboard/plantillas" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Propuestas de Licitación</h1>
          <p className="text-[#7f93b0] text-sm">Paquetes de propuestas y licitaciones</p>
        </div>
        <button onClick={() => { setForm({ ...EMPTY }); setEditId(null); setShowForm(true); }} className="px-4 py-2 bg-[#1E3E7A] border border-[rgba(130,170,230,0.25)] text-white rounded-full text-sm font-medium hover:bg-[#2A4A8E] transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva Propuesta
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40" onClick={() => setShowForm(false)}>
          <div className="bg-[#0a1628] border border-white/[0.08] rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">{editId ? "Editar Propuesta" : "Nueva Propuesta"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-white/[0.06] rounded-lg"><X className="w-5 h-5 text-[#7f93b0]" /></button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-[#7f93b0] mb-1 block">Nombre *</label>
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:border-aria-primary/50 focus:outline-none" placeholder="Nombre de la propuesta" />
                {formErrors.nombre && <p className="text-red-400 text-xs mt-1">{formErrors.nombre}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#7f93b0] mb-1 block">Cliente</label>
                  <input value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:border-aria-primary/50 focus:outline-none" placeholder="Nombre del cliente" />
                </div>
                <div>
                  <label className="text-xs text-[#7f93b0] mb-1 block">Obra</label>
                  <select value={form.obra} onChange={e => setForm({ ...form, obra: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:border-aria-primary/50 focus:outline-none">
                    <option value="">Seleccionar obra</option>
                    {obras.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#7f93b0] mb-1 block">Monto Estimado</label>
                  <input type="number" min="0" value={form.monto_estimado} onChange={e => setForm({ ...form, monto_estimado: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:border-aria-primary/50 focus:outline-none" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-xs text-[#7f93b0] mb-1 block">Estado</label>
                  <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:border-aria-primary/50 focus:outline-none">
                    {ESTADOS.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1).replace("_", " ")}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#7f93b0] mb-1 block">Fecha de Entrega</label>
                <input type="date" value={form.fecha_entrega} onChange={e => setForm({ ...form, fecha_entrega: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:border-aria-primary/50 focus:outline-none" />
              </div>
              <button onClick={guardar} disabled={guardando} className="mt-2 w-full py-2.5 bg-[#1E3E7A] hover:bg-[#2A4A8E] disabled:opacity-50 text-white font-medium rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.25)] text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {guardando ? "Guardando..." : editId ? "Actualizar Propuesta" : "Crear Propuesta"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gradient-to-br from-[#1E3E7A]/15 to-[#0A2450]/25 border border-[#3A5E9A]/40 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
          <div className="inline-flex p-2 rounded-lg bg-amber-500/10 mb-2"><Presentation className="w-4 h-4 text-amber-400" /></div>
          <p className="text-xl font-bold text-white">{loading ? "..." : propuestas.length}</p>
          <p className="text-xs text-[#7f93b0]">Total Propuestas</p>
        </div>
        <div className="p-4 bg-gradient-to-br from-[#1E3E7A]/15 to-[#0A2450]/25 border border-[#3A5E9A]/40 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
          <div className="inline-flex p-2 rounded-lg bg-emerald-500/10 mb-2"><DollarSign className="w-4 h-4 text-aria-accent" /></div>
          <p className="text-xl font-bold text-white">{loading ? "..." : `$${propuestas.reduce((s, p) => s + (p.monto_estimado || 0), 0).toLocaleString()}`}</p>
          <p className="text-xs text-[#7f93b0]">Monto Total Estimado</p>
        </div>
        <div className="p-4 bg-gradient-to-br from-[#1E3E7A]/15 to-[#0A2450]/25 border border-[#3A5E9A]/40 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
          <div className="inline-flex p-2 rounded-lg bg-aria-primary/10 mb-2"><Calendar className="w-4 h-4 text-aria-accent" /></div>
          <p className="text-xl font-bold text-white">{loading ? "..." : propuestas.filter(p => p.estado === "enviada" || p.estado === "en_revision").length}</p>
          <p className="text-xs text-[#7f93b0]">En Proceso</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7f93b0]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar propuesta por nombre, cliente u obra..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-[#4a6080] focus:border-aria-primary/50 focus:outline-none" />
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[rgba(4,8,16,0.98)] backdrop-blur z-10">
              <tr className="text-[#7f93b0] text-xs uppercase">
                <th className="text-left p-3">Propuesta</th>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Obra</th>
                <th className="text-right p-3">Monto Est.</th>
                <th className="text-center p-3">Estado</th>
                <th className="text-left p-3">Entrega</th>
                <th className="text-center p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-aria-accent mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-[#7f93b0]">
                  {propuestas.length === 0 ? "No hay propuestas registradas. Crea tu primera propuesta." : "No se encontraron resultados."}
                </td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                  <td className="p-3 text-white font-medium">{p.nombre}</td>
                  <td className="p-3 text-[#c9d8ed]">{p.cliente || "—"}</td>
                  <td className="p-3 text-[#7f93b0]">{p.obra || "—"}</td>
                  <td className="p-3 text-right text-aria-accent font-medium">${(p.monto_estimado || 0).toLocaleString()}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoColors[p.estado] || estadoColors.borrador}`}>
                      {p.estado || "Borrador"}
                    </span>
                  </td>
                  <td className="p-3 text-[#7f93b0] text-xs">{p.fecha_entrega ? new Date(p.fecha_entrega).toLocaleDateString("es-MX") : "—"}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => editar(p)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#7f93b0] hover:text-white transition"><Eye className="w-4 h-4" /></button>
                      {canDelete && (<button onClick={() => eliminar(p.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-[#7f93b0] hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>)}
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
        itemLabel="Propuesta"
      />
    </div>
  );
}
