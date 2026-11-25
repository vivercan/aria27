import { describe, it, expect } from "vitest";
import { FORMAS_PAGO, resolverFormaPago, etiquetaFormaPago, etiquetaCortaFormaPago, requiereDatosBancarios } from "@/lib/formas-pago";

// 25-Nov-2026 — Valeria pidio tarjeta de credito. Estas pruebas fijan que el
// catalogo sea uno solo y que los textos historicos de la base se acomoden.
describe("formas de pago", () => {
  it("incluye tarjeta de credito", () => {
    expect(FORMAS_PAGO.map(f => f.valor)).toContain("TARJETA_CREDITO");
    expect(etiquetaFormaPago("TARJETA_CREDITO")).toBe("Tarjeta de crédito");
  });

  it("no hay valores repetidos", () => {
    const v = FORMAS_PAGO.map(f => f.valor);
    expect(new Set(v).size).toBe(v.length);
  });

  it.each([
    ["TARJETA", "TARJETA_CREDITO"],
    ["TARJETA DE CREDITO", "TARJETA_CREDITO"],
    // Compuestos: gana la forma que se menciona primero.
    ["CONTADO/TARJETA", "EFECTIVO"],
    ["CONTADO/TARJETA/CRÉDITO", "EFECTIVO"],
    ["TARJETA/CONTADO", "TARJETA_CREDITO"],
    ["Tarjeta de debito", "TARJETA_DEBITO"],
    ["TRANSFERENCIA ", "TRANSFERENCIA"],
    ["Efectivo", "EFECTIVO"],
    ["CONTADO", "EFECTIVO"],
    ["EFECTIVO/TRANSFERENCIA", "EFECTIVO"],
    ["CREDITO", "CREDITO"],
    ["CRÉDITO", "CREDITO"],
  ])("acomoda %s", (texto, esperado) => {
    expect(resolverFormaPago(texto)?.valor).toBe(esperado);
  });

  it("lo que no reconoce no lo inventa", () => {
    expect(resolverFormaPago("PERMUTA")).toBeNull();
    expect(etiquetaFormaPago("PERMUTA")).toBe("PERMUTA");
    expect(etiquetaFormaPago(null)).toBe("—");
    expect(etiquetaCortaFormaPago("TARJETA")).toBe("T. créd.");
  });

  it("solo transferencia y cheque piden datos bancarios", () => {
    expect(requiereDatosBancarios("TRANSFERENCIA")).toBe(true);
    expect(requiereDatosBancarios("CHEQUE")).toBe(true);
    expect(requiereDatosBancarios("TARJETA_CREDITO")).toBe(false);
    expect(requiereDatosBancarios("EFECTIVO")).toBe(false);
  });
});

import { esTarjeta, limpiarTarjetaRef } from "@/lib/formas-pago";

describe("tarjeta usada (banco + ultimos 4)", () => {
  it("detecta tarjeta", () => {
    expect(esTarjeta("TARJETA_CREDITO")).toBe(true);
    expect(esTarjeta("TARJETA_DEBITO")).toBe(true);
    expect(esTarjeta("EFECTIVO")).toBe(false);
  });
  it("guarda banco y ultimos 4 tal cual", () => {
    expect(limpiarTarjetaRef("BBVA 1234")).toBe("BBVA 1234");
    expect(limpiarTarjetaRef("  Banorte  5678 ")).toBe("Banorte 5678");
    expect(limpiarTarjetaRef("")).toBeNull();
    expect(limpiarTarjetaRef(null)).toBeNull();
  });
  it("NUNCA guarda un numero de tarjeta completo", () => {
    expect(limpiarTarjetaRef("BBVA 4152 3137 0000 1234")).toBe("BBVA •1234");
    expect(limpiarTarjetaRef("4152313700001234")).toBe("•1234");
    expect(limpiarTarjetaRef("Santander 4152-3137-0000-9876")).toBe("Santander •9876");
  });
});
