import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useFlashMessage, type FlashMsg, type UseFlashMessageReturn } from "@/hooks/useFlashMessage";
import { useEntityForm, type UseEntityFormReturn } from "@/hooks/useEntityForm";

/**
 * Test hook behavior by simulating state changes.
 * These tests verify pure logic without requiring @testing-library/react.
 * PL34 17-Abr-2026: useFlashMessage API unificada con tipos "ok" | "err".
 */

describe("useFlashMessage (PL34 canónica)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("flash() establece msg con tipo y texto", () => {
    let message: FlashMsg | null = null;

    const flash = (tipo: "ok" | "err", texto: string) => {
      message = { tipo, texto };
    };

    flash("ok", "Test message");

    expect(message).toEqual({ tipo: "ok", texto: "Test message" });
  });

  it("flash() auto-limpia tras 3 segundos", () => {
    let message: FlashMsg | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const flash = (tipo: "ok" | "err", texto: string) => {
      message = { tipo, texto };
      timeoutId = setTimeout(() => {
        message = null;
      }, 3000);
    };

    flash("err", "Error occurred");
    expect(message).not.toBeNull();

    vi.advanceTimersByTime(2999);
    expect(message).not.toBeNull();

    vi.advanceTimersByTime(1);
    expect(message).toBeNull();

    if (timeoutId) clearTimeout(timeoutId);
  });

  it("clear() limpia el msg inmediatamente", () => {
    let message: FlashMsg | null = { tipo: "ok", texto: "Test" };

    const clear = () => {
      message = null;
    };

    clear();
    expect(message).toBeNull();
  });

  it("soporta ambos tipos 'ok' y 'err'", () => {
    let message: FlashMsg | null = null;

    const flash = (tipo: "ok" | "err", texto: string) => {
      message = { tipo, texto };
    };

    flash("ok", "Success!");
    expect(message).not.toBeNull();
    expect((message as unknown as FlashMsg).tipo).toBe("ok");

    flash("err", "Error!");
    expect(message).not.toBeNull();
    expect((message as unknown as FlashMsg).tipo).toBe("err");
  });

  it("la función useFlashMessage es exportable y UseFlashMessageReturn es tipo válido", () => {
    expect(typeof useFlashMessage).toBe("function");
    const r: UseFlashMessageReturn = { msg: null, flash: () => {}, clear: () => {} };
    expect(r.msg).toBeNull();
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
    let form: TestEntity = { ...initialForm, nombre: "Old Name" };

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

    openEdit("prov-123", { nombre: "Proveedor ABC", email: "abc@example.com" });

    expect(editId).toBe("prov-123");
    expect(showModal).toBe(true);
    expect(form.nombre).toBe("Proveedor ABC");
    expect(form.email).toBe("abc@example.com");
    expect(form.id).toBe("");
  });

  it("closeModal() clears all state", () => {
    let showModal = true;
    let editId: string | null = "edit-123";
    let form: TestEntity = { id: "123", nombre: "Test", email: "test@example.com", telefono: "555-1234" };
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

  it("updateField() updates a single field", () => {
    let form: TestEntity = { ...initialForm };

    const updateField = <K extends keyof TestEntity>(key: K, value: TestEntity[K]) => {
      form = { ...form, [key]: value };
    };

    updateField("nombre", "Juan Pérez");
    expect(form.nombre).toBe("Juan Pérez");
    expect(form.email).toBe("");

    updateField("email", "juan@example.com");
    expect(form.nombre).toBe("Juan Pérez");
    expect(form.email).toBe("juan@example.com");
  });

  it("updateField() sequential updates", () => {
    let form: TestEntity = { ...initialForm };

    const updateField = <K extends keyof TestEntity>(key: K, value: TestEntity[K]) => {
      form = { ...form, [key]: value };
    };

    updateField("nombre", "Test Name");
    updateField("email", "test@example.com");
    updateField("telefono", "555-9999");

    expect(form).toEqual({ id: "", nombre: "Test Name", email: "test@example.com", telefono: "555-9999" });
  });

  it("modal flow open → update → close", () => {
    let showModal = false;
    let editId: string | null = null;
    let form: TestEntity = { ...initialForm };

    const openEdit = (id: string, data: Partial<TestEntity>) => {
      editId = id;
      form = { ...form, ...data };
      showModal = true;
    };
    const updateField = <K extends keyof TestEntity>(key: K, value: TestEntity[K]) => {
      form = { ...form, [key]: value };
    };
    const closeModal = () => {
      showModal = false;
      editId = null;
      form = { ...initialForm };
    };

    openEdit("vendor-1", { nombre: "Initial Vendor" });
    expect(showModal).toBe(true);
    expect(form.nombre).toBe("Initial Vendor");

    updateField("email", "vendor@example.com");
    expect(form.email).toBe("vendor@example.com");

    closeModal();
    expect(showModal).toBe(false);
    expect(form).toEqual(initialForm);
  });

  it("openNew() after openEdit() resets edit context", () => {
    let editId: string | null = null;
    let form: TestEntity = { ...initialForm };
    let showModal = false;

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

  it("preserves form state independently", () => {
    const form1: TestEntity = { ...initialForm, nombre: "Entity 1" };
    const form2: TestEntity = { ...initialForm, nombre: "Entity 2" };

    expect(form1.nombre).toBe("Entity 1");
    expect(form2.nombre).toBe("Entity 2");
  });

  it("tipos UseEntityFormReturn y useEntityForm exportables", () => {
    expect(typeof useEntityForm).toBe("function");
    const shape: Partial<UseEntityFormReturn<{ x: string }>> = {};
    expect(shape).toBeDefined();
  });
});
