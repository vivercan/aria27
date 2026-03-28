"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Gift, Calculator, DollarSign, Loader2 } from "lucide-react";
import Link from "next/link";

export default function AguinaldoPage() {
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [anio, setAnio] = useState(new Date().getFullYear());

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from("Personal").select("*").eq("status", "ACTIVO").order("full_name");
      if (error) { console.error("Error loading employees:", error.message); setLoading(false); return; }
      setEmpleados(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const calcAguinaldo = (emp: any) => {
    const sd = emp.salario_diario || 0;
    const ingreso = emp.fecha_ingreso ? new Date(emp.fecha_ingreso) : null;
    if (!ingreso || !sd) return { dias: 0, monto: 0, proporcional: false };
    const inicioAnio = new Date(anio, 0, 1);
    const finAnio = new Date(anio, 11, 31);
    const desde = ingreso > inicioAnio ? ingreso : inicioAnio;
    const diasTrabajados = Math.floor((finAnio.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const proporcional = ingreso.getFullYear() === anio;
    const diasAguinaldo = proporcional ? Math.round((15 * diasTrabajados) / 365) : 15;
    return { dias: diasAguinaldo, monto: diasAguinaldo * sd, proporcional };
  };

  const totalAguinaldo = empleados.reduce((s, e) => s + calcAguinaldo(e).monto, 0);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 mb-6">
        <Link href="/dashboard/talento/prestaciones" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Prestaciones
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Aguinaldo</h1>
            <p className="text-slate-400 text-sm mt-1">Cálculo de aguinaldo por empleado (15 días de ley)</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
              <span className="text-xs text-slate-400">Total:</span>
              <span className="text-emerald-400 font-bold ml-2">${totalAguinaldo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
            </div>
            <select value={anio} onChange={e => setAnio(Number(e.target.value))} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm">
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-800 z-10">
            <tr className="text-left text-slate-400 border-b border-white/10">
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Ingreso</th>
              <th className="px-4 py-3 font-medium text-right">SD</th>
              <th className="px-4 py-3 font-medium text-right">Días</th>
              <th className="px-4 py-3 font-medium text-center">Tipo</th>
              <th className="px-4 py-3 font-medium text-right">Aguinaldo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" /></td></tr>
            ) : empleados.map(e => {
              const calc = calcAguinaldo(e);
              return (
                <tr key={e.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-blue-400 font-mono text-xs">{e.employee_number}</td>
                  <td className="px-4 py-3 text-white">{e.full_name}</td>
                  <td className="px-4 py-3 text-slate-300">{e.fecha_ingreso ? new Date(e.fecha_ingreso).toLocaleDateString("es-MX") : "—"}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">${(e.salario_diario || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-white">{calc.dias}</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs ${calc.proporcional ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"}`}>{calc.proporcional ? "Proporcional" : "Completo"}</span></td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400 font-bold">${calc.monto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
