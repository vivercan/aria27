import { describe, it, expect } from "vitest";
import { momentoSeguro } from "@/lib/version-check";

const doc = (abierto: string | null, activo?: string) => ({
  querySelector: (sel: string) => (abierto && sel.split(",").some(s => s.trim() === abierto) ? {} : null),
  activeElement: activo ? { tagName: activo, isContentEditable: false } : { tagName: "BODY", isContentEditable: false },
}) as unknown as Document;

describe("actualización sin sacar al usuario", () => {
  it("con todo cerrado y sin escribir, sí actualiza", () => expect(momentoSeguro(doc(null))).toBe(true));
  it("con la ficha de una solicitud abierta, espera", () => expect(momentoSeguro(doc(".aria-sheet"))).toBe(false));
  it("con cualquier ventana tipo modal abierta, espera", () => expect(momentoSeguro(doc('[class*="fixed"][class*="inset-0"][class*="bg-black"]'))).toBe(false));
  it("mientras escribe, espera", () => { expect(momentoSeguro(doc(null, "TEXTAREA"))).toBe(false); expect(momentoSeguro(doc(null, "INPUT"))).toBe(false); });
});
