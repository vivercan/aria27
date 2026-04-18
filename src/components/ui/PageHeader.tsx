"use client";
import { ReactNode } from "react";
import AriaBackButton from "@/components/AriaBackButton";

/**
 * PageHeader — Header estandarizado ARIA27 (PL32 17-Abr-2026).
 *
 * Reemplaza los 100+ patrones inline de `<div className="sticky top-0 z-10 bg-[#040810] pb-4">`
 * con back button + h1. Un solo componente, sticky por default, back button opcional,
 * slot para acciones a la derecha, y breadcrumb opcional.
 *
 * Uso:
 *   <PageHeader title="Proveedores" backHref="/dashboard/requisiciones" />
 *   <PageHeader title="Vehículos" subtitle="Catálogo" actions={<button>Nuevo</button>} />
 *   <PageHeader title="Dashboard" /> // hub top-level, sin back
 */
export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  actions?: ReactNode;
  icon?: ReactNode;
  sticky?: boolean;
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  backHref,
  actions,
  icon,
  sticky = true,
  className = "",
}: PageHeaderProps) {
  return (
    <header
      className={[
        sticky ? "sticky top-0 z-20" : "",
        "bg-[#040810]/95 backdrop-blur-sm",
        "pb-3 pt-1",
        className,
      ].join(" ")}
    >
      <div className="flex items-center gap-4">
        {backHref !== undefined && <AriaBackButton href={backHref} />}
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-[#7f93b0] mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
