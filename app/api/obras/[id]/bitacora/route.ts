/**
 * GET  /api/obras/[id]/bitacora?fecha=YYYY-MM-DD — bitácora del día armada sola (avances, fotos, entregas, solicitudes)
 * POST /api/obras/[id]/bitacora — agrega clima, personal en obra, maquinaria e incidentes del día · 11-Oct-2026
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { armarBitacora } from "@/lib/bitacora-dia";
import { personaPorEmail } from "@/lib/actividades-server";
import { hoyMX } from "@/lib/plantillas";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const { id } = await ctx.params;
  const f = new URL(req.url).searchParams.get("fecha") || hoyMX();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  const b = await armarBitacora(getSupabaseAdmin(), id, f);
  if (!b) return NextResponse.json({ error: "Obra no encontrada" }, { status: 404 });
  return NextResponse.json(b);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const { id } = await ctx.params;
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(b.fecha || "")) ? String(b.fecha) : hoyMX();
  const db = getSupabaseAdmin();
  const { data: o } = await db.from("centros_trabajo").select("id, nombre").eq("id", id).maybeSingle();
  if (!o) return NextResponse.json({ error: "Obra no encontrada" }, { status: 404 });
  const yo = await personaPorEmail(db, auth.email);
  const fila = {
    obra_id: id, obra_nombre: (o as { nombre: string }).nombre, fecha,
    clima: b.clima ? String(b.clima).slice(0, 60) : null,
    personal_en_obra: b.personal_en_obra !== undefined && b.personal_en_obra !== "" ? Math.max(0, Math.min(999, Math.round(Number(b.personal_en_obra) || 0))) : null,
    maquinaria: b.maquinaria ? String(b.maquinaria).slice(0, 500) : null,
    incidentes: b.incidentes ? String(b.incidentes).slice(0, 1000) : null,
    observaciones: b.observaciones ? String(b.observaciones).slice(0, 1000) : null,
    residente_nombre: yo?.nombre || auth.email, recibido_por_whatsapp: false,
  };
  const { data: prev } = await db.from("bitacora_obra").select("id").eq("obra_id", id).eq("fecha", fecha).limit(1).maybeSingle();
  const { error } = prev ? await db.from("bitacora_obra").update(fila).eq("id", (prev as { id: string }).id) : await db.from("bitacora_obra").insert(fila);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
