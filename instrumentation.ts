/**
 * instrumentation.ts — Next.js Instrumentation Hook (root level)
 *
 * Next.js busca este archivo JUNTO a la carpeta `app/`. Como en este repo
 * `app/` vive en root (no en src/), la ubicación correcta es ésta.
 *
 * Se ejecuta UNA VEZ al arrancar el servidor (dev y prod).
 * Ref: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * PL12 17-Abr-2026: validar env vars al boot. Antes la función existía en
 * src/instrumentation.ts pero Next.js no la cargaba (ubicación incorrecta),
 * dejando env-check como código muerto.
 */

export async function register() {
  // Solo validar en server Node.js (no en edge ni en cliente)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvOrThrow } = await import("@/lib/env-check");
    validateEnvOrThrow();
  }
}
