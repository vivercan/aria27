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
  foto_url: string | null;
  respuesta_ultima?: string | null;
  respuesta_ultima_at?: string | null;
  motivo_bloqueo?: string | null;
  completada_at?: string | null;
  asignado_por_email?: string | null;
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
  foto_url: "",
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
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [photoModal, setPhotoModal] = useState<string | null>(null);
  const ROWS_PER_PAGE = 12;
  const ROTATION_MS = 10000;
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
      foto_url: form.foto_url || null,
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
      foto_url: t.foto_url || "",
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

  const totalPages = Math.max(1, Math.ceil(filtradas.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages - 1);
  const visibleRows = filtradas.slice(currentPage * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE + ROWS_PER_PAGE);

  useEffect(() => { setPage(0); }, [search, filtroEstatus]);

  useEffect(() => {
    if (paused || totalPages <= 1) return;
    const id = setInterval(() => {
      setPage(p => (p + 1) % totalPages);
    }, ROTATION_MS);
    return () => clearInterval(id);
  }, [paused, totalPages]);

  const subirFoto = async (file: File): Promise<string | null> => {
    try {
      const path = `tareas/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("expedientes").upload(path, file, { upsert: false });
      if (error) { alert("Error al subir foto: " + error.message); return null; }
      const { data } = supabase.storage.from("expedientes").getPublicUrl(path);
      return data.publicUrl;
    } catch (e) {
      alert("Error: " + (e as Error).message);
      return null;
    }
  };

  const stats = {
    total: tareas.length,
    pendientes: tareas.filter(t => t.estatus === "PENDIENTE").length,
    enProgreso: tareas.filter(t => t.estatus === "EN_PROGRESO").length,
    completadas: tareas.filter(t => t.estatus === "COMPLETADA").length,
    vencidas: tareas.filter(t => t.estatus !== "COMPLETADA" && t.estatus !== "CANCELADA" && t.fecha_compromiso && new Date(t.fecha_compromiso) < new Date()).length,
  };

  return (
    <div className="aria-page-canon">
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
        <div
          className="rounded-xl border border-white/[0.06] bg-[#040810] overflow-hidden font-mono"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* HEADER de la tabla estilo aeropuerto */}
          <div className="grid grid-cols-[44px_1.2fr_2fr_1fr_110px_140px_120px_100px] gap-2 px-3 py-2 bg-[#0a1628] border-b border-white/[0.08] text-[10px] font-bold uppercase tracking-wider text-[#7f93b0]">
            <div></div>
            <div>Asignado</div>
            <div>Tarea / Obra</div>
            <div>Vence</div>
            <div className="text-center">Avance</div>
            <div className="text-center">Estatus</div>
            <div>Ultima resp.</div>
            <div className="text-right">Acciones</div>
          </div>

          {/* FILAS */}
          <div className="divide-y divide-white/[0.05]">
            {visibleRows.map((t, i) => {
              const vencida = t.estatus !== "COMPLETADA" && t.estatus !== "CANCELADA" && t.fecha_compromiso && new Date(t.fecha_compromiso) < new Date();
              const fecha = t.fecha_compromiso ? new Date(t.fecha_compromiso) : null;
              const fechaTxt = fecha ? fecha.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }).toUpperCase() : "—";
              const respTxt = t.respuesta_ultima ? (t.respuesta_ultima.length > 18 ? t.respuesta_ultima.slice(0, 18) + "…" : t.respuesta_ultima) : "—";
              return (
                <div
                  key={t.id}
                  className={`grid grid-cols-[44px_1.2fr_2fr_1fr_110px_140px_120px_100px] gap-2 px-3 py-2 items-center text-xs hover:bg-white/[0.03] transition-colors ${i % 2 === 0 ? "bg-[#040810]" : "bg-[#060d18]"} ${vencida ? "border-l-2 border-rose-500/60" : "border-l-2 border-transparent"}`}
                >
                  {/* THUMB FOTO */}
                  <div>
                    {t.foto_url ? (
                      <button onClick={() => setPhotoModal(t.foto_url!)} className="w-9 h-9 rounded overflow-hidden border border-white/[0.08] hover:border-aria-accent block">
                        <img src={t.foto_url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ) : (
                      <div className="w-9 h-9 rounded border border-dashed border-white/[0.06] flex items-center justify-center text-[#4a6080]"><User className="w-4 h-4" /></div>
                    )}
                  </div>

                  {/* ASIGNADO */}
                  <div className="truncate text-[#dee7f4] font-medium" title={t.asignado_nombre}>{t.asignado_nombre || "—"}</div>

                  {/* TAREA + OBRA */}
                  <div className="min-w-0">
                    <div className="text-white truncate flex items-center gap-1.5" title={t.titulo}>
                      <Flag className={`w-3 h-3 flex-shrink-0 ${colorPrioridad(t.prioridad)}`} />
                      {t.titulo}
                    </div>
                    {t.obra && <div className="text-[10px] text-[#4a6080] truncate" title={t.obra}>{t.obra}</div>}
                  </div>

                  {/* VENCE */}
                  <div className={`tabular-nums ${vencida ? "text-rose-400 font-bold" : "text-[#dee7f4]"}`}>{fechaTxt}{vencida && <div className="text-[9px] text-rose-500/80">VENCIDA</div>}</div>

                  {/* AVANCE */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-aria-primary" style={{ width: `${t.avance}%` }} />
                    </div>
                    <span className="text-[10px] tabular-nums text-white font-semibold w-7 text-right">{t.avance}%</span>
                  </div>

                  {/* ESTATUS */}
                  <div className="text-center">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${colorEstatus(t.estatus)}`}>{t.estatus.replace("_", " ")}</span>
                  </div>

                  {/* ULTIMA RESPUESTA WA */}
                  <div className="text-[10px] text-[#7f93b0] truncate" title={t.respuesta_ultima || ""}>{respTxt}</div>

                  {/* ACCIONES */}
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => abrirEditar(t)} title="Editar" className="p-1.5 rounded bg-white/[0.04] hover:bg-white/[0.10] text-aria-accent"><Edit2 className="w-3.5 h-3.5" /></button>
                    {t.estatus !== "COMPLETADA" && (
                      <button onClick={() => cambiarAvance(t.id, 100)} title="Completar" className="p-1.5 rounded bg-emerald-600/70 hover:bg-emerald-600 text-white"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                    )}
                    <button onClick={() => eliminar(t.id)} title="Eliminar" className="p-1.5 rounded bg-rose-600/70 hover:bg-rose-600 text-white"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FOOTER paginacion estilo aeropuerto */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 bg-[#0a1628] border-t border-white/[0.08] text-[10px] text-[#7f93b0]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-aria-accent">{paused ? "PAUSADO" : "AUTO"}</span>
                <span>·</span>
                <span>Pasa el cursor por encima para pausar la rotacion</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((currentPage - 1 + totalPages) % totalPages)} className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-white">‹</button>
                <span className="tabular-nums font-bold">PAGINA {currentPage + 1} / {totalPages}</span>
                <button onClick={() => setPage((currentPage + 1) % totalPages)} className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-white">›</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL preview de foto */}
      {photoModal && (
        <div onClick={() => setPhotoModal(null)} className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6 cursor-zoom-out">
          <img src={photoModal} alt="Foto tarea" className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl" />
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0a1628] border border-white/[0.08] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{position:'relative', zIndex: 51}}>
            <div className="sticky top-0 bg-[#0a1628] border-b border-white/[0.08] p-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{editando ? "Editar tarea" : "Nueva tarea"}</h2>
              <button onClick={() => { setShowForm(false); setEditando(null); setForm(EMPTY_FORM); }} className="p-1 rounded hover:bg-white/[0.06]">
                <X className="w-5 h-5 text-[#7f93b0]" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm text-[#7f93b0] mb-1 block">Título *</label>
                <input type="text" value={form.titulo} onChange={e => setForm((prev: any) => ({...prev, titulo: e.target.value }))}
                  className={`w-full px-3 py-2 bg-[#0c1d38] border rounded-lg text-white focus:outline-none focus:border-aria-primary ${formErrors.titulo ? "border-red-500/50" : "border-white/[0.08]"}`} />
                {formErrors.titulo && <p className="text-red-400 text-xs mt-1">{formErrors.titulo}</p>}
              </div>
              <div>
                <label className="text-sm text-[#7f93b0] mb-1 block">Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm((prev: any) => ({...prev, descripcion: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-aria-primary" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#7f93b0] mb-1 block">Asignado a *</label>
                  <select size={1} value={form.asignado_id} onChange={e => setForm((prev: any) => ({...prev, asignado_id: e.target.value }))}
                    className={`w-full px-3 py-2 bg-[#0c1d38] border rounded-lg text-white focus:outline-none focus:border-aria-primary ${formErrors.asignado_id ? "border-red-500/50" : "border-white/[0.08]"}`}>
                    <option value="">Seleccionar...</option>
                    {empleados.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                  </select>
                  {formErrors.asignado_id && <p className="text-red-400 text-xs mt-1">{formErrors.asignado_id}</p>}
                </div>
                <div>
                  <label className="text-sm text-[#7f93b0] mb-1 block">Obra (opcional)</label>
                  <input type="text" value={form.obra} onChange={e => setForm((prev: any) => ({...prev, obra: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-aria-primary" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#7f93b0] mb-1 block">Fecha compromiso *</label>
                  <input type="date" value={form.fecha_compromiso} onChange={e => setForm((prev: any) => ({...prev, fecha_compromiso: e.target.value }))}
                    className={`w-full px-3 py-2 bg-[#0c1d38] border rounded-lg text-white focus:outline-none focus:border-aria-primary ${formErrors.fecha_compromiso ? "border-red-500/50" : "border-white/[0.08]"}`} />
                  {formErrors.fecha_compromiso && <p className="text-red-400 text-xs mt-1">{formErrors.fecha_compromiso}</p>}
                </div>
                <div>
                  <label className="text-sm text-[#7f93b0] mb-1 block">Prioridad</label>
                  <select value={form.prioridad} onChange={e => setForm((prev: any) => ({...prev, prioridad: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-aria-primary">
                    {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#7f93b0] mb-1 block">Avance ({form.avance}%)</label>
                  <input type="range" min="0" max="100" step="5" value={form.avance}
                    onChange={e => setForm((prev: any) => ({...prev, avance: Number(e.target.value) }))}
                    className="w-full accent-fuchsia-500" />
                </div>
                <div>
                  <label className="text-sm text-[#7f93b0] mb-1 block">Estatus</label>
                  <select value={form.estatus} onChange={e => setForm((prev: any) => ({...prev, estatus: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#0c1d38] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-aria-primary">
                    {ESTATUS.map(e => <option key={e} value={e}>{e.replace("_", " ")}</option>)}
                  </select>
                </div>
              </div>

              {/* FOTO de la tarea (opcional, soporta foto compartida desde WhatsApp) */}
              <div>
                <label className="text-sm text-[#7f93b0] mb-1 block">Foto (opcional)</label>
                <div className="flex items-start gap-3">
                  {form.foto_url ? (
                    <div className="relative">
                      <img src={form.foto_url} alt="Foto" className="w-24 h-24 object-cover rounded-lg border border-white/[0.08]" />
                      <button type="button" onClick={() => setForm((prev: any) => ({...prev, foto_url: ""}))} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-xs">×</button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-white/[0.08] flex items-center justify-center text-[#4a6080] text-xs">Sin foto</div>
                  )}
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const url = await subirFoto(f);
                        if (url) setForm((prev: any) => ({...prev, foto_url: url}));
                      }}
                      className="text-xs text-[#dee7f4] file:mr-2 file:px-3 file:py-1.5 file:rounded file:border-0 file:bg-aria-primary/30 file:text-aria-accent file:font-medium hover:file:bg-aria-primary/50"
                    />
                    <p className="text-[10px] text-[#4a6080]">Tambien puedes pegar la URL si la foto vino de WhatsApp:</p>
                    <input
                      type="text"
                      value={form.foto_url}
                      onChange={(e) => setForm((prev: any) => ({...prev, foto_url: e.target.value}))}
                      placeholder="https://... (URL de la foto)"
                      className="w-full px-2 py-1.5 bg-[#0c1d38] border border-white/[0.08] rounded text-[11px] text-white focus:outline-none focus:border-aria-primary"
                    />
                  </div>
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
