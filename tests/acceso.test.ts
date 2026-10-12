import { describe, it, expect } from "vitest";
import { rutaPermitida, rolPermiteRuta } from "@/lib/acceso";

const perms = { talento: ["checadas"], requisiciones: ["*"], obras: ["catalogo"] };
describe("una sola regla de acceso para Doménica y ARIA27", () => {
  it("admin entra a todo", () => expect(rutaPermitida("/dashboard/talento/usuarios", "admin", {})).toBe(true));
  it("submódulo sin permiso no se muestra", () => {
    expect(rutaPermitida("/dashboard/talento/personal", "residente", perms)).toBe(false);
    expect(rutaPermitida("/dashboard/talento/checadas", "residente", perms)).toBe(true);
  });
  it("módulo sin permiso no se muestra", () => expect(rutaPermitida("/dashboard/finanzas", "residente", perms)).toBe(false));
  it("herramientas de Doménica por rol", () => {
    expect(rolPermiteRuta("/dashboard/domenica/automatizaciones", "residente")).toBe(false);
    expect(rolPermiteRuta("/dashboard/domenica/automatizaciones", "rh")).toBe(true);
    expect(rutaPermitida("/dashboard/requisiciones/productos", "residente", perms)).toBe(false);
    expect(rutaPermitida("/dashboard/campo/autorizar", "residente", perms)).toBe(true);
  });
  it("sin rol conocido todavía, no esconde nada", () => expect(rutaPermitida("/dashboard/finanzas", "", {})).toBe(true));
  it("si la pantalla redirige, se revisa el destino", () => expect(rutaPermitida("/dashboard/administracion/siroc", "usuario", { administracion: ["*"] })).toBe(false));
  it("rutas sin regla quedan abiertas", () => expect(rutaPermitida("/dashboard/actividades", "residente", perms)).toBe(true));
});
