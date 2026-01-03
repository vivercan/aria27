"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Calculator, Calendar, Download, Users, DollarSign, AlertCircle, CheckCircle2, FileSpreadsheet } from "lucide-react";

export default function PayrollPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [nominaData, setNominaData] = useState<any[]>([]);
  const [periodoTipo, setPeriodoTipo] = useState("quincenal");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [totales, setTotales] = useState({ empleados: 0, salarioBruto: 0, deducciones: 0, salarioNeto: 0 });
  const [config, setConfig] = useState({ salario_minimo: 278.80, isr_base: 0.15, tolerancia_minutos: 15 });

  useEffect(() => {
    const today = new Date();
    const day = today.getDate();
    if (day <= 15) {
      setFechaInicio(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]);
      setFechaFin(new Date(today.getFullYear(), today.getMonth(), 15).toISOString().split("T")[0]);
    } else {
      setFechaInicio(new Date(today.getFullYear(), today.getMonth(), 16).toISOString().split("T")[0]);
      setFechaFin(new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0]);
    }
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data } = await supabase.from("configuracion_nomina").select("parametro, valor");
    if (data) {
      const c: any = {};
      data.forEach((i: any) => { c[i.parametro] = parseFloat(i.valor); });
      setConfig({ ...config, ...c });
    }
    setLoading(false);
  };

  const calcularNomina = async () => {
    setGenerating(true);
    const { data: employees } = await supabase.from("employees").select("*").eq("status", "ACTIVO").order("employee_number");
    if (!employees) { setGenerating(false); return; }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    let diasLaborables = 0;
    for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0) diasLaborables++;
    }

    const rows: any[] = [];
    for (const emp of employees) {
      const { data: asistencias } = await supabase.from("asistencias").select("fecha, hora_entrada, hora_salida").eq("employee_id", emp.id).gte("fecha", fechaInicio).lte("fecha", fechaFin);
      const diasTrabajados = asistencias?.length || 0;
      const faltas = diasLaborables - diasTrabajados;
      let retardos = 0;
      const horaBase = emp.hora_entrada || "08:00:00";
      asistencias?.forEach((a: any) => {
        if (a.hora_entrada) {
          const [hB, mB] = horaBase.split(":").map(Number);
          const [hR, mR] = a.hora_entrada.split(":").map(Number);
          if ((hR * 60 + mR) - (hB * 60 + mB) > config.tolerancia_minutos) retardos++;
        }
      });
      const salarioDiario = emp.salario_diario || config.salario_minimo;
      const salarioBruto = salarioDiario * diasTrabajados;
      const deduccionIMSS = salarioBruto * 0.0275;
      const deduccionISR = salarioBruto * config.isr_base;
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
    const csv = ["Empleado,Dias,Faltas,Retardos,Bruto,IMSS,ISR,Neto", ...nominaData.map(r => `${r.employee.full_name},${r.diasTrabajados},${r.faltas},${r.retardos},${r.salarioBruto.toFixed(2)},${r.deduccionIMSS.toFixed(2)},${r.deduccionISR.toFixed(2)},${r.salarioNeto.toFixed(2)}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `nomina_${fechaInicio}_${fechaFin}.csv`;
    link.click();
  };

  const fmt = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-white flex items-center gap-3"><Calculator className="w-7 h-7 text-emerald-400" />Pre-Nómina</h1><p className="text-slate-400 mt-1">Genera la pre-nómina del período</p></div>
      
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-400" />Período</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div><label className="block text-sm text-slate-400 mb-2">Tipo</label><select value={periodoTipo} onChange={e => setPeriodoTipo(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white"><option value="quincenal">Quincenal</option><option value="semanal">Semanal</option></select></div>
          <div><label className="block text-sm text-slate-400 mb-2">Inicio</label><input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white" /></div>
          <div><label className="block text-sm text-slate-400 mb-2">Fin</label><input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white" /></div>
          <div className="flex items-end"><button onClick={calcularNomina} disabled={generating} className="w-full px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-medium hover:from-emerald-600 hover:to-green-600 disabled:opacity-50 flex items-center justify-center gap-2">{generating ? "Calculando..." : <><Calculator className="w-4 h-4" />Generar</>}</button></div>
        </div>
      </div>

      {nominaData.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20"><div className="flex items-center gap-2 text-blue-400 mb-1"><Users className="w-4 h-4" /><span className="text-sm">Empleados</span></div><p className="text-2xl font-bold text-white">{totales.empleados}</p></div>
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"><div className="flex items-center gap-2 text-emerald-400 mb-1"><DollarSign className="w-4 h-4" /><span className="text-sm">Bruto</span></div><p className="text-2xl font-bold text-white">{fmt(totales.salarioBruto)}</p></div>
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"><div className="flex items-center gap-2 text-amber-400 mb-1"><AlertCircle className="w-4 h-4" /><span className="text-sm">Deducciones</span></div><p className="text-2xl font-bold text-white">{fmt(totales.deducciones)}</p></div>
            <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20"><div className="flex items-center gap-2 text-violet-400 mb-1"><CheckCircle2 className="w-4 h-4" /><span className="text-sm">Neto</span></div><p className="text-2xl font-bold text-white">{fmt(totales.salarioNeto)}</p></div>
          </div>

          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between"><h2 className="text-lg font-semibold text-white flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-blue-400" />Detalle</h2><button onClick={exportCSV} className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white text-sm flex items-center gap-2"><Download className="w-4 h-4" />CSV</button></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-white/[0.02]"><th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Empleado</th><th className="px-4 py-3 text-center text-xs text-slate-400">Días</th><th className="px-4 py-3 text-center text-xs text-slate-400">Faltas</th><th className="px-4 py-3 text-center text-xs text-slate-400">Retardos</th><th className="px-4 py-3 text-right text-xs text-slate-400">Bruto</th><th className="px-4 py-3 text-right text-xs text-slate-400">IMSS</th><th className="px-4 py-3 text-right text-xs text-slate-400">ISR</th><th className="px-4 py-3 text-right text-xs text-slate-400">Neto</th></tr></thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {nominaData.map((r, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3"><p className="text-white font-medium">{r.employee.full_name}</p><p className="text-xs text-slate-400">{r.employee.employee_number}</p></td>
                      <td className="px-4 py-3 text-center text-emerald-400 font-medium">{r.diasTrabajados}</td>
                      <td className="px-4 py-3 text-center text-red-400">{r.faltas}</td>
                      <td className="px-4 py-3 text-center text-amber-400">{r.retardos}</td>
                      <td className="px-4 py-3 text-right text-white">{fmt(r.salarioBruto)}</td>
                      <td className="px-4 py-3 text-right text-red-400 text-sm">-{fmt(r.deduccionIMSS)}</td>
                      <td className="px-4 py-3 text-right text-red-400 text-sm">-{fmt(r.deduccionISR)}</td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-bold">{fmt(r.salarioNeto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {nominaData.length === 0 && !generating && (
        <div className="p-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
          <Calculator className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Sin datos</h3>
          <p className="text-slate-400">Selecciona período y clic en Generar</p>
        </div>
      )}
    </div>
  );
}
