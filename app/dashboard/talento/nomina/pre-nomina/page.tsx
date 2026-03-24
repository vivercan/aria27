"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Calculator, CheckCircle, Clock, DollarSign, Users, FileText, Send, ArrowLeft, Loader2, AlertCircle, Calendar } from "lucide-react";

interface Empleado {
  id: string;
  employee_number: string;
  full_name: string;
  position: string;
  project_site: string;
  salario_semanal: number;
  salario_diario: number;
  minimo_tarjeta: number;
}

interface DetalleNomina {
  employee_id: string;
  empleado?: Empleado;
  dias_trabajados: number;
  horas_extra: number;
  salario_base: number;
  pago_horas_extra: number;
  total_percepciones: number;
  prestamo_descuento: number;
  total_deducciones: number;
  sueldo_neto: number;
  pago_tarjeta: number;
  pago_efectivo: number;
}

// Obtener rango de semana Jueves-Miércoles
function getWeekRange(date: Date): { inicio: Date; fin: Date; semana: number } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToThursday = day >= 4 ? day - 4 : day + 3;
  const jueves = new Date(d);
  jueves.setDate(d.getDate() - diffToThursday);
  const miercoles = new Date(jueves);
  miercoles.setDate(jueves.getDate() + 6);
  
  // Calcular número de semana
  const tempDate = new Date(jueves);
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
  const yearStart = new Date(tempDate.getFullYear(), 0, 1);
  const semana = Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  
  return { inicio: jueves, fin: miercoles, semana };
}

export default function PreNominaPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [detalles, setDetalles] = useState<DetalleNomina[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculando, setCalculando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [mensaje, setMensaje] = useState<{tipo: "success" | "error"; texto: string} | null>(null);
  const [semanaInfo, setSemanaInfo] = useState({ inicio: "", fin: "", semana: 0 });
  const [totales, setTotales] = useState({ bruto: 0, deducciones: 0, neto: 0, tarjeta: 0, efectivo: 0 });

  useEffect(() => {
    const hoy = new Date();
    const { inicio, fin, semana } = getWeekRange(hoy);
    setSemanaInfo({
      inicio: inicio.toISOString().split("T")[0],
      fin: fin.toISOString().split("T")[0],
      semana
    });
    cargarEmpleados();
  }, []);

  const cargarEmpleados = async () => {
    const { data, error: PersonalErr } = await supabase
      .from("Personal")
      .select("*")
      .eq("status", "ACTIVO")
      .order("full_name");
    if (PersonalErr) console.error("Error loading Personal:", PersonalErr.message);
    if (data) setEmpleados(data);
    setLoading(false);
  };

  const calcularPreNomina = async () => {
    setCalculando(true);
    setMensaje(null);
    const nuevosDetalles: DetalleNomina[] = [];
    let totalBruto = 0, totalDeducciones = 0, totalNeto = 0, totalTarjeta = 0, totalEfectivo = 0;

    const { data: config, error: configuracionNominaerr } = await supabase.from("configuracion_nomina").select("*");
    if (configuracionNominaerr) console.error("Error loading configuracion_nomina:", configuracionNominaerr.message);
    const getConfig = (clave: string, def: number) => {
      const c = config?.find(x => x.clave === clave);
      return c ? parseFloat(c.valor) : def;
    };
    const factorDoble = getConfig("factor_hora_extra_doble", 2);
    const minimoTarjetaDef = getConfig("minimo_tarjeta_default", 1096);

    for (const emp of empleados) {
      const { data: asistencias, error: asistenciasErr } = await supabase
        .from("asistencias")
        .select("*")
        .eq("employee_id", emp.id)
        .gte("fecha", semanaInfo.inicio)
        .lte("fecha", semanaInfo.fin);
      if (asistenciasErr) console.error("Error loading asistencias:", asistenciasErr.message);

      const { data: prestamos, error: prestamosErr } = await supabase
        .from("prestamos")
        .select("descuento_semanal")
        .eq("employee_id", emp.id)
        .eq("status", "ACTIVO");
      if (prestamosErr) console.error("Error loading prestamos:", prestamosErr.message);

      const diasTrabajados = asistencias?.length || 0;
      const horasExtra = asistencias?.reduce((sum, a) => sum + (a.horas_extra || 0), 0) || 0;
      const salarioBase = (emp.salario_diario || 0) * diasTrabajados;
      const pagoHorasExtra = horasExtra * (emp.salario_diario || 0) / 8 * factorDoble;
      const totalPercepciones = salarioBase + pagoHorasExtra;
      const prestamoDescuento = prestamos?.reduce((sum, p) => sum + (p.descuento_semanal || 0), 0) || 0;
      const totalDeduccionesEmp = prestamoDescuento;
      const sueldoNeto = totalPercepciones - totalDeduccionesEmp;
      const minTarjeta = emp.minimo_tarjeta || minimoTarjetaDef;
      const pagoTarjeta = Math.min(sueldoNeto, minTarjeta);
      const pagoEfectivo = Math.max(0, sueldoNeto - pagoTarjeta);

      nuevosDetalles.push({
        employee_id: emp.id,
        empleado: emp,
        dias_trabajados: diasTrabajados,
        horas_extra: horasExtra,
        salario_base: salarioBase,
        pago_horas_extra: pagoHorasExtra,
        total_percepciones: totalPercepciones,
        prestamo_descuento: prestamoDescuento,
        total_deducciones: totalDeduccionesEmp,
        sueldo_neto: sueldoNeto,
        pago_tarjeta: pagoTarjeta,
        pago_efectivo: pagoEfectivo
      });

      totalBruto += totalPercepciones;
      totalDeducciones += totalDeduccionesEmp;
      totalNeto += sueldoNeto;
      totalTarjeta += pagoTarjeta;
      totalEfectivo += pagoEfectivo;
    }

    setDetalles(nuevosDetalles);
    setTotales({ bruto: totalBruto, deducciones: totalDeducciones, neto: totalNeto, tarjeta: totalTarjeta, efectivo: totalEfectivo });
    setCalculando(false);
  };

  const generarNomina = async () => {
    setGenerando(true);
    setMensaje(null);
    try {
      const res = await fetch("/api/nomina/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fechaReferencia: semanaInfo.inicio })
      });
      const data = await res.json();
      if (data.error) {
        setMensaje({ tipo: "error", texto: data.error });
      } else {
        setMensaje({ tipo: "success", texto: `✅ Nómina generada: ${data.registros} empleados | Total: $${data.totales.neto.toLocaleString("es-MX", {minimumFractionDigits: 2})}` });
      }
    } catch (e: any) {
      setMensaje({ tipo: "error", texto: e.message });
    }
    setGenerando(false);
  };

  const formatMoney = (n: number) => `$${(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
  const formatDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" });

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/talento/nomina" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/20">
            <Calculator className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Pre-Nómina</h1>
            <p className="text-slate-400 text-sm">Semana {semanaInfo.semana} | {formatDate(semanaInfo.inicio)} - {formatDate(semanaInfo.fin)} (Jue-Mié)</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={calcularPreNomina} disabled={calculando} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-300 hover:from-cyan-500/30 hover:to-blue-500/30 transition-all disabled:opacity-50">
            {calculando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            {calculando ? "Calculando..." : "Calcular"}
          </button>
          <button onClick={generarNomina} disabled={generando || detalles.length === 0} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-medium hover:from-emerald-600 hover:to-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {generando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {generando ? "Generando..." : "Generar Nómina"}
          </button>
        </div>
      </div>

      {/* Mensaje */}
      {mensaje && (
        <div className={`p-4 rounded-xl border ${mensaje.tipo === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
          {mensaje.texto}
        </div>
      )}

      {/* Totales */}
      {detalles.length > 0 && (
        <div className="grid grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20">
            <p className="text-slate-400 text-xs mb-1">Total Bruto</p>
            <p className="text-xl font-bold text-white">{formatMoney(totales.bruto)}</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/20">
            <p className="text-slate-400 text-xs mb-1">Deducciones</p>
            <p className="text-xl font-bold text-red-400">{formatMoney(totales.deducciones)}</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-500/20">
            <p className="text-slate-400 text-xs mb-1">Neto a Pagar</p>
            <p className="text-xl font-bold text-emerald-400">{formatMoney(totales.neto)}</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-500/20">
            <p className="text-slate-400 text-xs mb-1">Transferencia</p>
            <p className="text-xl font-bold text-purple-400">{formatMoney(totales.tarjeta)}</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/20">
            <p className="text-slate-400 text-xs mb-1">Efectivo</p>
            <p className="text-xl font-bold text-amber-400">{formatMoney(totales.efectivo)}</p>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm">
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Empleado</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Puesto</th>
                <th className="text-center p-4 text-slate-400 font-medium text-sm">Días</th>
                <th className="text-right p-4 text-slate-400 font-medium text-sm">Salario Base</th>
                <th className="text-right p-4 text-slate-400 font-medium text-sm">Hrs Extra</th>
                <th className="text-right p-4 text-slate-400 font-medium text-sm">Deducciones</th>
                <th className="text-right p-4 text-slate-400 font-medium text-sm">Neto</th>
                <th className="text-right p-4 text-slate-400 font-medium text-sm">Tarjeta</th>
                <th className="text-right p-4 text-slate-400 font-medium text-sm">Efectivo</th>
              </tr>
            </thead>
            <tbody>
              {detalles.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-slate-500">Presiona "Calcular" para ver la pre-nómina</td></tr>
              ) : (
                detalles.map((d, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-4"><span className="text-white font-medium">{d.empleado?.full_name}</span></td>
                    <td className="p-4"><span className="px-2 py-1 rounded-lg bg-slate-700/50 text-slate-300 text-xs">{d.empleado?.position}</span></td>
                    <td className="p-4 text-center"><span className={`font-bold ${d.dias_trabajados >= 6 ? "text-emerald-400" : d.dias_trabajados >= 4 ? "text-amber-400" : "text-red-400"}`}>{d.dias_trabajados}</span></td>
                    <td className="p-4 text-right text-white">{formatMoney(d.salario_base)}</td>
                    <td className="p-4 text-right text-cyan-400">{formatMoney(d.pago_horas_extra)}</td>
                    <td className="p-4 text-right text-red-400">{formatMoney(d.total_deducciones)}</td>
                    <td className="p-4 text-right text-emerald-400 font-bold">{formatMoney(d.sueldo_neto)}</td>
                    <td className="p-4 text-right text-purple-400">{formatMoney(d.pago_tarjeta)}</td>
                    <td className="p-4 text-right text-amber-400">{formatMoney(d.pago_efectivo)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Calculator, CheckCircle, Clock, DollarSign, Users, FileText, Send, ArrowLeft, Loader2, AlertCircle, Calendar } from "lucide-react";

interface Empleado {
  id: string;
  employee_number: string;
  full_name: string;
  position: string;
  project_site: string;
  salario_semanal: number;
  salario_diario: number;
  minimo_tarjeta: number;
}

interface DetalleNomina {
  employee_id: string;
  empleado?: Empleado;
  dias_trabajados: number;
  horas_extra: number;
  salario_base: number;
  pago_horas_extra: number;
  total_percepciones: number;
  prestamo_descuento: number;
  total_deducciones: number;
  sueldo_neto: number;
  pago_tarjeta: number;
  pago_efectivo: number;
}

// Obtener rango de semana Jueves-Miércoles
function getWeekRange(date: Date): { inicio: Date; fin: Date; semana: number } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToThursday = day >= 4 ? day - 4 : day + 3;
  const jueves = new Date(d);
  jueves.setDate(d.getDate() - diffToThursday);
  const miercoles = new Date(jueves);
  miercoles.setDate(jueves.getDate() + 6);
  
  // Calcular número de semana
  const tempDate = new Date(jueves);
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
  const yearStart = new Date(tempDate.getFullYear(), 0, 1);
  const semana = Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  
  return { inicio: jueves, fin: miercoles, semana };
}

export default function PreNominaPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [detalles, setDetalles] = useState<DetalleNomina[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculando, setCalculando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [mensaje, setMensaje] = useState<{tipo: "success" | "error"; texto: string} | null>(null);
  const [semanaInfo, setSemanaInfo] = useState({ inicio: "", fin: "", semana: 0 });
  const [totales, setTotales] = useState({ bruto: 0, deducciones: 0, neto: 0, tarjeta: 0, efectivo: 0 });

  useEffect(() => {
    const hoy = new Date();
    const { inicio, fin, semana } = getWeekRange(hoy);
    setSemanaInfo({
      inicio: inicio.toISOString().split("T")[0],
      fin: fin.toISOString().split("T")[0],
      semana
    });
    cargarEmpleados();
  }, []);

  const cargarEmpleados = async () => {
    const { data } = await supabase
      .from("Personal")
      .select("*")
      .eq("status", "ACTIVO")
      .order("full_name");
    if (data) setEmpleados(data);
    setLoading(false);
  };

  const calcularPreNomina = async () => {
    setCalculando(true);
    setMensaje(null);
    const nuevosDetalles: DetalleNomina[] = [];
    let totalBruto = 0, totalDeducciones = 0, totalNeto = 0, totalTarjeta = 0, totalEfectivo = 0;

    const { data: config } = await supabase.from("configuracion_nomina").select("*");
    const getConfig = (clave: string, def: number) => {
      const c = config?.find(x => x.clave === clave);
      return c ? parseFloat(c.valor) : def;
    };
    const factorDoble = getConfig("factor_hora_extra_doble", 2);
    const minimoTarjetaDef = getConfig("minimo_tarjeta_default", 1096);

    for (const emp of empleados) {
      const { data: asistencias } = await supabase
        .from("asistencias")
        .select("*")
        .eq("employee_id", emp.id)
        .gte("fecha", semanaInfo.inicio)
        .lte("fecha", semanaInfo.fin);

      const { data: prestamos } = await supabase
        .from("prestamos")
        .select("descuento_semanal")
        .eq("employee_id", emp.id)
        .eq("status", "ACTIVO");

      const diasTrabajados = asistencias?.length || 0;
      const horasExtra = asistencias?.reduce((sum, a) => sum + (a.horas_extra || 0), 0) || 0;
      const salarioBase = (emp.salario_diario || 0) * diasTrabajados;
      const pagoHorasExtra = horasExtra * (emp.salario_diario || 0) / 8 * factorDoble;
      const totalPercepciones = salarioBase + pagoHorasExtra;
      const prestamoDescuento = prestamos?.reduce((sum, p) => sum + (p.descuento_semanal || 0), 0) || 0;
      const totalDeduccionesEmp = prestamoDescuento;
      const sueldoNeto = totalPercepciones - totalDeduccionesEmp;
      const minTarjeta = emp.minimo_tarjeta || minimoTarjetaDef;
      const pagoTarjeta = Math.min(sueldoNeto, minTarjeta);
      const pagoEfectivo = Math.max(0, sueldoNeto - pagoTarjeta);

      nuevosDetalles.push({
        employee_id: emp.id,
        empleado: emp,
        dias_trabajados: diasTrabajados,
        horas_extra: horasExtra,
        salario_base: salarioBase,
        pago_horas_extra: pagoHorasExtra,
        total_percepciones: totalPercepciones,
        prestamo_descuento: prestamoDescuento,
        total_deducciones: totalDeduccionesEmp,
        sueldo_neto: sueldoNeto,
        pago_tarjeta: pagoTarjeta,
        pago_efectivo: pagoEfectivo
      });

      totalBruto += totalPercepciones;
      totalDeducciones += totalDeduccionesEmp;
      totalNeto += sueldoNeto;
      totalTarjeta += pagoTarjeta;
      totalEfectivo += pagoEfectivo;
    }

    setDetalles(nuevosDetalles);
    setTotales({ bruto: totalBruto, deducciones: totalDeducciones, neto: totalNeto, tarjeta: totalTarjeta, efectivo: totalEfectivo });
    setCalculando(false);
  };

  const generarNomina = async () => {
    setGenerando(true);
    setMensaje(null);
    try {
      const res = await fetch("/api/nomina/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fechaReferencia: semanaInfo.inicio })
      });
      const data = await res.json();
      if (data.error) {
        setMensaje({ tipo: "error", texto: data.error });
      } else {
        setMensaje({ tipo: "success", texto: `✅ Nómina generada: ${data.registros} empleados | Total: $${data.totales.neto.toLocaleString("es-MX", {minimumFractionDigits: 2})}` });
      }
    } catch (e: any) {
      setMensaje({ tipo: "error", texto: e.message });
    }
    setGenerando(false);
  };

  const formatMoney = (n: number) => `$${(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
  const formatDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" });

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/talento/nomina" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/20">
            <Calculator className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Pre-Nómina</h1>
            <p className="text-slate-400 text-sm">Semana {semanaInfo.semana} | {formatDate(semanaInfo.inicio)} - {formatDate(semanaInfo.fin)} (Jue-Mié)</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={calcularPreNomina} disabled={calculando} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-300 hover:from-cyan-500/30 hover:to-blue-500/30 transition-all disabled:opacity-50">
            {calculando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            {calculando ? "Calculando..." : "Calcular"}
          </button>
          <button onClick={generarNomina} disabled={generando || detalles.length === 0} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-medium hover:from-emerald-600 hover:to-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {generando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {generando ? "Generando..." : "Generar Nómina"}
          </button>
        </div>
      </div>

      {/* Mensaje */}
      {mensaje && (
        <div className={`p-4 rounded-xl border ${mensaje.tipo === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
          {mensaje.texto}
        </div>
      )}

      {/* Totales */}
      {detalles.length > 0 && (
        <div className="grid grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20">
            <p className="text-slate-400 text-xs mb-1">Total Bruto</p>
            <p className="text-xl font-bold text-white">{formatMoney(totales.bruto)}</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/20">
            <p className="text-slate-400 text-xs mb-1">Deducciones</p>
            <p className="text-xl font-bold text-red-400">{formatMoney(totales.deducciones)}</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-500/20">
            <p className="text-slate-400 text-xs mb-1">Neto a Pagar</p>
            <p className="text-xl font-bold text-emerald-400">{formatMoney(totales.neto)}</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-500/20">
            <p className="text-slate-400 text-xs mb-1">Transferencia</p>
            <p className="text-xl font-bold text-purple-400">{formatMoney(totales.tarjeta)}</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/20">
            <p className="text-slate-400 text-xs mb-1">Efectivo</p>
            <p className="text-xl font-bold text-amber-400">{formatMoney(totales.efectivo)}</p>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm">
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Empleado</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Puesto</th>
                <th className="text-center p-4 text-slate-400 font-medium text-sm">Días</th>
                <th className="text-right p-4 text-slate-400 font-medium text-sm">Salario Base</th>
                <th className="text-right p-4 text-slate-400 font-medium text-sm">Hrs Extra</th>
                <th className="text-right p-4 text-slate-400 font-medium text-sm">Deducciones</th>
                <th className="text-right p-4 text-slate-400 font-medium text-sm">Neto</th>
                <th className="text-right p-4 text-slate-400 font-medium text-sm">Tarjeta</th>
                <th className="text-right p-4 text-slate-400 font-medium text-sm">Efectivo</th>
              </tr>
            </thead>
            <tbody>
              {detalles.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-slate-500">Presiona "Calcular" para ver la pre-nómina</td></tr>
              ) : (
                detalles.map((d, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-4"><span className="text-white font-medium">{d.empleado?.full_name}</span></td>
                    <td className="p-4"><span className="px-2 py-1 rounded-lg bg-slate-700/50 text-slate-300 text-xs">{d.empleado?.position}</span></td>
                    <td className="p-4 text-center"><span className={`font-bold ${d.dias_trabajados >= 6 ? "text-emerald-400" : d.dias_trabajados >= 4 ? "text-amber-400" : "text-red-400"}`}>{d.dias_trabajados}</span></td>
                    <td className="p-4 text-right text-white">{formatMoney(d.salario_base)}</td>
                    <td className="p-4 text-right text-cyan-400">{formatMoney(d.pago_horas_extra)}</td>
                    <td className="p-4 text-right text-red-400">{formatMoney(d.total_deducciones)}</td>
                    <td className="p-4 text-right text-emerald-400 font-bold">{formatMoney(d.sueldo_neto)}</td>
                    <td className="p-4 text-right text-purple-400">{formatMoney(d.pago_tarjeta)}</td>
                    <td className="p-4 text-right text-amber-400">{formatMoney(d.pago_efectivo)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
