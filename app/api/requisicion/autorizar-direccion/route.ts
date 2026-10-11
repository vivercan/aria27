/**
 * POST /api/requisicion/autorizar-direccion — Doménica 27 · 11-Oct-2026
 * { ids: string[], action: "AUTORIZAR" | "RECHAZAR", comentario? } — Dirección/admin con sesión (celular).
 * Lógica en src/lib/autorizar-direccion.ts (también la usa el link /autorizar/[token]).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { resolverDireccion } from "@/lib/autorizar-direccion";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.res;
  const me = auth.email.toLowerCase(); const role = (auth.role || "").toLowerCase();
  if (role !== "direccion" && role !== "admin") return NextResponse.json({ error: "Solo Dirección puede autorizar en este nivel" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean).slice(0, 100) : [];
  const action = String(body.action || "").toUpperCase();
  const comentario = String(body.comentario || "").trim().slice(0, 500);
  if (!ids.length || (action !== "AUTORIZAR" && action !== "RECHAZAR")) return NextResponse.json({ error: "Faltan solicitudes o acción" }, { status: 400 });
  if (action === "RECHAZAR" && comentario.length < 3) return NextResponse.json({ error: "Escribe el motivo del rechazo" }, { status: 400 });
  const r = await resolverDireccion(getSupabaseAdmin(), ids, action, comentario, me);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 500 });
  return NextResponse.json({ ok: true, hechas: r.hechas, saltadas: r.saltadas });
}
