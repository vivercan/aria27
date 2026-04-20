import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const log = logger("API-SEARCH-GLOBAL");

interface SearchResult {
  type: "obra" | "requisicion" | "cliente" | "proveedor" | "producto" | "empleado" | "oc" | "cotizacion";
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  badge?: string;
}

// GET /api/search/global?q=texto&limit=5
// Búsqueda global sobre obras, requisiciones, clientes, proveedores, productos,
// personal, órdenes de compra y cotizaciones. Top N por tipo, mezclados.
export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(getClientIdentifier(req), { key: "search:global", ...RATE_LIMITS.READ });
    if (!rl.allowed) return rateLimitResponse(rl);

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const limitPerType = Math.min(parseInt(url.searchParams.get("limit") || "5", 10) || 5, 10);

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [], count: 0 });
    }

    const pattern = `%${q}%`;
    const sb = getSupabaseAdmin();
    const results: SearchResult[] = [];

    // 1. Obras (centros_trabajo)
    const { data: obras } = await sb
      .from("centros_trabajo")
      .select("id, name, location")
      .ilike("name", pattern)
      .limit(limitPerType);
    for (const o of obras || []) {
      results.push({
        type: "obra",
        id: String(o.id),
        title: o.name,
        subtitle: o.location || undefined,
        url: `/dashboard/obras/control?obra=${encodeURIComponent(o.name)}`,
        badge: "Obra",
      });
    }

    // 2. Requisiciones (por folio o solicitante)
    const { data: reqs } = await sb
      .from("requisitions")
      .select("id, folio_excel, solicitante, descripcion, status, obra_nombre")
      .or(`folio_excel.ilike.${pattern},solicitante.ilike.${pattern},descripcion.ilike.${pattern}`)
      .limit(limitPerType);
    for (const r of reqs || []) {
      results.push({
        type: "requisicion",
        id: String(r.id),
        title: r.folio_excel || `REQ-${r.id?.substring(0, 8)}`,
        subtitle: `${r.solicitante || "—"} · ${r.obra_nombre || "—"} · ${r.status || "—"}`,
        url: `/dashboard/requisiciones/requisiciones`,
        badge: "Requisición",
      });
    }

    // 3. Clientes
    const { data: clientes } = await sb
      .from("clientes")
      .select("id, nombre, razon_social, rfc")
      .or(`nombre.ilike.${pattern},razon_social.ilike.${pattern},rfc.ilike.${pattern}`)
      .limit(limitPerType);
    for (const c of clientes || []) {
      results.push({
        type: "cliente",
        id: String(c.id),
        title: c.nombre || c.razon_social || "Sin nombre",
        subtitle: c.rfc || c.razon_social || undefined,
        url: `/dashboard/clientes`,
        badge: "Cliente",
      });
    }

    // 4. Proveedores (base table "suppliers")
    const { data: provs } = await sb
      .from("suppliers")
      .select("id, nombre, rfc, razon_social")
      .or(`nombre.ilike.${pattern},razon_social.ilike.${pattern},rfc.ilike.${pattern}`)
      .limit(limitPerType);
    for (const p of provs || []) {
      results.push({
        type: "proveedor",
        id: String(p.id),
        title: p.nombre || p.razon_social || "Sin nombre",
        subtitle: p.rfc || undefined,
        url: `/dashboard/requisiciones/proveedores`,
        badge: "Proveedor",
      });
    }

    // 5. Productos (base table "products")
    const { data: prods } = await sb
      .from("products")
      .select("id, nombre, unidad, categoria")
      .ilike("nombre", pattern)
      .limit(limitPerType);
    for (const p of prods || []) {
      results.push({
        type: "producto",
        id: String(p.id),
        title: p.nombre,
        subtitle: `${p.unidad || ""} ${p.categoria ? `· ${p.categoria}` : ""}`.trim() || undefined,
        url: `/dashboard/requisiciones/productos`,
        badge: "Producto",
      });
    }

    // 6. Empleados (base table "employees")
    const { data: emps } = await sb
      .from("employees")
      .select("id, full_name, position, status")
      .or(`full_name.ilike.${pattern},position.ilike.${pattern}`)
      .eq("status", "ACTIVO")
      .limit(limitPerType);
    for (const e of emps || []) {
      results.push({
        type: "empleado",
        id: String(e.id),
        title: e.full_name,
        subtitle: e.position || undefined,
        url: `/dashboard/talento/personal`,
        badge: "Empleado",
      });
    }

    // 7. Órdenes de Compra (purchase_orders)
    const { data: ocs } = await sb
      .from("purchase_orders")
      .select("id, folio, proveedor_nombre, obra_nombre, status, total")
      .or(`folio.ilike.${pattern},proveedor_nombre.ilike.${pattern}`)
      .limit(limitPerType);
    for (const oc of ocs || []) {
      results.push({
        type: "oc",
        id: String(oc.id),
        title: oc.folio || `OC-${oc.id?.substring(0, 8)}`,
        subtitle: `${oc.proveedor_nombre || "—"} · ${oc.obra_nombre || "—"} · ${oc.status || "—"}`,
        url: `/dashboard/requisiciones/requisiciones/ordenes`,
        badge: "OC",
      });
    }

    // 8. Cotizaciones cliente
    const { data: cots } = await sb
      .from("cotizaciones_clientes")
      .select("id, folio, cliente_nombre, status, total")
      .or(`folio.ilike.${pattern},cliente_nombre.ilike.${pattern}`)
      .limit(limitPerType);
    for (const c of cots || []) {
      results.push({
        type: "cotizacion",
        id: String(c.id),
        title: c.folio || `COT-${c.id?.substring(0, 8)}`,
        subtitle: `${c.cliente_nombre || "—"} · ${c.status || "—"}`,
        url: `/dashboard/clientes/cotizaciones`,
        badge: "Cotización",
      });
    }

    return NextResponse.json({ results, count: results.length });
  } catch (e: unknown) {
    log.error("Error búsqueda global:", e);
    return NextResponse.json({ error: (e as {message?: string})?.message || "Error" }, { status: 500 });
  }
}
