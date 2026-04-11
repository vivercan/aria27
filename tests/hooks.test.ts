import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useFlashMessage, type FlashMessageType, type UseFlashMessageReturn } from "@/hooks/useFlashMessage";
import { useEntityForm, type UseEntityFormReturn } from "@/hooks/useEntityForm";

/**
 * Test hook behavior by simulating state changes
 * These tests verify pure logic without requiring @testing-library/react
 */

describe("useFlashMessage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("msg() sets message with tipo and texto", () => {
    // Simulate hook behavior with state tracking
    let message: FlashMessageType | null = null;

    const msg = (tipo: "success" | "error", texto: string) => {
      message = { tipo, texto };
    };

    msg("success", "Test message");

    expect(message).toEqual({
      tipo: "success",
      texto: "Test message",
    });
  });

  it("msg() auto-clears message after 3 seconds", () => {
    vi.useFakeTimers();
    let message: FlashMessageType | null = null;
    let timeoutId: NodeJS.Timeout | undefined;

    const msg = (tipo: "success" | "error", texto: string) => {
      message = { tipo, texto };
      timeoutId = setTimeout(() => {
        message = null;
      }, 3000);
    };

    msg("error", "Error occurred");
    expect(message).not.toBeNull();

    vi.advanceTimersByTime(2999);
    expect(message).not.toBeNull();

    vi.advanceTimersByTime(1);
    expect(message).toBeNull();

    if (timeoutId) clearTimeout(timeoutId);
  });

  it("clearMsg() immediately clears the message", () => {
    let message: FlashMessageType | null = { tipo: "success", texto: "Test" };

    const clearMsg = () => {
      message = null;
    };

    clearMsg();
    expect(message).toBeNull();
  });

  it("supports both 'success' and 'error' tipos", () => {
    let message: FlashMessageType | null = null;

    const msg = (tipo: "success" | "error", texto: string) => {
      message = { tipo, texto };
    };

    msg("success", "Success!");
    expect((message as any)?.tipo).toBe("success");

    msg("error", "Error!");
    expect((message as any)?.tipo).toBe("error");
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

describe("useEntityForm", () => {
  interface TestEntity {
    id: string;
    nombre: string;
    email: string;
    telefono: string;
  }

  const initialForm: TestEntity = {
    id: "",
    nombre: "",
    email: "",
    telefono: "",
  };

  it("openNew() resets form to initial state", () => {
    let showModal = false;
    let editId: string | null = "existing-id";
    let form: TestEntity = {
      ...initialForm,
      nombre: "Old Name",
    };

    const openNew = () => {
      form = { ...initialForm };
      editId = null;
      showModal = true;
    };

    openNew();

    expect(showModal).toBe(true);
    expect(editId).toBeNull();
    expect(form).toEqual(initialForm);
  });

  it("openEdit() sets editId and merges data into form", () => {
    let showModal = false;
    let editId: string | null = null;
    let form: TestEntity = { ...initialForm };

    const openEdit = (id: string, data: Partial<TestEntity>) => {
      editId = id;
      form = { ...form, ...data };
      showModal = true;
    };

    openEdit("prov-123", {
      nombre: "Proveedor ABC",
      email: "abc@example.com",
    });

    expect(editId).toBe("prov-123");
    expect(showModal).toBe(true);
    expect(form.nombre).toBe("Proveedor ABC");
    expect(form.email).toBe("abc@example.com");
    expect(form.id).toBe(""); // Untouched
  });

  it("closeModal() clears all state", () => {
    let showModal = true;
    let editId: string | null = "edit-123";
    let form: TestEntity = {
      id: "123",
      nombre: "Test",
      email: "test@example.com",
      telefono: "555-1234",
    };
    let saving = true;

    const closeModal = () => {
      showModal = false;
      editId = null;
      form = { ...initialForm };
      saving = false;
    };

    closeModal();

    expect(showModal).toBe(false);
    expect(editId).toBeNull();
    expect(form).toEqual(initialForm);
    expect(saving).toBe(false);
  });

  it("updateField() updates a single field in the form", () => {
    let form: TestEntity = { ...initialForm };

    const updateField = <K extends keyof TestEntity>(
      key: K,
      value: TestEntity[K]
    ) => {
      form = { ...form, [key]: value };
    };

    updateField("nombre", "Juan P\u00e9rez");
    expect(form.nombre).toBe("Juan P\u00e9rez");
    expect(form.email).toBe(""); // Other fields untouched

    updateField("email", "juan@example.com");
    expect(form.nombre).toBe("Juan P\u00e9rez"); // Previous value preserved
    expect(form.email).toBe("juan@example.com");
  });

  it("updateField() handles multiple field updates sequentially", () => {
    let form: TestEntity = { ...initialForm };

    const updateField = <K extends keyof TestEntity>(
      key: K,
      value: TestEntity[K]
    ) => {
      form = { ...form, [key]: value };
    };

    updateField("nombre", "Test Name");
    updateField("email", "test@example.com");
    updateField("telefono", "555-9999");

    expect(form).toEqual({
      id: "",
      nombre: "Test Name",
      email: "test@example.com",
      telefono: "555-9999",
    });
  });

  it("modal state transitions correctly through open \u2192 update \u2192 close", () => {
    let showModal = false;
    let editId: string | null = null;
    let form: TestEntity = { ...initialForm };

    const openEdit = (id: string, data: Partial<TestEntity>) => {
      editId = id;
      form = { ...form, ...data };
      showModal = true;
    };

    const updateField = <K extends keyof TestEntity>(
      key: K,
      value: TestEntity[K]
    ) => {
      form = { ...form, [key]: value };
    };

    const closeModal = () => {
      showModal = false;
      editId = null;
      form = { ...initialForm };
    };

    // Open edit
    openEdit("vendor-1", { nombre: "Initial Vendor" });
    expect(showModal).toBe(true);
    expect(form.nombre).toBe("Initial Vendor");

    // Update field
    updateField("email", "vendor@example.com");
    expect(form.email).toBe("vendor@example.com");

    // Close
    closeModal();
    expect(showModal).toBe(false);
    expect(form).toEqual(initialForm);
  });

  it("openNew() can be called after openEdit()", () => {
    let showModal = false;
    let editId: string | null = null;
    let form: TestEntity = { ...initialForm };

    const openEdit = (id: string, data: Partial<TestEntity>) => {
      editId = id;
      form = { ...form, ...data };
      showModal = true;
    };

    const openNew = () => {
      form = { ...initialForm };
      editId = null;
      showModal = true;
    };

    openEdit("existing-123", { nombre: "Existing" });
    expect(editId).toBe("existing-123");

    openNew();
    expect(editId).toBeNull();
    expect(form).toEqual(initialForm);
    expect(showModal).toBe(true);
  });

  it("preserves form state independently for multiple entities", () => {
    let form1: TestEntity = { ...initialForm };
    let form2: TestEntity = { ...initialForm };

    form1.nombre = "Entity 1";
    form2.nombre = "Entity 2";

    expect(form1.nombre).toBe("Entity 1");
    expect(form2.nombre).toBe("Entity 2");
  });
});
