/**
 * ARIA27 · FIX 541.1 · 24-Jun-2026
 * Cliente HTTP centralizado para llamadas a /api/* desde frontend.
 *
 * INVARIANTES:
 * - credentials: "include" siempre → cookie __Host-aria_session viaja
 * - NUNCA agrega x-user-email (header obsoleto que era vector de suplantación)
 * - Retry automático SOLO en GET. POST/PUT/PATCH/DELETE NO se reintentan
 *   (evita duplicación de requisiciones / pagos / mensajes WhatsApp).
 * - Escrituras con Idempotency-Key explícita SÍ pueden reintentar (opt-in).
 * - 401 → propaga error tipado para que el caller decida (redirect a /login,
 *   toast, etc). No fuerza redirect global (algunos flujos lo manejan local).
 * - 403 → propaga error tipado (toast permiso insuficiente).
 * - 5xx → 1 reintento en GET con backoff 300ms. En escrituras: nunca.
 */

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
  get isUnauthorized() { return this.status === 401; }
  get isForbidden() { return this.status === 403; }
  get isServerError() { return this.status >= 500; }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ApiFetchOptions {
  method?: Method;
  body?: unknown;
  headers?: Record<string, string>;
  /** Idempotency key: permite retry seguro en escrituras (servidor debe deduplicar). */
  idempotencyKey?: string;
  /** Timeout cliente en ms. Default 25_000. */
  timeoutMs?: number;
  /** Forzar NO-retry incluso en GET. */
  noRetry?: boolean;
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 25_000;
const RETRY_BACKOFF_MS = 300;

function isRetryable(method: Method, opts: ApiFetchOptions): boolean {
  if (opts.noRetry) return false;
  if (method === "GET") return true;
  // Escrituras: solo retry si trae idempotency-key
  return !!opts.idempotencyKey;
}

async function doFetch(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new DOMException("Timeout", "AbortError")), timeoutMs);
  try {
    // Si el caller ya pasó signal, encadenarlo
    if (init.signal) {
      const userSignal = init.signal;
      userSignal.addEventListener("abort", () => ctrl.abort(userSignal.reason));
    }
    const res = await fetch(input, { ...init, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function apiFetch<T = unknown>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const headers: Record<string, string> = {
    "Accept": "application/json",
    ...opts.headers,
  };
  // PROHIBIDO: x-user-email — la sesión viaja en cookie.
  delete headers["x-user-email"];
  delete headers["X-User-Email"];

  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  let body: BodyInit | undefined;
  if (opts.body !== undefined && opts.body !== null) {
    if (opts.body instanceof FormData) {
      body = opts.body;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
  }

  const init: RequestInit = {
    method,
    headers,
    body,
    credentials: "include", // cookie __Host-aria_session
    signal: opts.signal,
  };

  let res: Response;
  try {
    res = await doFetch(path, init, timeoutMs);
  } catch (e) {
    // Network/abort. Retry SOLO si es safe (GET o write con idempotency).
    if (isRetryable(method, opts)) {
      await new Promise(r => setTimeout(r, RETRY_BACKOFF_MS));
      res = await doFetch(path, init, timeoutMs);
    } else {
      throw e;
    }
  }

  // Retry en 5xx solo si safe
  if (res.status >= 500 && isRetryable(method, opts)) {
    await new Promise(r => setTimeout(r, RETRY_BACKOFF_MS));
    res = await doFetch(path, init, timeoutMs);
  }

  // Parse payload
  let payload: unknown = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    payload = await res.json().catch(() => null);
  } else if (ct.startsWith("text/")) {
    payload = await res.text().catch(() => null);
  }

  if (!res.ok) {
    const msg = (payload && typeof payload === "object" && "error" in payload)
      ? String((payload as { error: unknown }).error)
      : `HTTP ${res.status}`;
    throw new ApiError(res.status, msg, payload);
  }

  return payload as T;
}

/** Shortcut: GET con tipado. */
export function apiGet<T = unknown>(path: string, opts?: Omit<ApiFetchOptions, "method" | "body">): Promise<T> {
  return apiFetch<T>(path, { ...opts, method: "GET" });
}

/** Shortcut: POST JSON. */
export function apiPost<T = unknown>(path: string, body: unknown, opts?: Omit<ApiFetchOptions, "method" | "body">): Promise<T> {
  return apiFetch<T>(path, { ...opts, method: "POST", body });
}

/** Shortcut: PATCH JSON. */
export function apiPatch<T = unknown>(path: string, body: unknown, opts?: Omit<ApiFetchOptions, "method" | "body">): Promise<T> {
  return apiFetch<T>(path, { ...opts, method: "PATCH", body });
}

/** Shortcut: DELETE. */
export function apiDelete<T = unknown>(path: string, opts?: Omit<ApiFetchOptions, "method" | "body">): Promise<T> {
  return apiFetch<T>(path, { ...opts, method: "DELETE" });
}
