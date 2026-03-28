"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Package,
  Building2,
  ChevronRight,
  Search,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Truck,
  Plus,
  Minus,
  History,
} from "lucide-react";

interface Obra {
  id: number;
  name: string;
}

interface ItemInventario {
  id: string;
  obra_id: number;
  obra_nombre: string;
  producto_nombre: string;
  unidad: string;
  cantidad_disponible: number;
  cantidad_usada: number;
  ultimo_movimiento: string;
}

interface Entrega {
  id: string;
  folio: string;
  fecha_entrega: string;
  proveedor_nombre: string;
  materiales_recibidos: any[];
  status: string;
}

export default function InventarioObraPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraSeleccionada, setObraSeleccionada] = useState<Obra | null>(null);
  const [inventario, setInventario] = useState<ItemInventario[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [showAjuste, setShowAjuste] = useState<ItemInventario | null>(null);
  const [ajusteCantidad, setAjusteCantidad] = useState(0);
  const [ajusteMotivo, setAjusteMotivo] = useState("");

  useEffect(() => {
    loadObras();
  }, []);

  useEffect(() => {
    if (obraSeleccionada) {
      loadInventario(obraSeleccionada.id);
      loadEntregas(obraSeleccionada.name);
    }
  }, [obraSeleccionada]);

  const loadObras = async () => {
    const { data, error } = await supabase.from("centros_trabajo").select("id, name:nombre").order("nombre");
    if (error) {
      console.error("Error loading obras:", error.message);
      setLoading(false);
      return;
    }
    setObras(data || []);
    setLoading(false);
  };

  const loadInventario = async (obraId: number) => {
    const { data, error } = await supabase
      .from("inventario_obra")
      .select("*")
      .eq("obra_id", obraId)
      .order("producto_nombre");
    if (error) {
      console.error("Error loading inventario:", error.message);
      return;
    }
    setInventario(data || []);
  };

  const loadEntregas = async (obraNombre: string) => {
    const { data, error } = await supabase
      .from("entregas")
      .select("*")
      .eq("obra_nombre", obraNombre)
      .eq("status", "RECIBIDO")
      .order("fecha_entrega", { ascending: false })
      .limit(10);
    if (error) {
      console.error("Error loading entregas:", error.message);
      return;
    }
    setEntregas(data || []);
  };

  const importarDeEntrega = async (entrega: Entrega) => {
    if (!obraSeleccionada || !entrega.materiales_recibidos) return;

    for (const mat of entrega.materiales_recibidos) {
      // Buscar si ya existe en inventario
      const { data: existe, error: errorExiste } = await supabase
        .from("inventario_obra")
        .select("*")
        .eq("obra_id", obraSeleccionada.id)
        .eq("producto_nombre", mat.nombre || mat.product_name)
        .single();

      if (errorExiste) {
        console.error("Error checking existing inventory:", errorExiste.message);
        continue;
      }

      if (existe) {
        // Actualizar cantidad
        const { error: errorUpdate } = await supabase
          .from("inventario_obra")
          .update({
            cantidad_disponible: existe.cantidad_disponible + (mat.cantidad || mat.quantity || 0),
            ultimo_movimiento: new Date().toISOString(),
          })
          .eq("id", existe.id);
        if (errorUpdate) {
          console.error("Error updating inventory item:", errorUpdate.message);
        }
      } else {
        // Crear nuevo registro
        const { error: errorInsert } = await supabase.from("inventario_obra").insert({
          obra_id: obraSeleccionada.id,
          obra_nombre: obraSeleccionada.name,
          producto_nombre: mat.nombre || mat.product_name,
          unidad: mat.unidad || mat.unit || "PZA",
          cantidad_disponible: mat.cantidad || mat.quantity || 0,
          cantidad_usada: 0,
          entrega_id: entrega.id,
        });
        if (errorInsert) {
          console.error("Error inserting new inventory item:", errorInsert.message);
        }
      }
    }

    loadInventario(obraSeleccionada.id);
    alert("Materiales importados al inventario");
  };

  const ajustarInventario = async () => {
    if (!showAjuste || ajusteCantidad === 0) return;

    const nuevaCantidad = showAjuste.cantidad_disponible + ajusteCantidad;
    const nuevaUsada = ajusteCantidad < 0
      ? showAjuste.cantidad_usada + Math.abs(ajusteCantidad)
      : showAjuste.cantidad_usada;

    const { error } = await supabase
      .from("inventario_obra")
      .update({
        cantidad_disponible: Math.max(0, nuevaCantidad),
        cantidad_usada: nuevaUsada,
        ultimo_movimiento: new Date().toISOString(),
      })
      .eq("id", showAjuste.id);

    if (error) {
      console.error("Error updating inventory adjustment:", error.message);
      return;
    }

    setShowAjuste(null);
    setAjusteCantidad(0);
    setAjusteMotivo("");
    if (obraSeleccionada) loadInventario(obraSeleccionada.id);
  };

  const inventarioFiltrado = inventario.filter(item =>
    item.producto_nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalItems = inventario.length;
  const totalDisponible = inventario.reduce((sum, i) => sum + i.cantidad_disponible, 0);
  const itemsBajos = inventario.filter(i => i.cantidad_disponible <= 5).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  // Vista: Seleccionar Obra
  if (!obraSeleccionada) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/obras" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Inventario por Obra</h1>
            <p className="text-slate-400 text-sm">Selecciona una obra para ver su inventario</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {obras.map((obra) => (
            <button
              key={obra.id}
              onClick={() => setObraSeleccionada(obra)}
              className="p-6 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/50 rounded-xl text-left transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl group-hover:bg-emerald-500/30 transition-colors">
                  <Package className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white group-hover:text-emerald-300 transition-colors">
                    {obra.name}
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">Ver inventario</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Vista: Inventario de Obra
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setObraSeleccionada(null)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{obraSeleccionada.name}</h1>
            <p className="text-slate-400 text-sm">Inventario de materiales</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-white">{totalItems}</p>
              <p className="text-sm text-slate-400">Productos</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold text-white">{totalDisponible.toLocaleString()}</p>
              <p className="text-sm text-slate-400">Unidades disponibles</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
            <div>
              <p className="text-2xl font-bold text-white">{itemsBajos}</p>
              <p className="text-sm text-slate-400">Stock bajo (≤5)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventario */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar material..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5 sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Material</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-slate-300">Disponible</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-slate-300">Usado</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-slate-300">Unidad</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-slate-300">Ajustar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {inventarioFiltrado.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{item.producto_nombre}</p>
                      <p className="text-xs text-slate-400">
                        Último mov: {new Date(item.ultimo_movimiento).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${item.cantidad_disponible <= 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {item.cantidad_disponible}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400">{item.cantidad_usada}</td>
                    <td className="px-4 py-3 text-center text-slate-400">{item.unidad}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setShowAjuste(item)}
                        className="p-2 bg-blue-500/20 hover:bg-blue-500/40 rounded-lg transition-colors"
                      >
                        <History className="w-4 h-4 text-blue-400" />
                      </button>
                    </td>
                  </tr>
                ))}
                {inventarioFiltrado.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>No hay materiales en inventario</p>
                      <p className="text-sm">Importa desde las entregas recibidas</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Entregas para importar */}
        <div className="space-y-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-400" />
            Entregas Recientes
          </h2>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {entregas.map((entrega) => (
              <div
                key={entrega.id}
                className="p-4 bg-white/5 rounded-xl border border-white/10"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-white">{entrega.folio}</p>
                    <p className="text-sm text-slate-400">{entrega.proveedor_nombre}</p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(entrega.fecha_entrega).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-slate-300 mb-3">
                  {entrega.materiales_recibidos?.length || 0} materiales
                </p>
                <button
                  onClick={() => importarDeEntrega(entrega)}
                  className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Importar a Inventario
                </button>
              </div>
            ))}

            {entregas.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <Truck className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No hay entregas recientes</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Ajuste */}
      {showAjuste && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Ajustar Inventario</h3>
            <p className="text-slate-300 mb-4">{showAjuste.producto_nombre}</p>
            <p className="text-sm text-slate-400 mb-4">
              Disponible actual: <span className="text-white font-bold">{showAjuste.cantidad_disponible}</span> {showAjuste.unidad}
            </p>

            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => setAjusteCantidad(ajusteCantidad - 1)}
                className="p-3 bg-red-500/20 hover:bg-red-500/40 rounded-lg"
              >
                <Minus className="w-5 h-5 text-red-400" />
              </button>
              <input
                type="number"
                value={ajusteCantidad}
                onChange={(e) => setAjusteCantidad(Number(e.target.value))}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-center text-xl font-bold focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => setAjusteCantidad(ajusteCantidad + 1)}
                className="p-3 bg-emerald-500/20 hover:bg-emerald-500/40 rounded-lg"
              >
                <Plus className="w-5 h-5 text-emerald-400" />
              </button>
            </div>

            <p className="text-center text-sm mb-4">
              Nuevo total: <span className={`font-bold ${showAjuste.cantidad_disponible + ajusteCantidad < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {Math.max(0, showAjuste.cantidad_disponible + ajusteCantidad)}
              </span> {showAjuste.unidad}
            </p>

            <input
              type="text"
              placeholder="Motivo del ajuste (opcional)"
              value={ajusteMotivo}
              onChange={(e) => setAjusteMotivo(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 mb-4"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowAjuste(null); setAjusteCantidad(0); }}
                className="px-4 py-2 text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={ajustarInventario}
                disabled={ajusteCantidad === 0}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-lg text-white font-medium"
              >
                Guardar Ajuste
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
