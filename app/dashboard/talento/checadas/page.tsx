"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar, Clock, MapPin, CheckCircle, XCircle, Filter, Plus, Save, X, Loader2 } from "lucide-react";
import Link from "next/link";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import AriaBackButton from "@/components/AriaBackButton";
import EmptyState from "@/components/ui/EmptyState";

interface Asistencia {
  id: string;
  employee_id: string;
  fecha: string;
  hora_entrada: string | null;
  hora_salida: string | null;
  dentro_geocerca_entrada: boolean;
  tipo_registro: string;
  lat_entrada?: number | null;
  lng_entrada?: number | null;
  lat_salida?: number | null;
  lng_salida?: number | null;
  distancia_entrada_m?: number | null;
  distancia_salida_m?: number | null;
  centro_trabajo_id?: string | null;
  employees: { full_name: string; employee_number: string; position?: string } | null;
  centros_trabajo?: { codigo?: string; nombre?: string; latitud?: number; longitud?: number; radio_metros?: number } | null;
}

interface EmpleadoInfo {
  id: string;
  full_name: string;
  employee_number: string;
}

export default function ChecadasPage() {
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [mapaModal, setMapaModal] = useState<{ a: Asistencia; tipo: "entrada" | "salida" } | null>(null);
  const [scorecardEmp, setScorecardEmp] = useState<string | null>(null);
  const [scorecardWindow, setScorecardWindow] = useState<"current" | "month" | "year" | "weeks">("current");
  const [weekFrom, setWeekFrom] = useState<string>("");
  const [weekTo, setWeekTo] = useState<string>("");
  const [asistenciasHist, setAsistenciasHist] = useState<Asistencia[]>([]);
  const [oficinaDefault, setOficinaDefault] = useState<{ codigo?: string; nombre?: string; latitud?: number; longitud?: number; radio_metros?: number } | null>(null);
  const [centrosList, setCentrosList] = useState<Array<{ id: string; codigo?: string; nombre?: string; latitud?: number; longitud?: number; radio_metros?: number }>>([]);
  const [empCentroMap, setEmpCentroMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const localDate = (d: Date = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const hoy = localDate();
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin, setFechaFin] = useState(hoy);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [empleadosList, setEmpleadosList] = useState<EmpleadoInfo[]>([]);
  const [formManual, setFormManual] = useState({ employee_id: "", fecha: hoy, hora_entrada: "08:00", hora_salida: "17:00", centro_trabajo_id: "" });
  const [userRole, setUserRole] = useState<string>("");
  const { msg, flash, clear } = useFlashMessage();

  useEffect(() => { cargarAsistencias();
    supabase.from("Personal").select("id, full_name, employee_number").eq("status", "ACTIVO").order("full_name").then(({ data }) => { if (data) setEmpleadosList(data); }); }, [fechaInicio, fechaFin]);

  useEffect(() => {
    // Cargar todos los centros con coords + tabla pivote employee->centro para fallback en cadena
    supabase.from("centros_trabajo").select("id, codigo, nombre, latitud, longitud, radio_metros").then(({ data }) => {
      if (!data) return;
      const list = data as Array<{ id: string; codigo?: string; nombre?: string; latitud?: number; longitud?: number; radio_metros?: number }>;
      setCentrosList(list);
      // CT-OFICINA si existe; si no, primer centro con lat/lng
      const oficina = list.find(c => c.codigo === "CT-OFICINA" && c.latitud != null && c.longitud != null)
        || list.find(c => c.latitud != null && c.longitud != null)
        || null;
      if (oficina) setOficinaDefault(oficina);
    });
    supabase.from("employees").select("id, centro_trabajo_id").then(({ data }) => {
      if (!data) return;
      const map: Record<string, string> = {};
      (data as Array<{ id: string; centro_trabajo_id: string | null }>).forEach(e => { if (e.centro_trabajo_id) map[e.id] = e.centro_trabajo_id; });
      setEmpCentroMap(map);
    });
    // Cargar rol del usuario actual (para mostrar boton Manual solo a admin/director/rh)
    if (typeof window !== "undefined") {
      const email = localStorage.getItem("userEmail") || "";
      if (email) {
        supabase.from("Users").select("role").eq("email", email).maybeSingle().then(({ data }) => {
          if (data) setUserRole(((data as { role?: string })?.role || "").toLowerCase());
        });
      }
    }
  }, []);

  useEffect(() => {
    if (!scorecardEmp || scorecardWindow === "current") { setAsistenciasHist([]); return; }
    const today = new Date();
    let start: Date;
    let end: Date = today;
    if (scorecardWindow === "month") {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (scorecardWindow === "year") {
      start = new Date(today.getFullYear(), 0, 1);
    } else {
      // weeks: semana N o rango N-M
      const wf = parseInt(weekFrom) || 0;
      const wt = parseInt(weekTo) || wf;
      if (!wf) { setAsistenciasHist([]); return; }
      const r1 = semanaToRange(today.getFullYear(), wf);
      const r2 = semanaToRange(today.getFullYear(), wt || wf);
      start = r1.start;
      end = r2.end;
    }
    supabase
      .from("asistencias")
      .select("*, employees(full_name, employee_number)")
      .eq("employee_id", scorecardEmp)
      .gte("fecha", localDate(start))
      .lte("fecha", localDate(end))
      .order("fecha", { ascending: true })
      .then(({ data }) => { if (data) setAsistenciasHist(data as Asistencia[]); });
  }, [scorecardEmp, scorecardWindow, weekFrom, weekTo]);

  const puedeRegistrarManual = (() => {
    const r = userRole.toLowerCase();
    return r.includes("admin") || r.includes("director") || r === "rh" || r.includes("recursos") || r.includes("talento");
  })();

  const cargarAsistencias = async () => {
    setLoading(true);
    // 8-May-2026: SELECT robusto. No usar relations directas que pueden tronar
    // si FK no esta declarada. Hacer query base y enriquecer en N+1 simple.
    const { data, error } = await supabase
      .from("asistencias")
      .select("*, employees(full_name, employee_number)")
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin)
      .order("fecha", { ascending: false })
      .order("hora_entrada", { ascending: true });

    if (error) {
      console.error("[asistencias] cargar fallo", error);
    }

    let registros: Asistencia[] = (data as Asistencia[]) || [];

    // Enriquecer con position (si la columna existe en employees) y centros_trabajo
    if (registros.length > 0) {
      const empIds = Array.from(new Set(registros.map(r => r.employee_id).filter(Boolean)));
      const ctIds = Array.from(new Set(registros.map(r => r.centro_trabajo_id).filter(Boolean) as string[]));
      // position por employee
      if (empIds.length > 0) {
        try {
          const { data: empExtra } = await supabase
            .from("employees")
            .select("id, position")
            .in("id", empIds);
          if (empExtra) {
            const posMap: Record<string, string> = {};
            (empExtra as Array<{ id: string; position: string }>).forEach(e => { posMap[e.id] = e.position; });
            registros = registros.map(r => ({
              ...r,
              employees: r.employees ? { ...r.employees, position: posMap[r.employee_id] || "" } : null,
            }));
          }
        } catch (e) { console.warn("[asistencias] position lookup fallo", e); }
      }
      // centros_trabajo
      if (ctIds.length > 0) {
        try {
          const { data: cts } = await supabase
            .from("centros_trabajo")
            .select("id, codigo, nombre, latitud, longitud, radio_metros")
            .in("id", ctIds);
          if (cts) {
            const ctMap: Record<string, { codigo?: string; nombre?: string; latitud?: number; longitud?: number; radio_metros?: number }> = {};
            (cts as Array<{ id: string; codigo: string; nombre: string; latitud: number; longitud: number; radio_metros: number }>).forEach(c => {
              ctMap[c.id] = { codigo: c.codigo, nombre: c.nombre, latitud: c.latitud, longitud: c.longitud, radio_metros: c.radio_metros };
            });
            registros = registros.map(r => ({
              ...r,
              centros_trabajo: r.centro_trabajo_id ? ctMap[r.centro_trabajo_id] || null : null,
            }));
          }
        } catch (e) { console.warn("[asistencias] centros_trabajo lookup fallo", e); }
      }
    }

    // Fallback: enriquecer registros sin nombre desde Personal (VIEW) por employee_id
    const sinNombre = registros.filter(r => !r.employees?.full_name).map((r: Asistencia) => r.employee_id).filter(Boolean);
    if (sinNombre.length > 0) {
      const { data: extras } = await supabase
        .from("Personal")
        .select("id, full_name, employee_number")
        .in("id", Array.from(new Set(sinNombre)));
      if (extras) {
        const map: Record<string, { full_name: string; employee_number: string }> = {};
        extras.forEach((e: EmpleadoInfo) => { map[e.id] = { full_name: e.full_name, employee_number: e.employee_number }; });
        registros = registros.map((r: Asistencia) => r.employees?.full_name ? r : { ...r, employees: map[r.employee_id] || r.employees });
      }
    }

    setAsistencias(registros);
    setLoading(false);
  };

  const stats = {
    total: asistencias.length,
    completas: asistencias.filter(a => a.hora_entrada && a.hora_salida).length,
    enSitio: asistencias.filter(a => a.hora_entrada && !a.hora_salida).length,
    fueraGeocerca: asistencias.filter(a => !a.dentro_geocerca_entrada).length
  };

  // === HELPERS RANGO + AGRUPACION (8-May-2026) ===
  const rangeDays = (() => {
    const days: string[] = [];
    const start = new Date(fechaInicio + "T00:00:00");
    const end = new Date(fechaFin + "T00:00:00");
    if (start > end) return days;
    const cur = new Date(start);
    while (cur <= end && days.length < 31) {
      days.push(localDate(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  })();
  const isMultiDay = rangeDays.length > 1;

  type EmpGroup = {
    employee_id: string;
    nombre: string;
    numero: string;
    position: string;
    porFecha: Map<string, Asistencia>;
  };
  const empleadosMap = new Map<string, EmpGroup>();
  asistencias.forEach((a: Asistencia) => {
    const key = a.employee_id;
    if (!empleadosMap.has(key)) {
      empleadosMap.set(key, {
        employee_id: key,
        nombre: a.employees?.full_name || "Sin nombre",
        numero: a.employees?.employee_number || "—",
        position: ((a.employees as unknown) as { position?: string })?.position || "",
        porFecha: new Map(),
      });
    }
    empleadosMap.get(key)!.porFecha.set(a.fecha, a);
  });
  const empleadosArr = Array.from(empleadosMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));

  const esVelador = (nombre: string, position: string) => {
    const fn = nombre.toLowerCase();
    const pos = position.toLowerCase();
    return pos.includes("velador") || fn.includes("baudelio");
  };

  const calcHoras = (entrada: string | null, salida: string | null): number => {
    if (!entrada || !salida) return 0;
    const [h1, m1] = entrada.split(":").map(Number);
    const [h2, m2] = salida.split(":").map(Number);
    let diff = (h2 + m2 / 60) - (h1 + m1 / 60);
    if (diff < 0) diff += 24;
    return Math.round(diff * 100) / 100;
  };

  const empStats = (emp: EmpGroup) => {
    let diasCheck = 0, diasCompletos = 0, totalHoras = 0, retardos = 0, fueras = 0;
    rangeDays.forEach(d => {
      const a = emp.porFecha.get(d);
      if (a?.hora_entrada) diasCheck++;
      if (a?.hora_entrada && a?.hora_salida) {
        diasCompletos++;
        totalHoras += calcHoras(a.hora_entrada, a.hora_salida);
      }
      if (a?.hora_entrada && a.hora_entrada > "08:00") retardos++;
      if (a && !a.dentro_geocerca_entrada) fueras++;
    });
    const totalDiasRango = rangeDays.length;
    const ausencias = totalDiasRango - diasCheck;
    return { diasCheck, diasCompletos, totalHoras: Math.round(totalHoras * 10) / 10, retardos, fueras, ausencias, totalDiasRango };
  };

  const dayLabel = (fecha: string) => {
    const d = new Date(fecha + "T00:00:00");
    const labels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return { dia: labels[d.getDay()], num: d.getDate(), mes: meses[d.getMonth()] };
  };

  // Semana laboral construccion: sabado a viernes (no ISO).
  // Hoy vie 8-may-2026 cierra sem 18, mañana sab 9-may inicia sem 19.
  // Algoritmo: encontrar primer sabado del año, contar (fecha - primerSabado) / 7
  const semanaSabVie = (fecha: string) => {
    const d = new Date(fecha + "T00:00:00");
    const year = d.getFullYear();
    let firstSat = new Date(year, 0, 1);
    while (firstSat.getDay() !== 6) firstSat.setDate(firstSat.getDate() + 1);
    if (d < firstSat) {
      const lastSat = new Date(year - 1, 0, 1);
      while (lastSat.getDay() !== 6) lastSat.setDate(lastSat.getDate() + 1);
      const days = Math.floor((d.getTime() - lastSat.getTime()) / 86400000);
      return Math.floor(days / 7) + 1;
    }
    const days = Math.floor((d.getTime() - firstSat.getTime()) / 86400000);
    return Math.floor(days / 7) + 1;
  };
  const isoWeek = semanaSabVie;

  // Convertir numero de semana a fecha de inicio (sabado) y fin (viernes siguiente)
  const semanaToRange = (year: number, semana: number) => {
    let firstSat = new Date(year, 0, 1);
    while (firstSat.getDay() !== 6) firstSat.setDate(firstSat.getDate() + 1);
    const start = new Date(firstSat);
    start.setDate(start.getDate() + (semana - 1) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start, end };
  };



  const handleManual = async () => {
    if (!formManual.employee_id) return;
    setSaving(true);
    const ctId = formManual.centro_trabajo_id || empCentroMap[formManual.employee_id] || (oficinaDefault as { id?: string } | null)?.id || null;
    const { error } = await supabase.from("asistencias").insert({
      employee_id: formManual.employee_id,
      fecha: formManual.fecha,
      hora_entrada: formManual.hora_entrada,
      hora_salida: formManual.hora_salida,
      centro_trabajo_id: ctId,
      tipo_registro: "MANUAL",
      dentro_geocerca_entrada: true
    });
    setSaving(false);
    if (error) {
      flash("err", "No se pudo registrar la asistencia: " + (((error as {message?: string})?.message) || "Error desconocido"));
      return;
    }
    flash("ok", "Asistencia registrada manualmente");
    setShowModal(false);
    setFormManual({ employee_id: "", fecha: hoy, hora_entrada: "08:00", hora_salida: "17:00", centro_trabajo_id: "" });
    cargarAsistencias();
  };

  return (
    <div className="aria-bg-canon h-full flex flex-col overflow-hidden">
      {msg && <FlashBanner msg={msg} className="mx-6 mt-3" />}
      <div className="flex-none px-6 py-4 border-b border-white/[0.08]">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <AriaBackButton href="/dashboard/talento" />
            <div>
              <h1 className="text-2xl font-bold text-white leading-tight">Registro de Asistencias</h1>
              <p className="text-[#7f93b0] text-sm leading-tight">Control de entradas y salidas</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} title="Desde"
              className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm" />
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} title="Hasta"
              className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm" />
            <button onClick={() => { setFechaInicio(hoy); setFechaFin(hoy); }} className="aria-pill-secondary text-xs">Hoy</button>
            <button onClick={() => { const d = new Date(); const start = new Date(d); start.setDate(d.getDate() - 6); setFechaInicio(localDate(start)); setFechaFin(hoy); }} className="aria-pill-secondary text-xs">7 días</button>
            <button onClick={() => { const d = new Date(); const start = new Date(d.getFullYear(), d.getMonth(), 1); setFechaInicio(localDate(start)); setFechaFin(hoy); }} className="aria-pill-secondary text-xs">Mes</button>
            <Link href="/dashboard/talento/checadas/incompletas" className="aria-pill-warning text-xs">
              Ver Incompletas
            </Link>
            {puedeRegistrarManual && (
              <button onClick={() => setShowModal(true)} className="aria-pill-success text-xs flex items-center gap-1" title="Captura administrativa de asistencia (sin GPS)">
                <Plus className="w-3 h-3" /> Registro Manual
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="aria-kpi-card aria-kpi-slate flex items-baseline gap-3 py-2.5"><p className="text-2xl font-bold text-white min-w-[2.5ch]">{stats.total}</p><p className="text-xs uppercase tracking-wider text-[#9fb1cc]">Total registros</p></div>
          <div className="aria-kpi-card aria-kpi-success flex items-baseline gap-3 py-2.5"><p className="text-2xl font-bold text-white min-w-[2.5ch]">{stats.completas}</p><p className="text-xs uppercase tracking-wider text-[#9fb1cc]">Completas</p></div>
          <div className="aria-kpi-card aria-kpi-primary flex items-baseline gap-3 py-2.5"><p className="text-2xl font-bold text-white min-w-[2.5ch]">{stats.enSitio}</p><p className="text-xs uppercase tracking-wider text-[#9fb1cc]">En sitio</p></div>
          <div className="aria-kpi-card aria-kpi-danger flex items-baseline gap-3 py-2.5"><p className="text-2xl font-bold text-white min-w-[2.5ch]">{stats.fueraGeocerca}</p><p className="text-xs uppercase tracking-wider text-[#9fb1cc]">Fuera de geocerca</p></div>
        </div>
      </div>

      {empleadosArr.length > 0 && (fechaInicio !== fechaFin) && (
        <div className="flex-none px-6 py-3 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-[#c9d8ed] tracking-wide">Indicadores por empleado ({fechaInicio} → {fechaFin}) <span className="text-[#7f93b0] font-normal">· click para Balance Scorecard</span></p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 max-h-[240px] overflow-y-auto pr-1 scroll-pb-2" style={{ scrollSnapType: "y proximity" }}>
            {empleadosArr.map(emp => {
              const s = empStats(emp);
              const asistPct = s.totalDiasRango > 0 ? Math.round((s.diasCheck / s.totalDiasRango) * 100) : 0;
              const puntPct = s.diasCheck > 0 ? Math.round(((s.diasCheck - s.retardos) / s.diasCheck) * 100) : 0;
              const asistColor = asistPct >= 80 ? "text-emerald-300" : asistPct >= 50 ? "text-amber-300" : "text-rose-300";
              const puntColor = puntPct >= 80 ? "text-emerald-300" : puntPct >= 50 ? "text-amber-300" : "text-rose-300";
              const fueraColor = s.fueras === 0 ? "text-[#9fb1cc]" : "text-rose-300";
              return (
                <button
                  key={emp.employee_id}
                  onClick={() => setScorecardEmp(emp.employee_id)}
                  className="text-left p-2.5 rounded-lg bg-gradient-to-b from-[#0f1f3a] to-[#0a1628] border border-white/[0.08] hover:border-aria-accent/50 hover:from-[#13284a] hover:to-[#0d1d3a] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition group"
                  style={{ scrollSnapAlign: "start" }}
                >
                  <p className="text-white font-semibold text-xs truncate group-hover:text-aria-accent transition">{emp.nombre}</p>
                  <p className="text-[10px] text-[#7f93b0] truncate mb-1.5">{emp.numero}</p>
                  <div className="grid grid-cols-4 gap-1 text-center">
                    <div><p className={`text-sm font-bold ${asistColor}`}>{asistPct}%</p><p className="text-[8px] uppercase tracking-wider text-[#7f93b0]">Asist</p></div>
                    <div><p className={`text-sm font-bold ${puntColor}`}>{puntPct}%</p><p className="text-[8px] uppercase tracking-wider text-[#7f93b0]">Punt</p></div>
                    <div><p className="text-sm font-bold text-white">{s.totalHoras}</p><p className="text-[8px] uppercase tracking-wider text-[#7f93b0]">Hrs</p></div>
                    <div><p className={`text-sm font-bold ${fueraColor}`}>{s.fueras}</p><p className="text-[8px] uppercase tracking-wider text-[#7f93b0]">Fuera</p></div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-center py-12 text-[#7f93b0]">Cargando...</div>
        ) : asistencias.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-6 h-6" />}
            title="No hay registros para esta fecha"
          />
        ) : (
          isMultiDay ? (
            // VISTA MATRIZ: filas = empleados, columnas = dias
            <>
              <div className="flex items-center gap-3 mb-2 text-xs">
                <span className="px-2.5 py-1 rounded-md bg-aria-accent/15 border border-aria-accent/30 text-aria-accent font-bold uppercase tracking-wider">Semana {isoWeek(fechaInicio)}{isoWeek(fechaFin) !== isoWeek(fechaInicio) && ` - ${isoWeek(fechaFin)}`}</span>
                <span className="text-[#7f93b0]">{rangeDays.length} dias en el rango</span>
              </div>
              <div className="overflow-auto rounded-xl border border-white/[0.08] bg-black/20 max-h-[60vh] scroll-pb-2" style={{ scrollSnapType: "y proximity" }}>
              <table className="w-full text-xs">
                <thead className="bg-gradient-to-b from-[#1F4A8C] to-[#0F2D6E] sticky top-0 z-10">
                  <tr>
                    <th className="text-left pl-3 py-2.5 text-white font-bold uppercase tracking-wider sticky left-0 bg-[#0F2D6E] min-w-[200px] z-20">Empleado</th>
                    {rangeDays.map(d => {
                      const lbl = dayLabel(d);
                      return <th key={d} className="px-2 py-2.5 text-white font-bold uppercase tracking-wider min-w-[130px]"><div className="text-[9px] opacity-80">{lbl.dia}</div><div className="text-sm leading-tight">{lbl.num}</div><div className="text-[8px] opacity-70 font-semibold">{lbl.mes}</div></th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {empleadosArr.map(emp => {
                    const isV = esVelador(emp.nombre, emp.position);
                    return (
                      <tr key={emp.employee_id} className="border-t border-white/[0.06] hover:bg-white/[0.04] transition group cursor-pointer" style={{ scrollSnapAlign: "start" }} onClick={() => setScorecardEmp(emp.employee_id)}>
                        <td className="pl-3 py-2 sticky left-0 bg-[rgba(8,18,40,0.96)] group-hover:bg-[rgba(15,30,60,0.96)] transition z-[5]">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-semibold text-white truncate text-xs leading-tight">{emp.nombre}</p>
                              <p className="text-[10px] text-[#7f93b0] leading-tight">{emp.numero}{isV && <span className="ml-1.5 text-[8px] text-purple-300 font-bold uppercase tracking-wider">N</span>}</p>
                            </div>
                          </div>
                        </td>
                        {rangeDays.map(d => {
                          const a = emp.porFecha.get(d);
                          const hasEntrada = !!a?.hora_entrada;
                          const hasSalida = !!a?.hora_salida;
                          const fuera = a && !a.dentro_geocerca_entrada;
                          const labelEntrada = isV ? "Salida" : "Entrada";
                          const labelSalida = isV ? "Entrada" : "Salida";
                          return (
                            <td key={d} className="px-2 py-1.5 text-center align-top" onClick={e => { if (a) { e.stopPropagation(); setMapaModal({ a, tipo: "entrada" }); } }}>
                              {hasEntrada ? (
                                <div
                                  className={`rounded-md px-2.5 py-1.5 text-[11px] leading-tight cursor-pointer transition-transform hover:-translate-y-0.5 tracking-tight ${
                                    fuera
                                      ? "bg-gradient-to-b from-rose-700 to-rose-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_4px_rgba(0,0,0,0.45)]"
                                      : (hasEntrada && hasSalida)
                                        ? "bg-gradient-to-b from-emerald-700 to-emerald-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_4px_rgba(0,0,0,0.45)]"
                                        : "bg-gradient-to-b from-amber-700 to-amber-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_4px_rgba(0,0,0,0.45)]"
                                  }`}
                                >
                                  <div className="font-semibold flex items-center justify-center gap-1.5">
                                    <span>{labelEntrada}: {a!.hora_entrada}</span>
                                    {a!.tipo_registro === "MANUAL" && <span className="text-[8px] font-bold px-1 rounded bg-white/20 tracking-wider opacity-95" title="Captura manual sin GPS">M</span>}
                                  </div>
                                  <div className="font-semibold opacity-95 flex items-center justify-center gap-1.5">
                                    <span>{labelSalida}: {a!.hora_salida || "—"}</span>
                                    {fuera && <span className="text-[8px] font-bold px-1 rounded bg-white/25 tracking-wider opacity-95">FUERA</span>}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-[10px] text-[#3d5275] py-2">—</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </>
          ) : (
            // VISTA LISTA: 1 dia, lista vertical compacta
            <div className="space-y-3">
              {asistencias.map(a => {
                const isV = esVelador(a.employees?.full_name || "", ((a.employees as unknown) as { position?: string })?.position || "");
                const labelEntrada = isV ? "Salida" : "Entrada";
                const labelSalida = isV ? "Entrada" : "Salida";
                return (
                  <div key={a.id} className="p-4 bg-white/[0.04] border border-white/[0.08] rounded-xl flex items-center justify-between hover:bg-white/[0.06] cursor-pointer" onClick={() => a.employee_id && setScorecardEmp(a.employee_id)}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${a.hora_salida ? "bg-emerald-500/20" : "bg-aria-primary-light"}`}>
                        {a.hora_salida ? <CheckCircle className="w-5 h-5 text-aria-accent" /> : <Clock className="w-5 h-5 text-aria-accent" />}
                      </div>
                      <div>
                        <p className="font-medium text-white">{a.employees?.full_name || "Sin nombre"}</p>
                        <p className="text-sm text-[#7f93b0]">{a.employees?.employee_number}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center"><p className="text-[#7f93b0]">{labelEntrada}</p><p className="text-white font-medium">{a.hora_entrada || "--:--"}</p></div>
                      <div className="text-center"><p className="text-[#7f93b0]">{labelSalida}</p><p className="text-white font-medium">{a.hora_salida || "--:--"}</p></div>
                      {isV && <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">Nocturno</span>}
                      <button onClick={e => { e.stopPropagation(); setMapaModal({ a, tipo: "entrada" }); }} className="aria-pill-geocerca hover:scale-105 transition" title="Ver en mapa">
                        <MapPin className={`w-3.5 h-3.5 ${a.dentro_geocerca_entrada ? "text-emerald-300" : "text-red-300"}`} />
                        <span className={a.dentro_geocerca_entrada ? "text-emerald-300" : "text-red-300"}>{a.dentro_geocerca_entrada ? "OK" : "Fuera"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    
            {/* Modal Mapa de Checada (8-May-2026) */}
      {mapaModal && (() => {
        const { a, tipo } = mapaModal;
        const lat = tipo === "entrada" ? a.lat_entrada : a.lat_salida;
        const lng = tipo === "entrada" ? a.lng_entrada : a.lng_salida;
        const dist = tipo === "entrada" ? a.distancia_entrada_m : a.distancia_salida_m;
        // Fallback en cadena: ct directo de la asistencia -> ct del empleado -> CT-OFICINA -> primer disponible
        let ctSrc: { codigo?: string; nombre?: string; latitud?: number; longitud?: number; radio_metros?: number } | null = a.centros_trabajo || null;
        if (!ctSrc && a.employee_id) {
          const empCentroId = empCentroMap[a.employee_id];
          if (empCentroId) ctSrc = centrosList.find(c => c.id === empCentroId) || null;
        }
        if (!ctSrc) ctSrc = oficinaDefault;
        const ctLat = ctSrc?.latitud;
        const ctLng = ctSrc?.longitud;
        const radio = ctSrc?.radio_metros || 50;
        const ctNombre = ctSrc?.nombre || "Sin centro de trabajo";
        const ctIsFallback = !a.centros_trabajo && !!ctSrc;
        const empleado = a.employees?.full_name || "Empleado";
        // Usar OpenStreetMap (gratis, sin API key)
        const hasReal = lat != null && lng != null;
        const hasTarget = ctLat != null && ctLng != null;
        const center = hasReal ? `${lat},${lng}` : (hasTarget ? `${ctLat},${ctLng}` : "21.88234,-102.29572");
        const bbox = (() => {
          if (hasReal && hasTarget) {
            const minLat = Math.min(Number(lat), Number(ctLat)) - 0.003;
            const maxLat = Math.max(Number(lat), Number(ctLat)) + 0.003;
            const minLng = Math.min(Number(lng), Number(ctLng)) - 0.003;
            const maxLng = Math.max(Number(lng), Number(ctLng)) + 0.003;
            return `${minLng},${minLat},${maxLng},${maxLat}`;
          }
          // Solo uno de los dos: zoom cerrado al punto disponible (~250m radio visible)
          const c = (hasReal ? [lat, lng] : [ctLat, ctLng]) as [number, number];
          const delta = 0.0015;
          return `${(c[1] as number) - delta},${(c[0] as number) - delta},${(c[1] as number) + delta},${(c[0] as number) + delta}`;
        })();
        const markers = [hasReal ? `marker=${lat},${lng}` : "", hasTarget ? `marker=${ctLat},${ctLng}` : ""].filter(Boolean).join("&");
        const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&${markers}`;
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={() => setMapaModal(null)}>
            <div className="bg-aria-bg rounded-2xl border border-white/15 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-white">Mapa de checada — {tipo === "entrada" ? "Entrada" : "Salida"}</h3>
                    {a.tipo_registro === "MANUAL" && (
                      <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-amber-500/15 border border-amber-500/40 text-amber-200" title="Asistencia capturada desde el panel administrativo, no por WhatsApp ni movil. No tiene GPS del empleado.">
                        Manual · sin GPS
                      </span>
                    )}
                    {a.tipo_registro === "WHATSAPP" && (
                      <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-200">
                        WhatsApp
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#7f93b0]">{empleado} · {a.fecha} · {tipo === "entrada" ? a.hora_entrada : a.hora_salida || "--:--"}</p>
                </div>
                <button onClick={() => setMapaModal(null)} className="p-2 rounded hover:bg-white/[0.06] text-[#7f93b0] hover:text-white">✕</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 text-sm">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-[10px] uppercase text-emerald-300 font-bold tracking-wider">Target / Geocerca</p>
                  <p className="text-white font-medium mt-1">{ctNombre} {ctIsFallback && <span className="text-[9px] text-amber-300 font-bold uppercase ml-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">DEFAULT</span>}</p>
                  {hasTarget ? <p className="text-xs text-[#c9d8ed] mt-0.5 font-mono">{Number(ctLat).toFixed(5)}, {Number(ctLng).toFixed(5)}</p> : <p className="text-xs text-amber-300 mt-0.5">Esta asistencia no tiene centro asignado</p>}
                  <p className="text-xs text-[#7f93b0] mt-1">Radio permitido: {radio}m</p>
                </div>
                <div className={`p-3 rounded-lg border ${a.dentro_geocerca_entrada ? "bg-aria-primary/10 border-aria-primary/30" : "bg-red-500/10 border-red-500/30"}`}>
                  <p className={`text-[10px] uppercase font-bold tracking-wider ${a.dentro_geocerca_entrada ? "text-aria-accent" : "text-red-300"}`}>Donde checó</p>
                  {hasReal ? <p className="text-xs text-[#c9d8ed] mt-1 font-mono">{Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}</p> : <p className="text-xs text-amber-300 mt-1">Checada manual sin GPS</p>}
                  {dist != null && <p className="text-xs text-[#7f93b0] mt-1">Distancia al target: <span className={Number(dist) > radio ? "text-red-400 font-bold" : "text-emerald-300 font-bold"}>{Math.round(Number(dist))}m</span></p>}
                </div>
              </div>
              <div className="h-[420px] bg-[#06101e] border-t border-white/[0.06]">
                {(hasReal || hasTarget) ? (
                  <iframe
                    src={mapUrl}
                    className="w-full h-full border-0 block"
                    title="Mapa checada"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center px-8 text-center">
                    <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-3">
                      <MapPin className="w-7 h-7 text-amber-300" />
                    </div>
                    <p className="text-white font-semibold">Sin coordenadas para mostrar</p>
                    <p className="text-sm text-[#9fb1cc] mt-2 max-w-md leading-relaxed">
                      Esta asistencia fue capturada manualmente sin GPS y el empleado no tiene un centro de trabajo asignado con geocerca. Asigna un centro de trabajo en su perfil para que las proximas checadas tengan referencia visual.
                    </p>
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-white/10 flex justify-between items-center">
                {hasReal && (
                  <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer" className="text-xs text-aria-accent hover:underline">Abrir en Google Maps</a>
                )}
                <button onClick={() => setMapaModal(null)} className="aria-pill-secondary text-xs ml-auto">Cerrar</button>
              </div>
            </div>
          </div>
        );
      })()}

            {/* Modal Balance Scorecard del empleado */}
      {scorecardEmp && (() => {
        const emp = empleadosMap.get(scorecardEmp);
        if (!emp) return null;
        const stats = empStats(emp);
        const isVelador = esVelador(emp.nombre, emp.position);
        const puntualidad = stats.diasCheck > 0 ? Math.round(((stats.diasCheck - stats.retardos) / stats.diasCheck) * 100) : 0;
        const asistencia = stats.totalDiasRango > 0 ? Math.round((stats.diasCheck / stats.totalDiasRango) * 100) : 0;

        // T8: Agrupar historial por semana ISO
        const groupByWeek = (arr: Asistencia[]) => {
          const map = new Map<number, { semana: number; year: number; rangeStart: string; rangeEnd: string; diasCheck: number; diasCompletos: number; retardos: number; fueras: number; horas: number }>();
          arr.forEach(a => {
            const w = isoWeek(a.fecha);
            const d = new Date(a.fecha + "T00:00:00");
            const y = d.getFullYear();
            const key = y * 100 + w;
            if (!map.has(key)) map.set(key, { semana: w, year: y, rangeStart: a.fecha, rangeEnd: a.fecha, diasCheck: 0, diasCompletos: 0, retardos: 0, fueras: 0, horas: 0 });
            const g = map.get(key)!;
            if (a.fecha < g.rangeStart) g.rangeStart = a.fecha;
            if (a.fecha > g.rangeEnd) g.rangeEnd = a.fecha;
            if (a.hora_entrada) g.diasCheck++;
            if (a.hora_entrada && a.hora_salida) { g.diasCompletos++; g.horas += calcHoras(a.hora_entrada, a.hora_salida); }
            if (a.hora_entrada && a.hora_entrada > "08:00") g.retardos++;
            if (!a.dentro_geocerca_entrada) g.fueras++;
          });
          return Array.from(map.values()).sort((x, y) => (y.year * 100 + y.semana) - (x.year * 100 + x.semana));
        };
        const historico = scorecardWindow !== "current" ? groupByWeek(asistenciasHist) : [];
        const maxAsist = historico.length ? 100 : 0;
        void maxAsist;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setScorecardEmp(null)}>
            <div className="bg-[#F5F6F8] rounded-2xl border border-slate-300 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-aria-primary/15 flex items-center justify-center"><Clock className="w-6 h-6 text-aria-accent" /></div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{emp.nombre}</h3>
                    <p className="text-xs text-slate-500">{emp.numero}{emp.position && ` · ${emp.position}`}{isVelador && " · Turno nocturno"}</p>
                  </div>
                </div>
                <button onClick={() => setScorecardEmp(null)} className="p-2 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-900">✕</button>
              </div>
              <div className="flex-1 overflow-auto p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs uppercase tracking-wider text-slate-600 font-bold">Balance Scorecard {scorecardWindow === "current" ? `(${fechaInicio} → ${fechaFin})` : scorecardWindow === "month" ? "(Mes en curso)" : scorecardWindow === "year" ? "(Año en curso)" : weekFrom ? (weekTo && weekTo !== weekFrom ? `(Sem ${weekFrom} - ${weekTo})` : `(Semana ${weekFrom})`) : "(Selecciona semana)"}</div>
                  <div className="flex gap-1 p-0.5 rounded-lg bg-slate-200 border border-slate-300">
                    {([["current","Esta semana"],["month","Mes actual"],["year","Año actual"],["weeks","Por semanas"]] as Array<["current"|"month"|"year"|"weeks", string]>).map(([k,l]) => (
                      <button key={k} onClick={() => setScorecardWindow(k)} className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md transition ${scorecardWindow === k ? "bg-aria-accent text-white shadow" : "text-slate-600 hover:text-slate-900"}`}>{l}</button>
                    ))}
                  </div>
                </div>
                {scorecardWindow === "weeks" && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-200 border border-slate-300">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Sem desde</span>
                    <input type="number" min={1} max={53} value={weekFrom} onChange={e => setWeekFrom(e.target.value)} placeholder="1" className="w-16 px-2 py-1 text-sm rounded border border-slate-400 bg-white text-slate-900 font-bold text-center" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">hasta</span>
                    <input type="number" min={1} max={53} value={weekTo} onChange={e => setWeekTo(e.target.value)} placeholder="(misma)" className="w-20 px-2 py-1 text-sm rounded border border-slate-400 bg-white text-slate-900 font-bold text-center" />
                    <button onClick={() => { setWeekFrom(""); setWeekTo(""); }} className="ml-auto text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-900">Limpiar</button>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="relative p-4 pl-5 rounded-xl bg-white border-2 border-slate-300 shadow-md overflow-hidden">
                    <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-600"></span>
                    <p className="text-2xl font-bold text-slate-900">{asistencia}%</p>
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">Asistencia</p>
                  </div>
                  <div className="relative p-4 pl-5 rounded-xl bg-white border-2 border-slate-300 shadow-md overflow-hidden">
                    <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600"></span>
                    <p className="text-2xl font-bold text-slate-900">{puntualidad}%</p>
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">Puntualidad</p>
                  </div>
                  <div className="relative p-4 pl-5 rounded-xl bg-white border-2 border-slate-300 shadow-md overflow-hidden">
                    <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-700"></span>
                    <p className="text-2xl font-bold text-slate-900">{stats.totalHoras}h</p>
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">Horas trabajadas</p>
                  </div>
                  <div className="relative p-4 pl-5 rounded-xl bg-white border-2 border-slate-300 shadow-md overflow-hidden">
                    <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-600"></span>
                    <p className="text-2xl font-bold text-slate-900">{stats.fueras}</p>
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">Días fuera geocerca</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-slate-200 border-2 border-slate-400 shadow-sm"><p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Días checados</p><p className="text-lg font-bold text-slate-900">{stats.diasCheck} / {stats.totalDiasRango}</p></div>
                  <div className="p-3 rounded-lg bg-slate-200 border-2 border-slate-400 shadow-sm"><p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Días completos</p><p className="text-lg font-bold text-slate-900">{stats.diasCompletos}</p></div>
                  <div className="p-3 rounded-lg bg-slate-200 border-2 border-slate-400 shadow-sm"><p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Retardos</p><p className="text-lg font-bold text-amber-600">{stats.retardos}</p></div>
                  <div className="p-3 rounded-lg bg-slate-200 border-2 border-slate-400 shadow-sm"><p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Ausencias</p><p className="text-lg font-bold text-rose-600">{stats.ausencias}</p></div>
                </div>

                {scorecardWindow !== "current" && historico.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wider text-slate-700 font-bold">Tendencia por semana</p>
                    <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm">
                      <svg viewBox={`0 0 ${historico.length * 60 + 40} 120`} className="w-full h-32" preserveAspectRatio="none">
                        {[0, 25, 50, 75, 100].map(y => (
                          <line key={y} x1={30} x2={historico.length * 60 + 30} y1={100 - y} y2={100 - y} stroke="#e2e8f0" strokeWidth={1} />
                        ))}
                        {[0, 50, 100].map(y => (
                          <text key={y} x={2} y={104 - y} fontSize="9" fill="#64748b">{y}%</text>
                        ))}
                        {[...historico].reverse().map((h, i) => {
                          const x = 30 + i * 60 + 30;
                          const asistY = 100 - (maxAsist > 0 ? (h.diasCheck > 0 ? Math.round(h.diasCheck * 100 / 7) : 0) : 0);
                          const puntY = 100 - (h.diasCheck > 0 ? Math.round(((h.diasCheck - h.retardos) / h.diasCheck) * 100) : 0);
                          return (
                            <g key={i}>
                              <circle cx={x} cy={asistY} r={4} fill="#10b981" />
                              <circle cx={x} cy={puntY} r={4} fill="#3b82f6" />
                              <text x={x} y={115} fontSize="9" fill="#64748b" textAnchor="middle">S{h.semana}</text>
                              {i > 0 && (() => {
                                const prev = [...historico].reverse()[i - 1];
                                const prevX = 30 + (i - 1) * 60 + 30;
                                const prevAsistY = 100 - (prev.diasCheck > 0 ? Math.round(prev.diasCheck * 100 / 7) : 0);
                                const prevPuntY = 100 - (prev.diasCheck > 0 ? Math.round(((prev.diasCheck - prev.retardos) / prev.diasCheck) * 100) : 0);
                                return <>
                                  <line x1={prevX} y1={prevAsistY} x2={x} y2={asistY} stroke="#10b981" strokeWidth={2} />
                                  <line x1={prevX} y1={prevPuntY} x2={x} y2={puntY} stroke="#3b82f6" strokeWidth={2} />
                                </>;
                              })()}
                            </g>
                          );
                        })}
                      </svg>
                      <div className="flex items-center justify-center gap-4 mt-1 text-[10px] text-slate-600">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Asistencia%</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Puntualidad%</span>
                      </div>
                    </div>
                    <p className="text-xs uppercase tracking-wider text-slate-700 font-bold">Histórico semana por semana</p>
                    <div className="rounded-lg bg-white border border-slate-200 shadow-sm overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-100">
                          <tr className="text-left text-slate-600">
                            <th className="px-3 py-2 font-bold uppercase tracking-wider">Semana</th>
                            <th className="px-3 py-2 font-bold uppercase tracking-wider">Rango</th>
                            <th className="px-3 py-2 font-bold uppercase tracking-wider text-right">Días</th>
                            <th className="px-3 py-2 font-bold uppercase tracking-wider text-right">Compl</th>
                            <th className="px-3 py-2 font-bold uppercase tracking-wider text-right">Retardos</th>
                            <th className="px-3 py-2 font-bold uppercase tracking-wider text-right">Fuera</th>
                            <th className="px-3 py-2 font-bold uppercase tracking-wider text-right">Horas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historico.map(h => (
                            <tr key={`${h.year}-${h.semana}`} className="border-t border-slate-200 hover:bg-slate-50">
                              <td className="px-3 py-2 font-bold text-slate-900">S{h.semana}</td>
                              <td className="px-3 py-2 text-slate-600">{h.rangeStart} → {h.rangeEnd}</td>
                              <td className="px-3 py-2 text-right text-slate-900">{h.diasCheck}</td>
                              <td className="px-3 py-2 text-right text-emerald-600 font-bold">{h.diasCompletos}</td>
                              <td className="px-3 py-2 text-right text-amber-600 font-bold">{h.retardos}</td>
                              <td className="px-3 py-2 text-right text-rose-600 font-bold">{h.fueras}</td>
                              <td className="px-3 py-2 text-right text-slate-900 font-mono">{Math.round(h.horas * 10) / 10}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {scorecardWindow === "current" && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-700 font-bold mb-2">Detalle por día</p>
                    <div className="space-y-1">
                      {rangeDays.map(d => {
                        const a = emp.porFecha.get(d);
                        const lbl = dayLabel(d);
                        const hasE = !!a?.hora_entrada;
                        const horas = a ? calcHoras(a.hora_entrada, a.hora_salida) : 0;
                        return (
                          <div key={d} className="flex items-center justify-between p-2.5 rounded-md bg-white border-2 border-slate-300 shadow-sm hover:bg-slate-50 transition">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-slate-800 w-16">{lbl.dia} {lbl.num}</span>
                              <span className="text-xs text-slate-500">{d}</span>
                            </div>
                            {hasE ? (
                              <div className="flex items-center gap-3 text-xs">
                                <span className="text-slate-900 font-mono">{a!.hora_entrada} → {a!.hora_salida || "Sin salida"}</span>
                                {horas > 0 && <span className="text-aria-accent font-bold">{horas}h</span>}
                                {a && !a.dentro_geocerca_entrada && <span className="text-rose-600 font-bold uppercase">Fuera</span>}
                                <button onClick={e => { e.stopPropagation(); setMapaModal({ a: a!, tipo: "entrada" }); }} className="p-1.5 rounded-md bg-aria-accent/10 border border-aria-accent/30 hover:bg-aria-accent/20 transition" title="Ver mapa">
                                  <MapPin className="w-3.5 h-3.5 text-aria-accent"/>
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-rose-600 italic font-medium">Falta / sin checar</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-slate-200 flex justify-end bg-white">
                <button onClick={() => setScorecardEmp(null)} className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md bg-slate-200 text-slate-800 hover:bg-slate-300 transition">Cerrar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#0c1d38] rounded-2xl p-6 w-full max-w-md border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Registro Manual de Asistencia</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-[#7f93b0]" /></button>
            </div>
            <div className="space-y-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-[11px] text-amber-200 leading-relaxed">
                  <span className="font-bold">Captura administrativa.</span> Esta asistencia NO tendra GPS — se usa para empleados que olvidaron marcar, sin cobertura, o velador. Selecciona el centro de trabajo para que el mapa muestre la geocerca esperada.
                </p>
              </div>
              <div>
                <label className="text-xs text-[#7f93b0]">Empleado *</label>
                <select value={formManual.employee_id} onChange={e => setFormManual({...formManual, employee_id: e.target.value, centro_trabajo_id: empCentroMap[e.target.value] || ""})} className="w-full bg-[#0f2448] text-white rounded-lg px-3 py-2 text-sm border border-white/[0.08]">
                  <option value="">Seleccionar...</option>
                  {empleadosList.map(e => <option key={e.id} value={e.id}>{e.employee_number} - {e.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#7f93b0]">Centro de trabajo (opcional, usa geocerca)</label>
                <select value={formManual.centro_trabajo_id} onChange={e => setFormManual({...formManual, centro_trabajo_id: e.target.value})} className="w-full bg-[#0f2448] text-white rounded-lg px-3 py-2 text-sm border border-white/[0.08]">
                  <option value="">Auto (usa el del empleado o OFICINA default)</option>
                  {centrosList.filter(c => c.latitud != null && c.longitud != null).map(c => (
                    <option key={c.id} value={c.id}>{c.codigo || ""} - {c.nombre || ""}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-[#7f93b0]">Fecha</label>
                  <input type="date" value={formManual.fecha} onChange={e => setFormManual({...formManual, fecha: e.target.value})} className="w-full bg-[#0f2448] text-white rounded-lg px-3 py-2 text-sm border border-white/[0.08]" />
                </div>
                <div>
                  <label className="text-xs text-[#7f93b0]">Entrada</label>
                  <input type="time" value={formManual.hora_entrada} onChange={e => setFormManual({...formManual, hora_entrada: e.target.value})} className="w-full bg-[#0f2448] text-white rounded-lg px-3 py-2 text-sm border border-white/[0.08]" />
                </div>
                <div>
                  <label className="text-xs text-[#7f93b0]">Salida</label>
                  <input type="time" value={formManual.hora_salida} onChange={e => setFormManual({...formManual, hora_salida: e.target.value})} className="w-full bg-[#0f2448] text-white rounded-lg px-3 py-2 text-sm border border-white/[0.08]" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-[#7f93b0] hover:text-white">Cancelar</button>
              <button onClick={handleManual} disabled={saving || !formManual.employee_id} className="flex items-center gap-2 px-4 py-2 bg-aria-accent text-white rounded-lg text-sm hover:bg-aria-accent/80 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
