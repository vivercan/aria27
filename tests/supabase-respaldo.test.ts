import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchConRespaldo, enModoRespaldo } from "@/lib/supabase-respaldo";

describe("respaldo de conexión a Supabase", () => {
  beforeEach(() => { vi.restoreAllMocks(); (globalThis as unknown as { window: unknown }).window = globalThis; });
  it("si directo funciona, no toca el servidor", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("[]", { status: 200 }));
    const r = await fetchConRespaldo("https://x.supabase.co/rest/v1/Requisiciones?select=id", { method: "GET", headers: { apikey: "k" } });
    expect(r.status).toBe(200); expect(f).toHaveBeenCalledTimes(1); expect(enModoRespaldo()).toBe(false);
  });
  it("si la red falla, la misma consulta sale por /api/db/respaldo", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("supabase.co")) throw new TypeError("Failed to fetch");
      return new Response("[{\"id\":1}]", { status: 200, headers: { "x-aria-respaldo": "1" } });
    });
    const r = await fetchConRespaldo("https://x.supabase.co/rest/v1/Requisiciones?select=id", { method: "GET", headers: { apikey: "k", Authorization: "Bearer k" } });
    expect(r.status).toBe(200); expect(enModoRespaldo()).toBe(true);
    const llamada = f.mock.calls.find(c => String(c[0]).includes("/api/db/respaldo"))!;
    const body = JSON.parse(String((llamada[1] as RequestInit).body));
    expect(body.path).toBe("/rest/v1/Requisiciones?select=id"); expect(body.method).toBe("GET");
    expect(body.headers.apikey).toBeUndefined(); expect(body.headers.Authorization).toBeUndefined();
  });
  it("un error HTTP (no de red) se regresa tal cual, sin respaldo", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 401 }));
    const r = await fetchConRespaldo("https://x.supabase.co/rest/v1/x", { method: "GET" });
    expect(r.status).toBe(401);
  });
});
