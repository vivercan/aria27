"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Trash2, Check, Loader2 } from "lucide-react";
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
  comments?: string;
};

export default function RequisitionsPage() {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [selectedCostCenterId, setSelectedCostCenterId] = useState<number | null>(null);
  const [generalComments, setGeneralComments] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 🔹 Cargar centros de costo al entrar a la pantalla
  useEffect(() => {
    const loadCenters = async () => {
      setLoadingCenters(true);
      setErrorMsg(null);
      try {
        const { data, error } = await supabase
          .from("cost_centers")
          .select("id, code, name")
          .order("name", { ascending: true });

        if (error) {
          console.error("Error cargando cost_centers:", error);
          setErrorMsg("No se pudieron cargar los centros de costo.");
          return;
        }

        setCostCenters(data || []);
      } finally {
        setLoadingCenters(false);
      }
    };

    loadCenters();
  }, []);

  // 🔹 Buscar productos en Supabase cuando escribes en la lupa
  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    setErrorMsg(null);
    setMessage(null);

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
        .or(
          `name.ilike.%${value}%,description.ilike.%${value}%,category.ilike.%${value}%`
        )
        .limit(25);

      if (error) {
        console.error("Error buscando productos:", error);
        setErrorMsg("No se pudo buscar en el catálogo.");
        setSearchResults([]);
        return;
      }

      setSearchResults(data || []);
    } finally {
      setSearching(false);
    }
  };

  // 🔹 Agregar producto a la lista de materiales
  const addMaterial = (product: Product) => {
    if (!product.id) return;

    const safeName: string = product.name ?? "SIN NOMBRE";

    setMaterials((prev) => {
      const exists = prev.find((m) => m.id === product.id);
      if (exists) {
        // Si ya existe, solo incrementa la cantidad
        return prev.map((m) =>
          m.id === product.id ? { ...m, qty: m.qty + 1 } : m
        );
      }

      const nuevo: MaterialRow = {
        id: product.id,
        name: safeName,
        unit: product.unit || "",
        qty: 1,
      };

      return [...prev, nuevo];
    });

    setSearchTerm("");
    setSearchResults([]);
  };

  // 🔹 Eliminar material de la lista
  const removeMaterial = (id: number) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  // 🔹 Actualizar cantidad o comentarios de un renglón
  const updateMaterial = (
    id: number,
    field: "qty" | "comments",
    value: number | string
  ) => {
    setMaterials((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              [field]: field === "qty" ? Number(value) || 0 : value,
            }
          : m
      )
    );
  };

  // 🔹 Enviar requisición a la API /api/requisicion
  const handleSubmit = async () => {
    setErrorMsg(null);
    setMessage(null);

    if (!selectedCostCenterId) {
      setErrorMsg("Selecciona un centro de costo.");
      return;
    }

    if (materials.length === 0) {
      setErrorMsg("Agrega al menos un material a la lista.");
      return;
    }

    const selectedCenter = costCenters.find(
      (c) => c.id === selectedCostCenterId
    );

    if (!selectedCenter) {
      setErrorMsg("Centro de costo inválido.");
      return;
    }

    setSending(true);
    try {
      const body = {
        usuario: {
          nombre: "Usuario ARIA27",
          email: "recursos.humanos@gcuavante.com",
        },
        obra: `${selectedCenter.code} - ${selectedCenter.name}`,
        comentarios: generalComments,
        materiales: materials.map((m) => ({
          name: m.name,
          unit: m.unit,
          qty: m.qty,
          comments: m.comments,
        })),
      };

      const res = await fetch("/api/requisicion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        console.error("Error al enviar requisición:", json);
        setErrorMsg(
          json?.error || "No se pudo enviar la requisición. Intenta de nuevo."
        );
        return;
      }

      setMessage(`Requisición enviada. Folio: ${json.folio}`);
      setMaterials([]);
      setGeneralComments("");
    } catch (err) {
      console.error("Error de red al enviar requisición:", err);
      setErrorMsg("Error de red al enviar la requisición.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Mensajes arriba */}
      {errorMsg && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {errorMsg}
        </div>
      )}
      {message && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* 🔵 Columna izquierda: Configuración */}
        <section className="rounded-2xl bg-white/5 p-5 shadow-lg backdrop-blur">
          <h2 className="mb-4 text-lg font-semibold">1. CONFIGURACIÓN</h2>

          <div className="space-y-4">
            {/* Centro de costo */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">
                Obra / Centro de Costos
              </label>
              <select
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-sky-400"
                value={selectedCostCenterId ?? ""}
                onChange={(e) =>
                  setSelectedCostCenterId(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                disabled={loadingCenters}
              >
                <option value="">
                  {loadingCenters
                    ? "Cargando centros de costo..."
                    : "Seleccione una obra..."}
                </option>
                {costCenters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Comentarios generales */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">
                Instrucciones generales
              </label>
              <textarea
                className="h-32 w-full resize-none rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-sky-400"
                placeholder="Instrucciones de entrega, referencias de obra, horarios, etc."
                value={generalComments}
                onChange={(e) => setGeneralComments(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* 🔵 Columna derecha: Lista de materiales */}
        <section className="flex flex-col rounded-2xl bg-white/5 p-5 shadow-lg backdrop-blur">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">2. LISTA DE MATERIALES</h2>
              <p className="text-xs text-white/60">
                Busca en el catálogo y agrega partidas a la requisición.
              </p>
            </div>
          </div>

          {/* Buscador */}
          <div className="relative mb-4">
            <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/30 px-3 py-2">
              <Search className="h-4 w-4 opacity-70" />
              <input
                className="w-full bg-transparent text-sm outline-none"
                placeholder="Escribe al menos 2 letras para buscar en el catálogo..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {searching && (
                <Loader2 className="h-4 w-4 animate-spin opacity-70" />
              )}
            </div>

            {/* Resultados de búsqueda */}
            {searchResults.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-white/20 bg-slate-950/95 text-xs shadow-xl">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left hover:bg-white/5"
                    onClick={() => addMaterial(p)}
                  >
                    <div>
                      <div className="font-medium">
                        {p.name ?? "SIN NOMBRE"}
                      </div>
                      <div className="text-[11px] text-white/60">
                        {p.unit && <>Unidad: {p.unit} · </>}
                        {p.category || ""}
                      </div>
                      {p.description && (
                        <div className="mt-0.5 text-[11px] text-white/50 line-clamp-2">
                          {p.description}
                        </div>
                      )}
                    </div>
                    <Plus className="mt-1 h-4 w-4 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tabla de materiales */}
          <div className="flex-1 overflow-hidden rounded-xl border border-white/10 bg-black/20">
            <div className="grid grid-cols-[minmax(0,2.5fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_40px] border-b border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-white/70">
              <div>Descripción</div>
              <div>Unidad</div>
              <div>Cantidad</div>
              <div></div>
            </div>

            <div className="max-h-72 overflow-auto">
              {materials.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-white/50">
                  Tu lista está vacía. Busca arriba un material del catálogo y
                  agrégalo.
                </div>
              ) : (
                materials.map((m) => (
                  <div
                    key={m.id}
                    className="grid grid-cols-[minmax(0,2.5fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_40px] items-center gap-2 border-b border-white/5 px-3 py-2 text-xs"
                  >
                    <div className="truncate">{m.name}</div>
                    <div>
                      <input
                        className="w-full rounded-lg bg-black/40 px-2 py-1 text-[11px] outline-none"
                        value={m.unit}
                        onChange={(e) =>
                          updateMaterial(m.id, "comments", e.target.value)
                        }
                        placeholder={m.unit || "Unidad"}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        min={0}
                        className="w-full rounded-lg bg-black/40 px-2 py-1 text-[11px] outline-none"
                        value={m.qty}
                        onChange={(e) =>
                          updateMaterial(m.id, "qty", Number(e.target.value))
                        }
                      />
                    </div>
                    <button
                      type="button"
                      className="flex items-center justify-center rounded-full bg-red-500/70 p-1 text-white hover:bg-red-500"
                      onClick={() => removeMaterial(m.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Botón Finalizar */}
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-900 shadow-md transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
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
    </div>
  );
}
