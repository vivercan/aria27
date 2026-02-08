"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Calendar, Sun, User, Plus, Check, X, ChevronLeft, ChevronRight } from "lucide-react";

interface Vacacion {
  id: string;
  employee_id: string;
  anio: number;
  dias_correspondientes: number;
  dias_tomados: number;
  dias_pendientes: number;
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

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    const { data: vac } = await supabase
      .from("vacaciones_empleados")
      .select("*, employee:Personal(full_name, position)")
      .eq("anio", 2025);
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
    await supabase.from("solicitudes_vacaciones").update({ status: "APROBADA", fecha_aprobacion: new Date().toISOString() }).eq("id", id);
    // Primero obtener el valor actual
    const { data: vac } = await supabase.from("vacaciones_empleados").select("dias_tomados").eq("employee_id", employee_id).eq("anio", 2025).single();
    if (vac) {
      await supabase.from("vacaciones_empleados").update({ dias_tomados: vac.dias_tomados + dias }).eq("employee_id", employee_id).eq("anio", 2025);
    }
    cargarDatos();
  };

  const rechazarSolicitud = async (id: string) => {
    await supabase.from("solicitudes_vacaciones").update({ status: "RECHAZADA" }).eq("id", id);
    cargarDatos();
  };

  const calcularDias = () => {
    if (!form.fecha_inicio || !form.fecha_fin) return 0;
    const inicio = new Date(form.fecha_inicio);
    const fin = new Date(form.fecha_fin);
    const diff = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };

  const crearSolicitud = async () => {
    if (!form.employee_id || !form.fecha_inicio || !form.fecha_fin) return alert("Completa todos los campos");
    const dias = calcularDias();
    if (dias <= 0) return alert("Las fechas son inválidas");

    await supabase.from("solicitudes_vacaciones").insert({
      employee_id: form.employee_id,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
      dias_solicitados: dias,
      motivo: form.motivo,
      status: "PENDIENTE"
    });
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/talento/prestaciones" className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div className="p-3 rounded-xl bg-amber-500/20">
            <Sun className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Vacaciones</h1>
            <p className="text-slate-400 text-sm">Gestión de días de descanso</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-white font-medium">
          <Plus className="w-4 h-4" /> Nueva Solicitud
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        {[
          { id: "calendario", label: "Calendario", icon: Calendar },
          { id: "saldos", label: "Saldos", icon: User },
          { id: "solicitudes", label: "Solicitudes", icon: Sun }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${tab === t.id ? "bg-amber-600 text-white" : "text-slate-400 hover:bg-white/5"}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-8">Cargando...</div>
      ) : (
        <>
          {/* CALENDARIO */}
          {tab === "calendario" && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <button onClick={mesAnterior} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
                  <ChevronLeft className="w-5 h-5 text-slate-400" />
                </button>
                <h2 className="text-xl font-bold text-white">{MESES[mesActual]} {anioActual}</h2>
                <button onClick={mesSiguiente} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(d => (
                  <div key={d} className="text-center text-xs text-slate-500 py-2 font-medium">{d}</div>
                ))}
                {getDiasDelMes().map((dia, idx) => {
                  const vacEnDia = dia ? getVacacionesEnDia(dia) : [];
                  const esHoy = dia === new Date().getDate() && mesActual === new Date().getMonth() && anioActual === new Date().getFullYear();
                  return (
                    <div key={idx} className={`min-h-[80px] p-1 border border-white/5 rounded-lg ${dia ? "bg-white/[0.02]" : ""} ${esHoy ? "ring-2 ring-amber-500" : ""}`}>
                      {dia && (
                        <>
                          <div className={`text-sm font-medium mb-1 ${esHoy ? "text-amber-400" : "text-slate-400"}`}>{dia}</div>
                          {vacEnDia.slice(0, 2).map((v, i) => (
                            <div key={i} className="text-xs bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded truncate mb-0.5">
                              {v.employee?.full_name?.split(" ")[0]}
                            </div>
                          ))}
                          {vacEnDia.length > 2 && <div className="text-xs text-slate-500">+{vacEnDia.length - 2} más</div>}
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
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr className="text-left text-xs text-slate-400 uppercase">
                    <th className="px-4 py-3">Empleado</th>
                    <th className="px-4 py-3">Puesto</th>
                    <th className="px-4 py-3 text-center">Corresponden</th>
                    <th className="px-4 py-3 text-center">Tomados</th>
                    <th className="px-4 py-3 text-center">Pendientes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {vacaciones.map(v => (
                    <tr key={v.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-white font-medium">{v.employee?.full_name}</td>
                      <td className="px-4 py-3 text-slate-400 text-sm">{v.employee?.position}</td>
                      <td className="px-4 py-3 text-center text-slate-300">{v.dias_correspondientes}</td>
                      <td className="px-4 py-3 text-center text-amber-400">{v.dias_tomados}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${v.dias_pendientes > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"}`}>
                          {v.dias_pendientes}
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
                <div className="text-center text-slate-400 py-8">No hay solicitudes</div>
              ) : solicitudes.map(s => (
                <div key={s.id} className={`p-4 rounded-xl border ${s.status === "PENDIENTE" ? "bg-amber-500/10 border-amber-500/30" : s.status === "APROBADA" ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">{s.employee?.full_name}</h3>
                      <p className="text-slate-400 text-sm">{s.fecha_inicio} al {s.fecha_fin} ({s.dias_solicitados} días)</p>
                      {s.motivo && <p className="text-slate-500 text-xs mt-1">{s.motivo}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${s.status === "PENDIENTE" ? "bg-amber-500 text-white" : s.status === "APROBADA" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
                        {s.status}
                      </span>
                      {s.status === "PENDIENTE" && (
                        <>
                          <button onClick={() => aprobarSolicitud(s.id, s.employee_id, s.dias_solicitados)} className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a1628] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Nueva Solicitud de Vacaciones</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Empleado</label>
                <select value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                  <option value="">Seleccionar...</option>
                  {empleados.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Fecha Inicio</label>
                  <input type="date" value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Fecha Fin</label>
                  <input type="date" value={form.fecha_fin} onChange={e => setForm({...form, fecha_fin: e.target.value})}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                </div>
              </div>
              {calcularDias() > 0 && (
                <div className="text-center text-amber-400 font-medium">{calcularDias()} días solicitados</div>
              )}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Motivo (opcional)</label>
                <input type="text" value={form.motivo} onChange={e => setForm({...form, motivo: e.target.value})}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" placeholder="Viaje familiar..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white">Cancelar</button>
              <button onClick={crearSolicitud} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-white font-medium">Crear Solicitud</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

