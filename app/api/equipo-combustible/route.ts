/**
 * /api/equipo-combustible
 * GET ?obra_id=X     -> equipos de una obra (o todos si no se pasa obra_id)
 * POST { ... }       -> crear equipo + asignar obras
 * PATCH { id, ... }  -> editar equipo
 * DELETE { id }      -> baja logica (activo=false)
 *
 * 04-Jun-2026
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

interface EquipoBody {
  alias: string;
  tipo_combustible: "DIESEL" | "MAGNA" | "PREMIUM";
  consumo_estandar_litros?: number;
  numero_serie?: string;
  placas?: string;
  numero_economico?: string;
  marca?: string;
  modelo?: string;
  operador_employee_id?: string | null;
  notas?: string;
  obras?: string[]; // centros_trabajo ids
}

export async function GET(req: NextRequest) {
  try {
    const db = getSupabaseAdmin();
    const obraId = req.nextUrl.searchParams.get("obra_id");
    const incluirBaja = req.nextUrl.searchParams.get("incluir_baja") === "1";

    if (obraId) {
      // Equipos asignados a esa obra
      const { data: rels } = await db
        .from("equipo_combustible_obras")
        .select("equipo_id")
        .eq("centro_trabajo_id", obraId)
        .eq("activo", true);
      const ids = (rels || []).map((r: { equipo_id: string }) => r.equipo_id);
      if (ids.length === 0) return NextResponse.json({ equipos: [] }, { headers: { "Cache-Control": "no-store" } });
      let q = db.from("equipo_combustible").select("*, operador:employees(full_name, whatsapp_phone)").in("id", ids);
      if (!incluirBaja) q = q.eq("activo", true);
      const { data: equipos } = await q.order("alias");
      return NextResponse.json({ equipos: equipos || [] }, { headers: { "Cache-Control": "no-store" } });
    }

    let q = db.from("equipo_combustible").select("*, operador:employees(full_name, whatsapp_phone), obras:equipo_combustible_obras(centro_trabajo_id, activo)");
    if (!incluirBaja) q = q.eq("activo", true);
    const { data: equipos } = await q.order("alias");
    return NextResponse.json({ equipos: equipos || [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getSupabaseAdmin();
    const body = (await req.json()) as EquipoBody;
    if (!body.alias || !body.tipo_combustible) {
      return NextResponse.json({ error: "alias y tipo_combustible requeridos" }, { status: 400 });
    }
    const { obras = [], ...rest } = body;
    const { data: equipo, error } = await db
      .from("equipo_combustible")
      .insert(rest)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (obras.length > 0 && equipo) {
      const rels = obras.map((centroId) => ({ equipo_id: (equipo as { id: string }).id, centro_trabajo_id: centroId }));
      await db.from("equipo_combustible_obras").insert(rels);
    }
    return NextResponse.json({ equipo });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = getSupabaseAdmin();
    const body = await req.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const { obras, id: _ignore, ...fields } = body;
    void _ignore;
    if (Object.keys(fields).length > 0) {
      const { error } = await db.from("equipo_combustible").update(fields).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (Array.isArray(obras)) {
      // Reemplazar asignaciones
      await db.from("equipo_combustible_obras").delete().eq("equipo_id", id);
      if (obras.length > 0) {
        const rels = obras.map((centroId: string) => ({ equipo_id: id, centro_trabajo_id: centroId }));
        await db.from("equipo_combustible_obras").insert(rels);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getSupabaseAdmin();
    const body = await req.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const { error } = await db.from("equipo_combustible").update({ activo: false }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
