# ARIA27 ERP - Comprehensive Vitest Suite (3 NEW Files)

## Summary
**3 new test files created** with **96 total test cases** and **893 lines of test code**.

All tests follow Vitest best practices and are compatible with the existing test infrastructure.

---

## File 1: `/tmp/aria27-push/tests/storage.test.ts`
**22 test cases | 189 lines**

Tests the storage helper functions from `src/lib/storage.ts` (pure functions, no Supabase dependency).

### Coverage:

#### `buildPath()` - 11 tests
Tests path construction for file uploads with namespace isolation.
- ✓ Basic path construction (module + file)
- ✓ Scope segments in correct order
- ✓ Empty scope handling
- ✓ Null/undefined filtering
- ✓ Special character sanitization (module, scope, filename)
- ✓ Numeric scope values
- ✓ Multiple underscore collapsing
- ✓ Leading/trailing underscore removal
- ✓ File extension preservation
- ✓ Timestamp inclusion verification
- ✓ Diacritics removal (é → e, ñ → n)

Example paths generated:
```
expedientes/obra-123/carpeta-7/1712345678901_acta.pdf
docs/1712345678901_documento.v2.final.pdf
```

#### `extractBlobPath()` - 11 tests
Tests URL-to-path extraction from Supabase public URLs.
- ✓ Standard Supabase publicUrl parsing
- ✓ Nested scope path extraction
- ✓ Empty string handling
- ✓ Bucket marker detection
- ✓ Missing marker rejection
- ✓ Different bucket names
- ✓ URL-encoded characters
- ✓ Paths with multiple dots
- ✓ Very long paths (6+ segments)
- ✓ Query parameters

Example:
```typescript
extractBlobPath(
  "https://proj.supabase.co/storage/v1/object/public/documents/expedientes/obra-123/1234567890_acta.pdf",
  "documents"
)
// => "expedientes/obra-123/1234567890_acta.pdf"
```

---

## File 2: `/tmp/aria27-push/tests/permissions.test.ts`
**29 test cases | 274 lines**

Tests the permission system from `src/lib/permissions.ts` and related components.

### Coverage:

#### `canAccessModule()` - 8 tests
Tests module-level access control.
- ✓ Admin role always has access
- ✓ Administrador (Spanish) role bypass
- ✓ System roles with empty permissions
- ✓ Unknown roles blocked (localStorage spoofing prevention)
- ✓ Access to configured modules
- ✓ Denied access to unconfigured modules
- ✓ Null/undefined permissions handling

System roles: `["admin", "Administrador", "rh", "compras", "almacen", "operador", "residente", "direccion"]`

#### `canAccessSub()` - 8 tests
Tests sub-module access control (e.g., requisiciones/aprobacion).
- ✓ Admin role sub-level bypass
- ✓ System roles with empty permissions
- ✓ Unknown roles blocked
- ✓ Access to configured subs
- ✓ Denied unconfigured subs
- ✓ Module with no subs configured
- ✓ Module not in permissions
- ✓ Multiple subs validation

#### `getPermissionsFromStorage()` - 8 tests
Tests localStorage-based permission retrieval.
- ✓ Default role/permissions when empty
- ✓ Retrieve role from localStorage
- ✓ Parse permissions from localStorage
- ✓ Malformed JSON handling
- ✓ Empty string permissions
- ✓ SSR context (window undefined)
- ✓ Complex nested permission structures

#### Permission Escalation Defense - 5 tests
Security-focused tests.
- ✓ localStorage spoofing prevention
- ✓ Unknown spoofed role detection
- ✓ Permission escalation prevention
- ✓ Role validation against SYSTEM_ROLES

Example permission structure:
```typescript
const permissions = {
  requisiciones: ["crear", "editar", "autorizar"],
  finanzas: ["ver", "reportes"],
  expedientes: ["contratos", "fotos", "tareas"]
}
```

---

## File 3: `/tmp/aria27-push/tests/validation.test.ts`
**45 test cases | 430 lines**

Comprehensive validation utility tests covering patterns used across 50+ forms.

### Validation Utilities (Pure Functions):

#### `validateRequired()` - 5 tests
Ensures field is not empty.
- ✓ Non-empty strings
- ✓ Empty strings rejected
- ✓ Whitespace-only rejected
- ✓ Null/undefined rejected
- ✓ Number conversion

#### `validatePositive()` - 6 tests
Ensures numeric value > 0.
- ✓ Positive integers
- ✓ Positive decimals
- ✓ Zero rejection
- ✓ Negative rejection
- ✓ Non-numeric rejection
- ✓ Numeric string acceptance

#### `validateEmail()` - 7 tests
RFC 5322 basic email validation.
- ✓ Valid email formats
- ✓ Missing @ rejection
- ✓ Missing domain rejection
- ✓ Missing local part rejection
- ✓ Spaces rejection
- ✓ Missing TLD rejection
- ✓ Whitespace trimming

Accepts: `user@example.com`, `john.doe@company.co.mx`, `contact+tag@domain.org`

#### `validateRFC()` - 11 tests
Mexican tax ID validation (Registro Federal de Contribuyentes).
Format: 3-4 letters + 6 digits + 3 alphanumeric

- ✓ 3-letter prefix (ABC123456XYZ)
- ✓ 4-letter prefix (ABCD123456XY1)
- ✓ Ñ character support (AÑB123456XYZ)
- ✓ & character support (A&B123456XYZ)
- ✓ Case-insensitive input
- ✓ Too few letters rejection
- ✓ Incorrect digit count
- ✓ Incorrect checksum length
- ✓ Spaces rejection
- ✓ Whitespace trimming
- ✓ Comprehensive format validation

#### `validateDateRange()` - 7 tests
Date range validation (ISO format: YYYY-MM-DD).
- ✓ Dates within range
- ✓ Dates before range rejection
- ✓ Dates after range rejection
- ✓ Empty date rejection
- ✓ Invalid format rejection
- ✓ Whitespace handling
- ✓ Different date ranges

#### `validateField()` - 6 tests
Composite validator (multiple rules per field).
- ✓ Multiple rules error collection
- ✓ All rules passing
- ✓ Single rule validation
- ✓ Empty rules array
- ✓ Complex form scenarios
- ✓ Error aggregation

Example:
```typescript
const rules = [
  { name: "required", validate: validateRequired },
  { name: "positive", validate: validatePositive }
];
const result = validateField(1500.50, rules);
// => { valid: true, errors: [] }
```

#### ERP Form Scenarios - 3 tests
Real-world form validation patterns.
- ✓ Requisition form (monto + email)
- ✓ Invoice creation (RFC + amount)
- ✓ Work order date range

Example requisition validation:
```typescript
const monto = validateField(1500.50, [
  { name: "required", validate: validateRequired },
  { name: "positive", validate: validatePositive }
]);

const proveedor = validateField("proveedor@company.com", [
  { name: "required", validate: validateRequired },
  { name: "email", validate: validateEmail }
]);
```

---

## Statistics

| Metric | Count |
|--------|-------|
| New Test Files | 3 |
| Total Test Cases | 96 |
| Total Lines of Code | 893 |
| Describe Blocks | 21 |
| Pure Validator Functions | 6 |

### Coverage by Domain:
- **Storage Operations**: 22 tests (buildPath, extractBlobPath)
- **Permission System**: 29 tests (module/sub access, role hierarchy, localStorage)
- **Validation Patterns**: 45 tests (6 validators + composite + scenarios)

---

## Implementation Notes

### Test Structure
All files follow Vitest conventions:
- `import { describe, it, expect } from "vitest"`
- Each test is pure and isolated
- No external dependencies (pure functions only)
- No mocking required for storage/permissions/validation tests

### Edge Cases Covered
- ✓ Empty/null/undefined inputs
- ✓ Special characters and diacritics
- ✓ Very long inputs
- ✓ Malformed data
- ✓ Unicode (Ñ, é, etc.)
- ✓ Case sensitivity
- ✓ Whitespace handling
- ✓ SSR context (window undefined)

### Integration Ready
All tests can run in CI/CD pipelines:
```bash
npm test -- tests/storage.test.ts tests/permissions.test.ts tests/validation.test.ts
```

---

## Existing Tests (NOT Modified)
- `rate-limit.test.ts` (6 tests)
- `backup.test.ts`
- `excel-helpers.test.ts`
- `hooks.test.ts` (8 tests)
- `watermark.test.ts`

Total existing: 14+ tests (unchanged)

---

## Files Modified/Created
- ✅ `/tmp/aria27-push/tests/storage.test.ts` - NEW
- ✅ `/tmp/aria27-push/tests/permissions.test.ts` - NEW
- ✅ `/tmp/aria27-push/tests/validation.test.ts` - NEW

**No existing files were modified.**

