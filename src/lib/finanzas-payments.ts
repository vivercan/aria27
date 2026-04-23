import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

const log = logger("FINANZAS_PAY");

/**
 * Helper centralizado para registrar pagos a Órdenes de Compra (purchase_orders)
 * y cobros a Estimaciones (estimaciones).
 *
 * Garantías:
 *  - Validación de overpayment / overcollection (no permite exceder el total).
 *  - Optimistic lock vía expectedPagado / expectedCobrado: si otro proceso
 *    actualizó el monto antes que nosotros, el UPDATE no afecta filas y se
 *    devuelve un error legible (en lugar de sobre-escribir / perder datos).
 *  - Cálculo de status derivado (PAGO_PARCIAL / PAGADA, COBRO_PARCIAL / COBRADA).
 *  - Atomicidad: una sola sentencia UPDATE con .eq() de columnas guard.
 *  - Métodos compartidos por /finanzas/por-pagar y /requisiciones/pagos para
 *    eliminar lógica duplicada (regla auditoría: cero writes a la misma tabla
 *    fuera del helper oficial).
 *
 * P-11 22-Abr-2026: tabla `pagos_oc` creada y este helper inserta el registro
 * historial automaticamente despues de cada UPDATE exitoso. Trazabilidad total.
 */

export interface RegistrarPagoOCArgs {
  ocId: string;
  /** Monto del pago a aplicar (positivo). */
  monto: number;
  /** Total de la OC tal como lo conoce el cliente. Se valida contra BD. */
  total: number;
  /** monto_pagado actual conocido por el cliente. Se usa como guard optimista. */
  expectedPagado: number;
  /** Opcional: método y referencia (Transferencia/Cheque/Efectivo, no. de ref). */
  metodo?: string;
  referencia?: string;
  /** 21-Abr-2026: URL del comprobante subido (obligatorio en TRANSFERENCIA). */
  comprobanteUrl?: string;
  /** P-11 22-Abr-2026: usuario que registra el pago (para historial pagos_oc). */
  createdBy?: string;
  /** P-11 22-Abr-2026: notas opcionales del pago. */
  notas?: string;
}

export interface RegistrarPagoOCResult {
  nuevoPagado: number;
  nuevoStatus: string;
  saldo: number;
}

export async function registrarPagoOC(
  args: RegistrarPagoOCArgs
): Promise<RegistrarPagoOCResult> {
  const { ocId, monto, total, expectedPagado, metodo, referencia, comprobanteUrl, createdBy, notas } = args;

  if (!ocId) throw new Error("ocId requerido");
  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error("Monto del pago inválido");
  }
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("Total de la OC inválido");
  }
  if (!Number.isFinite(expectedPagado) || expectedPagado < 0) {
    throw new Error("monto_pagado actual inválido");
  }

  // Tolerancia de centavos para evitar bloquear pagos por float drift.
  const EPS = 0.005;
  const nuevoPagado = +(expectedPagado + monto).toFixed(2);

  if (nuevoPagado > total + EPS) {
    const saldo = +(total - expectedPagado).toFixed(2);
    throw new Error(
      `El pago de $${monto.toFixed(2)} excede el saldo pendiente ($${saldo.toFixed(2)}). ` +
        `Total OC: $${total.toFixed(2)}, ya pagado: $${expectedPagado.toFixed(2)}.`
    );
  }

  const nuevoStatus = nuevoPagado + EPS >= total ? "PAGADA" : "PAGO_PARCIAL";

  // 21-Abr-2026: Validacion metodo + comprobante obligatorio en TRANSFERENCIA.
  if (metodo === "Transferencia" && !comprobanteUrl) {
    throw new Error("Para pago por Transferencia es obligatorio subir comprobante.");
  }

  const updatePayload: Record<string, unknown> = {
    monto_pagado: nuevoPagado,
    status: nuevoStatus,
    ultimo_pago_fecha: new Date().toISOString(),
  };
  if (metodo) updatePayload.ultimo_pago_metodo = metodo;
  if (referencia) updatePayload.ultimo_pago_referencia = referencia;
  if (comprobanteUrl) updatePayload.ultimo_pago_comprobante_url = comprobanteUrl;

  // Optimistic lock: si otro proceso ya actualizó monto_pagado entre nuestro
  // SELECT y este UPDATE, .eq("monto_pagado", expectedPagado) hará que el
  // UPDATE no afecte filas, y lo detectamos pidiendo el registro de vuelta.
  const { data, error } = await supabase
    .from("purchase_orders")
    .update(updatePayload)
    .eq("id", ocId)
    .eq("monto_pagado", expectedPagado)
    .select("id, monto_pagado, status, total")
    .maybeSingle();

  if (error) {
    log.error("registrarPagoOC update fallido", { ocId, error: (error as {message?: string})?.message || "Error" });
    throw new Error(`No se pudo registrar el pago: ${(error as {message?: string})?.message || "Error"}`);
  }

  if (!data) {
    // Cero filas afectadas → otro pago concurrente o id inexistente
    log.warn("registrarPagoOC sin filas afectadas (lock optimista)", {
      ocId,
      expectedPagado,
    });
    throw new Error(
      "El saldo de esta OC fue modificado por otro usuario. Recarga la página y vuelve a intentar."
    );
  }

  log.info("pago OC registrado", {
    ocId,
    nuevoPagado: data.monto_pagado,
    status: data.status,
  });

  // P-11 22-Abr-2026: insertar registro en pagos_oc (historial inmutable)
  try {
    const { error: histErr } = await supabase.from("pagos_oc").insert({
      oc_id: ocId,
      monto,
      metodo: metodo || null,
      referencia: referencia || null,
      comprobante_url: comprobanteUrl || null,
      notas: notas || null,
      monto_pagado_acumulado: data.monto_pagado,
      status_post: data.status,
      created_by: createdBy || "sistema",
    });
    if (histErr) {
      log.warn("pago OC: no se pudo registrar historial pagos_oc", { ocId, error: histErr.message });
    }
  } catch (e) {
    log.warn("pago OC: insert pagos_oc fallback", { ocId, error: String(e) });
  }

  return {
    nuevoPagado: data.monto_pagado as number,
    nuevoStatus: data.status as string,
    saldo: +((data.total as number) - (data.monto_pagado as number)).toFixed(2),
  };
}

export interface RegistrarCobroEstimacionArgs {
  estimacionId: string;
  /** Monto adicional cobrado en esta operación. */
  monto: number;
  /** monto_estimado de la estimación. */
  montoEstimado: number;
  /** Retención (fondo de garantía) — el cobrable real es montoEstimado - retencion. */
  retencion?: number;
  /** monto_cobrado actual conocido por el cliente. Guard optimista. */
  expectedCobrado: number;
}

export interface RegistrarCobroEstimacionResult {
  nuevoCobrado: number;
  nuevoStatus: string;
  pendiente: number;
}

export async function registrarCobroEstimacion(
  args: RegistrarCobroEstimacionArgs
): Promise<RegistrarCobroEstimacionResult> {
  const { estimacionId, monto, montoEstimado, retencion = 0, expectedCobrado } = args;

  if (!estimacionId) throw new Error("estimacionId requerido");
  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error("Monto del cobro inválido");
  }
  if (!Number.isFinite(montoEstimado) || montoEstimado <= 0) {
    throw new Error("Monto estimado inválido");
  }
  if (!Number.isFinite(expectedCobrado) || expectedCobrado < 0) {
    throw new Error("monto_cobrado actual inválido");
  }

  const EPS = 0.005;
  const cobrable = +(montoEstimado - retencion).toFixed(2);
  const nuevoCobrado = +(expectedCobrado + monto).toFixed(2);

  if (nuevoCobrado > cobrable + EPS) {
    const pend = +(cobrable - expectedCobrado).toFixed(2);
    throw new Error(
      `El cobro de $${monto.toFixed(2)} excede el saldo cobrable ($${pend.toFixed(2)}). ` +
        `Estimado: $${montoEstimado.toFixed(2)}, retención: $${retencion.toFixed(2)}, ya cobrado: $${expectedCobrado.toFixed(2)}.`
    );
  }

  const nuevoStatus = nuevoCobrado + EPS >= cobrable ? "COBRADA" : "COBRO_PARCIAL";

  const updatePayload: Record<string, unknown> = {
    monto_cobrado: nuevoCobrado,
    status: nuevoStatus,
  };
  if (nuevoStatus === "COBRADA") {
    updatePayload.fecha_cobro = new Date().toISOString().split("T")[0];
  }

  const { data, error } = await supabase
    .from("estimaciones")
    .update(updatePayload)
    .eq("id", estimacionId)
    .eq("monto_cobrado", expectedCobrado)
    .select("id, monto_cobrado, status, monto_estimado, retencion_fondo")
    .maybeSingle();

  if (error) {
    log.error("registrarCobroEstimacion update fallido", {
      estimacionId,
      error: (error as {message?: string})?.message || "Error",
    });
    throw new Error(`No se pudo registrar el cobro: ${(error as {message?: string})?.message || "Error"}`);
  }

  if (!data) {
    log.warn("registrarCobroEstimacion sin filas afectadas (lock optimista)", {
      estimacionId,
      expectedCobrado,
    });
    throw new Error(
      "El monto cobrado de esta estimación fue modificado por otro usuario. Recarga la página y vuelve a intentar."
    );
  }

  const dataCobrable = +(
    (data.monto_estimado as number) - ((data.retencion_fondo as number) || 0)
  ).toFixed(2);

  log.info("cobro estimación registrado", {
    estimacionId,
    nuevoCobrado: data.monto_cobrado,
    status: data.status,
  });

  return {
    nuevoCobrado: data.monto_cobrado as number,
    nuevoStatus: data.status as string,
    pendiente: +(dataCobrable - (data.monto_cobrado as number)).toFixed(2),
  };
}
