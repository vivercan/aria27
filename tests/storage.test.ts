import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock supabase before importing storage (storage.ts imports supabase at top level)
vi.mock("@/lib/supabase", () => ({
  supabase: {
    storage: { from: () => ({ upload: vi.fn(), getPublicUrl: vi.fn(), remove: vi.fn() }) },
    from: () => ({ insert: vi.fn(), delete: vi.fn() }),
  },
}));

import { buildPath, extractBlobPath } from "@/lib/storage";

/**
 * Tests for storage.ts helper functions
 * Focus: buildPath and extractBlobPath (pure functions that don't need Supabase)
 */

describe("buildPath", () => {
  it("builds basic path with module and file", () => {
    const file = new File(["content"], "documento.pdf", { type: "application/pdf" });
    const path = buildPath({ module: "requisiciones", file });

    expect(path).toMatch(/^requisiciones\/\d+_documento\.pdf$/);
  });

  it("includes scope segments in correct order", () => {
    const file = new File(["content"], "acta.pdf", { type: "application/pdf" });
    const path = buildPath({
      module: "expedientes",
      scope: ["obra-123", "carpeta-7"],
      file,
    });

    expect(path).toMatch(/^expedientes\/obra-123\/carpeta-7\/\d+_acta\.pdf$/);
  });

  it("handles empty scope array correctly", () => {
    const file = new File(["content"], "file.txt", { type: "text/plain" });
    const path = buildPath({ module: "test", scope: [], file });

    expect(path).toMatch(/^test\/\d+_file\.txt$/);
  });

  it("filters out null and undefined from scope", () => {
    const file = new File(["content"], "test.pdf", { type: "application/pdf" });
    const path = buildPath({
      module: "modulo",
      scope: ["valid", null, undefined, "another"],
      file,
    });

    expect(path).toMatch(/^modulo\/valid\/another\/\d+_test\.pdf$/);
  });

  it("handles special characters in module name (pass-through)", () => {
    const file = new File(["content"], "test.pdf", { type: "application/pdf" });
    const path = buildPath({ module: "modulo-especial_123", file });

    expect(path).toMatch(/^modulo-especial_123\/\d+_test\.pdf$/);
  });

  it("sanitizes special characters in scope values", () => {
    const file = new File(["content"], "file.pdf", { type: "application/pdf" });
    const path = buildPath({
      module: "test",
      scope: ["obra/123", "carpeta@456!"],
      file,
    });

    expect(path).toMatch(/^test\/obra_123\/carpeta_456\/\d+_file\.pdf$/);
  });

  it("preserves filename characters in path", () => {
    const file = new File(["content"], "reporte.pdf", { type: "application/pdf" });
    const path = buildPath({ module: "docs", file });

    expect(path).toMatch(/^docs\/\d+_reporte\.pdf$/);
  });

  it("handles numeric scope values", () => {
    const file = new File(["content"], "test.txt", { type: "text/plain" });
    const path = buildPath({
      module: "inventario",
      scope: [123, "almacen", 456],
      file,
    });

    expect(path).toMatch(/^inventario\/123\/almacen\/456\/\d+_test\.txt$/);
  });

  it("collapses multiple consecutive underscores", () => {
    const file = new File(["content"], "test___file___name.pdf", { type: "application/pdf" });
    const path = buildPath({ module: "test", file });

    expect(path).toMatch(/^test\/\d+_test_file_name\.pdf$/);
  });

  it("includes scope in path segments", () => {
    const file = new File(["content"], "file.txt", { type: "text/plain" });
    const path = buildPath({ module: "test", scope: ["scope"], file });

    expect(path).toMatch(/^test\/scope\/\d+_file\.txt$/);
  });

  it("preserves dots in file extensions", () => {
    const file = new File(["content"], "document.v2.final.pdf", { type: "application/pdf" });
    const path = buildPath({ module: "docs", file });

    expect(path).toMatch(/^docs\/\d+_document\.v2\.final\.pdf$/);
  });

  it("includes timestamp in milliseconds", () => {
    const file = new File(["content"], "test.pdf", { type: "application/pdf" });
    const beforeTs = Date.now();
    const path = buildPath({ module: "test", file });
    const afterTs = Date.now();

    const timestampMatch = path.match(/\/(\d+)_/);
    expect(timestampMatch).toBeTruthy();
    const timestamp = parseInt(timestampMatch![1], 10);
    expect(timestamp).toBeGreaterThanOrEqual(beforeTs);
    expect(timestamp).toBeLessThanOrEqual(afterTs);
  });
});

describe("extractBlobPath", () => {
  const bucket = "documents";

  it("extracts path from standard Supabase publicUrl", () => {
    const publicUrl = "https://proj.supabase.co/storage/v1/object/public/documents/expedientes/obra-123/1234567890_file.pdf";
    const result = extractBlobPath(publicUrl, bucket);

    expect(result).toBe("expedientes/obra-123/1234567890_file.pdf");
  });

  it("extracts path with nested scope", () => {
    const publicUrl = "https://abc.supabase.co/storage/v1/object/public/documents/modulo/scope1/scope2/scope3/timestamp_name.pdf";
    const result = extractBlobPath(publicUrl, bucket);

    expect(result).toBe("modulo/scope1/scope2/scope3/timestamp_name.pdf");
  });

  it("returns null for empty string", () => {
    const result = extractBlobPath("", bucket);
    expect(result).toBeNull();
  });

  it("returns null when bucket marker not found", () => {
    const publicUrl = "https://proj.supabase.co/storage/v1/object/public/other-bucket/file.pdf";
    const result = extractBlobPath(publicUrl, bucket);

    expect(result).toBeNull();
  });

  it("returns null for url without /object/public/ marker", () => {
    const publicUrl = "https://proj.supabase.co/storage/v1/download/documents/file.pdf";
    const result = extractBlobPath(publicUrl, bucket);

    expect(result).toBeNull();
  });

  it("handles different bucket names correctly", () => {
    const bucketName = "custom-bucket-123";
    const publicUrl = `https://proj.supabase.co/storage/v1/object/public/${bucketName}/path/to/file.txt`;
    const result = extractBlobPath(publicUrl, bucketName);

    expect(result).toBe("path/to/file.txt");
  });

  it("handles paths with special characters (URL encoded)", () => {
    const publicUrl = "https://proj.supabase.co/storage/v1/object/public/documents/obra%20123/file%20name.pdf";
    const result = extractBlobPath(publicUrl, bucket);

    expect(result).toBe("obra%20123/file%20name.pdf");
  });

  it("handles paths with dots in filenames", () => {
    const publicUrl = "https://proj.supabase.co/storage/v1/object/public/documents/file.v2.final.backup.pdf";
    const result = extractBlobPath(publicUrl, bucket);

    expect(result).toBe("file.v2.final.backup.pdf");
  });

  it("handles very long paths with multiple segments", () => {
    const longPath = "modulo/seg1/seg2/seg3/seg4/seg5/seg6/12345678_verylongfile.pdf";
    const publicUrl = `https://proj.supabase.co/storage/v1/object/public/${bucket}/${longPath}`;
    const result = extractBlobPath(publicUrl, bucket);

    expect(result).toBe(longPath);
  });

  it("handles URLs with query parameters gracefully", () => {
    const publicUrl = "https://proj.supabase.co/storage/v1/object/public/documents/file.pdf?download=true";
    const result = extractBlobPath(publicUrl, bucket);

    expect(result).toBe("file.pdf?download=true");
  });
});
