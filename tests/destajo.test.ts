import { describe, it, expect } from "vitest";
import { resumenDestajo, grupoDe } from "@/lib/destajo";
describe("pagos a destajistas", () => {
  it("separa autorizado de en trámite y descarta canceladas", () => {
    const r = resumenDestajo([
      { id: "1", folio: "a", created_at: "", status: "AUTORIZADA_HISTORICO", monto: 14700 },
      { id: "2", folio: "b", created_at: "", status: "EN_AUTORIZACION", total: 28000 },
      { id: "3", folio: "c", created_at: "", status: "PENDIENTE", monto: 800 },
      { id: "4", folio: "d", created_at: "", status: "CANCELADA", monto: 99999 },
    ]);
    expect(r).toEqual({ autorizado: 14700, nAutorizado: 1, tramite: 28800, nTramite: 2, total: 43500, n: 3 });
  });
  it("grupos", () => { expect(grupoDe("PAGADA")).toBe("autorizado"); expect(grupoDe("PENDIENTE")).toBe("tramite"); expect(grupoDe("RECHAZADA_DIRECCION")).toBe("descartado"); expect(grupoDe(null)).toBe("tramite"); });
});
