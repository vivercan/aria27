/**
 * src/lib/resend.ts - Singleton de Resend para email transaccional.
 *
 * Evita crear una instancia nueva de Resend en cada request.
 * Si RESEND_API_KEY no esta configurada, lanza en produccion y advierte en dev.
 *
 * 21-Abr-2026: Interceptor E2E - si E2E_TEST_OVERRIDE_ENABLED=true,
 * redirige TODOS los emails.send({to: X}) al E2E_TEST_OVERRIDE_EMAIL.
 * Ver src/lib/e2e-test-override.ts.
 */

import { Resend } from "resend";
import { overrideEmailIfTest, annotateTestSubject, isE2EOverrideEnabled } from "@/lib/e2e-test-override";

let _instance: Resend | null = null;

export function getResend(): Resend {
  if (_instance) return _instance;

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[resend] RESEND_API_KEY no configurada");
    }
    // En dev, crear instancia con key vacia - fallara al enviar pero no al importar
    console.warn("[resend] RESEND_API_KEY no configurada - emails no se enviaran");
  }

  const real = new Resend(key || "re_test_placeholder");

  // 21-Abr-2026: Si E2E override esta activo, envolver emails.send con Proxy
  // que intercepta el destinatario antes de llegar a la API de Resend.
  // Si esta inactivo, pasa directo sin overhead (solo un if al send).
  _instance = new Proxy(real, {
    get(target: Resend, prop: string | symbol, receiver: unknown) {
      if (prop === "emails") {
        const emails = Reflect.get(target, prop, receiver) as Resend["emails"];
        return new Proxy(emails, {
          get(emailsTarget, emailsProp: string | symbol, emailsReceiver: unknown) {
            if (emailsProp === "send") {
              const originalSend = Reflect.get(emailsTarget, emailsProp, emailsReceiver) as typeof emails.send;
              return async (payload: Parameters<typeof emails.send>[0]) => {
                if (isE2EOverrideEnabled() && payload && typeof payload === "object" && "to" in payload) {
                  const p = payload as unknown as Record<string, unknown>;
                  const originalTo = p.to as string | string[];
                  const newTo = overrideEmailIfTest(originalTo);
                  const newSubject = typeof p.subject === "string"
                    ? annotateTestSubject(p.subject, originalTo)
                    : p.subject;
                  return originalSend.call(emails, { ...p, to: newTo, subject: newSubject } as unknown as Parameters<typeof emails.send>[0]);
                }
                return originalSend.call(emails, payload);
              };
            }
            return Reflect.get(emailsTarget, emailsProp, emailsReceiver);
          },
        });
      }
      return Reflect.get(target, prop, receiver);
    },
  });

  return _instance;
}
