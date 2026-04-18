import { describe, it, expect } from "vitest";
import { fmtMoney, fmtNumber, fmtPct, fmtDate, fmtDateTime, fmtFolio } from "@/lib/formatters";

describe("formatters (PL33)", () => {
  describe("fmtMoney", () => {
    it("formatea pesos MXN es-MX", () => {
      expect(fmtMoney(12345.67)).toBe("$12,345.67");
      expect(fmtMoney(0)).toBe("$0.00");
      expect(fmtMoney(100)).toBe("$100.00");
    });
    it("acepta null/undefined → $0.00", () => {
      expect(fmtMoney(null)).toBe("$0.00");
      expect(fmtMoney(undefined)).toBe("$0.00");
    });
    it("noDecimals oculta centavos", () => {
      expect(fmtMoney(12345, { noDecimals: true })).toBe("$12,345");
    });
    it("infinitos/NaN → $0.00", () => {
      expect(fmtMoney(NaN)).toBe("$0.00");
      expect(fmtMoney(Infinity)).toBe("$0.00");
    });
  });

  describe("fmtNumber", () => {
    it("formatea enteros con miles", () => {
      expect(fmtNumber(1500)).toBe("1,500");
      expect(fmtNumber(1000000)).toBe("1,000,000");
    });
    it("decimales=2 respeta 2 decimales", () => {
      expect(fmtNumber(1500.5, 2)).toBe("1,500.50");
    });
  });

  describe("fmtPct", () => {
    it("multiplica por 100 y añade %", () => {
      expect(fmtPct(0.153)).toBe("15.3%");
      expect(fmtPct(1)).toBe("100.0%");
      expect(fmtPct(0)).toBe("0.0%");
    });
  });

  describe("fmtDate / fmtDateTime", () => {
    it("acepta ISO YYYY-MM-DD sin drift timezone", () => {
      const r = fmtDate("2026-04-17");
      expect(r).toMatch(/17/);
      expect(r).toMatch(/2026/);
    });
    it("fallback en input nulo", () => {
      expect(fmtDate(null)).toBe("—");
      expect(fmtDate("")).toBe("—");
      expect(fmtDate(undefined, "N/A")).toBe("N/A");
    });
    it("fmtDateTime incluye hora", () => {
      const r = fmtDateTime("2026-04-17T14:30:00Z");
      expect(r).toMatch(/\d{2}:\d{2}/);
    });
    it("entrada inválida → fallback", () => {
      expect(fmtDate("not-a-date")).toBe("—");
    });
  });

  describe("fmtFolio", () => {
    it("respeta folio con contenido", () => {
      expect(fmtFolio("REQ-2026-001")).toBe("REQ-2026-001");
    });
    it("fallback en empty/null", () => {
      expect(fmtFolio("")).toBe("—");
      expect(fmtFolio(null)).toBe("—");
      expect(fmtFolio("   ")).toBe("—");
    });
  });
});
