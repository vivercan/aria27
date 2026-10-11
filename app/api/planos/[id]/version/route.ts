/**
 * /api/planos/[id]/version — Versiones de un plano (Doménica 27 · 11-Oct-2026)
 * GET  → todas las versiones del mismo plano (misma obra + mismo nombre), de la más nueva a la más vieja.
 * POST { url } → sube versión nueva: Rev +1, la anterior queda guardada (no activa) y los pendientes ABIERTOS pasan a la nueva.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
const okUrl = (u: unknown) => typeof u === "string" && /^https:\/\/[a-z0-9.-]+\.supabase\.co\/storage\/v1\/object\/public\//i.test(u);
type P = { id: string; obra_id: string | null; obra_nombre: string | null; nombre: string; disciplina: string | null; revision: string | null; url: string; tipo_archivo: string | null; activo: boolean | null; created_at: string };
const revNum = (r: string | null) => { const n = parseInt(String(r || "").replace(/\D/g, ""), 10); return Number.isFinite(n) ? n : 0; };

async function versiones(db: ReturnType<typeof getSupabaseAdmin>, p: P) {
  let q = db.from("planos").select("id, obra_id, obra_nombre, nombre, disciplina, revision, url, tipo_archivo, activo, created_at").eq("nombre", p.nombre);
  q = p.obra_id ? q.eq("obra_id", p.obra_id) : q.is("obra_id", null);
  const { data } = await q;
  return ((data || []) as P[]).sort((a, b) => revNum(b.revision) - revNum(a.revision) || Date.parse(b.created_at) - Date.parse(a.created_at));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const { id } = await params; const db = getSupabaseAdmin();
  const { data: p } = await db.from("planos").select("id, obra_id, obra_nombre, nombre, disciplina, revision, url, tipo_archivo, activo, created_at").eq("id", id).maybeSingle();
  if (!p) return NextResponse.json({ error: "Plano no encontrado" }, { status: 404 });
  return NextResponse.json({ versiones: (await versiones(db, p as P)).map(v => ({ id: v.id, revision: revNum(v.revision) || 1, url: v.url, tipo_archivo: v.tipo_archivo, actual: v.activo !== false, fecha: v.created_at })) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const { id } = await params; const db = getSupabaseAdmin();
  const b = await req.json().catch(() => ({}));
  if (!okUrl(b.url)) return NextResponse.json({ error: "Sube el archivo de la versión nueva" }, { status: 400 });
  const { data: p } = await db.from("planos").select("id, obra_id, obra_nombre, nombre, disciplina, revision, url, tipo_archivo, activo, created_at").eq("id", id).maybeSingle();
  if (!p) return NextResponse.json({ error: "Plano no encontrado" }, { status: 404 });
  const todas = await versiones(db, p as P); const mayor = Math.max(1, ...todas.map(v => revNum(v.revision)));
  const tipo = String(b.url).toLowerCase().split("?")[0].endsWith(".pdf") ? "PDF" : "IMAGEN";
  const { data: nueva, error } = await db.from("planos").insert({ obra_id: (p as P).obra_id, obra_nombre: (p as P).obra_nombre, nombre: (p as P).nombre, disciplina: (p as P).disciplina, revision: String(mayor + 1), url: b.url, tipo_archivo: tipo, activo: true, fecha_recepcion: new Date().toISOString().slice(0, 10), responsable: auth.email }).select("id").single();
  if (error || !nueva) return NextResponse.json({ error: error?.message || "No se pudo guardar" }, { status: 500 });
  const nid = (nueva as { id: string }).id;
  const viejas = todas.map(v => v.id);
  await db.from("planos").update({ activo: false }).in("id", viejas);
  const { data: mov } = await db.from("plano_marcas").update({ plano_id: nid }).in("plano_id", viejas).eq("estado", "ABIERTA").select("id");
  return NextResponse.json({ ok: true, id: nid, revision: mayor + 1, pendientes_pasados: (mov || []).length });
}
