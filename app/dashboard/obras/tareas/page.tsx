"use client";
import { clientLogger } from "@/lib/client-logger";
import DeleteModal from "@/components/DeleteModal";
import { useDeletePermission } from "@/lib/use-delete-permission";
import { backupAndDelete } from "@/lib/backup-delete";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Plus, Edit2, Trash2, X, Save, Loader2,
  ListChecks, CheckCircle2, Circle, Clock, AlertTriangle,
  Filter, Search
} from "lucide-react";

interface Obra {
  id: number;
  nombre: string;
}

interface Tarea {
  id: string;
  obra_id: number;
  obra_nombre: string;
  titulo: string;
  responsable: string;
  fecha_limite: string;
  prioridad: string;
  status: string;
  completed_at: string | null;
  created_at: string;
}

const PRIORIDAD_OPTIONS = [
  { value: "baja", label: "Baja", color: "bg-slate-500/20 text-[#7f93b0]", icon: Circle },
  { value: "normal", label: "Normal", color: "bg-aria-primary-light text-aria-accent", icon: Clock },
  { value: "alta", label: "Alta", color: "bg-amber-500/20 text-amber-400", icon: AlertTriangle },
  { value: "urgente", label: "Urgente", color: "bg-red-500/20 text-red-400", icon: AlertTriangle },
];

const STATUS_OPTIONS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_progreso", label: "En Progreso" },
  { value: "completada", label: "Completada" },
];

const EMPTY_FORM = { titulo: "", responsable: "", fecha_limite: "", prioridad: "normal", obra_id: "", status: "pendiente" };

export default function TareasPage() {
  const log = clientLogger("TAREAS");
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const { userEmail, canDelete } = useDeletePermission();
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ ...EMPTY_FORM });
  const [editId, setEditId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
  const [filtroObra, setFiltroObra] = useState<string>("");
  const [filtroStatus, setFiltroStatus] = useState<string>("");
  const [busqueda, setBusqueda] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    cargarObras();
    cargarTareas();
  }, []);

  const cargarObras = async () => {
    const { data } = await supabase.from("centros_trabajo").select("id,nombre").order("nombre");
    if (data) setObras(data);
  };

  const cargarTareas = async () => {
    const { data, error } = await supabase
      .from("tareas_obra")
      .select("*")
      .order("fecha_limite", { ascending: true });
    if (error) log.error("Error loading tareas:", (error as {message?: string})?.message || "Unknown error");
    if (data) setTareas(data);
    setLoading(false);
  };

  const msg = (tipo: "success" | "error", texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 3000);
  };

  const validar = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.titulo?.trim()) {
      errors.titulo = "El título es obligatorio";
    }
    if (!form.obra_id) {
      errors.obra_id = "Selecciona una obra";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const guardar = async () => {
    if (!validar()) { msg("error", "Por favor corrige los errores en el formulario"); return; }
    setGuardando(true);

    const obra = obras.find(o => o.id === Number(form.obra_id));
    const payload: Record<string, unknown> = {
      titulo: form.titulo.trim(),
      responsable: form.responsable?.trim() || null,
      fecha_limite: form.fecha_limite || null,
      prioridad: form.prioridad || "normal",
      obra_id: Number(form.obra_id),
      obra_nombre: obra?.nombre || "",
    };

    if (editId) {
      payload.status = form.status || "pendiente";
      if (form.status === "completada") {
        payload.completed_at = new Date().toISOString();
      }
      const { error } = await supabase.from("tareas_obra").update(payload).eq("id", editId);
      if (error) { msg("error", ((error as {message?: string})?.message) || "Error al actualizar"); }
      else { msg("success", "Tarea actualizada"); setShowForm(false); setEditId(null); cargarTareas(); }
    } else {
      payload.status = "pendiente";
      const { error } = await supabase.from("tareas_obra").insert(payload);
      if (error) { msg("error", ((error as {message?: string})?.message) || "Error al crear"); }
      else { msg("success", "Tarea creada"); setShowForm(false); cargarTareas(); }
    }
    setGuardando(false);
  };

  const toggleStatus = async (tarea: Tarea) => {
    const newStatus = tarea.status === "completada" ? "pendiente" : "completada";
    const { error } = await supabase.from("tareas_obra").update({
      status: newStatus,
      completed_at: newStatus === "completada" ? new Date().toISOString() : null,
    }).eq("id", tarea.id);
    if (error) { msg("error", ((error as {message?: string})?.message) || "Error"); return; }
    cargarTareas();
  };

  const editar = (t: Tarea) => {
    setEditId(t.id);
    setForm({
      titulo: t.titulo || "",
      responsable: t.responsable || "",
      fecha_limite: t.fecha_limite || "",
      prioridad: t.prioridad || "normal",
      obra_id: String(t.obra_id),
      status: t.status || "pendiente",
    });
    setShowForm(true);
  };

  const eliminar = (id: string, titulo: string) => {
    setDeleteModal({ open: true, id, name: titulo });
  };

  const confirmDelete = async () => {
    try {
      await backupAndDelete({ table: "tareas_obra", id: deleteModal.id, userEmail });
      msg("success", "Tarea eliminada");
    } catch (e: unknown) {
      msg("error", (e as {message?: string})?.message || "Error al eliminar");
    }
    setDeleteModal({ open: false, id: "", name: "" });
    cargarTareas();
  };

  const getPrioridadStyle = (p: string) => PRIORIDAD_OPTIONS.find(o => o.value === p)?.color || "bg-slate-500/20 text-[#7f93b0]";
  const getPrioridadLabel = (p: string) => PRIORIDAD_OPTIONS.find(o => o.value === p)?.label || p;

  const isVencida = (fecha: string, status: string) => {
    if (!fecha || status === "completada") return false;
    return new Date(fecha) < new Date(new Date().toDateString());
  };

  const tareasFiltradas = tareas.filter(t => {
    if (filtroObra && String(t.obra_id) !== filtroObra) return false;
    if (filtroStatus && t.status !== filtroStatus) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      return (
        t.titulo?.toLowerCase().includes(q) ||
        t.responsable?.toLowerCase().includes(q) ||
        t.obra_nombre?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendientes = tareas.filter(t => t.status !== "completada").length;
  const completadas = tareas.filter(t => t.status === "completada").length;
  const vencidas = tareas.filter(t => isVencida(t.fecha_limite, t.status)).length;

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs text-[#7f93b0] mb-1">{label}</label>
      {children}
    </div>
  );

  const inputClass = "w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:border-aria-primary focus:outline-none placeholder-slate-600";

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/obras" className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.06] text-[#7f93b0] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Tareas de Obra</h1>
            <p className="text-xs text-[#7f93b0]">{tareas.length} tareas registradas</p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY_FORM }); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
        >
          <Plus className="w-4 h-4" /> Nueva Tarea
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4 flex-shrink-0">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
          <p className="text-amber-400 text-2xl font-bold">{pendientes}</p>
          <p className="text-amber-400/70 text-xs">Pendientes</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
          <p className="text-emerald-400 text-2xl font-bold">{completadas}</p>
          <p className="text-emerald-400/70 text-xs">Completadas</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <p className="text-red-400 text-2xl font-bold">{vencidas}</p>
          <p className="text-red-400/70 text-xs">Vencidas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6080]" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar tarea, responsable u obra..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:border-aria-primary focus:outline-none placeholder-slate-600"
          />
        </div>
        <select
          value={filtroObra}
          onChange={e => setFiltroObra(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:border-aria-primary focus:outline-none"
        >
          <option value="">Todas las obras</option>
          {obras.map(o => (
            <option key={o.id} value={String(o.id)}>{o.nombre}</option>
          ))}
        </select>
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:border-aria-primary focus:outline-none"
        >
          <option value="">Todos los estados</option>
          {STATUS_OPTIONS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {mensaje && (
        <div className={`mb-3 px-4 py-2 rounded-lg text-sm flex-shrink-0 ${mensaje.tipo === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
          {mensaje.texto}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-y-auto rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <table className="w-full">
          <thead className="sticky top-0 bg-[rgba(4,8,16,0.98)]  z-10">
            <tr className="border-b border-white/[0.08]">
              <th className="w-10 p-3"></th>
              <th className="text-left p-3 text-[#7f93b0] font-medium text-xs">Tarea</th>
              <th className="text-left p-3 text-[#7f93b0] font-medium text-xs">Obra</th>
              <th className="text-left p-3 text-[#7f93b0] font-medium text-xs">Responsable</th>
              <th className="text-center p-3 text-[#7f93b0] font-medium text-xs">Prioridad</th>
              <th className="text-center p-3 text-[#7f93b0] font-medium text-xs">Vencimiento</th>
              <th className="text-center p-3 text-[#7f93b0] font-medium text-xs">Acc</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-aria-accent" />
                </td>
              </tr>
            ) : tareasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center">
                  <ListChecks className="w-10 h-10 text-[#4a6080] mx-auto mb-2" />
                  <p className="text-[#4a6080] text-sm">
                    {tareas.length === 0 ? "No hay tareas registradas" : "Sin resultados para los filtros"}
                  </p>
                </td>
              </tr>
            ) : tareasFiltradas.map(t => {
              const vencida = isVencida(t.fecha_limite, t.status);
              return (
                <tr key={t.id} className={`border-b border-white/[0.05] hover:bg-white/[0.02] ${t.status === "completada" ? "opacity-60" : ""}`}>
                  <td className="p-3 text-center">
                    <button onClick={() => toggleStatus(t)} className="transition-colors">
                      {t.status === "completada" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-[#4a6080] hover:text-emerald-400" />
                      )}
                    </button>
                  </td>
                  <td className="p-3">
                    <p className={`text-sm font-medium ${t.status === "completada" ? "line-through text-[#4a6080]" : "text-white"}`}>
                      {t.titulo}
                    </p>
                  </td>
                  <td className="p-3 text-[#7f93b0] text-sm">{t.obra_nombre || "—"}</td>
                  <td className="p-3 text-[#7f93b0] text-sm">{t.responsable || "—"}</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getPrioridadStyle(t.prioridad)}`}>
                      {getPrioridadLabel(t.prioridad)}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {t.fecha_limite ? (
                      <span className={`text-xs ${vencida ? "text-red-400 font-medium" : "text-[#7f93b0]"}`}>
                        {vencida && "⚠ "}
                        {new Date(t.fecha_limite + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                      </span>
                    ) : (
                      <span className="text-xs text-[#4a6080]">—</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => editar(t)} className="p-1.5 rounded-lg bg-aria-primary-light text-aria-accent hover:bg-aria-primary-hover/30">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {canDelete && (
                        <button onClick={() => eliminar(t.id, t.titulo)} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60  z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-[#0f1729] border border-white/[0.08] rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
              <h2 className="text-lg font-bold text-white">{editId ? "Editar Tarea" : "Nueva Tarea"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#7f93b0]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
              <Field label="Obra *">
                <select
                  value={form.obra_id}
                  onChange={e => setForm({ ...form, obra_id: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Seleccionar obra...</option>
                  {obras.map(o => (
                    <option key={o.id} value={String(o.id)}>{o.nombre}</option>
                  ))}
                </select>
                {formErrors.obra_id && <p className="text-red-400 text-xs mt-1">{formErrors.obra_id}</p>}
              </Field>

              <Field label="Título de la tarea *">
                <input
                  type="text"
                  value={form.titulo}
                  onChange={e => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ej: Revisar planos de cimentación"
                  className={inputClass}
                />
                {formErrors.titulo && <p className="text-red-400 text-xs mt-1">{formErrors.titulo}</p>}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Responsable">
                  <input
                    type="text"
                    value={form.responsable}
                    onChange={e => setForm({ ...form, responsable: e.target.value })}
                    placeholder="Nombre del responsable"
                    className={inputClass}
                  />
                </Field>
                <Field label="Fecha límite">
                  <input
                    type="date"
                    value={form.fecha_limite}
                    onChange={e => setForm({ ...form, fecha_limite: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Prioridad">
                  <select
                    value={form.prioridad}
                    onChange={e => setForm({ ...form, prioridad: e.target.value })}
                    className={inputClass}
                  >
                    {PRIORIDAD_OPTIONS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </Field>
                {editId && (
                  <Field label="Estado">
                    <select
                      value={form.status}
                      onChange={e => setForm({ ...form, status: e.target.value })}
                      className={inputClass}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-white/[0.08]">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-white/[0.04] text-[#7f93b0] hover:bg-white/[0.06] text-sm">
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm disabled:opacity-50"
              >
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editId ? "Actualizar" : "Crear Tarea"}
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: "", name: "" })}
        onConfirm={confirmDelete}
        count={1}
        itemLabel="Tarea"
      />
    </div>
  );
}
