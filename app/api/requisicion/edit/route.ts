// app/api/requisicion/edit/route.ts
// 7-May-2026 — Edicion de requisicion despues de creada.
//
// REGLA: editable mientras status NO este en bloqueados (AUTORIZADA / OC_GENERADA / CANCELADA).
//
// Body JSON:
//   {
//     id: string,                                  // requisition.id
//     fields: {                                    // delta a aplicar (solo campos a cambiar)
//       cost_center_name?, instructions?, motivo_solicitud?, descripcion_compra?,
//       forma_pago?, fecha_pago?, foto_ticket_url?, monto?, ...
//     },
//     items?: Array<{                              // si se editan items
//       id?: number,                               // existente (si no, se crea)
//       product_name: string,
//       unit?: string,
//       quantity: number,
//       selected_price?: number,
//       comments?: string,
//     }>,
//     deleted_item_ids?: number[],                 // ids a borrar
//     actor: string,                               // email/nombre del usuario
//   }

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { notifyOps } from "@/lib/notify-ops";

const log = logger("REQ-EDIT");

const STATUS_BLOQUEADOS = ["AUTORIZADA", "OC_GENERADA", "CANCELADA"];

const ALLOWED_FIELDS = new Set([
  "cost_center_name",
  "instructions",
  "motivo_solicitud",
  "descripcion_compra",
  "forma_pago",
  "fecha_pago",
  "forma_entrega",
  "fecha_entrega",
  "foto_ticket_url",
  "monto",
  "subtotal",
  "iva_porcentaje",
  "iva_monto",
  "total",
  "uso",
  "notas",
  "subcategoria",
  "categoria",
  "proveedor",
  "nombre_cuenta",
  "banco",
  "numero_cuenta",
  "clabe_interbancaria",
  "tipo_pago",
  "solicitante_nombre_completo",
  "required_date",
]);

interface ItemEdit {
  id?: number;
  product_name?: string;
  unit?: string;
  quantity?: number;
  selected_price?: number;
  comments?: string;
}

export async function PATCH(req: NextRequest) {
  try {
    const sb = getSupabaseAdmin();
    const body = await req.json();
    const id: string = String(body.id || "");
    const fields: Record<string, unknown> = body.fields || {};
    const items: ItemEdit[] = Array.isArray(body.items) ? body.items : [];
    const deletedItemIds: number[] = Array.isArray(body.deleted_item_ids) ? body.deleted_item_ids : [];
    const actor: string = String(body.actor || "sistema");

    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    // 1. Lock: leer status actual
    const { data: current, error: e1 } = await sb
      .from("requisitions")
      .select("id, folio, status, cost_center_name, monto, total")
      .eq("id", id)
      .single();
    if (e1 || !current) {
      return NextResponse.json({ error: "Requisicion no encontrada" }, { status: 404 });
    }

    const cur = current as { id: string; folio: string; status: string; cost_center_name: string; monto: number | null; total: number | null };
    if (STATUS_BLOQUEADOS.includes(cur.status)) {
      return NextResponse.json({
        error: `Requisicion en status ${cur.status} no se puede editar. Solo editable mientras NO este AUTORIZADA, OC_GENERADA o CANCELADA.`,
      }, { status: 409 });
    }

    // 2. Validar fields
    const safeFields: Record<string, unknown> = {};
    const changed: string[] = [];
    for (const k of Object.keys(fields)) {
      if (!ALLOWED_FIELDS.has(k)) continue;
      safeFields[k] = fields[k];
      changed.push(k);
    }

    // 3. Update requisition
    if (Object.keys(safeFields).length > 0) {
      const { error: e2 } = await sb.from("requisitions").update(safeFields).eq("id", id);
      if (e2) {
        log.error("Update requisition fallo", { id, err: e2.message });
        return NextResponse.json({ error: "Update fallo: " + e2.message }, { status: 500 });
      }
    }

    // 4. Eliminar items marcados
    if (deletedItemIds.length > 0) {
      const { error: e3 } = await sb.from("requisition_items").delete().in("id", deletedItemIds);
      if (e3) log.warn("Delete items fallo", { ids: deletedItemIds, err: e3.message });
    }

    // 5. Update / Insert items
    let itemsActualizados = 0;
    let itemsNuevos = 0;
    for (const it of items) {
      if (it.id) {
        const { error } = await sb.from("requisition_items").update({
          product_name: it.product_name,
          unit: it.unit || "PZA",
          quantity: Number(it.quantity || 1),
          selected_price: it.selected_price != null ? Number(it.selected_price) : null,
          comments: it.comments || null,
        }).eq("id", it.id);
        if (!error) itemsActualizados++;
      } else if (it.product_name) {
        const { error } = await sb.from("requisition_items").insert({
          requisition_id: id,
          product_name: it.product_name,
          unit: it.unit || "PZA",
          quantity: Number(it.quantity || 1),
          selected_price: it.selected_price != null ? Number(it.selected_price) : null,
          comments: it.comments || null,
        });
        if (!error) itemsNuevos++;
      }
    }

    // 6. Recalcular subtotal/iva_monto/total/monto si se editaron items o cambio iva_porcentaje
    if (items.length > 0 || deletedItemIds.length > 0 || safeFields.iva_porcentaje !== undefined) {
      const { data: itemsAll } = await sb
        .from("requisition_items")
        .select("quantity, selected_price")
        .eq("requisition_id", id);
      const subtotal = (itemsAll || []).reduce((s: number, r: { quantity: number; selected_price: number | null }) => {
        return s + Number(r.quantity || 0) * Number(r.selected_price || 0);
      }, 0);

      // Leer iva_porcentaje actualizado (preferir el delta enviado, sino el de BD)
      let ivaPorc = 0;
      if (safeFields.iva_porcentaje !== undefined) {
        ivaPorc = Number(safeFields.iva_porcentaje) || 0;
      } else {
        const { data: row } = await sb.from("requisitions").select("iva_porcentaje").eq("id", id).single();
        ivaPorc = Number((row as { iva_porcentaje?: number })?.iva_porcentaje || 0);
      }
      const ivaMonto = subtotal * (ivaPorc / 100);
      const total = subtotal + ivaMonto;

      await sb.from("requisitions").update({
        monto: subtotal,
        subtotal,
        iva_monto: ivaMonto,
        total,
      }).eq("id", id);

      log.info("Recalculo cabecera", { id, folio: cur.folio, subtotal, ivaPorc, ivaMonto, total });
    }

    // 7. Audit log + notifyOps
    const detalleCambio = [
      changed.length > 0 ? `Campos: ${changed.join(", ")}` : null,
      itemsActualizados > 0 ? `Items actualizados: ${itemsActualizados}` : null,
      itemsNuevos > 0 ? `Items nuevos: ${itemsNuevos}` : null,
      deletedItemIds.length > 0 ? `Items eliminados: ${deletedItemIds.length}` : null,
    ].filter(Boolean).join(" | ");

    if (detalleCambio) {
      // Si estaba EN_AUTORIZACION, re-notificar a Direccion para que sepa del cambio
      const eventoTipo = cur.status === "EN_AUTORIZACION" ? "REQUISICION_CREADA" : "REQUISICION_CREADA";
      void notifyOps({
        evento: eventoTipo,
        resumen: `${cur.folio} ${cur.cost_center_name} EDITADA`,
        detalle: detalleCambio,
        actor,
        metadata: { folio: cur.folio, status_actual: cur.status, edited: true },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      folio: cur.folio,
      status: cur.status,
      changed_fields: changed,
      items_updated: itemsActualizados,
      items_new: itemsNuevos,
      items_deleted: deletedItemIds.length,
    });
  } catch (e: unknown) {
    log.error("Edit exception", { err: (e as Error).message });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
