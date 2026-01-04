"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar, Download, Save, Send, ChevronLeft, ChevronRight, FileSpreadsheet, History, Users, DollarSign, Building2, Check, X, RefreshCw, Clock } from "lucide-react";

interface Empleado {
  id: string;
  full_name: string;
  position: string;
  department: string;
  salario_diario: number;
}

interface EmpleadoNomina {
  id: string;
  employee_id: string;
  nombre: string;
  puesto: string;
  obra: string;
  salario_diario: number;
  salario_semanal: number;
  dias_trabajados: number;
  horas_extra: number;
  septimo_dia: number;
  bonos: number;
  prestamos: number;
  sueldo_calculado: number;
  sueldo_neto: number;
}

interface NominaGuardada {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  semana: number;
  total_bruto: number;
  total_bonos: number;
  total_prestamos: number;
  total_neto: number;
  empleados_count: number;
  status: string;
  created_at: string;
}

const OBRAS_COLORES: Record<string, string> = {
  "OFICINA": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "JUSTO SIERRA": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "EJERCITO NACIONAL": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "JUAN DIEGO": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "LAB SEMICONDUCTORES": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "MIRAVALLE": "bg-rose-500/20 text-rose-300 border-rose-500/30",
  "DIRECCION": "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

export default function NominaPage() {
  const [semanaActual, setSemanaActual] = useState({ inicio: "2025-12-12", fin: "2025-12-18", numero: 51 });
  const [empleados, setEmpleados] = useState<EmpleadoNomina[]>([]);
  const [historial, setHistorial] = useState<NominaGuardada[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
  const [nominaGenerada, setNominaGenerada] = useState(false);

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    const { data } = await supabase
      .from("nominas")
      .select("*")
      .order("fecha_inicio", { ascending: false })
      .limit(20);
    if (data) setHistorial(data);
  };

  const cambiarSemana = (dir: number) => {
    const fecha = new Date(semanaActual.inicio);
    fecha.setDate(fecha.getDate() + dir * 7);
    const fin = new Date(fecha);
    fin.setDate(fin.getDate() + 6);
    setSemanaActual({
      inicio: fecha.toISOString().split("T")[0],
      fin: fin.toISOString().split("T")[0],
      numero: semanaActual.numero + dir,
    });
    setEmpleados([]);
    setNominaGenerada(false);
  };

  const generarNomina = async () => {
    setLoading(true);
    try {
      // 1. Cargar empleados activos de BD
      const { data: emps, error } = await supabase
        .from("employees")
        .select("id, full_name, position, department, salario_diario")
        .eq("status", "ACTIVO")
        .order("department, full_name");

      if (error) throw error;
      if (!emps || emps.length === 0) {
        setMensaje({ tipo: "error", texto: "No hay empleados activos" });
        return;
      }

      // 2. Cargar asistencias de la semana
      const { data: asistencias } = await supabase
        .from("asistencias")
        .select("employee_id, fecha")
        .gte("fecha", semanaActual.inicio)
        .lte("fecha", semanaActual.fin);

      // 3. Contar días por empleado
      const diasPorEmpleado: Record<string, number> = {};
      asistencias?.forEach((a) => {
        diasPorEmpleado[a.employee_id] = (diasPorEmpleado[a.employee_id] || 0) + 1;
      });

      // 4. Generar nómina
      const nominaData: EmpleadoNomina[] = emps.map((emp, idx) => {
        const salarioDiario = emp.salario_diario || 0;
        const salarioSemanal = salarioDiario * 7;
        const diasTrabajados = diasPorEmpleado[emp.id] || 6; // Default 6 días si no hay registro
        const septimoDia = diasTrabajados >= 6 ? 1 : diasTrabajados / 6;
        const sueldoCalculado = (diasTrabajados * salarioDiario) + (septimoDia * salarioDiario);
        
        return {
          id: `nom-${idx}`,
          employee_id: emp.id,
          nombre: emp.full_name,
          puesto: emp.position || "N/A",
          obra: emp.department || "SIN ASIGNAR",
          salario_diario: salarioDiario,
          salario_semanal: salarioSemanal,
          dias_trabajados: diasTrabajados,
          horas_extra: 0,
          septimo_dia: septimoDia,
          bonos: 0,
          prestamos: 0,
          sueldo_calculado: Math.round(sueldoCalculado * 100) / 100,
          sueldo_neto: Math.round(sueldoCalculado * 100) / 100,
        };
      });

      setEmpleados(nominaData);
      setNominaGenerada(true);
      setMensaje({ tipo: "success", texto: `Nómina generada: ${nominaData.length} empleados` });
    } catch (err) {
      setMensaje({ tipo: "error", texto: "Error: " + (err as Error).message });
    } finally {
      setLoading(false);
      setTimeout(() => setMensaje(null), 3000);
    }
  };

  const actualizarEmpleado = (id: string, campo: keyof EmpleadoNomina, valor: number) => {
    setEmpleados((prev) =>
      prev.map((emp) => {
        if (emp.id !== id) return emp;
        const act = { ...emp, [campo]: valor };
        // Recalcular
        if (campo === "dias_trabajados") {
          act.septimo_dia = valor >= 6 ? 1 : valor / 6;
          act.sueldo_calculado = Math.round((valor * emp.salario_diario + act.septimo_dia * emp.salario_diario) * 100) / 100;
        }
        act.sueldo_neto = Math.round((act.sueldo_calculado + act.bonos - act.prestamos) * 100) / 100;
        return act;
      })
    );
  };

  const totales = empleados.reduce(
    (a, e) => ({
      bruto: a.bruto + e.sueldo_calculado,
      bonos: a.bonos + e.bonos,
      prestamos: a.prestamos + e.prestamos,
      neto: a.neto + e.sueldo_neto,
    }),
    { bruto: 0, bonos: 0, prestamos: 0, neto: 0 }
  );

  const guardarNomina = async (enviarAutorizacion: boolean = false) => {
    setLoading(true);
    try {
      const status = enviarAutorizacion ? "PENDIENTE_AUTORIZACION" : "BORRADOR";
      
      // Guardar nómina
      const { data: nomina, error } = await supabase
        .from("nominas")
        .insert({
          fecha_inicio: semanaActual.inicio,
          fecha_fin: semanaActual.fin,
          semana: semanaActual.numero,
          total_bruto: Math.round(totales.bruto * 100) / 100,
          total_bonos: Math.round(totales.bonos * 100) / 100,
          total_deducciones: Math.round(totales.prestamos * 100) / 100,
          total_neto: Math.round(totales.neto * 100) / 100,
          empleados_count: empleados.length,
          status: status,
        })
        .select()
        .single();

      if (error) throw error;

      // Guardar detalle
      const detalles = empleados.map((emp) => ({
        nomina_id: nomina.id,
        employee_id: emp.employee_id,
        employee_name: emp.nombre,
        department: emp.obra,
        position: emp.puesto,
        salario_diario: emp.salario_diario,
        dias_trabajados: emp.dias_trabajados,
        septimo_dia: emp.septimo_dia,
        salario_bruto: emp.sueldo_calculado,
        total_bonos: emp.bonos,
        descuento_prestamos: emp.prestamos,
        salario_neto: emp.sueldo_neto,
      }));

      await supabase.from("nomina_detalle").insert(detalles);

      setMensaje({
        tipo: "success",
        texto: enviarAutorizacion
          ? "Nómina enviada a autorización"
          : "Nómina guardada como borrador",
      });
      cargarHistorial();
    } catch (err) {
      setMensaje({ tipo: "error", texto: "Error: " + (err as Error).message });
    } finally {
      setLoading(false);
      setTimeout(() => setMensaje(null), 3000);
    }
  };

  const cargarNominaHistorial = async (nomina: NominaGuardada) => {
    setLoading(true);
    try {
      const { data: detalles } = await supabase
        .from("nomina_detalle")
        .select("*")
        .eq("nomina_id", nomina.id);

      if (detalles) {
        const nominaData: EmpleadoNomina[] = detalles.map((d, idx) => ({
          id: `hist-${idx}`,
          employee_id: d.employee_id,
          nombre: d.employee_name,
          puesto: d.position || "N/A",
          obra: d.department || "N/A",
          salario_diario: d.salario_diario || 0,
          salario_semanal: (d.salario_diario || 0) * 7,
          dias_trabajados: d.dias_trabajados || 0,
          horas_extra: 0,
          septimo_dia: d.septimo_dia || 0,
          bonos: d.total_bonos || 0,
          prestamos: d.descuento_prestamos || 0,
          sueldo_calculado: d.salario_bruto || 0,
          sueldo_neto: d.salario_neto || 0,
        }));

        setEmpleados(nominaData);
        setSemanaActual({
          inicio: nomina.fecha_inicio,
          fin: nomina.fecha_fin,
          numero: nomina.semana || 0,
        });
        setNominaGenerada(true);
        setShowHistorial(false);
      }
    } catch (err) {
      setMensaje({ tipo: "error", texto: "Error cargando historial" });
    } finally {
      setLoading(false);
    }
  };

  const exportarExcel = () => {
    const fecha = new Date().toLocaleDateString("es-MX");
    let csv = "\uFEFF";
    csv += `GRUPO CUAVANTE - NOMINA SEMANA ${semanaActual.numero}\n`;
    csv += `Periodo: ${semanaActual.inicio} al ${semanaActual.fin}\n`;
    csv += `Generado: ${fecha}\n\n`;

    const obras = [...new Set(empleados.map((e) => e.obra))];
    obras.forEach((obra) => {
      const empsObra = empleados.filter((e) => e.obra === obra);
      const subtotal = empsObra.reduce((a, e) => a + e.sueldo_neto, 0);
      csv += `\n${obra}\n`;
      csv += `No.,Nombre,Puesto,Sal. Diario,Sal. Semanal,Dias,Septimo,Sueldo,Bonos,Prestamos,NETO\n`;
      empsObra.forEach((emp, i) => {
        csv += `${i + 1},"${emp.nombre}","${emp.puesto}",${emp.salario_diario.toFixed(2)},${emp.salario_semanal.toFixed(2)},${emp.dias_trabajados.toFixed(2)},${emp.septimo_dia.toFixed(2)},${emp.sueldo_calculado.toFixed(2)},${emp.bonos.toFixed(2)},${emp.prestamos.toFixed(2)},${emp.sueldo_neto.toFixed(2)}\n`;
      });
      csv += `,,,,,,,,,,SUBTOTAL ${obra}: $${subtotal.toFixed(2)}\n`;
    });

    csv += `\n\n========== RESUMEN GENERAL ==========\n`;
    csv += `Total Empleados:,${empleados.length}\n`;
    csv += `Total Bruto:,$${totales.bruto.toFixed(2)}\n`;
    csv += `Total Bonos:,$${totales.bonos.toFixed(2)}\n`;
    csv += `Total Prestamos:,$${totales.prestamos.toFixed(2)}\n`;
    csv += `TOTAL NETO A PAGAR:,$${totales.neto.toFixed(2)}\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Nomina_Sem${semanaActual.numero}_${semanaActual.inicio}.csv`;
    link.click();
    setMensaje({ tipo: "success", texto: "Excel exportado correctamente" });
    setTimeout(() => setMensaje(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <DollarSign className="w-7 h-7 text-emerald-400" />
            Nómina Semanal
          </h1>
          <p className="text-slate-400 mt-1">Gestión y cálculo de nómina</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowHistorial(!showHistorial)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition text-sm"
          >
            <History className="w-4 h-4" />
            Historial
          </button>
          {nominaGenerada && (
            <>
              <button
                onClick={exportarExcel}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 transition text-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </button>
              <button
                onClick={() => guardarNomina(false)}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 transition text-sm"
              >
                <Save className="w-4 h-4" />
                Guardar
              </button>
              <button
                onClick={() => guardarNomina(true)}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500 text-black hover:bg-amber-400 transition text-sm font-semibold"
              >
                <Send className="w-4 h-4" />
                Enviar a Autorización
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mensaje */}
      {mensaje && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${mensaje.tipo === "success" ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300" : "bg-red-500/20 border border-red-500/30 text-red-300"}`}>
          {mensaje.tipo === "success" ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
          {mensaje.texto}
        </div>
      )}

      {/* Selector de Semana */}
      <div className="flex items-center justify-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
        <button onClick={() => cambiarSemana(-1)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition">
          <ChevronLeft className="w-5 h-5 text-slate-300" />
        </button>
        <div className="text-center">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Calendar className="w-5 h-5 text-blue-400" />
            Semana {semanaActual.numero}
          </div>
          <div className="text-sm text-slate-400">{semanaActual.inicio} al {semanaActual.fin}</div>
        </div>
        <button onClick={() => cambiarSemana(1)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition">
          <ChevronRight className="w-5 h-5 text-slate-300" />
        </button>
      </div>

      {/* Historial Panel */}
      {showHistorial && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            Historial de Nóminas
          </h3>
          {historial.length === 0 ? (
            <p className="text-slate-400">No hay nóminas guardadas</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {historial.map((nom) => (
                <div
                  key={nom.id}
                  onClick={() => cargarNominaHistorial(nom)}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition cursor-pointer"
                >
                  <div>
                    <div className="text-white font-medium">Semana {nom.semana || "?"}</div>
                    <div className="text-sm text-slate-400">{nom.fecha_inicio} - {nom.fecha_fin}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-400 font-semibold">${nom.total_neto?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div>
                    <div className={`text-xs px-2 py-0.5 rounded inline-block ${nom.status === "AUTORIZADA" ? "bg-emerald-500/20 text-emerald-300" : nom.status === "PENDIENTE_AUTORIZACION" ? "bg-amber-500/20 text-amber-300" : "bg-slate-500/20 text-slate-300"}`}>
                      {nom.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Botón Generar */}
      {!nominaGenerada && (
        <div className="flex justify-center py-12">
          <button
            onClick={generarNomina}
            disabled={loading}
            className="flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold text-lg hover:from-blue-600 hover:to-cyan-600 transition shadow-lg shadow-blue-500/25"
          >
            {loading ? (
              <RefreshCw className="w-6 h-6 animate-spin" />
            ) : (
              <DollarSign className="w-6 h-6" />
            )}
            {loading ? "Generando..." : "Generar Nómina"}
          </button>
        </div>
      )}

      {/* Contenido de Nómina */}
      {nominaGenerada && empleados.length > 0 && (
        <>
          {/* Totales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-slate-400 text-sm">Total Bruto</div>
              <div className="text-2xl font-bold text-white">${totales.bruto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-emerald-400 text-sm">Bonos</div>
              <div className="text-2xl font-bold text-emerald-300">+${totales.bonos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="text-red-400 text-sm">Préstamos</div>
              <div className="text-2xl font-bold text-red-300">-${totales.prestamos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="text-blue-400 text-sm">Neto a Pagar</div>
              <div className="text-2xl font-bold text-blue-300">${totales.neto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          {/* Tablas por Obra */}
          {[...new Set(empleados.map((e) => e.obra))].sort().map((obra) => (
            <div key={obra} className="rounded-xl bg-white/[0.03] border border-white/10 overflow-hidden">
              <div className={`px-4 py-3 border-b border-white/10 flex items-center gap-3 ${OBRAS_COLORES[obra] || "bg-slate-500/20 text-slate-300"}`}>
                <Building2 className="w-5 h-5" />
                <span className="font-semibold">{obra}</span>
                <span className="text-sm opacity-75">({empleados.filter((e) => e.obra === obra).length})</span>
                <span className="ml-auto font-bold">
                  ${empleados.filter((e) => e.obra === obra).reduce((a, e) => a + e.sueldo_neto, 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-white/10">
                      <th className="text-left p-3">Empleado</th>
                      <th className="text-right p-3">Sal/Día</th>
                      <th className="text-right p-3">Días</th>
                      <th className="text-right p-3">7mo</th>
                      <th className="text-right p-3">Sueldo</th>
                      <th className="text-right p-3">Bonos</th>
                      <th className="text-right p-3">Prést.</th>
                      <th className="text-right p-3 text-white">Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empleados.filter((e) => e.obra === obra).map((emp) => (
                      <tr key={emp.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-3">
                          <div className="text-white font-medium">{emp.nombre}</div>
                          <div className="text-slate-400 text-xs">{emp.puesto}</div>
                        </td>
                        <td className="p-3 text-right text-slate-300">${emp.salario_diario.toFixed(2)}</td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="7"
                            value={emp.dias_trabajados}
                            onChange={(e) => actualizarEmpleado(emp.id, "dias_trabajados", parseFloat(e.target.value) || 0)}
                            className="w-16 bg-white/10 border border-white/20 rounded px-2 py-1 text-right text-white"
                          />
                        </td>
                        <td className="p-3 text-right text-slate-300">{emp.septimo_dia.toFixed(2)}</td>
                        <td className="p-3 text-right text-white">${emp.sueldo_calculado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            step="50"
                            min="0"
                            value={emp.bonos}
                            onChange={(e) => actualizarEmpleado(emp.id, "bonos", parseFloat(e.target.value) || 0)}
                            className="w-20 bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-1 text-right text-emerald-300"
                          />
                        </td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            step="50"
                            min="0"
                            value={emp.prestamos}
                            onChange={(e) => actualizarEmpleado(emp.id, "prestamos", parseFloat(e.target.value) || 0)}
                            className="w-20 bg-red-500/10 border border-red-500/30 rounded px-2 py-1 text-right text-red-300"
                          />
                        </td>
                        <td className="p-3 text-right font-bold text-blue-300">
                          ${emp.sueldo_neto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Footer */}
          <div className="text-center text-slate-500 text-sm py-4">
            <Users className="w-4 h-4 inline mr-2" />
            {empleados.length} empleados • Semana {semanaActual.numero} • Total: ${totales.neto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </div>
        </>
      )}
    </div>
  );
}
