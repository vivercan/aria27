import { describe, it, expect } from "vitest";
import { limpiarItems, programar, siguienteFecha, diaSemana, describirRecurrencia, mencionesEnTexto, hoyMX } from "@/lib/plantillas";

describe("plantillas", () => {
  it("valida renglones y dependencias hacia atrás", () => {
    expect(limpiarItems([]).error).toBeTruthy();
    expect(limpiarItems([{ titulo: "" }]).error).toMatch(/nombre/);
    expect(limpiarItems([{ titulo: "A" }, { titulo: "B", depende: 1 }]).error).toMatch(/antes/);
    const r = limpiarItems([{ titulo: "A", dia: 0, duracion: 2, prioridad: "alta" }, { titulo: "B", dia: 2, duracion: 0, depende: 0, checklist: ["x", ""] }]);
    expect(r.items?.[0].prioridad).toBe("ALTA");
    expect(r.items?.[1]).toMatchObject({ duracion: 1, depende: 0, checklist: ["x"], prioridad: "MEDIA" });
  });
  it("programa fechas desde el arranque", () => {
    const f = programar([{ titulo: "A", dia: 0, duracion: 3, prioridad: "MEDIA", checklist: [] }, { titulo: "B", dia: 5, duracion: 1, prioridad: "MEDIA", checklist: [] }], "2026-10-30");
    expect(f[0]).toEqual({ fecha_inicio: "2026-10-30", fecha_compromiso: "2026-11-01" });
    expect(f[1]).toEqual({ fecha_inicio: "2026-11-04", fecha_compromiso: "2026-11-04" });
  });
});

describe("recurrentes", () => {
  it("día de la semana ISO", () => { expect(diaSemana("2026-10-12")).toBe(1); expect(diaSemana("2026-10-11")).toBe(7); });
  it("semanal", () => {
    expect(siguienteFecha("SEMANAL", 1, "2026-10-12")).toBe("2026-10-12");
    expect(siguienteFecha("SEMANAL", 1, "2026-10-13")).toBe("2026-10-19");
    expect(siguienteFecha("SEMANAL", 5, "2026-10-11")).toBe("2026-10-16");
  });
  it("diaria salta domingo", () => { expect(siguienteFecha("DIARIA", null, "2026-10-11")).toBe("2026-10-12"); expect(siguienteFecha("DIARIA", null, "2026-10-13")).toBe("2026-10-13"); });
  it("mensual con fin de mes", () => {
    expect(siguienteFecha("MENSUAL", 1, "2026-10-02")).toBe("2026-11-01");
    expect(siguienteFecha("MENSUAL", 31, "2026-02-10")).toBe("2026-02-28");
    expect(siguienteFecha("MENSUAL", 15, "2026-12-20")).toBe("2027-01-15");
  });
  it("textos", () => { expect(describirRecurrencia("SEMANAL", 1)).toBe("Cada lunes"); expect(describirRecurrencia("MENSUAL", 31)).toMatch(/último/); });
  it("hoy en México", () => { expect(hoyMX(new Date("2026-10-12T03:00:00Z"))).toBe("2026-10-11"); });
});

describe("menciones", () => {
  it("detecta @Nombre", () => {
    const c = [{ id: "1", nombre: "Daisy Ruiz" }, { id: "2", nombre: "Jessica" }];
    expect(mencionesEnTexto("Hola @daisy ruiz revisa", c)).toEqual(["1"]);
    expect(mencionesEnTexto("sin menciones", c)).toEqual([]);
  });
});
