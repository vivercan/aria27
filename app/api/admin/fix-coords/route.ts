import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "fix-coords-jj-2026-06-13";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("k") !== KEY) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();

  // Inspeccionar columnas
  const { data: cols } = await supabase.from("centros_trabajo").select("*").limit(1);
  const columns = cols && cols[0] ? Object.keys(cols[0]) : [];

  // Listar TODAS las obras
  const { data: obras, error: obrasErr } = await supabase
    .from("centros_trabajo")
    .select("id, nombre, direccion, lat, lng, radio_metros, activo, estado, fecha_inicio, fecha_fin, created_at")
    .order("nombre");

  // Detectar duplicados por coordenadas
  const groups: Record<string, Array<{ id: string; nombre: string; activo: boolean; estado?: string }>> = {};
  (obras || []).forEach((o) => {
    if (o.lat != null && o.lng != null) {
      const k = `${o.lat},${o.lng}`;
      if (!groups[k]) groups[k] = [];
      groups[k].push({ id: o.id, nombre: o.nombre, activo: o.activo, estado: o.estado });
    }
  });
  const duplicados = Object.entries(groups)
    .filter(([, arr]) => arr.length > 1)
    .map(([coord, arr]) => ({ coord, count: arr.length, obras: arr }));

  // Tambien obras sin coord
  const sin_coord = (obras || []).filter(o => o.lat == null || o.lng == null).map(o => ({ id: o.id, nombre: o.nombre, activo: o.activo }));

  return NextResponse.json({
    ok: true,
    columns,
    has_updated_at: columns.includes("updated_at"),
    total_obras: obras?.length || 0,
    obras,
    duplicados,
    sin_coord,
    obrasErr: obrasErr?.message,
  });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("k") !== KEY) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const body = await req.json() as { updates: Array<{ id: string; lat?: number; lng?: number; radio_metros?: number; direccion?: string }> };

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const u of body.updates) {
    const patch: Record<string, unknown> = {};
    if (u.lat != null) patch.lat = u.lat;
    if (u.lng != null) patch.lng = u.lng;
    if (u.radio_metros != null) patch.radio_metros = u.radio_metros;
    if (u.direccion != null) patch.direccion = u.direccion;
    if (Object.keys(patch).length === 0) { results.push({ id: u.id, ok: false, error: "empty patch" }); continue; }
    const { error } = await supabase.from("centros_trabajo").update(patch).eq("id", u.id);
    if (error) results.push({ id: u.id, ok: false, error: error.message });
    else results.push({ id: u.id, ok: true });
  }
  return NextResponse.json({ ok: true, results });
}
