import { describe, it, expect, beforeEach } from "vitest";
import { cronAutorizado } from "@/lib/cron-auth";
const req = (h: Record<string, string>) => ({ headers: new Headers(h) }) as unknown as import("next/server").NextRequest;
describe("cronAutorizado", () => {
  beforeEach(() => { process.env.CRON_SECRET = "secreto-de-prueba-123"; });
  it("rechaza el user-agent falso", () => { expect(cronAutorizado(req({ "user-agent": "vercel-cron/1.0", "x-vercel-cron": "1" }))).toBe(false); });
  it("acepta el secreto de Vercel", () => { expect(cronAutorizado(req({ authorization: "Bearer secreto-de-prueba-123" }))).toBe(true); });
  it("acepta el token propio del endpoint", () => { expect(cronAutorizado(req({ authorization: "Bearer token-backup-xyz" }), "token-backup-xyz")).toBe(true); });
  it("rechaza tokens equivocados o vacíos", () => { expect(cronAutorizado(req({ authorization: "Bearer otro" }))).toBe(false); expect(cronAutorizado(req({}))).toBe(false); });
});
