"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Botón de regreso estandarizado para ARIA27.
 */
export default function AriaBackButton({
  href,
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <button
      onClick={() => (href ? router.push(href) : router.back())}
      className={`p-2 rounded-xl transition-all duration-150 ${className}`}
      style={{
        color: "#7f93b0",
        backgroundColor: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.color = "white";
        el.style.backgroundColor = "rgba(255,255,255,0.08)";
        el.style.borderColor = "rgba(255,255,255,0.13)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.color = "#7f93b0";
        el.style.backgroundColor = "rgba(255,255,255,0.04)";
        el.style.borderColor = "rgba(255,255,255,0.07)";
      }}
      aria-label="Regresar"
    >
      <ArrowLeft className="w-4 h-4" />
    </button>
  );
}
 
