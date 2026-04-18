import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyWebhookSignature } from "@/lib/whatsapp";
import { createHmac } from "crypto";

describe("verifyWebhookSignature", () => {
  const REAL_SECRET = "test_app_secret_12345";
  const originalEnv = process.env.META_APP_SECRET;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.META_APP_SECRET = originalEnv;
    } else {
      delete process.env.META_APP_SECRET;
    }
    vi.restoreAllMocks();
  });

  it("acepta firma HMAC SHA-256 válida", () => {
    process.env.META_APP_SECRET = REAL_SECRET;
    const body = '{"entry":[{"changes":[]}]}';
    const sig = "sha256=" + createHmac("sha256", REAL_SECRET).update(body).digest("hex");
    expect(verifyWebhookSignature(body, sig)).toBe(true);
  });

  it("rechaza firma incorrecta", () => {
    process.env.META_APP_SECRET = REAL_SECRET;
    const body = '{"entry":[]}';
    expect(verifyWebhookSignature(body, "sha256=deadbeef")).toBe(false);
  });

  it("rechaza cuando no hay firma (null)", () => {
    process.env.META_APP_SECRET = REAL_SECRET;
    expect(verifyWebhookSignature("body", null)).toBe(false);
  });

  it("fail-closed: rechaza cuando META_APP_SECRET no está configurado (PL05)", () => {
    // Decisión 17-Abr-2026: seguridad > conveniencia.
    // Si el secret falta, no podemos validar firmas → rechazamos.
    // El handler puede usar verifyWebhookUrlToken(?token=...) como fallback autenticado.
    delete process.env.META_APP_SECRET;
    // El logger usa console.error internamente; lo silenciamos para que no contamine salida.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(verifyWebhookSignature("body", "sha256=anything")).toBe(false);
    expect(verifyWebhookSignature("body", null)).toBe(false);
    spy.mockRestore();
  });

  it("funciona con Buffer como rawBody", () => {
    process.env.META_APP_SECRET = REAL_SECRET;
    const body = Buffer.from('{"test":true}');
    const sig = "sha256=" + createHmac("sha256", REAL_SECRET).update(body).digest("hex");
    expect(verifyWebhookSignature(body, sig)).toBe(true);
  });

  it("rechaza firma con prefijo incorrecto", () => {
    process.env.META_APP_SECRET = REAL_SECRET;
    const body = "test";
    const hash = createHmac("sha256", REAL_SECRET).update(body).digest("hex");
    // Sin prefijo sha256=
    expect(verifyWebhookSignature(body, hash)).toBe(false);
  });
});
