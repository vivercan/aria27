/**
 * claude-retry — wrapper genérico para llamadas a Anthropic API con retry
 * backoff exponencial. Recupera de errores transitorios (5xx, timeout,
 * rate limit temporal).
 *
 * Uso:
 *   import { withRetry } from "@/lib/claude-retry";
 *   const msg = await withRetry(() => anthropic.messages.create({...}));
 */

import { logger } from "@/lib/logger";

const log = logger("CLAUDE-RETRY");

interface RetryOptions {
  /** Max intentos (default 3) */
  maxAttempts?: number;
  /** Delay inicial ms (default 500) */
  baseDelayMs?: number;
  /** Etiqueta para logs */
  label?: string;
}

/**
 * Ejecuta fn con retry + backoff exponencial en errores transitorios.
 * - Reintenta en: 5xx, 408 (timeout), 429 (rate limit), errores de red
 * - NO reintenta en: 400, 401, 403 (errores lógicos o auth — no mejoran con retry)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 500, label = "claude-call" } = opts;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const status = (err as { status?: number; statusCode?: number })?.status
        || (err as { status?: number; statusCode?: number })?.statusCode;
      const isRetryable = !status || status >= 500 || status === 408 || status === 429;

      if (!isRetryable || attempt === maxAttempts) {
        log.error(`${label} fallo def (attempt ${attempt}/${maxAttempts})`, { status, err: (err as { message?: string })?.message });
        throw err;
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      log.warn(`${label} retry ${attempt}/${maxAttempts} en ${delay}ms`, { status });
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastErr;
}
