"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, UserCheck, Search, Package } from "lucide-react";
import Link from "next/link";

export default function AsignacionPage() {
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("activos_asignaciones").select("*").order("fecha_asignacion", { ascending: false });
      if (data && data.length > 0) {
        const empIds = [...new Set(data.map((a: any) => a.empleado_id).filter(Boolean))];
        const actIds = [...new Set(data.map((a: any) => a.activo_id).filter(Boolean))];
        const { data: emps } = await supabase.from("Personal").select("id, full_name, employee_number").in("id", empIds.length ? empIds : ["x"]);
        const { data: acts } = await supabase.from("activos").select("id, nombre, codigo").in("id", actIds.length ? actIds : ["x"]);
        const empMap = Object.fromEntries((emps || []).map((e: any) => [e.id, e]));
        const actMap = Object.fromEntries((acts || []).map((a: any) => [a.id, a]));
        setAsignaciones(data.map((a: any) => ({ ...a, empleado: empMap[a.empleado_id], activo: actMap[a.activo_id] })));
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = asignaciones.filter(a =>
    a.empleado?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.activo?.nombre?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 mb-6">
        <Link href="/dashboard/activos" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Activos
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Asignación de Activos</h1>
            <p className="text-slate-400 text-sm mt-1">Control de equipos y herramientas asignados</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm w-64" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-800 z-10">
            <tr className="text-left text-slate-400 border-b border-white/10">
              <th className="px-4 py-3 font-medium">Activo</th>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Asignado a</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Notas</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No hay asignaciones registradas</td></tr>
            ) : filtered.map(a => (
              <tr key={a.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3 text-white font-medium">{a.activo?.nombre || "—"}</td>
                <td className="px-4 py-3 text-blue-400 font-mono text-xs">{a.activo?.codigo || "—"}</td>
                <td className="px-4 py-3 text-slate-300">{a.empleado?.full_name || "—"}</td>
                <td className="px-4 py-3 text-slate-300">{a.fecha_asignacion ? new Date(a.fecha_asignacion).toLocaleDateString("es-MX") : "—"}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${a.estado === "devuelto" ? "bg-slate-500/20 text-slate-400" : "bg-emerald-500/20 text-emerald-400"}`}>{a.estado || "Asignado"}</span></td>
                <td className="px-4 py-3 text-slate-400 text-xs">{a.notas || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
