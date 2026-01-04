"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar, Download, Save, ChevronLeft, ChevronRight, FileSpreadsheet, History, Users, DollarSign, Building2, Check, X } from "lucide-react";

interface EmpleadoNomina {
  id: string;
  nombre: string;
  puesto: string;
  obra: string;
  salario_semanal: number;
  dias_trabajados: number;
  hrs_sab_dom: number;
  septimo_dia: number;
  bonos: number;
  prestamos: number;
  sueldo_calculado: number;
  sueldo_neto: number;
}

const DATOS_SEMANA_51: Omit<EmpleadoNomina, "id">[] = [
  { nombre: "DAISY SANCHEZ CALVILLO", puesto: "COORDINADORA", obra: "OFICINA", salario_semanal: 6000, dias_trabajados: 6.88, hrs_sab_dom: 0, septimo_dia: 0.98, bonos: 0, prestamos: 0, sueldo_calculado: 5896.67, sueldo_neto: 5896.67 },
  { nombre: "JESSICA M. GALLARDO ACOSTA", puesto: "COMPRAS", obra: "OFICINA", salario_semanal: 3050, dias_trabajados: 6.14, hrs_sab_dom: 0, septimo_dia: 0.88, bonos: 0, prestamos: 0, sueldo_calculado: 2677.22, sueldo_neto: 2677.22 },
  { nombre: "LIZBETH FLORES MENDEZ", puesto: "ADMINISTRACION", obra: "OFICINA", salario_semanal: 3000, dias_trabajados: 5.99, hrs_sab_dom: 0, septimo_dia: 0.86, bonos: 0, prestamos: 0, sueldo_calculado: 2565.00, sueldo_neto: 2565.00 },
  { nombre: "JOSE ARMANDO REYES ESCOBAR", puesto: "RESIDENTE", obra: "JUSTO SIERRA", salario_semanal: 2400, dias_trabajados: 5.47, hrs_sab_dom: 0, septimo_dia: 0.78, bonos: 0, prestamos: 0, sueldo_calculado: 1876.00, sueldo_neto: 1876.00 },
  { nombre: "JOSE GUADALUPE GUTIERREZ", puesto: "AYUDANTE", obra: "JUSTO SIERRA", salario_semanal: 2400, dias_trabajados: 6.02, hrs_sab_dom: 0, septimo_dia: 0.86, bonos: 0, prestamos: 0, sueldo_calculado: 2062.67, sueldo_neto: 2062.67 },
  { nombre: "JESUS ALEJANDRO COVARRUBIAS", puesto: "RESIDENTE", obra: "EJERCITO NACIONAL", salario_semanal: 3000, dias_trabajados: 5.25, hrs_sab_dom: 5.28, septimo_dia: 0.75, bonos: 0, prestamos: 0, sueldo_calculado: 2629.06, sueldo_neto: 2629.06 },
  { nombre: "JUAN FCO. RODARTE VILLAREAL", puesto: "OPERADOR", obra: "EJERCITO NACIONAL", salario_semanal: 4200, dias_trabajados: 6.14, hrs_sab_dom: 0, septimo_dia: 0.88, bonos: 200, prestamos: 110, sueldo_calculado: 3882.00, sueldo_neto: 3772.00 },
  { nombre: "ARTURO GUTIERREZ ESPARZA", puesto: "AYUDANTE", obra: "JUAN DIEGO", salario_semanal: 2800, dias_trabajados: 6.02, hrs_sab_dom: 5.28, septimo_dia: 0.86, bonos: 0, prestamos: 200, sueldo_calculado: 2758.68, sueldo_neto: 2558.68 },
  { nombre: "RAUL RAMIREZ MORENO", puesto: "RESIDENTE", obra: "LAB SEMICONDUCTORES", salario_semanal: 3500, dias_trabajados: 6.43, hrs_sab_dom: 3.6, septimo_dia: 0.92, bonos: 0, prestamos: 0, sueldo_calculado: 3514.15, sueldo_neto: 3514.15 },
  { nombre: "GUSTAVO GARIVAY OCEGUERA", puesto: "RESIDENTE", obra: "MIRAVALLE", salario_semanal: 3000, dias_trabajados: 6.66, hrs_sab_dom: 6.45, septimo_dia: 0.95, bonos: 0, prestamos: 500, sueldo_calculado: 3314.06, sueldo_neto: 2814.06 },
  { nombre: "MIGUEL ANGEL JIMENEZ MORALES", puesto: "OPERADOR", obra: "MIRAVALLE", salario_semanal: 4300, dias_trabajados: 6.28, hrs_sab_dom: 0, septimo_dia: 0.90, bonos: 0, prestamos: 500, sueldo_calculado: 3855.67, sueldo_neto: 3355.67 },
  { nombre: "SAMUEL RODARTE VILLAREAL", puesto: "OPERADOR", obra: "MIRAVALLE", salario_semanal: 4200, dias_trabajados: 6.38, hrs_sab_dom: 5, septimo_dia: 0.91, bonos: 0, prestamos: 0, sueldo_calculado: 4329.00, sueldo_neto: 4329.00 },
  { nombre: "LUIS FELIPE RODRIGUEZ ALVARADO", puesto: "OPERADOR", obra: "MIRAVALLE", salario_semanal: 3800, dias_trabajados: 6.46, hrs_sab_dom: 5, septimo_dia: 0.92, bonos: 0, prestamos: 0, sueldo_calculado: 3958.96, sueldo_neto: 3958.96 },
];

const OBRAS_COLORES: Record<string, string> = {
  "OFICINA": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "JUSTO SIERRA": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "EJERCITO NACIONAL": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "JUAN DIEGO": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "LAB SEMICONDUCTORES": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "MIRAVALLE": "bg-rose-500/20 text-rose-300 border-rose-500/30",
};

export default function NominaPage() {
  const [semanaActual, setSemanaActual] = useState({ inicio: "2025-12-12", fin: "2025-12-18", numero: 51 });
  const [empleados, setEmpleados] = useState<EmpleadoNomina[]>([]);
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);

  useEffect(() => {
    setEmpleados(DATOS_SEMANA_51.map((emp, idx) => ({ ...emp, id: `emp-${idx}` })));
  }, []);

  const cambiarSemana = (dir: number) => {
    const fecha = new Date(semanaActual.inicio);
    fecha.setDate(fecha.getDate() + dir * 7);
    const fin = new Date(fecha); fin.setDate(fin.getDate() + 6);
    setSemanaActual({ inicio: fecha.toISOString().split("T")[0], fin: fin.toISOString().split("T")[0], numero: semanaActual.numero + dir });
  };

  const actualizarEmpleado = (id: string, campo: keyof EmpleadoNomina, valor: number) => {
    setEmpleados(prev => prev.map(emp => {
      if (emp.id !== id) return emp;
      const act = { ...emp, [campo]: valor };
      act.sueldo_neto = act.sueldo_calculado + act.bonos - act.prestamos;
      return act;
    }));
  };

  const totales = empleados.reduce((a, e) => ({ bruto: a.bruto + e.sueldo_calculado, bonos: a.bonos + e.bonos, prestamos: a.prestamos + e.prestamos, neto: a.neto + e.sueldo_neto }), { bruto: 0, bonos: 0, prestamos: 0, neto: 0 });

  const exportarExcel = () => {
    let csv = "\uFEFF";
    csv += `GRUPO CUAVANTE - NOMINA SEMANA ${semanaActual.numero}\n`;
    csv += `Periodo: ${semanaActual.inicio} al ${semanaActual.fin}\n\n`;
    [...new Set(empleados.map(e => e.obra))].forEach(obra => {
      const empsObra = empleados.filter(e => e.obra === obra);
      csv += `\n${obra}\n`;
      csv += `No.,Nombre,Puesto,Sal. Semanal,Dias Trab.,Septimo,Bonos,Prestamos,Sueldo Neto\n`;
      empsObra.forEach((emp, i) => { csv += `${i+1},"${emp.nombre}","${emp.puesto}",${emp.salario_semanal},${emp.dias_trabajados},${emp.septimo_dia},${emp.bonos},${emp.prestamos},${emp.sueldo_neto}\n`; });
      csv += `,,,,,,SUBTOTAL:,${empsObra.reduce((a,e)=>a+e.sueldo_neto,0).toFixed(2)}\n`;
    });
    csv += `\n\nRESUMEN\nTotal Bruto:,${totales.bruto.toFixed(2)}\nBonos:,${totales.bonos.toFixed(2)}\nPrestamos:,${totales.prestamos.toFixed(2)}\nTOTAL NETO:,${totales.neto.toFixed(2)}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.download = `Nomina_Sem${semanaActual.numero}.csv`; link.click();
    setMensaje({ tipo: "success", texto: "Excel exportado" }); setTimeout(() => setMensaje(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3"><DollarSign className="w-7 h-7 text-emerald-400" />Nomina Semanal</h1>
          <p className="text-slate-400 mt-1">Gestion y calculo de nomina</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportarExcel} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30"><FileSpreadsheet className="w-4 h-4" />Exportar Excel</button>
        </div>
      </div>

      {mensaje && <div className={`p-4 rounded-lg flex items-center gap-3 ${mensaje.tipo === "success" ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>{mensaje.tipo === "success" ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}{mensaje.texto}</div>}

      <div className="flex items-center justify-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
        <button onClick={() => cambiarSemana(-1)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20"><ChevronLeft className="w-5 h-5 text-slate-300" /></button>
        <div className="text-center">
          <div className="flex items-center gap-2 text-white font-semibold"><Calendar className="w-5 h-5 text-blue-400" />Semana {semanaActual.numero}</div>
          <div className="text-sm text-slate-400">{semanaActual.inicio} - {semanaActual.fin}</div>
        </div>
        <button onClick={() => cambiarSemana(1)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20"><ChevronRight className="w-5 h-5 text-slate-300" /></button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10"><div className="text-slate-400 text-sm">Total Bruto</div><div className="text-2xl font-bold text-white">${totales.bruto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div></div>
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"><div className="text-emerald-400 text-sm">Bonos</div><div className="text-2xl font-bold text-emerald-300">+${totales.bonos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div></div>
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20"><div className="text-red-400 text-sm">Prestamos</div><div className="text-2xl font-bold text-red-300">-${totales.prestamos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div></div>
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20"><div className="text-blue-400 text-sm">Neto a Pagar</div><div className="text-2xl font-bold text-blue-300">${totales.neto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div></div>
      </div>

      {[...new Set(empleados.map(e => e.obra))].map(obra => (
        <div key={obra} className="rounded-xl bg-white/[0.03] border border-white/10 overflow-hidden">
          <div className={`px-4 py-3 border-b border-white/10 flex items-center gap-3 ${OBRAS_COLORES[obra] || "bg-slate-500/20"}`}>
            <Building2 className="w-5 h-5" /><span className="font-semibold">{obra}</span>
            <span className="ml-auto font-bold">${empleados.filter(e => e.obra === obra).reduce((a, e) => a + e.sueldo_neto, 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-slate-400 border-b border-white/10">
                <th className="text-left p-3">Empleado</th><th className="text-right p-3">Sal. Sem.</th><th className="text-right p-3">Dias</th><th className="text-right p-3">Septimo</th><th className="text-right p-3">Sueldo</th><th className="text-right p-3">Bonos</th><th className="text-right p-3">Prestamos</th><th className="text-right p-3 text-white">Neto</th>
              </tr></thead>
              <tbody>
                {empleados.filter(e => e.obra === obra).map(emp => (
                  <tr key={emp.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-3"><div className="text-white font-medium">{emp.nombre}</div><div className="text-slate-400 text-xs">{emp.puesto}</div></td>
                    <td className="p-3 text-right text-slate-300">${emp.salario_semanal.toLocaleString()}</td>
                    <td className="p-3 text-right"><input type="number" step="0.01" value={emp.dias_trabajados} onChange={e => actualizarEmpleado(emp.id, "dias_trabajados", parseFloat(e.target.value) || 0)} className="w-16 bg-white/10 border border-white/20 rounded px-2 py-1 text-right text-white" /></td>
                    <td className="p-3 text-right text-slate-300">{emp.septimo_dia.toFixed(2)}</td>
                    <td className="p-3 text-right text-white">${emp.sueldo_calculado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right"><input type="number" value={emp.bonos} onChange={e => actualizarEmpleado(emp.id, "bonos", parseFloat(e.target.value) || 0)} className="w-20 bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-1 text-right text-emerald-300" /></td>
                    <td className="p-3 text-right"><input type="number" value={emp.prestamos} onChange={e => actualizarEmpleado(emp.id, "prestamos", parseFloat(e.target.value) || 0)} className="w-20 bg-red-500/10 border border-red-500/30 rounded px-2 py-1 text-right text-red-300" /></td>
                    <td className="p-3 text-right font-bold text-blue-300">${emp.sueldo_neto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="text-center text-slate-500 text-sm py-4"><Users className="w-4 h-4 inline mr-2" />{empleados.length} empleados activos - Semana {semanaActual.numero}</div>
    </div>
  );
}
