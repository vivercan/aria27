"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Calculator, Calendar, Download, Users, DollarSign, AlertCircle, CheckCircle2, FileSpreadsheet, Minus, Plus } from "lucide-react";

export default function NominaPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [nominaData, setNominaData] = useState<any[]>([]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [totales, setTotales] = useState({ empleados: 0, salarioBruto: 0, deducciones: 0, bonos: 0, salarioNeto: 0 });
  const [config, setConfig] = useState({ salario_minimo: 278.80, isr_base: 0.15, tolerancia_minutos: 15 });

  useEffect(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    let juevesAnterior = new Date(today);
    if (dayOfWeek >= 4) {
      juevesAnterior.setDate(today.getDate() - (dayOfWeek - 4));
    } else {
      juevesAnterior.setDate(today.getDate() - (dayOfWeek + 3));
    }
    let miercolesSiguiente = new Date(juevesAnterior);
    miercolesSiguiente.setDate(juevesAnterior.getDate() + 6);
    setFechaInicio(juevesAnterior.toISOString().split("T")[0]);
    setFechaFin(miercolesSiguiente.toISOString().split("T")[0]);
    setLoading(false);
  }, []);

  const semanaAnterior = () => {
    const inicio = new Date(fechaInicio);
    inicio.setDate(inicio.getDate() - 7);
    const fin = new Date(fechaFin);
    fin.setDate(fin.getDate() - 7);
    setFechaInicio(inicio.toISOString().split("T")[0]);
    setFechaFin(fin.toISOString().split("T")[0]);
  };

  const semanaSiguiente = () => {
    const inicio = new Date(fechaInicio);
    inicio.setDate(inicio.getDate() + 7);
    const fin = new Date(fechaFin);
    fin.setDate(fin.getDate() + 7);
    setFechaInicio(inicio.toISOString().split("T")[0]);
    setFechaFin(fin.toISOString().split("T")[0]);
  };

  const calcularNomina = async () => {
    setGenerating(true);
    const { data: empleados } = await supabase.from("employees").select("*").eq("status", "ACTIVO").order("employee_number");
    if (!empleados) { setGenerating(false); return; }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    let diasLaborables = 0;
    for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0) diasLaborables++;
    }

    const rows: any[] = [];
    for (const emp of empleados) {
      // Asistencias
      const { data: asistencias } = await supabase.from("asistencias").select("*").eq("employee_id", emp.id).gte("fecha", fechaInicio).lte("fecha", fechaFin);
      const diasTrabajados = asistencias?.length || 0;
      const faltas = Math.max(0, diasLaborables - diasTrabajados);
      
      let retardos = 0;
      const horaBase = emp.hora_entrada || "07:00:00";
      asistencias?.forEach((a: any) => {
        if (a.hora_entrada) {
          const [hB, mB] = horaBase.split(":").map(Number);
          const [hR, mR] = a.hora_entrada.split(":").map(Number);
          if ((hR * 60 + mR) - (hB * 60 + mB) > config.tolerancia_minutos) retardos++;
        }
      });

      // Préstamos activos
      const { data: prestamos } = await supabase.from("prestamos").select("*").eq("employee_id", emp.id).eq("status", "ACTIVO");
      const descuentoPrestamos = prestamos?.reduce((sum: number, p: any) => sum + (p.descuento_semanal || 0), 0) || 0;

      // Descuentos fijos
      const { data: descuentos } = await supabase.from("descuentos").select("*").eq("employee_id", emp.id).eq("activo", true);
      const descuentosFijos = descuentos?.reduce((sum: number, d: any) => sum + (d.monto || 0), 0) || 0;

      // Bonos de la semana
      const { data: bonos } = await supabase.from("bonos").select("*").eq("employee_id", emp.id).eq("aprobado", true).gte("fecha", fechaInicio).lte("fecha", fechaFin);
      const totalBonos = bonos?.reduce((sum: number, b: any) => sum + (b.monto || 0), 0) || 0;

      const salarioDiario = emp.salario_diario || config.salario_minimo;
      const salarioBruto = salarioDiario * diasTrabajados;
      const deduccionIMSS = salarioBruto * 0.0275;
      const deduccionISR = salarioBruto * config.isr_base;
      const totalDeducciones = deduccionIMSS + deduccionISR + descuentoPrestamos + descuentosFijos;
      const salarioNeto = salarioBruto + totalBonos - totalDeducciones;

      rows.push({
        employee: emp,
        diasTrabajados,
        faltas,
        retardos,
        salarioBruto,
        deduccionIMSS,
        deduccionISR,
        descuentoPrestamos,
        descuentosFijos,
        totalBonos,
        totalDeducciones,
        salarioNeto,
        prestamos: prestamos || [],
        descuentos: descuentos || [],
        bonos: bonos || []
      });
    }

    setNominaData(rows);
    setTotales({
      empleados: rows.length,
      salarioBruto: rows.reduce((s, r) => s + r.salarioBruto, 0),
      deducciones: rows.reduce((s, r) => s + r.totalDeducciones, 0),
      bonos: rows.reduce((s, r) => s + r.totalBonos, 0),
      salarioNeto: rows.reduce((s, r) => s + r.salarioNeto, 0),
    });
    setGenerating(false);
  };

  const exportCSV = () => {
    const headers = "Empleado,No.Emp,Dias,Faltas,Retardos,$/Dia,Bruto,IMSS,ISR,Prestamos,Descuentos,Bonos,Neto";
    const csv = [headers, ...nominaData.map(r => 
      `${r.employee.full_name},${r.employee.employee_number},${r.diasTrabajados},${r.faltas},${r.retardos},${(r.employee.salario_diario || config.salario_minimo).toFixed(2)},${r.salarioBruto.toFixed(2)},${r.deduccionIMSS.toFixed(2)},${r.deduccionISR.toFixed(2)},${r.descuentoPrestamos.toFixed(2)},${r.descuentosFijos.toFixed(2)},${r.totalBonos.toFixed(2)},${r.salarioNeto.toFixed(2)}`
    )].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `prenomina_${fechaInicio}_${fechaFin}.csv`;
    link.click();
  };

  const fmt = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
  const formatFecha = (f: string) => new Date(f + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Calculator className="w-7 h-7 text-emerald-400" />Pre-Nómina Semanal
        </h1>
        <p className="text-slate-400 mt-1">Período: Jueves a Miércoles | Incluye préstamos, descuentos y bonos</p>
      </div>

      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
        <div className="flex items-center gap-4 flex-wrap">
          <button onClick={semanaAnterior} className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white">← Anterior</button>
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-white">{formatFecha(fechaInicio)} → {formatFecha(fechaFin)}</p>
            <p className="text-sm text-slate-400 mt-1">{fechaInicio} al {fechaFin}</p>
          </div>
          <button onClick={semanaSiguiente} className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white">Siguiente →</button>
          <button onClick={calcularNomina} disabled={generating} className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-medium hover:from-emerald-600 hover:to-green-600 disabled:opacity-50 flex items-center gap-2">
            {generating ? "Calculando..." : <><Calculator className="w-5 h-5" />Generar Pre-Nómina</>}
          </button>
        </div>
      </div>

      {nominaData.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 text-blue-400 mb-1"><Users className="w-4 h-4" /><span className="text-sm">Empleados</span></div>
              <p className="text-2xl font-bold text-white">{totales.empleados}</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 text-emerald-400 mb-1"><DollarSign className="w-4 h-4" /><span className="text-sm">Bruto</span></div>
              <p className="text-2xl font-bold text-white">{fmt(totales.salarioBruto)}</p>
            </div>
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 text-green-400 mb-1"><Plus className="w-4 h-4" /><span className="text-sm">Bonos</span></div>
              <p className="text-2xl font-bold text-white">{fmt(totales.bonos)}</p>
            </div>
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2 text-red-400 mb-1"><Minus className="w-4 h-4" /><span className="text-sm">Deducciones</span></div>
              <p className="text-2xl font-bold text-white">{fmt(totales.deducciones)}</p>
            </div>
            <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <div className="flex items-center gap-2 text-violet-400 mb-1"><CheckCircle2 className="w-4 h-4" /><span className="text-sm">Neto</span></div>
              <p className="text-2xl font-bold text-white">{fmt(totales.salarioNeto)}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-blue-400" />Detalle por Empleado</h2>
              <button onClick={exportCSV} className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white text-sm flex items-center gap-2"><Download className="w-4 h-4" />Exportar CSV</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th className="px-3 py-3 text-left text-xs text-slate-400">Empleado</th>
                    <th className="px-2 py-3 text-center text-xs text-slate-400">Días</th>
                    <th className="px-2 py-3 text-center text-xs text-slate-400">Faltas</th>
                    <th className="px-2 py-3 text-center text-xs text-slate-400">Ret.</th>
                    <th className="px-2 py-3 text-right text-xs text-slate-400">Bruto</th>
                    <th className="px-2 py-3 text-right text-xs text-slate-400">IMSS</th>
                    <th className="px-2 py-3 text-right text-xs text-slate-400">ISR</th>
                    <th className="px-2 py-3 text-right text-xs text-slate-400">Prést.</th>
                    <th className="px-2 py-3 text-right text-xs text-slate-400">Desc.</th>
                    <th className="px-2 py-3 text-right text-xs text-slate-400 text-green-400">Bonos</th>
                    <th className="px-3 py-3 text-right text-xs text-slate-400">NETO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {nominaData.map((r, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-3 py-3">
                        <p className="text-white font-medium">{r.employee.full_name}</p>
                        <p className="text-xs text-slate-500">{r.employee.employee_number}</p>
                      </td>
                      <td className="px-2 py-3 text-center text-emerald-400 font-bold">{r.diasTrabajados}</td>
                      <td className="px-2 py-3 text-center"><span className={r.faltas > 0 ? "text-red-400 font-bold" : "text-slate-500"}>{r.faltas}</span></td>
                      <td className="px-2 py-3 text-center"><span className={r.retardos > 0 ? "text-amber-400" : "text-slate-500"}>{r.retardos}</span></td>
                      <td className="px-2 py-3 text-right text-white">{fmt(r.salarioBruto)}</td>
                      <td className="px-2 py-3 text-right text-red-400 text-xs">-{fmt(r.deduccionIMSS)}</td>
                      <td className="px-2 py-3 text-right text-red-400 text-xs">-{fmt(r.deduccionISR)}</td>
                      <td className="px-2 py-3 text-right text-orange-400 text-xs">{r.descuentoPrestamos > 0 ? `-${fmt(r.descuentoPrestamos)}` : "-"}</td>
                      <td className="px-2 py-3 text-right text-amber-400 text-xs">{r.descuentosFijos > 0 ? `-${fmt(r.descuentosFijos)}` : "-"}</td>
                      <td className="px-2 py-3 text-right text-green-400 text-xs">{r.totalBonos > 0 ? `+${fmt(r.totalBonos)}` : "-"}</td>
                      <td className="px-3 py-3 text-right text-emerald-400 font-bold">{fmt(r.salarioNeto)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-emerald-500/10 border-t-2 border-emerald-500/30">
                    <td colSpan={4} className="px-3 py-4 text-right text-white font-bold">TOTALES:</td>
                    <td className="px-2 py-4 text-right text-white font-bold">{fmt(totales.salarioBruto)}</td>
                    <td colSpan={4} className="px-2 py-4 text-right text-red-400 font-bold">-{fmt(totales.deducciones)}</td>
                    <td className="px-2 py-4 text-right text-green-400 font-bold">+{fmt(totales.bonos)}</td>
                    <td className="px-3 py-4 text-right text-emerald-400 font-bold text-lg">{fmt(totales.salarioNeto)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {nominaData.length === 0 && !generating && (
        <div className="p-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
          <Calculator className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Sin datos de nómina</h3>
          <p className="text-slate-400">Clic en "Generar Pre-Nómina" para calcular</p>
        </div>
      )}
    </div>
  );
}
