"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, FileText, Search, Plus, Upload, Download, Eye, Loader2, FolderOpen } from "lucide-react";

interface Documento {
  id: string;
  nombre: string;
  tipo: string;
  categoria: string;
  descripcion: string;
  archivo_url: string;
  obra_id: string;
  obra_nombre: string;
  created_at: string;
}

export default function DocumentosPage() {
  const router = useRouter();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase.from("documentos_plantilla").select("*").order("created_at", { ascending: false });
        if (error) console.error("Error loading documentos:", error.message);
        setDocumentos(data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = documentos.filter(d =>
    !search || d.nombre?.toLowerCase().includes(search.toLowerCase()) || d.tipo?.toLowerCase().includes(search.toLowerCase()) || d.obra_nombre?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors w-fit">
        <div className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></div>
        <span className="text-sm font-medium">Regresar</span>
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Centro de Documentaci\u00f3n</h1>
          <p className="text-slate-400 text-sm">Gesti\u00f3n y almacenamiento de documentos del proyecto</p>
        </div>
        <button className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-500/30 transition-colors flex items-center gap-2">
          <Upload className="w-4 h-4" /> Subir Documento
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <div className="inline-flex p-2 rounded-lg bg-green-500/10 mb-2"><FileText className="w-4 h-4 text-green-400" /></div>
          <p className="text-xl font-bold text-white">{loading ? "..." : documentos.length}</p>
          <p className="text-xs text-slate-400">Total Documentos</p>
        </div>
        <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <div className="inline-flex p-2 rounded-lg bg-blue-500/10 mb-2"><FolderOpen className="w-4 h-4 text-blue-400" /></div>
          <p className="text-xl font-bold text-white">{loading ? "..." : [...new Set(documentos.map(d => d.tipo).filter(Boolean))].length}</p>
          <p className="text-xs text-slate-400">Tipos</p>
        </div>
        <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <div className="inline-flex p-2 rounded-lg bg-amber-500/10 mb-2"><Download className="w-4 h-4 text-amber-400" /></div>
          <p className="text-xl font-bold text-white">\u2014</p>
          <p className="text-xs text-slate-400">Descargas este mes</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar documento por nombre, tipo u obra..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none" />
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <tr className="text-slate-400 text-xs uppercase">
                <th className="text-left p-3">Nombre</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-left p-3">Obra</th>
                <th className="text-left p-3">Fecha</th>
                <th className="text-center p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">
                  {documentos.length === 0 ? "No hay documentos registrados. Sube tu primer documento." : "No se encontraron resultados."}
                </td></tr>
              ) : filtered.map(d => (
                <tr key={d.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3 text-white font-medium">{d.nombre}</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-300">{d.tipo || "General"}</span></td>
                  <td className="p-3 text-slate-400">{d.obra_nombre || "\u2014"}</td>
                  <td className="p-3 text-slate-400 text-xs">{d.created_at ? new Date(d.created_at).toLocaleDateString("es-MX") : "\u2014"}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"><Eye className="w-4 h-4" /></button>
                      <button className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"><Download className="w-4 h-4" /></button>
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
