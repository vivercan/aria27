"use client";
import { ReactNode } from "react";
import { Inbox } from "lucide-react";

/**
 * EmptyState — Estado vacío estandarizado (PL32 17-Abr-2026).
 *
 * Reemplaza los mensajes ad-hoc "No hay X", "Sin datos", etc. con un componente
 * consistente que acepta icono, título, descripción y acción primaria.
 *
 * Uso:
 *   <EmptyState title="No hay vehículos registrados" />
 *   <EmptyState
 *     icon={<Truck />}
 *     title="Sin entregas"
 *     description="Cuando registres una entrega aparecerá aquí."
 *     action={<button onClick={create}>Registrar entrega</button>}
 *   />
 */
export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({
  title,
  description,
  icon,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center text-center",
        "py-12 px-6 gap-3 rounded-xl",
        "bg-white/[0.02] border border-white/[0.04]",
        className,
      ].join(" ")}
    >
      <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white/[0.04] text-[#7f93b0]">
        {icon ?? <Inbox className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      {description && (
        <p className="text-sm text-[#7f93b0] max-w-md">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
