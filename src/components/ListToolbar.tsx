"use client";
/**
 * src/components/ListToolbar.tsx — FASE 0 ARIA27 Campo (10-Oct-2026)
 *
 * Barra reutilizable para cualquier listado: busqueda en vivo (sin boton),
 * chips de estado con conteo, selects de filtro, contador "Mostrando X de Y"
 * y boton Limpiar. Se usa junto con useListFilter().
 *
 * Movil: busqueda ancho completo, chips deslizables horizontal.
 * Atajo: tecla "/" enfoca la busqueda (si no estas escribiendo en otro campo).
 *
 * Reutilizar en: Autorizar, Tramite, Pagos, Entregas, Combustible, Personal, Checadas.
 */
import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import type { ChipDef } from "@/hooks/useListFilter";

interface SelectDef { key: string; label: string; options: string[]; value: string }

interface Props {
  search: string;
  onSearch: (v: string) => void;
  placeholder?: string;
  chips: ChipDef[];
  chip: string;
  onChip: (k: string) => void;
  counts: Record<string, number>;
  selects?: SelectDef[];
  onSelect?: (k: string, v: string) => void;
  shown: number;
  total: number;
  isActive: boolean;
  onClear: () => void;
}

export default function ListToolbar(p: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const t = e.target as HTMLElement | null;
      const tag = (t?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || t?.isContentEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7f93b0] pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            value={p.search}
            onChange={(e) => p.onSearch(e.target.value)}
            placeholder={p.placeholder || "Buscar..."}
            aria-label="Buscar en la lista"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.10] text-white text-sm placeholder:text-[#4a6080] outline-none focus:border-aria-accent transition"
          />
          {p.search && (
            <button
              type="button"
              onClick={() => p.onSearch("")}
              aria-label="Borrar busqueda"
              className="aria-no-min-tap absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-[#7f93b0] hover:text-white hover:bg-white/[0.08]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {p.selects?.map((s) => (
          <select
            key={s.key}
            value={s.value}
            onChange={(e) => p.onSelect?.(s.key, e.target.value)}
            aria-label={s.label}
            className="md:w-56 px-3 py-2.5 rounded-xl text-sm"
          >
            <option value="">{s.label}: todas</option>
            {s.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-2">
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 md:flex-1" style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
          {p.chips.map((c) => {
            const active = p.chip === c.key;
            const n = p.counts[c.key] ?? 0;
            return (
              <button
                key={c.key || "__all"}
                type="button"
                onClick={() => p.onChip(active && c.key ? "" : c.key)}
                aria-pressed={active}
                className={`btn-flat aria-no-min-tap shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  active
                    ? "bg-aria-accent/20 border-aria-accent text-white"
                    : "bg-white/[0.03] border-white/[0.10] text-[#c9d8ed] hover:bg-white/[0.07]"
                }`}
              >
                {c.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${active ? "bg-aria-accent/40 text-white" : "bg-white/[0.08] text-[#7f93b0]"}`}>{n}</span>
              </button>
            );
          })}
        </div>
        <div className="shrink-0 flex items-center justify-end gap-2 text-xs text-[#7f93b0]">
          <span>Mostrando <span className="text-white font-semibold">{p.shown}</span> de {p.total}</span>
          {p.isActive && (
            <button type="button" onClick={p.onClear} className="btn-flat aria-no-min-tap underline hover:text-white">Limpiar</button>
          )}
        </div>
      </div>
    </div>
  );
}
