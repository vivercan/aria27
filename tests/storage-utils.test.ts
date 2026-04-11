import { describe, it, expect } from "vitest";
import { extractBlobPath, buildPath } from "@/lib/storage";

describe("extractBlobPath", () => {
  const BUCKET = "documentos";
  const BASE = "https://yhylkvpynzyorqortbkk.supabase.co/storage/v1/object/public";

  it("extrae path de una URL pública estándar", () => {
    const url = `${BASE}/${BUCKET}/expedientes/obra-123/1712345678901_acta.pdf`;
    expect(extractBlobPath(url, BUCKET)).toBe("expedientes/obra-123/1712345678901_acta.pdf");
  });

  it("maneja paths con múltiples niveles", () => {
    const url = `${BASE}/${BUCKET}/a/b/c/d/file.jpg`;
    expect(extractBlobPath(url, BUCKET)).toBe("a/b/c/d/file.jpg");
  });

  it("devuelve null para URL vacía", () => {
    expect(extractBlobPath("", BUCKET)).toBeNull();
  });

  it("devuelve null cuando el bucket no coincide", () => {
    const url = `${BASE}/otro-bucket/file.pdf`;
    expect(extractBlobPath(url, BUCKET)).toBeNull();
  });

  it("devuelve null para URL sin formato Supabase", () => {
    expect(extractBlobPath("https://example.com/file.pdf", BUCKET)).toBeNull();
  });

  it("maneja archivos en raíz del bucket", () => {
    const url = `${BASE}/${BUCKET}/file.pdf`;
    expect(extractBlobPath(url, BUCKET)).toBe("file.pdf");
  });
});

describe("buildPath", () => {
  // File mock mínimo
  const fakeFile = (name: string) => ({ name } as File);

  it("genera path con modulo y file", () => {
    const path = buildPath({ module: "expedientes", file: fakeFile("contrato.pdf") });
    expect(path).toMatch(/^expedientes\/\d+_contrato\.pdf$/);
  });

  it("incluye scope en el path", () => {
    const path = buildPath({
      module: "fotos",
      scope: ["MIRAVALLE", "semana-15"],
      file: fakeFile("foto1.jpg"),
    });
    expect(path).toMatch(/^fotos\/MIRAVALLE\/semana-15\/\d+_foto1\.jpg$/);
  });

  it("filtra scope null/undefined/vacío", () => {
    const path = buildPath({
      module: "docs",
      scope: [null, undefined, "", "real"],
      file: fakeFile("a.pdf"),
    });
    expect(path).toMatch(/^docs\/real\/\d+_a\.pdf$/);
  });

  it("sanitiza caracteres especiales", () => {
    const path = buildPath({
      module: "módulo ñ",
      scope: ["obra/peligrosa"],
      file: fakeFile("archivo (copia).docx"),
    });
    // Debe eliminar acentos y reemplazar caracteres no alfanuméricos
    expect(path).not.toContain("ó");
    expect(path).not.toContain("ñ");
    expect(path).not.toContain("/peligrosa");
    expect(path).not.toContain("(");
    expect(path).not.toContain(")");
    expect(path).not.toContain(" ");
  });

  it("incluye timestamp en el nombre del archivo", () => {
    const before = Date.now();
    const path = buildPath({ module: "test", file: fakeFile("x.pdf") });
    const after = Date.now();

    const match = path.match(/\/(\d+)_x\.pdf$/);
    expect(match).not.toBeNull();
    const ts = Number(match![1]);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it("no genera doble underscore consecutivo", () => {
    const path = buildPath({
      module: "test",
      scope: ["a  b"],
      file: fakeFile("c  d.pdf"),
    });
    expect(path).not.toMatch(/__/);
  });
});
