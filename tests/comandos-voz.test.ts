import { describe, it, expect } from "vitest";
import { interpretar, partirPendientes } from "@/lib/comandos-voz";

describe("comandos por voz sin IA", () => {
  it("abre pantallas", () => {
    expect(interpretar("Ayúdame a hacer la requisición")).toMatchObject({ tipo: "ir", href: "/dashboard/requisiciones/requisiciones/nuevo" });
    expect(interpretar("oye doménica, abre mi agenda")).toMatchObject({ tipo: "ir", href: "/dashboard/campo/calendario" });
    expect(interpretar("mis actividades")).toMatchObject({ tipo: "ir", href: "/dashboard/actividades?vista=mi" });
    expect(interpretar("lo que tengo por autorizar")).toMatchObject({ tipo: "ir", href: "/dashboard/campo/autorizar" });
    expect(interpretar("registrar entrega")).toMatchObject({ tipo: "ir", href: "/dashboard/campo/evidencia" });
    expect(interpretar("nueva actividad")).toMatchObject({ tipo: "ir", href: "/dashboard/actividades?nueva=1" });
  });
  it("pendientes", () => {
    expect(interpretar("Ayúdame a anotar un pendiente")).toEqual({ tipo: "pendientes", texto: "" });
    expect(interpretar("anota pendientes")).toEqual({ tipo: "pendientes", texto: "" });
    const r = interpretar("Anota que mañana llamo a Miguel y el viernes reviso los planos de Tanque");
    expect(r.tipo).toBe("pendientes"); expect((r as { texto: string }).texto).toContain("manana llamo a miguel");
    expect(interpretar("recuérdame pagar la renta el lunes").tipo).toBe("pendientes");
  });
  it("preguntas e IA", () => {
    expect(interpretar("¿Qué está atrasado en Tanque?").tipo).toBe("pregunta");
    expect(interpretar("Necesito 20 sacos de cemento para Ruiz Cortines")).toMatchObject({ tipo: "ia", pista: "material" });
    expect(interpretar("Que Miguel revise la cimbra el viernes")).toMatchObject({ tipo: "ia" });
  });
  it("partir pendientes", () => {
    expect(partirPendientes("llamar a Miguel, revisar planos y luego pagar la renta")).toEqual(["llamar a Miguel", "revisar planos", "pagar la renta"]);
  });
});
