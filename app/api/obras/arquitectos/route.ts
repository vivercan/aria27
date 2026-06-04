/**
 * /api/obras/arquitectos
 *
 * GET  -> lista arquitectos con sus obras asignadas
 * POST -> crea o actualiza arquitecto (idempotente por whatsapp_phone)
 *
 * Esquema:
 *   - employees.whatsapp_phone (text, unique index)
 *   - arquitecto_obras (employee_id, centro_trabajo_id) M:N
 *
 * 03-Jun-2026 (JJ feature avances WA -> BD)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

const log = logger("ARQUITECTOS-API");

interface ObraLite {
  id: string;
  codigo: string | null;
  nombre: string | null;
}

interface ArquitectoRow {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp_phone: string | null;
  position: string | null;
  status: string | null;
  obras: ObraLite[];
}

export async function GET() {
  const db = getSupabaseAdmin();
  try {
    const { data: emps, error: e1 } = await db
      .from("employees")
      .select("id, full_name, email, whatsapp_phone, position, status")
      .ilike("position", "%arquitect%")
      .order("full_name", { ascending: true });
    if (e1) throw e1;

    const ids = (emps || []).map((e) => e.id);
    let asignaciones: Array<{ employee_id: string; centro_trabajo_id: string }> = [];
    let obras: Array<{ id: string; codigo: string | null; nombre: string | null }> = [];

    if (ids.length > 0) {
      const { data: ao, error: e2 } = await db
        .from("arquitecto_obras")
        .select("employee_id, centro_trabajo_id")
        .in("employee_id", ids);
      if (e2) throw e2;
      asignaciones = ao || [];

      const obraIds = Array.from(new Set(asignaciones.map((a) => a.centro_trabajo_id)));
      if (obraIds.length > 0) {
        const { data: ob, error: e3 } = await db
          .from("centros_trabajo")
          .select("id, codigo, nombre")
          .in("id", obraIds);
        if (e3) throw e3;
        obras = ob || [];
      }
    }

    const obraById = new Map(obras.map((o) => [o.id, o]));
    const rows: ArquitectoRow[] = (emps || []).map((e) => ({
      id: e.id,
      full_name: e.full_name,
      email: e.email,
      whatsapp_phone: e.whatsapp_phone,
      position: e.position,
      status: e.status,
      obras: asignaciones
        .filter((a) => a.employee_id === e.id)
        .map((a) => obraById.get(a.centro_trabajo_id))
        .filter((o): o is ObraLite => Boolean(o)),
    }));

    return NextResponse.json({ arquitectos: rows });
  } catch (e: unknown) {
    log.error("GET error", { e });
    return NextResponse.json(
      { error: (e as { message?: string })?.message || "Error" },
      { status: 500 }
    );
  }
}

interface PostBody {
  id?: string;
  full_name: string;
  whatsapp_phone: string;
  email?: string | null;
  obra_ids?: string[];
}

function normalizePhone(raw: string): string {
  return (raw || "").replace(/\D/g, "");
}

export async function POST(req: NextRequest) {
  const db = getSupabaseAdmin();
  try {
    const body = (await req.json().catch(() => ({}))) as PostBody;
    const full_name = (body.full_name || "").trim();
    const whatsapp_phone = normalizePhone(body.whatsapp_phone || "");
    const email = body.email?.trim() || null;
    const obra_ids = Array.isArray(body.obra_ids) ? body.obra_ids.filter(Boolean) : [];

    if (!full_name || !whatsapp_phone) {
      return NextResponse.json(
        { error: "Faltan campos: full_name y whatsapp_phone" },
        { status: 400 }
      );
    }

    let employeeId: string | null = body.id || null;

    if (!employeeId) {
      const { data: existing } = await db
        .from("employees")
        .select("id")
        .or(`whatsapp_phone.eq.${whatsapp_phone},full_name.ilike.${full_name}`)
        .limit(1)
        .maybeSingle();
      if (existing) employeeId = existing.id;
    }

    if (employeeId) {
      const { error: upErr } = await db
        .from("employees")
        .update({
          full_name,
          whatsapp_phone,
          ...(email !== null ? { email } : {}),
          position: "Arquitecto",
          status: "ACTIVO",
        })
        .eq("id", employeeId);
      if (upErr) throw upErr;
    } else {
      const { count } = await db
        .from("employees")
        .select("id", { count: "exact", head: true });
      const next = String((count || 0) + 1).padStart(3, "0");
      const { data: ins, error: insErr } = await db
        .from("employees")
        .insert({
          employee_number: `EMP-${next}`,
          full_name,
          whatsapp_phone,
          email,
          position: "Arquitecto",
          department: "Obras",
          status: "ACTIVO",
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      employeeId = ins.id;
    }

    await db.from("arquitecto_obras").delete().eq("employee_id", employeeId);
    if (obra_ids.length > 0) {
      const rows = obra_ids.map((cid) => ({
        employee_id: employeeId,
        centro_trabajo_id: cid,
      }));
      const { error: aoErr } = await db.from("arquitecto_obras").insert(rows);
      if (aoErr) throw aoErr;
    }

    return NextResponse.json({ id: employeeId, success: true });
  } catch (e: unknown) {
    log.error("POST error", { e });
    return NextResponse.json(
      { error: (e as { message?: string })?.message || "Error" },
      { status: 500 }
    );
  }
}
