/**
 * Structured logger for ARIA27 API routes.
 *
 * Outputs JSON lines in Vercel-friendly format with:
 * - ISO timestamp
 * - Log level (info | warn | error)
 * - Route context tag (e.g. "[EXPORT]", "[APPROVE-PURCHASE]")
 * - Structured data payload
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   const log = logger("EXPORT");
 *   log.info("Generando Excel", { tipo: "gastos", rows: 1500 });
 *   log.error("Falló query", { table: "gastos", error: err.message });
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  ts: string;
  level: LogLevel;
  route: string;
  msg: string;
  data?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  PII MASKING — PL09 17-Abr-2026                                     */
/*  Enmascara valores de claves conocidas antes de escribir al log.    */
/*  Cubre: emails, teléfonos, RFC/CURP, cuentas bancarias, secretos.   */
/* ------------------------------------------------------------------ */

// Claves cuyo valor debe enmascararse (match case-insensitive contra el nombre exacto o sufijo).
const PII_KEY_PATTERNS: RegExp[] = [
  /(^|_)email$/i,
  /(^|_)phone$/i,
  /(^|_)telefono$/i,
  /(^|_)whatsapp$/i,
  /(^|_)rfc$/i,
  /(^|_)curp$/i,
  /(^|_)clabe(_interbancaria)?$/i,
  /(^|_)numero_cuenta$/i,
  /(^|_)cuenta$/i,
  /(^|_)tarjeta$/i,
  /(^|_)password$/i,
  /(^|_)secret$/i,
  /(^|_)token$/i,
  /(^|_)api_key$/i,
];

export function maskEmail(v: string): string {
  const i = v.indexOf("@");
  if (i <= 0) return "***";
  const local = v.slice(0, i);
  const domain = v.slice(i + 1);
  const head = local.slice(0, 1);
  const tail = local.length > 2 ? local.slice(-1) : "";
  return `${head}***${tail}@${domain}`;
}

export function maskPhone(v: string): string {
  const digits = v.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `${digits.slice(0, 2)}****${digits.slice(-2)}`;
}

export function maskGeneric(v: string): string {
  if (!v) return "";
  if (v.length <= 4) return "***";
  return `${v.slice(0, 2)}***${v.slice(-2)}`;
}

function shouldMask(key: string): boolean {
  return PII_KEY_PATTERNS.some((re) => re.test(key));
}

function maskValue(key: string, v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v !== "string") return v;
  const lk = key.toLowerCase();
  if (lk.endsWith("email")) return maskEmail(v);
  if (lk.endsWith("phone") || lk.endsWith("telefono") || lk.endsWith("whatsapp")) return maskPhone(v);
  return maskGeneric(v);
}

function sanitize(obj: unknown, depth = 0): unknown {
  if (depth > 4) return "[depth]";
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map((x) => sanitize(x, depth + 1));
  if (typeof obj !== "object") return obj;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (shouldMask(k)) {
      out[k] = maskValue(k, v);
    } else {
      out[k] = sanitize(v, depth + 1);
    }
  }
  return out;
}

function normalize(data: unknown): Record<string, unknown> | undefined {
  if (data === undefined || data === null) return undefined;
  if (data instanceof Error) return { error: data.message, stack: data.stack };
  if (typeof data === "object" && !Array.isArray(data)) {
    return sanitize(data) as Record<string, unknown>;
  }
  return { value: String(data) };
}

function emit(entry: LogEntry) {
  const line = JSON.stringify(entry);
  switch (entry.level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    default:
      console.log(line);
  }
}

export function logger(route: string) {
  return {
    info(msg: string, data?: unknown) {
      emit({ ts: new Date().toISOString(), level: "info", route, msg, data: normalize(data) });
    },
    warn(msg: string, data?: unknown) {
      emit({ ts: new Date().toISOString(), level: "warn", route, msg, data: normalize(data) });
    },
    error(msg: string, data?: unknown) {
      emit({ ts: new Date().toISOString(), level: "error", route, msg, data: normalize(data) });
    },
  };
}
