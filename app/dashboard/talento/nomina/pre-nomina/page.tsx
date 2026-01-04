"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Calculator, CheckCircle, Clock, DollarSign, Users, FileText, Send } from "lucide-react";

interface Empleado {
  id: string;
  employee_number: string;
  full_name: string;
  position: string;
  salario_semanal: number;
  salario_diario: number;
  minimo_tarjeta: number;
  centro_trabajo?: { nombre: string };
}

interface DetalleNomina {
  employee_id: string;
  empleado?: Empleado;
  dias_trabajados: number;
  horas_extra: number;
  salario_base: number;
  pago_horas_extra: number;
  bonos: number;
  total_percepciones: number;
  prestamo_descuento: number;
  total_deducciones: number;
  sueldo_neto: number;
  pago_tarjeta: number;
  pago_efectivo: number;
}

export default function PreNominaPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [detalles, setDetalles] = useState<DetalleNomina[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculando, setCalculando] = useState(false);
  const [semanaInicio, setSemanaInicio] = useState("");
  const [semanaFin, setSemanaFin] = useState("");
  const [totales, setTotales] = useState({ bruto: 0, deducciones: 0, neto: 0, tarjeta: 0, efectivo: 0 });

  useEffect(() => {
    const hoy = new Date();
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay() + 1);
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);
    setSemanaInicio(inicioSemana.toISOString().split("T")[0]);
    setSemanaFin(finSemana.toISOString().split("T")[0]);
    cargarEmpleados();
  }, []);

  const cargarEmpleados = async () => {
    const { data } = await supabase
      .from("employees")
      .select("*, centro_trabajo:centros_trabajo(nombre)")
      .eq("status", "ACTIVO")
      .order("full_name");
    if (data) setEmpleados(data);
    setLoading(false);
  };

  const calcularNomina = async () => {
    setCalculando(true);
    const nuevosDetalles: DetalleNomina[] = [];
    let totalBruto = 0, totalDeducciones = 0, totalNeto = 0, totalTarjeta = 0, totalEfectivo = 0;

    for (const emp of empleados) {
      const { data: asistencias } = await supabase
        .from("asistencias")
        .select("*")
        .eq("employee_id", emp.id)
        .gte("fecha", semanaInicio)
        .lte("fecha", semanaFin);

      const { data: prestamos } = await supabase
        .from("prestamos")
        .select("descuento_semanal")
        .eq("employee_id", emp.id)
        .eq("status", "ACTIVO");

      const diasTrabajados = asistencias?.length || 0;
      const horasExtra = asistencias?.reduce((sum, a) => sum + (a.horas_extra || 0), 0) || 0;
      const salarioBase = (emp.salario_diario || 0) * diasTrabajados;
      const pagoHorasExtra = horasExtra * (emp.salario_diario || 0) / 8 * 2;
      const totalPercepciones = salarioBase + pagoHorasExtra;
      const prestamoDescuento = prestamos?.reduce((sum, p) => sum + (p.descuento_semanal || 0), 0) || 0;
      const totalDeduccionesEmp = prestamoDescuento;
      const sueldoNeto = totalPercepciones - totalDeduccionesEmp;
      const pagoTarjeta = Math.min(sueldoNeto, emp.minimo_tarjeta || 1096);
      const pagoEfectivo = Math.max(0, sueldoNeto - pagoTarjeta);

      nuevosDetalles.push({
        employee_id: emp.id,
        empleado: emp,
        dias_trabajados: diasTrabajados,
        horas_extra: horasExtra,
        salario_base: salarioBase,
        pago_horas_extra: pagoHorasExtra,
        bonos: 0,
        total_percepciones: totalPercepciones,
        prestamo_descuento: prestamoDescuento,
        total_deducciones: totalDeduccionesEmp,
        sueldo_neto: sueldoNeto,
        pago_tarjeta: pagoTarjeta,
        pago_efectivo: pagoEfectivo,
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

  const enviarAutorizacion = async () => {
    const folio = `NOM-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const { error } = await supabase.from("pre_nominas").insert({
      folio,
      semana_inicio: semanaInicio,
      semana_fin: semanaFin,
      anio: new Date().getFullYear(),
      numero_semana: Math.ceil((new Date(semanaInicio).getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 604800000),
      total_bruto: totales.bruto,
      total_deducciones: totales.deducciones,
      total_neto: totales.neto,
      total_tarjeta: totales.tarjeta,
      total_efectivo: totales.efectivo,
      status: "REVISION",
    });
    if (!error) {
      alert(`Pre-nómina ${folio} enviada a autorización`);
    }
  };

  const formatMoney = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pre-Nómina Semanal</h1>
          <p className="text-slate-400">Calcula y revisa antes de autorizar</p>
        </div>
        <div className="flex gap-3">
          <input type="date" value={semanaInicio} onChange={(e) => setSemanaInicio(e.target.value)} className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white" />
          <input type="date" value={semanaFin} onChange={(e) => setSemanaFin(e.target.value)} className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white" />
          <button onClick={calcularNomina} disabled={calculando} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            {calculando ? "Calculando..." : "Calcular"}
          </button>
        </div>
      </div>

      {/* Resumen */}
      {detalles.length > 0 && (
        <div className="grid grid-cols-5 gap-4">
          <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-xl">
            <p className="text-blue-400 text-sm">Total Bruto</p>
            <p className="text-2xl font-bold text-white">{formatMoney(totales.bruto)}</p>
          </div>
          <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
            <p className="text-red-400 text-sm">Deducciones</p>
            <p className="text-2xl font-bold text-white">{formatMoney(totales.deducciones)}</p>
          </div>
          <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
            <p className="text-green-400 text-sm">Total Neto</p>
            <p className="text-2xl font-bold text-white">{formatMoney(totales.neto)}</p>
          </div>
          <div className="p-4 bg-purple-500/20 border border-purple-500/30 rounded-xl">
            <p className="text-purple-400 text-sm">Por Tarjeta</p>
            <p className="text-2xl font-bold text-white">{formatMoney(totales.tarjeta)}</p>
          </div>
          <div className="p-4 bg-amber-500/20 border border-amber-500/30 rounded-xl">
            <p className="text-amber-400 text-sm">En Efectivo</p>
            <p className="text-2xl font-bold text-white">{formatMoney(totales.efectivo)}</p>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr className="text-left text-slate-400 text-sm">
              <th className="p-3">Empleado</th>
              <th className="p-3 text-center">Días</th>
              <th className="p-3 text-center">Hrs Extra</th>
              <th className="p-3 text-right">Salario</th>
              <th className="p-3 text-right">Hrs Extra $</th>
              <th className="p-3 text-right">Deducciones</th>
              <th className="p-3 text-right">Neto</th>
              <th className="p-3 text-right">Tarjeta</th>
              <th className="p-3 text-right">Efectivo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="p-8 text-center text-slate-400">Cargando...</td></tr>
            ) : detalles.length === 0 ? (
              <tr><td colSpan={9} className="p-8 text-center text-slate-400">Selecciona fechas y calcula la nómina</td></tr>
            ) : (
              detalles.map((d) => (
                <tr key={d.employee_id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="p-3">
                    <p className="text-white font-medium">{d.empleado?.full_name}</p>
                    <p className="text-slate-400 text-xs">{d.empleado?.position}</p>
                  </td>
                  <td className="p-3 text-center text-white">{d.dias_trabajados}</td>
                  <td className="p-3 text-center text-white">{d.horas_extra.toFixed(1)}</td>
                  <td className="p-3 text-right text-white">{formatMoney(d.salario_base)}</td>
                  <td className="p-3 text-right text-cyan-400">{formatMoney(d.pago_horas_extra)}</td>
                  <td className="p-3 text-right text-red-400">{formatMoney(d.total_deducciones)}</td>
                  <td className="p-3 text-right text-green-400 font-medium">{formatMoney(d.sueldo_neto)}</td>
                  <td className="p-3 text-right text-purple-400">{formatMoney(d.pago_tarjeta)}</td>
                  <td className="p-3 text-right text-amber-400">{formatMoney(d.pago_efectivo)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Botón Autorizar */}
      {detalles.length > 0 && (
        <div className="flex justify-end">
          <button onClick={enviarAutorizacion} className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 font-medium">
            <Send className="w-5 h-5" />
            Enviar a Autorización
          </button>
        </div>
      )}
    </div>
  );
}
