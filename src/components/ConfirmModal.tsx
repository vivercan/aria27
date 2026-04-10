"use client";
import { AlertTriangle } from "lucide-react";

/**
 * Reemplazo estandarizado de window.confirm() para ARIA27.
 *
 * Uso:
 *   const [confirm, setConfirm] = useState<{ open: boolean; msg: string; onOk: () => void }>({ open: false, msg: "", onOk: () => {} });
 *
 *   // En vez de: if (!confirm("¿Eliminar?")) return;
 *   // Hacer:
 *   setConfirm({ open: true, msg: "¿Eliminar este registro?", onOk: () => { ... } });
 *
 *   <ConfirmModal
 *     open={confirm.open}
 *     message={confirm.msg}
 *     onConfirm={() => { confirm.onOk(); setConfirm({ open: false, msg: "", onOk: () => {} }); }}
 *     onCancel={() => setConfirm({ open: false, msg: "", onOk: () => {} })}
 *   />
 */
export default function ConfirmModal({
  open,
  message,
  title = "Confirmar acción",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "warning",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "warning" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  const btnColor =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-500"
      : "bg-amber-600 hover:bg-amber-500";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${variant === "danger" ? "bg-red-500/10" : "bg-amber-500/10"}`}>
            <AlertTriangle className={`w-5 h-5 ${variant === "danger" ? "text-red-400" : "text-amber-400"}`} />
          </div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
        </div>
        <p className="text-sm text-slate-300 mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2 text-sm text-white rounded-lg font-medium transition-colors ${btnColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
