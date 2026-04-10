"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Botón de regreso estandarizado para ARIA27.
 * Reemplaza las 112 implementaciones manuales de BackButton.
 *
 * Uso:
 *   <AriaBackButton href="/dashboard/finanzas" />
 *   <AriaBackButton /> {/* usa router.back() *\/}
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
      className={`p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-colors ${className}`}
      aria-label="Regresar"
    >
      <ArrowLeft className="w-4 h-4" />
    </button>
  );
}
