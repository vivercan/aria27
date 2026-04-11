/**
 * Next.js Instrumentation Hook — se ejecuta una vez al arrancar el servidor.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    // Solo validar en el servidor, no durante el build estático
    const { checkEnvVars } = await import("@/lib/env-check");
    checkEnvVars();
  }
}
