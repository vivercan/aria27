"use client";
import { clientLogger } from "@/lib/client-logger";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Gift, Calculator, DollarSign, Loader2 } from "lucide-react";
import Link from "next/link";
import AriaBackButton from "@/components/AriaBackButton";
import { fmtMoney } from "@/lib/formatters";

export default function AguinaldoPage() {
  const log = clientLogger("AGUINALDO");
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [anio, setAnio] = useState(new Date().getFullYear());

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from("Personal").select("*").eq("status", "ACTIVO").order("full_name");
      if (error) { log.error("Error loading employees:", { error: error?.message }); setLoading(false); return; }
      setEmpleados(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const calcAguinaldo = (emp: Record<string, unknown>) => {
    const sd = (emp.salario_diario as number) || 0;
    const ingreso = (emp.fecha_ingreso as string) ? new Date(emp.fecha_ingreso as string) : null;
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
        <AriaBackButton href="/dashboard/talento/prestaciones" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Aguinaldo</h1>
            <p className="text-[#7f93b0] text-sm mt-1">Cálculo de aguinaldo por empleado (15 días de ley)</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
              <span className="text-xs text-[#7f93b0]">Total:</span>
              <span className="text-aria-accent font-bold ml-2">{fmtMoney(totalAguinaldo)}</span>
            </div>
            <select value={anio} onChange={e => setAnio(Number(e.target.value))} className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm">
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-white/[0.08]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#0c1d38] z-10">
            <tr className="text-left text-[#7f93b0] border-b border-white/[0.08]">
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
              <tr><td colSpan={7} className="px-4 py-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-aria-accent mx-auto" /></td></tr>
            ) : empleados.map(e => {
              const calc = calcAguinaldo(e);
              return (
                <tr key={e.id} className="border-b border-white/[0.05] hover:bg-white/[0.04]">
                  <td className="px-4 py-3 text-aria-accent font-mono text-xs">{e.employee_number}</td>
                  <td className="px-4 py-3 text-white">{e.full_name}</td>
                  <td className="px-4 py-3 text-[#c9d8ed]">{e.fecha_ingreso ? new Date(e.fecha_ingreso).toLocaleDateString("es-MX") : "—"}</td>
                  <td className="px-4 py-3 text-right font-mono text-[#c9d8ed]">${(e.salario_diario || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-white">{calc.dias}</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs ${calc.proporcional ? "bg-amber-500/20 text-amber-400" : "bg-aria-primary-light text-aria-accent"}`}>{calc.proporcional ? "Proporcional" : "Completo"}</span></td>
                  <td className="px-4 py-3 text-right font-mono text-aria-accent font-bold">{fmtMoney(calc.monto)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
