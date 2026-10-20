import { describe, it, expect } from "vitest";
import { motivoNombreInvalido as mi, separarCantidad as sc } from "@/lib/producto-nombre";
describe("nombre de producto nuevo", () => {
  it("rechaza cantidades y basura", () => { expect(mi("4")).toMatch(/cantidad/); expect(mi("1")).toMatch(/cantidad/); expect(mi("2 x 4")).toMatch(/cantidad/); expect(mi("")).toMatch(/Escribe/); expect(mi("ab")).toMatch(/completo/); });
  it("acepta nombres", () => { expect(mi("Cepillos para pintar")).toBeNull(); expect(mi("Disco corte metal 4.5")).toBeNull(); expect(mi("PTR 2x2")).toBeNull(); });
  it("separa cantidad del nombre", () => { expect(sc("4 cepillos para pintar")).toEqual({ qty: 4, nombre: "cepillos para pintar" }); expect(sc("2 pzas disco corte")).toEqual({ qty: 2, nombre: "disco corte" }); expect(sc("Cemento")).toEqual({ qty: 1, nombre: "Cemento" }); expect(sc("Disco 4.5")).toEqual({ qty: 1, nombre: "Disco 4.5" }); });
});
