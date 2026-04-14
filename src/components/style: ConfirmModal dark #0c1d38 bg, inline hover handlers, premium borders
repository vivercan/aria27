"use client";
import { AlertTriangle } from "lucide-react";

/**
 * Modal de confirmación estandarizado para ARIA27.
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

  const btnBg = variant === "danger" ? "#dc2626" : "#d97706";
  const btnHover = variant === "danger" ? "#b91c1c" : "#b45309";
  const iconBg = variant === "danger" ? "rgba(220,38,38,0.1)" : "rgba(217,119,6,0.1)";
  const iconColor = variant === "danger" ? "#f87171" : "#fbbf24";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={onCancel}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
        style={{ backgroundColor: "#0c1d38", border: "1px solid rgba(255,255,255,0.09)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl flex-shrink-0" style={{ backgroundColor: iconBg }}>
            <AlertTriangle className="w-5 h-5" style={{ color: iconColor }} />
          </div>
          <h3 className="text-[15px] font-semibold text-white">{title}</h3>
        </div>
        <p className="text-sm leading-relaxed mb-6" style={{ color: "#c9d8ed" }}>{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-xl transition-all duration-150"
            style={{
              color: "#7f93b0",
              backgroundColor: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "white"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#7f93b0"; }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 text-sm text-white rounded-xl font-medium transition-all duration-150"
            style={{ backgroundColor: btnBg }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = btnHover; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = btnBg; }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
