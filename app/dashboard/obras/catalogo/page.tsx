"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Search, Pencil, Archive, Power, Loader2, FolderOpen, Plus, X, Save } from "lucide-react";

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
  created_at?: string;
  updated_at?: string;
}

const STATUS = [
  { value: "EN_PLANEACION", label: "En Planeación", color: "bg-blue-500/20 text-blue-400" },
  { value: "ACTIVA", label: "Activa", color: "bg-emerald-500/20 text-emerald-400" },
  { value: "PAUSADA", label: "Pausada", color: "bg-amber-500/20 text-amber-400" },
  { value: "TERMINADA", label: "Terminada", color: "bg-slate-500/20 text-slate-400" },
  { value: "CANCELADA", label: "Cancelada", color: "bg-red-500/20 text-red-400" },
];

const FORM_INIT = { nombre: "", direccion: "", cliente: "", estado: "ACTIVA", presupuesto: "", fecha_inicio: "", fecha_fin: "", descripcion: "" };

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
  const [msg, setMsg] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);

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

  const flash = (tipo: "ok" | "err", texto: string) => {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg(null), 2500);
  };

  const resetForm = () => { setForm({ ...FORM_INIT }); setEditId(null); setShowForm(false); };

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
    });
    setShowForm(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) { flash("err", "El nombre de la obra es obligatorio"); return; }
    setSaving(true);
    const payload: any = { ...form, updated_at: new Date().toISOString() };
    if (payload.presupuesto === "" || payload.presupuesto === null) payload.presupuesto = null;
    else payload.presupuesto = parseFloat(payload.presupuesto);
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });

    if (editId) {
      const { error } = await supabase.from("centros_trabajo").update(payload).eq("id", editId);
      if (error) { flash("err", "Error: " + error.message); setSaving(false); return; }
      flash("ok", "Obra actualizada");
    } else {
      const { error } = await supabase.from("centros_trabajo").insert(payload);
      if (error) { flash("err", "Error: " + error.message); setSaving(false); return; }
      flash("ok", "Obra creada");
    }
    setSaving(false);
    resetForm();
    cargar();
  };

  const cambiarEstado = async (o: Obra, nuevoEstado: string) => {
    const label = STATUS.find(s => s.value === nuevoEstado)?.label || nuevoEstado;
    if (!confirm(`¿Mover la obra "${o.nombre}" al estado "${label}"?`)) return;
    const { error } = await supabase.from("centros_trabajo")
      .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
      .eq("id", o.id);
    if (error) { flash("err", "Error: " + error.message); return; }
    flash("ok", `Obra → ${label}`);
    cargar();
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

  const styleFor = (s: string) => STATUS.find(o => o.value === s)?.color || "bg-slate-500/20 text-slate-400";
  const labelFor = (s: string) => STATUS.find(o => o.value === s)?.label || s;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-none p-6 pb-3 border-b border-white/10">
        <Link href="/dashboard/obras" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Obras
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Catálogo Maestro de Obras</h1>
            <p className="text-xs text-slate-400">Fuente única · CRUD + cierre/archivo + historial · enlazado a costeo, gastos, expediente, personal</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/obras/pipeline" className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-xs">Vista Pipeline</Link>
            <button
              onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
              className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-500/30 flex items-center gap-2"
            >
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? "Cancelar" : "Nueva Obra"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
          {[
            { label: "Total", value: stats.total, color: "text-white" },
            { label: "Activas", value: stats.activas, color: "text-emerald-400" },
            { label: "En planeación", value: stats.planeacion, color: "text-blue-400" },
            { label: "Pausadas", value: stats.pausadas, color: "text-amber-400" },
            { label: "Archivadas", value: stats.archivadas, color: "text-slate-400" },
          ].map(s => (
            <div key={s.label} className="p-3 bg-white/5 rounded-lg">
              <p className={`text-xl font-bold ${s.color}`}>{loading ? "…" : s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o cliente…"
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-blue-500/50 focus:outline-none"
            />
          </div>
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
          >
            <option value="ACTIVAS">Activas / planeación / pausadas</option>
            <option value="ARCHIVADAS">Archivadas (terminadas+canceladas)</option>
            <option value="TODAS">Todas</option>
            {STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {msg && (
        <div className={`mx-6 mt-3 px-4 py-2 rounded-lg text-sm ${msg.tipo === "ok" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
          {msg.texto}
        </div>
      )}

      {showForm && (
        <div className="flex-none mx-6 mt-3 p-5 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <h3 className="text-base font-semibold text-white mb-3">{editId ? "Editar obra" : "Nueva obra"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Nombre *</label>
              <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Estado</label>
              <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm">
                {STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Dirección</label>
              <input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Cliente</label>
              <input value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Presupuesto</label>
              <input type="number" value={form.presupuesto} onChange={e => setForm({ ...form, presupuesto: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Fecha inicio</label>
              <input type="date" value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Fecha fin</label>
              <input type="date" value={form.fecha_fin} onChange={e => setForm({ ...form, fecha_fin: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-slate-400 mb-1 block">Descripción</label>
              <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={2} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={guardar} disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editId ? "Guardar cambios" : "Crear obra"}
            </button>
            <button onClick={resetForm} className="px-5 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <tr className="text-slate-400 text-xs uppercase">
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
                <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" /></td></tr>
              ) : filtradas.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Sin obras para los filtros actuales.</td></tr>
              ) : filtradas.map(o => {
                const archivada = ["TERMINADA", "CANCELADA"].includes(o.estado);
                return (
                  <tr key={o.id} className={`border-t border-white/5 hover:bg-white/[0.02] ${archivada ? "opacity-60" : ""}`}>
                    <td className="p-3">
                      <p className="text-white font-medium">{o.nombre}</p>
                      {o.direccion && <p className="text-xs text-slate-500">{o.direccion}</p>}
                    </td>
                    <td className="p-3 text-slate-300">{o.cliente || "—"}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${styleFor(o.estado)}`}>{labelFor(o.estado)}</span></td>
                    <td className="p-3 text-right text-emerald-400 font-medium">{o.presupuesto != null ? `$${o.presupuesto.toLocaleString()}` : "—"}</td>
                    <td className="p-3 text-slate-400 text-xs">
                      {o.fecha_inicio ? new Date(o.fecha_inicio).toLocaleDateString("es-MX") : "—"}
                      {" → "}
                      {o.fecha_fin ? new Date(o.fecha_fin).toLocaleDateString("es-MX") : "—"}
                    </td>
                    <td className="p-3 text-slate-500 text-xs">
                      {o.updated_at ? new Date(o.updated_at).toLocaleDateString("es-MX") : (o.created_at ? new Date(o.created_at).toLocaleDateString("es-MX") : "—")}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <button onClick={() => abrirEdicion(o)} title="Editar" className="p-1.5 text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/10 rounded">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <Link href={`/dashboard/obras/expedientes?obra=${o.id}`} title="Expediente" className="p-1.5 text-violet-400/70 hover:text-violet-400 hover:bg-violet-500/10 rounded">
                          <FolderOpen className="w-4 h-4" />
                        </Link>
                        {!archivada ? (
                          <button onClick={() => cambiarEstado(o, "TERMINADA")} title="Archivar (Terminar)" className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded">
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
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
