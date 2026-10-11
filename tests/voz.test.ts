import { describe, it, expect } from "vitest";
import { parecido, suenaAMaterial } from "@/lib/voz";
describe("notas de voz", () => {
  const obras = [{ nombre: "BLVD. RUIZ CORTINES" }, { nombre: "DIF ESTATAL EL CÓBANO" }, { nombre: "OFICINA" }];
  it("encuentra la obra aunque se diga distinto", () => { expect(parecido("ruiz cortines", obras)?.nombre).toBe("BLVD. RUIZ CORTINES"); expect(parecido("el cobano", obras)?.nombre).toBe("DIF ESTATAL EL CÓBANO"); expect(parecido("marte", obras)).toBeNull(); });
  it("distingue material de actividad", () => {
    expect(suenaAMaterial("Necesito 20 sacos de cemento para mañana en Ruiz Cortines")).toBe(true);
    expect(suenaAMaterial("Que Miguel revise la cimbra del nivel 2 el viernes")).toBe(false);
  });
});
