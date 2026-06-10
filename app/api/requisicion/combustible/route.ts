/**
 * /api/requisicion/combustible
 * POST -> crea requisicion tipo COMBUSTIBLES con N cargas (1 por maquina)
 *
 * Body: {
 *   centro_trabajo_id: string,
 *   centro_trabajo_name: string,
 *   user_email: string,
 *   solicitante_nombre_completo: string,
 *   forma_pago: string,                    // Transferencia / Efectivo
 *   fecha_pago?: string,
 *   proveedor?: string,
 *   proveedor_banco?: string,
 *   proveedor_clabe?: string,
 *   proveedor_cuenta?: string,
 *   instructions?: string,
 *   prioridad?: string,
 *   cargas: Array<{
 *     equipo_id: string,
 *     equipo_alias: string,
 *     tipo_combustible: string,
 *     litros_solicitados: number,
 *     precio_litro_estimado?: number,
 *     horometro_lectura?: number,
 *     horometro_foto_url?: string,
 *     operador_employee_id?: string,
 *   }>
 * }
 *
 * 04-Jun-2026
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { notifyOps } from "@/lib/notify-ops";

const log = logger("REQ-COMBUSTIBLE");

interface Carga {
  equipo_id: string;
  equipo_alias: string;
  tipo_combustible: "DIESEL" | "MAGNA" | "PREMIUM";
  litros_solicitados: number;
  precio_litro_estimado?: number;
  horometro_lectura?: number;
  horometro_foto_url?: string;
  ticket_foto_url?: string;
  operador_employee_id?: string;
  notas?: string;
}

interface Body {
  centro_trabajo_id?: string;
  centro_trabajo_name: string;
  user_email: string;
  solicitante_nombre_completo?: string;
  forma_pago?: string;
  fecha_pago?: string | null;
  proveedor?: string;
  proveedor_banco?: string;
  proveedor_clabe?: string;
  proveedor_cuenta?: string;
  proveedor_razon_social?: string;
  instructions?: string;
  prioridad?: string;
  motivo_solicitud?: string;
  iva_porcentaje?: number;
  cargas: Carga[];
}

export async function POST(req: NextRequest) {
  try {
    const db = getSupabaseAdmin();
    const body = (await req.json()) as Body;

    if (!body.user_email) return NextResponse.json({ error: "user_email requerido" }, { status: 400 });
    if (!body.cargas?.length) return NextResponse.json({ error: "al menos 1 carga" }, { status: 400 });

    // Calcular totales
    const subtotal = body.cargas.reduce((s, c) => s + Number(c.litros_solicitados || 0) * Number(c.precio_litro_estimado || 0), 0);
    const ivaPorc = Number(body.iva_porcentaje || 0);
    const ivaMonto = subtotal * (ivaPorc / 100);
    const total = subtotal + ivaMonto;

    // 1. Crear requisicion cabecera (status PENDIENTE, tipo combustible)
    const litrosTotales = body.cargas.reduce((s, c) => s + Number(c.litros_solicitados || 0), 0);
    const maquinasCount = body.cargas.length;
    const motivoAuto = body.motivo_solicitud ||
      `${body.cargas[0]?.tipo_combustible} ${litrosTotales}L para ${maquinasCount} ${maquinasCount === 1 ? "maquina" : "maquinas"}`;

    const { data: reqRow, error: e1 } = await db.from("requisitions").insert({
      cost_center_id: body.centro_trabajo_id || null,
      cost_center_name: body.centro_trabajo_name,
      user_email: body.user_email,
      created_by: body.solicitante_nombre_completo || body.user_email,
      status: "PENDIENTE",
      prioridad: body.prioridad || "NORMAL",
      categoria: "COMBUSTIBLES",
      subcategoria: "COMBUSTIBLES",
      canal_origen: "WEB",
      forma_pago: body.forma_pago || "Transferencia",
      fecha_pago: body.fecha_pago || null,
      iva_porcentaje: ivaPorc,
      iva_monto: ivaMonto,
      subtotal,
      total,
      monto: subtotal,
      instructions: body.instructions || null,
      motivo_solicitud: motivoAuto,
      solicitante_nombre_completo: body.solicitante_nombre_completo || null,
      proveedor: body.proveedor || null,
      banco: body.proveedor_banco || null,
      clabe_interbancaria: body.proveedor_clabe || null,
      numero_cuenta: body.proveedor_cuenta || null,
      nombre_cuenta: body.proveedor_razon_social || null,
      required_date: body.fecha_pago || new Date().toISOString().slice(0, 10),
    }).select("id, folio").single();

    if (e1 || !reqRow) {
      log.error("insert requisition fallo", { err: e1?.message });
      return NextResponse.json({ error: "Error creando requisicion: " + (e1?.message || "?") }, { status: 500 });
    }

    const reqId = (reqRow as { id: string; folio: string }).id;
    const folio = (reqRow as { id: string; folio: string }).folio;

    // 2. Insertar cargas
    const cargasRows = body.cargas.map((c) => ({
      requisition_id: reqId,
      equipo_id: c.equipo_id,
      equipo_alias_snapshot: c.equipo_alias,
      tipo_combustible: c.tipo_combustible,
      litros_solicitados: Number(c.litros_solicitados || 0),
      precio_litro_estimado: c.precio_litro_estimado != null ? Number(c.precio_litro_estimado) : null,
      total_estimado: Number(c.litros_solicitados || 0) * Number(c.precio_litro_estimado || 0),
      horometro_lectura: c.horometro_lectura != null ? Number(c.horometro_lectura) : null,
      horometro_foto_url: c.horometro_foto_url || null,
      ticket_foto_url: c.ticket_foto_url || null,
      operador_employee_id: c.operador_employee_id || null,
      notas: c.notas || null,
    }));
    const { error: e2 } = await db.from("combustible_cargas").insert(cargasRows);
    if (e2) {
      log.warn("insert cargas fallo (req creada)", { reqId, err: e2.message });
      // No rollback - la requi vale aunque las cargas fallen
    }

    // 3. Tambien insertar como requisition_items para mantener compatibilidad con flujos existentes
    const itemsRows = body.cargas.map((c) => ({
      requisition_id: reqId,
      product_name: `${c.tipo_combustible} ${c.equipo_alias}` + (c.horometro_lectura ? ` (Horometro: ${c.horometro_lectura})` : ""),
      unit: "L",
      quantity: Number(c.litros_solicitados || 0),
      selected_price: c.precio_litro_estimado != null ? Number(c.precio_litro_estimado) : null,
      comments: c.notas || (c.horometro_foto_url ? "Foto horometro adjunta" : null),
    }));
    await db.from("requisition_items").insert(itemsRows);

    log.info("Req combustible creada", { folio, reqId, cargas: body.cargas.length, litros: litrosTotales });

    // Notif a equipo Compras / Fernando: WA template + email con thumbnails
    const resumenCargas = body.cargas.map((c) =>
      `${c.equipo_alias} (${c.tipo_combustible}) ${c.litros_solicitados}L` +
      (c.horometro_lectura ? ` horometro ${c.horometro_lectura}` : "")
    ).join(" | ");

    void notifyOps({
      evento: "REQUISICION_CREADA",
      resumen: `${folio} COMBUSTIBLE — ${maquinasCount} maq / ${litrosTotales}L`,
      detalle: resumenCargas,
      actor: body.solicitante_nombre_completo || body.user_email,
      metadata: {
        folio,
        es_combustible: true,
        proveedor: body.proveedor || null,
        total_estimado: total,
        cargas: body.cargas.map((c) => ({
          maquina: c.equipo_alias,
          tipo: c.tipo_combustible,
          litros: c.litros_solicitados,
          horometro: c.horometro_lectura,
          horometro_foto: c.horometro_foto_url,
        })),
      },
    }).catch((err) => log.warn("notifyOps falló", { err: String(err) }));

    return NextResponse.json({
      ok: true,
      id: reqId,
      folio,
      total,
      cargas_count: body.cargas.length,
    });
  } catch (e: unknown) {
    log.error("exception", { err: (e as Error).message });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
