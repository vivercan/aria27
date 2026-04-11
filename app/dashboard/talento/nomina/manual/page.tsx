"use client";
import { clientLogger } from "@/lib/client-logger";
import DeleteModal from "@/components/DeleteModal";
import { useDeletePermission } from "@/lib/use-delete-permission";
import { backupAndDelete } from "@/lib/backup-delete";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Edit3, Trash2, Plus, Save, RefreshCw, Loader2, Calendar, Clock, User, AlertCircle, Check } from "lucide-react";

interface Empleado {
  id: string;
  employee_number: string;
  full_name: string;
  position: string;
  salario_diario: number;
  minimo_tarjeta: number;
}

interface Asistencia {
  id: string;
  employee_id: string;
  fecha: string;
  hora_entrada: string;
  hora_salida: string;
  dentro_geocerca_entrada: boolean;
  notas: string;
  editando?: boolean;
  nueva?: boolean;
}

function getWeekRange(date: Date): { inicio: string; fin: string; dias: string[] } {
  const log = clientLogger("MANUAL");
  const d = new Date(date);
  const day = d.getDay();
  const diffToThursday = day >= 4 ? day - 4 : day + 3;
  const jueves = new Date(d);
  jueves.setDate(d.getDate() - diffToThursday);
  
  const dias: string[] = [];
  for (let i = 0; i < 7; i++) {
    const fecha = new Date(jueves);
    fecha.setDate(jueves.getDate() + i);
    if (fecha.getDay() !== 0) { // Excluir domingo
      dias.push(fecha.toISOString().split("T")[0]);
    }
  }
  
  const miercoles = new Date(jueves);
  miercoles.setDate(jueves.getDate() + 6);
  
  return {
    inicio: jueves.toISOString().split("T")[0],
    fin: miercoles.toISOString().split("T")[0],
    dias
  };
}

export default function NominaManualPage() {
  const log = clientLogger("NOMINA_MANUAL");
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const { userEmail, canDelete } = useDeletePermission();
  const [deleteModal, setDeleteModal] = useState<{open:boolean;id:string;name:string}>
    ({open:false,id:"",name:""});
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<string>("");
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{tipo: "success" | "error"; texto: string} | null>(null);
  const [semanaInfo, setSemanaInfo] = useState({ inicio: "", fin: "", dias: [] as string[] });
  const [refDate, setRefDate] = useState<Date>(new Date());
  const [calculo, setCalculo] = useState({ dias: 0, salarioBase: 0, neto: 0 });
  const [nominaStatus, setNominaStatus] = useState<string | null>(null);
  const [filtroEmp, setFiltroEmp] = useState("");

  useEffect(() => {
    const { inicio, fin, dias } = getWeekRange(refDate);
    setSemanaInfo({ inicio, fin, dias });
    cargarEmpleados();
  }, [refDate]);

  const shiftWeek = (delta: number) => {
    const d = new Date(refDate); d.setDate(d.getDate() + delta * 7); setRefDate(d);
  };
  const irHoy = () => setRefDate(new Date());

  useEffect(() => {
    if (empleadoSeleccionado) { cargarAsistencias(); checarNominaStatus(); }
    else { setNominaStatus(null); }
  }, [empleadoSeleccionado, semanaInfo.inicio]);

  const checarNominaStatus = async () => {
    if (!empleadoSeleccionado || !semanaInfo.inicio) return;
    const { data } = await supabase
      .from("nomina_historico")
      .select("status,id")
      .eq("employee_id", empleadoSeleccionado)
      .gte("fecha_inicio", semanaInfo.inicio)
      .lte("fecha_fin", semanaInfo.fin)
      .maybeSingle();
    setNominaStatus(((data as {status?: string | null}) || {}).status || null);
  };

  useEffect(() => {
    calcularNomina();
  }, [asistencias, empleadoSeleccionado]);

  const cargarEmpleados = async () => {
    const { data } = await supabase
      .from("Personal")
      .select("id, employee_number, full_name, position, salario_diario, minimo_tarjeta")
      .eq("status", "ACTIVO")
      .order("full_name");
    if (data) setEmpleados(data);
    setLoading(false);
  };

  const cargarAsistencias = async () => {
    if (!empleadoSeleccionado || !semanaInfo.inicio) return;
    
    const { data } = await supabase
      .from("asistencias")
      .select("*")
      .eq("employee_id", empleadoSeleccionado)
      .gte("fecha", semanaInfo.inicio)
      .lte("fecha", semanaInfo.fin)
      .order("fecha");
    
    setAsistencias(data || []);
  };

  const calcularNomina = () => {
    const emp = empleados.find(e => e.id === empleadoSeleccionado);
    if (!emp) {
      setCalculo({ dias: 0, salarioBase: 0, neto: 0 });
      return;
    }
    
    const diasTrabajados = asistencias.filter(a => !a.nueva || a.hora_entrada).length;
    const salarioBase = diasTrabajados * (emp.salario_diario || 0);
    const neto = salarioBase; // Sin deducciones por ahora
    
    setCalculo({ dias: diasTrabajados, salarioBase, neto });
  };

  const getDiaNombre = (fecha: string) => {
    const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    return dias[new Date(fecha + "T12:00:00").getDay()];
  };

  const tieneAsistencia = (fecha: string) => asistencias.some(a => a.fecha === fecha);

  const agregarAsistencia = (fecha: string) => {
    if (nominaStatus === "CONFIRMADA") { setMensaje({tipo:"error",texto:"❌ Nómina CONFIRMADA. Desbloquéala desde Recibos para agregar asistencias."}); return; }
    const nueva: Asistencia = {
      id: `new-${Date.now()}`,
      employee_id: empleadoSeleccionado,
      fecha,
      hora_entrada: "08:30",
      hora_salida: "17:30",
      dentro_geocerca_entrada: true,
      notas: "Registro manual",
      editando: true,
      nueva: true
    };
    setAsistencias([...asistencias, nueva].sort((a, b) => a.fecha.localeCompare(b.fecha)));
  };

  const editarAsistencia = (id: string) => {
    if (nominaStatus === "CONFIRMADA") { setMensaje({tipo:"error",texto:"❌ Nómina CONFIRMADA. Desbloquéala desde Recibos para editar asistencias."}); return; }
    setAsistencias(asistencias.map(a => a.id === id ? { ...a, editando: true } : a));
  };

  const cancelarEdicion = (id: string) => {
    if (id.startsWith("new-")) {
      setAsistencias(asistencias.filter(a => a.id !== id));
    } else {
      cargarAsistencias();
    }
  };

  const actualizarAsistencia = (id: string, campo: string, valor: string) => {
    setAsistencias(asistencias.map(a => a.id === id ? { ...a, [campo]: valor } : a));
  };

  const eliminarAsistencia = async (id: string) => {
    if (id.startsWith("new-")) {
      setAsistencias(asistencias.filter(a => a.id !== id));
      return;
    }
    if (nominaStatus === "CONFIRMADA") { setMensaje({tipo:"error",texto:"❌ Nómina CONFIRMADA. Desbloquéala desde Recibos para eliminar asistencias."}); return; }
    setDeleteModal({open:true,id,name:""}); return; // Protected by DeleteModal
    
    const { error } = await supabase.from("asistencias").delete().eq("id", id);
    if (error) {
      setMensaje({ tipo: "error", texto: ((error as {message?: string})?.message) || "Error" });
    } else {
      setAsistencias(asistencias.filter(a => a.id !== id));
      setMensaje({ tipo: "success", texto: "Asistencia eliminada" });
    }
  };

  const guardarCambios = async () => {
    setGuardando(true);
    setMensaje(null);
    
    try {
      for (const a of asistencias.filter(x => x.editando)) {
        if (a.nueva) {
          const { error } = await supabase.from("asistencias").insert({
            employee_id: a.employee_id,
            fecha: a.fecha,
            hora_entrada: a.hora_entrada,
            hora_salida: a.hora_salida,
            dentro_geocerca_entrada: true,
            dentro_geocerca_salida: true,
            notas: a.notas || "Registro manual",
            latitud_entrada: 21.9188,
            longitud_entrada: -102.2923,
            latitud_salida: 21.9188,
            longitud_salida: -102.2923
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.from("asistencias").update({
            hora_entrada: a.hora_entrada,
            hora_salida: a.hora_salida,
            notas: a.notas
          }).eq("id", a.id);
          if (error) throw error;
        }
      }
      
      setMensaje({ tipo: "success", texto: "✅ Cambios guardados correctamente" });
      await cargarAsistencias();
    } catch (e: unknown) {
      setMensaje({ tipo: "error", texto: (e as {message?: string})?.message ?? "Error" });
    }
    
    setGuardando(false);
  };

  const recalcularNominaDB = async () => {
    // Actualizar nómina en nomina_historico si existe
    const emp = empleados.find(e => e.id === empleadoSeleccionado);
    if (!emp) return;

    if (nominaStatus === "CONFIRMADA") {
      setMensaje({ tipo: "error", texto: "❌ Nómina CONFIRMADA. Desbloquéala desde Recibos antes de recalcular." });
      return;
    }

    const { data: nominaExistente } = await supabase
      .from("nomina_historico")
      .select("id,status")
      .eq("employee_id", empleadoSeleccionado)
      .gte("fecha_inicio", semanaInfo.inicio)
      .lte("fecha_fin", semanaInfo.fin)
      .maybeSingle();

    if (nominaExistente) {
      if (((nominaExistente as {status?: string}) || {}).status === "CONFIRMADA") {
        setMensaje({ tipo: "error", texto: "❌ Nómina CONFIRMADA. Desbloquéala desde Recibos antes de recalcular." });
        return;
      }
      const { error } = await supabase.from("nomina_historico").update({
        dias_trabajados: calculo.dias,
        salario_base: calculo.salarioBase,
        total_percepciones: calculo.salarioBase,
        sueldo_neto: calculo.neto,
        pago_tarjeta: Math.min(calculo.neto, emp.minimo_tarjeta || 1096),
        pago_efectivo: Math.max(0, calculo.neto - (emp.minimo_tarjeta || 1096))
      }).eq("id", nominaExistente.id);
      
      if (error) {
        setMensaje({ tipo: "error", texto: ((error as {message?: string})?.message) || "Error" });
      } else {
        setMensaje({ tipo: "success", texto: "✅ Nómina recalculada y actualizada" });
      }
    } else {
      setMensaje({ tipo: "error", texto: "No hay nómina generada para esta semana. Genera la nómina primero." });
    }
  };

  const formatMoney = (n: number) => `$${(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
  const formatDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" });

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-aria-accent" /></div>;

  const empleadoActual = empleados.find(e => e.id === empleadoSeleccionado);
  const hayEdiciones = asistencias.some(a => a.editando);
  const confirmDelete = async () => {
    try {
      await backupAndDelete({ table: "asistencias", id: deleteModal.id, userEmail });
    } catch (e: unknown) { log.error(String(e)); }
    setDeleteModal({open:false,id:"",name:""});
    cargarEmpleados();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/talento/nomina" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20">
            <Edit3 className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Nómina Manual</h1>
            <p className="text-slate-400 text-sm">{formatDate(semanaInfo.inicio)} – {formatDate(semanaInfo.fin)} | Editar asistencias y recalcular</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => shiftWeek(-1)} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10">‹</button>
          <button onClick={irHoy} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-sm">Hoy</button>
          <button onClick={() => shiftWeek(1)} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10">›</button>
          {nominaStatus && (
            <span className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${nominaStatus === "CONFIRMADA" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" : "bg-amber-500/20 border-amber-500/30 text-amber-300"}`}>
              {nominaStatus}
            </span>
          )}
        </div>
      </div>

      {/* Selector de empleado */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Filtrar empleados por nombre/puesto..."
            value={filtroEmp}
            onChange={e => setFiltroEmp(e.target.value)}
            className="flex-1 max-w-xs px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-aria-accent/50 text-sm"
          />
          <select
            value={empleadoSeleccionado}
            onChange={e => setEmpleadoSeleccionado(e.target.value)}
            className="flex-1 max-w-md px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-aria-accent/50"
          >
            <option value="">-- Selecciona un empleado --</option>
            {empleados
              .filter(e => !filtroEmp || `${e.full_name} ${e.position}`.toLowerCase().includes(filtroEmp.toLowerCase()))
              .map(e => (<option key={e.id} value={e.id}>{e.full_name} — {e.position}</option>))}
          </select>
          <span className="text-slate-500 text-xs self-center">{empleados.length} activos</span>
        </div>
      </div>

      {/* Mensaje */}
      {mensaje && (
        <div className={`p-4 rounded-xl border ${mensaje.tipo === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
          {mensaje.texto}
        </div>
      )}

      {empleadoSeleccionado && (
        <>
          {/* Info empleado y cálculo */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-aria-primary/10 to-aria-accent/5 border border-aria-primary/20">
              <div className="flex items-center gap-2 mb-1"><User className="w-4 h-4 text-aria-accent" /><span className="text-slate-400 text-xs">Empleado</span></div>
              <p className="text-white font-medium truncate">{empleadoActual?.full_name}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-1"><Calendar className="w-4 h-4 text-emerald-400" /><span className="text-slate-400 text-xs">Días Trabajados</span></div>
              <p className="text-2xl font-bold text-emerald-400">{calculo.dias}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-1"><span className="text-slate-400 text-xs">Salario Base</span></div>
              <p className="text-2xl font-bold text-purple-400">{formatMoney(calculo.salarioBase)}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-1"><span className="text-slate-400 text-xs">Neto Estimado</span></div>
              <p className="text-2xl font-bold text-amber-400">{formatMoney(calculo.neto)}</p>
            </div>
          </div>

          {/* Tabla de asistencias */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-medium">Asistencias de la Semana</h3>
              <div className="flex gap-2">
                {hayEdiciones && (
                  <button onClick={guardarCambios} disabled={guardando} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-500 text-white font-medium hover:from-emerald-600 hover:to-emerald-600 transition-all disabled:opacity-50">
                    {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar
                  </button>
                )}
                <button onClick={recalcularNominaDB} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all">
                  <RefreshCw className="w-4 h-4" />
                  Recalcular Nómina
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50 sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-slate-400 font-medium text-sm">Fecha</th>
                    <th className="text-left p-4 text-slate-400 font-medium text-sm">Día</th>
                    <th className="text-center p-4 text-slate-400 font-medium text-sm">Entrada</th>
                    <th className="text-center p-4 text-slate-400 font-medium text-sm">Salida</th>
                    <th className="text-left p-4 text-slate-400 font-medium text-sm">Notas</th>
                    <th className="text-center p-4 text-slate-400 font-medium text-sm">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {semanaInfo.dias.map(fecha => {
                    const asist = asistencias.find(a => a.fecha === fecha);
                    
                    if (asist) {
                      return (
                        <tr key={fecha} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="p-4 text-white">{formatDate(fecha)}</td>
                          <td className="p-4 text-slate-400">{getDiaNombre(fecha)}</td>
                          <td className="p-4 text-center">
                            {asist.editando ? (
                              <input type="time" value={asist.hora_entrada?.substring(0,5) || ""} onChange={e => actualizarAsistencia(asist.id, "hora_entrada", e.target.value)} className="px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-center w-24" />
                            ) : (
                              <span className="text-emerald-400">{asist.hora_entrada?.substring(0,5)}</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {asist.editando ? (
                              <input type="time" value={asist.hora_salida?.substring(0,5) || ""} onChange={e => actualizarAsistencia(asist.id, "hora_salida", e.target.value)} className="px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-center w-24" />
                            ) : (
                              <span className="text-aria-accent">{asist.hora_salida?.substring(0,5)}</span>
                            )}
                          </td>
                          <td className="p-4">
                            {asist.editando ? (
                              <input type="text" value={asist.notas || ""} onChange={e => actualizarAsistencia(asist.id, "notas", e.target.value)} className="px-2 py-1 rounded bg-white/10 border border-white/20 text-white w-full" placeholder="Notas..." />
                            ) : (
                              <span className="text-slate-500 text-sm">{asist.notas}</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {asist.editando ? (
                                <button onClick={() => cancelarEdicion(asist.id)} className="p-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700">
                                  ✕
                                </button>
                              ) : (
                                <button onClick={() => editarAsistencia(asist.id)} className="p-1.5 rounded-lg bg-aria-primary-light text-aria-accent hover:bg-aria-primary-hover/30">
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              )}
                              {canDelete && (<button onClick={() => eliminarAsistencia(asist.id)} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30">
                                <Trash2 className="w-4 h-4" />
                              </button>)}
                            </div>
                          </td>
                        </tr>
                      );
                    } else {
                      return (
                        <tr key={fecha} className="border-b border-white/5 bg-red-500/5">
                          <td className="p-4 text-white">{formatDate(fecha)}</td>
                          <td className="p-4 text-slate-400">{getDiaNombre(fecha)}</td>
                          <td className="p-4 text-center" colSpan={3}>
                            <span className="text-red-400 text-sm">❌ Sin registro</span>
                          </td>
                          <td className="p-4 text-center">
                            <button onClick={() => agregarAsistencia(fecha)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 mx-auto">
                              <Plus className="w-4 h-4" />
                              Agregar
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Nota informativa */}
          <div className="p-4 rounded-xl bg-aria-primary/10 border border-aria-primary/20 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-aria-accent mt-0.5" />
            <div>
              <p className="text-aria-accent font-medium">Cómo se relaciona con Pre-Nómina y Recibos</p>
              <p className="text-slate-400 text-sm">Esta pantalla edita <b>asistencias reales</b> de la semana seleccionada. Los cambios afectan el cálculo en Pre-Nómina la próxima vez que se Genere. Si la nómina ya está <b>CONFIRMADA</b>, primero hay que desbloquearla desde Recibos. El "Neto Estimado" mostrado aquí es solo días×salario sin incidencias/préstamos — el cálculo oficial vive en /api/nomina/generar.</p>
            </div>
          </div>
        </>
      )}

      <DeleteModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({open:false,id:"",name:""})}
        onConfirm={confirmDelete}
        count={1}
        itemLabel="Asistencia"
      />
    </div>
  );
}
