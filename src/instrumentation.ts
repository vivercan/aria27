/**
 * src/instrumentation.ts — Next.js Instrumentation Hook
 *
 * Se ejecuta UNA VEZ al iniciar el servidor Next.js (tanto en dev como en prod).
 * Ref: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * Uso actual:
 * - Validar que todas las variables de entorno requeridas están presentes.
 */

export async function register() {
  // Solo validar en server (no en edge ni en cliente)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvOrThrow } = await import("@/lib/env-check");
    validateEnvOrThrow();
  }
}
