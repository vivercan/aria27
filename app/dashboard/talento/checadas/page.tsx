"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Calendar, Clock, MapPin, CheckCircle, XCircle, Filter } from "lucide-react";
import Link from "next/link";

interface Asistencia {
  id: string;
  fecha: string;
  hora_entrada: string | null;
  hora_salida: string | null;
  dentro_geocerca_entrada: boolean;
  tipo_registro: string;
  employees: { full_name: string; employee_number: string } | null;
}

export default function ChecadasPage() {
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => { cargarAsistencias(); }, [fecha]);

  const cargarAsistencias = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("asistencias")
      .select("*, employees(full_name, employee_number)")
      .eq("fecha", fecha)
      .order("hora_entrada", { ascending: true });
    if (data) setAsistencias(data);
    setLoading(false);
  };

  const stats = {
    total: asistencias.length,
    completas: asistencias.filter(a => a.hora_entrada && a.hora_salida).length,
    enSitio: asistencias.filter(a => a.hora_entrada && !a.hora_salida).length,
    fueraGeocerca: asistencias.filter(a => !a.dentro_geocerca_entrada).length
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
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
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
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
          <div className="p-4 bg-green-500/10 rounded-xl">
            <p className="text-2xl font-bold text-green-400">{stats.completas}</p>
            <p className="text-sm text-slate-400">Completas</p>
          </div>
          <div className="p-4 bg-blue-500/10 rounded-xl">
            <p className="text-2xl font-bold text-blue-400">{stats.enSitio}</p>
            <p className="text-sm text-slate-400">En sitio</p>
          </div>
          <div className="p-4 bg-red-500/10 rounded-xl">
            <p className="text-2xl font-bold text-red-400">{stats.fueraGeocerca}</p>
            <p className="text-sm text-slate-400">Fuera de geocerca</p>
          </div>
        </div>
      </div>

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
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${a.hora_salida ? "bg-green-500/20" : "bg-blue-500/20"}`}>
                    {a.hora_salida ? <CheckCircle className="w-5 h-5 text-green-400" /> : <Clock className="w-5 h-5 text-blue-400" />}
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
                    <MapPin className={`w-4 h-4 ${a.dentro_geocerca_entrada ? "text-green-400" : "text-red-400"}`} />
                    <span className={a.dentro_geocerca_entrada ? "text-green-400" : "text-red-400"}>
                      {a.dentro_geocerca_entrada ? "OK" : "Fuera"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


