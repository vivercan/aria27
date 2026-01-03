"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Calculator, Calendar, Download, Users, DollarSign, AlertCircle, CheckCircle2, FileSpreadsheet } from "lucide-react";

export default function NóminaPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [nominaData, setNominaData] = useState<any[]>([]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [totales, setTotales] = useState({ empleados: 0, salarioBruto: 0, deducciones: 0, salarioNeto: 0 });
  const [Configuración, setConfiguración] = useState({ salario_minimo: 278.80, isr_base: 0.15, tolerancia_minutos: 15 });

  useEffect(() => {
    // Calcular semana JUEVES a MIÉRCOLES
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
    
    // Encontrar el JUEVES anterior (inicio de semana de pago)
    let juevesAnterior = new Date(today);
    if (dayOfWeek >= 4) {
      // Si es Jue, Vie o Sab -> el jueves de esta semana
      juevesAnterior.setDate(today.getDate() - (dayOfWeek - 4));
    } else {
      // Si es Dom, Lun, Mar o Mie -> el jueves de la semana pasada
      juevesAnterior.setDate(today.getDate() - (dayOfWeek + 3));
    }
    
    // El MIÉRCOLES es 6 días después del jueves
    let miercolesSiguiente = new Date(juevesAnterior);
    miercolesSiguiente.setDate(juevesAnterior.getDate() + 6);
    
    setFechaInicio(juevesAnterior.toISOString().split("T")[0]);
    setFechaFin(miercolesSiguiente.toISOString().split("T")[0]);
    loadConfiguración();
  }, []);

  const loadConfiguración = async () => {
    const { data } = await supabase.from("Configuraciónuracion_nomina").select("parametro, valor");
    if (data) {
      const c: any = {};
      data.forEach((i: any) => { c[i.parametro] = parseFloat(i.valor); });
      setConfiguración({ ...Configuración, ...c });
    }
    setLoading(false);
  };

  const semanaAnterior = () => {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    inicio.setDate(inicio.getDate() - 7);
    fin.setDate(fin.getDate() - 7);
    setFechaInicio(inicio.toISOString().split("T")[0]);
    setFechaFin(fin.toISOString().split("T")[0]);
  };

  const semanaSiguiente = () => {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    inicio.setDate(inicio.getDate() + 7);
    fin.setDate(fin.getDate() + 7);
    setFechaInicio(inicio.toISOString().split("T")[0]);
    setFechaFin(fin.toISOString().split("T")[0]);
  };

  const calcularNomina = async () => {
    setGenerating(true);
    const { data: Personal } = await supabase.from("Personal").select("*").eq("status", "ACTIVO").order("employee_number");
    if (!Personal) { setGenerating(false); return; }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    // Días laborables: Lunes a Sábado (6 días, excluyendo domingo)
    let diasLaborables = 0;
    for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0) diasLaborables++; // No contar domingos
    }

    const rows: any[] = [];
    for (const emp of Personal) {
      const { data: asistencias } = await supabase.from("asistencias").select("fecha, hora_entrada, hora_salida").eq("employee_id", emp.id).gte("fecha", fechaInicio).lte("fecha", fechaFin);
      const diasTrabajados = asistencias?.length || 0;
      const faltas = Math.max(0, diasLaborables - diasTrabajados);
      let retardos = 0;
      const horaBase = emp.hora_entrada || "08:00:00";
      asistencias?.forEach((a: any) => {
        if (a.hora_entrada) {
          const [hB, mB] = horaBase.split(":").map(Number);
          const [hR, mR] = a.hora_entrada.split(":").map(Number);
          if ((hR * 60 + mR) - (hB * 60 + mB) > Configuración.tolerancia_minutos) retardos++;
        }
      });
      const salarioDiario = emp.salario_diario || Configuración.salario_minimo;
      const salarioBruto = salarioDiario * diasTrabajados;
      const deduccionIMSS = salarioBruto * 0.0275;
      const deduccionISR = salarioBruto * Configuración.isr_base;
      const salarioNeto = salarioBruto - deduccionIMSS - deduccionISR;
      rows.push({ employee: emp, diasTrabajados, faltas, retardos, salarioBruto, deduccionIMSS, deduccionISR, salarioNeto });
    }
    setNominaData(rows);
    setTotales({
      empleados: rows.length,
      salarioBruto: rows.reduce((s, r) => s + r.salarioBruto, 0),
      deducciones: rows.reduce((s, r) => s + r.deduccionIMSS + r.deduccionISR, 0),
      salarioNeto: rows.reduce((s, r) => s + r.salarioNeto, 0),
    });
    setGenerating(false);
  };

  const exportCSV = () => {
    const csv = ["Empleado,No.Empleado,Dias,Faltas,Retardos,Salario Diario,Bruto,IMSS,ISR,Neto", ...nominaData.map(r => `${r.employee.full_name},${r.employee.employee_number},${r.diasTrabajados},${r.faltas},${r.retardos},${(r.employee.salario_diario || Configuración.salario_minimo).toFixed(2)},${r.salarioBruto.toFixed(2)},${r.deduccionIMSS.toFixed(2)},${r.deduccionISR.toFixed(2)},${r.salarioNeto.toFixed(2)}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `prenomina_${fechaInicio}_a_${fechaFin}.csv`;
    link.click();
  };

  const fmt = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
  
  const formatFecha = (fecha: string) => {
    const d = new Date(fecha + "T12:00:00");
    return d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Calculator className="w-7 h-7 text-emerald-400" />Pre-Nómina Semanal
        </h1>
        <p className="text-slate-400 mt-1">Período: Jueves a Miércoles | Pago: Jueves 12:00 PM</p>
      </div>

      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-400" />Semana de Pago
        </h2>
        <div className="flex items-center gap-4 flex-wrap">
          <button onClick={semanaAnterior} className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white">← Anterior</button>
          
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-white">
              {formatFecha(fechaInicio)} → {formatFecha(fechaFin)}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {fechaInicio} al {fechaFin}
            </p>
          </div>
          
          <button onClick={semanaSiguiente} className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white">Siguiente →</button>
          
          <button onClick={calcularNomina} disabled={generating} className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-medium hover:from-emerald-600 hover:to-green-600 disabled:opacity-50 flex items-center gap-2">
            {generating ? "Calculando..." : <><Calculator className="w-5 h-5" />Generar Pre-Nómina</>}
          </button>
        </div>
      </div>

      {nominaData.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20"><div className="flex items-center gap-2 text-blue-400 mb-1"><Users className="w-4 h-4" /><span className="text-sm">Empleados</span></div><p className="text-2xl font-bold text-white">{totales.empleados}</p></div>
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"><div className="flex items-center gap-2 text-emerald-400 mb-1"><DollarSign className="w-4 h-4" /><span className="text-sm">Bruto</span></div><p className="text-2xl font-bold text-white">{fmt(totales.salarioBruto)}</p></div>
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"><div className="flex items-center gap-2 text-amber-400 mb-1"><AlertCircle className="w-4 h-4" /><span className="text-sm">Deducciones</span></div><p className="text-2xl font-bold text-white">{fmt(totales.deducciones)}</p></div>
            <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20"><div className="flex items-center gap-2 text-violet-400 mb-1"><CheckCircle2 className="w-4 h-4" /><span className="text-sm">Neto a Pagar</span></div><p className="text-2xl font-bold text-white">{fmt(totales.salarioNeto)}</p></div>
          </div>

          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-blue-400" />Detalle por Empleado</h2>
              <button onClick={exportCSV} className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white text-sm flex items-center gap-2"><Download className="w-4 h-4" />Exportar CSV</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-white/[0.02]"><th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Empleado</th><th className="px-4 py-3 text-center text-xs text-slate-400">Días</th><th className="px-4 py-3 text-center text-xs text-slate-400">Faltas</th><th className="px-4 py-3 text-center text-xs text-slate-400">Retardos</th><th className="px-4 py-3 text-right text-xs text-slate-400">$/Día</th><th className="px-4 py-3 text-right text-xs text-slate-400">Bruto</th><th className="px-4 py-3 text-right text-xs text-slate-400">IMSS</th><th className="px-4 py-3 text-right text-xs text-slate-400">ISR</th><th className="px-4 py-3 text-right text-xs text-slate-400">NETO</th></tr></thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {nominaData.map((r, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3"><p className="text-white font-medium">{r.employee.full_name}</p><p className="text-xs text-slate-400">{r.employee.employee_number} • {r.employee.position || "Sin puesto"}</p></td>
                      <td className="px-4 py-3 text-center text-emerald-400 font-bold text-lg">{r.diasTrabajados}</td>
                      <td className="px-4 py-3 text-center"><span className={r.faltas > 0 ? "text-red-400 font-bold" : "text-slate-500"}>{r.faltas}</span></td>
                      <td className="px-4 py-3 text-center"><span className={r.retardos > 0 ? "text-amber-400 font-bold" : "text-slate-500"}>{r.retardos}</span></td>
                      <td className="px-4 py-3 text-right text-slate-300">{fmt(r.employee.salario_diario || Configuración.salario_minimo)}</td>
                      <td className="px-4 py-3 text-right text-white font-medium">{fmt(r.salarioBruto)}</td>
                      <td className="px-4 py-3 text-right text-red-400 text-sm">-{fmt(r.deduccionIMSS)}</td>
                      <td className="px-4 py-3 text-right text-red-400 text-sm">-{fmt(r.deduccionISR)}</td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-bold text-lg">{fmt(r.salarioNeto)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-white/[0.05] border-t-2 border-emerald-500/30">
                    <td colSpan={5} className="px-4 py-4 text-right text-white font-bold text-lg">TOTALES:</td>
                    <td className="px-4 py-4 text-right text-white font-bold">{fmt(totales.salarioBruto)}</td>
                    <td className="px-4 py-4 text-right text-red-400 font-bold">-{fmt(nominaData.reduce((s,r)=>s+r.deduccionIMSS,0))}</td>
                    <td className="px-4 py-4 text-right text-red-400 font-bold">-{fmt(nominaData.reduce((s,r)=>s+r.deduccionISR,0))}</td>
                    <td className="px-4 py-4 text-right text-emerald-400 font-bold text-xl">{fmt(totales.salarioNeto)}</td>
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

      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <p className="text-sm text-blue-300"><strong>Recordatorio:</strong> Pre-nómina lista cada Jueves 9:00 AM • Pago: Jueves 12:00 PM</p>
      </div>
    </div>
  );
}
