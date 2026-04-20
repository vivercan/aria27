"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Calendar, Sun, User, Plus, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import AriaBackButton from "@/components/AriaBackButton";

interface Vacacion {
  id: string;
  employee_id: string;
  anio: number;
  dias_correspondientes: number;
  dias_tomados: number;
  // dias_pendientes se calcula: correspondientes - tomados
  employee?: { full_name: string; position: string };
}

interface Solicitud {
  id: string;
  employee_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_solicitados: number;
  status: string;
  motivo: string;
  employee?: { full_name: string };
  created_at: string;
}

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function VacacionesPage() {
  const [vacaciones, setVacaciones] = useState<Vacacion[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"calendario" | "saldos" | "solicitudes">("calendario");
  const [mesActual, setMesActual] = useState(new Date().getMonth());
  const [anioActual, setAnioActual] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [empleados, setEmpleados] = useState<{id: string; full_name: string}[]>([]);
  const [form, setForm] = useState({ employee_id: "", fecha_inicio: "", fecha_fin: "", motivo: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { msg, flash } = useFlashMessage();

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    const { data: vac } = await supabase
      .from("vacaciones_empleados")
      .select("*, employee:Personal(full_name, position)")
      .eq("anio", new Date().getFullYear());
    if (vac) setVacaciones(vac);

    const { data: sol } = await supabase
      .from("solicitudes_vacaciones")
      .select("*, employee:Personal(full_name)")
      .order("created_at", { ascending: false });
    if (sol) setSolicitudes(sol);

    const { data: emps } = await supabase
      .from("Personal")
      .select("id, full_name")
      .eq("status", "ACTIVO")
      .order("full_name");
    if (emps) setEmpleados(emps);

    setLoading(false);
  };

  const aprobarSolicitud = async (id: string, employee_id: string, dias: number) => {
    // Fase 1: aprobar solicitud (idempotente sobre la misma solicitud)
    const { data: solRow, error: solErr } = await supabase
      .from("solicitudes_vacaciones")
      .update({ status: "APROBADA", fecha_aprobacion: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "PENDIENTE")
      .select("id")
      .maybeSingle();
    if (solErr) { flash("err", "Error al aprobar: " + solErr.message); return; }
    if (!solRow) { flash("err", "Esta solicitud ya fue procesada por otro usuario. Recarga."); cargarDatos(); return; }

    // Fase 2: sumar días tomados con OPTIMISTIC LOCK para evitar race
    // (read → modify → write sin lock perdería días si dos aprobadores concurrentes).
    const anio = new Date().getFullYear();
    const { data: vac, error: readErr } = await supabase
      .from("vacaciones_empleados")
      .select("dias_tomados")
      .eq("employee_id", employee_id)
      .eq("anio", anio)
      .maybeSingle();
    if (readErr) { flash("err", "Aprobada, pero error leyendo días: " + readErr.message); cargarDatos(); return; }
    if (!vac) { flash("err", "Aprobada, pero no existe registro de vacaciones para este empleado/año."); cargarDatos(); return; }

    const expected = vac.dias_tomados;
    const nuevoTomados = (expected || 0) + dias;
    const { data: updRow, error: vacErr } = await supabase
      .from("vacaciones_empleados")
      .update({ dias_tomados: nuevoTomados })
      .eq("employee_id", employee_id)
      .eq("anio", anio)
      .eq("dias_tomados", expected)
      .select("dias_tomados")
      .maybeSingle();
    if (vacErr) { flash("err", "Aprobada, pero error al sumar días tomados: " + vacErr.message); }
    else if (!updRow) {
      flash("err", "Aprobada, pero los días tomados fueron modificados por otro usuario. Recarga y verifica el saldo.");
    }
    cargarDatos();
  };

  const rechazarSolicitud = async (id: string) => {
    const { error } = await supabase.from("solicitudes_vacaciones").update({ status: "RECHAZADA" }).eq("id", id);
    if (error) { flash("err", "Error al rechazar: " + (error as {message?: string})?.message || "Error desconocido"); return; }
    cargarDatos();
  };

  const calcularDias = () => {
    if (!form.fecha_inicio || !form.fecha_fin) return 0;
    const inicio = new Date(form.fecha_inicio);
    const fin = new Date(form.fecha_fin);
    const diff = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };

  const validar = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.employee_id?.trim()) errors.employee_id = "Seleccione un empleado";
    if (!form.fecha_inicio?.trim()) errors.fecha_inicio = "La fecha de inicio es obligatoria";
    if (!form.fecha_fin?.trim()) errors.fecha_fin = "La fecha de fin es obligatoria";
    const dias = calcularDias();
    if (dias <= 0) errors.fechas = "Las fechas son inválidas o fin antes que inicio";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const crearSolicitud = async () => {
    if (!validar()) return;

    const { error } = await supabase.from("solicitudes_vacaciones").insert({
      employee_id: form.employee_id,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
      dias_solicitados: calcularDias(),
      motivo: form.motivo,
      status: "PENDIENTE"
    });
    if (error) { flash("err", "Error al crear solicitud: " + (error as {message?: string})?.message || "Error desconocido"); return; }
    setShowModal(false);
    setForm({ employee_id: "", fecha_inicio: "", fecha_fin: "", motivo: "" });
    cargarDatos();
  };

  // Generar días del mes para el calendario
  const getDiasDelMes = () => {
    const primerDia = new Date(anioActual, mesActual, 1);
    const ultimoDia = new Date(anioActual, mesActual + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    const primerDiaSemana = primerDia.getDay();
    
    const dias = [];
    for (let i = 0; i < primerDiaSemana; i++) dias.push(null);
    for (let i = 1; i <= diasEnMes; i++) dias.push(i);
    return dias;
  };

  const getVacacionesEnDia = (dia: number) => {
    if (!dia) return [];
    const fecha = new Date(anioActual, mesActual, dia);
    return solicitudes.filter(s => {
      if (s.status !== "APROBADA") return false;
      const inicio = new Date(s.fecha_inicio);
      const fin = new Date(s.fecha_fin);
      return fecha >= inicio && fecha <= fin;
    });
  };

  const mesAnterior = () => {
    if (mesActual === 0) { setMesActual(11); setAnioActual(anioActual - 1); }
    else setMesActual(mesActual - 1);
  };

  const mesSiguiente = () => {
    if (mesActual === 11) { setMesActual(0); setAnioActual(anioActual + 1); }
    else setMesActual(mesActual + 1);
  };

  return (
    <div className="space-y-6">
      {msg && <FlashBanner msg={msg} className="mx-6 mt-3" />}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <AriaBackButton href="/dashboard/talento/prestaciones" />
          <div className="p-3 rounded-xl bg-amber-500/20">
            <Sun className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Vacaciones</h1>
            <p className="text-[#7f93b0] text-sm">Gestión de días de descanso</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-white font-medium">
          <Plus className="w-4 h-4" /> Nueva Solicitud
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/[0.08] pb-2">
        {[
          { id: "calendario", label: "Calendario", icon: Calendar },
          { id: "saldos", label: "Saldos", icon: User },
          { id: "solicitudes", label: "Solicitudes", icon: Sun }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${tab === t.id ? "bg-amber-600 text-white" : "text-[#7f93b0] hover:bg-white/[0.04]"}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-[#7f93b0] py-8">Cargando...</div>
      ) : (
        <>
          {/* CALENDARIO */}
          {tab === "calendario" && (
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <button onClick={mesAnterior} className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.06]">
                  <ChevronLeft className="w-5 h-5 text-[#7f93b0]" />
                </button>
                <h2 className="text-xl font-bold text-white">{MESES[mesActual]} {anioActual}</h2>
                <button onClick={mesSiguiente} className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.06]">
                  <ChevronRight className="w-5 h-5 text-[#7f93b0]" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-1">
                {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(d => (
                  <div key={d} className="text-center text-xs text-[#4a6080] py-2 font-medium">{d}</div>
                ))}
                {getDiasDelMes().map((dia, idx) => {
                  const vacEnDia = dia ? getVacacionesEnDia(dia) : [];
                  const esHoy = dia === new Date().getDate() && mesActual === new Date().getMonth() && anioActual === new Date().getFullYear();
                  return (
                    <div key={idx} className={`min-h-[80px] p-1 border border-white/[0.05] rounded-lg ${dia ? "bg-white/[0.02]" : ""} ${esHoy ? "ring-2 ring-amber-500" : ""}`}>
                      {dia && (
                        <>
                          <div className={`text-sm font-medium mb-1 ${esHoy ? "text-amber-400" : "text-[#7f93b0]"}`}>{dia}</div>
                          {vacEnDia.slice(0, 2).map((v, i) => (
                            <div key={i} className="text-xs bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded truncate mb-0.5">
                              {v.employee?.full_name?.split(" ")[0]}
                            </div>
                          ))}
                          {vacEnDia.length > 2 && <div className="text-xs text-[#4a6080]">+{vacEnDia.length - 2} más</div>}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SALDOS */}
          {tab === "saldos" && (
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/[0.04] sticky top-0 bg-[rgba(4,8,16,0.98)]  z-10">
                  <tr className="text-left text-xs text-[#7f93b0] uppercase">
                    <th className="px-4 py-3">Empleado</th>
                    <th className="px-4 py-3">Puesto</th>
                    <th className="px-4 py-3 text-center">Corresponden</th>
                    <th className="px-4 py-3 text-center">Tomados</th>
                    <th className="px-4 py-3 text-center">Pendientes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {vacaciones.map(v => (
                    <tr key={v.id} className="hover:bg-white/[0.04]">
                      <td className="px-4 py-3 text-white font-medium">{v.employee?.full_name}</td>
                      <td className="px-4 py-3 text-[#7f93b0] text-sm">{v.employee?.position}</td>
                      <td className="px-4 py-3 text-center text-[#c9d8ed]">{v.dias_correspondientes}</td>
                      <td className="px-4 py-3 text-center text-amber-400">{v.dias_tomados}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${(v.dias_correspondientes - v.dias_tomados) > 0 ? "bg-emerald-500/20 text-aria-accent" : "bg-slate-500/20 text-[#7f93b0]"}`}>
                          {(v.dias_correspondientes - v.dias_tomados)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* SOLICITUDES */}
          {tab === "solicitudes" && (
            <div className="space-y-4">
              {solicitudes.length === 0 ? (
                <div className="text-center text-[#7f93b0] py-8">No hay solicitudes</div>
              ) : solicitudes.map(s => (
                <div key={s.id} className={`p-4 rounded-xl border ${s.status === "PENDIENTE" ? "bg-amber-500/10 border-amber-500/30" : s.status === "APROBADA" ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">{s.employee?.full_name}</h3>
                      <p className="text-[#7f93b0] text-sm">{s.fecha_inicio} al {s.fecha_fin} ({s.dias_solicitados} días)</p>
                      {s.motivo && <p className="text-[#4a6080] text-xs mt-1">{s.motivo}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${s.status === "PENDIENTE" ? "bg-amber-500 text-white" : s.status === "APROBADA" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
                        {s.status}
                      </span>
                      {s.status === "PENDIENTE" && (
                        <>
                          <button onClick={() => aprobarSolicitud(s.id, s.employee_id, s.dias_solicitados)} className="p-2 rounded-lg bg-emerald-500/20 text-aria-accent hover:bg-aria-primary/30">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => rechazarSolicitud(s.id)} className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal Nueva Solicitud */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60  flex items-center justify-center z-50 p-4">
          <div className="bg-aria-bg border border-white/[0.08] rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Nueva Solicitud de Vacaciones</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#7f93b0] mb-1">Empleado</label>
                <select value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})}
                  className={`w-full px-3 py-2 bg-white/[0.04] border rounded-lg text-white ${formErrors.employee_id ? "border-red-500/50" : "border-white/[0.08]"}`}>
                  <option value="">Seleccionar...</option>
                  {empleados.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
                {formErrors.employee_id && <p className="text-red-400 text-xs mt-1">{formErrors.employee_id}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#7f93b0] mb-1">Fecha Inicio</label>
                  <input type="date" value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})}
                    className={`w-full px-3 py-2 bg-white/[0.04] border rounded-lg text-white ${formErrors.fecha_inicio ? "border-red-500/50" : "border-white/[0.08]"}`} />
                  {formErrors.fecha_inicio && <p className="text-red-400 text-xs mt-1">{formErrors.fecha_inicio}</p>}
                </div>
                <div>
                  <label className="block text-sm text-[#7f93b0] mb-1">Fecha Fin</label>
                  <input type="date" value={form.fecha_fin} onChange={e => setForm({...form, fecha_fin: e.target.value})}
                    className={`w-full px-3 py-2 bg-white/[0.04] border rounded-lg text-white ${formErrors.fecha_fin ? "border-red-500/50" : "border-white/[0.08]"}`} />
                  {formErrors.fecha_fin && <p className="text-red-400 text-xs mt-1">{formErrors.fecha_fin}</p>}
                </div>
              </div>
              {formErrors.fechas && <p className="text-red-400 text-xs">{formErrors.fechas}</p>}
              {calcularDias() > 0 && (
                <div className="text-center text-amber-400 font-medium">{calcularDias()} días solicitados</div>
              )}
              <div>
                <label className="block text-sm text-[#7f93b0] mb-1">Motivo (opcional)</label>
                <input type="text" value={form.motivo} onChange={e => setForm({...form, motivo: e.target.value})}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white" placeholder="Viaje familiar..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] rounded-lg text-white">Cancelar</button>
              <button onClick={crearSolicitud} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-white font-medium">Crear Solicitud</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

