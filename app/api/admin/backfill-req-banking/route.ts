/**
 * /api/admin/backfill-req-banking
 * POST — Rellena datos bancarios (banco, clabe_interbancaria, numero_cuenta, nombre_cuenta)
 * en requisitions creadas entre 24-Jun-2026 y hoy, cuyo snapshot quedó vacío por regresión
 * introducida en FIX 541.1 (minimización /api/proveedores/search).
 *
 * SEGURIDAD: Autorización con Bearer CRON_SECRET (mismo mecanismo que /api/backup/restore).
 * Endpoint temporal — borrar después del backfill.
 *
 * Uso:
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *        https://aria.jjcrm27.com/api/admin/backfill-req-banking
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
const log = logger("BACKFILL-REQ-BANKING");

export async function POST(req: NextRequest) {
  // Auth: Bearer CRON_SECRET
  const auth = req.headers.get("authorization") || "";
  const expected = process.env.CRON_SECRET || process.env.DIGEST_TOKEN || "";
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getSupabaseAdmin();
    if (!db) return NextResponse.json({ error: "DB no disponible" }, { status: 500 });

    // 1. Traer requis huérfanas: creadas desde 24-Jun-2026 sin banco pero con proveedor
    const { data: huerfanas, error: e1 } = await db
      .from("requisitions")
      .select("id, folio, proveedor, banco, clabe_interbancaria, numero_cuenta, nombre_cuenta, created_at")
      .gte("created_at", "2026-06-24T18:00:00Z")
      .not("proveedor", "is", null)
      .or("banco.is.null,banco.eq.,clabe_interbancaria.is.null,clabe_interbancaria.eq.");
    if (e1) return NextResponse.json({ error: e1.message, step: "fetch_huerfanas" }, { status: 500 });

    // 2. Para cada huérfana, buscar el proveedor por nombre y traer datos bancarios
    let actualizadas = 0;
    const detalles: { folio: string; proveedor: string; banco?: string | null; clabe_prefix?: string | null; skip?: string }[] = [];
    for (const req of huerfanas || []) {
      const provName = (req.proveedor as string || "").trim();
      if (!provName) { detalles.push({ folio: req.folio as string, proveedor: "", skip: "sin nombre" }); continue; }
      // Buscar proveedor por nombre exacto en suppliers
      const { data: prov } = await db
        .from("suppliers")
        .select("id, name, bank_name, bank_clabe, bank_account_number, razon_social")
        .ilike("name", provName)
        .eq("status", "ACTIVO")
        .limit(1)
        .maybeSingle();
      if (!prov) { detalles.push({ folio: req.folio as string, proveedor: provName, skip: "supplier no encontrado" }); continue; }
      const banco = (prov as { bank_name?: string | null }).bank_name || null;
      const clabe = (prov as { bank_clabe?: string | null }).bank_clabe || null;
      const cuenta = (prov as { bank_account_number?: string | null }).bank_account_number || null;
      const nombreCta = (prov as { razon_social?: string | null }).razon_social || (prov as { name?: string }).name || null;
      if (!banco && !clabe && !cuenta) {
        detalles.push({ folio: req.folio as string, proveedor: provName, skip: "supplier sin datos bancarios" });
        continue;
      }
      // Actualizar la requi
      const update: Record<string, string | null> = {};
      if (banco) update.banco = banco;
      if (clabe) update.clabe_interbancaria = clabe;
      if (cuenta) update.numero_cuenta = cuenta;
      if (nombreCta) update.nombre_cuenta = nombreCta;
      const { error: eUpd } = await db.from("requisitions").update(update).eq("id", req.id);
      if (eUpd) { detalles.push({ folio: req.folio as string, proveedor: provName, skip: "update falló: " + eUpd.message }); continue; }
      actualizadas++;
      detalles.push({ folio: req.folio as string, proveedor: provName, banco, clabe_prefix: clabe ? clabe.substring(0, 6) + "…" : null });
    }

    log.info("backfill completo", { total_huerfanas: huerfanas?.length || 0, actualizadas });
    return NextResponse.json({
      ok: true,
      total_huerfanas: huerfanas?.length || 0,
      actualizadas,
      detalles: detalles.slice(0, 100),
    });
  } catch (e: unknown) {
    log.error("backfill error", { e });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
