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

function normalize(data: unknown): Record<string, unknown> | undefined {
  if (data === undefined || data === null) return undefined;
  if (typeof data === "object" && !Array.isArray(data)) return data as Record<string, unknown>;
  if (data instanceof Error) return { error: data.message, stack: data.stack };
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
