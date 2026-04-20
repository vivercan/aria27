"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Plus, Edit, Eye, Check, X, Download, Trash2,
  FileText, User, Calendar, DollarSign, AlertCircle
} from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";

interface Empleado {
  id: string;
  full_name: string;
  employee_number: string;
  salario_diario: number;
  fecha_ingreso: string;
  status: string;
}

interface Finiquito {
  id: string;
  employee_id: string;
  full_name: string;
  employee_number: string;
  tipo: string;
  fecha_baja: string;
  fecha_ingreso: string;
  antiguedad_dias: number;
  neto_a_pagar: number;
  status: string;
  created_at: string;
}

const TIPOS_BAJA = [
  { value: "RENUNCIA_VOLUNTARIA", label: "Renuncia Voluntaria" },
  { value: "DESPIDO_JUSTIFICADO", label: "Despido Justificado" },
  { value: "DESPIDO_INJUSTIFICADO", label: "Despido Injustificado" },
  { value: "MUTUO_ACUERDO", label: "Mutuo Acuerdo" },
  { value: "FIN_CONTRATO", label: "Fin de Contrato" },
  { value: "DEFUNCION", label: "Defunción" },
];

const STATUS_COLORS: Record<string, string> = {
  BORRADOR: "bg-[#162040] text-white",
  CALCULADO: "bg-amber-600 text-white",
  APROBADO: "bg-aria-primary text-white",
  PAGADO: "bg-emerald-600 text-white",
  CANCELADO: "bg-red-600 text-white",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(value);
}

function calcularAntiguedad(fechaIngreso: string, fechaBaja: string): number {
  if (!fechaIngreso || !fechaBaja) return 0;
  const inicio = new Date(fechaIngreso);
  const fin = new Date(fechaBaja);
  return Math.floor((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
}

// Tabla LFT de vacaciones por antigüedad
function calcularDiasVacacionesPorAntiguedad(años: number): number {
  if (años < 1) return 0;
  if (años <= 4) return 6;
  if (años <= 9) return 8;
  if (años <= 14) return 10;
  if (años <= 19) return 12;
  if (años <= 24) return 14;
  if (años <= 29) return 16;
  // Cada 5 años adicionales: +2 días
  const añosAdicionales = años - 29;
  const ciclos = Math.floor(añosAdicionales / 5);
  return 16 + ciclos * 2;
}

// Prima de antigüedad (LFT art 162): 12 días × salario × años completos
function calcularPrimaAntiguedad(
  salarioDiario: number,
  años: number
): number {
  return 12 * salarioDiario * años;
}

// Aguinaldo proporcional
function calcularAguinaldoProporcional(
  salarioDiario: number,
  días: number
): number {
  const díasEnAño = 365;
  return (días / díasEnAño) * 15 * salarioDiario;
}

export default function FiniquitosPage() {
  const [view, setView] = useState<"list" | "form" | "detail">("list");
  const [finiquitos, setFiniquitos] = useState<Finiquito[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [searchEmployee, setSearchEmployee] = useState("");

  // Form state
  const [currentFiniquito, setCurrentFiniquito] = useState<any>(null);
  const [step, setStep] = useState(1); // 1: select emp, 2: baja type, 3: calc, 4: confirm
  const [form, setForm] = useState({
    employee_id: "",
    tipo: "",
    fecha_baja: "",
    motivo: "",
    salarios_caidos_dias: 0,
    deducciones_infonavit: 0,
    deducciones_prestamos: 0,
    otras_deducciones: 0,
  });

  const [flashMsg, setFlashMsg] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const [calculo, setCalculo] = useState<any>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);

    // Cargar finiquitos
    const { data: fin } = await supabase
      .from("finiquitos_completo")
      .select(
        "id, employee_id, full_name, employee_number, tipo, fecha_baja, fecha_ingreso, antiguedad_dias, neto_a_pagar, status, created_at"
      )
      .order("created_at", { ascending: false });

    if (fin) setFiniquitos(fin);

    // Cargar empleados activos
    const { data: emp } = await supabase
      .from("Personal")
      .select(
        "id, full_name, employee_number, salario_diario, fecha_ingreso, status"
      )
      .eq("status", "ACTIVO")
      .order("full_name");

    if (emp) setEmpleados(emp);

    setLoading(false);
  };

  const realizarCalculo = () => {
    if (!form.employee_id || !form.tipo || !form.fecha_baja) {
      setFlashMsg({ type: "error", msg: "Completa empleado, tipo de baja y fecha" });
      return;
    }

    const emp = empleados.find((e) => e.id === form.employee_id);
    if (!emp) return;

    const días = calcularAntiguedad(emp.fecha_ingreso, form.fecha_baja);
    const años = Math.floor(días / 365);
    const salarioDiario = emp.salario_diario || 0;

    // Cálculos según LFT
    const diasAguinaldobrax = Math.min(días, 365); // solo proporcional del año
    const montoAguinaldo = calcularAguinaldoProporcional(
      salarioDiario,
      diasAguinaldobrax
    );

    const diasVacaciones = calcularDiasVacacionesPorAntiguedad(años);
    const montoVacaciones = diasVacaciones * salarioDiario;
    const montoPrimaVacacional = montoVacaciones * 0.25;

    const diasPrimaAntiguedad = años > 0 ? 12 : 0;
    const montoPrimaAntiguedad = calcularPrimaAntiguedad(salarioDiario, años);

    // Indemnización 90 días (solo si es DESPIDO_INJUSTIFICADO)
    const indemnizacion90 =
      form.tipo === "DESPIDO_INJUSTIFICADO" ? 90 * salarioDiario : 0;

    // Salarios caídos (solo si es DESPIDO_INJUSTIFICADO)
    const montoSalariosCaidos =
      form.tipo === "DESPIDO_INJUSTIFICADO"
        ? form.salarios_caidos_dias * salarioDiario
        : 0;

    // Total percepciones
    const totalPercepciones =
      montoAguinaldo +
      montoVacaciones +
      montoPrimaVacacional +
      montoPrimaAntiguedad +
      indemnizacion90 +
      montoSalariosCaidos;

    // Total deducciones
    const totalDeducciones =
      form.deducciones_infonavit +
      form.deducciones_prestamos +
      form.otras_deducciones;

    // Neto
    const netoPagar = Math.max(0, totalPercepciones - totalDeducciones);

    setCalculo({
      salario_diario: salarioDiario,
      dias_aguinaldo_proporcional: diasAguinaldobrax,
      monto_aguinaldo: montoAguinaldo,
      dias_vacaciones_pendientes: diasVacaciones,
      monto_vacaciones: montoVacaciones,
      monto_prima_vacacional: montoPrimaVacacional,
      dias_prima_antiguedad: diasPrimaAntiguedad,
      monto_prima_antiguedad: montoPrimaAntiguedad,
      indemnizacion_90_dias: indemnizacion90,
      salarios_caidos_dias: form.salarios_caidos_dias,
      monto_salarios_caidos: montoSalariosCaidos,
      total_percepciones: totalPercepciones,
      total_deducciones: totalDeducciones,
      neto_a_pagar: netoPagar,
      antiguedad_dias: días,
    });

    setStep(4);
  };

  const guardarFiniquito = async (marcarCalculado: boolean = false) => {
    if (!form.employee_id || !form.tipo || !form.fecha_baja || !calculo) {
      setFlashMsg({ type: "error", msg: "Faltan datos del cálculo" });
      return;
    }

    const emp = empleados.find((e) => e.id === form.employee_id);

    const { error } = await supabase.from("finiquitos").insert({
      employee_id: form.employee_id,
      tipo: form.tipo,
      fecha_baja: form.fecha_baja,
      fecha_ingreso: emp?.fecha_ingreso,
      antiguedad_dias: calculo.antiguedad_dias,
      salario_diario: calculo.salario_diario,
      dias_aguinaldo_proporcional: calculo.dias_aguinaldo_proporcional,
      monto_aguinaldo: calculo.monto_aguinaldo,
      dias_vacaciones_pendientes: calculo.dias_vacaciones_pendientes,
      monto_vacaciones: calculo.monto_vacaciones,
      monto_prima_vacacional: calculo.monto_prima_vacacional,
      dias_prima_antiguedad: calculo.dias_prima_antiguedad,
      monto_prima_antiguedad: calculo.monto_prima_antiguedad,
      indemnizacion_90_dias: calculo.indemnizacion_90_dias,
      salarios_caidos_dias: calculo.salarios_caidos_dias,
      monto_salarios_caidos: calculo.monto_salarios_caidos,
      total_percepciones: calculo.total_percepciones,
      deducciones_infonavit: form.deducciones_infonavit,
      deducciones_prestamos: form.deducciones_prestamos,
      otras_deducciones: form.otras_deducciones,
      total_deducciones: calculo.total_deducciones,
      neto_a_pagar: calculo.neto_a_pagar,
      status: marcarCalculado ? "CALCULADO" : "BORRADOR",
      motivo: form.motivo,
      created_by: "system",
    });

    if (error) {
      setFlashMsg({ type: "error", msg: "Error: " + (error as {message?: string})?.message || "Error desconocido" });
      return;
    }

    setFlashMsg({
      type: "success",
      msg: `Finiquito ${marcarCalculado ? "calculado" : "guardado como borrador"} exitosamente`,
    });
    setTimeout(() => {
      resetForm();
      setView("list");
      cargarDatos();
    }, 1500);
  };

  const resetForm = () => {
    setForm({
      employee_id: "",
      tipo: "",
      fecha_baja: "",
      motivo: "",
      salarios_caidos_dias: 0,
      deducciones_infonavit: 0,
      deducciones_prestamos: 0,
      otras_deducciones: 0,
    });
    setCalculo(null);
    setStep(1);
    setCurrentFiniquito(null);
  };

  const abrirDetalle = async (id: string) => {
    const { data } = await supabase
      .from("finiquitos")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (data) {
      setCurrentFiniquito(data);
      setView("detail");
    }
  };

  const actualizarEstatus = async (id: string, nuevoStatus: string) => {
    const updates: Record<string, unknown> = { status: nuevoStatus };

    if (nuevoStatus === "PAGADO") {
      updates.paid_at = new Date().toISOString();
      // Actualizar status de empleado a BAJA
      const { data: fin } = await supabase
        .from("finiquitos")
        .select("employee_id")
        .eq("id", id)
        .maybeSingle();

      if (fin) {
        await supabase.from("employees").update({ status: "BAJA" }).eq("id", fin.employee_id);
      }
    }

    if (nuevoStatus === "APROBADO") {
      updates.approved_at = new Date().toISOString();
      updates.approved_by = "system";
    }

    const { error } = await supabase.from("finiquitos").update(updates).eq("id", id);

    if (error) {
      setFlashMsg({ type: "error", msg: "Error: " + (error as {message?: string})?.message || "Error desconocido" });
      return;
    }

    setFlashMsg({ type: "success", msg: `Finiquito actualizado a ${nuevoStatus}` });
    setTimeout(() => {
      cargarDatos();
      if (view === "detail") setView("list");
    }, 1500);
  };

  const filtrarFiniquitos = () => {
    let resultado = finiquitos;
    if (filterStatus) resultado = resultado.filter((f) => f.status === filterStatus);
    if (searchEmployee)
      resultado = resultado.filter(
        (f) =>
          f.full_name.toLowerCase().includes(searchEmployee.toLowerCase()) ||
          f.employee_number?.includes(searchEmployee)
      );
    return resultado;
  };

  // ==================== VISTA: LIST ====================
  if (view === "list") {
    return (
      <div className="h-full overflow-auto bg-[#040810] text-white p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[#040810] pb-4">
            <div className="flex items-center gap-4 mb-4">
              <AriaBackButton href="/dashboard/talento" />
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <FileText className="w-8 h-8" />
                  Finiquitos y Bajas
                </h1>
                <p className="text-[#7f93b0]">Liquidación y terminación de empleados</p>
              </div>
            </div>

            {/* Flash message */}
            {flashMsg && (
              <div
                className={`p-4 rounded-lg mb-4 flex items-center gap-2 ${
                  flashMsg.type === "success"
                    ? "bg-emerald-900/40 text-emerald-200 border border-emerald-700/50"
                    : "bg-red-900/40 text-red-200 border border-red-700/50"
                }`}
              >
                {flashMsg.type === "success" ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <X className="w-5 h-5" />
                )}
                {flashMsg.msg}
              </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex gap-2 flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Buscar empleado..."
                  value={searchEmployee}
                  onChange={(e) => setSearchEmployee(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-[#0a1628] border border-white/[0.08] text-white placeholder-[#4a6080] focus:outline-none focus:border-aria-primary"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[#0a1628] border border-white/[0.08] text-white focus:outline-none focus:border-aria-primary"
                >
                  <option value="">Todos los Status</option>
                  {Object.keys(STATUS_COLORS).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  resetForm();
                  setView("form");
                }}
                className="px-4 py-2 rounded-lg bg-aria-primary hover:bg-aria-primary-hover transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nuevo Finiquito
              </button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-12 text-[#7f93b0]">Cargando...</div>
          ) : filtrarFiniquitos().length === 0 ? (
            <div className="text-center py-12 text-[#7f93b0]">
              No hay finiquitos registrados
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-white/[0.08]">
              <table className="w-full">
                <thead className="bg-[#0a1628] border-b border-white/[0.08]">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Empleado
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Fecha Baja
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">
                      Antigüedad
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">
                      Neto
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtrarFiniquitos().map((fin) => (
                    <tr key={fin.id} className="border-b border-slate-800 hover:bg-[#0a1628]/50 transition-colors">
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium">{fin.full_name}</div>
                        <div className="text-xs text-[#7f93b0]">{fin.employee_number}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">{fin.tipo.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(fin.fecha_baja).toLocaleDateString("es-MX")}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {fin.antiguedad_dias} días
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {formatMoney(fin.neto_a_pagar)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            STATUS_COLORS[fin.status]
                          }`}
                        >
                          {fin.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center flex items-center justify-center gap-1">
                        <button
                          onClick={() => abrirDetalle(fin.id)}
                          className="p-1 rounded hover:bg-aria-primary/20 transition-colors"
                          title="Ver"
                        >
                          <Eye className="w-4 h-4 text-aria-accent" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== VISTA: FORM (Multi-step) ====================
  if (view === "form") {
    return (
      <div className="h-full overflow-auto bg-[#040810] text-white p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[#040810] pb-4">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => {
                  resetForm();
                  setView("list");
                }}
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.06] transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[#7f93b0]" />
              </button>
              <h1 className="text-2xl font-bold">Nuevo Finiquito</h1>
            </div>

            {/* Flash message */}
            {flashMsg && (
              <div
                className={`p-3 rounded-lg mb-4 text-sm flex items-center gap-2 ${
                  flashMsg.type === "success"
                    ? "bg-emerald-900/40 text-emerald-200 border border-emerald-700/50"
                    : "bg-red-900/40 text-red-200 border border-red-700/50"
                }`}
              >
                {flashMsg.type === "success" ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {flashMsg.msg}
              </div>
            )}

            {/* Progress */}
            <div className="flex items-center gap-2 mb-4">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      s <= step ? "bg-aria-primary text-white" : "bg-[#0f2448] text-[#7f93b0]"
                    }`}
                  >
                    {s}
                  </div>
                  {s < 4 && (
                    <div
                      className={`h-1 w-12 mx-1 transition-colors ${
                        s < step ? "bg-aria-primary" : "bg-[#0f2448]"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="text-sm text-[#7f93b0]">
              {step === 1 && "Paso 1: Selecciona empleado"}
              {step === 2 && "Paso 2: Tipo y fecha de baja"}
              {step === 3 && "Paso 3: Datos adicionales"}
              {step === 4 && "Paso 4: Revisar y confirmar"}
            </div>
          </div>

          {/* STEP 1: Select Employee */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-[#0a1628] p-6 rounded-lg border border-white/[0.08]">
                <label className="block text-sm font-semibold mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Empleado
                </label>
                <select
                  value={form.employee_id}
                  onChange={(e) => {
                    setForm({ ...form, employee_id: e.target.value });
                    setFlashMsg(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-[#0c1d38] border border-white/[0.07] text-white focus:outline-none focus:border-aria-primary"
                >
                  <option value="">-- Selecciona un empleado --</option>
                  {empleados.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_number})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    resetForm();
                    setView("list");
                  }}
                  className="px-4 py-2 rounded-lg bg-[#0f2448] hover:bg-[#162040] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!form.employee_id) {
                      setFlashMsg({ type: "error", msg: "Selecciona un empleado" });
                      return;
                    }
                    setStep(2);
                  }}
                  className="px-4 py-2 rounded-lg bg-aria-primary hover:bg-aria-primary-hover transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Type and Date */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-[#0a1628] p-6 rounded-lg border border-white/[0.08] space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Tipo de Baja
                  </label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0c1d38] border border-white/[0.07] text-white focus:outline-none focus:border-aria-primary"
                  >
                    <option value="">-- Selecciona tipo --</option>
                    {TIPOS_BAJA.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Fecha de Baja
                  </label>
                  <input
                    type="date"
                    value={form.fecha_baja}
                    onChange={(e) => setForm({ ...form, fecha_baja: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0c1d38] border border-white/[0.07] text-white focus:outline-none focus:border-aria-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Motivo (opcional)
                  </label>
                  <textarea
                    value={form.motivo}
                    onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-[#0c1d38] border border-white/[0.07] text-white focus:outline-none focus:border-aria-primary text-sm"
                    placeholder="Describe el motivo de la baja..."
                  />
                </div>
              </div>
              <div className="flex justify-between gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-lg bg-[#0f2448] hover:bg-[#162040] transition-colors"
                >
                  Atrás
                </button>
                <button
                  onClick={() => {
                    if (!form.tipo || !form.fecha_baja) {
                      setFlashMsg({
                        type: "error",
                        msg: "Completa tipo y fecha de baja",
                      });
                      return;
                    }
                    setStep(3);
                  }}
                  className="px-4 py-2 rounded-lg bg-aria-primary hover:bg-aria-primary-hover transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Additional Data (before calculation) */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-[#0a1628] p-6 rounded-lg border border-white/[0.08] space-y-4">
                {/* Only show if DESPIDO_INJUSTIFICADO */}
                {form.tipo === "DESPIDO_INJUSTIFICADO" && (
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Salarios Caídos (días)
                    </label>
                    <input
                      type="number" min="0"
                      value={form.salarios_caidos_dias}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          salarios_caidos_dias: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#0c1d38] border border-white/[0.07] text-white focus:outline-none focus:border-aria-primary"
                    />
                    <p className="text-xs text-[#7f93b0] mt-1">
                      Número de días de salarios caídos a pagar
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      <DollarSign className="w-4 h-4 inline mr-2" />
                      Deducciones INFONAVIT
                    </label>
                    <input
                      type="number" min="0"
                      step="0.01"
                      value={form.deducciones_infonavit}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          deducciones_infonavit: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#0c1d38] border border-white/[0.07] text-white focus:outline-none focus:border-aria-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Deducciones Préstamos
                    </label>
                    <input
                      type="number" min="0"
                      step="0.01"
                      value={form.deducciones_prestamos}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          deducciones_prestamos: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#0c1d38] border border-white/[0.07] text-white focus:outline-none focus:border-aria-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Otras Deducciones
                  </label>
                  <input
                    type="number" min="0"
                    step="0.01"
                    value={form.otras_deducciones}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        otras_deducciones: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#0c1d38] border border-white/[0.07] text-white focus:outline-none focus:border-aria-primary"
                  />
                </div>
              </div>

              <div className="flex justify-between gap-2">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-lg bg-[#0f2448] hover:bg-[#162040] transition-colors"
                >
                  Atrás
                </button>
                <button
                  onClick={realizarCalculo}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 transition-colors"
                >
                  Calcular
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Review and Confirm */}
          {step === 4 && calculo && (
            <div className="space-y-6">
              {/* Empleado info */}
              <div className="bg-[#0a1628] p-6 rounded-lg border border-white/[0.08]">
                <h3 className="text-lg font-semibold mb-4">Información General</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-[#7f93b0]">Empleado</div>
                    <div className="font-medium">
                      {empleados.find((e) => e.id === form.employee_id)?.full_name}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#7f93b0]">Tipo de Baja</div>
                    <div className="font-medium">{form.tipo.replace(/_/g, " ")}</div>
                  </div>
                  <div>
                    <div className="text-[#7f93b0]">Fecha Baja</div>
                    <div className="font-medium">
                      {new Date(form.fecha_baja).toLocaleDateString("es-MX")}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#7f93b0]">Antigüedad</div>
                    <div className="font-medium">{calculo.antiguedad_dias} días</div>
                  </div>
                  <div>
                    <div className="text-[#7f93b0]">Salario Diario</div>
                    <div className="font-medium">{formatMoney(calculo.salario_diario)}</div>
                  </div>
                </div>
              </div>

              {/* Percepciones */}
              <div className="bg-[#0a1628] p-6 rounded-lg border border-white/[0.08]">
                <h3 className="text-lg font-semibold mb-4">Percepciones</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#7f93b0]">Aguinaldo Proporcional</span>
                    <span className="font-medium">
                      {calculo.dias_aguinaldo_proporcional} días × {formatMoney(calculo.salario_diario)} = {formatMoney(calculo.monto_aguinaldo)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7f93b0]">Vacaciones Pendientes</span>
                    <span className="font-medium">
                      {calculo.dias_vacaciones_pendientes} días × {formatMoney(calculo.salario_diario)} = {formatMoney(calculo.monto_vacaciones)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7f93b0]">Prima Vacacional (25%)</span>
                    <span className="font-medium">{formatMoney(calculo.monto_prima_vacacional)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7f93b0]">Prima de Antigüedad</span>
                    <span className="font-medium">
                      {calculo.dias_prima_antiguedad} días = {formatMoney(calculo.monto_prima_antiguedad)}
                    </span>
                  </div>
                  {calculo.indemnizacion_90_dias > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#7f93b0]">Indemnización 90 días</span>
                      <span className="font-medium">
                        {formatMoney(calculo.indemnizacion_90_dias)}
                      </span>
                    </div>
                  )}
                  {calculo.monto_salarios_caidos > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#7f93b0]">Salarios Caídos</span>
                      <span className="font-medium">
                        {calculo.salarios_caidos_dias} días = {formatMoney(calculo.monto_salarios_caidos)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-white/[0.07] pt-2 flex justify-between font-semibold text-base">
                    <span>TOTAL PERCEPCIONES</span>
                    <span className="text-green-400">{formatMoney(calculo.total_percepciones)}</span>
                  </div>
                </div>
              </div>

              {/* Deducciones */}
              {calculo.total_deducciones > 0 && (
                <div className="bg-[#0a1628] p-6 rounded-lg border border-white/[0.08]">
                  <h3 className="text-lg font-semibold mb-4">Deducciones</h3>
                  <div className="space-y-2 text-sm">
                    {form.deducciones_infonavit > 0 && (
                      <div className="flex justify-between">
                        <span className="text-[#7f93b0]">INFONAVIT</span>
                        <span className="font-medium">
                          -{formatMoney(form.deducciones_infonavit)}
                        </span>
                      </div>
                    )}
                    {form.deducciones_prestamos > 0 && (
                      <div className="flex justify-between">
                        <span className="text-[#7f93b0]">Préstamos</span>
                        <span className="font-medium">
                          -{formatMoney(form.deducciones_prestamos)}
                        </span>
                      </div>
                    )}
                    {form.otras_deducciones > 0 && (
                      <div className="flex justify-between">
                        <span className="text-[#7f93b0]">Otras</span>
                        <span className="font-medium">
                          -{formatMoney(form.otras_deducciones)}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-white/[0.07] pt-2 flex justify-between font-semibold">
                      <span>TOTAL DEDUCCIONES</span>
                      <span className="text-red-400">
                        -{formatMoney(calculo.total_deducciones)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* NETO */}
              <div className="bg-[#0a1628] p-6 rounded-lg border border-emerald-700 bg-gradient-to-r from-slate-900 to-emerald-950">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold">NETO A PAGAR</h3>
                  <div className="text-3xl font-bold text-aria-accent">
                    {formatMoney(calculo.neto_a_pagar)}
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-between gap-2">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2 rounded-lg bg-[#0f2448] hover:bg-[#162040] transition-colors"
                >
                  Atrás
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => guardarFiniquito(false)}
                    className="px-6 py-2 rounded-lg bg-[#0f2448] hover:bg-[#162040] transition-colors"
                  >
                    Guardar como Borrador
                  </button>
                  <button
                    onClick={() => guardarFiniquito(true)}
                    className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition-colors font-semibold"
                  >
                    Guardar y Calcular
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== VISTA: DETAIL ====================
  if (view === "detail" && currentFiniquito) {
    return (
      <div className="h-full overflow-auto bg-[#040810] text-white p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[#040810] pb-4">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => {
                  setView("list");
                  setCurrentFiniquito(null);
                }}
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.06] transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[#7f93b0]" />
              </button>
              <h1 className="text-2xl font-bold">Detalle del Finiquito</h1>
            </div>

            {/* Flash message */}
            {flashMsg && (
              <div
                className={`p-3 rounded-lg mb-4 text-sm flex items-center gap-2 ${
                  flashMsg.type === "success"
                    ? "bg-emerald-900/40 text-emerald-200 border border-emerald-700/50"
                    : "bg-red-900/40 text-red-200 border border-red-700/50"
                }`}
              >
                {flashMsg.type === "success" ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {flashMsg.msg}
              </div>
            )}
          </div>

          {/* Status badge and general info */}
          <div className="bg-[#0a1628] p-6 rounded-lg border border-white/[0.08]">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  {currentFiniquito.full_name}
                </h2>
                <p className="text-[#7f93b0]">{currentFiniquito.employee_number}</p>
              </div>
              <span
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                  STATUS_COLORS[currentFiniquito.status]
                }`}
              >
                {currentFiniquito.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-[#7f93b0]">Tipo de Baja</div>
                <div className="font-medium">{currentFiniquito.tipo.replace(/_/g, " ")}</div>
              </div>
              <div>
                <div className="text-[#7f93b0]">Fecha Baja</div>
                <div className="font-medium">
                  {new Date(currentFiniquito.fecha_baja).toLocaleDateString("es-MX")}
                </div>
              </div>
              <div>
                <div className="text-[#7f93b0]">Antigüedad</div>
                <div className="font-medium">{currentFiniquito.antiguedad_dias} días</div>
              </div>
              <div>
                <div className="text-[#7f93b0]">Salario Diario</div>
                <div className="font-medium">
                  {formatMoney(currentFiniquito.salario_diario)}
                </div>
              </div>
            </div>
          </div>

          {/* Percepciones */}
          <div className="bg-[#0a1628] p-6 rounded-lg border border-white/[0.08]">
            <h3 className="text-lg font-semibold mb-4">Percepciones</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#7f93b0]">Aguinaldo Proporcional</span>
                <span className="font-medium">
                  {currentFiniquito.dias_aguinaldo_proporcional} días = {formatMoney(currentFiniquito.monto_aguinaldo)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7f93b0]">Vacaciones Pendientes</span>
                <span className="font-medium">
                  {currentFiniquito.dias_vacaciones_pendientes} días = {formatMoney(currentFiniquito.monto_vacaciones)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7f93b0]">Prima Vacacional (25%)</span>
                <span className="font-medium">{formatMoney(currentFiniquito.monto_prima_vacacional)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7f93b0]">Prima de Antigüedad</span>
                <span className="font-medium">
                  {currentFiniquito.dias_prima_antiguedad} días = {formatMoney(currentFiniquito.monto_prima_antiguedad)}
                </span>
              </div>
              {currentFiniquito.indemnizacion_90_dias > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#7f93b0]">Indemnización 90 días</span>
                  <span className="font-medium">
                    {formatMoney(currentFiniquito.indemnizacion_90_dias)}
                  </span>
                </div>
              )}
              {currentFiniquito.monto_salarios_caidos > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#7f93b0]">Salarios Caídos</span>
                  <span className="font-medium">
                    {currentFiniquito.salarios_caidos_dias} días = {formatMoney(currentFiniquito.monto_salarios_caidos)}
                  </span>
                </div>
              )}
              <div className="border-t border-white/[0.07] pt-2 flex justify-between font-semibold">
                <span>TOTAL PERCEPCIONES</span>
                <span className="text-green-400">
                  {formatMoney(currentFiniquito.total_percepciones)}
                </span>
              </div>
            </div>
          </div>

          {/* Deducciones */}
          {currentFiniquito.total_deducciones > 0 && (
            <div className="bg-[#0a1628] p-6 rounded-lg border border-white/[0.08]">
              <h3 className="text-lg font-semibold mb-4">Deducciones</h3>
              <div className="space-y-2 text-sm">
                {currentFiniquito.deducciones_infonavit > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#7f93b0]">INFONAVIT</span>
                    <span className="font-medium">
                      -{formatMoney(currentFiniquito.deducciones_infonavit)}
                    </span>
                  </div>
                )}
                {currentFiniquito.deducciones_prestamos > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#7f93b0]">Préstamos</span>
                    <span className="font-medium">
                      -{formatMoney(currentFiniquito.deducciones_prestamos)}
                    </span>
                  </div>
                )}
                {currentFiniquito.otras_deducciones > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#7f93b0]">Otras</span>
                    <span className="font-medium">
                      -{formatMoney(currentFiniquito.otras_deducciones)}
                    </span>
                  </div>
                )}
                <div className="border-t border-white/[0.07] pt-2 flex justify-between font-semibold">
                  <span>TOTAL DEDUCCIONES</span>
                  <span className="text-red-400">
                    -{formatMoney(currentFiniquito.total_deducciones)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* NETO */}
          <div className="bg-[#0a1628] p-6 rounded-lg border border-emerald-700 bg-gradient-to-r from-slate-900 to-emerald-950">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">NETO A PAGAR</h3>
              <div className="text-3xl font-bold text-aria-accent">
                {formatMoney(currentFiniquito.neto_a_pagar)}
              </div>
            </div>
          </div>

          {/* Notas */}
          {currentFiniquito.motivo && (
            <div className="bg-[#0a1628] p-6 rounded-lg border border-white/[0.08]">
              <h3 className="text-lg font-semibold mb-3">Motivo</h3>
              <p className="text-[#c9d8ed]">{currentFiniquito.motivo}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-lg bg-[#0f2448] hover:bg-[#162040] transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Imprimir
            </button>

            {currentFiniquito.status === "BORRADOR" && (
              <button
                onClick={() => actualizarEstatus(currentFiniquito.id, "CALCULADO")}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 transition-colors"
              >
                Marcar como Calculado
              </button>
            )}

            {currentFiniquito.status === "CALCULADO" && (
              <button
                onClick={() => actualizarEstatus(currentFiniquito.id, "APROBADO")}
                className="px-4 py-2 rounded-lg bg-aria-primary hover:bg-aria-primary-hover transition-colors"
              >
                Aprobar
              </button>
            )}

            {currentFiniquito.status === "APROBADO" && (
              <button
                onClick={() => actualizarEstatus(currentFiniquito.id, "PAGADO")}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Marcar como Pagado
              </button>
            )}

            {["BORRADOR", "CALCULADO"].includes(currentFiniquito.status) && (
              <button
                onClick={() => actualizarEstatus(currentFiniquito.id, "CANCELADO")}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
            )}
          </div>

          {/* Print styles */}
          <style>{`
            @media print {
              * { background: white !important; color: black !important; }
              .sticky { position: static; }
              button { display: none; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return null;
}
