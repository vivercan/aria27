/** GET /api/planos?obra_id= · POST /api/planos (registrar plano subido) — Doménica 27 · 11-Oct-2026 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const okUrl = (u: unknown) => typeof u === "string" && /^https:\/\/[a-z0-9.-]+\.supabase\.co\/storage\/v1\/object\/public\//i.test(u);

export async function GET(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const obra = new URL(req.url).searchParams.get("obra_id");
  const db = getSupabaseAdmin();
  let q = db.from("planos").select("id, obra_id, obra_nombre, nombre, disciplina, revision, url, tipo_archivo, created_at").neq("activo", false).order("created_at", { ascending: false }).limit(200);
  if (obra) q = q.eq("obra_id", obra);
  const { data: planos } = await q;
  const ids = ((planos || []) as { id: string }[]).map(p => p.id);
  const { data: marcas } = ids.length ? await db.from("plano_marcas").select("plano_id, estado").in("plano_id", ids) : { data: [] };
  const cuenta: Record<string, number> = {};
  for (const m of (marcas || []) as { plano_id: string; estado: string }[]) if (m.estado === "ABIERTA") cuenta[m.plano_id] = (cuenta[m.plano_id] || 0) + 1;
  return NextResponse.json({ planos: ((planos || []) as Record<string, unknown>[]).map(p => ({ ...p, abiertas: cuenta[String(p.id)] || 0 })) });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const nombre = String(b.nombre || "").trim().slice(0, 160);
  if (!nombre) return NextResponse.json({ error: "Ponle nombre al plano" }, { status: 400 });
  if (!okUrl(b.url)) return NextResponse.json({ error: "Sube el archivo del plano" }, { status: 400 });
  const db = getSupabaseAdmin();
  const { data: o } = await db.from("centros_trabajo").select("id, nombre").eq("id", String(b.obra_id || "")).maybeSingle();
  if (!o) return NextResponse.json({ error: "Elige la obra" }, { status: 400 });
  const tipo = String(b.url).toLowerCase().endsWith(".pdf") ? "PDF" : "IMAGEN";
  const { data, error } = await db.from("planos").insert({ obra_id: (o as { id: string }).id, obra_nombre: (o as { nombre: string }).nombre, nombre, disciplina: b.disciplina ? String(b.disciplina).slice(0, 60) : null, revision: b.revision ? String(b.revision).slice(0, 20) : null, url: String(b.url), tipo_archivo: tipo, responsable: auth.email.toLowerCase(), activo: true, fecha_recepcion: new Date().toISOString().slice(0, 10) }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: (data as { id: string }).id });
}
