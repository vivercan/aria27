/**
 * src/lib/list-filter.ts — FASE 0 ARIA27 Campo (10-Oct-2026)
 *
 * Logica pura (sin React) para buscar y filtrar listas en cliente.
 * La usa useListFilter() y se prueba sola en tests/list-filter.test.ts.
 *
 * - normalize(): minusculas, sin acentos, espacios colapsados. Asi "cóbano"
 *   encuentra "CÓBANO" y "Villas  de la Universidad" == "Villas de la Universidad".
 * - matchesSearch(): TODAS las palabras del query deben aparecer en algun campo.
 *   "cobano cimbra" -> requis del Cobano cuyo proveedor/concepto diga cimbra.
 */

export function normalize(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesSearch(fields: unknown[], query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const hay = fields.map(normalize).join(" | ");
  return q.split(" ").every((w) => hay.includes(w));
}

export interface ApplyListFilterArgs<T> {
  items: T[];
  search: string;
  searchFields: (item: T) => unknown[];
  chip: string;                                   // "" = todas
  chipOf: (item: T) => string | null;             // clave de chip del item
  chipPredicates?: Record<string, (item: T) => boolean>; // chips calculados (ej. "mis_pendientes")
  selects: Record<string, string>;                // {obra: "DIF ..."} ; "" = sin filtro
  selectOf: Record<string, (item: T) => string | null>;
}

export function applyListFilter<T>(a: ApplyListFilterArgs<T>): T[] {
  return a.items.filter((it) => {
    if (a.chip) {
      const pred = a.chipPredicates?.[a.chip];
      if (pred) { if (!pred(it)) return false; }
      else if (a.chipOf(it) !== a.chip) return false;
    }
    for (const k of Object.keys(a.selects)) {
      const v = a.selects[k];
      if (v && normalize(a.selectOf[k]?.(it)) !== normalize(v)) return false;
    }
    return matchesSearch(a.searchFields(it), a.search);
  });
}

/** Cuenta items por chip (incluye calculados) sobre la lista SIN filtro de chip, para los badges. */
export function countChips<T>(
  items: T[],
  chipKeys: string[],
  chipOf: (item: T) => string | null,
  chipPredicates?: Record<string, (item: T) => boolean>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of chipKeys) {
    const pred = chipPredicates?.[k];
    out[k] = items.filter((it) => (pred ? pred(it) : chipOf(it) === k)).length;
  }
  return out;
}

/** Valores unicos normalizados (por display canonico) para poblar un select. */
export function uniqueOptions<T>(items: T[], pick: (item: T) => string | null): string[] {
  const seen = new Map<string, string>();
  for (const it of items) {
    const raw = pick(it);
    if (!raw) continue;
    const key = normalize(raw);
    if (!seen.has(key)) seen.set(key, String(raw).replace(/\s+/g, " ").trim());
  }
  return Array.from(seen.values()).sort((x, y) => x.localeCompare(y, "es"));
}
