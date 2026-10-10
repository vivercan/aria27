import { describe, it, expect } from "vitest";
import { columnaDe, cambiosPorColumna, cambiosPorAvance, diasAtraso, venceHoy, esMia, laAsigneYo, iniciales, resumen, type Actividad } from "../src/lib/actividades";

const base = (o: Partial<Actividad>): Actividad => ({ id: "x", titulo: "t", estatus: "PENDIENTE", ...o });

describe("actividades", () => {
  it("columna derivada como el bot de WhatsApp", () => {
    expect(columnaDe(base({ estatus: "PENDIENTE" }))).toBe("POR_HACER");
    expect(columnaDe(base({ estatus: "EN_PROGRESO" }))).toBe("EN_PROCESO");
    expect(columnaDe(base({ estatus: "EN_PROGRESO", motivo_bloqueo: "se rompio la varilla" }))).toBe("BLOQUEADA");
    expect(columnaDe(base({ estatus: "COMPLETADA", motivo_bloqueo: "viejo" }))).toBe("TERMINADA");
  });
  it("mover tarjeta", () => {
    expect(cambiosPorColumna("TERMINADA", { avance: 30 })).toMatchObject({ estatus: "COMPLETADA", avance: 100, motivo_bloqueo: null });
    expect(cambiosPorColumna("BLOQUEADA", { avance: 30 }, "sin material")).toMatchObject({ estatus: "EN_PROGRESO", motivo_bloqueo: "sin material" });
    expect(cambiosPorColumna("EN_PROCESO", { avance: 0 })).toMatchObject({ estatus: "EN_PROGRESO", avance: 10 });
    expect(cambiosPorColumna("EN_PROCESO", { avance: 100 })).toMatchObject({ avance: 75 });
    expect(cambiosPorColumna("POR_HACER", { avance: 50 })).toMatchObject({ estatus: "PENDIENTE" });
  });
  it("slider de avance", () => {
    expect(cambiosPorAvance(100, { estatus: "EN_PROGRESO" })).toMatchObject({ estatus: "COMPLETADA", avance: 100 });
    expect(cambiosPorAvance(40, { estatus: "PENDIENTE" })).toMatchObject({ estatus: "EN_PROGRESO", avance: 40 });
    expect(cambiosPorAvance(0, { estatus: "PENDIENTE" })).toEqual({ avance: 0 });
  });
  it("atrasos y hoy", () => {
    const hoy = new Date("2026-10-10T12:00:00");
    expect(diasAtraso(base({ fecha_compromiso: "2026-10-07" }), hoy)).toBe(3);
    expect(diasAtraso(base({ fecha_compromiso: "2026-10-10" }), hoy)).toBe(0);
    expect(diasAtraso(base({ fecha_compromiso: "2026-10-01", estatus: "COMPLETADA" }), hoy)).toBe(0);
    expect(venceHoy(base({ fecha_compromiso: "2026-10-10" }), hoy)).toBe(true);
  });
  it("mias / asignadas por mi", () => {
    expect(esMia(base({ asignado_email: "COMPRAS@gcuavante.com" }), "compras@gcuavante.com")).toBe(true);
    expect(esMia(base({ asignado_id: "e1" }), "otro@x", "e1")).toBe(true);
    expect(laAsigneYo(base({ asignado_por: "recursos.humanos@gcuavante.com" }), "recursos.humanos@gcuavante.com")).toBe(true);
  });
  it("iniciales y resumen", () => {
    expect(iniciales("Jessica Gallardo Acosta")).toBe("JG");
    const hoy = new Date("2026-10-10T12:00:00");
    const r = resumen([base({ fecha_compromiso: "2026-10-01" }), base({ estatus: "EN_PROGRESO", motivo_bloqueo: "x" }), base({ estatus: "COMPLETADA" }), base({ fecha_compromiso: "2026-10-10" })], hoy);
    expect(r).toMatchObject({ abiertas: 3, atoradas: 1, atrasadas: 1, hoy: 1, terminadas: 1 });
  });
});
