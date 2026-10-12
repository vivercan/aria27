import { describe, it, expect } from "vitest";
import { puedeRegistrarEntrega } from "@/lib/requi-stepper";

const r = (o: Record<string, unknown> = {}) => ({ status: "PENDIENTE", tipo_solicitud: "MATERIALES", user_email: "otro@x.com", ...o }) as never;
describe("quién puede registrar una entrega (igual que el servidor)", () => {
  it("Administración y RH ven todo lo que se puede recibir", () => { expect(puedeRegistrarEntrega(r(), "admin", "a@x.com")).toBe(true); expect(puedeRegistrarEntrega(r(), "rh", "a@x.com")).toBe(true); });
  it("el que la pidió siempre puede", () => expect(puedeRegistrarEntrega(r({ user_email: "yo@x.com" }), "usuario", "YO@x.com")).toBe(true));
  it("Dirección no registra entregas ajenas", () => expect(puedeRegistrarEntrega(r(), "direccion", "d@x.com")).toBe(false));
  it("no en entregadas, canceladas ni destajos", () => {
    expect(puedeRegistrarEntrega(r({ status: "ENTREGADA" }), "admin", "a@x.com")).toBe(false);
    expect(puedeRegistrarEntrega(r({ status: "CANCELADA" }), "admin", "a@x.com")).toBe(false);
    expect(puedeRegistrarEntrega(r({ tipo_solicitud: "DESTAJO" }), "admin", "a@x.com")).toBe(false);
  });
});
