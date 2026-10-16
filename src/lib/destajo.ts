/** Pagos a destajistas (16-Oct-2026 · duda de Daisy): el "saldo" mezclaba lo ya autorizado con lo que apenas va en trámite. */
export const AUTORIZADOS = ["AUTORIZADA_HISTORICO", "APROBADA", "OC_GENERADA", "PAGADA", "ENTREGA_PARCIAL", "ENTREGADA"];
export const EN_TRAMITE = ["PENDIENTE_RESPONSABLE", "PENDIENTE", "EN_COTIZACION", "EN_AUTORIZACION"];
export const DESCARTADOS = ["CANCELADA", "RECHAZADA_DIRECCION", "RECHAZADA_RESPONSABLE"];
export type PagoDestajo = { id: string; folio: string | null; created_at: string; status: string | null; destajo_tipo_pago?: string | null; destajo_concepto?: string | null; total?: number | null; monto?: number | null; cost_center_name?: string | null; proveedor?: string | null; comprobante_pago_url?: string | null; fecha_pago?: string | null };
export const montoDe = (r: Pick<PagoDestajo, "total" | "monto">) => Number(r.total ?? r.monto ?? 0) || 0;
export function grupoDe(status?: string | null): "autorizado" | "tramite" | "descartado" {
  const s = String(status || "");
  if (AUTORIZADOS.includes(s)) return "autorizado";
  if (DESCARTADOS.includes(s)) return "descartado";
  return "tramite";
}
export function resumenDestajo(rows: PagoDestajo[]) {
  const r = { autorizado: 0, nAutorizado: 0, tramite: 0, nTramite: 0, total: 0, n: 0 };
  for (const x of rows) {
    const g = grupoDe(x.status); if (g === "descartado") continue;
    const m = montoDe(x); r.total += m; r.n++;
    if (g === "autorizado") { r.autorizado += m; r.nAutorizado++; } else { r.tramite += m; r.nTramite++; }
  }
  return r;
}
export const TIPO_TXT: Record<string, string> = { ANTICIPO: "Anticipo", SEMANA: "Semana", FINIQUITO: "Finiquito" };
