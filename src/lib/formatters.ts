/**
 * src/lib/formatters.ts — Formatos centralizados ARIA27 (PL33 17-Abr-2026)
 *
 * Reemplaza las 14 copias locales de `const fmt = (n) => Intl.NumberFormat(...)`
 * repartidas por ceo, finanzas/sua, finanzas/panel, finanzas/caja, reportes/*, etc.
 *
 * Locale canónico: es-MX (México). Moneda canónica: MXN.
 *
 * Uso:
 *   import { fmtMoney, fmtDate, fmtDateTime, fmtNumber, fmtPct } from "@/lib/formatters";
 *   fmtMoney(12345.67)        // "$12,345.67"
 *   fmtDate("2026-04-17")     // "17 abr 2026"
 *   fmtDateTime(new Date())   // "17 abr 2026, 23:42"
 *   fmtNumber(1500)           // "1,500"
 *   fmtPct(0.153)             // "15.3%"
 */

const LOCALE = "es-MX";
const CURRENCY = "MXN";

const MONEY_FMT = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const MONEY_FMT_NO_DECIMALS = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const NUMBER_FMT = new Intl.NumberFormat(LOCALE);
const NUMBER_FMT_2 = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DATE_FMT = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const DATE_LONG_FMT = new Intl.DateTimeFormat(LOCALE, {
  weekday: "short",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const DATETIME_FMT = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const TIME_FMT = new Intl.DateTimeFormat(LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function asDate(input: string | number | Date | null | undefined): Date | null {
  if (input === null || input === undefined || input === "") return null;
  // Fechas ISO YYYY-MM-DD sin hora se interpretan a 12:00 local para evitar drift por timezone.
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return new Date(input + "T12:00:00");
  }
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

// ────────────── MONEY ──────────────
export function fmtMoney(n: number | null | undefined, opts?: { noDecimals?: boolean }): string {
  const v = Number(n ?? 0);
  if (!isFinite(v)) return "$0.00";
  return opts?.noDecimals ? MONEY_FMT_NO_DECIMALS.format(v) : MONEY_FMT.format(v);
}

// Legacy alias — mismo que fmtMoney, documenta intención.
export const fmt = fmtMoney;

// ────────────── NUMBER ──────────────
export function fmtNumber(n: number | null | undefined, decimals = 0): string {
  const v = Number(n ?? 0);
  if (!isFinite(v)) return "0";
  return decimals === 2 ? NUMBER_FMT_2.format(v) : NUMBER_FMT.format(v);
}

export function fmtPct(ratio: number | null | undefined, decimals = 1): string {
  const v = Number(ratio ?? 0);
  if (!isFinite(v)) return "0%";
  return `${(v * 100).toFixed(decimals)}%`;
}

// ────────────── DATE ──────────────
export function fmtDate(input: string | number | Date | null | undefined, fallback = "—"): string {
  const d = asDate(input);
  return d ? DATE_FMT.format(d).replace(/\./g, "") : fallback;
}

export function fmtDateLong(input: string | number | Date | null | undefined, fallback = "—"): string {
  const d = asDate(input);
  return d ? DATE_LONG_FMT.format(d) : fallback;
}

export function fmtDateTime(input: string | number | Date | null | undefined, fallback = "—"): string {
  const d = asDate(input);
  return d ? DATETIME_FMT.format(d).replace(/\./g, "") : fallback;
}

export function fmtTime(input: string | number | Date | null | undefined, fallback = "—"): string {
  const d = asDate(input);
  return d ? TIME_FMT.format(d) : fallback;
}

// ────────────── IDENTITY HELPERS ──────────────
export function fmtFolio(folio: string | null | undefined, fallback = "—"): string {
  return folio && folio.trim() ? folio : fallback;
}

export const formatters = {
  money: fmtMoney,
  number: fmtNumber,
  pct: fmtPct,
  date: fmtDate,
  dateLong: fmtDateLong,
  dateTime: fmtDateTime,
  time: fmtTime,
  folio: fmtFolio,
} as const;

export default formatters;
