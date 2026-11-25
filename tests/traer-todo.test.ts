import { describe, it, expect } from "vitest";
import { traerTodo } from "@/lib/traer-todo";

// 24-Nov-2026 — PostgREST corta en 1000 filas (db-max-rows). Estas pruebas
// fijan el comportamiento que hizo invisibles 236 de 1,236 proveedores.
describe("traerTodo", () => {
  const fake = (total: number) => {
    const filas = Array.from({ length: total }, (_, i) => ({ id: i }));
    const llamadas: number[] = [];
    const pagina = (desde: number) => {
      llamadas.push(desde);
      // Simula el tope duro del servidor: nunca mas de 1000 por respuesta.
      return Promise.resolve({ data: filas.slice(desde, desde + 1000), error: null });
    };
    return { pagina, llamadas };
  };

  it("trae las 1,236 filas, no solo las primeras 1,000", async () => {
    const { pagina, llamadas } = fake(1236);
    const r = await traerTodo<{ id: number }>(pagina);
    expect(r.length).toBe(1236);
    expect(llamadas).toEqual([0, 1000]);
  });

  it("con menos de 1,000 hace una sola llamada", async () => {
    const { pagina, llamadas } = fake(42);
    expect((await traerTodo(pagina)).length).toBe(42);
    expect(llamadas).toEqual([0]);
  });

  it("con exactamente 1,000 pide la siguiente pagina y la halla vacia", async () => {
    const { pagina, llamadas } = fake(1000);
    expect((await traerTodo(pagina)).length).toBe(1000);
    expect(llamadas).toEqual([0, 1000]);
  });

  it("vacio no truena", async () => {
    const { pagina } = fake(0);
    expect(await traerTodo(pagina)).toEqual([]);
  });

  it("propaga el error en lugar de devolver una lista incompleta en silencio", async () => {
    await expect(traerTodo(() => Promise.resolve({ data: null, error: { message: "boom" } }))).rejects.toThrow("boom");
  });
});
