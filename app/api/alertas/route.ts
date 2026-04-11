import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const log = logger("ALERTAS");
const supabase = getSupabaseAdmin();

interface Alerta {
  id: string;
  tipo: "URGENTE" | "ATENCION" | "INFO";
  modulo: string;
  titulo: string;
  detalle: string;
  link?: string;
  fecha: string;
}

interface ReqPendiente {
  id: string;
  folio: string;
  created_at: string;
  cost_center_name: string;
}

interface OCAtrasada {
  id: string;
  po_number: string;
  created_at: string;
  supplier_name: string;
  status: string;
  obra_nombre: string | null;
}

interface CobroVencido {
  id: string;
  folio: string | null;
  monto: number | null;
  fecha: string;
  cliente_nombre: string;
  estatus: string;
}

interface MovimientoPendiente {
  id: string;
  banco: string;
  monto: number | null;
  fecha_movimiento: string;
  concepto: string | null;
  status_match: string | null;
}

interface CotizacionVencida {
  id: string;
  folio: string;
  cliente_nombre: string;
  total: number | null;
  fecha_vencimiento: string;
  status: string;
}

interface BitacoraIncidente {
  id: string;
  obra_nombre: string;
  fecha: string;
  incidentes: string;
}

interface InventarioBajo {
  id: string;
  obra_nombre: string;
  producto_nombre: string;
  cantidad_disponible: number;
  unidad: string;
}

export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(getClientIdentifier(req), { key: "alertas:list", ...RATE_LIMITS.READ });
    if (!rl.allowed) return rateLimitResponse(rl);

    // AUTH
    let userEmail: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data: { user } } = await auth.auth.getUser(authHeader.replace("Bearer ", ""));
      if (user?.email) userEmail = user.email;
    }
    if (!userEmail) {
      const hdr = req.headers.get("x-user-email");
      if (hdr) {
        const { data: u } = await supabase.from("users").select("email,active").eq("email", hdr).maybeSingle();
        if (u && u.active !== false) userEmail = u.email;
      }
    }
    if (!userEmail) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const alertas: Alerta[] = [];
    const hoy = new Date();
    const en7 = new Date(hoy.getTime() + 7 * 86400000);
    const hace30 = new Date(hoy.getTime() - 30 * 86400000);

    // 1) Requisiciones pendientes de validación
    const { data: reqsPend } = await supabase
      .from("requisitions")
      .select("id, folio, created_at, cost_center_name")
      .in("status", ["PENDIENTE_VALIDACION", "EN_VALIDACION"])
      .lt("created_at", new Date(hoy.getTime() - 2 * 86400000).toISOString())
      .limit(50);
    (reqsPend || []).forEach((r: ReqPendiente) => alertas.push({
      id: `req-${r.id}`,
      tipo: "ATENCION",
      modulo: "Requisiciones",
      titulo: `${r.folio} pendiente de validación`,
      detalle: `${r.cost_center_name} · creada hace +2 días`,
      link: `/dashboard/requisiciones/${r.id}`,
      fecha: r.created_at,
    }));

    // 2) OCs sin recibir > 7 días
    const { data: ocsAtrasadas } = await supabase
      .from("purchase_orders")
      .select("id, po_number, created_at, supplier_name, status, obra_nombre")
      .in("status", ["APROBADA", "EN_PROCESO"])
      .lt("created_at", new Date(hoy.getTime() - 7 * 86400000).toISOString())
      .limit(50);
    (ocsAtrasadas || []).forEach((o: OCAtrasada) => alertas.push({
      id: `oc-${o.id}`,
      tipo: "URGENTE",
      modulo: "Órdenes de Compra",
      titulo: `${o.po_number} sin recibir > 7 días`,
      detalle: `${o.supplier_name} · ${o.obra_nombre || ""}`,
      link: `/dashboard/requisiciones`,
      fecha: o.created_at,
    }));

    // 3) Cobros vencidos (fecha pasada y estatus PENDIENTE)
    const { data: cobrosVenc } = await supabase
      .from("cobros_manuales")
      .select("id, folio, monto, fecha, cliente_nombre, estatus")
      .eq("estatus", "PENDIENTE")
      .lt("fecha", hoy.toISOString().slice(0, 10))
      .limit(50);
    (cobrosVenc || []).forEach((c: CobroVencido) => alertas.push({
      id: `cob-${c.id}`,
      tipo: "URGENTE",
      modulo: "Cobranza",
      titulo: `${c.folio || c.id.slice(0, 8)} vencido`,
      detalle: `${c.cliente_nombre} · $${Number(c.monto || 0).toLocaleString()}`,
      link: `/dashboard/finanzas/cobranza`,
      fecha: c.fecha,
    }));

    // 4) Movimientos bancarios pendientes de conciliar > 5 días
    const { data: movsPend } = await supabase
      .from("conciliacion_bancaria")
      .select("id, banco, monto, fecha_movimiento, concepto, status_match")
      .or("status_match.is.null,status_match.eq.PENDIENTE")
      .lt("fecha_movimiento", new Date(hoy.getTime() - 5 * 86400000).toISOString().slice(0, 10))
      .limit(50);
    (movsPend || []).forEach((m: MovimientoPendiente) => alertas.push({
      id: `mov-${m.id}`,
      tipo: "ATENCION",
      modulo: "Bancos",
      titulo: `Movimiento sin conciliar > 5 días`,
      detalle: `${m.banco} · ${m.concepto || ""} · $${Number(m.monto || 0).toLocaleString()}`,
      link: `/dashboard/finanzas/bancos/movimientos`,
      fecha: m.fecha_movimiento,
    }));

    // 5) Cotizaciones vencidas
    const { data: cotsVenc } = await supabase
      .from("cotizaciones_clientes")
      .select("id, folio, cliente_nombre, total, fecha_vencimiento, status")
      .eq("status", "VENCIDA")
      .gte("fecha_vencimiento", hace30.toISOString().slice(0, 10))
      .limit(50);
    (cotsVenc || []).forEach((c: CotizacionVencida) => alertas.push({
      id: `cot-${c.id}`,
      tipo: "INFO",
      modulo: "Cotizaciones",
      titulo: `${c.folio} vencida`,
      detalle: `${c.cliente_nombre} · $${Number(c.total || 0).toLocaleString()}`,
      link: `/dashboard/cotizaciones`,
      fecha: c.fecha_vencimiento,
    }));

    // 6) Bitácoras con incidentes hoy
    const { data: bitInc } = await supabase
      .from("bitacora_obra")
      .select("id, obra_nombre, fecha, incidentes")
      .gte("fecha", new Date(hoy.getTime() - 2 * 86400000).toISOString().slice(0, 10))
      .not("incidentes", "is", null)
      .limit(50);
    (bitInc || []).filter((b: BitacoraIncidente) => b.incidentes && b.incidentes.trim().length > 0).forEach((b: BitacoraIncidente) => alertas.push({
      id: `bit-${b.id}`,
      tipo: "URGENTE",
      modulo: "Bitácora",
      titulo: `Incidente reportado en ${b.obra_nombre}`,
      detalle: b.incidentes.slice(0, 120),
      link: `/dashboard/obras/bitacora?obra=${encodeURIComponent(b.obra_nombre)}`,
      fecha: b.fecha,
    }));

    // 7) Inventario stock bajo (≤5)
    const { data: invBajo } = await supabase
      .from("inventario_obra")
      .select("id, obra_nombre, producto_nombre, cantidad_disponible, unidad")
      .lte("cantidad_disponible", 5)
      .gt("cantidad_disponible", 0)
      .limit(30);
    (invBajo || []).forEach((i: InventarioBajo) => alertas.push({
      id: `inv-${i.id}`,
      tipo: "INFO",
      modulo: "Inventario",
      titulo: `Stock bajo: ${i.producto_nombre}`,
      detalle: `${i.obra_nombre} · ${i.cantidad_disponible} ${i.unidad}`,
      link: `/dashboard/obras/inventario`,
      fecha: hoy.toISOString(),
    }));

    // Ordenar: URGENTE > ATENCION > INFO, luego por fecha desc
    const peso = { URGENTE: 0, ATENCION: 1, INFO: 2 } as const;
    alertas.sort((a, b) => peso[a.tipo] - peso[b.tipo] || (b.fecha > a.fecha ? 1 : -1));

    log.info("alertas generadas", { total: alertas.length, userEmail });
    return NextResponse.json({
      total: alertas.length,
      urgentes: alertas.filter(a => a.tipo === "URGENTE").length,
      atencion: alertas.filter(a => a.tipo === "ATENCION").length,
      info: alertas.filter(a => a.tipo === "INFO").length,
      alertas,
    });
  } catch (e: unknown) {
    log.error("alertas fail", { err: (e as {message?: string})?.message });
    return NextResponse.json({ error: (e as {message?: string})?.message || "Error interno" }, { status: 500 });
  }
}
