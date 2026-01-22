"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Clock, Check, Trash2, RefreshCw, Calendar } from "lucide-react";

interface AsistenciaIncompleta {
  id: string;
  employee_id: string;
  empleado: string;
  numero: string;
  fecha: string;
  hora_entrada: string;
  ubicacion: string;
}

export default function IncompletasPage() {
  const [incompletas, setIncompletas] = useState<AsistenciaIncompleta[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{tipo: "success" | "error"; texto: string} | null>(null);
  const [horasSalida, setHorasSalida] = useState<Record<string, string>>({});

  const cargarIncompletas = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/asistencias/incompletas");
      const data = await res.json();
      setIncompletas(data.incompletas || []);
      
      // Inicializar horas de salida con 18:00 por defecto
      const horas: Record<string, string> = {};
      data.incompletas?.forEach((a: AsistenciaIncompleta) => {
        horas[a.id] = "18:00";
      });
      setHorasSalida(horas);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarIncompletas();
  }, []);

  const completarSalida = async (asistencia: AsistenciaIncompleta) => {
    setProcesando(asistencia.id);
    try {
      const res = await fetch("/api/asistencias/incompletas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asistencia_id: asistencia.id,
          hora_salida: horasSalida[asistencia.id] || "18:00",
          notas: "Salida completada manualmente desde panel de incompletas"
        })
      });
      
      if (res.ok) {
        setMensaje({ tipo: "success", texto: `Salida registrada para ${asistencia.empleado}` });
        setIncompletas(prev => prev.filter(a => a.id !== asistencia.id));
      } else {
        const err = await res.json();
        setMensaje({ tipo: "error", texto: err.error || "Error al registrar" });
      }
    } catch (error) {
      setMensaje({ tipo: "error", texto: "Error de conexión" });
    } finally {
      setProcesando(null);
      setTimeout(() => setMensaje(null), 3000);
    }
  };

  const eliminarAsistencia = async (asistencia: AsistenciaIncompleta) => {
    if (!confirm(`¿Eliminar la asistencia de ${asistencia.empleado} del ${asistencia.fecha}?`)) return;
    
    setProcesando(asistencia.id);
    try {
      const res = await fetch(`/api/asistencias/incompletas?id=${asistencia.id}`, {
        method: "DELETE"
      });
      
      if (res.ok) {
        setMensaje({ tipo: "success", texto: "Asistencia eliminada" });
        setIncompletas(prev => prev.filter(a => a.id !== asistencia.id));
      } else {
        setMensaje({ tipo: "error", texto: "Error al eliminar" });
      }
    } catch (error) {
      setMensaje({ tipo: "error", texto: "Error de conexión" });
    } finally {
      setProcesando(null);
      setTimeout(() => setMensaje(null), 3000);
    }
  };

  const completarTodas = async () => {
    if (!confirm(`¿Completar salida de ${incompletas.length} asistencias con hora 18:00?`)) return;
    
    for (const asist of incompletas) {
      await completarSalida(asist);
      await new Promise(r => setTimeout(r, 300)); // Pequeña pausa entre cada una
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/talento/checadas" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
                Asistencias Incompletas
              </h1>
              <p className="text-slate-400 text-sm">Registros sin hora de salida - No cuentan para nómina</p>
            </div>
          </div>
          <button
            onClick={cargarIncompletas}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div className={`p-4 rounded-lg ${mensaje.tipo === "success" ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300" : "bg-red-500/20 border border-red-500/30 text-red-300"}`}>
            {mensaje.texto}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-400 text-sm">Sin completar</p>
            <p className="text-3xl font-bold text-white">{incompletas.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-slate-400 text-sm">Acción rápida</p>
            <button
              onClick={completarTodas}
              disabled={incompletas.length === 0}
              className="mt-1 text-sm px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Completar todas (18:00)
            </button>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="w-8 h-8 text-slate-500 animate-spin" />
          </div>
        ) : incompletas.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
            <Check className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-white font-medium">¡Todo en orden!</p>
            <p className="text-slate-400 text-sm">No hay asistencias pendientes de completar</p>
            <Link href="/dashboard/talento/nomina" className="inline-block mt-4 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors">
              Ir a Nómina
            </Link>
          </div>
        ) : (
          <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr className="text-left text-sm text-slate-400">
                  <th className="px-4 py-3">Empleado</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Entrada</th>
                  <th className="px-4 py-3">Salida</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {incompletas.map((asist) => (
                  <tr key={asist.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{asist.empleado}</p>
                      <p className="text-slate-500 text-xs">{asist.numero}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        {asist.fecha}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Clock className="w-4 h-4" />
                        {asist.hora_entrada}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="time"
                        value={horasSalida[asist.id] || "18:00"}
                        onChange={(e) => setHorasSalida(prev => ({ ...prev, [asist.id]: e.target.value }))}
                        className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => completarSalida(asist)}
                          disabled={procesando === asist.id}
                          className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg disabled:opacity-50 transition-colors"
                          title="Completar salida"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => eliminarAsistencia(asist)}
                          disabled={procesando === asist.id}
                          className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg disabled:opacity-50 transition-colors"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Info */}
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-blue-300 text-sm">
            <strong>Nota:</strong> Las asistencias sin salida NO se cuentan para el cálculo de nómina. 
            Complete las salidas faltantes y luego regenere la nómina.
          </p>
        </div>
      </div>
    </div>
  );
}
