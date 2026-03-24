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
    const [mant_result, acts_result] = await Promise.all([
      supabase.from("activos_mantenimiento").select("*").order("fecha", { ascending: false }),
      supabase.from("activos").select("id, nombre, name").order("nombre")
    ]);

    const { data: mant, error: mant_error } = mant_result;
    const { data: acts, error: acts_error } = acts_result;

    if (mant_error) {
      console.error("Error loading maintenance records:", mant_error.message);
      setLoading(false);
      return;
    }

    if (acts_error) {
      console.error("Error loading assets:", acts_error.message);
      setLoading(false);
      return;
    }

    if (mant && mant.length > 0) {
      const actIds = [...new Set(mant.map((r: any) => r.activo_id).filter(Boolean))];
      const { data: actData, error: actData_error } = await supabase.from("activos").select("id, nombre, name").in("id", actIds);

      if (actData_error) {
        console.error("Error loading asset details:", actData_error.message);
        setLoading(false);
        return;
      }

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

    const { error } = await supabase.from("activos_mantenimiento").insert({
      activo_id: form.activo_id,
      tipo: form.tipo,
      descripcion: form.descripcion,
      costo: form.costo ? parseFloat(form.costo) : 0,
      fecha: form.fecha,
      estado: form.estado
    });

    if (error) {
      console.error("Error saving maintenance record:", error.message);
      setSaving(false);
      return;
    }

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

// test
