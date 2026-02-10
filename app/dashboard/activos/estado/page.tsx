"use client";
import React from "react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Activity, CheckCircle2, AlertTriangle, XCircle, Wrench } from "lucide-react";
import Link from "next/link";

export default function EstadoActivosPage() {
  const [activos, setActivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("activos").select("*").order("nombre");
      setActivos(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const estados = activos.reduce((acc, a) => {
    const est = a.estado || "Sin estado";
    acc[est] = (acc[est] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filtered = filtro === "todos" ? activos : activos.filter(a => (a.estado || "Sin estado") === filtro);

  const getIcon = (estado: string): React.ReactNode => {
    if (estado?.includes("uen") || estado === "activo") return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (estado?.includes("ante") || estado?.includes("repar")) return <Wrench className="w-4 h-4 text-amber-400" />;
    if (estado?.includes("aja") || estado?.includes("ado")) return <XCircle className="w-4 h-4 text-red-400" />;
    return <Activity className="w-4 h-4 text-blue-400" />;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 mb-6">
        <Link href="/dashboard/activos" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Activos
        </Link>
        <h1 className="text-2xl font-bold text-white">Estado de Activos</h1>
        <p className="text-slate-400 text-sm mt-1">Resumen de condición de equipos y herramientas</p>
      </div>

      <div className="flex-shrink-0 flex gap-3 mb-6 flex-wrap">
        <button onClick={() => setFiltro("todos")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filtro === "todos" ? "bg-blue-500 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}>
          Todos ({activos.length})
        </button>
        {Object.entries(estados).map(([est, count]) => (
          <button key={est} onClick={() => setFiltro(est)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${filtro === est ? "bg-blue-500 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}>
            {getIcon(est)} {est} ({count as number})
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-800 z-10">
            <tr className="text-left text-slate-400 border-b border-white/10">
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Categoría</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Ubicación</th>
              <th className="px-4 py-3 font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No hay activos registrados</td></tr>
            ) : filtered.map(a => (
              <tr key={a.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3 text-blue-400 font-mono text-xs">{a.codigo || "—"}</td>
                <td className="px-4 py-3 text-white font-medium">{a.nombre}</td>
                <td className="px-4 py-3 text-slate-300">{a.categoria || "—"}</td>
                <td className="px-4 py-3"><span className="flex items-center gap-1.5">{getIcon(a.estado)} <span className="text-slate-300">{a.estado || "Sin estado"}</span></span></td>
                <td className="px-4 py-3 text-slate-300">{a.ubicacion || "—"}</td>
                <td className="px-4 py-3 text-emerald-400 font-mono">{a.valor ? `$${Number(a.valor).toLocaleString("es-MX")}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}




