"use client";
import type { FlashMsg } from "@/lib/use-flash-message";

/**
 * Componente estandarizado para mostrar flash messages.
 * Usar con useFlashMessage():
 *
 *   const { msg, flash } = useFlashMessage();
 *   <FlashBanner msg={msg} className="mx-6 mt-3" />
 */
export default function FlashBanner({
  msg,
  className = "",
}: {
  msg: FlashMsg | null;
  className?: string;
}) {
  if (!msg) return null;
  return (
    <div
      className={`px-4 py-2 rounded-lg text-sm transition-opacity ${
        msg.tipo === "ok"
          ? "bg-emerald-500/20 text-emerald-400"
          : "bg-red-500/20 text-red-400"
      } ${className}`}
    >
      {msg.texto}
    </div>
  );
}
