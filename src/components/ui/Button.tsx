"use client";
import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";
import { Loader2 } from "lucide-react";

/**
 * Button — Botón primitivo ARIA27 (PL32 + PL41 + PL50 17-Abr-2026).
 *
 * Tres variantes canónicas: primary | secondary | danger.
 * Reemplaza los 3 patrones divergentes detectados:
 *  - bg-aria-primary (estándar)
 *  - bg-rose-600 (activos/vehiculos:184)
 *  - bg-emerald gradients (finanzas/gastos-obra:306,600,612)
 *
 * Props clave:
 *  - variant: "primary" | "secondary" | "danger" | "ghost"
 *  - loading: muestra spinner y deshabilita automáticamente (PL50 anti doble-submit)
 *  - icon: icono a la izquierda del label
 *
 * Uso:
 *   <Button variant="primary" onClick={save}>Guardar</Button>
 *   <Button variant="danger" loading={deleting}>Eliminar</Button>
 */
export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-aria-primary hover:bg-aria-primary-hover text-white " +
    "shadow-sm focus-visible:ring-aria-primary/50",
  secondary:
    "bg-white/[0.04] hover:bg-white/[0.08] text-[#c9d8ed] " +
    "border border-white/[0.08] hover:border-white/[0.15] " +
    "focus-visible:ring-white/20",
  danger:
    "bg-red-600 hover:bg-red-700 text-white " +
    "shadow-sm focus-visible:ring-red-500/50",
  ghost:
    "bg-transparent hover:bg-white/[0.04] text-[#7f93b0] hover:text-white " +
    "focus-visible:ring-white/20",
};

// 19-Abr-2026 mobile-f2: min-h-[44px] sub-md garantiza touch target accesible
// (WCAG 2.5.5 Target Size). md:min-h-0 revierte al tamaño natural en desktop.
const SIZE: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg min-h-[44px] md:min-h-0",
  md: "px-4 py-2 text-sm rounded-xl min-h-[44px] md:min-h-0",
  lg: "px-5 py-2.5 text-base rounded-xl",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    icon,
    fullWidth = false,
    disabled,
    className = "",
    children,
    type,
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      // PL50: default type="button" para evitar submit accidental en forms.
      type={type ?? "button"}
      disabled={isDisabled}
      className={[
        "inline-flex items-center justify-center gap-2",
        "font-medium transition-all duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        fullWidth ? "w-full" : "",
        SIZE[size],
        VARIANT[variant],
        className,
      ].join(" ")}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
});

export default Button;
