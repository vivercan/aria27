"use client";
import { useState } from "react";
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

  if (!open) return null;

  const handleConfirm = async () => {
    if (confirmation !== "Borrar") return;
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
    setConfirmation("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-aria-bg p-6 rounded-xl border border-red-500/30 w-[420px] shadow-2xl shadow-red-500/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Eliminar {itemLabel}</h3>
            <p className="text-red-400 text-xs font-medium">Acción irreversible</p>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
          <p className="text-sm text-red-300 font-medium mb-1">
            Se eliminará{count > 1 ? "n" : ""} {count} {itemLabel}
          </p>
          <p className="text-xs text-red-400/80">
            Este proceso no tiene vuelta atrás. Los datos serán respaldados internamente.
          </p>
        </div>
        <p className="text-slate-400 text-sm mb-2">
          Para confirmar, escribe <span className="text-white font-bold">Borrar</span> exactamente:
        </p>
        <input
          type="text"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder="Borrar"
          className={`w-full px-4 py-2.5 rounded-lg border text-white text-center text-lg font-medium tracking-wider mb-4 focus:outline-none transition ${
            confirmation === "Borrar"
              ? "bg-red-500/10 border-red-500/50 focus:border-red-500"
              : "bg-white/5 border-white/10 focus:border-white/30"
          }`}
          autoFocus
        />
        <div className="flex gap-3">
          <button
            onClick={() => { setConfirmation(""); onClose(); }}
            className="flex-1 py-2.5 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirmation !== "Borrar" || deleting}
            className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
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
