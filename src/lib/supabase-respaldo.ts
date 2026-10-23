/**
 * Respaldo de conexión a Supabase desde el navegador (23-Oct-2026)
 * Caso real: a Jessica (Compras) no le cargaba Estatus de Requisiciones ni podía hacer requisiciones. El servidor y la base
 * estaban bien; lo que fallaba era que SU navegador no llegaba a *.supabase.co (red de la oficina, antivirus o DNS).
 * Las pantallas tragaban el error y decían "No hay requisiciones".
 *
 * Solución: todas las consultas del navegador pasan por aquí. Primero se intenta directo (rápido). Si la red falla
 * (sin respuesta, timeout o error de conexión) la MISMA petición se manda por /api/db/respaldo, que la reenvía a
 * Supabase con la llave anónima (los mismos permisos que ya tiene el navegador, ni uno más) y exige sesión.
 * Solo en el navegador; en el servidor no aplica.
 */
const TIMEOUT_MS = 12_000;
let modoRespaldo = false;        // una vez que falla directo, se va por servidor el resto de la sesión (y se reintenta directo cada 2 min)
let reintentarDirectoEn = 0;
const oyentes = new Set<(r: boolean) => void>();

export function enModoRespaldo(): boolean { return modoRespaldo; }
export function alCambiarModo(fn: (r: boolean) => void): () => void { oyentes.add(fn); return () => { oyentes.delete(fn); }; }
function ponerModo(r: boolean) { if (modoRespaldo !== r) { modoRespaldo = r; oyentes.forEach(f => { try { f(r); } catch { /* nada */ } }); } }

function esSupabase(url: string): boolean { return /\.supabase\.(co|in)\//.test(url) || url.includes("supabase.co"); }

async function porServidor(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const req = new Request(input, init);
  const u = new URL(req.url);
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => { if (!["apikey", "authorization", "host", "content-length"].includes(k.toLowerCase())) headers[k] = v; });
  const body = req.method === "GET" || req.method === "HEAD" ? null : await req.text();
  const r = await fetch("/api/db/respaldo", {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method: req.method, path: u.pathname + u.search, headers, body }),
  });
  if (r.status === 401 || r.status === 403 || r.status === 404) {
    // sin sesión o ruta no permitida: devolver tal cual para que supabase-js lo trate como error normal
    return r;
  }
  return r;
}

export async function fetchConRespaldo(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof window === "undefined") return fetch(input, init);
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!esSupabase(url)) return fetch(input, init);
  const ahora = Date.now();
  if (modoRespaldo && ahora < reintentarDirectoEn) {
    try { return await porServidor(input, init); } catch { /* si el servidor también falla, intenta directo */ }
  }
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(input, { ...init, signal: init?.signal || ctl.signal });
    clearTimeout(t);
    if (modoRespaldo) ponerModo(false);
    return r;
  } catch (e) {
    clearTimeout(t);
    // Solo errores de red (TypeError: Failed to fetch / abort por timeout). Los errores HTTP sí regresan arriba.
    const esRed = e instanceof TypeError || (e as Error)?.name === "AbortError";
    if (!esRed) throw e;
    ponerModo(true); reintentarDirectoEn = Date.now() + 120_000;
    return porServidor(input, init);
  }
}
