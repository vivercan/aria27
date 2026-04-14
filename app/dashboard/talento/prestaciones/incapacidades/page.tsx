"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, HeartPulse, Search, Plus, X } from "lucide-react";
import Link from "next/link";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/lib/use-flash-message";

export default function IncapacidadesPage() {
  const [registros, setRegistros] = useState<any[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ employee_id: "", tipo: "enfermedad", fecha_inicio: "", fecha_fin: "", folio_imss: "", notas: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { msg, flash } = useFlashMessage();

  const loadData = async () => {
    const { data: emps } = await supabase.from("Personal").select("id, full_name, employee_number").eq("status", "ACTIVO").order("full_name");
    setEmpleados(emps || []);
    const { data: inc } = await supabase.from("incidencias").select("*").eq("tipo", "incapacidad").order("fecha_inicio", { ascending: false });
    if (inc && emps) {
      const empMap = Object.fromEntries(emps.map((e: { id: string }) => [e.id, e]));
      setRegistros(inc.map((i: Record<string, unknown>) => ({ ...i, empleado: empMap[(i.employee_id as string)] })));
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
      flash("err", "No se pudo registrar la incapacidad: " + (((error as {message?: string})?.message) || "Error desconocido"));
      return;
    }
    setShowModal(false);
    setForm({ employee_id: "", tipo: "enfermedad", fecha_inicio: "", fecha_fin: "", folio_imss: "", notas: "" });
    setLoading(true);
    loadData();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {msg && <FlashBanner msg={msg} className="mx-6 mt-3" />}
      <div className="flex-shrink-0 mb-6">
        <Link href="/dashboard/talento/prestaciones" className="inline-flex items-center gap-2 text-sm text-[#7f93b0] hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Prestaciones
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Incapacidades</h1>
            <p className="text-[#7f93b0] text-sm mt-1">Registro y seguimiento de incapacidades IMSS</p>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-aria-primary hover:bg-aria-primary-hover text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Registrar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-white/[0.08]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#0c1d38] z-10">
            <tr className="text-left text-[#7f93b0] border-b border-white/[0.08]">
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
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#7f93b0]">Cargando...</td></tr>
            ) : registros.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#7f93b0]">No hay incapacidades registradas</td></tr>
            ) : registros.map(r => (
              <tr key={r.id} className="border-b border-white/[0.05] hover:bg-white/[0.04]">
                <td className="px-4 py-3 text-white">{r.empleado?.full_name || "—"}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${r.subtipo === "riesgo_trabajo" ? "bg-red-500/20 text-red-400" : r.subtipo === "maternidad" ? "bg-pink-500/20 text-pink-400" : "bg-aria-primary-light text-aria-accent"}`}>{r.subtipo || "Enfermedad"}</span></td>
                <td className="px-4 py-3 text-[#c9d8ed]">{r.fecha_inicio ? new Date(r.fecha_inicio).toLocaleDateString("es-MX") : "—"}</td>
                <td className="px-4 py-3 text-[#c9d8ed]">{r.fecha_fin ? new Date(r.fecha_fin).toLocaleDateString("es-MX") : "—"}</td>
                <td className="px-4 py-3 text-center font-mono text-white">{r.fecha_inicio && r.fecha_fin ? (Math.floor((new Date(r.fecha_fin).getTime() - new Date(r.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24)) + 1) : "—"}</td>
                <td className="px-4 py-3 text-aria-accent font-mono text-xs">{r.folio || "—"}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${r.status === "activa" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>{r.status || "Activa"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60  flex items-center justify-center z-50">
          <div className="bg-[#0c1d38] rounded-xl p-6 w-full max-w-md border border-white/[0.08]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Nueva Incapacidad</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/[0.06] rounded-lg"><X className="w-5 h-5 text-white" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-[#7f93b0]">Empleado</label>
                <select value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})} className={`w-full mt-1 p-2 bg-white/[0.04] border rounded-lg text-white ${formErrors.employee_id ? "border-red-500/50" : "border-white/[0.08]"}`}>
                  <option value="">Seleccionar...</option>
                  {empleados.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
                {formErrors.employee_id && <p className="text-red-400 text-xs mt-1">{formErrors.employee_id}</p>}
              </div>
              <div>
                <label className="text-sm text-[#7f93b0]">Tipo</label>
                <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="w-full mt-1 p-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white">
                  <option value="enfermedad">Enfermedad General</option>
                  <option value="riesgo_trabajo">Riesgo de Trabajo</option>
                  <option value="maternidad">Maternidad</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#7f93b0]">Fecha Inicio</label>
                  <input type="date" value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})} className={`w-full mt-1 p-2 bg-white/[0.04] border rounded-lg text-white ${formErrors.fecha_inicio ? "border-red-500/50" : "border-white/[0.08]"}`} />
                  {formErrors.fecha_inicio && <p className="text-red-400 text-xs mt-1">{formErrors.fecha_inicio}</p>}
                </div>
                <div><label className="text-sm text-[#7f93b0]">Fecha Fin</label><input type="date" value={form.fecha_fin} onChange={e => setForm({...form, fecha_fin: e.target.value})} className="w-full mt-1 p-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white" /></div>
              </div>
              <div><label className="text-sm text-[#7f93b0]">Folio IMSS</label><input type="text" value={form.folio_imss} onChange={e => setForm({...form, folio_imss: e.target.value})} className="w-full mt-1 p-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white" placeholder="Número de folio" /></div>
              <div><label className="text-sm text-[#7f93b0]">Notas</label><input type="text" value={form.notas} onChange={e => setForm({...form, notas: e.target.value})} className="w-full mt-1 p-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white" placeholder="Observaciones" /></div>
              <button onClick={handleSubmit} disabled={!form.employee_id || !form.fecha_inicio} className="w-full py-3 bg-aria-primary hover:bg-aria-primary-hover disabled:bg-[#162040] text-white rounded-lg font-medium">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
