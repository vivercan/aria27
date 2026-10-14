import { describe, it, expect, vi } from "vitest";
import { motivoFalla, registrarEstados } from "@/lib/wa-entrega";

vi.mock("@/lib/actividades-server", () => ({ avisarEnApp: vi.fn(async () => true) }));

function dbFalso(walog: Record<string, unknown> | null, tareas: Record<string, unknown>[]) {
  const updates: { tabla: string; datos: Record<string, unknown> }[] = [];
  const q = (tabla: string) => {
    const b: Record<string, unknown> = {};
    b.select = () => b; b.eq = () => b;
    b.maybeSingle = async () => ({ data: tabla === "wa_log" ? walog : null });
    b.then = (r: (v: unknown) => unknown) => r({ data: tabla === "tareas_asignadas" ? tareas : [] });
    b.update = (datos: Record<string, unknown>) => { updates.push({ tabla, datos }); return { eq: async () => ({}) }; };
    return b;
  };
  return { db: { from: q } as never, updates };
}

describe("estado de entrega de WhatsApp", () => {
  it("traduce errores de Meta", () => {
    expect(motivoFalla([{ code: 131026 }])).toMatch(/no tiene WhatsApp/);
    expect(motivoFalla(undefined)).toBeNull();
  });
  it("guarda entregado en wa_log y en la actividad", async () => {
    const { db, updates } = dbFalso({ id: "1", estado_entrega: "sent" }, [{ id: "t1", titulo: "X", wa_estado: "sent" }]);
    await registrarEstados(db, [{ id: "wamid.1", status: "delivered" }]);
    expect(updates.map(u => `${u.tabla}:${u.datos.estado_entrega || u.datos.wa_estado}`)).toEqual(["wa_log:delivered", "tareas_asignadas:delivered"]);
  });
  it("no retrocede de leído a entregado", async () => {
    const { db, updates } = dbFalso({ id: "1", estado_entrega: "read" }, [{ id: "t1", titulo: "X", wa_estado: "read" }]);
    await registrarEstados(db, [{ id: "wamid.1", status: "delivered" }]);
    expect(updates.length).toBe(0);
  });
  it("si falla, lo marca con el motivo", async () => {
    const { db, updates } = dbFalso({ id: "1", estado_entrega: "sent" }, [{ id: "t1", titulo: "X", wa_estado: "sent", asignado_por_email: "a@x.com" }]);
    await registrarEstados(db, [{ id: "wamid.1", status: "failed", errors: [{ code: 131026 }] }]);
    expect(updates.find(u => u.tabla === "tareas_asignadas")?.datos.wa_error).toMatch(/no tiene WhatsApp/);
  });
});
