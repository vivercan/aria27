"use client";
import { clientLogger } from "@/lib/client-logger";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { BarChart3, Users, DollarSign, Building2, Loader2 } from "lucide-react";
import Link from "next/link";
import AriaBackButton from "@/components/AriaBackButton";
import CanonPageHeader from "@/components/ui/CanonPageHeader";
import KpiCard from "@/components/ui/KpiCard";
import { fmtMoney } from "@/lib/formatters";

interface Empleado {
  id: string;
  employee_number: string;
  full_name: string;
  position: string;
  department: string;
  empresa: string;
  salario_diario: number;
  salario_imss: number;
  status: string;
}

export default function MatrizSalarialPage() {
  const log = clientLogger("MATRIZ");
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<"position" | "empresa" | "department">("empresa");

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from("Personal").select("*").eq("status", "ACTIVO").order("salario_diario", { ascending: false });
      if (error) { log.error("Error loading empleados:", { error: error?.message }); setLoading(false); return; }
      setEmpleados(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const groups = empleados.reduce((acc, e) => {
    const key = e[groupBy] || "Sin asignar";
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {} as Record<string, Empleado[]>);

  const totalNomina = empleados.reduce((s, e) => s + (e.salario_diario || 0), 0);

  return (
    <div className="aria-bg-canon h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 mb-6">
        {/* B4 26-Abr-2026: CanonPageHeader + KpiCard canon AAA */}
        <CanonPageHeader
          title="Matriz Salarial"
          subtitle="Tabulador de sueldos por puesto y empresa"
          backHref="/dashboard/talento"
          icon={<BarChart3 className="w-6 h-6" />}
          right={
            <select value={groupBy} onChange={e => setGroupBy(e.target.value as typeof groupBy)}
              className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm">
              <option value="empresa">Por Empresa</option>
              <option value="position">Por Puesto</option>
              <option value="department">Por Departamento</option>
            </select>
          }
        />
      </div>

      <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Empleados Activos" value={empleados.length} variant="neutral" icon={<Users className="w-5 h-5" />} />
        <KpiCard label="Nomina Diaria Total" value={fmtMoney(totalNomina)} variant="emerald" icon={<DollarSign className="w-5 h-5" />} />
        <KpiCard label="Grupos" value={Object.keys(groups).length} variant="neutral" icon={<Building2 className="w-5 h-5" />} />
      </div>

      <div className="flex-1 overflow-auto space-y-4">
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-aria-accent" /></div> :
          Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([group, emps]) => (
            <div key={group} className="rounded-xl border border-white/[0.08] overflow-hidden">
              <div className="px-4 py-3 bg-white/[0.04] flex items-center justify-between">
                <h3 className="font-semibold text-white">{group}</h3>
                <span className="text-xs text-[#7f93b0]">{emps.length} empleados | {fmtMoney(emps.reduce((s, e) => s + (e.salario_diario || 0), 0))}/día</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#7f93b0] border-b border-white/[0.05]">
                    <th className="px-4 py-2 font-medium">Código</th>
                    <th className="px-4 py-2 font-medium">Nombre</th>
                    <th className="px-4 py-2 font-medium">Puesto</th>
                    <th className="px-4 py-2 font-medium text-right">Salario Diario</th>
                    <th className="px-4 py-2 font-medium text-right">SD IMSS</th>
                    <th className="px-4 py-2 font-medium text-right">Mensual Est.</th>
                  </tr>
                </thead>
                <tbody>
                  {emps.map(e => (
                    <tr key={e.id} className="border-b border-white/[0.05] hover:bg-white/[0.04]">
                      <td className="px-4 py-2 text-aria-accent font-mono text-xs">{e.employee_number}</td>
                      <td className="px-4 py-2 text-white">{e.full_name}</td>
                      <td className="px-4 py-2 text-[#c9d8ed]">{e.position || "-"}</td>
                      <td className="px-4 py-2 text-right text-aria-accent font-mono">{fmtMoney((e.salario_diario || 0))}</td>
                      <td className="px-4 py-2 text-right text-[#c9d8ed] font-mono">{fmtMoney((e.salario_imss || 0))}</td>
                      <td className="px-4 py-2 text-right text-white font-mono">{fmtMoney(((e.salario_diario || 0) * 30))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </div>
    </div>
  );
}
