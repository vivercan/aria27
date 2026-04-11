import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkEnvVars } from "../src/lib/env-check";

describe("checkEnvVars", () => {
  const originalEnv = process.env;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env = { ...originalEnv };
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("does nothing in browser context", () => {
    // Simulate window existing
    const origWindow = global.window;
    // @ts-expect-error - simulating browser
    global.window = {};
    checkEnvVars();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    (global as Record<string, unknown>).window = origWindow;
  });

  it("logs critical error when SUPABASE vars missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    checkEnvVars();
    expect(errorSpy).toHaveBeenCalled();
    const msg = errorSpy.mock.calls[0][0] as string;
    expect(msg).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(msg).toContain("CRÍTICAS");
  });

  it("logs warn when optional vars missing", () => {
    // Set critical vars
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    // Remove optional vars
    delete process.env.RESEND_API_KEY;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    checkEnvVars();
    expect(warnSpy).toHaveBeenCalled();
    const msg = warnSpy.mock.calls[0][0] as string;
    expect(msg).toContain("RESEND_API_KEY");
    expect(msg).toContain("features degradadas");
  });

  it("no warnings when all vars present", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    process.env.RESEND_API_KEY = "re_test";
    process.env.WHATSAPP_ACCESS_TOKEN = "wa_test";
    process.env.WHATSAPP_PHONE_ID = "12345";
    process.env.META_APP_SECRET = "secret";
    process.env.DIGEST_TOKEN = "digest";
    process.env.BACKUP_TOKEN = "backup";
    process.env.WEBHOOK_VERIFY_TOKEN = "webhook";
    checkEnvVars();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("treats empty string as missing", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    checkEnvVars();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("treats whitespace-only as missing", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "   ";
    checkEnvVars();
    expect(errorSpy).toHaveBeenCalled();
  });
});
