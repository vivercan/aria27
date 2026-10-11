import { describe, it, expect } from "vitest";
import { enRiesgo } from "@/lib/riesgo";
import type { Actividad } from "@/lib/actividades";
const A = (o: Partial<Actividad>) => ({ id: "1", titulo: "x", estatus: "EN_PROGRESO", ...o }) as Actividad;
describe("alerta temprana", () => {
  it("vence pronto con poco avance", () => { expect(enRiesgo(A({ fecha_compromiso: "2026-10-12", avance: 10 }), "2026-10-11")?.motivo).toMatch(/Vence en 1 día/); });
  it("va lento contra el tiempo", () => { expect(enRiesgo(A({ fecha_inicio: "2026-10-01", fecha_compromiso: "2026-10-21", avance: 10 }), "2026-10-15")?.motivo).toMatch(/Va lento/); });
  it("va bien = sin alerta", () => { expect(enRiesgo(A({ fecha_inicio: "2026-10-01", fecha_compromiso: "2026-10-21", avance: 70 }), "2026-10-15")).toBeNull(); });
  it("terminada o ya atrasada no cuenta aquí", () => { expect(enRiesgo(A({ estatus: "COMPLETADA", fecha_compromiso: "2026-10-12" }), "2026-10-11")).toBeNull(); });
});
