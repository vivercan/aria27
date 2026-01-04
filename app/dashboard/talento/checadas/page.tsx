"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Clock, MapPin, Download, Calendar, Search, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

interface Asistencia {
  id: string;
  employee_id: string;
  fecha: string;
  hora_entrada: string;
  hora_salida: string;
  latitud_entrada: number;
  longitud_entrada: number;
  dentro_geocerca_entrada: boolean;
  horas_trabajadas: number;
  retardo: boolean;
  minutos_retardo: number;
  notas: string;
  employee: {
    employee_number: string;
    full_name: string;
    position: string;
  };
}

export default function ClockInPage() {
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => { fetchAsistencias(); }, [fecha]);

  async function fetchAsistencias() {
    setLoading(true);
    const { data, error } = await supabase
      .from("asistencias")
      .select("*, employee:employees(employee_number, full_name, position)")
      .eq("fecha", fecha)
      .order("hora_entrada", { ascending: true });
    
    console.log("Asistencias data:", data, "Error:", error);
    if (data) setAsistencias(data);
    setLoading(false);
  }

  function formatTime(time: string | null) {
    if (!time) return "-";
    return time.substring(0, 5);
  }

  function calcHoras(entrada: string, salida: string) {
    if (!entrada || !salida) return "-";
    const [hE, mE] = entrada.split(":").map(Number);
    const [hS, mS] = salida.split(":").map(Number);
    const mins = (hS * 60 + mS) - (hE * 60 + mE);
    return Math.floor(mins / 60) + "h " + (mins % 60) + "m";
  }

  async function exportCSV() {
    const rows = asistencias.map(a => [
      a.employee?.employee_number || "",
      a.employee?.full_name || "",
      a.fecha,
      formatTime(a.hora_entrada),
      formatTime(a.hora_salida),
      a.horas_trabajadas || 0,
      a.retardo ? "Si" : "No",
      a.minutos_retardo || 0,
      a.dentro_geocerca_entrada ? "Si" : "No"
    ].map(v => '"' + v + '"').join(","));
    const csv = "No,Nombre,Fecha,Entrada,Salida,Horas,Retardo,MinRetardo,Geocerca\n" + rows.join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "asistencias_" + fecha + ".csv";
    link.click();
  }

  const filtered = asistencias.filter(a =>
    a.employee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.employee?.employee_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: filtered.length,
    completos: filtered.filter(a => a.hora_entrada && a.hora_salida).length,
    retardos: filtered.filter(a => a.retardo).length,
    fueraGeo: filtered.filter(a => !a.dentro_geocerca_entrada).length
  };

  const getMapUrl = (lat: number, lng: number) => "https://www.google.com/maps?q=" + lat + "," + lng;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Link href="/dashboard/talento" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm">
        ← Regresar al Panel
      </Link>

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="text-blue-400" />
            Control de Asistencia
          </h1>
          <p className="text-slate-400 text-sm">Registros de entrada y salida por WhatsApp</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAsistencias} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm">
            <RefreshCw size={16} /> Actualizar
          </button>
          <button onClick={exportCSV} disabled={asistencias.length === 0} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
            <Download size={16} /> Exportar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Registros</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Completos</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.completos}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Retardos</p>
          <p className="text-2xl font-bold text-amber-400">{stats.retardos}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Fuera Geocerca</p>
          <p className="text-2xl font-bold text-rose-400">{stats.fueraGeo}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-slate-400" />
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Buscar colaborador..." className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 text-white" onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-white/5 text-slate-100 uppercase text-xs font-bold">
              <tr>
                <th className="px-4 py-4">Empleado</th>
                <th className="px-4 py-4">Nombre</th>
                <th className="px-4 py-4 text-center">Entrada</th>
                <th className="px-4 py-4 text-center">Salida</th>
                <th className="px-4 py-4 text-center">Horas</th>
                <th className="px-4 py-4 text-center">Geocerca</th>
                <th className="px-4 py-4 text-center">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">No hay registros para {fecha}</td></tr>
              ) : filtered.map((a) => (
                <tr key={a.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-blue-300 font-mono text-xs">{a.employee?.employee_number}</td>
                  <td className="px-4 py-3 text-white">{a.employee?.full_name}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-emerald-400 font-mono">{formatTime(a.hora_entrada)}</span>
                    {a.latitud_entrada && (
                      <Link href={getMapUrl(a.latitud_entrada, a.longitud_entrada)} target="_blank" className="ml-1 text-slate-500 hover:text-blue-400">
                        <MapPin size={12} className="inline" />
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-blue-400 font-mono">{formatTime(a.hora_salida)}</td>
                  <td className="px-4 py-3 text-center text-white">{calcHoras(a.hora_entrada, a.hora_salida)}</td>
                  <td className="px-4 py-3 text-center">
                    {a.dentro_geocerca_entrada ? <CheckCircle size={18} className="text-emerald-400 mx-auto" /> : <XCircle size={18} className="text-rose-400 mx-auto" />}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {a.retardo ? (
                      <span className="px-2 py-1 rounded text-xs bg-amber-500/20 text-amber-400">Retardo {a.minutos_retardo}min</span>
                    ) : a.hora_entrada && a.hora_salida ? (
                      <span className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400">Completo</span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">En curso</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <h3 className="text-blue-400 font-semibold mb-2">Instrucciones WhatsApp</h3>
        <p className="text-slate-300 text-sm">Para registrar asistencia enviar al numero del sistema:</p>
        <ul className="text-slate-400 text-sm mt-2 space-y-1">
          <li>Entrada: Ubicacion + texto "Entrada: Juan, Pedro, Carlos"</li>
          <li>Salida: Ubicacion + texto "Salida: Juan, Pedro, Carlos"</li>
        </ul>
      </div>
    </div>
  );
}
