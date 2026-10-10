import { describe, it, expect } from "vitest";
import { buildStepper, accionPara, statusLabel } from "@/lib/requi-stepper";

const est = (p: ReturnType<typeof buildStepper>) => Object.fromEntries(p.map(x => [x.key, x.estado]));

describe("F1 requi-stepper", () => {
  it("historica PENDIENTE sin responsable: responsable omitido, Compras actual", () => {
    const e = est(buildStepper({ status: "PENDIENTE", purchase_status: "PENDIENTE", created_at: "2026-07-01" }));
    expect(e.creada).toBe("hecho"); expect(e.responsable).toBe("omitido"); expect(e.cotizacion).toBe("actual"); expect(e.direccion).toBe("pendiente"); expect(e.oc).toBe("pendiente");
  });
  it("esperando responsable", () => {
    const e = est(buildStepper({ status: "PENDIENTE_RESPONSABLE", responsable_email: "b@x.com" }));
    expect(e.responsable).toBe("actual");
  });
  it("destajo efectivo: sin Compras ni OC; Direccion actual en EN_AUTORIZACION", () => {
    const p = buildStepper({ status: "EN_AUTORIZACION", purchase_status: "GASTO_EFECTIVO_PENDIENTE", tipo_solicitud: "DESTAJO" });
    expect(p.map(x => x.key)).toEqual(["creada", "responsable", "direccion", "pago", "entrega"]);
    expect(est(p).direccion).toBe("actual"); expect(p.at(-1)?.label).toBe("Recibo");
  });
  it("rechazada por direccion: pasos posteriores omitidos", () => {
    const e = est(buildStepper({ status: "RECHAZADA_DIRECCION", purchase_status: "PENDIENTE" }));
    expect(e.direccion).toBe("rechazado"); expect(e.oc).toBe("omitido"); expect(e.pago).toBe("omitido");
  });
  it("fecha_pago programada NO cuenta como pagado", () => {
    const e = est(buildStepper({ status: "EN_AUTORIZACION", purchase_status: "GASTO_EFECTIVO_PENDIENTE", tipo_solicitud: "DESTAJO", fecha_pago: "2026-10-08" }));
    expect(e.pago).toBe("pendiente"); expect(e.entrega).toBe("pendiente");
  });
  it("entregada: todo hecho", () => {
    const e = est(buildStepper({ status: "ENTREGADA", purchase_status: "PENDIENTE", responsable_autorizo_at: "2026-10-01", authorized_at: "2026-10-02", fecha_pago: "2026-10-03", fecha_entrega: "2026-10-04" }));
    expect(Object.values(e).every(v => v === "hecho")).toBe(true);
  });
  it("accion por rol", () => {
    const r = { status: "PENDIENTE_RESPONSABLE", responsable_email: "betzabe.lopez@gcuavante.com", user_email: "daisy@x" };
    expect(accionPara(r, "residente", "betzabe.lopez@gcuavante.com")).toBe("AUTORIZAR_RESPONSABLE");
    expect(accionPara(r, "residente", "otro@x")).toBe(null);
    expect(accionPara(r, "direccion", "f@x")).toBe("AUTORIZAR_RESPONSABLE");
    expect(accionPara(r, "validador", "superintendencia@gcuavante.com")).toBe("AUTORIZAR_RESPONSABLE"); // respaldo superintendencia
    expect(accionPara(r, "compras", "j@x")).toBe(null);
    expect(accionPara({ status: "PENDIENTE", purchase_status: "PENDIENTE" }, "compras", "j@x")).toBe("COTIZAR");
    expect(accionPara({ status: "EN_AUTORIZACION" }, "direccion", "f@x")).toBe("APROBAR_DIRECCION");
    expect(accionPara({ status: "APROBADA", purchase_status: "GASTO_EFECTIVO_PENDIENTE" }, "usuario", "l@x")).toBe("PAGAR");
    expect(accionPara({ status: "OC_GENERADA", user_email: "d@x" }, "validador", "d@x")).toBe("REGISTRAR_ENTREGA");
    expect(accionPara({ status: "ENTREGADA", user_email: "d@x" }, "validador", "d@x")).toBe(null);
  });
  it("labels", () => { expect(statusLabel("PENDIENTE_RESPONSABLE")).toBe("Esperando responsable"); expect(statusLabel("XYZ")).toBe("XYZ"); });
});
