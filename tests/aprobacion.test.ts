import { describe, it, expect } from "vitest";
import { leerAprobacionWA } from "@/lib/aprobacion";
describe("visto bueno por WhatsApp", () => {
  it("aprobar", () => { for (const t of ["APROBAR", "aprobado", "Está bien", "quedó bien", "ya la revisé", "👍", "perfecto gracias"]) expect(leerAprobacionWA(t)?.accion, t).toBe("aprobar"); });
  it("regresar con motivo", () => {
    expect(leerAprobacionWA("REGRESAR falta pintar la puerta")).toEqual({ accion: "regresar", motivo: "falta pintar la puerta", idx: undefined });
    expect(leerAprobacionWA("no quedó bien, le falta limpieza")?.accion).toBe("regresar");
    expect(leerAprobacionWA("regresar 2 falta la foto")?.idx).toBe(2);
  });
  it("un ok suelto o un avance NO es aprobación", () => { for (const t of ["ok", "ya quedó", "50", "no hay cemento", "voy"]) expect(leerAprobacionWA(t), t).toBeNull(); });
});
