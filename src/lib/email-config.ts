/**
 * src/lib/email-config.ts — Configuración centralizada de email transaccional.
 *
 * Todos los envíos de Resend deben usar RESEND_FROM para el campo "from".
 * Cambiar la dirección remitente en un solo lugar en lugar de 17+ archivos.
 */

/** Dirección canónica de envío. Configurable via RESEND_FROM env var. */
export const RESEND_FROM =
  process.env.RESEND_FROM || "ARIA27 <noreply@mail.jjcrm27.com>";
