/** GET/POST /api/actividades/plantillas — plantillas de actividades (ARIA Doménica) · 11-Oct-2026 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { limpiarItems } from "@/lib/plantillas";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const { data, error } = await getSupabaseAdmin().from("actividad_plantillas").select("*").eq("activa", true).order("nombre");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plantillas: data || [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const nombre = String(b.nombre || "").trim().slice(0, 120);
  if (!nombre) return NextResponse.json({ error: "Ponle nombre a la plantilla" }, { status: 400 });
  const r = limpiarItems(b.items); if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().from("actividad_plantillas").insert({ nombre, descripcion: b.descripcion ? String(b.descripcion).slice(0, 500) : null, items: r.items, creada_por: auth.email.toLowerCase() }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, plantilla: data });
}
