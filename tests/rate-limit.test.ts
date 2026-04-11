import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    // Usar identifier único por test para evitar contaminación entre cases
    vi.useRealTimers();
  });

  it("permite primera request y decrementa remaining", () => {
    const id = `u:test-${Math.random()}`;
    const r = checkRateLimit(id, { key: "test:first", max: 5, windowMs: 60_000 });
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(4);
    expect(r.resetAt).toBeGreaterThan(Date.now());
  });

  it("bloquea cuando se excede el máximo", () => {
    const id = `u:test-${Math.random()}`;
    const opts = { key: "test:block", max: 3, windowMs: 60_000 };
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(id, opts).allowed).toBe(true);
    }
    const blocked = checkRateLimit(id, opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("aísla buckets por identifier distinto", () => {
    const opts = { key: "test:isolation", max: 1, windowMs: 60_000 };
    expect(checkRateLimit("u:alice", opts).allowed).toBe(true);
    expect(checkRateLimit("u:alice", opts).allowed).toBe(false);
    expect(checkRateLimit("u:bob", opts).allowed).toBe(true);
  });

  it("aísla buckets por key distinta", () => {
    const id = `u:multi-${Math.random()}`;
    const a = checkRateLimit(id, { key: "test:keyA", max: 1, windowMs: 60_000 });
    const b = checkRateLimit(id, { key: "test:keyB", max: 1, windowMs: 60_000 });
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });

  it("resetea el bucket al expirar la ventana", async () => {
    const id = `u:expiry-${Math.random()}`;
    const opts = { key: "test:expiry", max: 1, windowMs: 50 };
    expect(checkRateLimit(id, opts).allowed).toBe(true);
    expect(checkRateLimit(id, opts).allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 70));
    expect(checkRateLimit(id, opts).allowed).toBe(true);
  });

  it("presets RATE_LIMITS tienen configuración esperada", () => {
    expect(RATE_LIMITS.EMAIL.max).toBe(10);
    expect(RATE_LIMITS.WRITE.max).toBe(60);
    expect(RATE_LIMITS.EXPENSIVE.max).toBe(20);
    expect(RATE_LIMITS.PUBLIC.max).toBe(30);
    expect(RATE_LIMITS.EXPENSIVE.windowMs).toBe(5 * 60_000);
  });
});
