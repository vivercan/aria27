// app/api/requisicion/[id]/duplicar/route.ts
// 23-Jul-2026 — Duplicar requisicion con folio nuevo (requis recurrentes semanales).
// Pedido por Compras (Daisy): requis que se repiten cada semana (renta de personal, etc.).
// Clona CONTENIDO (cabecera + items) con folio NUEVO y status PENDIENTE.
// NO arrastra estado de flujo: autorizacion, OC, cotizacion, pagos, conciliacion, recepcion.
// Enlaza el nuevo con el origen via columna duplicado_de.
// monto = total CON IVA (canon FIX 546).

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

const log = logger("REQ-DUPLICAR");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Columnas de CONTENIDO que se copian tal cual (nunca estado de flujo).
const COPY_COLS = [
  "cost_center_id", "cost_center_name", "user_email", "created_by",
  "solicitante_nombre_completo", "categoria", "subcategoria", "prioridad",
  "canal_origen", "forma_pago", "tipo_pago", "forma_entrega",
  "proveedor", "proveedor_nombre", "nombre_cuenta", "banco",
  "numero_cuenta", "clabe_interbancaria", "descripcion_compra",
  "descripcion_corta", "instructions", "motivo_solicitud", "uso",
  "notas", "iva_porcentaje", "required_date", "foto_ticket_url",
];

type Db = ReturnType<typeof getSupabaseAdmin>;

async function getNextFolio(db: Db): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `REQ-${year}-`;
  // Estrategia 1: RPC atomico (mismo que creacion)
  try {
    const { data: rpcData, error: rpcError } = await db.rpc("increment_sequence", { seq_id: "requisitions" });
    if (!rpcError && rpcData !== null && rpcData !== undefined) {
      const next = typeof rpcData === "number" ? rpcData : (rpcData as { current_value: number }).current_value;
      return `${prefix}${String(next).padStart(5, "0")}`;
    }
  } catch (e: unknown) {
    log.warn("RPC increment_sequence fallo, fallback", { error: (e as { message?: string })?.message });
  }
  // Estrategia 2: MAX folio + sequences, tomar el mayor + 1
  const { data: maxFolioData } = await db
    .from("requisitions").select("folio").like("folio", `${prefix}%`)
    .order("folio", { ascending: false }).limit(1);
  let maxNum = 0;
  if (maxFolioData && maxFolioData.length > 0) {
    const parts = (maxFolioData[0] as { folio: string }).folio.split("-");
    maxNum = parseInt(parts[2], 10) || 0;
  }
  const { data: seqData } = await db.from("sequences").select("current_value").eq("id", "requisitions").single();
  const seqNum = (seqData as { current_value?: number } | null)?.current_value || 0;
  const next = Math.max(maxNum, seqNum) + 1;
  await db.from("sequences").upsert({ id: "requisitions", current_value: next }, { onConflict: "id", ignoreDuplicates: false });
  log.warn("Folio via fallback Strategy 2", { next });
  return `${prefix}${String(next).padStart(5, "0")}`;
}

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getSupabaseAdmin();
  try {
    // 1. Leer requisicion origen (solo contenido)
    const { data: src, error: e1 } = await db
      .from("requisitions")
      .select(["folio", ...COPY_COLS].join(", "))
      .eq("id", id)
      .single();
    if (e1 || !src) {
      return NextResponse.json({ success: false, error: "Requisicion origen no encontrada" }, { status: 404 });
    }
    const source = src as Record<string, unknown>;
    const srcFolio = source.folio as string;

    // 2. Leer items origen
    const { data: srcItems } = await db
      .from("requisition_items")
      .select("product_name, sku, unit, quantity, comments, category, subcategory, short_description, long_description, commercial_presentation, type, selected_price, precio_unitario, precio_total, product_id")
      .eq("requisition_id", id);
    const items = (srcItems || []) as Array<Record<string, unknown>>;

    // 3. Recalcular totales (monto = total CON IVA, canon FIX 546)
    const subtotal = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.selected_price || 0), 0);
    const ivaPorc = Number(source.iva_porcentaje || 0);
    const ivaMonto = subtotal * (ivaPorc / 100);
    const total = subtotal + ivaMonto;

    // 4. Folio nuevo
    const folio = await getNextFolio(db);

    // 5. Insertar cabecera nueva
    const nuevaCabecera: Record<string, unknown> = {};
    for (const c of COPY_COLS) nuevaCabecera[c] = source[c] ?? null;
    nuevaCabecera.folio = folio;
    nuevaCabecera.status = "PENDIENTE";
    nuevaCabecera.subtotal = subtotal;
    nuevaCabecera.iva_monto = ivaMonto;
    nuevaCabecera.total = total;
    nuevaCabecera.monto = total;
    nuevaCabecera.duplicado_de = id;

    const { data: nueva, error: e2 } = await db
      .from("requisitions").insert(nuevaCabecera).select("id, folio").single();
    if (e2 || !nueva) {
      log.error("Error insertando cabecera duplicada", { srcFolio, error: e2?.message });
      return NextResponse.json({ success: false, error: e2?.message || "Error creando duplicado" }, { status: 500 });
    }
    const newId = (nueva as { id: string }).id;
    const newFolio = (nueva as { folio: string }).folio;

    // 6. Copiar items (reset de estado de cotizacion)
    if (items.length > 0) {
      const nuevosItems = items.map((it) => ({
        requisition_id: newId,
        product_name: it.product_name,
        sku: it.sku ?? null,
        unit: it.unit ?? "PZA",
        quantity: it.quantity ?? 1,
        comments: it.comments ?? null,
        category: it.category ?? null,
        subcategory: it.subcategory ?? null,
        short_description: it.short_description ?? null,
        long_description: it.long_description ?? null,
        commercial_presentation: it.commercial_presentation ?? null,
        type: it.type ?? null,
        selected_price: it.selected_price ?? null,
        precio_unitario: it.precio_unitario ?? null,
        precio_total: it.precio_total ?? null,
        product_id: it.product_id ?? null,
        is_quoted: false,
        selected_supplier_id: null,
        selected_supplier_name: null,
        director_comments: null,
      }));
      const { error: e3 } = await db.from("requisition_items").insert(nuevosItems);
      if (e3) {
        // Rollback cabecera para no dejar requi huerfana
        await db.from("requisitions").delete().eq("id", newId);
        log.error("Error copiando items, rollback aplicado", { error: e3.message });
        return NextResponse.json({ success: false, error: "Error copiando items: " + e3.message }, { status: 500 });
      }
    }

    log.info("Requisicion duplicada", { origen: srcFolio, nueva: newFolio, items: items.length });
    return NextResponse.json({ success: true, id: newId, folio: newFolio, items: items.length });
  } catch (e: unknown) {
    log.error("Excepcion duplicando", { error: (e as Error).message });
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}
