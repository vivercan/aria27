"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Search, UserPlus, FileDown, Trash2, Edit, AlertCircle, CheckCircle } from "lucide-react";

export default function HRPeoplePage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchEmployees() {
      const { data } = await supabase.from("employees").select("*").order("employee_number", { ascending: true });
      if (data) setEmployees(data);
      setLoading(false);
    }
    fetchEmployees();
  }, []);

  const filtered = employees.filter(e => 
    e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.employee_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Catálogo de Colaboradores</h1>
          <p className="text-slate-400 text-sm">{employees.length} registros conectados a BD</p>
        </div>
        <div className="flex gap-2">
           <Link href="/dashboard/talent-hub/users" className="inline-flex items-center gap-2 rounded-full bg-purple-500/80 px-4 py-2 text-sm font-medium hover:bg-purple-500"><Shield className="h-4 w-4" />Usuarios</Link>
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm"><UserPlus size={16} /> Nuevo</button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input type="text" placeholder="Buscar..." className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 text-white focus:border-blue-500 transition-all" onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-white/5 text-slate-100 uppercase text-xs font-bold">
              <tr>
                <th className="px-6 py-4">No.</th>
                <th className="px-6 py-4">Nombre</th>
                <th className="px-6 py-4">Puesto</th>
                <th className="px-6 py-4">Salario</th>
                <th className="px-6 py-4">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (<tr><td colSpan={5} className="px-6 py-8 text-center">Cargando...</td></tr>) : filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-white/5">
                  <td className="px-6 py-4 text-blue-300">{emp.employee_number}</td>
                  <td className="px-6 py-4 text-white">{emp.full_name}</td>
                  <td className="px-6 py-4">{emp.position}</td>
                  <td className="px-6 py-4 text-emerald-400">${emp.salary_monthly.toLocaleString()}</td>
                  <td className="px-6 py-4">{emp.status === 'ACTIVO' ? <span className="text-emerald-400">Activo</span> : <span className="text-rose-400">Baja</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
