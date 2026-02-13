"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Search, Loader2, Package, Globe, Phone, Mail,
  MapPin, Plus, ExternalLink, Building2, Sparkles, X, Check
} from "lucide-react";
import Link from "next/link";

interface WebResult {
  name: string; phone: string; email: string; website: string;
  address: string; category: string; notes: string;
}

interface ExistingSupplier {
  id: string; name: string; phone: string; email: string;
  categories: any;
}

export default function ProspeccionPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [existingMatches, setExistingMatches] = useState<ExistingSupplier[]>([]);
  const [searchDone, setSearchDone] = useState(false);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [savedIdxs, setSavedIdxs] = useState<number[]>([]);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true); setError(""); setWebResults([]); setExistingMatches([]); setSavedIdxs([]);

    try {
      // 1. Buscar en proveedores existentes
      const { data: existing } = await supabase
        .from("Proveedores")
        .select("id, name, phone, email, categories")
        .or(`name.ilike.%${searchTerm}%,categories.cs.{${searchTerm.toUpperCase()}}`)
        .limit(10);
      setExistingMatches(existing || []);

      // 2. Buscar con API Anthropic
      const res = await fetch("/api/proveedores/buscar-inteligente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchTerm, ciudad: "Aguascalientes" }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status}`);
      }

      const data = await res.json();
      setWebResults(data.proveedores || []);
    } catch (e: any) {
      console.error("Error buscando:", e);
      setError(e.message || "Error en la búsqueda");
    } finally {
      setSearching(false);
      setSearchDone(true);
    }
  };

  const saveAsSupplier = async (result: WebResult, idx: number) => {
    setSavingIdx(idx);
    try {
      await supabase.from("Proveedores").insert({
        name: result.name,
        phone: result.phone || null,
        email: result.email || null,
        website: result.website || null,
        address: result.address || null,
        categories: result.category || null,
        notas_comerciales: result.notes || null,
        active: true,
      });
      setSavedIdxs(prev => [...prev, idx]);
    } catch (e) {
      console.error("Error guardando:", e);
    } finally {
      setSavingIdx(null);
    }
  };

  const getCatDisplay = (cats: any): string[] => {
    if (!cats) return [];
    if (Array.isArray(cats)) return cats.filter(Boolean);
    if (typeof cats === "string") return cats.split(",").map((c: string) => c.trim()).filter(Boolean);
    return [];
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* HEADER */}
      <div className="flex-none px-4 pt-3 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 mb-2">
          <Link href="/dashboard/requisiciones" className="p-1 hover:bg-white/10 rounded-lg"><ArrowLeft className="w-4 h-4 text-slate-400"/></Link>
          <h1 className="text-lg font-bold text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-400"/>Prospección de Proveedores</h1>
        </div>
        <p className="text-xs text-slate-400 mb-2 ml-7">Busca proveedores por producto o categoría. ARIA usa inteligencia artificial para encontrar opciones en Aguascalientes y alrededores.</p>

        <div className="flex gap-2 ml-7">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500"/>
            <input type="text" placeholder='Ej: "acero corrugado", "tubería PVC", "concreto premezclado"...'
              value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleSearch()}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-slate-500 focus:border-violet-500/50 outline-none"/>
          </div>
          <button onClick={handleSearch} disabled={searching||!searchTerm.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/30 disabled:opacity-40 font-medium">
            {searching?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Sparkles className="w-3.5 h-3.5"/>}
            {searching?"Buscando...":"Buscar con IA"}
          </button>
        </div>
      </div>

      {/* RESULTADOS */}
      <div className="flex-1 overflow-auto min-h-0 px-4 py-3">
        {!searchDone && !searching && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4"><Sparkles className="w-8 h-8 text-violet-400"/></div>
            <h2 className="text-white font-semibold mb-1">Busca nuevos proveedores</h2>
            <p className="text-slate-400 text-sm max-w-md">Escribe el producto o categoría que necesitas y ARIA buscará proveedores en la web usando inteligencia artificial.</p>
          </div>
        )}

        {searching && (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin mb-3"/>
            <p className="text-white font-medium">Buscando proveedores de "{searchTerm}"...</p>
            <p className="text-slate-400 text-xs mt-1">Esto puede tomar unos segundos</p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs mb-4">{error}</div>
        )}

        {searchDone && !searching && (
          <div className="space-y-4">
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
                      {s.email&&<span className="text-slate-400 truncate max-w-[150px]">{s.email}</span>}
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
                      <th className="text-left py-1.5">Email / Web</th>
                      <th className="text-left py-1.5">Dirección</th>
                      <th className="text-left py-1.5">Notas</th>
                      <th className="w-[70px]"></th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {webResults.map((r,idx)=>(
                      <tr key={idx} className="border-b border-white/[0.02] hover:bg-white/[0.04] transition-colors h-[34px]">
                        <td className="pl-2 pr-2">
                          <p className="text-white font-medium">{r.name}</p>
                          {r.category&&<span className="text-[9px] px-1 py-0.5 bg-violet-500/15 text-violet-400 rounded">{r.category}</span>}
                        </td>
                        <td className="text-slate-400">{r.phone||"—"}</td>
                        <td className="text-slate-400">
                          <div className="flex flex-col gap-0.5">
                            {r.email&&<span className="truncate max-w-[150px]">{r.email}</span>}
                            {r.website&&<a href={r.website.startsWith("http")?r.website:`https://${r.website}`} target="_blank" className="text-violet-400 hover:text-violet-300 flex items-center gap-0.5 text-[10px]"><ExternalLink className="w-2.5 h-2.5"/>Web</a>}
                          </div>
                        </td>
                        <td className="text-slate-500 text-[10px] max-w-[150px] truncate">{r.address||"—"}</td>
                        <td className="text-slate-500 text-[10px] max-w-[120px] truncate">{r.notes||""}</td>
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

            {searchDone && !searching && webResults.length === 0 && existingMatches.length === 0 && (
              <div className="text-center py-8">
                <Package className="w-8 h-8 text-slate-600 mx-auto mb-2"/>
                <p className="text-slate-400 text-sm">No se encontraron proveedores para "{searchTerm}"</p>
                <p className="text-slate-500 text-xs mt-1">Intenta con otro término de búsqueda</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
