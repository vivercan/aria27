// src/lib/rate-limit.ts — Rate limiter in-memory para proteger API routes
// Protege contra abuso/spam de endpoints críticos (email, WhatsApp, writes).
// Nota: En Vercel serverless el estado es per-instance; para protección
// distribuida robusta migrar a Upstash Redis en el futuro.

import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitEntry>();

// Limpieza periódica de entradas expiradas (cada 5 min)
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60 * 1000;

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  for (const [key, entry] of buckets.entries()) {
    if (entry.resetAt < now) buckets.delete(key);
  }
  lastCleanup = now;
}

export interface RateLimitOptions {
  /** Identificador único del bucket (ej: "mail:test", "req:create") */
  key: string;
  /** Máximo de requests en la ventana */
  max: number;
  /** Ventana en milisegundos */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Verifica y consume un token del rate limiter.
 * @param identifier - IP, email o user ID que identifica al cliente
 * @param options - Configuración del bucket
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  cleanup(now);

  const bucketKey = `${options.key}:${identifier}`;
  const entry = buckets.get(bucketKey);

  if (!entry || entry.resetAt < now) {
    const resetAt = now + options.windowMs;
    buckets.set(bucketKey, { count: 1, resetAt });
    return { allowed: true, remaining: options.max - 1, resetAt };
  }

  if (entry.count >= options.max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: options.max - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Extrae el identificador del cliente desde headers de Vercel/Next.
 */
export function getClientIdentifier(req: NextRequest, userEmail?: string | null): string {
  if (userEmail) return `u:${userEmail}`;
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return `ip:${fwd.split(",")[0].trim()}`;
  const real = req.headers.get("x-real-ip");
  if (real) return `ip:${real}`;
  return "ip:unknown";
}

/**
 * Respuesta 429 estándar con headers de rate limit.
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: "Demasiadas solicitudes. Intenta de nuevo en unos momentos.",
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter ?? 60),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    }
  );
}

// Presets comunes
export const RATE_LIMITS = {
  /** Emails transaccionales: 10 por minuto por usuario */
  EMAIL: { max: 10, windowMs: 60_000 },
  /** Escrituras CRUD: 60 por minuto por usuario */
  WRITE: { max: 60, windowMs: 60_000 },
  /** Operaciones costosas (AI, reportes): 20 por 5 min */
  EXPENSIVE: { max: 20, windowMs: 5 * 60_000 },
  /** Rutas públicas (approve-purchase por token): 30 por minuto por IP */
  PUBLIC: { max: 30, windowMs: 60_000 },
} as const;
