/**
 * /api/obras/[id]/fotos — Avance en fotos de una obra (Doménica 27 · 11-Oct-2026)
 * GET  → todas las fotos de la obra (avance, actividades, entregas, planos, bitácora), más recientes primero, con su "punto".
 * POST { url, descripcion?, punto? } → guarda una foto de avance (fotos_avance). El "punto" (ej. "Fachada norte")
 *      permite comparar el antes y el ahora del mismo lugar.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { normObra } from "@/lib/obras-dom";

export const dynamic = "force-dynamic";
type Foto = { url: string; fecha: string; de: string; punto: string | null; fuente: "avance" | "actividad" | "entrega" | "plano" | "bitacora" };
const okUrl = (u: unknown) => typeof u === "string" && /^https:\/\/[a-z0-9.-]+\.supabase\.co\/storage\/v1\/object\/public\//i.test(u);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const { id } = await params; const db = getSupabaseAdmin();
  const { data: o } = await db.from("centros_trabajo").select("id, nombre").eq("id", id).maybeSingle();
  if (!o) return NextResponse.json({ error: "Obra no encontrada" }, { status: 404 });
  const n = normObra((o as { nombre: string }).nombre); const desde = new Date(Date.now() - 365 * 864e5).toISOString();
  const { data: acts } = await db.from("tareas_asignadas").select("id, titulo, obra, obra_id").or(`obra_id.eq.${id},obra.ilike.${String((o as { nombre: string }).nombre).replace(/[,()]/g, " ")}`).limit(2000);
  const mias = ((acts || []) as { id: string; titulo: string; obra: string | null; obra_id: string | null }[]).filter(a => a.obra_id === id || normObra(a.obra) === n);
  const titulo = new Map(mias.map(a => [a.id, a.titulo]));
  const { data: pls } = await db.from("planos").select("id, nombre").eq("obra_id", id);
  const plano = new Map(((pls || []) as { id: string; nombre: string }[]).map(p => [p.id, p.nombre]));
  const [{ data: fa }, { data: ups }, { data: ents }, { data: mk }, { data: bit }] = await Promise.all([
    db.from("fotos_avance").select("url, descripcion, ubicacion, obra_id, obra_nombre, created_at").gte("created_at", desde).limit(1000),
    mias.length ? db.from("tarea_actualizaciones").select("tarea_id, foto_url, created_at").in("tarea_id", mias.map(a => a.id)).not("foto_url", "is", null).gte("created_at", desde).limit(1000) : Promise.resolve({ data: [] }),
    db.from("entregas").select("foto_url, obra_nombre, proveedor_nombre, created_at").not("foto_url", "is", null).gte("created_at", desde).limit(1000),
    plano.size ? db.from("plano_marcas").select("plano_id, titulo, foto_url, created_at").in("plano_id", [...plano.keys()]).not("foto_url", "is", null).limit(1000) : Promise.resolve({ data: [] }),
    db.from("bitacora_obra").select("fotos, obra_id, obra_nombre, created_at").gte("created_at", desde).limit(1000),
  ]);
  const fotos: Foto[] = [
    ...((fa || []) as { url: string; descripcion: string | null; ubicacion: string | null; obra_id: string | null; obra_nombre: string | null; created_at: string }[]).filter(f => f.obra_id === id || normObra(f.obra_nombre) === n).map(f => ({ url: f.url, fecha: f.created_at, de: f.descripcion || "Foto de avance", punto: f.ubicacion, fuente: "avance" as const })),
    ...((ups || []) as { tarea_id: string; foto_url: string; created_at: string }[]).map(u => ({ url: u.foto_url, fecha: u.created_at, de: titulo.get(u.tarea_id) || "Actividad", punto: null, fuente: "actividad" as const })),
    ...((ents || []) as { foto_url: string; obra_nombre: string | null; proveedor_nombre: string | null; created_at: string }[]).filter(e => normObra(e.obra_nombre) === n).map(e => ({ url: e.foto_url, fecha: e.created_at, de: `Entrega ${e.proveedor_nombre || ""}`.trim(), punto: null, fuente: "entrega" as const })),
    ...((mk || []) as { plano_id: string; titulo: string; foto_url: string; created_at: string }[]).map(m => ({ url: m.foto_url, fecha: m.created_at, de: m.titulo, punto: plano.get(m.plano_id) || null, fuente: "plano" as const })),
    ...((bit || []) as { fotos: string[] | null; obra_id: string | null; obra_nombre: string | null; created_at: string }[]).filter(b => b.obra_id === id || normObra(b.obra_nombre) === n).flatMap(b => (b.fotos || []).map(u => ({ url: u, fecha: b.created_at, de: "Bitácora", punto: null, fuente: "bitacora" as const }))),
  ].filter(f => okUrl(f.url) && !/\.pdf($|\?)/i.test(f.url)).sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
  const puntos = [...new Set(fotos.filter(f => f.fuente === "avance" && f.punto).map(f => f.punto as string))];
  return NextResponse.json({ obra: o, fotos, puntos });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const { id } = await params; const db = getSupabaseAdmin();
  const b = await req.json().catch(() => ({}));
  if (!okUrl(b.url)) return NextResponse.json({ error: "Falta la foto" }, { status: 400 });
  const { data: o } = await db.from("centros_trabajo").select("id, nombre").eq("id", id).maybeSingle();
  if (!o) return NextResponse.json({ error: "Obra no encontrada" }, { status: 404 });
  const { data: u } = await db.from("Users").select("name, display_name").eq("email", auth.email.toLowerCase()).maybeSingle();
  const fecha = new Date(Date.now() - 6 * 3600e3).toISOString().slice(0, 10);
  const { error } = await db.from("fotos_avance").insert({ obra_id: id, obra_nombre: (o as { nombre: string }).nombre, fecha, url: b.url, descripcion: String(b.descripcion || "").trim().slice(0, 200) || null, ubicacion: String(b.punto || "").trim().slice(0, 80) || null, responsable: (u as { display_name?: string; name?: string } | null)?.display_name || (u as { name?: string } | null)?.name || auth.email });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
