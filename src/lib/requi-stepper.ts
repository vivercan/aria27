/**
 * src/lib/requi-stepper.ts — ARIA27 Campo F1 (10-Oct-2026)
 * Linea de estado de una requisicion, derivada de columnas existentes.
 * No agrega columnas: interpreta status + purchase_status + responsable_* + OC/pago/entrega.
 * Las 774 requis historicas sin responsable_* muestran ese paso como "omitido".
 */
export type PasoEstado = "hecho" | "actual" | "pendiente" | "omitido" | "rechazado";
export interface Paso { key: string; label: string; estado: PasoEstado; fecha?: string | null; quien?: string | null }

export interface RequiLike {
  status?: string | null;
  purchase_status?: string | null;
  tipo_solicitud?: string | null;
  forma_pago?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  responsable_email?: string | null;
  responsable_autorizo_at?: string | null;
  responsable_autorizo_by?: string | null;
  authorized_at?: string | null;
  authorized_by?: string | null;
  fecha_pago?: string | null;
  comprobante_pago_url?: string | null;
  fecha_entrega?: string | null;
  recibio?: string | null;
  // opcionales si el caller los junta
  tiene_cotizacion?: boolean;
  tiene_oc?: boolean;
  tiene_entrega?: boolean;
}

const ORDEN = ["PENDIENTE_RESPONSABLE", "PENDIENTE", "EN_COTIZACION", "EN_AUTORIZACION", "APROBADA", "OC_GENERADA", "PAGADA", "ENTREGA_PARCIAL", "ENTREGADA"];
const RECHAZOS = ["RECHAZADA_RESPONSABLE", "RECHAZADA_DIRECCION", "CANCELADA"];

function rank(status: string | null | undefined): number {
  const i = ORDEN.indexOf(String(status || ""));
  return i < 0 ? 1 : i; // desconocido = como PENDIENTE
}

export function buildStepper(r: RequiLike): Paso[] {
  const st = String(r.status || "PENDIENTE");
  const esDestajo = (r.tipo_solicitud || "").toUpperCase() === "DESTAJO";
  const esEfectivo = (r.purchase_status || "") === "GASTO_EFECTIVO_PENDIENTE" || /EFECTIVO/i.test(r.forma_pago || "");
  const rechazada = RECHAZOS.includes(st);
  const rk = rank(st);

  const pasos: Paso[] = [];
  pasos.push({ key: "creada", label: "Solicitada", estado: "hecho", fecha: r.created_at, quien: r.created_by });

  // Responsable de obra
  if (r.responsable_autorizo_at) pasos.push({ key: "responsable", label: "Responsable", estado: "hecho", fecha: r.responsable_autorizo_at, quien: r.responsable_autorizo_by });
  else if (st === "PENDIENTE_RESPONSABLE") pasos.push({ key: "responsable", label: "Responsable", estado: "actual", quien: r.responsable_email });
  else if (st === "RECHAZADA_RESPONSABLE") pasos.push({ key: "responsable", label: "Responsable", estado: "rechazado", quien: r.responsable_email });
  else pasos.push({ key: "responsable", label: "Responsable", estado: r.responsable_email ? "pendiente" : "omitido" });

  // Compras / cotizacion (no aplica a destajo ni efectivo)
  if (!esDestajo && !esEfectivo) {
    const hecho = !!r.tiene_cotizacion || rk >= rank("EN_AUTORIZACION");
    pasos.push({ key: "cotizacion", label: "Compras", estado: hecho ? "hecho" : (st === "PENDIENTE" || st === "EN_COTIZACION" ? "actual" : "pendiente") });
  }

  // Direccion
  if (st === "RECHAZADA_DIRECCION") pasos.push({ key: "direccion", label: "Dirección", estado: "rechazado", fecha: r.authorized_at, quien: r.authorized_by });
  else if (rk >= rank("APROBADA") || r.authorized_at) pasos.push({ key: "direccion", label: "Dirección", estado: "hecho", fecha: r.authorized_at, quien: r.authorized_by });
  else pasos.push({ key: "direccion", label: "Dirección", estado: st === "EN_AUTORIZACION" ? "actual" : "pendiente" });

  // OC (solo materiales a credito/transferencia)
  if (!esDestajo && !esEfectivo) {
    const hecho = !!r.tiene_oc || rk >= rank("OC_GENERADA");
    pasos.push({ key: "oc", label: "Orden de compra", estado: hecho ? "hecho" : (st === "APROBADA" ? "actual" : "pendiente") });
  }

  // Pago
  const pagado = !!r.fecha_pago || !!r.comprobante_pago_url || rk >= rank("PAGADA");
  pasos.push({ key: "pago", label: "Pago", estado: pagado ? "hecho" : (rk >= rank("OC_GENERADA") || (esEfectivo && rk >= rank("APROBADA")) ? "actual" : "pendiente"), fecha: r.fecha_pago });

  // Entrega / evidencia (destajo: recibo firmado)
  const entregada = !!r.tiene_entrega || !!r.fecha_entrega || st === "ENTREGADA";
  pasos.push({ key: "entrega", label: esDestajo ? "Recibo" : "Entrega", estado: entregada ? "hecho" : (st === "ENTREGA_PARCIAL" ? "actual" : (pagado ? "actual" : "pendiente")), fecha: r.fecha_entrega, quien: r.recibio });

  if (rechazada) {
    // todo lo que venia despues del rechazo queda omitido
    let visto = false;
    for (const p of pasos) { if (visto) p.estado = "omitido"; if (p.estado === "rechazado") visto = true; }
  }
  return pasos;
}

/** Texto corto para badges/listas. */
export function statusLabel(st: string | null | undefined): string {
  const m: Record<string, string> = {
    PENDIENTE_RESPONSABLE: "Esperando responsable", PENDIENTE: "Pendiente", EN_COTIZACION: "En cotización",
    EN_AUTORIZACION: "En autorización", APROBADA: "Aprobada", OC_GENERADA: "OC generada", PAGADA: "Pagada",
    ENTREGA_PARCIAL: "Entrega parcial", ENTREGADA: "Entregada", RECHAZADA_RESPONSABLE: "Rechazada (obra)",
    RECHAZADA_DIRECCION: "Rechazada (Dirección)", CANCELADA: "Cancelada",
  };
  return m[String(st || "")] || String(st || "");
}

/** Que accion le toca a este usuario sobre esta requi (boton unico por rol). */
export type Accion = "AUTORIZAR_RESPONSABLE" | "COTIZAR" | "APROBAR_DIRECCION" | "PAGAR" | "REGISTRAR_ENTREGA" | null;
export function accionPara(r: RequiLike & { user_email?: string | null }, role: string, email: string): Accion {
  const st = String(r.status || "");
  const me = (email || "").toLowerCase();
  const esAdmin = role === "admin";
  const esDir = role === "direccion";
  if (st === "PENDIENTE_RESPONSABLE" && (esAdmin || esDir || (r.responsable_email || "").toLowerCase() === me)) return "AUTORIZAR_RESPONSABLE";
  if ((st === "PENDIENTE" || st === "EN_COTIZACION") && (r.purchase_status || "") !== "GASTO_EFECTIVO_PENDIENTE" && (role === "compras" || esAdmin)) return "COTIZAR";
  if (st === "EN_AUTORIZACION" && (esDir || esAdmin)) return "APROBAR_DIRECCION";
  if ((r.purchase_status || "") === "GASTO_EFECTIVO_PENDIENTE" && (st === "APROBADA" || st === "EN_AUTORIZACION" || st === "PENDIENTE") && (role === "usuario" || esAdmin)) return "PAGAR";
  const cerrada = ["ENTREGADA", "CANCELADA", "RECHAZADA_RESPONSABLE", "RECHAZADA_DIRECCION"].includes(st);
  if (!cerrada && (r.tipo_solicitud || "MATERIALES") !== "DESTAJO" && ((r.user_email || "").toLowerCase() === me || role === "compras" || role === "validador" || role === "residente" || esAdmin)) return "REGISTRAR_ENTREGA";
  return null;
}
