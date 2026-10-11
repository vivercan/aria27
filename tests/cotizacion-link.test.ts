import { describe, it, expect } from "vitest";
import { generarToken, hashToken, tokenValido, tipoArchivo } from "@/lib/cotizacion-link";
describe("link de cotización", () => {
  it("token largo, válido y su hash no lo revela", () => { const t = generarToken(); expect(tokenValido(t)).toBe(true); expect(hashToken(t)).not.toContain(t); expect(hashToken(t)).toHaveLength(64); });
  it("rechaza tokens raros", () => { expect(tokenValido("../etc/passwd")).toBe(false); expect(tokenValido("corto")).toBe(false); });
  it("reconoce archivos por contenido", () => {
    const pdf = new Uint8Array(20); pdf.set([0x25, 0x50, 0x44, 0x46]); expect(tipoArchivo(pdf)?.ext).toBe("pdf");
    const jpg = new Uint8Array(20); jpg.set([0xff, 0xd8, 0xff]); expect(tipoArchivo(jpg)?.ext).toBe("jpg");
    const exe = new Uint8Array(20); exe.set([0x4d, 0x5a]); expect(tipoArchivo(exe)).toBeNull();
  });
});
