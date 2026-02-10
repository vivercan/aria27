"use client";
import { useState } from "react";
import { ArrowLeft, Clock, Plus, Trash2, Bell } from "lucide-react";
import Link from "next/link";

interface Recordatorio {
  id: number;
  titulo: string;
  frecuencia: string;
  dia: string;
  hora: string;
  activo: boolean;
}

const defaults: Recordatorio[] = [
  { id: 1, titulo: "Revisión de nómina semanal", frecuencia: "Semanal", dia: "Viernes", hora: "10:00", activo: true },
  { id: 2, titulo: "Cierre de asistencias", frecuencia: "Diario", dia: "Lunes a Viernes", hora: "18:00", activo: true },
  { id: 3, titulo: "Reporte mensual de compras", frecuencia: "Mensual", dia: "Último día", hora: "12:00", activo: false },
  { id: 4, titulo: "Revisión de préstamos activos", frecuencia: "Quincenal", dia: "Día 15 y 30", hora: "09:00", activo: true },
];

export default function RecordatoriosPage() {
  const [records, setRecords] = useState(defaults);

  const toggle = (id: number) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, activo: !r.activo } : r));
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 mb-6">
        <Link href="/dashboard/configuracion" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Configuración
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Recordatorios</h1>
            <p className="text-slate-400 text-sm mt-1">Tareas programadas y recordatorios automáticos</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Nuevo
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-3">
        {records.map(r => (
          <div key={r.id} className={`p-5 rounded-xl border transition-all ${r.activo ? "bg-white/[0.03] border-white/10" : "bg-white/[0.01] border-white/5 opacity-50"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${r.activo ? "bg-blue-500/20" : "bg-white/5"}`}>
                  <Bell className={`w-5 h-5 ${r.activo ? "text-blue-400" : "text-slate-500"}`} />
                </div>
                <div>
                  <h3 className="font-medium text-white">{r.titulo}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {r.frecuencia}</span>
                    <span className="text-xs text-slate-400">{r.dia}</span>
                    <span className="text-xs text-blue-400">{r.hora}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => toggle(r.id)} className={`relative w-11 h-6 rounded-full transition-colors ${r.activo ? "bg-blue-600" : "bg-slate-600"}`}>
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${r.activo ? "left-6" : "left-1"}`} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
