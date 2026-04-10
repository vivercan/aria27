import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  canAccessModule,
  canAccessSub,
  getPermissionsFromStorage,
  type UserPermissions,
} from "@/lib/permissions";

// Mock localStorage for Node.js environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });
Object.defineProperty(globalThis, "window", { value: globalThis, writable: true });

describe("canAccessModule", () => {
  describe("admin role bypass", () => {
    it('grants admin access to any module', () => {
      expect(canAccessModule("admin", {}, "anything")).toBe(true);
    });
    it('grants Administrador access to any module', () => {
      expect(canAccessModule("Administrador", {}, "obras")).toBe(true);
    });
    it('grants admin with null-like permissions', () => {
      expect(canAccessModule("admin", {} as UserPermissions, "finanzas")).toBe(true);
    });
  });

  describe("system roles with empty permissions", () => {
    it('allows known system role "rh" with empty perms', () => {
      expect(canAccessModule("rh", {}, "talento")).toBe(true);
    });
    it('allows known system role "compras" with empty perms', () => {
      expect(canAccessModule("compras", {}, "requisiciones")).toBe(true);
    });
    it('allows known system role "operador" with empty perms', () => {
      expect(canAccessModule("operador", {}, "obras")).toBe(true);
    });
  });

  describe("configured permissions", () => {
    it('allows access when module is in permissions with entries', () => {
      const perms: UserPermissions = { obras: ["presupuestos", "contratos"], finanzas: ["cobranza"] };
      expect(canAccessModule("compras", perms, "obras")).toBe(true);
    });
    it('denies access when module is not in permissions', () => {
      const perms: UserPermissions = { obras: ["presupuestos"] };
      expect(canAccessModule("compras", perms, "finanzas")).toBe(false);
    });
    it('denies access when module has empty array', () => {
      const perms: UserPermissions = { obras: [] };
      expect(canAccessModule("compras", perms, "obras")).toBe(false);
    });
  });

  describe("unknown roles", () => {
    it('blocks unknown role with empty permissions', () => {
      expect(canAccessModule("hacker", {}, "admin_sistema")).toBe(false);
    });
    it('blocks fabricated role with empty permissions', () => {
      expect(canAccessModule("superuser", {}, "ceo")).toBe(false);
    });
  });
});

describe("canAccessSub", () => {
  it('admin bypasses subKey check', () => {
    expect(canAccessSub("admin", {}, "talento", "nomina")).toBe(true);
  });
  it('Administrador bypasses subKey check', () => {
    expect(canAccessSub("Administrador", {}, "finanzas", "caja")).toBe(true);
  });
  it('allows when subKey is in module permission array', () => {
    const perms: UserPermissions = { talento: ["nomina", "personal"] };
    expect(canAccessSub("rh", perms, "talento", "nomina")).toBe(true);
  });
  it('denies when subKey is not in module permission array', () => {
    const perms: UserPermissions = { talento: ["personal"] };
    expect(canAccessSub("rh", perms, "talento", "nomina")).toBe(false);
  });
  it('denies when module not in permissions at all', () => {
    const perms: UserPermissions = { obras: ["presupuestos"] };
    expect(canAccessSub("operador", perms, "talento", "personal")).toBe(false);
  });
  it('system role with empty perms gets access (no restrictions configured)', () => {
    expect(canAccessSub("rh", {}, "talento", "nomina")).toBe(true);
  });
  it('unknown role with empty perms blocked', () => {
    expect(canAccessSub("hacker", {}, "admin_sistema", "roles")).toBe(false);
  });
});

describe("getPermissionsFromStorage", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('retrieves role from localStorage', () => {
    localStorageMock.setItem("userRole", "compras");
    const { role } = getPermissionsFromStorage();
    expect(role).toBe("compras");
  });

  it('retrieves and parses permissions from localStorage', () => {
    const testPerms = { obras: ["presupuestos"], finanzas: ["cobranza"] };
    localStorageMock.setItem("userRole", "admin");
    localStorageMock.setItem("userPermissions", JSON.stringify(testPerms));
    const { role, permissions } = getPermissionsFromStorage();
    expect(role).toBe("admin");
    expect(permissions).toEqual(testPerms);
  });

  it('defaults to "user" role when nothing in storage', () => {
    const { role } = getPermissionsFromStorage();
    expect(role).toBe("user");
  });

  it('handles malformed JSON gracefully', () => {
    localStorageMock.setItem("userRole", "compras");
    localStorageMock.setItem("userPermissions", "{ invalid json }");
    const { role, permissions } = getPermissionsFromStorage();
    expect(role).toBe("compras");
    expect(permissions).toEqual({});
  });

  it('handles empty string permissions', () => {
    localStorageMock.setItem("userRole", "rh");
    localStorageMock.setItem("userPermissions", "");
    const { role, permissions } = getPermissionsFromStorage();
    expect(role).toBe("rh");
    expect(permissions).toEqual({});
  });
});
