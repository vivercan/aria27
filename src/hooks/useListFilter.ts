"use client";
/**
 * src/hooks/useListFilter.ts — FASE 0 ARIA27 Campo
 * Estado de busqueda/chips/selects con persistencia en localStorage por pantalla.
 * La logica de filtrado vive en src/lib/list-filter.ts (pura, testeable).
 */
import { useEffect, useMemo, useState } from "react";
import { applyListFilter, countChips, uniqueOptions } from "@/lib/list-filter";

export interface ChipDef { key: string; label: string }

export interface UseListFilterOpts<T> {
  items: T[];
  storageKey: string;
  searchFields: (item: T) => unknown[];
  chips: ChipDef[];                                  // el primero es "todas" con key ""
  chipOf: (item: T) => string | null;
  chipPredicates?: Record<string, (item: T) => boolean>;
  selects?: Record<string, { label: string; pick: (item: T) => string | null }>;
}

interface Persisted { search: string; chip: string; selects: Record<string, string> }

function load(key: string): Persisted | null {
  if (typeof window === "undefined") return null;
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as Persisted) : null; } catch { return null; }
}

export function useListFilter<T>(o: UseListFilterOpts<T>) {
  const initial = load(o.storageKey);
  const [search, setSearch] = useState<string>(initial?.search ?? "");
  const [chip, setChip] = useState<string>(initial?.chip ?? "");
  const [selects, setSelects] = useState<Record<string, string>>(initial?.selects ?? {});

  useEffect(() => {
    try { localStorage.setItem(o.storageKey, JSON.stringify({ search, chip, selects })); } catch { /* storage lleno o bloqueado: no pasa nada */ }
  }, [search, chip, selects, o.storageKey]);

  const selectOf = useMemo(() => {
    const m: Record<string, (item: T) => string | null> = {};
    for (const k of Object.keys(o.selects || {})) m[k] = o.selects![k].pick;
    return m;
  }, [o.selects]);

  const filtered = useMemo(
    () => applyListFilter({ items: o.items, search, searchFields: o.searchFields, chip, chipOf: o.chipOf, chipPredicates: o.chipPredicates, selects, selectOf }),
    [o.items, search, chip, selects, o.searchFields, o.chipOf, o.chipPredicates, selectOf],
  );

  // Conteos de chips se calculan sobre items ya filtrados por busqueda+selects (no por chip),
  // para que los badges digan "cuantas hay de cada estado con lo que escribiste".
  const baseForCounts = useMemo(
    () => applyListFilter({ items: o.items, search, searchFields: o.searchFields, chip: "", chipOf: o.chipOf, selects, selectOf }),
    [o.items, search, selects, o.searchFields, o.chipOf, selectOf],
  );
  const counts = useMemo(
    () => ({ ...countChips(baseForCounts, o.chips.map((c) => c.key), o.chipOf, o.chipPredicates), "": baseForCounts.length }), // "" = todas
    [baseForCounts, o.chips, o.chipOf, o.chipPredicates],
  );

  const selectOptions = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const k of Object.keys(o.selects || {})) m[k] = uniqueOptions(o.items, o.selects![k].pick);
    return m;
  }, [o.items, o.selects]);

  const setSelect = (k: string, v: string) => setSelects((prev) => ({ ...prev, [k]: v }));
  const clear = () => { setSearch(""); setChip(""); setSelects({}); };
  const isActive = !!search || !!chip || Object.values(selects).some(Boolean);

  return { search, setSearch, chip, setChip, selects, setSelect, selectOptions, filtered, counts, clear, isActive };
}
