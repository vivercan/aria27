"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar, Sun, User, Plus, Check, X } from "lucide-react";

interface Vacacion {
  id: string;
  employee_id: string;
  anio: number;
  dias_correspondientes: number;
  dias_tomados: number;
  employee?: { full_name: string; position: string; fecha_ingreso: string };
}

interface Solicitud {
  id: string;
  employee_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_solicitados: number;
  status: string;
  employee?: { full_name: string };
}

export default function VacacionesPage() {
  const [vacaciones, setVacaciones] = useState<Vacacion[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"saldos" | "solicitudes">("saldos");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const { data: vac } = await supabase
      .from("vacaciones_empleados")
      .select("*, employee:employees(full_name, position, fecha_ingreso)")
      .eq("anio", 2025)
      .order("employee(full_name)");
    if (vac) setVacaciones(vac);

    const { data: sol } = await supabase
      .from("solicitudes_vacaciones")
      .select("*, employee:employees(full_name)")
      .order("created_at", { ascending: false });
    if (sol) setSolicitudes(sol);
    setLoading(false);
  };

  const aprobarSolicitud = async (id: string) => {
    await supabase.from("solicitudes_vacaciones").update({ status: "APROBADA" }).eq("id", id);
    cargarDatos();
  };

  const rechazarSolicitud = async (id: string) => {
    await supabase.from("solicitudes_vacaciones").update({ status: "RECHAZADA" }).eq("id", id);
    cargarDatos();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Control de Vacaciones</h1>
          <p className="text-slate-400">Saldos y solicitudes de vacaciones 2025</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab("saldos")} className={`px-4 py-2 rounded-lg ${tab === "saldos" ? "bg-blue-600 text-white" : "bg-white/10 text-slate-300"}`}>
          Saldos por Empleado
        </button>
        <button onClick={() => setTab("solicitudes")} className={`px-4 py-2 rounded-lg ${tab === "solicitudes" ? "bg-blue-600 text-white" : "bg-white/10 text-slate-300"}`}>
          Solicitudes
        </button>
      </div>

      {tab === "saldos" && (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr className="text-left text-slate-400 text-sm">
                <th className="p-3">Empleado</th>
                <th className="p-3">Antigüedad</th>
                <th className="p-3 text-center">Días Corresponden</th>
                <th className="p-3 text-center">Días Tomados</th>
                <th className="p-3 text-center">Días Pendientes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Cargando...</td></tr>
              ) : vacaciones.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No hay registros de vacaciones</td></tr>
              ) : (
                vacaciones.map((v) => {
                  const antiguedad = v.employee?.fecha_ingreso ? Math.floor((Date.now() - new Date(v.employee.fecha_ingreso).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0;
                  const pendientes = v.dias_correspondientes - v.dias_tomados;
                  return (
                    <tr key={v.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="p-3">
                        <p className="text-white font-medium">{v.employee?.full_name}</p>
                        <p className="text-slate-400 text-xs">{v.employee?.position}</p>
                      </td>
                      <td className="p-3 text-slate-300">{antiguedad} años</td>
                      <td className="p-3 text-center text-white">{v.dias_correspondientes}</td>
                      <td className="p-3 text-center text-amber-400">{v.dias_tomados}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded font-medium ${pendientes > 0 ? "bg-green-500/20 text-green-400" : "bg-slate-500/20 text-slate-400"}`}>
                          {pendientes}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "solicitudes" && (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr className="text-left text-slate-400 text-sm">
                <th className="p-3">Empleado</th>
                <th className="p-3">Fecha Inicio</th>
                <th className="p-3">Fecha Fin</th>
                <th className="p-3 text-center">Días</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">No hay solicitudes</td></tr>
              ) : (
                solicitudes.map((s) => (
                  <tr key={s.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="p-3 text-white">{s.employee?.full_name}</td>
                    <td className="p-3 text-slate-300">{s.fecha_inicio}</td>
                    <td className="p-3 text-slate-300">{s.fecha_fin}</td>
                    <td className="p-3 text-center text-white">{s.dias_solicitados}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${s.status === "PENDIENTE" ? "bg-amber-500/20 text-amber-400" : s.status === "APROBADA" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {s.status === "PENDIENTE" && (
                        <div className="flex justify-center gap-2">
                          <button onClick={() => aprobarSolicitud(s.id)} className="p-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"><Check className="w-4 h-4" /></button>
                          <button onClick={() => rechazarSolicitud(s.id)} className="p-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"><X className="w-4 h-4" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
