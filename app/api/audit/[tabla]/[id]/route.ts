import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const log = logger("API-AUDIT-ENTITY");

// GET /api/audit/[tabla]/[id]
// Retorna historial de cambios (audit_log) para un registro específico.
// Cualquier usuario autenticado con acceso al módulo puede ver su historial.
export async function GET(req: NextRequest, { params }: { params: Promise<{ tabla: string; id: string }> }) {
  try {
    const rl = checkRateLimit(getClientIdentifier(req), { key: "audit:entity", ...RATE_LIMITS.READ });
    if (!rl.allowed) return rateLimitResponse(rl);

    const { tabla, id } = await params;
    if (!tabla || !id) {
      return NextResponse.json({ error: "tabla e id requeridos" }, { status: 400 });
    }

    // Whitelist: tablas permitidas para audit trail visible en UI
    const ALLOWED_TABLES = new Set([
      "requisitions", "purchase_orders", "employees", "suppliers", "products",
      "cobros_manuales", "cotizaciones_clientes", "activos", "mantenimiento_activos",
      "entregas", "pagos", "gastos_obra", "incidencias", "vacaciones", "prestamos",
      "incapacidades", "finiquitos", "polizas", "siroc_registros", "bitacora_obra",
      "obra_avances", "estimaciones", "contratos", "Users", "centros_trabajo",
      "facturas_recibidas", "facturas_emitidas", "conciliacion_bancaria", "caja_chica",
      "cobros_obra", "movimientos_bancarios", "tareas_talento", "tareas_obra",
      "documentos_corporativos", "planos", "expedientes_items", "inventario_movimientos",
    ]);
    if (!ALLOWED_TABLES.has(tabla)) {
      return NextResponse.json({ error: "tabla no permitida para audit" }, { status: 403 });
    }

    const sb = getSupabaseAdmin();
    // Schema audit_log: id, table_name, op, row_pk, actor, changed_at, before, after
    const { data, error } = await sb
      .from("audit_log")
      .select("id, changed_at, actor, op, table_name, row_pk, before, after")
      .eq("table_name", tabla)
      .eq("row_pk", id)
      .order("changed_at", { ascending: false })
      .limit(100);

    if (error) {
      log.error("query audit_log fallo:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entries: data || [], count: data?.length || 0 });
  } catch (e: unknown) {
    log.error("Error inesperado:", e);
    return NextResponse.json({ error: (e as {message?: string})?.message || "Error" }, { status: 500 });
  }
}
