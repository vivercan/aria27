import { describe, it, expect } from "vitest";
import {
  calcularAntiguedad,
  calcularDiasVacacionesPorAntiguedad,
  calcularPrimaAntiguedad,
  calcularAguinaldoProporcional,
} from "../src/lib/payroll-utils";

describe("calcularAntiguedad", () => {
  it("returns 0 for empty inputs", () => {
    expect(calcularAntiguedad("", "2026-01-01")).toBe(0);
    expect(calcularAntiguedad("2026-01-01", "")).toBe(0);
  });

  it("calculates exact days between dates", () => {
    expect(calcularAntiguedad("2025-01-01", "2025-01-31")).toBe(30);
    expect(calcularAntiguedad("2025-01-01", "2026-01-01")).toBe(365);
  });

  it("handles same day → 0 days", () => {
    expect(calcularAntiguedad("2025-06-15", "2025-06-15")).toBe(0);
  });

  it("handles leap year correctly", () => {
    expect(calcularAntiguedad("2024-01-01", "2025-01-01")).toBe(366);
  });
});

describe("calcularDiasVacacionesPorAntiguedad", () => {
  it("returns 0 for <1 year", () => {
    expect(calcularDiasVacacionesPorAntiguedad(0)).toBe(0);
    expect(calcularDiasVacacionesPorAntiguedad(0.5)).toBe(0);
  });

  it("returns 6 for 1-4 years (LFT tabla)", () => {
    expect(calcularDiasVacacionesPorAntiguedad(1)).toBe(6);
    expect(calcularDiasVacacionesPorAntiguedad(4)).toBe(6);
  });

  it("returns 8 for 5-9 years", () => {
    expect(calcularDiasVacacionesPorAntiguedad(5)).toBe(8);
    expect(calcularDiasVacacionesPorAntiguedad(9)).toBe(8);
  });

  it("returns 10 for 10-14 years", () => {
    expect(calcularDiasVacacionesPorAntiguedad(10)).toBe(10);
    expect(calcularDiasVacacionesPorAntiguedad(14)).toBe(10);
  });

  it("returns 12 for 15-19 years", () => {
    expect(calcularDiasVacacionesPorAntiguedad(15)).toBe(12);
  });

  it("returns 14 for 20-24 years", () => {
    expect(calcularDiasVacacionesPorAntiguedad(20)).toBe(14);
  });

  it("returns 16 for 25-29 years", () => {
    expect(calcularDiasVacacionesPorAntiguedad(25)).toBe(16);
    expect(calcularDiasVacacionesPorAntiguedad(29)).toBe(16);
  });

  it("adds 2 days every 5 years after 29", () => {
    expect(calcularDiasVacacionesPorAntiguedad(30)).toBe(16); // <5 additional years
    expect(calcularDiasVacacionesPorAntiguedad(34)).toBe(18);
    expect(calcularDiasVacacionesPorAntiguedad(39)).toBe(20);
  });
});

describe("calcularPrimaAntiguedad", () => {
  it("calculates 12 × salary × years (LFT art 162)", () => {
    expect(calcularPrimaAntiguedad(500, 10)).toBe(60000);
    expect(calcularPrimaAntiguedad(300, 5)).toBe(18000);
  });

  it("returns 0 for 0 years", () => {
    expect(calcularPrimaAntiguedad(500, 0)).toBe(0);
  });
});

describe("calcularAguinaldoProporcional", () => {
  it("calculates proportional aguinaldo: (days/365) × 15 × salary", () => {
    // Full year: (365/365) × 15 × 500 = 7500
    expect(calcularAguinaldoProporcional(500, 365)).toBeCloseTo(7500, 2);
  });

  it("calculates half year correctly", () => {
    // Half year: (182/365) × 15 × 500 ≈ 3739.73
    expect(calcularAguinaldoProporcional(500, 182)).toBeCloseTo(3739.73, 0);
  });

  it("returns 0 for 0 days", () => {
    expect(calcularAguinaldoProporcional(500, 0)).toBe(0);
  });
});
