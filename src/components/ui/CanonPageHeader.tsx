"use client";
import * as React from "react";
import AriaBackButton from "@/components/AriaBackButton";

/**
 * CanonPageHeader - header unico canon AAA.
 * PR feat/canon-sweep-lote1-23abr2026.
 *
 * - Sticky top-0 con backdrop blur.
 * - Gradient steel oscuro encima del canvas navy (aria-page-canon), dejando el "header bloque"
 *   canon #123E92 -> #103A86 reservado para pieces internos (tabs activos, botones), no
 *   para la franja entera, que debe respirar sobre el fondo navy del wrapper.
 * - AriaBackButton a la izquierda + titulo / subtitulo + slot de acciones a la derecha.
 */

export interface CanonPageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  backHref?: string;
  onBack?: () => void;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export default function CanonPageHeader({
  title,
  subtitle,
  backHref,
  onBack,
  icon,
  right,
  className = "",
}: CanonPageHeaderProps) {
  return (
    <div
      className={`sticky top-0 z-10 bg-[#040810]/80 backdrop-blur pb-3 border-b border-white/[0.08] ${className}`}
    >
      <div className="flex items-center gap-3">
        {backHref || onBack ? (
          <AriaBackButton href={backHref} onClick={onBack} />
        ) : null}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 truncate">
            {icon ? <span className="shrink-0 text-aria-accent">{icon}</span> : null}
            <span className="truncate">{title}</span>
          </h1>
          {subtitle ? (
            <p className="text-sm text-[#7f93b0] mt-0.5 truncate">{subtitle}</p>
          ) : null}
        </div>
        {right ? <div className="shrink-0 flex items-center gap-2">{right}</div> : null}
      </div>
    </div>
  );
}
