import { describe, it, expect } from "vitest";
import { leerRespuestaWA } from "@/lib/respuesta-wa";

const CASOS: [string, string, number?][] = [
  ["LISTO", "LISTO", 100], ["ya quedó", "LISTO", 100], ["Ya quedo jefe", "LISTO", 100], ["ya está", "LISTO", 100], ["ya acabé", "LISTO", 100],
  ["terminamos", "LISTO", 100], ["👍", "LISTO", 100], ["✅", "LISTO", 100], ["ya quedó todo inge", "LISTO", 100], ["100", "LISTO", 100], ["listo jefe", "LISTO", 100],
  ["ya mero", "AVANCE", 75], ["ya merito", "AVANCE", 75], ["falta poco", "AVANCE", 75], ["casi", "AVANCE", 75],
  ["voy a la mitad", "AVANCE", 50], ["a medias", "AVANCE", 50], ["50", "AVANCE", 50], ["llevo 30%", "AVANCE", 30], ["al 70", "AVANCE", 70], ["70 por ciento", "AVANCE", 70],
  ["ok", "INICIO", 25], ["enterado", "INICIO", 25], ["👌", "INICIO", 25], ["ahorita voy", "INICIO", 25], ["ya empecé", "INICIO", 25], ["estoy en eso", "INICIO", 25], ["sí jefe", "INICIO", 25], ["sale", "INICIO", 25],
  ["no hay cemento", "BLOQUEADO"], ["falta material", "BLOQUEADO"], ["se rompió la revolvedora", "BLOQUEADO"], ["no puedo, está lloviendo", "BLOQUEADO"], ["no llegó la varilla", "BLOQUEADO"],
  ["bloqueado no hay agua", "BLOQUEADO"], ["❌ no vino el chofer", "BLOQUEADO"],
  ["no le entiendo", "AYUDA"], ["ayuda", "AYUDA"], ["cómo le hago", "AYUDA"],
  ["qué me toca", "STATUS"], ["mis tareas", "STATUS"],
  ["cancelar", "CANCELAR"],
];

describe("respuestas de WhatsApp de la gente de obra", () => {
  for (const [t, intent, pct] of CASOS) it(`"${t}" → ${intent}${pct !== undefined ? " " + pct : ""}`, () => {
    const r = leerRespuestaWA(t); expect(r.intent).toBe(intent); if (pct !== undefined) expect(r.porcentaje).toBe(pct);
  });
  it("número de tarea al inicio", () => { expect(leerRespuestaWA("2 ya quedó")).toMatchObject({ intent: "LISTO", tareaIdx: 2 }); expect(leerRespuestaWA("tarea 3 no hay cemento")).toMatchObject({ intent: "BLOQUEADO", tareaIdx: 3 }); });
  it("\"no puedo\" ya NO cancela (es un problema)", () => { expect(leerRespuestaWA("no puedo").intent).toBe("BLOQUEADO"); });
});
