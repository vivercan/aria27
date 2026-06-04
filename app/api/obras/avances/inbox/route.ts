/**
 * /api/obras/avances/inbox
 *
 * GET  -> lista pendientes (status PENDING o UNKNOWN_SENDER) + ultimos N aprobados/rechazados
 * POST -> recibe nuevo reporte WA (Arquitecto) y lo parsea con Claude AI
 *
 * Body POST: { from: string, text: string, media_ids?: string[], wa_message_id?: string }
 *
 * 03-Jun-2026 feature avances WA -> BD
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { parseAvance, ObraSugerencia } from "@/lib/avances-parser";

const log = logger("AVANCES-INBOX-API");

function normalizePhone(raw: string): string {
  return (raw || "").replace(/\D/g, "").replace(/^521?/, "");
}

export async function GET() {
  const db = getSupabaseAdmin();
  try {
    const { data, error } = await db
      .from("obra_avances_inbox")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) throw error;

    // Hidratar con nombre de obra sugerida + nombre arquitecto
    const obraIds = Array.from(
      new Set(
        (data || [])
          .flatMap((r) => [r.suggested_obra_id, r.confirmed_obra_id])
          .filter(Boolean),
      ),
    );
    const arquitectoIds = Array.from(
      new Set((data || []).map((r) => r.arquitecto_id).filter(Boolean)),
    );

    const [obras, arquitectos] = await Promise.all([
      obraIds.length > 0
        ? db
            .from("centros_trabajo")
            .select("id, codigo, nombre")
            .in("id", obraIds)
        : Promise.resolve({ data: [], error: null }),
      arquitectoIds.length > 0
        ? db
            .from("employees")
            .select("id, full_name, whatsapp_phone")
            .in("id", arquitectoIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const obraById = new Map((obras.data || []).map((o) => [o.id, o]));
    const arqById = new Map((arquitectos.data || []).map((a) => [a.id, a]));

    const rows = (data || []).map((r) => ({
      ...r,
      suggested_obra: r.suggested_obra_id ? obraById.get(r.suggested_obra_id) || null : null,
      confirmed_obra: r.confirmed_obra_id ? obraById.get(r.confirmed_obra_id) || null : null,
      arquitecto: r.arquitecto_id ? arqById.get(r.arquitecto_id) || null : null,
    }));

    return NextResponse.json({ inbox: rows });
  } catch (e: unknown) {
    log.error("GET error", { e });
    return NextResponse.json(
      { error: (e as { message?: string })?.message || "Error" },
      { status: 500 }
    );
  }
}

interface PostBody {
  from: string;
  text: string;
  media_ids?: string[];
  wa_message_id?: string;
  raw_webhook?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  const db = getSupabaseAdmin();
  try {
    const body = (await req.json().catch(() => ({}))) as PostBody;
    const text = (body.text || "").trim();
    const from = (body.from || "").trim();

    if (!text) {
      return NextResponse.json({ error: "text vacio" }, { status: 400 });
    }

    const phoneNorm = normalizePhone(from);

    // 1. Identificar arquitecto
    const { data: arq } = await db
      .from("employees")
      .select("id, full_name, whatsapp_phone")
      .eq("whatsapp_phone", phoneNorm)
      .ilike("position", "%arquitect%")
      .maybeSingle();

    if (!arq) {
      // Remitente desconocido -> cae al inbox marcado UNKNOWN_SENDER
      const { data: ins } = await db
        .from("obra_avances_inbox")
        .insert({
          arquitecto_phone: phoneNorm,
          raw_message: text,
          status: "UNKNOWN_SENDER",
          media_ids: body.media_ids || [],
          wa_message_id: body.wa_message_id || null,
          raw_webhook: body.raw_webhook || null,
        })
        .select("id")
        .single();
      return NextResponse.json({ id: ins?.id, status: "UNKNOWN_SENDER" });
    }

    // 2. Obtener obras asignadas al arquitecto
    const { data: ao } = await db
      .from("arquitecto_obras")
      .select("centro_trabajo_id")
      .eq("employee_id", arq.id);
    const obraIds = (ao || []).map((x) => x.centro_trabajo_id);

    let obrasArq: ObraSugerencia[] = [];
    if (obraIds.length > 0) {
      const { data: obras } = await db
        .from("centros_trabajo")
        .select("id, codigo, nombre")
        .in("id", obraIds);
      obrasArq = (obras || []).map((o) => ({
        id: o.id,
        codigo: o.codigo,
        nombre: o.nombre || "",
      }));
    }

    // 3. Parsear el texto
    const parsed = await parseAvance(text, obrasArq);

    // 4. Insert al inbox como PENDING
    const { data: ins, error } = await db
      .from("obra_avances_inbox")
      .insert({
        arquitecto_id: arq.id,
        arquitecto_phone: phoneNorm,
        raw_message: text,
        parsed_json: parsed as unknown as Record<string, unknown>,
        suggested_obra_id: parsed.obra_id,
        reporte_fecha: parsed.fecha,
        realizadas: parsed.realizadas,
        programadas: parsed.programadas,
        status: "PENDING",
        media_ids: body.media_ids || [],
        wa_message_id: body.wa_message_id || null,
        raw_webhook: body.raw_webhook || null,
      })
      .select("id, suggested_obra_id")
      .single();

    if (error) throw error;

    log.info("AVANCE recibido", {
      inbox_id: ins.id,
      arquitecto: arq.full_name,
      obra_sugerida: parsed.obra_nombre,
      confidence: parsed.raw_match_confidence,
    });

    return NextResponse.json({
      id: ins.id,
      arquitecto: arq.full_name,
      suggested_obra: parsed.obra_nombre,
      confidence: parsed.raw_match_confidence,
      realizadas_count: parsed.realizadas.length,
      programadas_count: parsed.programadas.length,
    });
  } catch (e: unknown) {
    log.error("POST error", { e });
    return NextResponse.json(
      { error: (e as { message?: string })?.message || "Error" },
      { status: 500 }
    );
  }
}
