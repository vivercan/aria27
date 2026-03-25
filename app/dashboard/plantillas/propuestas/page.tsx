"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Presentation, Search, Plus, Eye, Copy, Loader2, DollarSign, Calendar } from "lucide-react";

interface Propuesta {
  id: string;
  nombre: string;
  cliente: string;
  obra: string;
  monto_estimado: number;
  estado: string;
  fecha_entrega: string;
  created_at: string;
}

export default function PropuestasPage() {
  const router = useRouter();
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase.from("propuestas_licitacion").select("*").order("created_at", { ascending: false });
        if (error) console.error("Error loading propuestas:", error.message);
        setPropuestas(data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = propuestas.filter(p =>
    !search || p.nombre?.toLowerCase().includes(search.toLowerCase()) || p.cliente?.toLowerCase().includes(search.toLowerCase()) || p.obra?.toLowerCase().includes(search.toLowerCase())
  );

  const estadoColors: Record<string, string> = {
    borrador: "bg-gray-500/20 text-gray-300",
    enviada: "bg-blue-500/20 text-blue-300",
    aprobada: "bg-emerald-500/20 text-emerald-300",
    rechazada: "bg-red-500/20 text-red-300",
    en_revision: "bg-amber-500/20 text-amber-300",
  };

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors w-fit">
        <div className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></div>
        <span className="text-sm font-medium">Regresar</span>
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Propuestas de Licitación</h1>
          <p className="text-slate-400 text-sm">Paquetes de propuestas y licitaciones</p>
        </div>
        <button className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-500/30 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva Propuesta
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <div className="inline-flex p-2 rounded-lg bg-amber-500/10 mb-2"><Presentation className="w-4 h-4 text-amber-400" /></div>
          <p className="text-xl font-bold text-white">{loading ? "..." : propuestas.length}</p>
          <p className="text-xs text-slate-400">Total Propuestas</p>
        </div>
        <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <div className="inline-flex p-2 rounded-lg bg-emerald-500/10 mb-2"><DollarSign className="w-4 h-4 text-emerald-400" /></div>
          <p className="text-xl font-bold text-white">{loading ? "..." : `$${propuestas.reduce((s, p) => s + (p.monto_estimado || 0), 0).toLocaleString()}`}</p>
          <p className="text-xs text-slate-400">Monto Total Estimado</p>
        </div>
        <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <div className="inline-flex p-2 rounded-lg bg-blue-500/10 mb-2"><Calendar className="w-4 h-4 text-blue-400" /></div>
          <p className="text-xl font-bold text-white">{loading ? "..." : propuestas.filter(p => p.estado === "enviada" || p.estado === "en_revision").length}</p>
          <p className="text-xs text-slate-400">En Proceso</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar propuesta por nombre, cliente u obra..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none" />
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <tr className="text-slate-400 text-xs uppercase">
                <th className="text-left p-3">Propuesta</th>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Obra</th>
                <th className="text-right p-3">Monto Est.</th>
                <th className="text-center p-3">Estado</th>
                <th className="text-left p-3">Entrega</th>
                <th className="text-center p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">
                  {propuestas.length === 0 ? "No hay propuestas registradas. Crea tu primera propuesta." : "No se encontraron resultados."}
                </td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3 text-white font-medium">{p.nombre}</td>
                  <td className="p-3 text-slate-300">{p.cliente || "—"}</td>
                  <td className="p-3 text-slate-400">{p.obra || "—"}</td>
                  <td className="p-3 text-right text-emerald-400 font-medium">${(p.monto_estimado || 0).toLocaleString()}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoColors[p.estado] || estadoColors.borrador}`}>
                      {p.estado || "Borrador"}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400 text-xs">{p.fecha_entrega ? new Date(p.fecha_entrega).toLocaleDateString("es-MX") : "—"}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"><Eye className="w-4 h-4" /></button>
                      <button className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"><Copy className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
