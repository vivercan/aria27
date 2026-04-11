"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Calendar, Clock, MapPin, CheckCircle, XCircle, Filter, Plus, Save, X, Loader2 } from "lucide-react";
import Link from "next/link";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/lib/use-flash-message";

interface Asistencia {
  id: string;
  employee_id: string;
  fecha: string;
  hora_entrada: string | null;
  hora_salida: string | null;
  dentro_geocerca_entrada: boolean;
  tipo_registro: string;
  employees: { full_name: string; employee_number: string } | null;
}

interface EmpleadoInfo {
  id: string;
  full_name: string;
  employee_number: string;
}

export default function ChecadasPage() {
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(true);
  const hoy = new Date().toISOString().split("T")[0];
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin, setFechaFin] = useState(hoy);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [empleadosList, setEmpleadosList] = useState<EmpleadoInfo[]>([]);
  const [formManual, setFormManual] = useState({ employee_id: "", fecha: new Date().toISOString().split("T")[0], hora_entrada: "08:00", hora_salida: "17:00" });
  const { msg, flash, clear } = useFlashMessage();

  useEffect(() => { cargarAsistencias();
    supabase.from("Personal").select("id, full_name, employee_number").eq("status", "ACTIVO").order("full_name").then(({ data }) => { if (data) setEmpleadosList(data); }); }, [fechaInicio, fechaFin]);

  const cargarAsistencias = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("asistencias")
      .select("*, employees(full_name, employee_number)")
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin)
      .order("fecha", { ascending: false })
      .order("hora_entrada", { ascending: true });

    let registros: Asistencia[] = (data as Asistencia[]) || [];

    // Fallback: enriquecer registros sin nombre desde Personal (VIEW) por employee_id
    const sinNombre = registros.filter(r => !r.employees?.full_name).map((r: Asistencia) => r.employee_id).filter(Boolean);
    if (sinNombre.length > 0) {
      const { data: extras } = await supabase
        .from("Personal")
        .select("id, full_name, employee_number")
        .in("id", Array.from(new Set(sinNombre)));
      if (extras) {
        const map: Record<string, { full_name: string; employee_number: string }> = {};
        extras.forEach((e: EmpleadoInfo) => { map[e.id] = { full_name: e.full_name, employee_number: e.employee_number }; });
        registros = registros.map((r: Asistencia) => r.employees?.full_name ? r : { ...r, employees: map[r.employee_id] || r.employees });
      }
    }

    setAsistencias(registros);
    setLoading(false);
  };

  // Acumulados por empleado en el rango
  const acumulados = (() => {
    const map: Record<string, { nombre: string; numero: string; total: number; completas: number; sinSalida: number }> = {};
    asistencias.forEach((a: Asistencia) => {
      const key = a.employee_id || a.employees?.employee_number || "desconocido";
      if (!map[key]) map[key] = { nombre: a.employees?.full_name || "Sin nombre", numero: a.employees?.employee_number || "—", total: 0, completas: 0, sinSalida: 0 };
      map[key].total += 1;
      if (a.hora_entrada && a.hora_salida) map[key].completas += 1;
      if (a.hora_entrada && !a.hora_salida) map[key].sinSalida += 1;
    });
    return Object.values(map).sort((x, y) => y.total - x.total);
  })();

  const stats = {
    total: asistencias.length,
    completas: asistencias.filter(a => a.hora_entrada && a.hora_salida).length,
    enSitio: asistencias.filter(a => a.hora_entrada && !a.hora_salida).length,
    fueraGeocerca: asistencias.filter(a => !a.dentro_geocerca_entrada).length
  };


  const handleManual = async () => {
    if (!formManual.employee_id) return;
    setSaving(true);
    const { error } = await supabase.from("asistencias").insert({
      employee_id: formManual.employee_id,
      fecha: formManual.fecha,
      hora_entrada: formManual.hora_entrada,
      hora_salida: formManual.hora_salida,
      tipo_registro: "MANUAL",
      dentro_geocerca_entrada: true
    });
    setSaving(false);
    if (error) {
      flash("err", "No se pudo registrar la asistencia: " + (((error as {message?: string})?.message) || "Error desconocido"));
      return;
    }
    setShowModal(false);
    setFormManual({ employee_id: "", fecha: new Date().toISOString().split("T")[0], hora_entrada: "08:00", hora_salida: "17:00" });
    cargarAsistencias();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {msg && <FlashBanner msg={msg} className="mx-6 mt-3" />}
      <div className="flex-none p-6 border-b border-white/10">
        <Link href="/dashboard/talento" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Talento
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Registro de Asistencias</h1>
            <p className="text-slate-400">Control de entradas y salidas</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} title="Desde"
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
            <span className="text-slate-500 text-xs">→</span>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} title="Hasta"
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
            <button onClick={() => { setFechaInicio(hoy); setFechaFin(hoy); }} className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-xs">Hoy</button>
            <button onClick={() => { const d = new Date(); const start = new Date(d); start.setDate(d.getDate() - 6); setFechaInicio(start.toISOString().split("T")[0]); setFechaFin(hoy); }} className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-xs">7 días</button>
            <button onClick={() => { const d = new Date(); const start = new Date(d.getFullYear(), d.getMonth(), 1); setFechaInicio(start.toISOString().split("T")[0]); setFechaFin(hoy); }} className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-xs">Mes</button>
            <Link href="/dashboard/talento/checadas/incompletas"
              className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30">
              Ver Incompletas
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="p-4 bg-white/5 rounded-xl">
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-sm text-slate-400">Total registros</p>
          </div>
          <div className="p-4 bg-emerald-500/10 rounded-xl">
            <p className="text-2xl font-bold text-emerald-400">{stats.completas}</p>
            <p className="text-sm text-slate-400">Completas</p>
          </div>
          <div className="p-4 bg-aria-primary/10 rounded-xl">
            <p className="text-2xl font-bold text-aria-accent">{stats.enSitio}</p>
            <p className="text-sm text-slate-400">En sitio</p>
          </div>
          <div className="p-4 bg-red-500/10 rounded-xl">
            <p className="text-2xl font-bold text-red-400">{stats.fueraGeocerca}</p>
            <p className="text-sm text-slate-400">Fuera de geocerca</p>
          </div>
        </div>
      </div>

      {acumulados.length > 0 && (fechaInicio !== fechaFin) && (
        <div className="flex-none px-6 py-3 border-b border-white/10 bg-white/[0.02]">
          <p className="text-xs text-slate-400 mb-2">Acumulados por empleado ({fechaInicio} → {fechaFin})</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
            {acumulados.map(a => (
              <div key={a.numero + a.nombre} className="flex items-center justify-between px-3 py-1.5 rounded bg-white/5 text-xs">
                <span className="text-white truncate flex-1">{a.nombre}</span>
                <span className="text-slate-400 ml-2">{a.total} reg · {a.completas} ok · {a.sinSalida} sin salida</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-center py-12 text-slate-400">Cargando...</div>
        ) : asistencias.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">No hay registros para esta fecha</p>
          </div>
        ) : (
          <div className="space-y-3">
            {asistencias.map(a => (
              <div key={a.id} className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${a.hora_salida ? "bg-emerald-500/20" : "bg-aria-primary-light"}`}>
                    {a.hora_salida ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <Clock className="w-5 h-5 text-aria-accent" />}
                  </div>
                  <div>
                    <p className="font-medium text-white">{a.employees?.full_name || "Sin nombre"}</p>
                    <p className="text-sm text-slate-400">{a.employees?.employee_number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-slate-400">Entrada</p>
                    <p className="text-white font-medium">{a.hora_entrada || "--:--"}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-400">Salida</p>
                    <p className="text-white font-medium">{a.hora_salida || "--:--"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className={`w-4 h-4 ${a.dentro_geocerca_entrada ? "text-emerald-400" : "text-red-400"}`} />
                    <span className={a.dentro_geocerca_entrada ? "text-emerald-400" : "text-red-400"}>
                      {a.dentro_geocerca_entrada ? "OK" : "Fuera"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Registro Manual de Asistencia</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Empleado *</label>
                <select value={formManual.employee_id} onChange={e => setFormManual({...formManual, employee_id: e.target.value})} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-white/10">
                  <option value="">Seleccionar...</option>
                  {empleadosList.map(e => <option key={e.id} value={e.id}>{e.employee_number} - {e.full_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Fecha</label>
                  <input type="date" value={formManual.fecha} onChange={e => setFormManual({...formManual, fecha: e.target.value})} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-white/10" />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Entrada</label>
                  <input type="time" value={formManual.hora_entrada} onChange={e => setFormManual({...formManual, hora_entrada: e.target.value})} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-white/10" />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Salida</label>
                  <input type="time" value={formManual.hora_salida} onChange={e => setFormManual({...formManual, hora_salida: e.target.value})} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-white/10" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancelar</button>
              <button onClick={handleManual} disabled={saving || !formManual.employee_id} className="flex items-center gap-2 px-4 py-2 bg-aria-accent text-white rounded-lg text-sm hover:bg-aria-accent/80 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
