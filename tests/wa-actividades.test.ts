import { describe, it, expect } from "vitest";
import { clasificarTextoWA } from "@/lib/wa-actividades";
describe("bot de WhatsApp: ¿es de una actividad?", () => {
  it("respuestas de quien tiene tareas", () => { for (const t of ["ya quedó", "Ya quedo jefe", "50", "voy a la mitad", "no hay cemento", "👍", "ok", "ya mero", "mis tareas"]) expect(clasificarTextoWA(t, true, false), t).toBe("actividad"); });
  it("aprobaciones del que encargó", () => { for (const t of ["APROBAR", "aprobar 2", "regresar falta la foto", "está bien"]) expect(clasificarTextoWA(t, false, true), t).toBe("aprobacion"); });
  it("NO roba pedidos ni gastos", () => { for (const t of ["pedir 10 sacos de cemento para tanque", "necesito 5 varillas", "compré gasolina $500", "gasto 350 comida", "ticket de la ferretería 1200", "req cemento"]) expect(clasificarTextoWA(t, true, true), t).toBe("otro"); });
  it("sin tareas, todo sigue al bot de siempre", () => { for (const t of ["ya quedó", "50", "hola"]) expect(clasificarTextoWA(t, false, false), t).toBe("otro"); });
});
