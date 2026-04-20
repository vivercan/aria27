"use client";
import { clientLogger } from "@/lib/client-logger";
import DeleteModal from "@/components/DeleteModal";
import { useDeletePermission } from "@/lib/use-delete-permission";
import { backupAndDelete } from "@/lib/backup-delete";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Plus, Edit2, Trash2, X, Save, Loader2,
  Car, Key, Fuel, Search, MapPin, FolderOpen
} from "lucide-react";
import { EntityFolderDrawer } from "@/components/EntityFolder";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { useEntityForm } from "@/hooks/useEntityForm";
import PageHeader from "@/components/ui/PageHeader";

interface Vehiculo {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  marca: string;
  modelo: string;
  anio: number;
  placas: string;
  estado: string;
  ubicacion_actual: string;
  kilometraje: number;
  combustible: string;
  created_at: string;
}

interface VehiclePayload {
  nombre: string;
  codigo: string | null;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  placas: string | null;
  estado: string;
  ubicacion_actual: string | null;
  kilometraje: number | null;
  combustible: string | null;
}

const ESTADO_OPTIONS = [
  { value: "bueno", label: "Operativo", color: "bg-emerald-500/20 text-aria-accent" },
  { value: "EN_USO", label: "Operativo", color: "bg-emerald-500/20 text-aria-accent" }, // B7 fix: migración legacy llenó con EN_USO en lugar de "bueno"
  { value: "mantenimiento", label: "En Mantenimiento", color: "bg-amber-500/20 text-amber-400" },
  { value: "reparacion", label: "En Reparación", color: "bg-orange-500/20 text-orange-400" },
  { value: "baja", label: "Dado de Baja", color: "bg-red-500/20 text-red-400" },
];

const COMBUSTIBLE_OPTIONS = ["Gasolina", "Diésel", "Eléctrico", "Híbrido", "N/A"];

const EMPTY_FORM = {
  codigo: "", nombre: "", marca: "", modelo: "", anio: "",
  placas: "", estado: "bueno", ubicacion_actual: "", kilometraje: "",
  combustible: "Diésel",
};

export default function VehiculosPage() {
  const log = clientLogger("VEHICULOS");
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const { userEmail, canDelete } = useDeletePermission();
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [expedienteVeh, setExpedienteVeh] = useState<Vehiculo|null>(null);

  // Shared hooks — replace manual modal/form/flash state
  const { msg, flash } = useFlashMessage();
  const { showModal: showForm, editId, form, saving: guardando, openNew, openEdit, closeModal, setForm, setSaving: setGuardando } = useEntityForm(EMPTY_FORM);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    const { data, error } = await supabase
      .from("activos")
      .select("*")
      .in("tipo", ["VEHICULO", "MAQUINARIA"])
      .order("nombre");
    if (error) log.error("Error:", (error as {message?: string})?.message || "Unknown error");
    if (data) setVehiculos(data);
    setLoading(false);
  };

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validar = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.nombre?.trim()) errors.nombre = "El nombre es obligatorio";
    if (form.anio && (isNaN(parseInt(form.anio)) || parseInt(form.anio) < 1900 || parseInt(form.anio) > new Date().getFullYear() + 1)) {
      errors.anio = "Año inválido";
    }
    if (form.kilometraje && (isNaN(parseFloat(form.kilometraje)) || parseFloat(form.kilometraje) < 0)) {
      errors.kilometraje = "Kilometraje debe ser >= 0";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;
    setGuardando(true);

    const payload: VehiclePayload = {
      nombre: form.nombre.trim(),
      codigo: form.codigo?.trim() || null,
      tipo: "VEHICULO",
      marca: form.marca?.trim() || null,
      modelo: form.modelo?.trim() || null,
      anio: form.anio ? parseInt(form.anio) : null,
      placas: form.placas?.trim() || null,
      estado: form.estado || "bueno",
      ubicacion_actual: form.ubicacion_actual?.trim() || null,
      kilometraje: form.kilometraje ? parseFloat(form.kilometraje) : null,
      combustible: form.combustible || null,
    };

    if (editId) {
      const { error } = await supabase.from("activos").update(payload).eq("id", editId);
      if (error) { flash("err", ((error as {message?: string})?.message) || "Error al actualizar"); }
      else { flash("ok", "Vehículo actualizado"); closeModal(); cargar(); }
    } else {
      const { error } = await supabase.from("activos").insert(payload);
      if (error) { flash("err", ((error as {message?: string})?.message) || "Error al crear"); }
      else { flash("ok", "Vehículo registrado"); closeModal(); cargar(); }
    }
    setGuardando(false);
  };

  const editar = (v: Vehiculo) => {
    openEdit(v.id, {
      codigo: v.codigo || "", nombre: v.nombre || "", marca: v.marca || "",
      modelo: v.modelo || "", anio: v.anio ? String(v.anio) : "",
      placas: v.placas || "", estado: v.estado || "bueno",
      ubicacion_actual: v.ubicacion_actual || "",
      kilometraje: v.kilometraje ? String(v.kilometraje) : "",
      combustible: v.combustible || "Diésel",
    });
  };

  const confirmDelete = async () => {
    try {
      await backupAndDelete({ table: "activos", id: deleteModal.id, userEmail });
      flash("ok", "Vehículo eliminado");
    } catch (e: unknown) { flash("err", (e as {message?: string})?.message || "Error"); }
    setDeleteModal({ open: false, id: "", name: "" });
    cargar();
  };

  const getEstadoStyle = (s: string) => ESTADO_OPTIONS.find(o => o.value === s)?.color || "bg-slate-500/20 text-[#7f93b0]";
  const getEstadoLabel = (s: string) => ESTADO_OPTIONS.find(o => o.value === s)?.label || s;

  const filtrados = vehiculos.filter(v => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return v.nombre?.toLowerCase().includes(q) || v.placas?.toLowerCase().includes(q) ||
      v.marca?.toLowerCase().includes(q) || v.ubicacion_actual?.toLowerCase().includes(q);
  });

  // B7 fix: incluir "EN_USO" como estado operativo (legacy data usa EN_USO en vez de "bueno")
  const operativos = vehiculos.filter(v => v.estado === "bueno" || v.estado === "EN_USO").length;
  const enMant = vehiculos.filter(v => v.estado === "mantenimiento" || v.estado === "reparacion").length;

  const inputClass = "w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:border-aria-primary focus:outline-none placeholder-slate-600";

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* EX-4 18-Abr-2026: PageHeader canónico */}
      <div className="flex-shrink-0 mb-4">
        <PageHeader
          title="Vehículos y Maquinaria"
          subtitle={`${vehiculos.length} unidades registradas`}
          backHref="/dashboard/activos"
          sticky={false}
          actions={
            <button
              onClick={() => openNew()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white text-sm hover:bg-rose-700"
            >
              <Plus className="w-4 h-4" /> Nuevo Vehículo
            </button>
          }
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 flex-shrink-0">
        <div className="bg-aria-primary/10 border border-aria-primary/20 rounded-xl p-3">
          <p className="text-white text-2xl font-bold">{vehiculos.length}</p>
          <p className="text-aria-accent/70 text-xs">Total</p>
        </div>
        <div className="bg-emerald-500/10 border border-white/[0.08] rounded-xl p-3">
          <p className="text-white text-2xl font-bold">{operativos}</p>
          <p className="text-aria-accent/70 text-xs">Operativos</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
          <p className="text-amber-400 text-2xl font-bold">{enMant}</p>
          <p className="text-amber-400/70 text-xs">En Mant/Rep</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6080]" />
          <input
            type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, placas, marca o ubicación..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:border-aria-primary focus:outline-none placeholder-slate-600"
          />
        </div>
      </div>

      {msg && (
        <div className={`mb-3 px-4 py-2 rounded-lg text-sm flex-shrink-0 ${msg.tipo === "ok" ? "bg-emerald-500/20 text-aria-accent" : "bg-red-500/20 text-red-400"}`}>
          {msg.texto}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-y-auto rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <table className="w-full">
          <thead className="sticky top-0 bg-[rgba(4,8,16,0.98)]  z-10">
            <tr className="border-b border-white/[0.08]">
              <th className="text-left p-3 text-[#7f93b0] font-medium text-xs">Vehículo</th>
              <th className="text-left p-3 text-[#7f93b0] font-medium text-xs">Placas</th>
              <th className="text-left p-3 text-[#7f93b0] font-medium text-xs">Ubicación</th>
              <th className="text-right p-3 text-[#7f93b0] font-medium text-xs">Km</th>
              <th className="text-center p-3 text-[#7f93b0] font-medium text-xs">Combustible</th>
              <th className="text-center p-3 text-[#7f93b0] font-medium text-xs">Estado</th>
              <th className="text-center p-3 text-[#7f93b0] font-medium text-xs">Acc</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-aria-accent" /></td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center">
                <Car className="w-10 h-10 text-[#4a6080] mx-auto mb-2" />
                <p className="text-[#4a6080] text-sm">{vehiculos.length === 0 ? "No hay vehículos registrados" : "Sin resultados"}</p>
              </td></tr>
            ) : filtrados.map(v => (
              <tr key={v.id} className="border-b border-white/[0.05] hover:bg-white/[0.02]">
                <td className="p-3">
                  <p className="text-white text-sm font-medium">{v.nombre}</p>
                  <p className="text-[#4a6080] text-xs">{[v.marca, v.modelo, v.anio].filter(Boolean).join(" ") || "—"}</p>
                </td>
                <td className="p-3 text-[#c9d8ed] text-sm font-mono">{v.placas || "—"}</td>
                <td className="p-3 text-[#7f93b0] text-sm">{v.ubicacion_actual || "—"}</td>
                <td className="p-3 text-right text-sm text-white">{v.kilometraje ? Number(v.kilometraje).toLocaleString() : "—"}</td>
                <td className="p-3 text-center text-xs text-[#7f93b0]">{v.combustible || "—"}</td>
                <td className="p-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getEstadoStyle(v.estado)}`}>{getEstadoLabel(v.estado)}</span>
                </td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => setExpedienteVeh(v)} title="Expediente" className="p-1.5 rounded-lg bg-aria-primary-light text-aria-accent hover:bg-aria-primary-hover/30"><FolderOpen className="w-3.5 h-3.5" /></button>
                    <button onClick={() => editar(v)} className="p-1.5 rounded-lg bg-aria-primary-light text-aria-accent hover:bg-aria-primary-hover/30"><Edit2 className="w-3.5 h-3.5" /></button>
                    {canDelete && (
                      <button onClick={() => setDeleteModal({ open: true, id: v.id, name: v.nombre })} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60  z-50 flex items-center justify-center p-4" onClick={() => closeModal()}>
          <div className="bg-[#0f1729] border border-white/[0.08] rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
              <h2 className="text-lg font-bold text-white">{editId ? "Editar Vehículo" : "Nuevo Vehículo"}</h2>
              <button onClick={() => closeModal()} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#7f93b0]"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#7f93b0] mb-1">Código</label>
                  <input type="text" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="VH-001" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-[#7f93b0] mb-1">Nombre *</label>
                  <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Camioneta Ford F-150" className={inputClass} />
                  {formErrors.nombre && <p className="text-red-400 text-xs mt-1">{formErrors.nombre}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-[#7f93b0] mb-1">Marca</label>
                  <input type="text" value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} placeholder="Ford" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-[#7f93b0] mb-1">Modelo</label>
                  <input type="text" value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} placeholder="F-150" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-[#7f93b0] mb-1">Año</label>
                  <input type="number" min="0" value={form.anio} onChange={e => setForm({ ...form, anio: e.target.value })} placeholder="2024" className={inputClass} />
                  {formErrors.anio && <p className="text-red-400 text-xs mt-1">{formErrors.anio}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#7f93b0] mb-1">Placas</label>
                  <input type="text" value={form.placas} onChange={e => setForm({ ...form, placas: e.target.value })} placeholder="AGS-123-A" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-[#7f93b0] mb-1">Kilometraje</label>
                  <input type="number" min="0" value={form.kilometraje} onChange={e => setForm({ ...form, kilometraje: e.target.value })} placeholder="0" className={inputClass} />
                  {formErrors.kilometraje && <p className="text-red-400 text-xs mt-1">{formErrors.kilometraje}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#7f93b0] mb-1">Combustible</label>
                  <select value={form.combustible} onChange={e => setForm({ ...form, combustible: e.target.value })} className={inputClass}>
                    {COMBUSTIBLE_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#7f93b0] mb-1">Estado</label>
                  <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} className={inputClass}>
                    {ESTADO_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#7f93b0] mb-1">Ubicación actual</label>
                <input type="text" value={form.ubicacion_actual} onChange={e => setForm({ ...form, ubicacion_actual: e.target.value })} placeholder="Obra Pinar del Lago" className={inputClass} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-white/[0.08]">
              <button onClick={() => closeModal()} className="px-4 py-2 rounded-lg bg-white/[0.04] text-[#7f93b0] hover:bg-white/[0.06] text-sm">Cancelar</button>
              <button onClick={guardar} disabled={guardando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-sm disabled:opacity-50">
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editId ? "Actualizar" : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <EntityFolderDrawer
        open={!!expedienteVeh}
        onClose={() => setExpedienteVeh(null)}
        entityType="vehiculo"
        entityId={expedienteVeh?.id || ""}
        entityName={expedienteVeh?.nombre}
      />

      <DeleteModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: "", name: "" })}
        onConfirm={confirmDelete}
        count={1}
        itemLabel="Vehículo"
      />
    </div>
  );
}
