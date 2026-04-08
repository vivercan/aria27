"use client";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface BackButtonProps {
  /** Destino opcional. Si no se provee, usa router.back(). */
  href?: string;
  className?: string;
  title?: string;
}

/**
 * Boton de regreso estandar para submodulos de ARIA27.
 * Uso: `<BackButton />` (history back) o `<BackButton href="/dashboard/obras" />` (destino fijo).
 */
export default function BackButton({ href, className = "", title = "Regresar" }: BackButtonProps) {
  const router = useRouter();
  const base =
    "p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors inline-flex items-center justify-center";
  const cls = `${base} ${className}`;

  if (href) {
    return (
      <Link href={href} className={cls} title={title} aria-label={title}>
        <ArrowLeft className="w-5 h-5" />
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => router.back()} className={cls} title={title} aria-label={title}>
      <ArrowLeft className="w-5 h-5" />
    </button>
  );
}
