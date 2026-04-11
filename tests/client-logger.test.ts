import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { clientLogger } from "@/lib/client-logger";

// NODE_ENV is readonly in @types/node — cast to mutable for testing
const env = process.env as Record<string, string | undefined>;

describe("clientLogger (browser-side)", () => {
  const originalEnv = env.NODE_ENV;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    env.NODE_ENV = originalEnv;
  });

  describe("en desarrollo", () => {
    beforeEach(() => {
      env.NODE_ENV = "development";
    });

    it("info emite console.log con tag prefix", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      const log = clientLogger("FOTOS");
      log.info("cargando");

      expect(spy).toHaveBeenCalledWith("[FOTOS]", "cargando", undefined);
    });

    it("warn emite console.warn con tag prefix", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      clientLogger("OBRAS").warn("lento", { ms: 3000 });

      expect(spy).toHaveBeenCalledWith("[OBRAS]", "lento", { ms: 3000 });
    });

    it("error emite console.error con tag prefix", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      clientLogger("INV").error("falló", { code: 500 });

      expect(spy).toHaveBeenCalledWith("[INV]", "falló", { code: 500 });
    });
  });

  describe("en producción", () => {
    beforeEach(() => {
      env.NODE_ENV = "production";
    });

    it("info NO emite nada", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      clientLogger("FOTOS").info("test");
      expect(spy).not.toHaveBeenCalled();
    });

    it("warn NO emite nada", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      clientLogger("FOTOS").warn("test");
      expect(spy).not.toHaveBeenCalled();
    });

    it("error SÍ emite (errores siempre se logean)", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      clientLogger("FOTOS").error("crash", { stack: "..." });
      expect(spy).toHaveBeenCalledWith("[FOTOS]", "crash", { stack: "..." });
    });
  });
});
