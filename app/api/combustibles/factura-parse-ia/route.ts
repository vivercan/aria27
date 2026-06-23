// 23-Jun-2026 — Combustibles 2.0 F3
// POST /api/combustibles/factura-parse-ia
// Recibe URL de factura + solicitud_id. Claude lee y extrae: estación, RFC, UUID
// CFDI, fecha, litros, precio_litro, subtotal, IVA, total. Concilia vs solicitud.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

interface Body {
  solicitud_id: string;
  factura_url: string;
  factura_subida_por_wa?: string;
}

export async function POST(req: NextRequest) {
  const internal = req.headers.get("x-wa-webhook-secret");
  if (!internal || internal !== (process.env.WA_WEBHOOK_INTERNAL_SECRET || "")) {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.res;
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.solicitud_id || !body.factura_url) {
    return NextResponse.json(
      { ok: false, error: "solicitud_id y factura_url requeridos" },
      { status: 400 }
    );
  }

  const db = getSupabaseAdmin();

  // Traer la solicitud para conciliar
  const { data: solic, error: solicErr } = await db
    .from("combustible_solicitudes")
    .select("id, litros, tipo_combustible")
    .eq("id", body.solicitud_id)
    .maybeSingle();
  if (solicErr || !solic) {
    return NextResponse.json({ ok: false, error: "solicitud no encontrada" }, { status: 404 });
  }
  const solicLitros = Number(solic.litros) || 0;

  // Crear factura row PENDIENTE
  const { data: factura, error: facturaErr } = await db
    .from("combustible_facturas")
    .insert({
      solicitud_id: body.solicitud_id,
      factura_url: body.factura_url,
      factura_subida_por_wa: body.factura_subida_por_wa || null,
      ia_status: "PENDIENTE",
      conciliacion_status: "PENDIENTE",
    })
    .select("id")
    .single();
  if (facturaErr || !factura) {
    return NextResponse.json({ ok: false, error: facturaErr?.message || "insert factura" }, { status: 500 });
  }

  // Pedir a Claude que lea la imagen
  if (!process.env.ANTHROPIC_API_KEY) {
    await db
      .from("combustible_facturas")
      .update({ ia_status: "ERROR", ia_raw: { error: "ANTHROPIC_API_KEY missing" } })
      .eq("id", factura.id);
    return NextResponse.json({ ok: false, error: "IA no configurada" }, { status: 500 });
  }

  const prompt = `Analiza esta factura/ticket de combustible y devuelve SOLO JSON con estos campos:
{
  "estacion": "Pemex, Mobil, BP, etc",
  "rfc_emisor": "RFC del emisor",
  "uuid_cfdi": "UUID del CFDI si aparece, sino null",
  "fecha": "YYYY-MM-DD",
  "litros": número (decimales OK),
  "precio_litro": número,
  "subtotal": número,
  "iva": número,
  "total": número
}
Si algún campo no se ve claramente, devuelve null en ese campo.`;

  let iaRaw: Record<string, unknown> = {};
  try {
    const resp = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: body.factura_url } },
            { type: "text", text: prompt },
          ],
        },
      ],
    });
    const textBlock = resp.content.find((b) => b.type === "text");
    const txt = textBlock && "text" in textBlock ? (textBlock.text as string) : "";
    const jsonMatch = txt.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      iaRaw = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    }
  } catch (e) {
    await db
      .from("combustible_facturas")
      .update({ ia_status: "ERROR", ia_raw: { error: String(e) } })
      .eq("id", factura.id);
    return NextResponse.json({ ok: false, error: "IA fallo: " + String(e) }, { status: 500 });
  }

  // Conciliar litros
  const iaLitros = Number(iaRaw.litros) || 0;
  const diffLitros = solicLitros - iaLitros;
  const diffPct = solicLitros > 0 ? Math.abs(diffLitros / solicLitros) * 100 : 100;
  let concStatus = "OK";
  if (diffPct > 10) concStatus = "DIFERENCIA_LITROS";

  // Update factura con datos IA
  const { data: factualizada, error: upErr } = await db
    .from("combustible_facturas")
    .update({
      ia_status: "OK",
      ia_raw: iaRaw,
      ia_estacion: (iaRaw.estacion as string) || null,
      ia_rfc_emisor: (iaRaw.rfc_emisor as string) || null,
      ia_uuid_cfdi: (iaRaw.uuid_cfdi as string) || null,
      ia_fecha: (iaRaw.fecha as string) || null,
      ia_litros: iaLitros || null,
      ia_precio_litro: (iaRaw.precio_litro as number) || null,
      ia_subtotal: (iaRaw.subtotal as number) || null,
      ia_iva: (iaRaw.iva as number) || null,
      ia_total: (iaRaw.total as number) || null,
      conciliacion_status: concStatus,
      conciliacion_diff_litros: diffLitros,
      conciliacion_diff_pct: diffPct,
    })
    .eq("id", factura.id)
    .select("*")
    .single();

  if (upErr) {
    return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
  }

  // Si conciliación OK, marcar solicitud como FACTURADA
  if (concStatus === "OK") {
    await db
      .from("combustible_solicitudes")
      .update({ status: "FACTURADA", facturada_at: new Date().toISOString(), factura_id: factura.id })
      .eq("id", body.solicitud_id);
  }

  return NextResponse.json({ ok: true, factura: factualizada, conciliacion: concStatus });
}
