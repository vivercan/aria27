import { describe, it, expect } from "vitest";
import { emailAllowed, whatsappAllowed, EMAIL_BY_CONTEXT } from "@/lib/notif-policy";

describe("FIX 549 notif-policy", () => {
  it("creador recibe correo por defecto; compras/admin/ops no", () => {
    expect(emailAllowed("creador")).toBe(true);
    expect(emailAllowed("direccion_accion")).toBe(true);
    expect(emailAllowed("proveedor")).toBe(true);
    expect(emailAllowed("compras")).toBe(false);
    expect(emailAllowed("admin")).toBe(false);
    expect(emailAllowed("ops_direccion")).toBe(false);
    expect(emailAllowed("ops_rh")).toBe(false);
  });
  it("override false (RH) apaga el correo incluso como creador", () => {
    expect(emailAllowed("creador", false)).toBe(false);
    expect(emailAllowed("direccion_accion", false)).toBe(false);
  });
  it("override true fuerza correo aunque la politica diga no", () => {
    expect(emailAllowed("admin", true)).toBe(true);
    expect(emailAllowed("ops_rh", true)).toBe(true);
  });
  it("null/undefined cae a la politica", () => {
    expect(emailAllowed("compras", null)).toBe(false);
    expect(emailAllowed("creador", undefined)).toBe(true);
  });
  it("WhatsApp siempre permitido", () => {
    (Object.keys(EMAIL_BY_CONTEXT) as Array<keyof typeof EMAIL_BY_CONTEXT>).forEach(c => expect(whatsappAllowed(c)).toBe(true));
  });
});
