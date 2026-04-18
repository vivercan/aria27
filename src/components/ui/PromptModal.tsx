"use client";
import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import Button from "./Button";

/**
 * PromptModal — Reemplaza `window.prompt()` con modal accesible (CV-07 18-Abr-2026).
 *
 * Uso:
 *   const [open, setOpen] = useState(false);
 *   <PromptModal
 *     open={open}
 *     title="Renombrar carpeta"
 *     label="Nuevo nombre"
 *     initialValue={nombreActual}
 *     onClose={() => setOpen(false)}
 *     onSubmit={(val) => renombrar(val)}
 *   />
 *
 * Hereda ESC-to-close + outside-click + focus-trap de <Modal>.
 */
export interface PromptModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void | Promise<void>;
  title: string;
  label?: string;
  initialValue?: string;
  placeholder?: string;
  submitLabel?: string;
  cancelLabel?: string;
  /** Validación opcional. Retorna string de error o null si OK. */
  validate?: (value: string) => string | null;
  loading?: boolean;
}

export default function PromptModal({
  open,
  onClose,
  onSubmit,
  title,
  label,
  initialValue = "",
  placeholder,
  submitLabel = "Guardar",
  cancelLabel = "Cancelar",
  validate,
  loading = false,
}: PromptModalProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset al abrir/cerrar
  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setError(null);
      setSubmitting(false);
      // Focus el input después de que el modal abra
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, initialValue]);

  const handleSubmit = async () => {
    setError(null);
    if (validate) {
      const err = validate(value);
      if (err) {
        setError(err);
        return;
      }
    }
    if (!value.trim()) {
      setError("Este campo es requerido");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(value);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  };

  const isBusy = loading || submitting;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isBusy}>
            {cancelLabel}
          </Button>
          <Button onClick={handleSubmit} loading={isBusy}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {label && <label className="text-sm text-[#c9d8ed]">{label}</label>}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isBusy) handleSubmit();
          }}
          placeholder={placeholder}
          disabled={isBusy}
          className="w-full px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-aria-primary/50 disabled:opacity-50"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </Modal>
  );
}
