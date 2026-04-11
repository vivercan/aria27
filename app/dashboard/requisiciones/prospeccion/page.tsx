"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/lib/use-flash-message";
import {
  ArrowLeft, Search, Loader2, Globe, Phone, Mail,
  MapPin, Plus, ExternalLink, Building2, X, Check, Package
} from "lucide-react";
import Link from "next/link";

interface WebResult {
  nombre: string; direccion: string; telefono: string;
  sitio_web: string | null; productos_relacionados: string; fuente: string;
}

interface ExistingSupplier {
  id: string; name: string; phone: string; email: string;
  categories: any;
}

export default function ProspeccionPage() {
  const { msg, flash, clear } = useFlashMessage();
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [existingMatches, setExistingMatches] = useState<ExistingSupplier[]>([]);
  const [analisis, setAnalisis] = useState("");
  const [recomendacion, setRecomendacion] = useState("");
  const [searchDone, setSearchDone] = useState(false);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [savedIdxs, setSavedIdxs] = useState<number[]>([]);
  const [error, setError] = useState("");

  const getCatDisplay = (cats: any): string[] => {
    if (!cats) return [];
    if (Array.isArray(cats)) return cats.filter(Boolean);
    if (typeof cats === "string") return cats.split(",").map((c: string) => c.trim()).filter(Boolean);
    return [];
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true); setError(""); setWebResults([]); setExistingMatches([]);
    setSavedIdxs([]); setAnalisis(""); setRecomendacion("");

    try {
      // 1. Buscar en proveedores existentes por nombre o categoría
      const term = searchTerm.trim();
      const { data: existing } = await supabase
        .from("Proveedores")
        .select("id, name, phone, email, categories")
        .or(`name.ilike.%${term}%,categories.cs.{${term.toUpperCase()}}`)
        .limit(10);
      setExistingMatches(existing || []);

      // 2. Buscar con IA - adaptar término libre a formato de productos
      const res = await fetch("/api/proveedores/buscar-inteligente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productos: [
            { nombre: term, cantidad: 1, unidad: "global", categoria: term }
          ],
          user_email: localStorage.getItem("userEmail") || ""
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status}`);
      }

      const data = await res.json();
      setWebResults(data.proveedores_web || []);
      setAnalisis(data.analisis || "");
      setRecomendacion(data.recomendacion || "");
    } catch (e: any) {
      console.error("Error buscando:", e);
      setError(e?.message || "Error en la búsqueda");
    } finally {
      setSearching(false);
      setSearchDone(true);
    }
  };

  const saveAsSupplier = async (result: WebResult, idx: number) => {
    setSavingIdx(idx);
    try {
      const { error: insertErr } = await supabase.from("suppliers").insert({
        name: result.nombre,
        phone: result.telefono || null,
        website: result.sitio_web || null,
        address: result.direccion || null,
        notas_comerciales: result.productos_relacionados || null,
        active: true,
      });
      if (insertErr) throw insertErr;
      setSavedIdxs(prev => [...prev, idx]);
    } catch (e: any) {
      console.error("Error guardando:", e);
      flash("err", "Error: " + (e?.message || "No se pudo guardar"));
    } finally {
      setSavingIdx(null);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <FlashBanner msg={msg} />
      {/* HEADER */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-slate-950 via-slate-950/95 to-transparent pb-4 flex-none px-4 pt-3 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 mb-2">
          <Link href="/dashboard/requisiciones" className="p-1 hover:bg-white/10 rounded-lg"><ArrowLeft className="w-4 h-4 text-slate-400"/></Link>
          <h1 className="text-lg font-bold text-white flex items-center gap-2"><Search className="w-4 h-4 text-violet-400"/>Prospección de Proveedores</h1>
        </div>
        <p className="text-xs text-slate-400 mb-2 ml-7">Busca proveedores por producto o categoría. ARIA busca en tu base de datos y en la web con IA.</p>

        <div className="flex gap-2 ml-7">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500"/>
            <input type="text" placeholder='Ej: "acero corrugado", "diesel", "concreto premezclado"...'
              value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleSearch()}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-slate-500 focus:border-violet-500/50 outline-none"/>
          </div>
          <button onClick={handleSearch} disabled={searching||!searchTerm.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/30 disabled:opacity-40 font-medium">
            {searching?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Search className="w-3.5 h-3.5"/>}
            {searching?"Buscando...":"Buscar"}
          </button>
        </div>
      </div>

      {/* RESULTADOS */}
      <div className="flex-1 overflow-auto min-h-0 px-4 py-3">
        {!searchDone && !searching && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4"><Search className="w-8 h-8 text-violet-400"/></div>
            <h2 className="text-white font-semibold mb-1">Busca nuevos proveedores</h2>
            <p className="text-slate-400 text-sm max-w-md">Escribe el producto o categoría que necesitas y ARIA buscará proveedores en tu base de datos y en la web.</p>
          </div>
        )}

        {searching && (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400 mb-3"/>
            <p className="text-white font-medium">Buscando proveedores de &quot;{searchTerm}&quot;...</p>
            <p className="text-slate-400 text-xs mt-1">La IA está buscando en la web, puede tomar 15-30 segundos</p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs mb-4">{error}</div>
        )}

        {searchDone && !searching && (
          <div className="space-y-4">
            {/* Análisis IA */}
            {analisis && (
              <div className="p-3 bg-violet-500/[0.06] border border-violet-500/15 rounded-lg">
                <p className="text-xs text-slate-300">{analisis}</p>
                {recomendacion && <p className="text-xs text-violet-400 mt-1.5 font-medium">{recomendacion}</p>}
              </div>
            )}

            {/* Existentes */}
            {existingMatches.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-white flex items-center gap-1.5 mb-2"><Building2 className="w-3.5 h-3.5 text-emerald-400"/>Ya tienes estos proveedores ({existingMatches.length})</h3>
                <div className="space-y-1">
                  {existingMatches.map(s=>(
                    <div key={s.id} className="flex items-center gap-3 px-3 py-2 bg-emerald-500/[0.05] border border-emerald-500/10 rounded-lg text-xs">
                      <Building2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0"/>
                      <span className="text-white font-medium flex-1">{s.name}</span>
                      {getCatDisplay(s.categories).map(c=><span key={c} className="text-[9px] px-1 py-0.5 bg-blue-500/15 text-blue-400 rounded">{c}</span>)}
                      {s.phone&&<span className="text-slate-400">{s.phone}</span>}
                      <Link href="/dashboard/requisiciones/proveedores" className="text-emerald-400 hover:text-emerald-300 text-[10px]">Ver →</Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Web Results */}
            {webResults.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-white flex items-center gap-1.5 mb-2"><Globe className="w-3.5 h-3.5 text-violet-400"/>Encontrados en la web ({webResults.length})</h3>
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] text-slate-500 font-semibold uppercase border-b border-white/[0.06]">
                      <th className="text-left py-1.5 pl-2">Proveedor</th>
                      <th className="text-left py-1.5">Teléfono</th>
                      <th className="text-left py-1.5">Dirección</th>
                      <th className="text-left py-1.5">Productos</th>
                      <th className="w-[70px]"></th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {webResults.map((r,idx)=>(
                      <tr key={idx} className="border-b border-white/[0.02] hover:bg-white/[0.04] transition-colors">
                        <td className="pl-2 pr-2 py-1.5">
                          <p className="text-white font-medium">{r.nombre}</p>
                          {r.sitio_web&&<a href={r.sitio_web.startsWith("http")?r.sitio_web:`https://${r.sitio_web}`} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 flex items-center gap-0.5 text-[10px]"><ExternalLink className="w-2.5 h-2.5"/>Web</a>}
                        </td>
                        <td className="text-slate-400">{r.telefono||"—"}</td>
                        <td className="text-slate-500 text-[10px] max-w-[180px]">{r.direccion||"—"}</td>
                        <td className="text-slate-500 text-[10px] max-w-[150px]">{r.productos_relacionados||""}</td>
                        <td className="pr-2">
                          {savedIdxs.includes(idx)?(
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400"><Check className="w-3 h-3"/>Guardado</span>
                          ):(
                            <button onClick={()=>saveAsSupplier(r,idx)} disabled={savingIdx===idx}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 disabled:opacity-50">
                              {savingIdx===idx?<Loader2 className="w-2.5 h-2.5 animate-spin"/>:<Plus className="w-2.5 h-2.5"/>}Agregar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {searchDone && !searching && webResults.length === 0 && existingMatches.length === 0 && !error && (
              <div className="text-center py-8">
                <Package className="w-8 h-8 text-slate-600 mx-auto mb-2"/>
                <p className="text-slate-400 text-sm">No se encontraron proveedores para &quot;{searchTerm}&quot;</p>
                <p className="text-slate-500 text-xs mt-1">Intenta con otro término de búsqueda</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
