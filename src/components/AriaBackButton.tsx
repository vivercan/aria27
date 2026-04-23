"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * AriaBackButton v3 (22-Abr-2026): boton solido 3D, alineado al canon AAA.
 * Sin colores neon. Gradient steel + shadow inset + hover azul rey.
 */
export default function AriaBackButton({
  href,
  onClick,
  className = "",
}: {
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const router = useRouter();

  const baseStyle = {
    color: "#EAF2FF",
    background: "linear-gradient(180deg, #2C3D52 0%, #21303E 100%)",
    border: "1px solid rgba(140,178,228,0.18)",
    boxShadow: "inset 0 1px 0 rgba(210,228,252,0.07), 0 2px 6px rgba(0,0,0,0.30)",
  };
  const hoverStyle = {
    color: "#FFFFFF",
    background: "linear-gradient(180deg, #1E3E7A 0%, #163068 100%)",
    border: "1px solid rgba(160,200,240,0.30)",
    boxShadow: "inset 0 1px 0 rgba(220,235,255,0.12), 0 4px 10px rgba(0,0,0,0.35)",
  };

  return (
    <button
      onClick={() => {
        if (onClick) { onClick(); return; }
        if (href) { router.push(href); return; }
        router.back();
      }}
      className={`inline-flex items-center justify-center rounded-lg transition-all duration-150 ${className}`}
      style={{
        width: 36,
        height: 36,
        ...baseStyle,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLButtonElement;
        Object.assign(el.style, hoverStyle);
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement;
        Object.assign(el.style, baseStyle);
      }}
      aria-label="Regresar"
    >
      <ArrowLeft style={{ width: 18, height: 18, strokeWidth: 2.2 }} />
    </button>
  );
}
