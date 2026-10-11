import { describe, it, expect } from "vitest";
import { numerosObra, semaforoObra, presupuestoDe, normObra } from "@/lib/obras-dom";
import type { Actividad } from "@/lib/actividades";

describe("espacio por obra", () => {
  const o = { id: "o1", nombre: "Blvd. Ruiz Cortines", presupuesto: 100000, presupuesto_contratado: 0 };
  it("normaliza nombres", () => { expect(normObra("BLVD. RUIZ CORTINES")).toBe(normObra("blvd ruiz cortines")); });
  it("presupuesto contratado + ampliaciones manda", () => { expect(presupuestoDe({ id: "x", nombre: "x", presupuesto: 5, presupuesto_contratado: 100, presupuesto_ampliaciones: 20 })).toBe(120); expect(presupuestoDe(o)).toBe(100000); });
  it("junta actividades y solicitudes", () => {
    const acts = [
      { id: "1", titulo: "a", obra_id: "o1", estatus: "COMPLETADA", avance: 100 },
      { id: "2", titulo: "b", obra: "BLVD. RUIZ CORTINES", estatus: "PENDIENTE", avance: 0, fecha_compromiso: "2020-01-01" },
      { id: "3", titulo: "c", obra_id: "otra", estatus: "PENDIENTE" },
    ] as Actividad[];
    const reqs = [
      { id: "r1", folio: "1", cost_center_name: "BLVD. RUIZ CORTINES", status: "AUTORIZADA", total: 1000, monto: null },
      { id: "r2", folio: "2", cost_center_name: "Blvd Ruiz Cortines", status: "CANCELADA", total: 9999, monto: null },
      { id: "r3", folio: "3", cost_center_name: "OTRA", status: "AUTORIZADA", total: 5, monto: null },
    ];
    const x = numerosObra(o, acts, reqs);
    expect(x.actividades.length).toBe(2); expect(x.abiertas.length).toBe(1); expect(x.atrasadas).toBe(1);
    expect(x.gastado).toBe(1000); expect(x.pctGasto).toBe(1); expect(x.avance).toBe(50);
  });
  it("semáforo", () => {
    expect(semaforoObra({ atoradas: 1, atrasadas: 0, pctGasto: 10 }).t).toBe("Atención");
    expect(semaforoObra({ atoradas: 0, atrasadas: 2, pctGasto: 10 }).t).toBe("Vigilar");
    expect(semaforoObra({ atoradas: 0, atrasadas: 0, pctGasto: 90 }).t).toBe("Vigilar");
    expect(semaforoObra({ atoradas: 0, atrasadas: 0, pctGasto: null }).t).toBe("En orden");
  });
});
