/** GET/POST /api/planos/[id]/marcas — pines sobre el plano (pendiente, nota o foto; opcional crear actividad) · 11-Oct-2026 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { crearActividad, personaPorEmail } from "@/lib/actividades-server";
import { sumarDias, hoyMX } from "@/lib/plantillas";

const okUrl = (u: unknown) => typeof u === "string" && /^https:\/\/[a-z0-9.-]+\.supabase\.co\/storage\/v1\/object\/public\//i.test(u);

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const { id } = await ctx.params; const db = getSupabaseAdmin();
  const [{ data: p }, { data: m }] = await Promise.all([
    db.from("planos").select("id, obra_id, obra_nombre, nombre, disciplina, revision, url, tipo_archivo").eq("id", id).maybeSingle(),
    db.from("plano_marcas").select("*").eq("plano_id", id).order("created_at"),
  ]);
  if (!p) return NextResponse.json({ error: "Plano no encontrado" }, { status: 404 });
  return NextResponse.json({ plano: p, marcas: m || [] });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const { id } = await ctx.params; const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const x = Number(b.x), y = Number(b.y);
  if (!(x >= 0 && x <= 1 && y >= 0 && y <= 1)) return NextResponse.json({ error: "Toca un punto del plano" }, { status: 400 });
  const titulo = String(b.titulo || "").trim().slice(0, 200);
  if (!titulo) return NextResponse.json({ error: "Escribe qué hay en ese punto" }, { status: 400 });
  const db = getSupabaseAdmin();
  const { data: p } = await db.from("planos").select("id, obra_id, nombre").eq("id", id).maybeSingle();
  const plano = p as { id: string; obra_id: string | null; nombre: string } | null;
  if (!plano) return NextResponse.json({ error: "Plano no encontrado" }, { status: 404 });
  const tipo = ["PENDIENTE", "NOTA", "FOTO"].includes(String(b.tipo)) ? String(b.tipo) : "PENDIENTE";
  const yo = await personaPorEmail(db, auth.email);
  let tareaId: string | null = null;
  if (b.asignar_a && tipo === "PENDIENTE") {
    const r = await crearActividad(db, { titulo, descripcion: `Marcado en el plano "${plano.nombre}"${b.nota ? `: ${String(b.nota).slice(0, 500)}` : ""}`, asignado_id: String(b.asignar_a), obra_id: plano.obra_id, fecha_compromiso: /^\d{4}-\d{2}-\d{2}$/.test(String(b.fecha || "")) ? String(b.fecha) : sumarDias(hoyMX(), 2), prioridad: "ALTA", origen: `plano: ${plano.nombre}` }, auth.email, "todo");
    if (r.ok) tareaId = r.id;
  }
  const { data, error } = await db.from("plano_marcas").insert({ plano_id: id, x, y, titulo, tipo, nota: b.nota ? String(b.nota).slice(0, 1000) : null, foto_url: okUrl(b.foto_url) ? String(b.foto_url) : null, tarea_id: tareaId, creado_por: auth.email.toLowerCase(), creado_nombre: yo?.nombre || auth.email }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, marca: data });
}
