import { describe, it, expect } from "vitest";
import { formatMoney, formatMoneyShort, fmt, formatBytes } from "../src/lib/format-utils";

describe("formatMoney", () => {
  it("formats positive amounts as MXN currency", () => {
    const result = formatMoney(1234.56);
    // Intl may use different symbols/spaces depending on locale
    expect(result).toContain("1,234.56");
  });

  it("formats zero", () => {
    const result = formatMoney(0);
    expect(result).toContain("0.00");
  });

  it("formats negative amounts", () => {
    const result = formatMoney(-500);
    expect(result).toContain("500.00");
  });

  it("always includes 2 decimal places", () => {
    const result = formatMoney(100);
    expect(result).toContain("100.00");
  });

  it("handles large numbers", () => {
    const result = formatMoney(1000000);
    expect(result).toContain("1,000,000.00");
  });
});

describe("formatMoneyShort", () => {
  it("formats without decimals", () => {
    expect(formatMoneyShort(1234.56)).toBe("$1,235");
  });

  it("handles 0 and falsy", () => {
    expect(formatMoneyShort(0)).toBe("$0");
  });

  it("formats large numbers", () => {
    expect(formatMoneyShort(1000000)).toBe("$1,000,000");
  });
});

describe("fmt", () => {
  it("formats with 2 decimal places", () => {
    expect(fmt(1234.5)).toBe("$1,234.50");
  });

  it("handles 0", () => {
    expect(fmt(0)).toBe("$0.00");
  });

  it("formats normally", () => {
    expect(fmt(99.99)).toBe("$99.99");
  });
});

describe("formatBytes", () => {
  it("returns — for null/undefined/0", () => {
    expect(formatBytes(null)).toBe("—");
    expect(formatBytes(undefined)).toBe("—");
    expect(formatBytes(0)).toBe("—");
  });

  it("returns — for negative values", () => {
    expect(formatBytes(-100)).toBe("—");
  });

  it("formats bytes", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(1048576)).toBe("1.0 MB");
    expect(formatBytes(5242880)).toBe("5.0 MB");
  });

  it("formats gigabytes", () => {
    expect(formatBytes(1073741824)).toBe("1.0 GB");
  });

  it("rounds appropriately for values >= 10", () => {
    // 10.5 KB rounds to "11 KB" (no decimal for >= 10)
    expect(formatBytes(10752)).toBe("11 KB");
  });
});
