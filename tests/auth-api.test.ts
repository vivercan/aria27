import { describe, it, expect } from "vitest";
import { extractUserEmail, unauthorizedResponse } from "@/lib/auth-api";

// ── extractUserEmail tests (pure function, no DB) ──

describe("extractUserEmail", () => {
  /** Crea un NextRequest mínimo para testing (con nextUrl polyfill) */
  function fakeReq(url = "http://localhost/api/test", headers?: Record<string, string>) {
    const req = new Request(url, { headers });
    const parsed = new URL(url);
    Object.defineProperty(req, "nextUrl", { value: parsed, writable: false });
    return req as unknown as Parameters<typeof extractUserEmail>[0];
  }

  it("extrae email del body", () => {
    const email = extractUserEmail(fakeReq(), { user_email: "jj@avante.mx" });
    expect(email).toBe("jj@avante.mx");
  });

  it("extrae email del query param si body no tiene", () => {
    const email = extractUserEmail(
      fakeReq("http://localhost/api/test?user_email=jj@avante.mx"),
      {}
    );
    expect(email).toBe("jj@avante.mx");
  });

  it("extrae email del header x-user-email si body y query no tienen", () => {
    const email = extractUserEmail(
      fakeReq("http://localhost/api/test", { "x-user-email": "jj@avante.mx" }),
      {}
    );
    expect(email).toBe("jj@avante.mx");
  });

  it("devuelve null cuando no hay email en ninguna fuente", () => {
    const email = extractUserEmail(fakeReq(), {});
    expect(email).toBeNull();
  });

  it("prioriza body sobre query param", () => {
    const email = extractUserEmail(
      fakeReq("http://localhost/api/test?user_email=query@test.com"),
      { user_email: "body@test.com" }
    );
    expect(email).toBe("body@test.com");
  });

  it("maneja body null", () => {
    const email = extractUserEmail(fakeReq(), null);
    expect(email).toBeNull();
  });
});

// ── unauthorizedResponse tests ──

describe("unauthorizedResponse", () => {
  it("devuelve status 403 con mensaje default", async () => {
    const res = unauthorizedResponse();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("No autorizado");
  });

  it("devuelve mensaje custom", async () => {
    const res = unauthorizedResponse("Rol insuficiente");
    const body = await res.json();
    expect(body.error).toBe("Rol insuficiente");
  });
});
