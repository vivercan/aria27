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
    info(msg: string, data?: Record<string, unknown>) {
      emit({ ts: new Date().toISOString(), level: "info", route, msg, data });
    },
    warn(msg: string, data?: Record<string, unknown>) {
      emit({ ts: new Date().toISOString(), level: "warn", route, msg, data });
    },
    error(msg: string, data?: Record<string, unknown>) {
      emit({ ts: new Date().toISOString(), level: "error", route, msg, data });
    },
  };
}
