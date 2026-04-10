"use client";
import React from "react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Activity, CheckCircle2, AlertTriangle, XCircle, Wrench, Save, Loader2 } from "lucide-react";
import Link from "next/link";

export default function EstadoActivosPage() {
  const [activos, setActivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data, error } = await supabase.from("activos").select("*").order("nombre");
    if (error) { console.error("Error loading activos:", error?.message); setLoading(false); return; }
    if (data) setActivos(data);
    setLoading(false);
  };

  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    setSaving(id);
    const { error } = await supabase.from("activos").update({ estado: nuevoEstado }).eq("id", id);
    if (error) { console.error("Error updating estado:", error?.message); alert("Error: " + error?.message); setSaving(null); return; }
    setActivos(prev => prev.map(a => a.id === id ? { ...a, estado: nuevoEstado } : a));
    setSaving(null);
  };

  const estados = activos.reduce((acc, a) => {
    const est = a.estado || "Sin estado";
    acc[est] = (acc[est] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filtered = filtro === "todos" ? activos : activos.filter(a => (a.estado || "Sin estado") === filtro);

  const getIcon = (estado: string): React.ReactNode => {
    switch(estado?.toLowerCase()) {
      case "bueno": case "activo": return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "mantenimiento": case "reparacion": return <Wrench className="w-4 h-4 text-amber-400" />;
      case "baja": case "dañado": return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <AlertTriangle className="w-4 h-4 text-slate-400" />;
    }
  };

  const estadoOptions = ["bueno", "mantenimiento", "reparacion", "baja"];

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="sticky top-0 z-10 bg-gradient-to-b from-slate-950 via-slate-950/95 to-transparent pb-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/activos" className="p-2 hover:bg-white/10 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-400" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Estado de Activos</h1>
            <p className="text-sm text-slate-400">{activos.length} activos registrados</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFiltro("todos")} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filtro === "todos" ? "bg-cyan-500/20 text-cyan-400" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
            Todos ({activos.length})
          </button>
        {Object.entries(estados).map(([est, count]) => (
          <button key={est} onClick={() => setFiltro(est)} className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${filtro === est ? "bg-cyan-500/20 text-cyan-400" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
            {getIcon(est)} {est} ({count as number})
          </button>
        ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No hay activos en esta categoría</div>
      ) : (
        <div className="overflow-auto max-h-[65vh] rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-800/90 backdrop-blur text-slate-400 text-xs uppercase">
              <tr>
                <th className="text-left p-3">Activo</th>
                <th className="text-left p-3">Categoría</th>
                <th className="text-left p-3">Ubicación</th>
                <th className="text-left p-3">Estado Actual</th>
                <th className="text-left p-3">Cambiar Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-white/5">
                  <td className="p-3 text-white font-medium">{a.nombre || a.name || "—"}</td>
                  <td className="p-3 text-slate-400">{a.categoria || a.category || "—"}</td>
                  <td className="p-3 text-slate-400">{a.ubicacion || a.location || "—"}</td>
                  <td className="p-3">{getIcon(a.estado || "")} <span className="ml-1 text-white">{a.estado || "Sin estado"}</span></td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={a.estado || "—"}
                        onChange={(e) => cambiarEstado(a.id, e.target.value)}
                        className="bg-slate-700 text-white text-xs rounded px-2 py-1.5 border border-white/10"
                        disabled={saving === a.id}
                      >
                        <option value="">Seleccionar...</option>
                        {estadoOptions.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      {saving === a.id && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

