/**
 * src/lib/notif-policy.ts — FIX 549 (10-Oct-2026)
 *
 * Politica unica de canales de notificacion. Regla de JJ:
 *   - WhatsApp es el canal operativo (todos lo reciben).
 *   - Correo SOLO para quien necesita un comprobante o un boton de accion:
 *       · el creador de la requi (su recibo con tabla de materiales)
 *       · Direccion cuando la requi requiere AUTORIZAR/RECHAZAR (botones en el correo)
 *       · proveedores externos (comparativas, OC)
 *   - Direccion, RH, Compras y Admin NO reciben correo informativo (ya les llega WA).
 *
 * Override por usuario: users.notif_email
 *   null  -> aplica la politica por contexto
 *   true  -> siempre correo (aunque la politica diga no)
 *   false -> nunca correo (aunque sea creador)  <- RH queda asi por decision JJ
 *
 * Antes (30d): 1,075 correos / 197 requis = 5.5 por requi, cuota Resend topada
 * 5 dias. Despues: ~1 por requi.
 */

export type NotifContext =
  | "creador"          // recibo al que creo la requi
  | "compras"          // aviso a Compras para cotizar/pagar
  | "direccion_accion" // Direccion con botones AUTORIZAR/RECHAZAR
  | "admin"            // copia informativa al admin
  | "ops_direccion"    // notifyOps global a Direccion
  | "ops_rh"           // notifyOps global a RH
  | "proveedor";       // externo

export const EMAIL_BY_CONTEXT: Readonly<Record<NotifContext, boolean>> = {
  creador: true,
  compras: false,
  direccion_accion: true,
  admin: false,
  ops_direccion: false,
  ops_rh: false,
  proveedor: true,
};

/** Decide si se manda correo para un contexto dado, respetando el override del usuario. */
export function emailAllowed(ctx: NotifContext, userOverride?: boolean | null): boolean {
  if (userOverride === true) return true;
  if (userOverride === false) return false;
  return EMAIL_BY_CONTEXT[ctx];
}

/** WhatsApp siempre va (canal operativo). Punto unico por si manana se quiere override. */
export function whatsappAllowed(_ctx: NotifContext): boolean {
  return true;
}
