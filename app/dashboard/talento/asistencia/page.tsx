"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";

interface Asistencia {
  id: string;
  employee_name: string;
  employee_phone: string;
  date: string;
  check_in_time: string | null;
  check_in_valid: boolean | null;
  check_out_time: string | null;
  check_out_valid: boolean | null;
  work_center_name: string;
}

export default function AsistenciaPage() {
  const [records, setRecords] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [stats, setStats] = useState({ total: 0, onTime: 0, late: 0, absent: 0 });

  const supabase = createClient();

  useEffect(() => { loadAsistencia(); }, [dateFilter]);

  async function loadAsistencia() {
    setLoading(true);
    const { data } = await supabase
      .from("Asistencia")
      .select("*")
      .eq("date", dateFilter)
      .order("check_in_time", { ascending: true });

    const { data: totalPersonal } = await supabase.from("Personal").select("id").eq("active", true);
    
    const attended = data?.length || 0;
    const onTime = data?.filter(r => r.check_in_valid).length || 0;
    const late = data?.filter(r => !r.check_in_valid).length || 0;
    const absent = (totalPersonal?.length || 0) - attended;

    setStats({ total: totalPersonal?.length || 0, onTime, late, absent });
    setRecords(data || []);
    setLoading(false);
  }

  function formatTime(iso: string | null) {
    if (!iso) return "-";
    return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Control de Asistencia</h1>
          <p className="text-slate-400 text-sm">Registro de entradas y salidas por WhatsApp</p>
        </div>
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-slate-400 text-sm">Total Empleados</p>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
          <p className="text-green-400 text-sm">En Zona</p>
          <p className="text-3xl font-bold text-green-400">{stats.onTime}</p>
        </div>
        <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30">
          <p className="text-yellow-400 text-sm">Fuera de Zona</p>
          <p className="text-3xl font-bold text-yellow-400">{stats.late}</p>
        </div>
        <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
          <p className="text-red-400 text-sm">Sin Registrar</p>
          <p className="text-3xl font-bold text-red-400">{stats.absent}</p>
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-900/50 text-slate-400 text-sm">
              <th className="p-4 text-left">Empleado</th>
              <th className="p-4 text-left">Centro</th>
              <th className="p-4 text-left">Entrada</th>
              <th className="p-4 text-left">Salida</th>
              <th className="p-4 text-left">Horas</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const hoursWorked = r.check_in_time && r.check_out_time 
                ? ((new Date(r.check_out_time).getTime() - new Date(r.check_in_time).getTime()) / 3600000).toFixed(1)
                : "-";
              return (
                <tr key={r.id} className="border-t border-slate-700/50 hover:bg-slate-700/30">
                  <td className="p-4">
                    <p className="text-white font-medium">{r.employee_name}</p>
                    <p className="text-slate-500 text-sm">{r.employee_phone}</p>
                  </td>
                  <td className="p-4 text-slate-300">{r.work_center_name}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-sm ${r.check_in_valid ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                      {formatTime(r.check_in_time)} {r.check_in_valid ? "✓" : "⚠"}
                    </span>
                  </td>
                  <td className="p-4">
                    {r.check_out_time ? (
                      <span className={`px-2 py-1 rounded text-sm ${r.check_out_valid ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                        {formatTime(r.check_out_time)} {r.check_out_valid ? "✓" : "⚠"}
                      </span>
                    ) : <span className="text-slate-500">-</span>}
                  </td>
                  <td className="p-4 text-white font-mono">{hoursWorked}h</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {records.length === 0 && !loading && <div className="p-8 text-center text-slate-400">No hay registros para esta fecha</div>}
        {loading && <div className="p-8 text-center text-slate-400">Cargando...</div>}
      </div>
    </div>
  );
}
