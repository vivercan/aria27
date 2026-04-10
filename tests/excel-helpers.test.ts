import { describe, it, expect } from "vitest";
import { calculateObraKPIs, type ObraData, type ObraKPIs } from "@/lib/excel-helpers";

describe("calculateObraKPIs", () => {
  it("returns all zeros when data is empty", () => {
    const emptyData: ObraData = {
      partidas: [],
      requisitions: [],
      ocs: [],
      nomina: [],
      cobros: [],
      avances: [],
      bitacora: [],
    };

    const result = calculateObraKPIs(emptyData);

    expect(result).toEqual<ObraKPIs>({
      totalPpto: 0,
      totalOC: 0,
      totalNomina: 0,
      totalCobrado: 0,
      gastoTotal: 0,
      margen: 0,
      saldoPpto: 0,
      ultAvance: 0,
    });
  });

  it("calculates correct totals from sample data", () => {
    const data: ObraData = {
      partidas: [
        { monto: 100000 },
        { monto: 50000 },
        { monto: 75000 },
      ],
      requisitions: [],
      ocs: [
        { total: 30000 },
        { total: 20000 },
        { total: 15000 },
      ],
      nomina: [
        { neto_pagar: 25000 },
        { neto_pagar: 25000 },
        { neto_pagar: 20000 },
      ],
      cobros: [
        { monto: 100000 },
        { monto: 80000 },
      ],
      avances: [
        { porcentaje_avance: 75 },
      ],
      bitacora: [],
    };

    const result = calculateObraKPIs(data);

    expect(result.totalPpto).toBe(225000); // 100k + 50k + 75k
    expect(result.totalOC).toBe(65000); // 30k + 20k + 15k
    expect(result.totalNomina).toBe(70000); // 25k + 25k + 20k
    expect(result.totalCobrado).toBe(180000); // 100k + 80k
    expect(result.gastoTotal).toBe(135000); // 65k + 70k
    expect(result.margen).toBe(45000); // 180k - 135k
    expect(result.saldoPpto).toBe(90000); // 225k - 135k
    expect(result.ultAvance).toBe(75);
  });

  it("handles negative margins correctly", () => {
    const data: ObraData = {
      partidas: [{ monto: 50000 }],
      requisitions: [],
      ocs: [{ total: 40000 }],
      nomina: [{ neto_pagar: 30000 }],
      cobros: [{ monto: 50000 }],
      avances: [],
      bitacora: [],
    };

    const result = calculateObraKPIs(data);

    const gastoTotal = 40000 + 30000; // 70000
    const margen = 50000 - gastoTotal; // -20000

    expect(result.gastoTotal).toBe(70000);
    expect(result.margen).toBe(-20000);
    expect(result.margen).toBeLessThan(0);
  });

  it("uses first avance porcentaje_avance when available", () => {
    const data: ObraData = {
      partidas: [],
      requisitions: [],
      ocs: [],
      nomina: [],
      cobros: [],
      avances: [
        { porcentaje_avance: 85 },
        { porcentaje_avance: 75 },
        { porcentaje_avance: 65 },
      ],
      bitacora: [],
    };

    const result = calculateObraKPIs(data);

    expect(result.ultAvance).toBe(85);
  });

  it("returns 0 for ultAvance when avances array is empty", () => {
    const data: ObraData = {
      partidas: [],
      requisitions: [],
      ocs: [],
      nomina: [],
      cobros: [],
      avances: [],
      bitacora: [],
    };

    const result = calculateObraKPIs(data);

    expect(result.ultAvance).toBe(0);
  });

  it("ignores null/undefined values in summation", () => {
    const data: ObraData = {
      partidas: [
        { monto: 100000 },
        { monto: null as any },
        { monto: undefined as any },
      ],
      requisitions: [],
      ocs: [
        { total: 50000 },
        { total: undefined as any },
      ],
      nomina: [
        { neto_pagar: 30000 },
      ],
      cobros: [
        { monto: 80000 },
      ],
      avances: [],
      bitacora: [],
    };

    const result = calculateObraKPIs(data);

    expect(result.totalPpto).toBe(100000);
    expect(result.totalOC).toBe(50000);
    expect(result.totalNomina).toBe(30000);
    expect(result.totalCobrado).toBe(80000);
  });

  it("handles large numbers correctly", () => {
    const data: ObraData = {
      partidas: [{ monto: 10000000 }],
      requisitions: [],
      ocs: [{ total: 6000000 }],
      nomina: [{ neto_pagar: 2000000 }],
      cobros: [{ monto: 10000000 }],
      avances: [],
      bitacora: [],
    };

    const result = calculateObraKPIs(data);

    expect(result.totalPpto).toBe(10000000);
    expect(result.gastoTotal).toBe(8000000);
    expect(result.margen).toBe(2000000);
    expect(result.saldoPpto).toBe(2000000);
  });

  it("calculates saldoPpto even when cobros equal zero", () => {
    const data: ObraData = {
      partidas: [{ monto: 100000 }],
      requisitions: [],
      ocs: [{ total: 40000 }],
      nomina: [{ neto_pagar: 30000 }],
      cobros: [],
      avances: [],
      bitacora: [],
    };

    const result = calculateObraKPIs(data);

    expect(result.saldoPpto).toBe(30000); // 100k - 70k
    expect(result.totalCobrado).toBe(0);
  });
});
