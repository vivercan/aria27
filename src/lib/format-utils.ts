/**
 * Funciones puras de formateo compartidas entre módulos.
 */

/** Formato moneda MXN: $1,234.56 */
export function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(value);
}

/** Formato moneda MXN corto (sin decimales): $1,235 */
export function formatMoneyShort(value: number): string {
  return `$${(value || 0).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/** Formato moneda MXN con 2 decimales sin Intl: $1,234.56 */
export function fmt(value: number): string {
  return `$${(value || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Formato bytes legible: 1.5 MB, 320 KB, etc. Acepta null/undefined → "—" */
export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}
