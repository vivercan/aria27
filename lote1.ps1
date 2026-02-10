# =============================================
# LOTE 1: CRUD para Activos (3 paginas)
# =============================================

# --- 1. ESTADO: Agregar cambio de estado inline ---
@"
"use client";
import React from "react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Activity, CheckCircle2, AlertTriangle, XCircle, Wrench, Save, Loader2 } from "lucide-react";
import Link from "next/link";

export default function EstadoActivosPage() {
  const [activos, setActivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from("activos").select("*").order("nombre");
    if (data) setActivos(data);
    setLoading(false);
  };

  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    setSaving(id);
    await supabase.from("activos").update({ estado: nuevoEstado }).eq("id", id);
    setActivos(prev => prev.map(a => a.id === id ? { ...a, estado: nuevoEstado } : a));
    setSaving(null);
  };

  const estados = activos.reduce((acc, a) => {
    const est = a.estado || "Sin estado";
    acc[est] = (acc[est] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filtered = filtro === "todos" ? activos : activos.filter(a => (a.estado || "Sin estado") === filtro);

  const getIcon = (estado: string): React.ReactNode => {
    switch(estado?.toLowerCase()) {
      case "bueno": case "activo": return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "mantenimiento": case "reparacion": return <Wrench className="w-4 h-4 text-amber-400" />;
      case "baja": case "dañado": return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <AlertTriangle className="w-4 h-4 text-slate-400" />;
    }
  };

  const estadoOptions = ["bueno", "mantenimiento", "reparacion", "baja"];

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/activos" className="p-2 hover:bg-white/10 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-400" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Estado de Activos</h1>
          <p className="text-sm text-slate-400">{activos.length} activos registrados</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFiltro("todos")} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filtro === "todos" ? "bg-cyan-500/20 text-cyan-400" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
          Todos ({activos.length})
        </button>
        {Object.entries(estados).map(([est, count]) => (
          <button key={est} onClick={() => setFiltro(est)} className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${filtro === est ? "bg-cyan-500/20 text-cyan-400" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
            {getIcon(est)} {est} ({count as number})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No hay activos en esta categoría</div>
      ) : (
        <div className="overflow-auto max-h-[65vh] rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-800/90 backdrop-blur text-slate-400 text-xs uppercase">
              <tr>
                <th className="text-left p-3">Activo</th>
                <th className="text-left p-3">Categoría</th>
                <th className="text-left p-3">Ubicación</th>
                <th className="text-left p-3">Estado Actual</th>
                <th className="text-left p-3">Cambiar Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-white/5">
                  <td className="p-3 text-white font-medium">{a.nombre || a.name || "—"}</td>
                  <td className="p-3 text-slate-400">{a.categoria || a.category || "—"}</td>
                  <td className="p-3 text-slate-400">{a.ubicacion || a.location || "—"}</td>
                  <td className="p-3">{getIcon(a.estado || "")} <span className="ml-1 text-white">{a.estado || "Sin estado"}</span></td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={a.estado || ""}
                        onChange={(e) => cambiarEstado(a.id, e.target.value)}
                        className="bg-slate-700 text-white text-xs rounded px-2 py-1.5 border border-white/10"
                        disabled={saving === a.id}
                      >
                        <option value="">Seleccionar...</option>
                        {estadoOptions.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      {saving === a.id && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
"@ | Set-Content "app\dashboard\activos\estado\page.tsx" -Encoding UTF8
Write-Host "  1. activos/estado - CRUD (cambiar estado inline)" -ForegroundColor Green

# --- 2. MANTENIMIENTO: Agregar registro de mantenimiento ---
@"
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Wrench, Plus, Calendar, DollarSign, Loader2, X, Save } from "lucide-react";
import Link from "next/link";

export default function MantenimientoPage() {
  const [registros, setRegistros] = useState<any[]>([]);
  const [activos, setActivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ activo_id: "", tipo: "preventivo", descripcion: "", costo: "", fecha: new Date().toISOString().split("T")[0], estado: "completado" });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [{ data: mant }, { data: acts }] = await Promise.all([
      supabase.from("activos_mantenimiento").select("*").order("fecha", { ascending: false }),
      supabase.from("activos").select("id, nombre, name").order("nombre")
    ]);
    if (mant && mant.length > 0) {
      const actIds = [...new Set(mant.map((r: any) => r.activo_id).filter(Boolean))];
      const { data: actData } = await supabase.from("activos").select("id, nombre, name").in("id", actIds);
      const actMap = Object.fromEntries((actData || []).map((a: any) => [a.id, a]));
      setRegistros(mant.map((r: any) => ({ ...r, activo: actMap[r.activo_id] })));
    } else {
      setRegistros([]);
    }
    setActivos(acts || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.activo_id || !form.descripcion) return;
    setSaving(true);
    await supabase.from("activos_mantenimiento").insert({
      activo_id: form.activo_id,
      tipo: form.tipo,
      descripcion: form.descripcion,
      costo: form.costo ? parseFloat(form.costo) : 0,
      fecha: form.fecha,
      estado: form.estado
    });
    setShowModal(false);
    setForm({ activo_id: "", tipo: "preventivo", descripcion: "", costo: "", fecha: new Date().toISOString().split("T")[0], estado: "completado" });
    setSaving(false);
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/activos" className="p-2 hover:bg-white/10 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-400" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Mantenimiento</h1>
            <p className="text-sm text-slate-400">{registros.length} registros</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors">
          <Plus className="w-4 h-4" /> Registrar
        </button>
      </div>

      {registros.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No hay registros de mantenimiento. Usa el botón "Registrar" para agregar uno.</div>
      ) : (
        <div className="overflow-auto max-h-[65vh] rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-800/90 backdrop-blur text-slate-400 text-xs uppercase">
              <tr>
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Activo</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-left p-3">Descripción</th>
                <th className="text-right p-3">Costo</th>
                <th className="text-left p-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {registros.map(r => (
                <tr key={r.id} className="hover:bg-white/5">
                  <td className="p-3 text-white">{r.fecha}</td>
                  <td className="p-3 text-slate-300">{r.activo?.nombre || r.activo?.name || "—"}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${r.tipo === "preventivo" ? "bg-blue-500/20 text-blue-400" : "bg-amber-500/20 text-amber-400"}`}>{r.tipo}</span></td>
                  <td className="p-3 text-slate-300 max-w-xs truncate">{r.descripcion}</td>
                  <td className="p-3 text-right text-emerald-400">{r.costo ? `$${Number(r.costo).toLocaleString()}` : "—"}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${r.estado === "completado" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>{r.estado}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Registrar Mantenimiento</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Activo *</label>
                <select value={form.activo_id} onChange={e => setForm({...form, activo_id: e.target.value})} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-white/10">
                  <option value="">Seleccionar activo...</option>
                  {activos.map(a => <option key={a.id} value={a.id}>{a.nombre || a.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-white/10">
                    <option value="preventivo">Preventivo</option>
                    <option value="correctivo">Correctivo</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Fecha</label>
                  <input type="date" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-white/10" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400">Descripción *</label>
                <textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} rows={3} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-white/10" placeholder="Descripción del mantenimiento..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Costo</label>
                  <input type="number" value={form.costo} onChange={e => setForm({...form, costo: e.target.value})} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-white/10" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Estado</label>
                  <select value={form.estado} onChange={e => setForm({...form, estado: e.target.value})} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-white/10">
                    <option value="completado">Completado</option>
                    <option value="pendiente">Pendiente</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.activo_id || !form.descripcion} className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"@ | Set-Content "app\dashboard\activos\mantenimiento\page.tsx" -Encoding UTF8
Write-Host "  2. activos/mantenimiento - CRUD (modal nuevo registro)" -ForegroundColor Green

# --- 3. ASIGNACION: Agregar asignacion/devolucion ---
@"
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, UserCheck, Search, Package, Plus, RotateCcw, Loader2, X, Save } from "lucide-react";
import Link from "next/link";

export default function AsignacionPage() {
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [activos, setActivos] = useState<any[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ activo_id: "", empleado_id: "", notas: "" });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [{ data: asig }, { data: acts }, { data: emps }] = await Promise.all([
      supabase.from("activos_asignaciones").select("*").order("fecha_asignacion", { ascending: false }),
      supabase.from("activos").select("id, nombre, name").order("nombre"),
      supabase.from("Personal").select("id, full_name, employee_number").eq("status", "ACTIVO").order("full_name")
    ]);
    if (asig && asig.length > 0) {
      const empIds = [...new Set(asig.map((a: any) => a.empleado_id).filter(Boolean))];
      const actIds = [...new Set(asig.map((a: any) => a.activo_id).filter(Boolean))];
      const [{ data: empData }, { data: actData }] = await Promise.all([
        supabase.from("Personal").select("id, full_name, employee_number").in("id", empIds),
        supabase.from("activos").select("id, nombre, name").in("id", actIds)
      ]);
      const empMap = Object.fromEntries((empData || []).map((e: any) => [e.id, e]));
      const actMap = Object.fromEntries((actData || []).map((a: any) => [a.id, a]));
      setAsignaciones(asig.map((a: any) => ({ ...a, empleado: empMap[a.empleado_id], activo: actMap[a.activo_id] })));
    } else {
      setAsignaciones([]);
    }
    setActivos(acts || []);
    setEmpleados(emps || []);
    setLoading(false);
  };

  const handleAsignar = async () => {
    if (!form.activo_id || !form.empleado_id) return;
    setSaving(true);
    await supabase.from("activos_asignaciones").insert({
      activo_id: form.activo_id,
      empleado_id: form.empleado_id,
      fecha_asignacion: new Date().toISOString().split("T")[0],
      estado: "asignado",
      notas: form.notas
    });
    setShowModal(false);
    setForm({ activo_id: "", empleado_id: "", notas: "" });
    setSaving(false);
    load();
  };

  const handleDevolver = async (id: string) => {
    await supabase.from("activos_asignaciones").update({
      estado: "devuelto",
      fecha_devolucion: new Date().toISOString().split("T")[0]
    }).eq("id", id);
    load();
  };

  const filtered = asignaciones.filter(a => {
    if (!search) return true;
    const s = search.toLowerCase();
    return a.empleado?.full_name?.toLowerCase().includes(s) || a.activo?.nombre?.toLowerCase().includes(s) || a.activo?.name?.toLowerCase().includes(s);
  });

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/activos" className="p-2 hover:bg-white/10 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-400" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Asignación de Activos</h1>
            <p className="text-sm text-slate-400">{asignaciones.filter(a => a.estado === "asignado").length} activos asignados</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors">
          <Plus className="w-4 h-4" /> Asignar
        </button>
      </div>

      <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
        <Search className="w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por empleado o activo..." className="bg-transparent text-white text-sm outline-none w-full" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No hay asignaciones. Usa el botón "Asignar" para crear una.</div>
      ) : (
        <div className="overflow-auto max-h-[60vh] rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-800/90 backdrop-blur text-slate-400 text-xs uppercase">
              <tr>
                <th className="text-left p-3">Empleado</th>
                <th className="text-left p-3">Activo</th>
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Estado</th>
                <th className="text-left p-3">Notas</th>
                <th className="text-center p-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-white/5">
                  <td className="p-3 text-white">{a.empleado?.full_name || "—"}</td>
                  <td className="p-3 text-slate-300">{a.activo?.nombre || a.activo?.name || "—"}</td>
                  <td className="p-3 text-slate-400">{a.fecha_asignacion}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${a.estado === "asignado" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"}`}>{a.estado}</span></td>
                  <td className="p-3 text-slate-400 max-w-xs truncate">{a.notas || "—"}</td>
                  <td className="p-3 text-center">
                    {a.estado === "asignado" && (
                      <button onClick={() => handleDevolver(a.id)} className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs hover:bg-amber-500/30 mx-auto">
                        <RotateCcw className="w-3 h-3" /> Devolver
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Asignar Activo</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Empleado *</label>
                <select value={form.empleado_id} onChange={e => setForm({...form, empleado_id: e.target.value})} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-white/10">
                  <option value="">Seleccionar empleado...</option>
                  {empleados.map(e => <option key={e.id} value={e.id}>{e.employee_number} - {e.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Activo *</label>
                <select value={form.activo_id} onChange={e => setForm({...form, activo_id: e.target.value})} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-white/10">
                  <option value="">Seleccionar activo...</option>
                  {activos.map(a => <option key={a.id} value={a.id}>{a.nombre || a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Notas</label>
                <textarea value={form.notas} onChange={e => setForm({...form, notas: e.target.value})} rows={2} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-white/10" placeholder="Observaciones..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancelar</button>
              <button onClick={handleAsignar} disabled={saving || !form.activo_id || !form.empleado_id} className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Asignar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"@ | Set-Content "app\dashboard\activos\asignacion\page.tsx" -Encoding UTF8
Write-Host "  3. activos/asignacion - CRUD (asignar + devolver)" -ForegroundColor Green

# BUILD
Write-Host "`nEjecutando build..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nBuild exitoso" -ForegroundColor Green
    git add .
    git commit -m "feat: CRUD en activos - estado inline, mantenimiento modal, asignacion con devolucion"
    git push
    Write-Host "Deploy iniciado - LOTE 1 de 3 completado" -ForegroundColor Cyan
} else {
    Write-Host "`nError en build" -ForegroundColor Red
}
