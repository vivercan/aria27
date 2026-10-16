import { describe, it, expect } from "vitest";
import { firmasDeRequi, cajaDe } from "@/lib/firmas";
const D = { "compras@gcuavante.com": { nombre: "Jessica", dataUrl: "data:j" }, "superintendencia@gcuavante.com": { nombre: "Daisy", dataUrl: "data:d" }, "recursos.humanos@gcuavante.com": { nombre: "Deyanira", dataUrl: "data:y" }, "administracion@gcuavante.com": { nombre: "Valeria", dataUrl: "data:v" } };
describe("firmas en el PDF", () => {
  it("quien hace la requi firma en su caja", () => {
    expect(firmasDeRequi({ user_email: "compras@gcuavante.com" }, D)).toEqual({ compras: D["compras@gcuavante.com"] });
    expect(firmasDeRequi({ user_email: "Superintendencia@gcuavante.com" }, D)).toEqual({ revision: D["superintendencia@gcuavante.com"] });
    expect(firmasDeRequi({ user_email: "recursos.humanos@gcuavante.com" }, D)).toEqual({ validacion: D["recursos.humanos@gcuavante.com"] });
  });
  it("quien no tiene caja firma como solicitante", () => {
    expect(firmasDeRequi({ user_email: "administracion@gcuavante.com" }, D)).toEqual({ solicitante: D["administracion@gcuavante.com"] });
  });
  it("sin firma registrada, perfil de prueba o QA: nada", () => {
    expect(firmasDeRequi({ user_email: "luis.ramirez@gcuavante.com" }, D)).toEqual({});
    expect(firmasDeRequi({ user_email: "compras@prueba.jjcrm27.com" }, D)).toEqual({});
    expect(firmasDeRequi({ user_email: "compras@gcuavante.com", descripcion_corta: "QA prueba NO PROCESAR" }, D)).toEqual({});
    expect(cajaDe("compras@gcuavante.com", false)).toBeNull();
  });
});
