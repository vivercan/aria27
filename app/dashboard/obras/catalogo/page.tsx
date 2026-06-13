"use client";
import ConfirmModal from "@/components/ConfirmModal";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Search, Pencil, Archive, Power, Loader2, FolderOpen, Plus, X, Save, MapPin} from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import CanonPageHeader from "@/components/ui/CanonPageHeader";

/**
 * CATÁLOGO MAESTRO DE OBRAS
 *
 * Decisión funcional (7-Abr-2026):
 *   - La fuente única de obras es la tabla `centros_trabajo`.
 *   - `obras/pipeline` queda como vista kanban + alta operativa (manual/grupo/excel).
 *   - `obras/catalogo` (esta pantalla) queda como maestro tabular: alta rápida,
 *     edición, cierre/archivo/baja, historial básico (created_at + updated_at) y
 *     enlace directo a costeo, gastos, expediente y personal por obra.
 */

interface Obra {
  id: string;
  nombre: string;
  direccion: string | null;
  cliente: string | null;
  estado: string;
  presupuesto: number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  descripcion: string | null;
  latitud?: number | null;
  longitud?: number | null;
  radio_metros?: number | null;
  created_at?: string;
  updated_at?: string;
}

const STATUS = [
  { value: "EN_PLANEACION", label: "En Planeación", color: "bg-aria-primary-light text-aria-accent" },
  { value: "ACTIVA", label: "Activa", color: "bg-emerald-500/20 text-aria-accent" },
  { value: "PAUSADA", label: "Pausada", color: "bg-amber-500/20 text-amber-400" },
  { value: "TERMINADA", label: "Terminada", color: "bg-slate-500/20 text-[#7f93b0]" },
  { value: "CANCELADA", label: "Cancelada", color: "bg-red-500/20 text-red-400" },
];

const FORM_INIT = { nombre: "", direccion: "", cliente: "", estado: "ACTIVA", presupuesto: "", fecha_inicio: "", fecha_fin: "", descripcion: "", latitud: "", longitud: "", radio_metros: "150" };

export default function CatalogoObrasPage() {
  const router = useRouter();
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("ACTIVAS");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...FORM_INIT });
  const [saving, setSaving] = useState(false);
  // EX-3 18-Abr-2026: flash canónico via useFlashMessage
  const { msg, flash } = useFlashMessage(2500);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("centros_trabajo")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setObras(data as Obra[]);
    setLoading(false);
  };

  const [confirmState, setConfirmState] = useState<{ open: boolean; msg: string; onOk: () => void }>({ open: false, msg: "", onOk: () => {} });

  const resetForm = () => { setForm({ ...FORM_INIT }); setEditId(null); setShowForm(false); setFormErrors({}); };

  const validar = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.nombre || !form.nombre.trim()) {
      errors.nombre = "El nombre de la obra es obligatorio";
    }
    if (form.presupuesto && isNaN(parseFloat(form.presupuesto))) {
      errors.presupuesto = "El presupuesto debe ser un número válido";
    }
    if (form.latitud) {
      const v = parseFloat(form.latitud);
      if (isNaN(v) || v < -90 || v > 90) errors.latitud = "Latitud entre -90 y 90";
    }
    if (form.longitud) {
      const v = parseFloat(form.longitud);
      if (isNaN(v) || v < -180 || v > 180) errors.longitud = "Longitud entre -180 y 180";
    }
    if (form.radio_metros) {
      const v = parseInt(form.radio_metros);
      if (isNaN(v) || v < 1 || v > 5000) errors.radio_metros = "Radio entre 1 y 5000 m";
    }
    if ((form.latitud && !form.longitud) || (!form.latitud && form.longitud)) {
      errors.latitud = errors.latitud || "Captura latitud y longitud juntas";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const abrirEdicion = (o: Obra) => {
    setEditId(o.id);
    setForm({
      nombre: o.nombre || "",
      direccion: o.direccion || "",
      cliente: o.cliente || "",
      estado: o.estado || "ACTIVA",
      presupuesto: o.presupuesto ?? "",
      fecha_inicio: o.fecha_inicio || "",
      fecha_fin: o.fecha_fin || "",
      descripcion: o.descripcion || "",
      latitud: o.latitud != null ? String(o.latitud) : "",
      longitud: o.longitud != null ? String(o.longitud) : "",
      radio_metros: o.radio_metros != null ? String(o.radio_metros) : "150",
    });
    setShowForm(true);
  };

  const guardar = async () => {
    if (!validar()) { flash("err", "Por favor corrige los errores en el formulario"); return; }
    setSaving(true);
    const payload: Record<string, unknown> = { ...form };
    if (payload.presupuesto === "" || payload.presupuesto === null) payload.presupuesto = null;
    else payload.presupuesto = parseFloat(String(payload.presupuesto));
    payload.latitud = form.latitud ? parseFloat(form.latitud) : null;
    payload.longitud = form.longitud ? parseFloat(form.longitud) : null;
    payload.radio_metros = form.radio_metros ? parseInt(form.radio_metros) : 150;
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });

    if (editId) {
      const { error } = await supabase.from("centros_trabajo").update(payload).eq("id", editId);
      if (error) { flash("err", "Error: " + (error as {message?: string})?.message || "Error desconocido"); setSaving(false); return; }
      flash("ok", "Obra actualizada");
    } else {
      const { error } = await supabase.from("centros_trabajo").insert(payload);
      if (error) { flash("err", "Error: " + (error as {message?: string})?.message || "Error desconocido"); setSaving(false); return; }
      flash("ok", "Obra creada");
    }
    setSaving(false);
    resetForm();
    cargar();
  };

  const ejecutarCambioEstado = async (obraId: string, nuevoEstado: string, label: string) => {
    const { error } = await supabase.from("centros_trabajo")
      .update({ estado: nuevoEstado })
      .eq("id", obraId);
    if (error) { flash("err", "Error: " + (error as {message?: string})?.message || "Error desconocido"); return; }
    flash("ok", `Obra → ${label}`);
    cargar();
  };

  const cambiarEstado = async (o: Obra, nuevoEstado: string) => {
    const label = STATUS.find(s => s.value === nuevoEstado)?.label || nuevoEstado;
    const archivar = ["TERMINADA", "CANCELADA"].includes(nuevoEstado);
    if (archivar) {
      const aviso =
        `ATENCIÓN — Vas a ARCHIVAR la obra "${o.nombre}" como "${label}". ` +
        `Esta obra puede tener OC activas, cobranza pendiente, personal/nómina activa o requisiciones abiertas. ` +
        `El sistema NO bloquea el archivado, pero quedará registrado en el historial. ` +
        `¿Confirmas que esta obra debe pasar a "${label}"?`;
      setConfirmState({ open: true, msg: aviso, onOk: () => {
        setConfirmState({ open: true, msg: `Confirmación final: archivar "${o.nombre}" como ${label}. ¿Continuar?`, onOk: () => {
          ejecutarCambioEstado(o.id, nuevoEstado, label);
        }});
      }});
    } else {
      setConfirmState({ open: true, msg: `¿Mover la obra "${o.nombre}" al estado "${label}"?`, onOk: () => {
        ejecutarCambioEstado(o.id, nuevoEstado, label);
      }});
    }
  };

  // Filtros
  const filtradas = obras.filter(o => {
    const matchSearch = !search || (o.nombre || "").toLowerCase().includes(search.toLowerCase()) || (o.cliente || "").toLowerCase().includes(search.toLowerCase());
    let matchEstado = true;
    if (filtroEstado === "ACTIVAS") matchEstado = ["EN_PLANEACION", "ACTIVA", "PAUSADA"].includes(o.estado);
    else if (filtroEstado === "ARCHIVADAS") matchEstado = ["TERMINADA", "CANCELADA"].includes(o.estado);
    else if (filtroEstado !== "TODAS") matchEstado = o.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  const stats = {
    total: obras.length,
    activas: obras.filter(o => o.estado === "ACTIVA").length,
    planeacion: obras.filter(o => o.estado === "EN_PLANEACION").length,
    pausadas: obras.filter(o => o.estado === "PAUSADA").length,
    archivadas: obras.filter(o => ["TERMINADA", "CANCELADA"].includes(o.estado)).length,
  };

  const styleFor = (s: string) => STATUS.find(o => o.value === s)?.color || "bg-slate-500/20 text-[#7f93b0]";
  const labelFor = (s: string) => STATUS.find(o => o.value === s)?.label || s;

  return (
    <div className="aria-page-canon h-full flex flex-col overflow-hidden">
      <div className="flex-none p-6 pb-3 border-b border-white/[0.08]">
        <CanonPageHeader
          title="Catalogo Maestro de Obras"
          subtitle="Fuente unica - CRUD + cierre/archivo + historial - enlazado a costeo, gastos, expediente, personal"
          backHref="/dashboard/obras"
          right={
            <>
              <Link href="/dashboard/obras/pipeline" className="px-3 py-2 bg-white/[0.04] hover:bg-white/[0.06] text-[#c9d8ed] rounded-lg text-xs">Vista Pipeline</Link>
              <button
                onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
                className="px-4 py-2 bg-[#1E3E7A] border border-[rgba(130,170,230,0.25)] text-white rounded-full text-sm font-medium hover:bg-[#2A4A8E] flex items-center gap-2"
              >
                {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showForm ? "Cancelar" : "Nueva Obra"}
              </button>
            </>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4">
          {[
            { label: "Total", value: stats.total, color: "text-white" },
            { label: "Activas", value: stats.activas, color: "text-aria-accent" },
            { label: "En planeación", value: stats.planeacion, color: "text-aria-accent" },
            { label: "Pausadas", value: stats.pausadas, color: "text-amber-400" },
            { label: "Archivadas", value: stats.archivadas, color: "text-[#7f93b0]" },
          ].map(s => (
            <div key={s.label} className="p-3 bg-white/[0.04] rounded-lg">
              <p className={`text-xl font-bold ${s.color}`}>{loading ? "…" : s.value}</p>
              <p className="text-xs text-[#7f93b0]">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6080]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o cliente…"
              className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:border-aria-primary/50 focus:outline-none"
            />
          </div>
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm"
          >
            <option value="ACTIVAS">Activas / planeación / pausadas</option>
            <option value="ARCHIVADAS">Archivadas (terminadas+canceladas)</option>
            <option value="TODAS">Todas</option>
            {STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* EX-3 18-Abr-2026: FlashBanner canónico */}
      <FlashBanner msg={msg} className="mx-6 mt-3" />

      {showForm && (
        <div className="flex-none mx-6 mt-3 p-5 bg-gradient-to-br from-[#1E3E7A]/15 to-[#0A2450]/25 border border-[#3A5E9A]/40 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
          <h3 className="text-base font-semibold text-white mb-3">{editId ? "Editar obra" : "Nueva obra"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-[#7f93b0] mb-1 block">Nombre *</label>
              <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm" />
              {formErrors.nombre && <p className="text-red-400 text-xs mt-1">{formErrors.nombre}</p>}
            </div>
            <div>
              <label className="text-xs text-[#7f93b0] mb-1 block">Estado</label>
              <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm">
                {STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-[#7f93b0] mb-1 block">Dirección</label>
              <input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-[#7f93b0] mb-1 block">Cliente</label>
              <input value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-[#7f93b0] mb-1 block">Presupuesto</label>
              <input type="number" min="0" value={form.presupuesto} onChange={e => setForm({ ...form, presupuesto: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm" />
              {formErrors.presupuesto && <p className="text-red-400 text-xs mt-1">{formErrors.presupuesto}</p>}
            </div>
            <div>
              <label className="text-xs text-[#7f93b0] mb-1 block">Fecha inicio</label>
              <input type="date" value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-[#7f93b0] mb-1 block">Fecha fin</label>
              <input type="date" value={form.fecha_fin} onChange={e => setForm({ ...form, fecha_fin: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm" />
            </div>
            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg">
              <div className="md:col-span-12 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-aria-accent" />
                <span className="text-sm font-medium text-white">Geocerca para asistencia</span>
                <a href={`https://www.google.com/maps/search/${encodeURIComponent(form.nombre || form.direccion || "Aguascalientes")}`} target="_blank" rel="noreferrer" className="ml-auto text-xs text-aria-accent underline">Buscar en Google Maps</a>
              </div>
              <div className="md:col-span-4">
                <label className="text-xs text-[#7f93b0] mb-1 block">Latitud</label>
                <input type="text" inputMode="decimal" placeholder="21.88234" value={form.latitud} onChange={e => setForm({ ...form, latitud: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm" />
                {formErrors.latitud && <p className="text-red-400 text-xs mt-1">{formErrors.latitud}</p>}
              </div>
              <div className="md:col-span-4">
                <label className="text-xs text-[#7f93b0] mb-1 block">Longitud</label>
                <input type="text" inputMode="decimal" placeholder="-102.29572" value={form.longitud} onChange={e => setForm({ ...form, longitud: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm" />
                {formErrors.longitud && <p className="text-red-400 text-xs mt-1">{formErrors.longitud}</p>}
              </div>
              <div className="md:col-span-4">
                <label className="text-xs text-[#7f93b0] mb-1 block">Radio (m)</label>
                <input type="number" min="1" max="5000" placeholder="150" value={form.radio_metros} onChange={e => setForm({ ...form, radio_metros: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm" />
                {formErrors.radio_metros && <p className="text-red-400 text-xs mt-1">{formErrors.radio_metros}</p>}
              </div>
              <p className="md:col-span-12 text-xs text-[#7f93b0]">Tip: clic-derecho en Google Maps, luego "Que hay aqui", luego copia los 2 numeros (lat, lng).</p>
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-[#7f93b0] mb-1 block">Descripción</label>
              <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={2} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={guardar} disabled={saving} className="px-5 py-2 bg-[#1E3E7A] hover:bg-[#2A4A8E] text-white font-medium rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.25)] text-sm font-medium flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editId ? "Guardar cambios" : "Crear obra"}
            </button>
            <button onClick={resetForm} className="px-5 py-2 bg-white/[0.04] hover:bg-white/[0.06] text-[#c9d8ed] rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[rgba(4,8,16,0.98)] backdrop-blur z-10">
              <tr className="text-[#7f93b0] text-xs uppercase">
                <th className="text-left p-3">Obra</th>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Estado</th>
                <th className="text-right p-3">Presupuesto</th>
                <th className="text-left p-3">Período</th>
                <th className="text-left p-3">Última modif.</th>
                <th className="text-center p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-aria-accent mx-auto" /></td></tr>
              ) : filtradas.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-[#4a6080]">Sin obras para los filtros actuales.</td></tr>
              ) : (() => {
                // Detectar coords duplicadas para badge
                const dup = new Set<string>();
                const seen = new Map<string, number>();
                filtradas.forEach(x => {
                  if (x.latitud != null && x.longitud != null) {
                    const k = `${x.latitud},${x.longitud}`;
                    seen.set(k, (seen.get(k) || 0) + 1);
                  }
                });
                seen.forEach((v, k) => { if (v > 1) dup.add(k); });
                return filtradas.map(o => {
                const archivada = ["TERMINADA", "CANCELADA"].includes(o.estado);
                const coordKey = (o.latitud != null && o.longitud != null) ? `${o.latitud},${o.longitud}` : null;
                const isDup = coordKey ? dup.has(coordKey) : false;
                const sinCoord = o.latitud == null || o.longitud == null;
                return (
                  <tr key={o.id} className={`border-t border-white/[0.05] hover:bg-white/[0.02] ${archivada ? "opacity-60" : ""}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">{o.nombre}</p>
                        {sinCoord ? (
                          <span title="Sin geocerca configurada" className="px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold bg-amber-500/20 text-amber-400">Sin coord</span>
                        ) : isDup ? (
                          <span title="Coordenadas duplicadas con otras obras" className="px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold bg-red-500/20 text-red-400">Coord duplicada</span>
                        ) : (
                          <span title={`Geocerca ${o.latitud}, ${o.longitud} radio ${o.radio_metros}m`} className="px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold bg-emerald-500/20 text-aria-accent">Coord OK</span>
                        )}
                      </div>
                      {o.direccion && <p className="text-xs text-[#4a6080]">{o.direccion}</p>}
                    </td>
                    <td className="p-3 text-[#c9d8ed]">{o.cliente || "—"}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${styleFor(o.estado)}`}>{labelFor(o.estado)}</span></td>
                    <td className="p-3 text-right text-aria-accent font-medium">{o.presupuesto != null ? `$${o.presupuesto.toLocaleString()}` : "—"}</td>
                    <td className="p-3 text-[#7f93b0] text-xs">
                      {o.fecha_inicio ? new Date(o.fecha_inicio).toLocaleDateString("es-MX") : "—"}
                      {" → "}
                      {o.fecha_fin ? new Date(o.fecha_fin).toLocaleDateString("es-MX") : "—"}
                    </td>
                    <td className="p-3 text-[#4a6080] text-xs">
                      {o.updated_at ? new Date(o.updated_at).toLocaleDateString("es-MX") : (o.created_at ? new Date(o.created_at).toLocaleDateString("es-MX") : "—")}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <button onClick={() => abrirEdicion(o)} title="Editar" className="p-1.5 text-aria-accent/70 hover:text-aria-accent hover:bg-aria-primary-hover/10 rounded">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <Link href={`/dashboard/obras/expedientes?obra=${o.id}`} title="Expediente" className="p-1.5 text-aria-accent/70 hover:text-aria-accent hover:bg-aria-primary-light rounded">
                          <FolderOpen className="w-4 h-4" />
                        </Link>
                        {!archivada ? (
                          <button onClick={() => cambiarEstado(o, "TERMINADA")} title="Archivar (Terminar)" className="p-1.5 text-[#7f93b0] hover:text-white hover:bg-white/[0.06] rounded">
                            <Archive className="w-4 h-4" />
                          </button>
                        ) : (
                          <button onClick={() => cambiarEstado(o, "ACTIVA")} title="Reactivar" className="p-1.5 text-amber-400/70 hover:text-amber-400 hover:bg-amber-500/10 rounded">
                            <Power className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              });
              })()}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmModal
        open={confirmState.open}
        message={confirmState.msg}
        onConfirm={() => { confirmState.onOk(); setConfirmState(p => ({...p, open: false})); }}
        onCancel={() => setConfirmState(p => ({...p, open: false}))}
      />
    </div>
  );
}
