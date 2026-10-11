/**
 * Autorización de tareas programadas · 11-Oct-2026
 * Vercel manda "Authorization: Bearer <CRON_SECRET>" en cada cron. Antes también se aceptaba el
 * user-agent "vercel-cron", que cualquiera puede falsificar (podían dispararse avisos desde internet).
 * Ahora solo pasa quien trae el secreto (o el token propio del endpoint, si tiene).
 */
import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

function igual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function cronAutorizado(req: NextRequest, ...tokensExtra: (string | undefined)[]): boolean {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return false;
  const dado = auth.slice(7);
  const validos = [process.env.CRON_SECRET, ...tokensExtra].filter((t): t is string => !!t && t.length >= 8);
  return validos.some(t => igual(dado, t));
}
