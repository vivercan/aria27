import { describe, it, expect } from "vitest";
import { leerRespuestaSeguimiento as L, esViejaSinCerrar, tocaPreguntarHoy, diasSinMover, numeroFolio, type RequiSeg } from "@/lib/requi-seguimiento";

describe("leerRespuestaSeguimiento", () => {
  it("entiende sí", () => {
    expect(L("SI 757")).toEqual({ accion: "si", num: 757 });
    expect(L("sí, ya llegó la 757")).toEqual({ accion: "si", num: 757 });
    expect(L("Ya llegó REQ-2026-00757")).toEqual({ accion: "si", num: 757 });
    expect(L("si todas")).toEqual({ accion: "si", num: "todas" });
    expect(L("ya llegaron todas")).toEqual({ accion: "si", num: "todas" });
    expect(L("Si 00612")).toEqual({ accion: "si", num: 612 });
  });
  it("entiende no", () => {
    expect(L("NO 757")).toEqual({ accion: "no", num: 757 });
    expect(L("aún no 757")).toEqual({ accion: "no", num: 757 });
    expect(L("todavía no ha llegado")).toBeNull();
    expect(L("no ha llegado la 612")).toEqual({ accion: "no", num: 612 });
  });
  it("no confunde otras respuestas del bot", () => {
    expect(L("si")).toBeNull();
    expect(L("1 LISTO")).toBeNull();
    expect(L("AVANCE 50")).toBeNull();
    expect(L("ya quedó")).toBeNull();
    expect(L("necesito 50 bultos de cemento")).toBeNull();
    expect(L("50")).toBeNull();
    expect(L("aprobar 805")).toBeNull();
  });
});

const base = (o: Partial<RequiSeg>): RequiSeg => ({ id: "x", folio: "REQ-2026-00700", status: "PENDIENTE", created_at: "2026-09-01T12:00:00Z", ...o });
const hoy = new Date("2026-10-14T15:00:00Z");
describe("cuándo preguntar", () => {
  it("15 días sin moverse", () => {
    expect(esViejaSinCerrar(base({}), hoy)).toBe(true);
    expect(esViejaSinCerrar(base({ created_at: "2026-10-05T12:00:00Z" }), hoy)).toBe(false);
    expect(esViejaSinCerrar(base({ authorized_at: "2026-10-10T12:00:00Z" }), hoy)).toBe(false);
  });
  it("no destajo, no cerradas, no QA", () => {
    expect(esViejaSinCerrar(base({ tipo_solicitud: "DESTAJO" }), hoy)).toBe(false);
    expect(esViejaSinCerrar(base({ status: "ENTREGADA" }), hoy)).toBe(false);
    expect(esViejaSinCerrar(base({ status: "AUTORIZADA_HISTORICO" }), hoy)).toBe(false);
    expect(esViejaSinCerrar(base({ descripcion_corta: "QA prueba NO PROCESAR" }), hoy)).toBe(false);
  });
  it("si dijo que no, espera otros 15 días", () => {
    expect(esViejaSinCerrar(base({ seg_respuesta: "NO", seg_respuesta_at: "2026-10-10T12:00:00Z" }), hoy)).toBe(false);
    expect(diasSinMover(base({ seg_respuesta_at: "2026-10-10T12:00:00Z" }), hoy)).toBe(4);
  });
  it("máximo 3 WhatsApp, uno cada 7 días", () => {
    expect(tocaPreguntarHoy(base({}), hoy)).toBe(true);
    expect(tocaPreguntarHoy(base({ seg_preguntado_at: "2026-10-10T15:00:00Z", seg_preguntas: 1 }), hoy)).toBe(false);
    expect(tocaPreguntarHoy(base({ seg_preguntado_at: "2026-10-07T15:00:00Z", seg_preguntas: 1 }), hoy)).toBe(true);
    expect(tocaPreguntarHoy(base({ seg_preguntado_at: "2026-10-01T15:00:00Z", seg_preguntas: 3 }), hoy)).toBe(false);
  });
  it("número del folio", () => { expect(numeroFolio("REQ-2026-00757")).toBe(757); expect(numeroFolio(null)).toBeNull(); });
});

import { mensajeYaLlego } from "@/lib/requi-seguimiento";
describe("mensaje de WhatsApp", () => {
  it("cabe en 700 y no corta las instrucciones", () => {
    const l = Array.from({ length: 6 }, (_, i) => base({ id: String(i), folio: `REQ-2026-00${600 + i}`, resumen: "WF10586 FILTRO DIESEL (363-5819 - PF y 3 más", cost_center_name: "FRACCIONAMIENTO VILLAS DE LA UNIVERSIDAD" }));
    const { msg, incluidas } = mensajeYaLlego(30, l, hoy);
    expect(msg.length).toBeLessThanOrEqual(690);
    expect(msg).toContain("SI TODAS");
    expect(msg).toContain(`y ${30 - incluidas.length} más en la app`);
    expect(incluidas.length).toBeGreaterThanOrEqual(4);
  });
});
