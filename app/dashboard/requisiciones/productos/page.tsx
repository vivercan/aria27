"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Search, Package, Filter } from "lucide-react";
import Link from "next/link";

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  unidad: string;
  categoria: string | null;
  precio_referencia: number | null;
  activo: boolean;
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("");

  useEffect(() => {
    const cargar = async () => {
      const { data, count } = await supabase.from("products").select("*", { count: "exact" }).order("nombre").limit(200);
      if (data) setProductos(data);
      setLoading(false);
    };
    cargar();
  }, []);

  const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))];

  const filtrados = productos.filter(p => {
    const matchSearch = p.nombre?.toLowerCase().includes(search.toLowerCase()) || p.codigo?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoria || p.categoria === categoria;
    return matchSearch && matchCat;
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-none p-6 border-b border-white/10">
        <Link href="/dashboard/requisiciones" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Requisiciones
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Catálogo de Productos</h1>
          <p className="text-slate-400">2,483+ productos disponibles</p>
        </div>
        <div className="mt-4 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500" />
          </div>
          <select value={categoria} onChange={e => setCategoria(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c} value={c!}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-center py-12 text-slate-400">Cargando...</div>
        ) : (
          <div className="grid gap-2">
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs text-slate-400 font-medium sticky top-0 bg-slate-900">
              <div className="col-span-2">CÓDIGO</div>
              <div className="col-span-5">NOMBRE</div>
              <div className="col-span-2">CATEGORÍA</div>
              <div className="col-span-1">UNIDAD</div>
              <div className="col-span-2 text-right">PRECIO REF.</div>
            </div>
            {filtrados.map(p => (
              <div key={p.id} className="grid grid-cols-12 gap-4 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg items-center">
                <div className="col-span-2 text-sm text-slate-400 font-mono">{p.codigo}</div>
                <div className="col-span-5 text-white">{p.nombre}</div>
                <div className="col-span-2">
                  {p.categoria && <span className="text-xs px-2 py-1 bg-white/10 rounded text-slate-300">{p.categoria}</span>}
                </div>
                <div className="col-span-1 text-sm text-slate-400">{p.unidad}</div>
                <div className="col-span-2 text-right text-sm text-slate-300">
                  {p.precio_referencia ? `$${p.precio_referencia.toFixed(2)}` : "-"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
