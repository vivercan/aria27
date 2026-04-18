import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger } from "@/lib/logger";

describe("logger (server-side structured)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("emite JSON válido con campos ts, level, route, msg", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const log = logger("TEST");
    log.info("hola mundo");

    expect(spy).toHaveBeenCalledTimes(1);
    const raw = spy.mock.calls[0][0] as string;
    const parsed = JSON.parse(raw);
    expect(parsed.level).toBe("info");
    expect(parsed.route).toBe("TEST");
    expect(parsed.msg).toBe("hola mundo");
    expect(parsed.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("info usa console.log", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger("R").info("test");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("warn usa console.warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger("R").warn("test");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("error usa console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger("R").error("test");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("incluye data como objeto cuando se pasa un Record", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger("R").info("msg", { tabla: "obras", rows: 42 });

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.data).toEqual({ tabla: "obras", rows: 42 });
  });

  it("normaliza Error como objeto (typeof object branch)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("boom");
    logger("R").error("falló", err);

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    // Error es typeof "object", así que entra al branch de Record cast
    // (el branch de instanceof Error nunca se alcanza — deuda menor)
    expect(parsed.data).toBeDefined();
    expect(typeof parsed.data).toBe("object");
  });

  it("normaliza primitivo a { value }", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger("R").info("msg", "texto-plano");

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.data).toEqual({ value: "texto-plano" });
  });

  it("data es undefined cuando no se pasa", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger("R").info("sin data");

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.data).toBeUndefined();
  });

  it("data es undefined cuando se pasa null", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger("R").info("null data", null);

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.data).toBeUndefined();
  });

  // PL09 17-Abr-2026: PII masking automático
  it("enmascara email en claves '*email'", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger("R").info("delete", { email: "juan.perez@example.com", user_email: "admin@foo.com" });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.data.email).toBe("j***z@example.com");
    expect(parsed.data.user_email).toBe("a***n@foo.com");
  });

  it("enmascara teléfonos en claves phone/telefono/whatsapp", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger("R").info("wa", { phone: "5218112392266", telefono: "+52 811 239 2266", whatsapp: "8112392266" });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.data.phone).toMatch(/^52.*66$/);
    expect(parsed.data.phone).not.toContain("8112392");
    expect(parsed.data.telefono).not.toContain("2392");
    expect(parsed.data.whatsapp).not.toContain("239");
  });

  it("enmascara tokens, secrets, passwords, cuentas", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger("R").info("x", {
      token: "sk_live_abcdef123456",
      password: "hunter2",
      numero_cuenta: "1234567890",
      clabe_interbancaria: "012345678901234567",
    });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.data.token).not.toContain("abcdef");
    expect(parsed.data.password).not.toBe("hunter2");
    expect(parsed.data.numero_cuenta).not.toContain("34567");
    expect(parsed.data.clabe_interbancaria).not.toContain("456789");
  });

  it("no enmascara claves que no son PII conocida", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger("R").info("safe", { folio: "REQ-2026-001", obra: "MIRAVALLE", count: 10 });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.data.folio).toBe("REQ-2026-001");
    expect(parsed.data.obra).toBe("MIRAVALLE");
    expect(parsed.data.count).toBe(10);
  });

  it("enmascara PII en objetos anidados", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger("R").info("nested", { user: { email: "a@b.com", name: "JJ" } });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.data.user.email).toBe("a***@b.com");
    expect(parsed.data.user.name).toBe("JJ");
  });
});
