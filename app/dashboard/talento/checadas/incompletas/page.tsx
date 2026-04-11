"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Clock, Check, Plus, RefreshCw, Calendar, Users, CheckCircle2, Loader2 } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";

interface Incompleta {
  id?: string;
  employee_id: string;
  empleado: string;
  numero: string;
  fecha: string;
  hora_entrada?: string;
  tipo: "SIN_SALIDA" | "SIN_REGISTRO";
}

export default function IncompletasPage() {
  const [incompletas, setIncompletas] = useState<Incompleta[]>([]);
  const [sinRegistro, setSinRegistro] = useState<Incompleta[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{tipo: "success" | "error"; texto: string} | null>(null);
  const [periodo, setPeriodo] = useState<{inicio: string; fin: string} | null>(null);
  const [confirmState, setConfirmState] = useState<{open: boolean; msg: string; onOk: () => void}>({open: false, msg: "", onOk: () => {}});
  const closeConfirm = () => setConfirmState(s => ({...s, open: false}));

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/asistencias/incompletas");
      const data = await res.json();
      setIncompletas(data.incompletas || []);
      setSinRegistro(data.sinRegistro || []);
      setPeriodo(data.periodo || null);
    } catch (error: unknown) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const completarSalida = async (item: Incompleta) => {
    setProcesando(item.id || `${item.employee_id}-${item.fecha}`);
    try {
      const res = await fetch("/api/asistencias/incompletas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asistencia_id: item.id,
          hora_salida: "18:00",
          notas: "Salida completada manualmente"
        })
      });
      if (res.ok) {
        setMensaje({ tipo: "success", texto: `✓ Salida registrada para ${item.empleado}` });
        setIncompletas(prev => prev.filter(a => a.id !== item.id));
      } else {
        const err = await res.json();
        setMensaje({ tipo: "error", texto: err.error || "Error al registrar" });
      }
    } catch (error: unknown) {
      setMensaje({ tipo: "error", texto: "Error de conexión" });
    } finally {
      setProcesando(null);
      setTimeout(() => setMensaje(null), 3000);
    }
  };

  const crearAsistencia = async (item: Incompleta) => {
    setProcesando(`${item.employee_id}-${item.fecha}`);
    try {
      const res = await fetch("/api/asistencias/incompletas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: item.employee_id,
          fecha: item.fecha,
          hora_entrada: "08:00",
          hora_salida: "18:00"
        })
      });
      if (res.ok) {
        setMensaje({ tipo: "success", texto: `✓ Asistencia creada para ${item.empleado} - ${item.fecha}` });
        setSinRegistro(prev => prev.filter(a => !(a.employee_id === item.employee_id && a.fecha === item.fecha)));
      } else {
        const err = await res.json();
        setMensaje({ tipo: "error", texto: err.error || "Error al crear" });
      }
    } catch (error: unknown) {
      setMensaje({ tipo: "error", texto: "Error de conexión" });
    } finally {
      setProcesando(null);
      setTimeout(() => setMensaje(null), 3000);
    }
  };

  const crearTodasAsistencias = async () => {
    setConfirmState({
      open: true,
      msg: `¿Crear ${sinRegistro.length} asistencias faltantes con horario 08:00-18:00?`,
      onOk: async () => {
        closeConfirm();
        let creadas = 0;
    for (const item of sinRegistro) {
      setProcesando(`${item.employee_id}-${item.fecha}`);
      try {
        const res = await fetch("/api/asistencias/incompletas", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employee_id: item.employee_id,
            fecha: item.fecha,
            hora_entrada: "08:00",
            hora_salida: "18:00"
          })
        });
        if (res.ok) creadas++;
      } catch (e: unknown) {}
    }
    
        setProcesando(null);
        setMensaje({ tipo: "success", texto: `✓ ${creadas} asistencias creadas` });
        await cargarDatos();
        setTimeout(() => setMensaje(null), 3000);
      }
    });
  };

  const completarTodasSalidas = async () => {
    setConfirmState({
      open: true,
      msg: `¿Completar salida de ${incompletas.length} registros con hora 18:00?`,
      onOk: async () => {
        closeConfirm();
        let completadas = 0;
    for (const item of incompletas) {
      setProcesando(item.id || null);
      try {
        const res = await fetch("/api/asistencias/incompletas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            asistencia_id: item.id,
            hora_salida: "18:00"
          })
        });
        if (res.ok) completadas++;
      } catch (e: unknown) {}
    }
    
        setProcesando(null);
        setMensaje({ tipo: "success", texto: `✓ ${completadas} salidas registradas` });
        await cargarDatos();
        setTimeout(() => setMensaje(null), 3000);
      }
    });
  };

  const totalPendientes = incompletas.length + sinRegistro.length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-slate-950 via-slate-950/95 to-transparent pb-4 flex items-center gap-4">
        <Link href="/dashboard/talento/checadas" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Asistencias Pendientes</h1>
            <p className="text-slate-400 text-sm">
              {periodo ? `Semana: ${periodo.inicio} al ${periodo.fin}` : <Loader2 className="w-6 h-6 animate-spin text-aria-accent mx-auto" />}
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={cargarDatos} disabled={loading} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
            <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mensaje */}
      {mensaje && (
        <div className={`p-4 rounded-xl border ${mensaje.tipo === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
          {mensaje.texto}
        </div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
          <p className="text-slate-400 text-sm">Sin Salida</p>
          <p className="text-3xl font-bold text-amber-400">{incompletas.length}</p>
        </div>
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
          <p className="text-slate-400 text-sm">Sin Registro</p>
          <p className="text-3xl font-bold text-red-400">{sinRegistro.length}</p>
        </div>
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
          <p className="text-slate-400 text-sm">Total Pendientes</p>
          <p className="text-3xl font-bold text-white">{totalPendientes}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando...</div>
      ) : totalPendientes === 0 ? (
        <div className="text-center py-16 rounded-2xl bg-white/5 border border-white/10">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">¡Todo en orden!</h3>
          <p className="text-slate-400 mb-6">No hay asistencias pendientes de completar</p>
          <Link href="/dashboard/talento/checadas" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-aria-primary text-white hover:bg-aria-primary transition-colors">
            Ir a Nómina
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sección: Sin Registro (Días que no checaron) */}
          {sinRegistro.length > 0 && (
            <div className="rounded-2xl bg-white/5 border border-red-500/20 overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-red-500/10">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-red-400" />
                  <h2 className="text-lg font-semibold text-white">Días Sin Registro ({sinRegistro.length})</h2>
                </div>
                <button onClick={crearTodasAsistencias} disabled={!!procesando} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50">
                  <Plus className="w-4 h-4 inline mr-1" />
                  Crear Todas (08:00-18:00)
                </button>
              </div>
              <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                {sinRegistro.map((item, i) => (
                  <div key={`${item.employee_id}-${item.fecha}`} className="p-4 flex items-center justify-between hover:bg-white/5">
                    <div>
                      <p className="text-white font-medium">{item.empleado}</p>
                      <p className="text-slate-400 text-sm">{item.numero} • {new Date(item.fecha + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}</p>
                    </div>
                    <button 
                      onClick={() => crearAsistencia(item)} 
                      disabled={procesando === `${item.employee_id}-${item.fecha}`}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-sm transition-colors disabled:opacity-50"
                    >
                      {procesando === `${item.employee_id}-${item.fecha}` ? "..." : "Crear 08-18"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sección: Sin Salida */}
          {incompletas.length > 0 && (
            <div className="rounded-2xl bg-white/5 border border-amber-500/20 overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-amber-500/10">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-semibold text-white">Sin Hora de Salida ({incompletas.length})</h2>
                </div>
                <button onClick={completarTodasSalidas} disabled={!!procesando} className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors disabled:opacity-50">
                  <Check className="w-4 h-4 inline mr-1" />
                  Completar Todas (18:00)
                </button>
              </div>
              <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                {incompletas.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-white/5">
                    <div>
                      <p className="text-white font-medium">{item.empleado}</p>
                      <p className="text-slate-400 text-sm">{item.numero} • {item.fecha} • Entrada: {item.hora_entrada}</p>
                    </div>
                    <button 
                      onClick={() => completarSalida(item)} 
                      disabled={procesando === item.id}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-sm transition-colors disabled:opacity-50"
                    >
                      {procesando === item.id ? "..." : "Salida 18:00"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nota */}
      <div className="p-4 rounded-xl bg-aria-primary/10 border border-aria-primary/20">
        <p className="text-aria-accent text-sm">
          <strong>Nota:</strong> Los días sin registro se crean con horario estándar 08:00-18:00.
          Después de corregir, regresa a Nómina y haz clic en "Generar Pre-nómina" para actualizar.
        </p>
      </div>

      <ConfirmModal
        open={confirmState.open}
        message={confirmState.msg}
        onConfirm={() => { confirmState.onOk(); closeConfirm(); }}
        onCancel={closeConfirm}
      />
    </div>
  );
}

