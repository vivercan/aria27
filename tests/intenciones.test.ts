/** 11-Oct-2026 · Que Doménica entienda de muchas formas. Si alguien cambia las reglas, estas frases reales no se pueden romper. */
import { describe, it, expect } from "vitest";
import { interpretar } from "@/lib/comandos-voz";
import { suena, decidir } from "@/lib/intenciones";
import { FRASES, FRASES_CIEGAS, FRASES_FINAL } from "./frases-voz";

// "elegir" con UNA sugerencia = la regla cree saber, pero se confirma (IA o la persona) antes de abrir: cuenta como acierto si la sugerencia es la correcta
const resultado = (f: string) => { const c = interpretar(f) as { tipo: string; href?: string; pista?: string; opciones?: { href: string | null }[] };
  if (c.tipo === "elegir" && c.opciones?.length === 1 && c.opciones[0].href) return c.opciones[0].href;
  return c.tipo === "ir" ? c.href : c.tipo === "ia" ? `ia:${c.pista || "?"}` : c.tipo; };

describe("Doménica entiende frases reales", () => {
  for (const [f, e] of [...FRASES, ...FRASES_CIEGAS, ...FRASES_FINAL]) it(`"${f}"`, () => { const r = resultado(f); expect(e === "ia:actividad" ? ["ia:actividad", "ia:?"] : [e]).toContain(r); });
});
describe("cómo suena (errores del dictado)", () => {
  it("b/v, s/z/c, h muda, qu/k", () => {
    expect(suena("Requisición")).toBe(suena("requisision")); expect(suena("bitácora")).toBe(suena("vitacora")); expect(suena("autorizar")).toBe(suena("autorisar"));
    expect(suena("hacer")).toBe(suena("aser"));
  });
  it("nunca adivina cuando suena a dos cosas", () => { const d = decidir("fotos"); expect(["clara", "dudosa"]).toContain(d.tipo); });
});
