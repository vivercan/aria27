"use client";
import * as React from "react";

/**
 * KpiCard - componente unico para KPIs en canon AAA.
 * PR feat/canon-sweep-lote1-23abr2026.
 *
 * Variantes:
 *  - "neutral" (default): steel gradient #2C3D52 -> #21303E con borde steel.
 *  - "emerald": gradient #1F8A60 -> #16704D con borde emerald (uso: success / totales positivos).
 *  - "rose":    gradient #C8444A -> #A53039 con borde rose (uso: errores / alertas / vencidos).
 *
 * Todos los tokens salen del canon AAA del 22-Abr-2026 (ver Notion doc maestro).
 */

export type KpiVariant = "neutral" | "emerald" | "rose";

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  variant?: KpiVariant;
  className?: string;
  hint?: string;
}

const VARIANT_CLASSES: Record<KpiVariant, string> = {
  neutral:
    "bg-gradient-to-b from-[#2C3D52] via-[#263647] to-[#21303E] border border-[#8CB2E4]/20 shadow-[inset_0_1px_0_rgba(220,235,255,0.10),0_2px_6px_rgba(0,0,0,0.30)]",
  emerald:
    "bg-gradient-to-b from-[#1F8A60] to-[#16704D] border border-emerald-400/30 shadow-[inset_0_1px_0_rgba(220,255,235,0.15),0_2px_6px_rgba(0,0,0,0.30)]",
  rose:
    "bg-gradient-to-b from-[#C8444A] to-[#A53039] border border-rose-400/30 shadow-[inset_0_1px_0_rgba(255,220,225,0.15),0_2px_6px_rgba(0,0,0,0.30)]",
};

export default function KpiCard({
  label,
  value,
  icon,
  variant = "neutral",
  className = "",
  hint,
}: KpiCardProps) {
  const base = VARIANT_CLASSES[variant];
  const labelColor = variant === "neutral" ? "text-[#7f93b0]" : "text-white/80";
  const valueColor = "text-white";
  return (
    <div className={`p-4 rounded-2xl ${base} ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={`text-xs font-medium tracking-tight ${labelColor}`}>{label}</div>
          <div className={`mt-1 text-2xl font-bold tabular-nums truncate ${valueColor}`}>{value}</div>
          {hint ? <div className="mt-0.5 text-[11px] text-white/60 truncate">{hint}</div> : null}
        </div>
        {icon ? <div className="shrink-0 text-white/70">{icon}</div> : null}
      </div>
    </div>
  );
}
