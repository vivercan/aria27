import { describe, it, expect } from "vitest";
import { pareceRegunta, accionesSeguras, limpiarRespuesta } from "@/lib/asistente";

describe("pareceRegunta", () => {
  it("detecta preguntas", () => {
    expect(pareceRegunta("¿Qué está atrasado en Tanque?")).toBe(true);
    expect(pareceRegunta("que me toca hoy")).toBe(true);
    expect(pareceRegunta("cuánto llevamos gastado en DIF")).toBe(true);
    expect(pareceRegunta("como va la obra tanque")).toBe(true);
  });
  it("las órdenes no son preguntas", () => {
    expect(pareceRegunta("Necesito 20 sacos de cemento para mañana")).toBe(false);
    expect(pareceRegunta("Que Miguel revise la cimbra el viernes")).toBe(false);
    expect(pareceRegunta("que deya revise contratos")).toBe(false);
    expect(pareceRegunta("Qué falta en DIF")).toBe(true);
    expect(pareceRegunta("Pide varilla para Tanque")).toBe(false);
  });
});

describe("accionesSeguras", () => {
  const ids = { actividades: new Set(["a1"]), solicitudes: new Set(["r1"]), obras: new Set(["o1"]) };
  it("solo deja ids conocidos y pantallas de la lista", () => {
    const r = accionesSeguras([
      { label: "Ver", tipo: "actividad", id: "a1" }, { label: "Falsa", tipo: "actividad", id: "zz" },
      { label: "Pantalla", tipo: "pantalla", ruta: "https://malo.com" }, { label: "Autorizar", tipo: "autorizar" },
      { label: "Obra", tipo: "obra", id: "o1" },
    ], ids);
    expect(r.map(x => x.href)).toEqual(["/dashboard/actividades?abrir=a1", "/dashboard/campo/autorizar", "/dashboard/domenica/obras/o1"]);
  });
  it("tolera basura", () => { expect(accionesSeguras("x", ids)).toEqual([]); expect(accionesSeguras([null, 3], ids)).toEqual([]); });
});

it("limpia markdown", () => { expect(limpiarRespuesta("**Hola**\n# Título\n- uno")).toBe("Hola\nTítulo\n• uno"); });
