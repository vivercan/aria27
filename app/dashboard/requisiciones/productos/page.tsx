"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Search, Package, ChevronLeft, ChevronRight,
  Truck, Tag, Box, Loader2, X, Plus, Download, Building2
} from "lucide-react";
import Link from "next/link";

interface Product {
  id: number; sku: string; name: string; description: string | null;
  unit: string; category: string | null;
}
interface SupplierInfo { id: number; name: string; }
const PAGE_SIZE = 50;

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [supplierMap, setSupplierMap] = useState<Record<number, SupplierInfo[]>>({});
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productSuppliers, setProductSuppliers] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search]);

  useEffect(() => {
    const load = async () => {
      let all: string[] = [];
      let from = 0;
      while (true) {
        const { data } = await supabase.from("products").select("category").not("category", "is", null).range(from, from + 999);
        if (!data || data.length === 0) break;
        all = all.concat(data.map(d => d.category).filter(Boolean));
        if (data.length < 1000) break;
        from += 1000;
      }
      setCategories([...new Set(all)].sort());
    };
    load();
  }, []);

  const loadProducts = useCallback(async (page: number) => {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase.from("products").select("id, sku, name, description, unit, category", { count: "exact" }).order("name").range(from, to);
    if (category) query = query.eq("category", category);
    if (debouncedSearch.trim()) {
      const t = debouncedSearch.trim();
      query = query.or(`name.ilike.%${t}%,sku.ilike.%${t}%,description.ilike.%${t}%`);
    }
    const { data, count } = await query;
    if (data) {
      setProducts(data);
      setTotalCount(count || 0);
      const ids = data.map(p => p.id);
      if (ids.length > 0) {
        const { data: psData } = await supabase.from("product_suppliers").select("product_id, suppliers(id, name)").in("product_id", ids);
        if (psData) {
          const map: Record<number, SupplierInfo[]> = {};
          psData.forEach((ps: any) => {
            if (!map[ps.product_id]) map[ps.product_id] = [];
            const s = ps.suppliers;
            if (s && !map[ps.product_id].find((x: SupplierInfo) => x.id === s.id)) map[ps.product_id].push({ id: s.id, name: s.name });
          });
          setSupplierMap(map);
        }
      }
    }
    setLoading(false);
  }, [debouncedSearch, category]);

  useEffect(() => { setCurrentPage(1); loadProducts(1); }, [debouncedSearch, category, loadProducts]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const goToPage = (p: number) => { if (p >= 1 && p <= totalPages) { setCurrentPage(p); loadProducts(p); } };

  const openDetail = async (product: Product) => {
    setSelectedProduct(product);
    setLoadingDetail(true);
    const { data } = await supabase.from("product_suppliers")
      .select("supplier_id, precio_referencia, tiempo_entrega_dias, es_proveedor_preferido, suppliers(id, name, phone, email, ciudad, estado, website, whatsapp, credit_days, razon_social)")
      .eq("product_id", product.id);
    setProductSuppliers(data || []);
    setLoadingDetail(false);
  };

  const downloadCSV = async () => {
    let all: any[] = []; let from = 0;
    while (true) {
      let q = supabase.from("products").select("sku, name, description, unit, category").order("category").order("name").range(from, from + 999);
      if (category) q = q.eq("category", category);
      if (debouncedSearch.trim()) q = q.or(`name.ilike.%${debouncedSearch.trim()}%,sku.ilike.%${debouncedSearch.trim()}%`);
      const { data } = await q;
      if (!data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }
    const BOM = "\uFEFF";
    const header = "SKU,NOMBRE,DESCRIPCION,UNIDAD,CATEGORIA";
    const rows = all.map((p: any) => {
      const esc = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
      return [esc(p.sku), esc(p.name), esc(p.description), esc(p.unit), esc(p.category)].join(",");
    });
    const blob = new Blob([BOM + header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `catalogo_aria27_${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* HEADER */}
      <div className="flex-none px-4 pt-3 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/requisiciones" className="p-1 hover:bg-white/10 rounded-lg"><ArrowLeft className="w-4 h-4 text-slate-400" /></Link>
            <h1 className="text-lg font-bold text-white flex items-center gap-2"><Package className="w-4 h-4 text-cyan-400" />Catálogo de Productos</h1>
            <span className="text-xs text-slate-500 ml-1">{loading ? "..." : `${totalCount.toLocaleString()} productos`}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={downloadCSV} className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-white/[0.05] border border-white/[0.08] text-slate-300 rounded-lg hover:bg-white/[0.1]"><Download className="w-3 h-3" />CSV</button>
            <button className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30"><Plus className="w-3 h-3" />Nuevo</button>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input type="text" placeholder="Buscar nombre, SKU..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-slate-500 focus:border-cyan-500/50 outline-none" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-slate-400" /></button>}
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="appearance-none pl-2.5 pr-6 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white outline-none cursor-pointer min-w-[180px]">
            <option value="">Todas ({categories.length})</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* TABLA */}
      <div className="flex-1 overflow-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 text-cyan-400 animate-spin" /><span className="ml-2 text-slate-400 text-sm">Cargando...</span></div>
        ) : products.length === 0 ? (
          <div className="text-center py-12"><Package className="w-8 h-8 text-slate-600 mx-auto mb-2" /><p className="text-slate-400 text-sm">Sin resultados</p></div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-900/95 backdrop-blur-sm border-b border-white/[0.06] text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                <th className="text-left pl-4 pr-1 py-1.5 w-[100px]">SKU</th>
                <th className="text-left px-1 py-1.5">Nombre</th>
                <th className="text-left px-1 py-1.5 w-[140px]">Categoría</th>
                <th className="text-left px-1 py-1.5 w-[60px]">Unidad</th>
                <th className="text-left px-1 py-1.5 w-[220px]">Proveedores</th>
                <th className="w-[30px]"></th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {products.map(p => {
                const supps = supplierMap[p.id] || [];
                return (
                  <tr key={p.id} onClick={() => openDetail(p)} className="border-b border-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-colors group h-[32px]">
                    <td className="pl-4 pr-1 text-slate-500 font-mono text-[11px]">{p.sku || "—"}</td>
                    <td className="px-1 text-white group-hover:text-cyan-300 transition-colors">{p.name}</td>
                    <td className="px-1">{p.category && <span className="text-[10px] px-1.5 py-0.5 bg-white/[0.06] rounded text-slate-400">{p.category}</span>}</td>
                    <td className="px-1 text-slate-400">{p.unit}</td>
                    <td className="px-1">
                      {supps.length > 0 ? (
                        <div className="flex gap-1 items-center">
                          {supps.slice(0, 2).map(s => (
                            <span key={s.id} className="text-[10px] px-1 py-0.5 bg-emerald-500/10 text-emerald-400 rounded truncate max-w-[100px]" title={s.name}>{s.name.length > 14 ? s.name.substring(0, 14) + "…" : s.name}</span>
                          ))}
                          {supps.length > 2 && <span className="text-[10px] text-slate-500">+{supps.length - 2}</span>}
                        </div>
                      ) : <span className="text-[10px] text-slate-600">—</span>}
                    </td>
                    <td className="pr-3"><ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-slate-400" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* PAGINACIÓN */}
      {totalPages > 1 && (
        <div className="flex-none px-4 py-1.5 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
          <span className="text-slate-500">{((currentPage-1)*PAGE_SIZE)+1}–{Math.min(currentPage*PAGE_SIZE,totalCount)} de {totalCount.toLocaleString()}</span>
          <div className="flex items-center gap-0.5">
            <button onClick={() => goToPage(1)} disabled={currentPage===1} className="px-1.5 py-0.5 text-slate-400 hover:text-white hover:bg-white/10 rounded disabled:opacity-30">«</button>
            <button onClick={() => goToPage(currentPage-1)} disabled={currentPage===1} className="px-1.5 py-0.5 text-slate-400 hover:text-white hover:bg-white/10 rounded disabled:opacity-30">‹</button>
            {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
              let p:number;
              if(totalPages<=5)p=i+1;else if(currentPage<=3)p=i+1;else if(currentPage>=totalPages-2)p=totalPages-4+i;else p=currentPage-2+i;
              return <button key={p} onClick={()=>goToPage(p)} className={`w-6 h-6 rounded ${p===currentPage?"bg-cyan-500/20 text-cyan-400 font-bold":"text-slate-400 hover:bg-white/10"}`}>{p}</button>;
            })}
            <button onClick={() => goToPage(currentPage+1)} disabled={currentPage===totalPages} className="px-1.5 py-0.5 text-slate-400 hover:text-white hover:bg-white/10 rounded disabled:opacity-30">›</button>
            <button onClick={() => goToPage(totalPages)} disabled={currentPage===totalPages} className="px-1.5 py-0.5 text-slate-400 hover:text-white hover:bg-white/10 rounded disabled:opacity-30">»</button>
          </div>
          <span className="text-slate-500">Pág {currentPage}/{totalPages}</span>
        </div>
      )}

      {/* PANEL DETALLE */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedProduct(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-slate-900 border-l border-white/[0.08] h-full overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-white/[0.06] p-4 z-10">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-cyan-400 font-mono">{selectedProduct.sku}</p>
                  <h2 className="text-base font-bold text-white leading-tight mt-0.5">{selectedProduct.name}</h2>
                  {selectedProduct.description && <p className="text-xs text-slate-400 mt-0.5">{selectedProduct.description}</p>}
                </div>
                <button onClick={() => setSelectedProduct(null)} className="p-1.5 hover:bg-white/10 rounded-lg ml-2"><X className="w-4 h-4 text-slate-400" /></button>
              </div>
              <div className="flex gap-1.5 mt-2">
                {selectedProduct.category && <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded flex items-center gap-1"><Tag className="w-2.5 h-2.5" />{selectedProduct.category}</span>}
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-500/10 text-slate-400 rounded flex items-center gap-1"><Box className="w-2.5 h-2.5" />{selectedProduct.unit}</span>
              </div>
            </div>
            <div className="p-4">
              <h3 className="text-xs font-semibold text-white flex items-center gap-1.5 mb-2"><Truck className="w-3.5 h-3.5 text-emerald-400" />Proveedores <span className="ml-auto text-[10px] text-slate-500">{loadingDetail ? "..." : productSuppliers.length}</span></h3>
              {loadingDetail ? (
                <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 text-cyan-400 animate-spin" /></div>
              ) : productSuppliers.length === 0 ? (
                <div className="text-center py-4 bg-white/[0.02] rounded-lg border border-white/[0.04]"><Truck className="w-6 h-6 text-slate-600 mx-auto mb-1" /><p className="text-slate-500 text-xs">Sin proveedores</p></div>
              ) : (
                <div className="space-y-1.5">
                  {productSuppliers.map((ps: any, idx: number) => (
                    <div key={idx} className={`p-2.5 rounded-lg border transition-all ${ps.es_proveedor_preferido ? "bg-emerald-500/[0.06] border-emerald-500/20" : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0"><Building2 className="w-3.5 h-3.5 text-emerald-400" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-xs flex items-center gap-1">{ps.suppliers?.name || "—"}{ps.es_proveedor_preferido && <span className="text-[8px] px-1 bg-emerald-500/20 text-emerald-400 rounded font-bold">PREF</span>}</p>
                          <p className="text-[10px] text-slate-500">{[ps.suppliers?.ciudad, ps.suppliers?.estado].filter(Boolean).join(", ") || "—"}{ps.suppliers?.phone && ` · ${ps.suppliers.phone}`}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {ps.precio_referencia && <p className="text-xs text-emerald-400 font-medium">${ps.precio_referencia.toLocaleString("es-MX",{minimumFractionDigits:2})}</p>}
                          {ps.tiempo_entrega_dias && <p className="text-[10px] text-slate-500">{ps.tiempo_entrega_dias}d</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
