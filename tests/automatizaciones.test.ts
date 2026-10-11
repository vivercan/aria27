import { describe, it, expect } from "vitest";
import { describir, componerMensaje, enHorario, PLANTILLAS, type Regla, type Caso } from "../src/lib/automatizaciones";

const regla = (o: Partial<Regla> = {}): Regla => ({ id: "r1", nombre: "Requi 2 días", activa: true, modo_prueba: false, disparador: "REQUI_ESTANCADA", params: { estado: "EN_AUTORIZACION", dias: 2 }, destinatarios: { roles: ["direccion"] }, accion: "AVISAR", accion_params: {}, repetir_cada_horas: 24, ...o });
const caso = (i: number): Caso => ({ tipo: "requi", id: "c" + i, etiqueta: `REQ-2026-0000${i}`, obra: "TANQUE", dias: 3, involucrado: null, url: "/x" });

describe("automatizaciones", () => {
  it("describe en espanol", () => {
    expect(describir(regla())).toBe("Cuando una requisición lleve más de 2 días esperando autorización de Dirección → avisar a Dirección");
    expect(describir(regla({ disparador: "REQUI_MONTO_ALTO", params: { monto: 50000 } }))).toContain("$50,000");
  });
  it("mensaje en una sola linea con lista y resumen", () => {
    const m = componerMensaje(regla(), [1, 2, 3, 4, 5, 6, 7, 8].map(caso));
    expect(m).toContain("8 requisición(es)");
    expect(m).toContain("REQ-2026-00001 TANQUE (3d)");
    expect(m).toContain("y 2 más");
    expect(m).not.toMatch(/[\n\r\t]/);
  });
  it("horario 7 a 20 de Aguascalientes", () => {
    expect(enHorario(new Date("2026-10-12T15:00:00Z"))).toBe(true);  // 9:00 MX
    expect(enHorario(new Date("2026-10-12T04:00:00Z"))).toBe(false); // 22:00 MX
  });
  it("plantillas validas", () => { for (const p of PLANTILLAS) expect(describir(p)).toMatch(/^Cuando /); });
});
