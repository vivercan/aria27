import { describe, it, expect } from "vitest";
import { recorrerSiguientes, bloqueadaPor, rutaCritica } from "@/lib/dependencias";

const acts = [
  { id: "cimbra", fecha_inicio: "2026-10-12", fecha_compromiso: "2026-10-13", estatus: "EN_PROGRESO", obra: "A" },
  { id: "acero", depende_de: "cimbra", fecha_inicio: "2026-10-14", fecha_compromiso: "2026-10-15", estatus: "PENDIENTE", obra: "A" },
  { id: "colado", depende_de: "acero", fecha_inicio: "2026-10-16", fecha_compromiso: "2026-10-16", estatus: "PENDIENTE", obra: "A" },
  { id: "libre", fecha_inicio: "2026-10-12", fecha_compromiso: "2026-10-20", estatus: "PENDIENTE", obra: "A" },
];
describe("recorrer las que siguen", () => {
  it("si la cimbra se atrasa 2 días, el acero y el colado se recorren 2 días conservando duración", () => {
    const r = recorrerSiguientes(acts, "cimbra", "2026-10-15");
    expect(r).toEqual([
      { id: "acero", fecha_inicio: "2026-10-16", fecha_compromiso: "2026-10-17", dias: 2 },
      { id: "colado", fecha_inicio: "2026-10-18", fecha_compromiso: "2026-10-18", dias: 2 },
    ]);
  });
  it("si se adelanta, no se mueve nada", () => { expect(recorrerSiguientes(acts, "cimbra", "2026-10-12")).toEqual([]); });
  it("no toca terminadas ni entra en círculos", () => {
    const c = [{ id: "a", depende_de: "b", fecha_inicio: "2026-01-01", fecha_compromiso: "2026-01-02" }, { id: "b", depende_de: "a", fecha_inicio: "2026-01-01", fecha_compromiso: "2026-01-01" }];
    expect(recorrerSiguientes(c, "a", "2026-01-05").map(x => x.id)).toEqual(["b"]);
  });
});
describe("bloqueo y ruta crítica", () => {
  it("el acero está bloqueado mientras la cimbra no termine", () => { expect(bloqueadaPor(acts[1], acts)?.id).toBe("cimbra"); expect(bloqueadaPor(acts[3], acts)).toBeNull(); });
  it("ruta crítica = cimbra → acero → colado (no la libre)", () => { expect([...rutaCritica(acts)].sort()).toEqual(["acero", "cimbra", "colado"]); });
});
