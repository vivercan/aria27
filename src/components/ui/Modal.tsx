"use client";
import { ReactNode, useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Modal — Modal primitivo ARIA27 (PL32 + PL43 + PL54 17-Abr-2026).
 *
 * Características:
 *  - ESC-to-close (cierra con tecla Escape)
 *  - Outside-click dismiss (configurable)
 *  - Focus trap automático al abrir (focus al primer elemento focusable)
 *  - aria-modal + role="dialog" + aria-labelledby
 *  - Bloquea scroll body mientras está abierto
 *
 * Uso:
 *   <Modal open={open} onClose={() => setOpen(false)} title="Editar proveedor">
 *     <form>...</form>
 *     <ModalFooter>
 *       <button>Cancelar</button>
 *       <button>Guardar</button>
 *     </ModalFooter>
 *   </Modal>
 */
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Permitir cerrar con click fuera del contenido. Default true. */
  dismissOnOutside?: boolean;
  /** Permitir cerrar con ESC. Default true. */
  dismissOnEsc?: boolean;
  /** Ancho máximo. Default "max-w-lg". */
  maxWidth?: string;
  /** className adicional para el contenedor del modal. */
  className?: string;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  dismissOnOutside = true,
  dismissOnEsc = true,
  maxWidth = "max-w-lg",
  className = "",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  // ESC-to-close + block body scroll
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (dismissOnEsc && e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);

    // Focus primer elemento focusable del modal
    const prevActive = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    });

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevActive?.focus?.();
    };
  }, [open, dismissOnEsc, onClose]);

  if (!open) return null;

  const labelledById = title ? "aria-modal-title" : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={dismissOnOutside ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledById}
        className={[
          "relative w-full rounded-2xl bg-[#0a1628] border border-white/[0.08]",
          "shadow-2xl overflow-hidden flex flex-col max-h-[90vh]",
          maxWidth,
          className,
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/[0.06]">
            <h2 id={labelledById} className="text-lg font-semibold text-white">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#7f93b0] hover:text-white hover:bg-white/[0.06] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-aria-primary/50"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/[0.06] bg-white/[0.02]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
