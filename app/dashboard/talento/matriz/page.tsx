"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { DollarSign, Users, Building, TrendingUp } from "lucide-react";
import Link from "next/link";

interface Empleado {
  id: string;
  employee_number: string;
  full_name: string;
  position: string;
  salario_semanal: number;
  salario_diario: number;
  minimo_tarjeta: number;
  status: string;
  centro_trabajo?: { nombre: string };
}

export default function MatrizPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from("employees")
        .select("*, centro_trabajo:centros_trabajo(nombre)")
        .eq("status", "ACTIVO")
        .order("salario_semanal", { ascending: false });
      if (data) setEmpleados(data);
      setLoading(false);
    }
    fetchData();
  }, []);

  const totalSemanal = empleados.reduce((s, e) => s + (e.salario_semanal || 0), 0);
  const totalTarjeta = empleados.reduce((s, e) => s + (e.minimo_tarjeta || 1096), 0);
  const totalEfectivo = totalSemanal - totalTarjeta;
  const formatMoney = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/talento" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm">
        ← Regresar al Panel
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <DollarSign className="text-emerald-400" />
          Matriz Salarial
        </h1>
        <p className="text-slate-400">Resumen de salarios y distribución de pago</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-xl">
          <p className="text-blue-400 text-sm">Empleados Activos</p>
          <p className="text-2xl font-bold text-white">{empleados.length}</p>
        </div>
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
          <p className="text-emerald-400 text-sm">Nómina Semanal</p>
          <p className="text-2xl font-bold text-white">{formatMoney(totalSemanal)}</p>
        </div>
        <div className="p-4 bg-purple-500/20 border border-purple-500/30 rounded-xl">
          <p className="text-purple-400 text-sm">Por Tarjeta</p>
          <p className="text-2xl font-bold text-white">{formatMoney(totalTarjeta)}</p>
        </div>
        <div className="p-4 bg-amber-500/20 border border-amber-500/30 rounded-xl">
          <p className="text-amber-400 text-sm">En Efectivo</p>
          <p className="text-2xl font-bold text-white">{formatMoney(totalEfectivo)}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-white/5 text-slate-100 uppercase text-xs font-bold">
            <tr>
              <th className="px-4 py-4">No.</th>
              <th className="px-4 py-4">Nombre</th>
              <th className="px-4 py-4">Puesto</th>
              <th className="px-4 py-4">Centro</th>
              <th className="px-4 py-4 text-right">Semanal</th>
              <th className="px-4 py-4 text-right">Diario</th>
              <th className="px-4 py-4 text-right">Mín Tarjeta</th>
              <th className="px-4 py-4 text-right">Efectivo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={8} className="px-6 py-8 text-center">Cargando...</td></tr>
            ) : empleados.map((emp) => {
              const efectivo = (emp.salario_semanal || 0) - (emp.minimo_tarjeta || 1096);
              return (
                <tr key={emp.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-blue-300 font-mono text-xs">{emp.employee_number}</td>
                  <td className="px-4 py-3 text-white font-medium">{emp.full_name}</td>
                  <td className="px-4 py-3">{emp.position || "-"}</td>
                  <td className="px-4 py-3 text-xs">{emp.centro_trabajo?.nombre || "-"}</td>
                  <td className="px-4 py-3 text-right text-emerald-400 font-medium">{formatMoney(emp.salario_semanal || 0)}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{formatMoney(emp.salario_diario || 0)}</td>
                  <td className="px-4 py-3 text-right text-purple-400">{formatMoney(emp.minimo_tarjeta || 1096)}</td>
                  <td className="px-4 py-3 text-right text-amber-400">{formatMoney(Math.max(0, efectivo))}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-white/5 font-bold">
            <tr>
              <td colSpan={4} className="px-4 py-3 text-white">TOTALES</td>
              <td className="px-4 py-3 text-right text-emerald-400">{formatMoney(totalSemanal)}</td>
              <td className="px-4 py-3 text-right">-</td>
              <td className="px-4 py-3 text-right text-purple-400">{formatMoney(totalTarjeta)}</td>
              <td className="px-4 py-3 text-right text-amber-400">{formatMoney(totalEfectivo)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
