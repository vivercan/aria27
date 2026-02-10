"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Search, Package, ChevronDown, ChevronRight,
  Truck, Hash, Tag, Box, DollarSign, Loader2, X, ExternalLink,
  Plus, Filter, Save, Edit2
} from "lucide-react";
import Link from "next/link";

interface Product {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  short_description: string | null;
  unit: string;
  category: string | null;
  subcategory: string | null;
  commercial_presentation: string | null;
  type: string | null;
}

interface ProductSupplier {
  supplier_id: number;
  precio_referencia: number | null;
  tiempo_entrega_dias: number | null;
  es_proveedor_preferido: boolean;
  suppliers: {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    categories: string | null;
    ciudad: string | null;
    estado: string | null;
  };
}

interface SupplierCount {
  product_id: number;
  count: number;
}

const PAGE_SIZE = 50;

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [supplierCounts, setSupplierCounts] = useState<Record<number, number>>({});

  // Detalle de producto seleccionado
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productSuppliers, setProductSuppliers] = useState<ProductSupplier[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [savingProd, setSavingProd] = useState(false);
  const [prodForm, setProdForm] = useState({ sku: "", name: "", description: "", unidad: "PIEZA", category: "", precio_referencia: "" });
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout>(null);

  // Debounce de búsqueda
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search]);

  // Cargar categorías únicas
  useEffect(() => {
    const loadCategories = async () => {
      const { data } = await supabase
        .from("Productos")
        .select("category")
        .not("category", "is", null)
        .order("category");
      if (data) {
        const unique = [...new Set(data.map(d => d.category).filter(Boolean))] as string[];
        setCategories(unique);
      }
    };
    loadCategories();
  }, []);

  // Cargar productos con búsqueda y paginación
  const loadProducts = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true);
      setPage(0);
    } else {
      setLoadingMore(true);
    }

    const currentPage = reset ? 0 : page;
    const from = currentPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("Productos")
      .select("*", { count: "exact" })
      .order("name")
      .range(from, to);

    // Filtro por categoría
    if (category) {
      query = query.eq("category", category);
    }

    // Búsqueda inteligente: por nombre, SKU o descripción
    if (debouncedSearch.trim()) {
      const term = debouncedSearch.trim();
      query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%,description.ilike.%${term}%`);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error("Error cargando productos:", error);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    if (data) {
      const newProducts = reset ? data : [...products, ...data];
      setProducts(newProducts);
      setTotalCount(count || 0);
      setHasMore(data.length === PAGE_SIZE);

      if (!reset) setPage(prev => prev + 1);

      // Cargar conteo de proveedores para estos productos
      const ids = data.map(p => p.id);
      if (ids.length > 0) {
        const { data: psData } = await supabase
          .from("product_suppliers")
          .select("product_id")
          .in("product_id", ids);

        if (psData) {
          const counts: Record<number, number> = { ...supplierCounts };
          psData.forEach(ps => {
            counts[ps.product_id] = (counts[ps.product_id] || 0) + 1;
          });
          setSupplierCounts(counts);
        }
      }
    }

    setLoading(false);
    setLoadingMore(false);
  }, [debouncedSearch, category, page, products, supplierCounts]);

  // Recargar cuando cambia búsqueda o categoría
  useEffect(() => {
    setProducts([]);
    setSupplierCounts({});
    setPage(0);
    setHasMore(true);
    loadProducts(true);
  }, [debouncedSearch, category]);

  // Scroll infinito
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || loadingMore || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      setPage(prev => prev + 1);
      loadProducts(false);
    }
  }, [loadingMore, hasMore, loadProducts]);

  // Cargar detalle de proveedores de un producto
  const openDetail = async (product: Product) => {
    setSelectedProduct(product);
    setLoadingDetail(true);
    setProductSuppliers([]);

    const { data } = await supabase
      .from("product_suppliers")
      .select(`
        supplier_id,
        precio_referencia,
        tiempo_entrega_dias,
        es_proveedor_preferido,
        suppliers (
          id, name, phone, email, categories, ciudad, estado
        )
      `)
      .eq("product_id", product.id);

    if (data) setProductSuppliers(data as unknown as ProductSupplier[]);
    setLoadingDetail(false);
  };

  // Ordenar resultados: priorizar coincidencias al inicio

  const handleSaveProduct = async () => {
    if (!prodForm.name || !prodForm.sku) return;
    setSavingProd(true);
    await supabase.from("products").insert({
      sku: prodForm.sku,
      name: prodForm.name,
      description: prodForm.description || null,
      unit: prodForm.unidad,
      category: prodForm.category || null,
      reference_price: prodForm.precio_referencia ? parseFloat(prodForm.precio_referencia) : null,
      active: true
    });
    setSavingProd(false);
    setShowAddModal(false);
    setProdForm({ sku: "", name: "", description: "", unidad: "PIEZA", category: "", precio_referencia: "" });
    loadProducts(true);
  };

  const sortedProducts = debouncedSearch.trim()
    ? [...products].sort((a, b) => {
        const term = debouncedSearch.toLowerCase();
        const aStarts = a.name?.toLowerCase().startsWith(term) ? 0 : 1;
        const bStarts = b.name?.toLowerCase().startsWith(term) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        // Segundo criterio: palabra empieza con el término
        const aWord = a.name?.toLowerCase().split(" ").some(w => w.startsWith(term)) ? 0 : 1;
        const bWord = b.name?.toLowerCase().split(" ").some(w => w.startsWith(term)) ? 0 : 1;
        return aWord - bWord;
      })
    : products;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* HEADER */}
      <div className="flex-none p-6 pb-4 border-b border-white/[0.06]">
        <Link href="/dashboard/requisiciones" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Requisiciones
        </Link>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/10">
                <Package className="w-6 h-6 text-cyan-400" />
              </div>
              Catálogo de Productos
            </h1>
            <p className="text-slate-400 mt-1">
              {loading ? "Cargando..." : (
                <>
                  <span className="text-white font-semibold">{totalCount.toLocaleString()}</span> productos
                  {category && <> en <span className="text-cyan-400">{category}</span></>}
                  {debouncedSearch && <> que coinciden con "<span className="text-cyan-400">{debouncedSearch}</span>"</>}
                </>
              )}
            </p>
          </div>
        </div>

        {/* BÚSQUEDA Y FILTROS */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nombre, SKU o descripción..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </div>
          <div className="relative">
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white focus:border-cyan-500/50 transition-all outline-none cursor-pointer min-w-[220px]"
            >
              <option value="">Todas las categorías ({categories.length})</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* TABLA */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            <span className="ml-3 text-slate-400">Cargando catálogo...</span>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No se encontraron productos</p>
            {debouncedSearch && (
              <button onClick={() => setSearch("")} className="mt-3 text-sm text-cyan-400 hover:text-cyan-300">
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="min-w-[800px]">
            {/* Header de tabla */}
            <div className="grid grid-cols-12 gap-2 px-6 py-2.5 text-[11px] text-slate-500 font-semibold uppercase tracking-wider sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-white/[0.04] z-10">
              <div className="col-span-2">SKU</div>
              <div className="col-span-4">Nombre</div>
              <div className="col-span-2">Categoría</div>
              <div className="col-span-1">Unidad</div>
              <div className="col-span-1 text-center">
                <Truck className="w-3.5 h-3.5 inline" />
              </div>
              <div className="col-span-2 text-right">Precio Ref.</div>
            </div>

            {/* Filas */}
            {sortedProducts.map(p => {
              const sc = supplierCounts[p.id] || 0;
              return (
                <button
                  key={p.id}
                  onClick={() => openDetail(p)}
                  className="w-full grid grid-cols-12 gap-2 px-6 py-3 hover:bg-white/[0.04] border-b border-white/[0.02] items-center text-left transition-colors group"
                >
                  <div className="col-span-2 text-sm text-slate-500 font-mono">{p.sku || "—"}</div>
                  <div className="col-span-4">
                    <span className="text-white group-hover:text-cyan-300 transition-colors">{p.name}</span>
                    {p.description && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{p.description}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    {p.category && (
                      <span className="text-[11px] px-2 py-0.5 bg-white/[0.06] rounded-full text-slate-400">
                        {p.category}
                      </span>
                    )}
                  </div>
                  <div className="col-span-1 text-sm text-slate-400">{p.unit}</div>
                  <div className="col-span-1 text-center">
                    <span className={`text-sm font-medium ${sc > 0 ? "text-emerald-400" : "text-slate-600"}`}>
                      {sc > 0 ? sc : "—"}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm text-slate-500">—</span>
                  </div>
                </button>
              );
            })}

            {/* Loading more */}
            {loadingMore && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                <span className="ml-2 text-sm text-slate-500">Cargando más...</span>
              </div>
            )}

            {/* Fin de resultados */}
            {!hasMore && products.length > 0 && (
              <div className="text-center py-4 text-sm text-slate-600">
                Mostrando {products.length} de {totalCount.toLocaleString()} productos
              </div>
            )}
          </div>
        )}
      </div>

      {/* PANEL LATERAL - Detalle de producto */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedProduct(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg bg-slate-900 border-l border-white/[0.08] h-full overflow-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header del panel */}
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-white/[0.06] p-6 z-10">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-cyan-400 font-mono mb-1">{selectedProduct.sku}</p>
                  <h2 className="text-xl font-bold text-white leading-tight">{selectedProduct.name}</h2>
                  {selectedProduct.description && (
                    <p className="text-sm text-slate-400 mt-1">{selectedProduct.description}</p>
                  )}
                </div>
                <button onClick={() => setSelectedProduct(null)} className="p-2 hover:bg-white/10 rounded-lg ml-4">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-4">
                {selectedProduct.category && (
                  <span className="text-xs px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-full flex items-center gap-1">
                    <Tag className="w-3 h-3" /> {selectedProduct.category}
                  </span>
                )}
                {selectedProduct.subcategory && (
                  <span className="text-xs px-2.5 py-1 bg-purple-500/10 text-purple-400 rounded-full">
                    {selectedProduct.subcategory}
                  </span>
                )}
                <span className="text-xs px-2.5 py-1 bg-slate-500/10 text-slate-400 rounded-full flex items-center gap-1">
                  <Box className="w-3 h-3" /> {selectedProduct.unit}
                </span>
                {selectedProduct.commercial_presentation && (
                  <span className="text-xs px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-full">
                    {selectedProduct.commercial_presentation}
                  </span>
                )}
              </div>
            </div>

            {/* Proveedores */}
            <div className="p-6">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                <Truck className="w-4 h-4 text-emerald-400" />
                Proveedores que lo manejan
                <span className="ml-auto text-xs text-slate-500">
                  {loadingDetail ? "..." : `${productSuppliers.length} encontrados`}
                </span>
              </h3>

              {loadingDetail ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                </div>
              ) : productSuppliers.length === 0 ? (
                <div className="text-center py-8 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                  <Truck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Sin proveedores vinculados</p>
                  <p className="text-slate-600 text-xs mt-1">Vincúlalo desde el Catálogo de Proveedores</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {productSuppliers.map((ps, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition-all ${
                        ps.es_proveedor_preferido
                          ? "bg-emerald-500/[0.06] border-emerald-500/20"
                          : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-white font-medium flex items-center gap-2">
                            {ps.suppliers?.name || "Proveedor desconocido"}
                            {ps.es_proveedor_preferido && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-semibold">
                                PREFERIDO
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {[ps.suppliers?.ciudad, ps.suppliers?.estado].filter(Boolean).join(", ") || "—"}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3">
                        {ps.precio_referencia && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                            <div>
                              <p className="text-xs text-slate-500">Precio ref.</p>
                              <p className="text-sm text-white font-medium">
                                ${ps.precio_referencia.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                        )}
                        {ps.tiempo_entrega_dias && (
                          <div className="flex items-center gap-2">
                            <Package className="w-3.5 h-3.5 text-blue-400" />
                            <div>
                              <p className="text-xs text-slate-500">Entrega</p>
                              <p className="text-sm text-white font-medium">{ps.tiempo_entrega_dias} días</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Contacto */}
                      <div className="flex gap-4 mt-3 pt-3 border-t border-white/[0.04]">
                        {ps.suppliers?.phone && (
                          <span className="text-xs text-slate-500">{ps.suppliers.phone}</span>
                        )}
                        {ps.suppliers?.email && (
                          <span className="text-xs text-slate-500">{ps.suppliers.email}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Link a proveedores */}
              <Link
                href="/dashboard/requisiciones/proveedores"
                className="mt-4 flex items-center justify-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-sm text-slate-400 hover:text-white transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Ir al Catálogo de Proveedores
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
