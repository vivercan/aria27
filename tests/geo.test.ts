import { describe, it, expect } from "vitest";
import { distanciaM, obraAqui } from "@/lib/geo";
describe("geocerca", () => {
  it("distancia aproximada", () => { expect(Math.round(distanciaM({ lat: 21.88, lng: -102.29 }, { lat: 21.881, lng: -102.29 }))).toBeGreaterThan(100); });
  it("elige la obra donde estás", () => {
    const obras = [{ id: "a", nombre: "A", latitud: 21.8996, longitud: -102.3047, radio_metros: 200 }, { id: "b", nombre: "B", latitud: 21.95, longitud: -102.3, radio_metros: 200 }, { id: "c", nombre: "Sin GPS", latitud: null, longitud: null, radio_metros: null }];
    expect(obraAqui({ lat: 21.8999, lng: -102.3046 }, obras)?.obra.id).toBe("a");
    expect(obraAqui({ lat: 21.7, lng: -102.1 }, obras)).toBeNull();
  });
});
