/**
 * src/lib/resend.ts — Singleton de Resend para email transaccional.
 *
 * Evita crear una instancia nueva de Resend en cada request.
 * Si RESEND_API_KEY no está configurada, lanza en producción y advierte en dev.
 */

import { Resend } from "resend";

let _instance: Resend | null = null;

export function getResend(): Resend {
  if (_instance) return _instance;

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[resend] RESEND_API_KEY no configurada");
    }
    // En dev, crear instancia con key vacía — fallará al enviar pero no al importar
    console.warn("[resend] RESEND_API_KEY no configurada — emails no se enviarán");
  }

  _instance = new Resend(key || "re_test_placeholder");
  return _instance;
}
