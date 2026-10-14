import { describe, it, expect } from "vitest";
import { nivelUso, atoradas, ordenarUso, diasDesde, type FilaUso } from "@/lib/uso";
const f = (o: Partial<FilaUso>): FilaUso => ({ email: "a@x", nombre: "A", rol: "residente", telefono: null, ultimoIngreso: null, diasSinEntrar: 0, actividadesAbiertas: 0, actividadesAtrasadas: 0, leTocanSolicitudes: 0, solicitudesViejas: 0, porRevisar: 0, ultimoWhatsApp: null, soloWhatsApp: false, ...o });
describe("uso de Doménica", () => {
  it("nivel por días sin entrar", () => {
    expect(nivelUso(0)).toBe("activo"); expect(nivelUso(2)).toBe("activo"); expect(nivelUso(5)).toBe("poco");
    expect(nivelUso(8)).toBe("no-entra"); expect(nivelUso(null)).toBe("nunca"); expect(nivelUso(null, true)).toBe("activo");
  });
  it("cuenta lo atorado", () => { expect(atoradas(f({ actividadesAtrasadas: 2, leTocanSolicitudes: 3, solicitudesViejas: 4, porRevisar: 1 }))).toBe(10); });
  it("primero quien nunca entra y más frena", () => {
    const o = ordenarUso([f({ nombre: "Al día" }), f({ nombre: "Nunca", diasSinEntrar: null, leTocanSolicitudes: 32 }), f({ nombre: "Poco", diasSinEntrar: 5, solicitudesViejas: 9 })]);
    expect(o.map(x => x.nombre)).toEqual(["Nunca", "Poco", "Al día"]);
  });
  it("días desde", () => { expect(diasDesde("2026-10-10T12:00:00Z", new Date("2026-10-14T13:00:00Z"))).toBe(4); expect(diasDesde(null)).toBeNull(); });
});
