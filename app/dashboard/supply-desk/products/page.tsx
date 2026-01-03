"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Package, Search, Plus, Edit2, Trash2, Save, X, Filter, ChevronLeft, ChevronRight } from "lucide-react";

interface Product {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  unidad: string;
  categoria: string;
  precio_referencia: number;
  activo: boolean;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("");
  const [categorias, setCategorias] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    unidad: "PIEZA",
    categoria: "",
    precio_referencia: 0,
    activo: true,
  });
  const [saving, setSaving] = useState(false);

  const unidades = ["PIEZA", "METRO", "M2", "M3", "LITRO", "KG", "TONELADA", "SACO", "ROLLO", "CAJA", "PAQUETE", "SERVICIO", "VIAJE", "HORA"];

  useEffect(() => {
    loadCategorias();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [search, categoria, page]);

  const loadCategorias = async () => {
    const { data } = await supabase
      .from("products")
      .select("categoria")
      .not("categoria", "is", null);
    
    if (data) {
      const unique = [...new Set(data.map(p => p.categoria).filter(Boolean))].sort();
      setCategorias(unique);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    let query = supabase
      .from("products")
      .select("*", { count: "exact" });

    if (search) {
      query = query.or(`nombre.ilike.%${search}%,codigo.ilike.%${search}%,descripcion.ilike.%${search}%`);
    }
    if (categoria) {
      query = query.eq("categoria", categoria);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .order("categoria", { ascending: true })
      .order("nombre", { ascending: true })
      .range(from, to);

    if (data) {
      setProducts(data);
      setTotal(count || 0);
    }
    setLoading(false);
  };

  const openNew = () => {
    setEditingProduct(null);
    setFormData({
      codigo: "",
      nombre: "",
      descripcion: "",
      unidad: "PIEZA",
      categoria: categorias[0] || "",
      precio_referencia: 0,
      activo: true,
    });
    setShowModal(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      codigo: product.codigo || "",
      nombre: product.nombre || "",
      descripcion: product.descripcion || "",
      unidad: product.unidad || "PIEZA",
      categoria: product.categoria || "",
      precio_referencia: product.precio_referencia || 0,
      activo: product.activo !== false,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      alert("El nombre es requerido");
      return;
    }
    setSaving(true);

    if (editingProduct) {
      // Actualizar
      const { error } = await supabase
        .from("products")
        .update({
          codigo: formData.codigo,
          nombre: formData.nombre.toUpperCase(),
          descripcion: formData.descripcion,
          unidad: formData.unidad,
          categoria: formData.categoria,
          precio_referencia: formData.precio_referencia,
          activo: formData.activo,
        })
        .eq("id", editingProduct.id);

      if (error) {
        alert("Error al actualizar: " + error.message);
      }
    } else {
      // Crear nuevo
      const { error } = await supabase
        .from("products")
        .insert({
          codigo: formData.codigo || `PROD-${Date.now()}`,
          nombre: formData.nombre.toUpperCase(),
          descripcion: formData.descripcion,
          unidad: formData.unidad,
          categoria: formData.categoria,
          precio_referencia: formData.precio_referencia,
          activo: true,
        });

      if (error) {
        alert("Error al crear: " + error.message);
      }
    }

    setSaving(false);
    setShowModal(false);
    loadProducts();
    loadCategorias();
  };

  const toggleActivo = async (product: Product) => {
    await supabase
      .from("products")
      .update({ activo: !product.activo })
      .eq("id", product.id);
    loadProducts();
  };

  const totalPages = Math.ceil(total / pageSize);
  const fmt = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Package className="w-7 h-7 text-cyan-400" />
            Catálogo de Productos
          </h1>
          <p className="text-slate-400 mt-1">{total.toLocaleString()} productos registrados</p>
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium hover:from-cyan-600 hover:to-blue-600 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Nuevo Producto
        </button>
      </div>

      {/* Filtros */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-wrap gap-4">
        <div className="flex-1 min-w-[250px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, código o descripción..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
        <div className="min-w-[200px]">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={categoria}
              onChange={(e) => { setCategoria(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white focus:outline-none focus:border-cyan-500 appearance-none"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Categoría</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Unidad</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Precio Ref.</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Estado</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {products.map((product) => (
                  <tr key={product.id} className={`hover:bg-white/[0.02] ${!product.activo ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3">
                      <span className="text-cyan-400 font-mono text-sm">{product.codigo || "-"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{product.nombre}</p>
                      {product.descripcion && (
                        <p className="text-xs text-slate-400 truncate max-w-xs">{product.descripcion}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-lg bg-white/[0.05] text-xs text-slate-300">
                        {product.categoria || "Sin categoría"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">{product.unidad}</td>
                    <td className="px-4 py-3 text-right text-white">
                      {product.precio_referencia ? fmt(product.precio_referencia) : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleActivo(product)}
                        className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          product.activo 
                            ? "bg-emerald-500/20 text-emerald-400" 
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {product.activo ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openEdit(product)}
                        className="p-2 rounded-lg hover:bg-white/[0.1] text-slate-400 hover:text-cyan-400 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/[0.06] flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Mostrando {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} de {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <span className="text-white px-3">Página {page} de {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-lg border border-white/[0.1]">
            <div className="p-6 border-b border-white/[0.1] flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingProduct ? "Editar Producto" : "Nuevo Producto"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/[0.1] rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Código</label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                    placeholder="AUTO"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Unidad</label>
                  <select
                    value={formData.unidad}
                    onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white"
                  >
                    {unidades.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Categoría</label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white"
                  >
                    <option value="">Seleccionar...</option>
                    {categorias.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Precio Referencia</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.precio_referencia}
                    onChange={(e) => setFormData({ ...formData, precio_referencia: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white"
                  />
                </div>
              </div>
              {editingProduct && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="activo"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="activo" className="text-white">Producto activo</label>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-white/[0.1] flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? "Guardando..." : <><Save className="w-4 h-4" /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
