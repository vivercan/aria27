"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Search, Package, ChevronDown, ChevronLeft, ChevronRight,
  Truck, Tag, Box, DollarSign, Loader2, X, ExternalLink,
  Plus, Download, Building2
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

  // Detalle producto
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productSuppliers, setProductSuppliers] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const searchTimeout = useRef<NodeJS.Timeout>(null);

  // Debounce búsqueda
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search]);

  // Cargar categorías (paginando para obtener todas)
  useEffect(() => {
    const loadCategories = async () => {
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
    loadCategories();
  }, []);

  // Cargar productos con paginación real
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

      // Cargar proveedores para estos productos
      const ids = data.map(p => p.id);
      if (ids.length > 0) {
        const { data: psData } = await supabase
          .from("product_suppliers")
          .select("product_id, suppliers(id, name)")
          .in("product_id", ids);
        if (psData) {
          const map: Record<number, SupplierInfo[]> = {};
          psData.forEach((ps: any) => {
            if (!map[ps.product_id]) map[ps.product_id] = [];
            const s = ps.suppliers;
            if (s && !map[ps.product_id].find(x => x.id === s.id)) {
              map[ps.product_id].push({ id: s.id, name: s.name });
            }
          });
          setSupplierMap(map);
        }
      }
    }
    setLoading(false);
  }, [debouncedSearch, category]);

  // Recargar cuando cambia búsqueda o categoría
  useEffect(() => { setCurrentPage(1); loadProducts(1); }, [debouncedSearch, category, loadProducts]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const goToPage = (p: number) => { if (p >= 1 && p <= totalPages) { setCurrentPage(p); loadProducts(p); } };

  // Detalle de producto
  const openDetail = async (product: Product) => {
    setSelectedProduct(product);
    setLoadingDetail(true);
    const { data } = await supabase
      .from("product_suppliers")
      .select("supplier_id, precio_referencia, tiempo_entrega_dias, es_proveedor_preferido, suppliers(id, name, phone, email, categories, ciudad, estado, website, whatsapp, credit_days, payment_method, razon_social)")
      .eq("product_id", product.id);
    setProductSuppliers(data || []);
    setLoadingDetail(false);
  };

  // Descargar CSV
  const downloadCSV = async () => {
    let all: any[] = [];
    let from = 0;
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
    const rows = all.map(p => {
      const esc = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
      return [esc(p.sku), esc(p.name), esc(p.description), esc(p.unit), esc(p.category)].join(",");
    });
    const blob = new Blob([BOM + header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `catalogo_aria27_${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* HEADER COMPACTO */}
      <div className="flex-none px-6 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/requisiciones" className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft className="w-4 h-4 text-slate-400" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-cyan-400" />
                Catálogo de Productos
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {loading ? "Cargando..." : <><span className="text-white font-medium">{totalCount.toLocaleString()}</span> productos{category && <> en <span className="text-cyan-400">{category}</span></>}</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={downloadCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/[0.05] border border-white/[0.08] text-slate-300 rounded-lg hover:bg-white/[0.1] transition-colors">
              <Download className="w-3.5 h-3.5" /> Descargar
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Nuevo
            </button>
          </div>
        </div>

        {/* BÚSQUEDA + FILTRO */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input type="text" placeholder="Buscar por nombre, SKU o descripción..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-slate-500 focus:border-cyan-500/50 outline-none" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"><X className="w-3 h-3 text-slate-400" /></button>}
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-white outline-none cursor-pointer min-w-[200px]">
            <option value="">Todas ({categories.length})</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* TABLA CON SCROLL INTERNO */}
      <div className="flex-1 overflow-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 text-cyan-400 animate-spin" /><span className="ml-2 text-slate-400 text-sm">Cargando...</span></div>
        ) : products.length === 0 ? (
          <div className="text-center py-16"><Package className="w-10 h-10 text-slate-600 mx-auto mb-2" /><p className="text-slate-400 text-sm">Sin resultados</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-900/95 backdrop-blur-sm border-b border-white/[0.06] text-[11px] text-slate-500 font-semibold uppercase">
                <th className="text-left pl-6 pr-2 py-2 w-[120px]">SKU</th>
                <th className="text-left px-2 py-2">Nombre</th>
                <th className="text-left px-2 py-2 w-[160px]">Categoría</th>
                <th className="text-left px-2 py-2 w-[80px]">Unidad</th>
                <th className="text-left px-2 py-2 w-[200px]">Proveedores</th>
                <th className="text-right px-6 py-2 w-[50px]"></th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                const supps = supplierMap[p.id] || [];
                return (
                  <tr key={p.id} onClick={() => openDetail(p)} className="border-b border-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-colors group">
                    <td className="pl-6 pr-2 py-1.5 text-slate-500 font-mono text-xs">{p.sku || "—"}</td>
                    <td className="px-2 py-1.5">
                      <span className="text-white group-hover:text-cyan-300 transition-colors text-xs">{p.name}</span>
                    </td>
                    <td className="px-2 py-1.5">
                      {p.category && <span className="text-[10px] px-1.5 py-0.5 bg-white/[0.06] rounded-full text-slate-400">{p.category}</span>}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-slate-400">{p.unit}</td>
                    <td className="px-2 py-1.5">
                      {supps.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {supps.slice(0, 2).map(s => (
                            <span key={s.id} className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full truncate max-w-[90px]" title={s.name}>
                              {s.name.length > 12 ? s.name.substring(0, 12) + "…" : s.name}
                            </span>
                          ))}
                          {supps.length > 2 && <span className="text-[10px] text-slate-500">+{supps.length - 2}</span>}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-1.5 text-right">
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 inline" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* PAGINACIÓN */}
      {totalPages > 1 && (
        <div className="flex-none px-6 py-2.5 border-t border-white/[0.06] flex items-center justify-between bg-slate-900/95">
          <span className="text-xs text-slate-500">
            {((currentPage - 1) * PAGE_SIZE) + 1}-{Math.min(currentPage * PAGE_SIZE, totalCount)} de {totalCount.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => goToPage(1)} disabled={currentPage === 1}
              className="px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed">
              Primera
            </button>
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
              className="p-1 hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
            {/* Números de página */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 5) p = i + 1;
              else if (currentPage <= 3) p = i + 1;
              else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
              else p = currentPage - 2 + i;
              return (
                <button key={p} onClick={() => goToPage(p)}
                  className={`w-7 h-7 text-xs rounded ${p === currentPage ? "bg-cyan-500/20 text-cyan-400 font-bold" : "text-slate-400 hover:bg-white/10 hover:text-white"}`}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}
              className="p-1 hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}
              className="px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed">
              Última
            </button>
          </div>
          <span className="text-xs text-slate-500">
            Página {currentPage} de {totalPages}
          </span>
        </div>
      )}

      {/* PANEL LATERAL DETALLE */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedProduct(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-slate-900 border-l border-white/[0.08] h-full overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-white/[0.06] p-5 z-10">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-cyan-400 font-mono mb-1">{selectedProduct.sku}</p>
                  <h2 className="text-lg font-bold text-white leading-tight">{selectedProduct.name}</h2>
                  {selectedProduct.description && <p className="text-sm text-slate-400 mt-1">{selectedProduct.description}</p>}
                </div>
                <button onClick={() => setSelectedProduct(null)} className="p-2 hover:bg-white/10 rounded-lg ml-3"><X className="w-4 h-4 text-slate-400" /></button>
              </div>
              <div className="flex gap-2 mt-3">
                {selectedProduct.category && <span className="text-[11px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full flex items-center gap-1"><Tag className="w-3 h-3" />{selectedProduct.category}</span>}
                <span className="text-[11px] px-2 py-0.5 bg-slate-500/10 text-slate-400 rounded-full flex items-center gap-1"><Box className="w-3 h-3" />{selectedProduct.unit}</span>
              </div>
            </div>

            <div className="p-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                <Truck className="w-4 h-4 text-emerald-400" /> Proveedores
                <span className="ml-auto text-xs text-slate-500">{loadingDetail ? "..." : `${productSuppliers.length}`}</span>
              </h3>

              {loadingDetail ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-cyan-400 animate-spin" /></div>
              ) : productSuppliers.length === 0 ? (
                <div className="text-center py-6 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                  <Truck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Sin proveedores vinculados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {productSuppliers.map((ps: any, idx: number) => (
                    <Link key={idx} href={`/dashboard/requisiciones/proveedores?id=${ps.suppliers?.id}`}
                      className={`block p-3 rounded-xl border transition-all hover:border-white/20 ${ps.es_proveedor_preferido ? "bg-emerald-500/[0.06] border-emerald-500/20" : "bg-white/[0.02] border-white/[0.06]"}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm flex items-center gap-2">
                            {ps.suppliers?.name || "—"}
                            {ps.es_proveedor_preferido && <span className="text-[9px] px-1 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-bold">PREFERIDO</span>}
                          </p>
                          <p className="text-[11px] text-slate-500">{[ps.suppliers?.ciudad, ps.suppliers?.estado].filter(Boolean).join(", ") || "—"}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {ps.precio_referencia && <p className="text-sm text-emerald-400 font-medium">${ps.precio_referencia.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>}
                          {ps.tiempo_entrega_dias && <p className="text-[10px] text-slate-500">{ps.tiempo_entrega_dias} días</p>}
                        </div>
                      </div>
                      {(ps.suppliers?.phone || ps.suppliers?.email) && (
                        <div className="flex gap-3 mt-2 pt-2 border-t border-white/[0.04] text-[11px] text-slate-500">
                          {ps.suppliers?.phone && <span>Tel: {ps.suppliers.phone}</span>}
                          {ps.suppliers?.email && <span>{ps.suppliers.email}</span>}
                        </div>
                      )}
                    </Link>
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
