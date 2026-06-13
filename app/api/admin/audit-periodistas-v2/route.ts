import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("k") !== "aria27-debug-2026") {
    return NextResponse.json({ error: "nope" }, { status: 403 });
  }
  const db = getSupabaseAdmin();

  const { data: periodistas } = await db
    .from("centros_trabajo")
    .select("id, nombre, codigo, latitud, longitud, radio_metros, activo")
    .ilike("nombre", "%periodistas%");

  const { data: todos } = await db
    .from("centros_trabajo")
    .select("nombre, codigo, latitud, longitud, radio_metros, activo")
    .eq("activo", true)
    .order("nombre");

  return NextResponse.json({
    periodistas,
    todos_centros_activos: todos,
    count: todos?.length || 0,
  });
}
