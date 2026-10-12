/**
 * /api/requisicion/entrega — ARIA27 Campo F3 (10-Oct-2026)
 * POST: registra la evidencia de entrega de una requisición desde el celular.
 * body { requisition_id, items:[{product_name, unit, quantity, recibida}], recibido_por, nota, lat, lng, foto_url, completa }
 * - Inserta en `entregas` (ligada a requi y a OC si existe)
 * - requisitions.status = ENTREGADA | ENTREGA_PARCIAL, fecha_entrega, recibio
 * - WA al creador (si no es quien registra) + event_log
 * No toca inventario (eso sigue en registrar-entrega con OC).
 * AUTH: requireUser. Permiso: creador, compras, validador, residente, admin, rh.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { sendWhatsAppTemplateOrFallback } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
const log = logger("REQ-ENTREGA");

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.res;
    const b = await req.json().catch(() => ({}));
    const id = String(b.requisition_id || "");
    if (!id) return NextResponse.json({ error: "requisition_id requerido" }, { status: 400 });
    const items = Array.isArray(b.items) ? b.items as Array<{ product_name: string; unit?: string; quantity: number; recibida: number }> : [];

    const db = getSupabaseAdmin();
    const { data: r } = await db.from("requisitions").select("id, folio, status, cost_center_name, proveedor, user_email, created_by, tipo_solicitud, purchase_status, forma_pago, comprobante_pago_url").eq("id", id).maybeSingle();
    if (!r) return NextResponse.json({ error: "Requisición no encontrada" }, { status: 404 });
    const role = (auth.role || "").toLowerCase(); const me = auth.email.toLowerCase();
    const puede = ["admin", "compras", "validador", "residente", "rh", "almacen"].includes(role) || (r.user_email || "").toLowerCase() === me;
    if (!puede) return NextResponse.json({ error: "No autorizado para registrar entregas" }, { status: 403 });
    if (["ENTREGADA", "CANCELADA", "RECHAZADA_RESPONSABLE", "RECHAZADA_DIRECCION", "PENDIENTE_RESPONSABLE"].includes(String(r.status))) {
      return NextResponse.json({ error: `No se puede registrar entrega en status ${r.status}` }, { status: 409 });
    }

    const { data: oc } = await db.from("purchase_orders").select("id, folio").eq("requisition_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const { count } = await db.from("entregas").select("*", { count: "exact", head: true });
    const folio = `ENT-${String((count || 0) + 1).padStart(5, "0")}`;
    const completa = b.completa !== false && items.every(i => Number(i.recibida) >= Number(i.quantity));
    const now = new Date();
    const lat = b.lat != null ? Number(b.lat) : null; const lng = b.lng != null ? Number(b.lng) : null;

    const { data: ent, error } = await db.from("entregas").insert({
      folio, requisicion_id: id, purchase_order_id: oc?.id || null, purchase_order_folio: oc?.folio || null,
      fecha_entrega: now.toISOString().slice(0, 10), hora_entrega: now.toTimeString().slice(0, 5),
      proveedor_nombre: r.proveedor || null, obra_nombre: r.cost_center_name || null,
      recibido_por_nombre: String(b.recibido_por || auth.email).slice(0, 120), registrado_por: me,
      status: completa ? "COMPLETA" : "PARCIAL", materiales_recibidos: items,
      latitud: lat, longitud: lng, ubicacion_entrega: lat != null && lng != null ? `${lat},${lng}` : null,
      notas: String(b.nota || "").slice(0, 1000) || null, foto_url: b.foto_url ? String(b.foto_url) : null,
      foto_uploaded_at: b.foto_url ? now.toISOString() : null, solicitante_email: r.user_email || null,
    }).select("id, folio").single();
    if (error) { log.error("insert entregas", { err: error.message }); return NextResponse.json({ error: error.message }, { status: 500 }); }

    await db.from("requisitions").update({ status: completa ? "ENTREGADA" : "ENTREGA_PARCIAL", fecha_entrega: now.toISOString().slice(0, 10), recibio: String(b.recibido_por || auth.email).slice(0, 120) }).eq("id", id);
    // 11-Oct-2026 · JJ: en gastos en efectivo, al recibir ya se pagó → la foto del ticket/factura queda como comprobante de pago
    const esEfectivo = r.purchase_status === "GASTO_EFECTIVO_PENDIENTE" || /EFECTIVO|CAJA/i.test(String(r.forma_pago || ""));
    const comprobante = (String(b.nota || "").match(/https?:\/\/\S+/) || [])[0] || (b.foto_url ? String(b.foto_url) : null);
    if (esEfectivo && !r.comprobante_pago_url && comprobante) {
      await db.from("requisitions").update({ comprobante_pago_url: comprobante }).eq("id", id);
    }
    await db.from("event_log").insert({ tipo: "ENTREGA_REGISTRADA", resumen: `${r.folio} ${r.cost_center_name} entregada (${completa ? "completa" : "parcial"})`, detalle: b.nota || null, actor: me, metadata: { folio: r.folio, entrega: folio, foto: !!b.foto_url, gps: lat != null } }).then(() => {}, () => {});

    if ((r.user_email || "").toLowerCase() !== me) {
      const { data: cu } = await db.from("Users").select("phone, name, display_name").eq("email", r.user_email).maybeSingle();
      const u = cu as { phone?: string | null; name?: string | null; display_name?: string | null } | null;
      if (u?.phone) {
        const nom = (u.display_name || u.name || "Equipo").slice(0, 60);
        await sendWhatsAppTemplateOrFallback(
          { template: "aria_solicitud_estado", params: [nom, String(r.folio), String(r.cost_center_name), `entrega ${completa ? "completa" : "parcial"} registrada por ${me}${b.foto_url ? " con foto" : ""}`.slice(0, 200)], buttonToken: id },
          { template: "aria_tarea_status", params: [nom, "0", `📦 ${r.folio} ${r.cost_center_name}: entrega ${completa ? "completa" : "parcial"} registrada por ${me}${b.foto_url ? " con foto" : ""}.`.slice(0, 700)] },
          u.phone, { origen: "entrega-registrada", enviadoPor: me });
      }
    }
    log.info("entrega", { folio: r.folio, entrega: folio, completa, by: me });
    return NextResponse.json({ success: true, entrega: ent, status: completa ? "ENTREGADA" : "ENTREGA_PARCIAL" });
  } catch (e: unknown) {
    log.error("exception", { err: (e as Error)?.message });
    return NextResponse.json({ error: (e as Error)?.message || "Error" }, { status: 500 });
  }
}
