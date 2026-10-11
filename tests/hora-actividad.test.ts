import { describe, it, expect } from "vitest";
import { normHora, cuando } from "@/lib/actividades-server";
describe("hora de entrega", () => {
  it("normaliza", () => {
    expect(normHora("9")).toBe("09:00"); expect(normHora("9:5")).toBe("09:05"); expect(normHora("4 pm")).toBe("16:00");
    expect(normHora("12 am")).toBe("00:00"); expect(normHora("25:00")).toBeNull(); expect(normHora("")).toBeNull(); expect(normHora("mañana")).toBeNull();
  });
  it("arma el texto", () => {
    expect(cuando("2026-10-17", "10:00")).toMatch(/10:00 h$/);
    expect(cuando("2026-10-17", null)).not.toMatch(/h$/);
  });
});
