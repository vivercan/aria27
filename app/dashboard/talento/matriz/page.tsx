"use client";
import AriaBackButton from "@/components/AriaBackButton";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, BarChart3, Users, DollarSign, Building2, Loader2 } from "lucide-react";
import Link from "next/link";

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
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<"position" | "empresa" | "department">("empresa");

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from("Personal").select("*").eq("status", "ACTIVO").order("salario_diario", { ascending: false });
      if (error) {  setLoading(false); return; }
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
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 mb-6">
        <Link href="/dashboard/talento" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Talento
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Matriz Salarial</h1>
            <p className="text-slate-400 text-sm mt-1">Tabulador de sueldos por puesto y empresa</p>
          </div>
          <select value={groupBy} onChange={e => setGroupBy(e.target.value as typeof groupBy)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm">
            <option value="empresa">Por Empresa</option>
            <option value="position">Por Puesto</option>
            <option value="department">Por Departamento</option>
          </select>
        </div>
      </div>

      <div className="flex-shrink-0 grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <Users className="w-5 h-5 text-blue-400 mb-2" />
          <p className="text-2xl font-bold text-white">{empleados.length}</p>
          <p className="text-xs text-slate-400">Empleados Activos</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <DollarSign className="w-5 h-5 text-emerald-400 mb-2" />
          <p className="text-2xl font-bold text-white">${totalNomina.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400">Nómina Diaria Total</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <Building2 className="w-5 h-5 text-violet-400 mb-2" />
          <p className="text-2xl font-bold text-white">{Object.keys(groups).length}</p>
          <p className="text-xs text-slate-400">Grupos</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-4">
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div> :
          Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([group, emps]) => (
            <div key={group} className="rounded-xl border border-white/10 overflow-hidden">
              <div className="px-4 py-3 bg-white/5 flex items-center justify-between">
                <h3 className="font-semibold text-white">{group}</h3>
                <span className="text-xs text-slate-400">{emps.length} empleados | ${emps.reduce((s, e) => s + (e.salario_diario || 0), 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}/día</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-white/5">
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
                    <tr key={e.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-2 text-blue-400 font-mono text-xs">{e.employee_number}</td>
                      <td className="px-4 py-2 text-white">{e.full_name}</td>
                      <td className="px-4 py-2 text-slate-300">{e.position || "-"}</td>
                      <td className="px-4 py-2 text-right text-emerald-400 font-mono">${(e.salario_diario || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2 text-right text-slate-300 font-mono">${(e.salario_imss || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2 text-right text-white font-mono">${((e.salario_diario || 0) * 30).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
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
