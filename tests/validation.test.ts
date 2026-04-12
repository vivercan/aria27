import { describe, it, expect } from "vitest";

/**
 * Tests for common ERP validation patterns
 * These patterns are used across 50+ validated forms in ARIA27
 */

// ============================================
// VALIDATION UTILITIES - Minimal, pure functions
// ============================================

/** Validates that a field is not empty or whitespace-only */
function validateRequired(value: unknown): { valid: boolean; error?: string } {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return { valid: false, error: "Campo requerido" };
  return { valid: true };
}

/** Validates that a number is greater than 0 */
function validatePositive(value: unknown): { valid: boolean; error?: string } {
  const num = Number(value);
  if (isNaN(num)) return { valid: false, error: "Debe ser un número" };
  if (num <= 0) return { valid: false, error: "Debe ser mayor a 0" };
  return { valid: true };
}

/** Validates email format (basic RFC 5322) */
function validateEmail(value: unknown): { valid: boolean; error?: string } {
  const email = String(value ?? "").trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Email inválido" };
  }
  return { valid: true };
}

/**
 * Validates RFC (Registro Federal de Contribuyentes - Mexican tax ID)
 * Format: 3-4 letters + 6 digits + 3 alphanumeric
 * Example: ABC123456XYZ
 */
function validateRFC(value: unknown): { valid: boolean; error?: string } {
  const rfc = String(value ?? "").trim().toUpperCase();
  const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
  if (!rfcRegex.test(rfc)) {
    return { valid: false, error: "RFC inválido (formato: ABC123456XYZ)" };
  }
  return { valid: true };
}

/**
 * Validates that a date is within a range [startDate, endDate]
 * All dates are ISO strings (YYYY-MM-DD)
 */
function validateDateRange(
  value: unknown,
  startDate: string,
  endDate: string
): { valid: boolean; error?: string } {
  const dateStr = String(value ?? "").trim();
  if (!dateStr) return { valid: false, error: "Fecha requerida" };

  const date = new Date(dateStr);
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(date.getTime())) {
    return { valid: false, error: "Fecha inválida" };
  }

  if (date < start || date > end) {
    return {
      valid: false,
      error: `Fecha debe estar entre ${startDate} y ${endDate}`,
    };
  }

  return { valid: true };
}

/**
 * Composite validator: validates multiple rules for a single field
 */
function validateField(
  value: unknown,
  rules: Array<{
    name: string;
    validate: (v: unknown) => { valid: boolean; error?: string };
  }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const rule of rules) {
    const result = rule.validate(value);
    if (!result.valid && result.error) {
      errors.push(result.error);
    }
  }
  return { valid: errors.length === 0, errors };
}

// ============================================
// TEST SUITES
// ============================================

describe("validateRequired", () => {
  it("accepts non-empty strings", () => {
    expect(validateRequired("texto")).toEqual({ valid: true });
    expect(validateRequired("0")).toEqual({ valid: true });
    expect(validateRequired("false")).toEqual({ valid: true });
  });

  it("rejects empty strings", () => {
    const result = validateRequired("");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Campo requerido");
  });

  it("rejects whitespace-only strings", () => {
    const result = validateRequired("   ");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Campo requerido");
  });

  it("rejects null and undefined", () => {
    expect(validateRequired(null).valid).toBe(false);
    expect(validateRequired(undefined).valid).toBe(false);
  });

  it("handles numbers converted to strings", () => {
    expect(validateRequired(123)).toEqual({ valid: true });
    expect(validateRequired(0)).toEqual({ valid: true });
  });
});

describe("validatePositive", () => {
  it("accepts positive integers", () => {
    expect(validatePositive(1)).toEqual({ valid: true });
    expect(validatePositive(100)).toEqual({ valid: true });
    expect(validatePositive(9999999)).toEqual({ valid: true });
  });

  it("accepts positive decimals", () => {
    expect(validatePositive(0.01)).toEqual({ valid: true });
    expect(validatePositive(3.14159)).toEqual({ valid: true });
    expect(validatePositive(1000.50)).toEqual({ valid: true });
  });

  it("rejects zero", () => {
    const result = validatePositive(0);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Debe ser mayor a 0");
  });

  it("rejects negative numbers", () => {
    const result = validatePositive(-1);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Debe ser mayor a 0");
  });

  it("rejects non-numeric values", () => {
    const result = validatePositive("abc");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Debe ser un número");
  });

  it("accepts numeric strings", () => {
    expect(validatePositive("50")).toEqual({ valid: true });
    expect(validatePositive("3.14")).toEqual({ valid: true });
  });
});

describe("validateEmail", () => {
  it("accepts valid emails", () => {
    expect(validateEmail("user@example.com")).toEqual({ valid: true });
    expect(validateEmail("john.doe@company.co.mx")).toEqual({ valid: true });
    expect(validateEmail("contact+tag@domain.org")).toEqual({ valid: true });
  });

  it("rejects emails without @", () => {
    const result = validateEmail("userexample.com");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Email inválido");
  });

  it("rejects emails without domain", () => {
    const result = validateEmail("user@");
    expect(result.valid).toBe(false);
  });

  it("rejects emails without local part", () => {
    const result = validateEmail("@example.com");
    expect(result.valid).toBe(false);
  });

  it("rejects emails with spaces", () => {
    const result = validateEmail("user @ example.com");
    expect(result.valid).toBe(false);
  });

  it("rejects emails without TLD", () => {
    const result = validateEmail("user@domain");
    expect(result.valid).toBe(false);
  });

  it("handles whitespace trimming", () => {
    expect(validateEmail("  user@example.com  ")).toEqual({ valid: true });
  });
});

describe("validateRFC", () => {
  it("accepts valid RFC with 3-letter prefix", () => {
    expect(validateRFC("ABC123456XYZ")).toEqual({ valid: true });
    expect(validateRFC("XYZ000001AAA")).toEqual({ valid: true });
  });

  it("accepts valid RFC with 4-letter prefix", () => {
    expect(validateRFC("ABCD123456XY1")).toEqual({ valid: true });
  });

  it("accepts RFC with Ñ character", () => {
    expect(validateRFC("AÑB123456XYZ")).toEqual({ valid: true });
  });

  it("accepts RFC with & character in prefix", () => {
    expect(validateRFC("A&B123456XYZ")).toEqual({ valid: true });
  });

  it("handles case-insensitive input", () => {
    expect(validateRFC("abc123456xyz")).toEqual({ valid: true });
    expect(validateRFC("AbC123456xYz")).toEqual({ valid: true });
  });

  it("rejects RFC with too few letters", () => {
    const result = validateRFC("AB123456XYZ");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("RFC inválido");
  });

  it("rejects RFC with incorrect digit count", () => {
    const result = validateRFC("ABC12345XYZ");
    expect(result.valid).toBe(false);
  });

  it("rejects RFC with incorrect checksum length", () => {
    const result = validateRFC("ABC123456XY");
    expect(result.valid).toBe(false);
  });

  it("rejects RFC with spaces", () => {
    const result = validateRFC("ABC 123456 XYZ");
    expect(result.valid).toBe(false);
  });

  it("trims whitespace before validation", () => {
    expect(validateRFC("  ABC123456XYZ  ")).toEqual({ valid: true });
  });
});

describe("validateDateRange", () => {
  const startDate = "2026-01-01";
  const endDate = "2026-12-31";

  it("accepts dates within range", () => {
    expect(validateDateRange("2026-06-15", startDate, endDate)).toEqual({ valid: true });
    expect(validateDateRange("2026-01-01", startDate, endDate)).toEqual({ valid: true });
    expect(validateDateRange("2026-12-31", startDate, endDate)).toEqual({ valid: true });
  });

  it("rejects dates before range start", () => {
    const result = validateDateRange("2025-12-31", startDate, endDate);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("entre");
  });

  it("rejects dates after range end", () => {
    const result = validateDateRange("2027-01-01", startDate, endDate);
    expect(result.valid).toBe(false);
  });

  it("rejects empty date", () => {
    const result = validateDateRange("", startDate, endDate);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Fecha requerida");
  });

  it("rejects invalid date format", () => {
    const result = validateDateRange("15/06/2026", startDate, endDate);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Fecha inválida");
  });

  it("handles whitespace in date", () => {
    expect(validateDateRange("  2026-06-15  ", startDate, endDate)).toEqual({ valid: true });
  });

  it("works with different date ranges", () => {
    const result = validateDateRange("2024-06-15", "2024-01-01", "2024-12-31");
    expect(result.valid).toBe(true);
  });
});

describe("validateField - composite validation", () => {
  it("validates multiple rules and collects all errors", () => {
    const rules = [
      {
        name: "required",
        validate: validateRequired,
      },
      {
        name: "positive",
        validate: validatePositive,
      },
    ];

    const result = validateField("", rules);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("passes all rules for valid input", () => {
    const rules = [
      {
        name: "required",
        validate: validateRequired,
      },
      {
        name: "positive",
        validate: validatePositive,
      },
    ];

    const result = validateField(100, rules);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("allows single rule validation", () => {
    const rules = [
      {
        name: "email",
        validate: validateEmail,
      },
    ];

    const result = validateField("test@example.com", rules);
    expect(result.valid).toBe(true);
  });

  it("handles empty rules array", () => {
    const result = validateField("anything", []);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("validates complex form scenario", () => {
    // Simulating a form with multiple fields
    const montoRules = [
      { name: "required", validate: validateRequired },
      { name: "positive", validate: validatePositive },
    ];
    const emailRules = [
      { name: "required", validate: validateRequired },
      { name: "email", validate: validateEmail },
    ];

    const montoResult = validateField("", montoRules);
    const emailResult = validateField("invalid@", emailRules);

    expect(montoResult.valid).toBe(false);
    expect(emailResult.valid).toBe(false);
    expect(montoResult.errors.length).toBeGreaterThan(0);
    expect(emailResult.errors.length).toBeGreaterThan(0);
  });
});

describe("ERP Form Validation Scenarios", () => {
  it("validates requisition form (monto + proveedor email)", () => {
    const montoValidation = validateField(1500.50, [
      { name: "required", validate: validateRequired },
      { name: "positive", validate: validatePositive },
    ]);

    const proveedorValidation = validateField("proveedor@company.com.mx", [
      { name: "required", validate: validateRequired },
      { name: "email", validate: validateEmail },
    ]);

    expect(montoValidation.valid).toBe(true);
    expect(proveedorValidation.valid).toBe(true);
  });

  it("validates invoice creation (RFC + monto)", () => {
    const rfcValidation = validateField("EMP123456ABC", [
      { name: "required", validate: validateRequired },
      { name: "rfc", validate: validateRFC },
    ]);

    const montoValidation = validateField("5000.00", [
      { name: "required", validate: validateRequired },
      { name: "positive", validate: validatePositive },
    ]);

    expect(rfcValidation.valid).toBe(true);
    expect(montoValidation.valid).toBe(true);
  });

  it("rejects requisition with invalid monto", () => {
    const result = validateField(-500, [
      { name: "required", validate: validateRequired },
      { name: "positive", validate: validatePositive },
    ]);
    expect(result.valid).toBe(false);
  });

  it("rejects invoice with invalid RFC", () => {
    const result = validateField("INVALID", [
      { name: "required", validate: validateRequired },
      { name: "rfc", validate: validateRFC },
    ]);
    expect(result.valid).toBe(false);
  });

  it("validates work order date range", () => {
    const projectStart = "2026-04-01";
    const projectEnd = "2026-12-31";

    const result = validateDateRange("2026-06-15", projectStart, projectEnd);
    expect(result.valid).toBe(true);
  });
});
