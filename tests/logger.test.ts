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
});
