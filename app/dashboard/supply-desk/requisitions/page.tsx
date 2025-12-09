"use client";

import { useEffect, useState, useRef } from "react";
import { Search, Plus, Trash2, Check, Loader2, ShoppingCart } from "lucide-react";
import { supabase } from "@/lib/supabase";

type CostCenter = {
  id: number;
  code: string;
  name: string;
};

type Product = {
  id: number;
  name: string | null;
  unit: string | null;
  category: string | null;
  description: string | null;
};

type MaterialRow = {
  id: number;
  name: string;
  unit: string;
  qty: number;
  observations: string;
};

const STATIC_COST_CENTERS: CostCenter[] = [
  { id: 1, code: "OFMAT", name: "Oficina Matriz" },
  { id: 2, code: "PINAR", name: "Pinar del Lago" },
  { id: 3, code: "JESUS-F", name: "Jesús Flores" },
  { id: 4, code: "PARQUE-JT", name: "Parque Jesús Terán" },
  { id: 5, code: "LAB-SEMIC", name: "Laboratorio Semiconductores" },
];

export default function RequisitionsPage() {
  const [costCenters, setCostCenters] = useState<CostCenter[]>(STATIC_COST_CENTERS);
  const [selectedCostCenterId, setSelectedCostCenterId] = useState<number | null>(null);
  const [generalComments, setGeneralComments] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  
  const qtyInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  // Cargar centros de costo
  useEffect(() => {
    const loadCenters = async () => {
      try {
        const { data, error } = await supabase
          .from("cost_centers")
          .select("id, code, name")
          .order("name", { ascending: true });
        if (!error && data && data.length > 0) {
          setCostCenters(data as CostCenter[]);
        }
      } catch (err) {
        console.error("Error cargando cost_centers:", err);
      }
    };
    loadCenters();
  }, []);

  // Buscar productos
  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    const value = term.trim();
    if (value.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, unit, category, description")
        .or(`name.ilike.%${value}%,description.ilike.%${value}%,category.ilike.%${value}%`)
        .limit(15);
      if (!error) {
        setSearchResults((data || []) as Product[]);
      }
    } catch (err) {
      console.error("Error buscando productos:", err);
    } finally {
      setSearching(false);
    }
  };

  // Agregar producto al carrito
  const addMaterial = (product: Product) => {
    if (!product.id || !product.name) return;
    
    // Feedback visual: marcar como añadido
    setAddedIds(prev => new Set(prev).add(product.id));
    setTimeout(() => {
      setAddedIds(prev => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 2000);

    setMaterials((prev) => {
      const exists = prev.find((m) => m.id === product.id);
      if (exists) {
        return prev.map((m) =>
          m.id === product.id ? { ...m, qty: m.qty + 1 } : m
        );
      }
      const newRow: MaterialRow = {
        id: product.id,
        name: product.name ?? "",
        unit: product.unit || "",
        qty: 1,
        observations: "",
      };
      
      // Focus en el input de cantidad del nuevo ítem
      setTimeout(() => {
        const input = qtyInputRefs.current.get(product.id);
        if (input) input.focus();
      }, 100);
      
      return [...prev, newRow];
    });
  };

  // Eliminar material
  const removeMaterial = (id: number) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  // Actualizar cantidad
  const updateQty = (id: number, value: number) => {
    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, qty: Math.max(0, value) } : m))
    );
  };

  // Actualizar observaciones
  const updateObservations = (id: number, value: string) => {
    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, observations: value } : m))
    );
  };

  // Enviar requisición
  const handleSubmit = async () => {
    setErrorMsg(null);
    setMessage(null);

    if (!selectedCostCenterId) {
      setErrorMsg("Selecciona un centro de costo.");
      return;
    }
    if (materials.length === 0) {
      setErrorMsg("Agrega al menos un material a la requisición.");
      return;
    }

    const selectedCenter = costCenters.find((c) => c.id === selectedCostCenterId);
    if (!selectedCenter) {
      setErrorMsg("Centro de costo inválido.");
      return;
    }

    setSending(true);
    try {
      const body = {
        usuario: { nombre: "Usuario ARIA27", email: "recursos.humanos@gcuavante.com" },
        obra: `${selectedCenter.code} - ${selectedCenter.name}`,
        comentarios: generalComments,
        materiales: materials.map((m) => ({
          name: m.name,
          unit: m.unit,
          qty: m.qty,
          comments: m.observations,
        })),
      };

      const res = await fetch("/api/requisicion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMsg(json?.error || "No se pudo enviar la requisición.");
        return;
      }

      setMessage(`✅ Requisición generada. Folio: ${json.folio}`);
      setMaterials([]);
      setGeneralComments("");
    } catch (err) {
      setErrorMsg("Error de red al enviar la requisición.");
    } finally {
      setSending(false);
    }
  };

  const isCartEmpty = materials.length === 0;

  return (
    <div className="flex flex-col gap-4 p-6 h-full">
      {/* Mensajes */}
      {errorMsg && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {errorMsg}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          {message}
        </div>
      )}

      {/* Fila superior: Configuración + Catálogo */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Panel 1: CONFIGURACIÓN */}
        <section className="rounded-2xl bg-white/5 p-5 shadow-lg backdrop-blur">
          <h2 className="mb-4 text-lg font-semibold">1. CONFIGURACIÓN</h2>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">Obra / Centro de Costos</label>
              <select
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-sky-400"
                value={selectedCostCenterId ?? ""}
                onChange={(e) => setSelectedCostCenterId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Seleccione una obra...</option>
                {costCenters.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">Instrucciones generales</label>
              <textarea
                className="h-24 w-full resize-none rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-sky-400"
                placeholder="Instrucciones de entrega, referencias de obra, horarios, etc."
                value={generalComments}
                onChange={(e) => setGeneralComments(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Panel 2: BUSCADOR + CATÁLOGO */}
        <section className="rounded-2xl bg-white/5 p-5 shadow-lg backdrop-blur">
          <h2 className="mb-4 text-lg font-semibold">2. BUSCAR EN CATÁLOGO</h2>
          
          {/* Buscador */}
          <div className="relative mb-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/30 px-3 py-2">
              <Search className="h-4 w-4 opacity-70" />
              <input
                className="w-full bg-transparent text-sm outline-none"
                placeholder="Escribe al menos 2 letras para buscar..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {searching && <Loader2 className="h-4 w-4 animate-spin opacity-70" />}
            </div>
          </div>

          {/* Resultados del catálogo */}
          <div className="text-xs text-white/50 mb-2">Resultados del catálogo</div>
          <div className="max-h-48 overflow-auto rounded-xl border border-white/10 bg-black/20">
            <div className="grid grid-cols-[1fr_100px_60px] gap-2 border-b border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-white/70">
              <div>Descripción</div>
              <div>Unidad</div>
              <div className="text-center">Agregar</div>
            </div>
            <div className="divide-y divide-white/5">
              {searchResults.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-white/40">
                  {searchTerm.length < 2 ? "Escribe para buscar artículos..." : "Sin resultados"}
                </div>
              ) : (
                searchResults.map((p) => {
                  const isAdded = addedIds.has(p.id);
                  const alreadyInCart = materials.some(m => m.id === p.id);
                  return (
                    <div key={p.id} className="grid grid-cols-[1fr_100px_60px] gap-2 items-center px-3 py-2 text-xs hover:bg-white/5">
                      <div className="truncate">{p.name || "Sin nombre"}</div>
                      <div className="text-white/60 truncate">{p.unit || "-"}</div>
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => addMaterial(p)}
                          disabled={isAdded}
                          className={`flex items-center justify-center rounded-full p-1.5 transition ${
                            isAdded 
                              ? "bg-gray-500 cursor-not-allowed" 
                              : alreadyInCart
                                ? "bg-blue-500 hover:bg-blue-400"
                                : "bg-emerald-500 hover:bg-emerald-400"
                          }`}
                          title={isAdded ? "Añadido" : alreadyInCart ? "Agregar más" : "Agregar"}
                        >
                          {isAdded ? (
                            <Check className="h-3 w-3 text-white" />
                          ) : (
                            <Plus className="h-3 w-3 text-white" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Panel 3: PARTIDAS DE LA REQUISICIÓN (Carrito) */}
      <section className="flex-1 rounded-2xl bg-white/5 p-5 shadow-lg backdrop-blur flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold">3. PARTIDAS DE LA REQUISICIÓN</h2>
          </div>
          <span className="text-xs text-white/50">
            {materials.length} {materials.length === 1 ? "partida" : "partidas"} añadidas
          </span>
        </div>

        {/* Tabla de partidas */}
        <div className="flex-1 overflow-auto rounded-xl border border-white/10 bg-black/20">
          <div className="grid grid-cols-[2fr_100px_80px_1fr_50px] gap-2 border-b border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-white/70 sticky top-0">
            <div>Descripción</div>
            <div>Unidad</div>
            <div>Cantidad</div>
            <div>Observaciones</div>
            <div></div>
          </div>
          <div className="divide-y divide-white/5">
            {isCartEmpty ? (
              <div className="px-3 py-8 text-center text-sm text-white/40">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Tu requisición está vacía.<br />
                <span className="text-xs">Busca materiales arriba y agrégalos con el botón +</span>
              </div>
            ) : (
              materials.map((m) => (
                <div key={m.id} className="grid grid-cols-[2fr_100px_80px_1fr_50px] gap-2 items-center px-3 py-2 text-xs">
                  <div className="truncate font-medium">{m.name}</div>
                  <div className="text-white/60">{m.unit}</div>
                  <div>
                    <input
                      ref={(el) => { if (el) qtyInputRefs.current.set(m.id, el); }}
                      type="number"
                      min={1}
                      className="w-full rounded-lg bg-black/40 px-2 py-1 text-center outline-none focus:ring-1 focus:ring-sky-400"
                      value={m.qty}
                      onChange={(e) => updateQty(m.id, Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      className="w-full rounded-lg bg-black/40 px-2 py-1 outline-none focus:ring-1 focus:ring-sky-400"
                      placeholder="Opcional..."
                      value={m.observations}
                      onChange={(e) => updateObservations(m.id, e.target.value)}
                    />
                  </div>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      className="flex items-center justify-center rounded-full bg-red-500/70 p-1.5 text-white hover:bg-red-500"
                      onClick={() => removeMaterial(m.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer con botón */}
        <div className="mt-4 flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={sending || isCartEmpty}
            className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold shadow-lg transition ${
              isCartEmpty
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-emerald-500 text-slate-900 hover:bg-emerald-400"
            }`}
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Generar Requisición
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
