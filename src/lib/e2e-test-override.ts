/**
 * src/lib/e2e-test-override.ts
 *
 * Feature flag para pruebas E2E: redirige TODOS los emails y WhatsApps
 * a destinos de prueba cuando la env var E2E_TEST_OVERRIDE_ENABLED=true.
 *
 * Uso en Vercel (activar/desactivar sin deploy):
 *   E2E_TEST_OVERRIDE_ENABLED = "true" | "false"   (default false)
 *   E2E_TEST_OVERRIDE_EMAIL   = "destino@test.com"
 *   E2E_TEST_OVERRIDE_PHONE   = "8112392266"
 *
 * Cuando está activo:
 *   - Todos los resend.emails.send({to: X}) -> redirigen a E2E_TEST_OVERRIDE_EMAIL
 *   - Todos los sendWhatsAppTemplate(..., phone) -> redirigen a E2E_TEST_OVERRIDE_PHONE
 *   - Se registra un log WARN con "iba a X pero redirigido a JJ" para trazabilidad
 *
 * IMPORTANTE: En producción esto debe estar APAGADO por default.
 * Solo se enciende durante ventanas de QA controladas.
 */

import { logger } from "@/lib/logger";

const log = logger("E2E-OVERRIDE");

export function isE2EOverrideEnabled(): boolean {
  return process.env.E2E_TEST_OVERRIDE_ENABLED === "true";
}

export function getOverrideEmail(): string | null {
  if (!isE2EOverrideEnabled()) return null;
  const email = process.env.E2E_TEST_OVERRIDE_EMAIL;
  return email && email.length > 0 ? email : null;
}

export function getOverridePhone(): string | null {
  if (!isE2EOverrideEnabled()) return null;
  const phone = process.env.E2E_TEST_OVERRIDE_PHONE;
  return phone && phone.length > 0 ? phone : null;
}

/**
 * Devuelve destino email real o el override si el flag esta activo.
 * Acepta string o array y devuelve el mismo tipo.
 */
export function overrideEmailIfTest(originalTo: string | string[]): string | string[] {
  const override = getOverrideEmail();
  if (!override) return originalTo;
  const originalStr = Array.isArray(originalTo) ? originalTo.join(", ") : originalTo;
  log.warn("E2E OVERRIDE: email redirigido", {
    original: originalStr,
    redirected: override,
  });
  return Array.isArray(originalTo) ? [override] : override;
}

/**
 * Devuelve telefono real o el override si el flag esta activo.
 */
export function overridePhoneIfTest(originalPhone: string): string {
  const override = getOverridePhone();
  if (!override) return originalPhone;
  log.warn("E2E OVERRIDE: WhatsApp redirigido", {
    original: originalPhone,
    redirected: override,
  });
  return override;
}

/**
 * Agrega prefijo [TEST E2E -> originalDestination] al subject del email para
 * que en la bandeja sea obvio cual iba a cual rol. Opcional.
 */
export function annotateTestSubject(originalSubject: string, originalTo: string | string[]): string {
  if (!isE2EOverrideEnabled()) return originalSubject;
  const originalStr = Array.isArray(originalTo) ? originalTo.join(",") : originalTo;
  return `[TEST->${originalStr}] ${originalSubject}`;
}
