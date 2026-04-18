"use client";
import { useEffect, useState } from "react";
import { Trash2, Loader2 } from "lucide-react";

interface DeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  count?: number;
  itemLabel?: string;
}

export default function DeleteModal({ open, onClose, onConfirm, count = 1, itemLabel = "registro(s)" }: DeleteModalProps) {
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  // PL43 17-Abr-2026: ESC-to-close + block body scroll mientras el modal está abierto.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) {
        setConfirmation("");
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, deleting, onClose]);

  if (!open) return null;

  const handleConfirm = async () => {
    if (confirmation !== "Borrar" || deleting) return; // PL50: guard contra doble-submit
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
    setConfirmation("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={() => { if (!deleting) { setConfirmation(""); onClose(); } }}
      role="presentation"
    >
      <div
        className="rounded-2xl p-6 w-[420px] max-w-[calc(100vw-2rem)] shadow-2xl"
        style={{
          backgroundColor: "#0c1d38",
          border: "1px solid rgba(220,38,38,0.25)",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "rgba(220,38,38,0.12)" }}
          >
            <Trash2 className="w-5 h-5" style={{ color: "#f87171" }} />
          </div>
          <div>
            <h3 id="delete-modal-title" className="text-[15px] font-semibold text-white">Eliminar {itemLabel}</h3>
            <p className="text-xs font-medium" style={{ color: "#f87171" }}>Acción irreversible</p>
          </div>
        </div>

        <div
          className="p-3 rounded-xl mb-4"
          style={{ backgroundColor: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)" }}
        >
          <p className="text-sm font-medium mb-0.5" style={{ color: "#fca5a5" }}>
            Se eliminará{count > 1 ? "n" : ""} {count} {itemLabel}
          </p>
          <p className="text-xs" style={{ color: "#f87171" }}>
            Este proceso no tiene vuelta atrás. Los datos serán respaldados internamente.
          </p>
        </div>

        <p className="text-sm mb-2" style={{ color: "#7f93b0" }}>
          Para confirmar, escribe <span className="text-white font-bold">Borrar</span> exactamente:
        </p>
        <input
          type="text"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder="Borrar"
          className="w-full px-4 py-2.5 rounded-xl text-white text-center text-base font-medium tracking-wider mb-5 outline-none transition-all duration-150"
          style={{
            backgroundColor: confirmation === "Borrar" ? "rgba(220,38,38,0.08)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${confirmation === "Borrar" ? "rgba(220,38,38,0.4)" : "rgba(255,255,255,0.07)"}`,
          }}
          autoFocus
        />
        <div className="flex gap-3">
          <button
            onClick={() => { setConfirmation(""); onClose(); }}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
            style={{
              backgroundColor: "rgba(255,255,255,0.05)",
              color: "#7f93b0",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirmation !== "Borrar" || deleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#dc2626" }}
          >
            {deleting ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Eliminando...</>
            ) : (
              <><Trash2 className="w-4 h-4" />Eliminar</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
