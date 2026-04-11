"use client";
import AriaBackButton from "@/components/AriaBackButton";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { UserCheck, Search, Package, Plus, RotateCcw, Loader2, X, Save } from "lucide-react";
import Link from "next/link";
import { useFlashMessage } from "@/lib/use-flash-message";
import FlashBanner from "@/components/FlashBanner";
import { useEntityForm } from "@/hooks/useEntityForm";

const EMPTY_ASIGNACION = { activo_id: "", empleado_id: "", notas: "" };

export default function AsignacionPage() {
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [activos, setActivos] = useState<any[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Shared hooks — replace manual modal/form/flash state
  const { msg, flash, clear } = useFlashMessage();
  const { showModal, form, saving, openNew, closeModal, setForm, setSaving } = useEntityForm(EMPTY_ASIGNACION);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [{ data: asig, error: asigError }, { data: acts, error: actsError }, { data: emps, error: empsError }] = await Promise.all([
      supabase.from("activos_asignaciones").select("*").order("fecha_asignacion", { ascending: false }),
      supabase.from("activos").select("id, nombre, name").order("nombre"),
      supabase.from("Personal").select("id, full_name, employee_number").eq("status", "ACTIVO").order("full_name")
    ]);

    if (asigError) {
      setLoading(false);
      return;
    }
    if (actsError) {
      setLoading(false);
      return;
    }
    if (empsError) {
      setLoading(false);
      return;
    }

    if (asig && asig.length > 0) {
      const empIds = [...new Set(asig.map((a: any) => a.empleado_id).filter(Boolean))];
      const actIds = [...new Set(asig.map((a: any) => a.activo_id).filter(Boolean))];
      const [{ data: empData, error: empDataError }, { data: actData, error: actDataError }] = await Promise.all([
        supabase.from("Personal").select("id, full_name, employee_number").in("id", empIds),
        supabase.from("activos").select("id, nombre, name").in("id", actIds)
      ]);

      if (empDataError) {
        setLoading(false);
        return;
      }
      if (actDataError) {
        setLoading(false);
        return;
      }

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

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validar = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.activo_id?.trim()) errors.activo_id = "Selecciona un activo";
    if (!form.empleado_id?.trim()) errors.empleado_id = "Selecciona un empleado";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAsignar = async () => {
    if (!validar()) return;
    setSaving(true);

    // OPTIMISTIC LOCK sobre activos.estado
    const { data: lockRows, error: lockErr } = await supabase
      .from("activos")
      .update({ estado: "EN_USO" })
      .eq("id", form.activo_id)
      .eq("estado", "DISPONIBLE")
      .select("id");
    if (lockErr) { flash("err", "Error al reservar activo: " + lockErr.message); setSaving(false); return; }
    if (!lockRows || lockRows.length === 0) {
      flash("err", "Este activo ya no está DISPONIBLE. Recarga.");
      setSaving(false); load(); return;
    }

    const { error } = await supabase.from("activos_asignaciones").insert({
      activo_id: form.activo_id,
      empleado_id: form.empleado_id,
      fecha_asignacion: new Date().toISOString().split("T")[0],
      estado: "asignado",
      notas: form.notas
    });

    if (error) {
      // Rollback
      await supabase.from("activos").update({ estado: "DISPONIBLE" }).eq("id", form.activo_id).eq("estado", "EN_USO");
      flash("err", "Error al crear asignación: " + error.message);
      setSaving(false);
      return;
    }

    flash("ok", "Activo asignado correctamente");
    closeModal();
    load();
  };

  const handleDevolver = async (id: string) => {
    // OPTIMISTIC LOCK
    const { data: rows, error } = await supabase.from("activos_asignaciones").update({
      estado: "devuelto",
      fecha_devolucion: new Date().toISOString().split("T")[0]
    }).eq("id", id).eq("estado", "asignado").select("activo_id");

    if (error) { flash("err", "Error al devolver: " + error.message); return; }
    if (!rows || rows.length === 0) { flash("err", "Esta asignación ya fue devuelta. Recarga."); load(); return; }

    // Liberar activo
    if (rows[0].activo_id) {
      await supabase.from("activos").update({ estado: "DISPONIBLE" }).eq("id", rows[0].activo_id);
    }
    flash("ok", "Activo devuelto correctamente");
    load();
  };

  const filtered = asignaciones.filter(a => {
    if (!search) return true;
    const s = search.toLowerCase();
    return a.empleado?.full_name?.toLowerCase().includes(s) || a.activo?.nombre?.toLowerCase().includes(s) || a.activo?.name?.toLowerCase().includes(s);
  });

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AriaBackButton href="/dashboard/activos" />
          <div>
            <h1 className="text-2xl font-bold text-white">Asignación de Activos</h1>
            <p className="text-sm text-slate-400">{asignaciones.filter(a => a.estado === "asignado").length} activos asignados</p>
          </div>
        </div>
        <button onClick={() => openNew()} className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors">
          <Plus className="w-4 h-4" /> Asignar
        </button>
      </div>

      <FlashBanner msg={msg} />

      <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
        <Search className="w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por empleado o activo..." className="bg-transparent text-white text-sm outline-none w-full" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400">No hay asignaciones. Usa el botón "Asignar" para crear una.</p>
        </div>
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
              <button onClick={() => closeModal()}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Empleado *</label>
                <select value={form.empleado_id} onChange={e => setForm({...form, empleado_id: e.target.value})} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-white/10">
                  <option value="">Seleccionar empleado...</option>
                  {empleados.map(e => <option key={e.id} value={e.id}>{e.employee_number} - {e.full_name}</option>)}
                </select>
                {formErrors.empleado_id && <p className="text-red-400 text-xs mt-1">{formErrors.empleado_id}</p>}
              </div>
              <div>
                <label className="text-xs text-slate-400">Activo *</label>
                <select value={form.activo_id} onChange={e => setForm({...form, activo_id: e.target.value})} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-white/10">
                  <option value="">Seleccionar activo...</option>
                  {activos.map(a => <option key={a.id} value={a.id}>{a.nombre || a.name}</option>)}
                </select>
                {formErrors.activo_id && <p className="text-red-400 text-xs mt-1">{formErrors.activo_id}</p>}
              </div>
              <div>
                <label className="text-xs text-slate-400">Notas</label>
                <textarea value={form.notas} onChange={e => setForm({...form, notas: e.target.value})} rows={2} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-white/10" placeholder="Observaciones..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => closeModal()} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancelar</button>
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
