/**
 * POST /api/inventario/tipo
 * Cambia el tipo (MATERIAL|HERRAMIENTA) de una fila de inventario_obra sin borrar el item.
 *
 * Body: { id: uuid, tipo: "MATERIAL" | "HERRAMIENTA", user_email?: string }
 *
 * - Actualiza inventario_obra.tipo.
 * - NO recalcula folio_inventario automaticamente (para evitar races);
 *   JJ puede correr el UPDATE bulk por obra cuando quiera reasignar folios.
 * - Inserta un registro en inventario_movimientos con tipo_referencia="CAMBIO_TIPO"
 *   para auditoria.
 *
 * PR feat/inventario-toggle-tipo-23abr2026.
 */
import { NextResponse, NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const log = logger("INVENTARIO-TIPO");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    const tipoNuevo = String(body?.tipo || "").toUpperCase();
    const userEmail = String(body?.user_email || "").trim() || "anon";

    if (!id || !["MATERIAL", "HERRAMIENTA"].includes(tipoNuevo)) {
      return NextResponse.json({ error: "Parametros invalidos: id + tipo (MATERIAL|HERRAMIENTA)" }, { status: 400 });
    }

    const clientId = getClientIdentifier(req, userEmail);
    const rl = checkRateLimit(clientId, { key: "inv:toggle-tipo", ...RATE_LIMITS.WRITE });
    if (!rl.allowed) return rateLimitResponse(rl);

    const supa = getSupabaseAdmin();

    const { data: current, error: readErr } = await supa
      .from("inventario_obra")
      .select("id, producto_nombre, obra_nombre, tipo, folio_inventario, cantidad_disponible")
      .eq("id", id)
      .single();
    if (readErr || !current) {
      log.error("No se encontro item", { id, err: readErr?.message });
      return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });
    }

    if (String(current.tipo || "").toUpperCase() === tipoNuevo) {
      return NextResponse.json({ ok: true, unchanged: true });
    }

    const { error: updErr } = await supa
      .from("inventario_obra")
      .update({ tipo: tipoNuevo })
      .eq("id", id);
    if (updErr) {
      log.error("Error update tipo", { id, err: updErr.message });
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    try {
      await supa.from("inventario_movimientos").insert({
        obra_nombre: current.obra_nombre,
        producto_nombre: current.producto_nombre,
        tipo: "AJUSTE",
        cantidad: 0,
        referencia_tipo: "CAMBIO_TIPO",
        referencia_id: id,
        usuario: userEmail,
        nota: `Tipo cambiado ${current.tipo || "MATERIAL"} -> ${tipoNuevo}. Folio ${current.folio_inventario || "-"} se conserva.`,
      });
    } catch (auditErr: unknown) {
      // Audit fail no bloquea flujo
      log.error("No se pudo escribir auditoria inventario_movimientos", { id, err: (auditErr as Error).message });
    }

    return NextResponse.json({
      ok: true,
      id,
      tipo_anterior: current.tipo || "MATERIAL",
      tipo_nuevo: tipoNuevo,
      folio_inventario: current.folio_inventario || null,
      aviso_folio: "Folio conservado. Para reasignar folios HER/MAT correr UPDATE bulk por obra.",
    });
  } catch (e: unknown) {
    log.error("Exception", { err: (e as Error).message });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
