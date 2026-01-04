"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Package, Search, Plus, Edit2, Save, X, Filter, ChevronLeft, ChevronRight } from "lucide-react";

interface Product {
  id: number;
  sku: string;
  name: string;
  description: string;
  unit: string;
  category: string;
  subcategory: string;
  type: string;
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("");
  const [categorias, setCategorias] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  useEffect(() => { loadCategorias(); }, []);
  useEffect(() => { loadProductos(); }, [search, categoria, page]);

  const loadCategorias = async () => {
    const { data } = await supabase.from("products").select("category").not("category", "is", null);
    if (data) {
      const unique = [...new Set(data.map(p => p.category).filter(Boolean))].sort();
      setCategorias(unique);
    }
  };

  const loadProductos = async () => {
    setLoading(true);
    let query = supabase.from("products").select("*", { count: "exact" });
    if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`);
    if (categoria) query = query.eq("category", categoria);
    const from = (page - 1) * pageSize;
    const { data, count } = await query.order("category").order("name").range(from, from + pageSize - 1);
    if (data) { setProductos(data); setTotal(count || 0); }
    setLoading(false);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Package className="w-7 h-7 text-cyan-400" />
            Catálogo de Productos
          </h1>
          <p className="text-slate-400 mt-1">{total.toLocaleString()} productos registrados</p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-wrap gap-4">
        <div className="flex-1 min-w-[250px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" placeholder="Buscar por nombre, SKU o descripción..." value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500" />
          </div>
        </div>
        <div className="min-w-[200px]">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select value={categoria} onChange={(e) => { setCategoria(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white focus:outline-none focus:border-cyan-500 appearance-none">
              <option value="">Todas las categorías</option>
              {categorias.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Categoría</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Unidad</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {productos.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3"><span className="text-cyan-400 font-mono text-sm">{p.sku}</span></td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{p.name}</p>
                      {p.description && <p className="text-xs text-slate-400 truncate max-w-xs">{p.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-lg bg-white/[0.05] text-xs text-slate-300">{p.category}</span>
                      {p.subcategory && <span className="ml-2 text-xs text-slate-500">{p.subcategory}</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">{p.unit}</td>
                    <td className="px-4 py-3 text-center"><span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs">{p.type}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/[0.06] flex items-center justify-between">
            <p className="text-sm text-slate-400">Mostrando {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} de {total}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-50"><ChevronLeft className="w-5 h-5 text-white" /></button>
              <span className="text-white px-3">Página {page} de {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-50"><ChevronRight className="w-5 h-5 text-white" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
