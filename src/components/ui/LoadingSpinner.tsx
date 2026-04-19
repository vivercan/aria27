"use client";
import { Loader2 } from "lucide-react";

/**
 * LoadingSpinner — Spinner uniforme ARIA27 (PL32 17-Abr-2026).
 *
 * Reemplaza los patrones `<Loader2 className="animate-spin" />` inline por
 * un componente con size + label + centrado opcional consistente.
 *
 * Uso:
 *   if (loading) return <LoadingSpinner center label="Cargando obras…" />;
 *   <LoadingSpinner size={16} inline />
 */
export interface LoadingSpinnerProps {
  size?: number;
  label?: string;
  center?: boolean;
  inline?: boolean;
  className?: string;
}

export default function LoadingSpinner({
  size = 20,
  label,
  center = false,
  inline = false,
  className = "",
}: LoadingSpinnerProps) {
  const content = (
    <>
      <Loader2 className="animate-spin text-aria-accent" style={{ width: size, height: size }} aria-hidden="true" />
      {label && <span className="text-sm text-[#7f93b0]">{label}</span>}
    </>
  );

  if (inline) {
    return (
      <span className={["inline-flex items-center gap-2", className].join(" ")} role="status" aria-live="polite">
        {content}
      </span>
    );
  }

  return (
    <div
      className={[
        "flex items-center gap-3",
        center ? "justify-center w-full py-8" : "",
        className,
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      {content}
    </div>
  );
}
