import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "upd-coords-jj-2026-06-13";

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("k") !== KEY) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const body = await req.json() as { updates: Array<{ id: string; latitud: number; longitud: number; radio_metros: number; direccion?: string }> };
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const u of body.updates) {
    const patch: Record<string, unknown> = { latitud: u.latitud, longitud: u.longitud, radio_metros: u.radio_metros };
    if (u.direccion) patch.direccion = u.direccion;
    const { error } = await supabase.from("centros_trabajo").update(patch).eq("id", u.id);
    results.push(error ? { id: u.id, ok: false, error: error.message } : { id: u.id, ok: true });
  }
  // Devolver estado actualizado
  const { data: obras } = await supabase.from("centros_trabajo")
    .select("id, nombre, latitud, longitud, radio_metros, direccion")
    .order("nombre");
  return NextResponse.json({ ok: true, results, obras });
}
