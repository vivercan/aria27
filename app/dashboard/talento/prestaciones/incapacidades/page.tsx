"use client";
import AriaBackButton from "@/components/AriaBackButton";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/lib/use-flash-message";
import { ArrowLeft, HeartPulse, Search, Plus, X } from "lucide-react";
import Link from "next/link";

interface EmpleadoRow {
  id: string;
  full_name?: string;
  employee_number?: string;
}

interface IncapacidadRow {
  id?: string;
  employee_id?: string;
  tipo?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  folio_imss?: string;
  folio?: string;
  subtipo?: string;
  status?: string;
  notas?: string;
  empleado?: EmpleadoRow;
}

export default function IncapacidadesPage() {
  const [registros, setRegistros] = useState<IncapacidadRow[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ employee_id: "", tipo: "enfermedad", fecha_inicio: "", fecha_fin: "", folio_imss: "", notas: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { msg, flash } = useFlashMessage();

  const loadData = async () => {
    const { data: emps } = await supabase.from("Personal").select("id, full_name, employee_number").eq("status", "ACTIVO").order("full_name");
    setEmpleados((emps as EmpleadoRow[]) || []);
    const { data: inc } = await supabase.from("incidencias").select("*").eq("tipo", "incapacidad").order("fecha_inicio", { ascending: false });
    if (inc && emps) {
      const empMap = Object.fromEntries((emps as EmpleadoRow[]).map((e: EmpleadoRow) => [e.id, e]));
      setRegistros((inc as IncapacidadRow[]).map((i: IncapacidadRow) => ({ ...i, empleado: empMap[i.employee_id!] })));
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const validar = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.employee_id?.trim()) errors.employee_id = "Seleccione un empleado";
    if (!form.fecha_inicio?.trim()) errors.fecha_inicio = "La fecha de inicio es obligatoria";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validar()) return;
    const inicio = new Date(form.fecha_inicio);
    const fin = form.fecha_fin ? new Date(form.fecha_fin) : inicio;
    const { error } = await supabase.from("incidencias").insert({
      employee_id: form.employee_id,
      tipo: "incapacidad",
      subtipo: form.tipo,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin || form.fecha_inicio,
      folio: form.folio_imss,
      notas: form.notas,
      status: "activa"
    });
    if (error) {
      flash("err", "No se pudo registrar la incapacidad: " + (error.message ?? "error desconocido"));
      return;
    }
    setShowModal(false);
    setForm({ employee_id: "", tipo: "enfermedad", fecha_inicio: "", fecha_fin: "", folio_imss: "", notas: "" });
    setLoading(true);
    loadData();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <FlashBanner msg={msg} />
      <div className="flex-shrink-0 mb-6">
        <Link href="/dashboard/talento/prestaciones" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Prestaciones
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Incapacidades</h1>
            <p className="text-slate-400 text-sm mt-1">Registro y seguimiento de incapacidades IMSS</p>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Registrar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-800 z-10">
            <tr className="text-left text-slate-400 border-b border-white/10">
              <th className="px-4 py-3 font-medium">Empleado</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Inicio</th>
              <th className="px-4 py-3 font-medium">Fin</th>
              <th className="px-4 py-3 font-medium text-center">Días</th>
              <th className="px-4 py-3 font-medium">Folio IMSS</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Cargando...</td></tr>
            ) : registros.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No hay incapacidades registradas</td></tr>
            ) : registros.map(r => (
              <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3 text-white">{r.empleado?.full_name || "—"}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${r.subtipo === "riesgo_trabajo" ? "bg-red-500/20 text-red-400" : r.subtipo === "maternidad" ? "bg-pink-500/20 text-pink-400" : "bg-blue-500/20 text-blue-400"}`}>{r.subtipo || "Enfermedad"}</span></td>
                <td className="px-4 py-3 text-slate-300">{r.fecha_inicio ? new Date(r.fecha_inicio).toLocaleDateString("es-MX") : "—"}</td>
                <td className="px-4 py-3 text-slate-300">{r.fecha_fin ? new Date(r.fecha_fin).toLocaleDateString("es-MX") : "—"}</td>
                <td className="px-4 py-3 text-center font-mono text-white">{r.fecha_inicio && r.fecha_fin ? (Math.floor((new Date(r.fecha_fin).getTime() - new Date(r.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24)) + 1) : "—"}</td>
                <td className="px-4 py-3 text-blue-400 font-mono text-xs">{r.folio || "—"}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${r.status === "activa" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>{r.status || "Activa"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Nueva Incapacidad</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-5 h-5 text-white" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400">Empleado</label>
                <select value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})} className={`w-full mt-1 p-2 bg-white/5 border rounded-lg text-white ${formErrors.employee_id ? "border-red-500/50" : "border-white/10"}`}>
                  <option value="">Seleccionar...</option>
                  {empleados.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
                {formErrors.employee_id && <p className="text-red-400 text-xs mt-1">{formErrors.employee_id}</p>}
              </div>
              <div>
                <label className="text-sm text-slate-400">Tipo</label>
                <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white">
                  <option value="enfermedad">Enfermedad General</option>
                  <option value="riesgo_trabajo">Riesgo de Trabajo</option>
                  <option value="maternidad">Maternidad</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400">Fecha Inicio</label>
                  <input type="date" value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})} className={`w-full mt-1 p-2 bg-white/5 border rounded-lg text-white ${formErrors.fecha_inicio ? "border-red-500/50" : "border-white/10"}`} />
                  {formErrors.fecha_inicio && <p className="text-red-400 text-xs mt-1">{formErrors.fecha_inicio}</p>}
                </div>
                <div><label className="text-sm text-slate-400">Fecha Fin</label><input type="date" value={form.fecha_fin} onChange={e => setForm({...form, fecha_fin: e.target.value})} className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              </div>
              <div><label className="text-sm text-slate-400">Folio IMSS</label><input type="text" value={form.folio_imss} onChange={e => setForm({...form, folio_imss: e.target.value})} className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white" placeholder="Número de folio" /></div>
              <div><label className="text-sm text-slate-400">Notas</label><input type="text" value={form.notas} onChange={e => setForm({...form, notas: e.target.value})} className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white" placeholder="Observaciones" /></div>
              <button onClick={handleSubmit} disabled={!form.employee_id || !form.fecha_inicio} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg font-medium">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
