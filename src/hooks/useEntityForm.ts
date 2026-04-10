import { useState, useCallback } from 'react';

/**
 * Hook return type for useEntityForm
 */
export type UseEntityFormReturn<T> = {
  showModal: boolean;
  editId: string | null;
  form: T;
  saving: boolean;
  openNew: () => void;
  openEdit: (id: string, data: Partial<T>) => void;
  closeModal: () => void;
  setForm: (form: T) => void;
  setSaving: (saving: boolean) => void;
  updateField: <K extends keyof T>(key: K, value: T[K]) => void;
};

/**
 * useEntityForm Hook
 *
 * A reusable hook for managing CRUD modal forms across the ARIA27 ERP application.
 * Used in catalogo, vehiculos, proveedores, clientes, and other entity modules.
 *
 * Manages the state for:
 * - Modal visibility (show/hide)
 * - Edit mode (which entity is being edited, if any)
 * - Form data (current field values)
 * - Saving state (loading indicator during async operations)
 *
 * @template T - The entity type (e.g., Proveedor, Vehiculo, Cliente)
 *
 * @param {T} initialForm - The initial form state (empty/default entity)
 * @returns {UseEntityFormReturn<T>} Object containing:
 *   - showModal: Whether the modal is open
 *   - editId: ID of entity being edited (null for new entities)
 *   - form: Current form data
 *   - saving: Whether a save operation is in progress
 *   - openNew: Opens modal with fresh form for new entity
 *   - openEdit: Opens modal with existing entity data for editing
 *   - closeModal: Closes modal and resets all state
 *   - setForm: Replaces entire form object
 *   - setSaving: Updates saving state
 *   - updateField: Updates a single form field
 *
 * @example
 * interface Proveedor {
 *   id: string;
 *   nombre: string;
 *   email: string;
 *   telefono: string;
 * }
 *
 * const initialForm: Proveedor = {
 *   id: '',
 *   nombre: '',
 *   email: '',
 *   telefono: '',
 * };
 *
 * const {
 *   showModal,
 *   editId,
 *   form,
 *   saving,
 *   openNew,
 *   openEdit,
 *   closeModal,
 *   updateField,
 *   setSaving,
 * } = useEntityForm(initialForm);
 *
 * const handleNew = () => openNew();
 *
 * const handleEdit = (proveedor: Proveedor) => {
 *   openEdit(proveedor.id, proveedor);
 * };
 *
 * const handleSave = async () => {
 *   setSaving(true);
 *   try {
 *     const endpoint = editId ? `/api/proveedores/${editId}` : '/api/proveedores';
 *     const method = editId ? 'PUT' : 'POST';
 *     await fetch(endpoint, { method, body: JSON.stringify(form) });
 *     closeModal();
 *   } finally {
 *     setSaving(false);
 *   }
 * };
 *
 * // In JSX:
 * <>
 *   <button onClick={handleNew}>Nuevo</button>
 *   {showModal && (
 *     <Modal open={showModal} onClose={closeModal}>
 *       <input
 *         value={form.nombre}
 *         onChange={(e) => updateField('nombre', e.target.value)}
 *       />
 *       <button onClick={handleSave} disabled={saving}>
 *         {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Crear'}
 *       </button>
 *     </Modal>
 *   )}
 * </>
 */
export function useEntityForm<T>(initialForm: T): UseEntityFormReturn<T> {
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<T>(initialForm);
  const [saving, setSaving] = useState(false);

  /**
   * Open modal for creating a new entity
   * Resets form to initial state and clears edit ID
   */
  const openNew = useCallback(() => {
    setForm(initialForm);
    setEditId(null);
    setShowModal(true);
  }, [initialForm]);

  /**
   * Open modal for editing an existing entity
   * @param id - ID of the entity being edited
   * @param data - Partial entity data to merge into form
   */
  const openEdit = useCallback((id: string, data: Partial<T>) => {
    setEditId(id);
    setForm((prevForm) => ({ ...prevForm, ...data }));
    setShowModal(true);
  }, []);

  /**
   * Close modal and reset all state
   */
  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditId(null);
    setForm(initialForm);
    setSaving(false);
  }, [initialForm]);

  /**
   * Update a single field in the form
   * @param key - Field key to update
   * @param value - New value for the field
   */
  const updateField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setForm((prevForm) => ({
      ...prevForm,
      [key]: value,
    }));
  }, []);

  return {
    showModal,
    editId,
    form,
    saving,
    openNew,
    openEdit,
    closeModal,
    setForm,
    setSaving,
    updateField,
  };
}
