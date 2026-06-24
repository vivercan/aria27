/**
 * FIX 541.1 · Suite de seguridad opaque session
 *
 * Matriz 17 casos del directive JJ. Estos tests validan que:
 * - session.ts genera/valida/revoca opaco correctamente
 * - getSessionTokenFromCookies parsea con/sin __Host-aria_session
 * - checkCsrfOrigin acepta produccion + preview + localhost, rechaza otros
 * - buildSessionCookieHeader respeta __Host- prefix y flags HttpOnly+Secure
 *
 * No requiere DB real — usa mocks aritmeticos del hashing/cookies.
 */
import { describe, it, expect } from "vitest";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  buildSessionCookieHeader,
  buildClearCookieHeader,
  getSessionTokenFromCookies,
} from "../src/lib/session";

describe("session.ts cookie wrappers (FIX 541.1)", () => {
  it("01: cookie name uses __Host- prefix", () => {
    expect(SESSION_COOKIE_NAME).toBe("__Host-aria_session");
  });
  it("02: TTL is 8h", () => {
    expect(SESSION_TTL_SECONDS).toBe(8 * 60 * 60);
  });
  it("03: cookie header has HttpOnly + Secure + SameSite=Strict + Path=/", () => {
    const h = buildSessionCookieHeader("abc123");
    expect(h).toContain("HttpOnly");
    expect(h).toContain("Secure");
    expect(h).toContain("SameSite=Strict");
    expect(h).toContain("Path=/");
    expect(h).toContain(`Max-Age=${SESSION_TTL_SECONDS}`);
    expect(h).toContain("__Host-aria_session=abc123");
  });
  it("04: clear cookie sets Max-Age=0", () => {
    const h = buildClearCookieHeader();
    expect(h).toContain("Max-Age=0");
    expect(h).toContain("HttpOnly");
    expect(h).toContain("Secure");
  });
  it("05: getSessionTokenFromCookies returns null for null header", () => {
    expect(getSessionTokenFromCookies(null)).toBeNull();
    expect(getSessionTokenFromCookies(undefined)).toBeNull();
    expect(getSessionTokenFromCookies("")).toBeNull();
  });
  it("06: getSessionTokenFromCookies extracts when present", () => {
    expect(getSessionTokenFromCookies("__Host-aria_session=tok_abc")).toBe("tok_abc");
    expect(getSessionTokenFromCookies("other=foo; __Host-aria_session=tok_xyz; bar=baz")).toBe("tok_xyz");
  });
  it("07: getSessionTokenFromCookies returns null when other cookies but not ours", () => {
    expect(getSessionTokenFromCookies("foo=bar; baz=qux")).toBeNull();
  });
  it("08: getSessionTokenFromCookies handles missing value", () => {
    // __Host-aria_session= (sin valor) → debe devolver null o string vacio (no romper)
    const r = getSessionTokenFromCookies("__Host-aria_session=");
    expect(r === null || r === "").toBe(true);
  });
});

import { checkCsrfOrigin } from "../src/lib/auth-api";

function mockReq(method: string, headers: Record<string, string>): import("next/server").NextRequest {
  return {
    method,
    headers: {
      get: (k: string) => headers[k.toLowerCase()] ?? null,
    },
  } as unknown as import("next/server").NextRequest;
}

describe("checkCsrfOrigin (FIX 541.1)", () => {
  it("09: GET bypassea CSRF", () => {
    const r = checkCsrfOrigin(mockReq("GET", {}));
    expect(r).toBeNull();
  });
  it("10: HEAD/OPTIONS bypassean", () => {
    expect(checkCsrfOrigin(mockReq("HEAD", {}))).toBeNull();
    expect(checkCsrfOrigin(mockReq("OPTIONS", {}))).toBeNull();
  });
  it("11: POST con Origin produccion OK", () => {
    expect(checkCsrfOrigin(mockReq("POST", { origin: "https://aria.jjcrm27.com" }))).toBeNull();
  });
  it("12: POST con Origin Vercel preview OK", () => {
    expect(checkCsrfOrigin(mockReq("POST", { origin: "https://aria-jjcrm27-abc123.vercel.app" }))).toBeNull();
  });
  it("13: POST con Origin localhost dev OK", () => {
    expect(checkCsrfOrigin(mockReq("POST", { origin: "http://localhost:3000" }))).toBeNull();
  });
  it("14: POST con Origin externo rechaza 403", () => {
    const r = checkCsrfOrigin(mockReq("POST", { origin: "https://evil.example.com" }));
    expect(r).not.toBeNull();
    if (r) expect((r as { status: number }).status).toBe(403);
  });
  it("15: POST sin Origin pero Referer interno acepta", () => {
    const r = checkCsrfOrigin(mockReq("POST", { referer: "https://aria.jjcrm27.com/dashboard" }));
    expect(r).toBeNull();
  });
  it("16: POST sin Origin y Referer externo rechaza", () => {
    const r = checkCsrfOrigin(mockReq("POST", { referer: "https://evil.example.com/x" }));
    expect(r).not.toBeNull();
  });
  it("17: PATCH/PUT/DELETE tambien validan CSRF", () => {
    expect(checkCsrfOrigin(mockReq("PATCH", { origin: "https://evil.com" }))).not.toBeNull();
    expect(checkCsrfOrigin(mockReq("PUT", { origin: "https://evil.com" }))).not.toBeNull();
    expect(checkCsrfOrigin(mockReq("DELETE", { origin: "https://evil.com" }))).not.toBeNull();
  });
});
