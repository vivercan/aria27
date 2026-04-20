"use client";
import { clientLogger } from "@/lib/client-logger";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Plus, Edit2, X, Save, Loader2, ClipboardList,
  User, Calendar, TrendingUp, Flag, Search, Trash2, CheckCircle2
} from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import AriaBackButton from "@/components/AriaBackButton";

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string;
  asignado_id: string;
  asignado_nombre: string;
  asignado_por: string;
  obra: string;
  avance: number;
  fecha_compromiso: string;
  estatus: string;
  prioridad: string;
  created_at: string;
  updated_at: string;
}

interface Empleado { id: string; full_name: string; }

const EMPTY_FORM = {
  titulo: "",
  descripcion: "",
  asignado_id: "",
  asignado_nombre: "",
  obra: "",
  avance: 0,
  fecha_compromiso: "",
  estatus: "PENDIENTE",
  prioridad: "MEDIA",
};

const ESTATUS = ["PENDIENTE", "EN_PROGRESO", "COMPLETADA", "CANCELADA"];
const PRIORIDADES = ["BAJA", "MEDIA", "ALTA", "URGENTE"];

function colorEstatus(e: string) {
  switch (e) {
    case "PENDIENTE": return "bg-slate-500/20 text-[#c9d8ed] border-white/[0.1]/40";
    case "EN_PROGRESO": return "bg-aria-primary-light text-aria-accent border-aria-primary/40";
    case "COMPLETADA": return "bg-emerald-500/20 text-aria-accent border-emerald-500/40";
    case "CANCELADA": return "bg-rose-500/20 text-rose-300 border-rose-500/40";
    default: return "bg-slate-500/20 text-[#c9d8ed] border-white/[0.1]/40";
  }
}

function colorPrioridad(p: string) {
  switch (p) {
    case "BAJA": return "text-[#7f93b0]";
    case "MEDIA": return "text-amber-400";
    case "ALTA": return "text-orange-400";
    case "URGENTE": return "text-rose-400";
    default: return "text-[#7f93b0]";
  }
}

export default function TareasTalentoPage() {
  const log = clientLogger("TAREAS");
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [filtroEstatus, setFiltroEstatus] = useState("TODAS");
  const [userEmail, setUserEmail] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [confirmState, setConfirmState] = useState<{open: boolean; id: string}>({open: false, id: ""});
  const closeConfirm = () => setConfirmState({open: false, id: ""});
  const { msg, flash, clear } = useFlashMessage();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserEmail(localStorage.getItem("userEmail") || "");
    }
    cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    const { data: emps } = await supabase
      .from("employees")
      .select("id, full_name")
      .order("full_name");
    setEmpleados(emps || []);

    const { data, error } = await supabase
      .from("tareas_asignadas")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) log.error("tareas_asignadas error:", { error: error });
    setTareas(data || []);
    setLoading(false);
  }

  const validar = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.titulo?.trim()) errors.titulo = "El título es obligatorio";
    if (!form.asignado_id?.trim()) errors.asignado_id = "Debe asignar a un colaborador";
    if (!form.fecha_compromiso?.trim()) errors.fecha_compromiso = "La fecha compromiso es obligatoria";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  async function guardar() {
    if (!validar()) return;
    setGuardando(true);
    const emp = empleados.find(e => e.id === form.asignado_id);
    const payload = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim(),
      asignado_id: form.asignado_id,
      asignado_nombre: emp?.full_name || "",
      obra: form.obra.trim(),
      avance: Number(form.avance) || 0,
      fecha_compromiso: form.fecha_compromiso,
      estatus: form.estatus,
      prioridad: form.prioridad,
      asignado_por: userEmail || "sistema",
    };
    let error;
    const esNueva = !editando;
    if (editando) {
      ({ error } = await supabase.from("tareas_asignadas").update(payload).eq("id", editando));
    } else {
      ({ error } = await supabase.from("tareas_asignadas").insert(payload));
    }
    setGuardando(false);
    if (error) { flash("err", "Error: " + (error as {message?: string})?.message || "Error desconocido"); return; }

    // Notificar al colaborador asignado solo en creación nueva
    if (esNueva && form.asignado_id) {
      fetch("/api/tareas/notificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asignado_id: form.asignado_id,
          titulo: form.titulo,
          descripcion: form.descripcion,
          fecha_compromiso: form.fecha_compromiso,
          obra: form.obra,
          asignado_por: userEmail || "Administrador",
        }),
      }).catch(() => { /* silent — no bloquear UI por notificación */ });
    }

    setShowForm(false);
    setEditando(null);
    setForm(EMPTY_FORM);
    cargar();
  }

  async function eliminar(id: string) {
    setConfirmState({open: true, id});
  }

  async function confirmarEliminar() {
    const { error } = await supabase.from("tareas_asignadas").delete().eq("id", confirmState.id);
    closeConfirm();
    if (error) { flash("err", "Error: " + (error as {message?: string})?.message || "Error desconocido"); return; }
    cargar();
  }

  async function cambiarAvance(id: string, nuevoAvance: number) {
    const estatus = nuevoAvance >= 100 ? "COMPLETADA" : nuevoAvance > 0 ? "EN_PROGRESO" : "PENDIENTE";
    await supabase.from("tareas_asignadas")
      .update({ avance: nuevoAvance, estatus })
      .eq("id", id);
    cargar();
  }

  function abrirEditar(t: Tarea) {
    setEditando(t.id);
    setForm({
      titulo: t.titulo,
      descripcion: t.descripcion || "",
      asignado_id: t.asignado_id,
      asignado_nombre: t.asignado_nombre,
      obra: t.obra || "",
      avance: t.avance,
      fecha_compromiso: t.fecha_compromiso,
      estatus: t.estatus,
      prioridad: t.prioridad,
    });
    setShowForm(true);
  }

  const filtradas = tareas.filter(t => {
    const s = search.toLowerCase();
    const matchSearch = !s || t.titulo.toLowerCase().includes(s) ||
      t.asignado_nombre?.toLowerCase().includes(s) ||
      t.obra?.toLowerCase().includes(s);
    const matchEstatus = filtroEstatus === "TODAS" || t.estatus === filtroEstatus;
    return matchSearch && matchEstatus;
  });

  const stats = {
    total: tareas.length,
    pendientes: tareas.filter(t => t.estatus === "PENDIENTE").length,
    enProgreso: tareas.filter(t => t.estatus === "EN_PROGRESO").length,
    completadas: tareas.filter(t => t.estatus === "COMPLETADA").length,
    vencidas: tareas.filter(t => t.estatus !== "COMPLETADA" && t.estatus !== "CANCELADA" && t.fecha_compromiso && new Date(t.fecha_compromiso) < new Date()).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <AriaBackButton href="/dashboard/talento" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-aria-accent" />
            Tareas Asignadas
          </h1>
          <p className="text-[#7f93b0] mt-1">Asignación, seguimiento y avance de tareas por colaborador.</p>
        </div>
        <button
          onClick={() => { setEditando(null); setForm(EMPTY_FORM); setShowForm(true); }}
          className="px-4 py-2 bg-[#1E3E7A] hover:bg-[#2A4A8E] text-white font-medium rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.25)] flex items-center gap-2 font-medium"
        >
          <Plus className="w-5 h-5" /> Nueva tarea
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="rounded-xl bg-[#0c1d38]/50 border border-white/[0.05] p-4">
          <div className="text-xs text-[#7f93b0] uppercase">Total</div>
          <div className="text-2xl font-bold text-white">{stats.total}</div>
        </div>
        <div className="rounded-xl bg-[#0c1d38]/50 border border-white/[0.05] p-4">
          <div className="text-xs text-[#7f93b0] uppercase">Pendientes</div>
          <div className="text-2xl font-bold text-[#c9d8ed]">{stats.pendientes}</div>
        </div>
        <div className="rounded-xl bg-[#0c1d38]/50 border border-white/[0.05] p-4">
          <div className="text-xs text-[#7f93b0] uppercase">En progreso</div>
          <div className="text-2xl font-bold text-white">{stats.enProgreso}</div>
        </div>
        <div className="rounded-xl bg-[#0c1d38]/50 border border-white/[0.05] p-4">
          <div className="text-xs text-[#7f93b0] uppercase">Completadas</div>
          <div className="text-2xl font-bold text-white">{stats.completadas}</div>
        </div>
        <div className="rounded-xl bg-[#0c1d38]/50 border border-white/[0.05] p-4">
          <div className="text-xs text-[#7f93b0] uppercase">Vencidas</div>
          <div className="text-2xl font-bold text-rose-300">{stats.vencidas}</div>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7f93b0]" />
          <input
            type="text"
            placeholder="Buscar por título, colaborador u obra..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0c1d38]/50 border border-white/[0.08] rounded-lg text-white placeholder-[#4a6080] focus:outline-none focus:border-aria-primary"
          />
        </div>
        <select
          value={filtroEstatus}
          onChange={e => setFiltroEstatus(e.target.value)}
          className="px-4 py-2 bg-[#0c1d38]/50 border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-aria-primary"
        >
          <option value="TODAS">Todas</option>
          {ESTATUS.map(e => <option key={e} value={e}>{e.replace("_", " ")}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-aria-accent" /></div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-12 text-[#7f93b0]">No hay tareas registradas.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtradas.map(t => {
            const vencida = t.estatus !== "COMPLETADA" && t.estatus !== "CANCELADA" && t.fecha_compromiso && new Date(t.fecha_compromiso) < new Date();
            return (
              <div key={t.id} className={`rounded-xl bg-[#0c1d38]/50 border p-5 ${vencida ? "border-rose-500/50" : "border-white/[0.05]"}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white text-lg">{t.titulo}</h3>
                      <Flag className={`w-4 h-4 ${colorPrioridad(t.prioridad)}`} />
                    </div>
                    {t.descripcion && <p className="text-sm text-[#7f93b0]">{t.descripcion}</p>}
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${colorEstatus(t.estatus)}`}>
                    {t.estatus.replace("_", " ")}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-[#c9d8ed] mb-4">
                  <div className="flex items-center gap-2"><User className="w-4 h-4 text-[#4a6080]" /> {t.asignado_nombre || "—"}</div>
                  {t.obra && <div className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-[#4a6080]" /> {t.obra}</div>}
                  <div className="flex items-center gap-2">
                    <Calendar className={`w-4 h-4 ${vencida ? "text-rose-400" : "text-[#4a6080]"}`} />
                    <span className={vencida ? "text-rose-400 font-semibold" : ""}>
                      {t.fecha_compromiso ? new Date(t.fecha_compromiso).toLocaleDateString("es-MX") : "—"}
                      {vencida && " (VENCIDA)"}
                    </span>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-[#7f93b0] mb-1">
                    <span>Avance</span>
                    <span className="font-semibold text-white">{t.avance}%</span>
                  </div>
                  <div className="w-full bg-white/[0.05] rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-aria-primary h-2 rounded-full transition-all"
                      style={{ width: `${t.avance}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={t.avance}
                    onChange={e => cambiarAvance(t.id, Number(e.target.value))}
                    className="w-full mt-2 accent-fuchsia-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => abrirEditar(t)}
                    className="flex-1 px-3 py-1.5 text-sm bg-white/[0.05] hover:bg-[#0f2448] text-white rounded-lg flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" /> Editar
                  </button>
                  {t.estatus !== "COMPLETADA" && (
                    <button
                      onClick={() => cambiarAvance(t.id, 100)}
                      className="px-3 py-1.5 text-sm bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Completar
                    </button>
                  )}
                  <button
                    onClick={() => eliminar(t.id)}
                    className="px-3 py-1.5 text-sm bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0a1628] border border-white/[0.08] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#0a1628] border-b border-white/[0.08] p-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{editando ? "Editar tarea" : "Nueva tarea"}</h2>
              <button onClick={() => { setShowForm(false); setEditando(null); setForm(EMPTY_FORM); }} className="p-1 rounded hover:bg-white/[0.06]">
                <X className="w-5 h-5 text-[#7f93b0]" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm text-[#7f93b0] mb-1 block">Título *</label>
                <input type="text" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })}
                  className={`w-full px-3 py-2 bg-[#0c1d38] border rounded-lg text-white focus:outline-none focus:border-aria-primary ${formErrors.titulo ? "border-red-500/50" : "border-white/[0.08]"}`} />
                {formErrors.titulo && <p className="text-red-400 text-xs mt-1">{formErrors.titulo}</p>}
              </div>
              <div>
                <label className="text-sm text-[#7f93b0] mb-1 block">Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-aria-primary" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#7f93b0] mb-1 block">Asignado a *</label>
                  <select value={form.asignado_id} onChange={e => setForm({ ...form, asignado_id: e.target.value })}
                    className={`w-full px-3 py-2 bg-[#0c1d38] border rounded-lg text-white focus:outline-none focus:border-aria-primary ${formErrors.asignado_id ? "border-red-500/50" : "border-white/[0.08]"}`}>
                    <option value="">Seleccionar...</option>
                    {empleados.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                  </select>
                  {formErrors.asignado_id && <p className="text-red-400 text-xs mt-1">{formErrors.asignado_id}</p>}
                </div>
                <div>
                  <label className="text-sm text-[#7f93b0] mb-1 block">Obra (opcional)</label>
                  <input type="text" value={form.obra} onChange={e => setForm({ ...form, obra: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-aria-primary" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#7f93b0] mb-1 block">Fecha compromiso *</label>
                  <input type="date" value={form.fecha_compromiso} onChange={e => setForm({ ...form, fecha_compromiso: e.target.value })}
                    className={`w-full px-3 py-2 bg-[#0c1d38] border rounded-lg text-white focus:outline-none focus:border-aria-primary ${formErrors.fecha_compromiso ? "border-red-500/50" : "border-white/[0.08]"}`} />
                  {formErrors.fecha_compromiso && <p className="text-red-400 text-xs mt-1">{formErrors.fecha_compromiso}</p>}
                </div>
                <div>
                  <label className="text-sm text-[#7f93b0] mb-1 block">Prioridad</label>
                  <select value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-aria-primary">
                    {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#7f93b0] mb-1 block">Avance ({form.avance}%)</label>
                  <input type="range" min="0" max="100" step="5" value={form.avance}
                    onChange={e => setForm({ ...form, avance: Number(e.target.value) })}
                    className="w-full accent-fuchsia-500" />
                </div>
                <div>
                  <label className="text-sm text-[#7f93b0] mb-1 block">Estatus</label>
                  <select value={form.estatus} onChange={e => setForm({ ...form, estatus: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-aria-primary">
                    {ESTATUS.map(e => <option key={e} value={e}>{e.replace("_", " ")}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-[#0a1628] border-t border-white/[0.08] p-5 flex justify-end gap-3">
              <button onClick={() => { setShowForm(false); setEditando(null); setForm(EMPTY_FORM); }}
                className="px-4 py-2 bg-[#0f2448] hover:bg-[#162040] text-white rounded-lg">Cancelar</button>
              <button onClick={guardar} disabled={guardando}
                className="px-4 py-2 bg-[#1E3E7A] hover:bg-[#2A4A8E] text-white font-medium rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.25)] flex items-center gap-2 disabled:opacity-50">
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmState.open}
        message="¿Eliminar esta tarea?"
        onConfirm={confirmarEliminar}
        onCancel={closeConfirm}
      />
    </div>
  );
}
