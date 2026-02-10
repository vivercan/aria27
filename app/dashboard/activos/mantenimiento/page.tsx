"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Wrench, Search, Calendar, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function MantenimientoPage() {
  const [registros, setRegistros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("activos_mantenimiento").select("*").order("fecha", { ascending: false });
      if (data && data.length > 0) {
        const actIds = [...new Set(data.map((r: any) => r.activo_id).filter(Boolean))];
        const { data: acts } = await supabase.from("activos").select("id, nombre, codigo").in("id", actIds.length ? actIds : ["x"]);
        const actMap = Object.fromEntries((acts || []).map((a: any) => [a.id, a]));
        setRegistros(data.map((r: any) => ({ ...r, activo: actMap[r.activo_id] })));
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 mb-6">
        <Link href="/dashboard/activos" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Activos
        </Link>
        <h1 className="text-2xl font-bold text-white">Mantenimiento de Activos</h1>
        <p className="text-slate-400 text-sm mt-1">Historial de reparaciones y mantenimiento preventivo</p>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-800 z-10">
            <tr className="text-left text-slate-400 border-b border-white/10">
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Activo</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Descripción</th>
              <th className="px-4 py-3 font-medium">Costo</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Cargando...</td></tr>
            ) : registros.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No hay registros de mantenimiento</td></tr>
            ) : registros.map(r => (
              <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3 text-slate-300">{r.fecha ? new Date(r.fecha).toLocaleDateString("es-MX") : "—"}</td>
                <td className="px-4 py-3 text-white font-medium">{r.activo?.nombre || "—"} <span className="text-xs text-blue-400 font-mono ml-1">{r.activo?.codigo}</span></td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${r.tipo === "preventivo" ? "bg-blue-500/20 text-blue-400" : "bg-amber-500/20 text-amber-400"}`}>{r.tipo || "Correctivo"}</span></td>
                <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{r.descripcion || "—"}</td>
                <td className="px-4 py-3 text-emerald-400 font-mono">{r.costo ? `$${Number(r.costo).toLocaleString("es-MX")}` : "—"}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${r.estado === "completado" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>{r.estado || "Pendiente"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
