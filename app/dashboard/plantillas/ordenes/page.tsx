"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, ClipboardList, Search, Plus, Eye, Printer, Loader2, Package, CheckCircle } from "lucide-react";

interface OrdenFormato {
  id: string;
  nombre: string;
  numero: string;
  proveedor: string;
  obra: string;
  monto: number;
  estado: string;
  fecha: string;
  created_at: string;
}

export default function OrdenesPage() {
  const router = useRouter();
  const [ordenes, setOrdenes] = useState<OrdenFormato[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase.from("ordenes_formato").select("*").order("created_at", { ascending: false });
        if (error) console.error("Error loading ordenes:", error.message);
        setOrdenes(data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = ordenes.filter(o =>
    !search || o.nombre?.toLowerCase().includes(search.toLowerCase()) || o.numero?.toLowerCase().includes(search.toLowerCase()) || o.proveedor?.toLowerCase().includes(search.toLowerCase())
  );

  const estadoColors: Record<string, string> = {
    borrador: "bg-gray-500/20 text-gray-300",
    pendiente: "bg-amber-500/20 text-amber-300",
    aprobada: "bg-emerald-500/20 text-emerald-300",
    enviada: "bg-blue-500/20 text-blue-300",
    completada: "bg-violet-500/20 text-violet-300",
  };

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors w-fit">
        <div className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></div>
        <span className="text-sm font-medium">Regresar</span>
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Formatos de Órdenes de Compra</h1>
          <p className="text-slate-400 text-sm">Gestión de formatos y plantillas de órdenes de compra</p>
        </div>
        <button className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-500/30 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva Orden
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <div className="inline-flex p-2 rounded-lg bg-purple-500/10 mb-2"><ClipboardList className="w-4 h-4 text-purple-400" /></div>
          <p className="text-xl font-bold text-white">{loading ? "..." : ordenes.length}</p>
          <p className="text-xs text-slate-400">Total Órdenes</p>
        </div>
        <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <div className="inline-flex p-2 rounded-lg bg-amber-500/10 mb-2"><Package className="w-4 h-4 text-amber-400" /></div>
          <p className="text-xl font-bold text-white">{loading ? "..." : ordenes.filter(o => o.estado === "pendiente").length}</p>
          <p className="text-xs text-slate-400">Pendientes</p>
        </div>
        <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <div className="inline-flex p-2 rounded-lg bg-emerald-500/10 mb-2"><CheckCircle className="w-4 h-4 text-emerald-400" /></div>
          <p className="text-xl font-bold text-white">{loading ? "..." : ordenes.filter(o => o.estado === "completada" || o.estado === "aprobada").length}</p>
          <p className="text-xs text-slate-400">Completadas</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, número o proveedor..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none" />
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <tr className="text-slate-400 text-xs uppercase">
                <th className="text-left p-3">No. Orden</th>
                <th className="text-left p-3">Nombre</th>
                <th className="text-left p-3">Proveedor</th>
                <th className="text-left p-3">Obra</th>
                <th className="text-right p-3">Monto</th>
                <th className="text-center p-3">Estado</th>
                <th className="text-center p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">
                  {ordenes.length === 0 ? "No hay formatos de órdenes registrados." : "No se encontraron resultados."}
                </td></tr>
              ) : filtered.map(o => (
                <tr key={o.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3 text-blue-400 font-mono text-xs">{o.numero || "—"}</td>
                  <td className="p-3 text-white font-medium">{o.nombre}</td>
                  <td className="p-3 text-slate-300">{o.proveedor || "—"}</td>
                  <td className="p-3 text-slate-400">{o.obra || "—"}</td>
                  <td className="p-3 text-right text-emerald-400 font-medium">${(o.monto || 0).toLocaleString()}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoColors[o.estado] || estadoColors.borrador}`}>
                      {o.estado || "Borrador"}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"><Eye className="w-4 h-4" /></button>
                      <button className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"><Printer className="w-4 h-4" /></button>
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
