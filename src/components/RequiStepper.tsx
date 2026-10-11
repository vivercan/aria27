"use client";
import { Check, X, Circle } from "lucide-react";
import { buildStepper, type RequiLike } from "@/lib/requi-stepper";

export default function RequiStepper({ req, compact = false }: { req: RequiLike; compact?: boolean }) {
  const pasos = buildStepper(req).filter(p => !(compact && p.estado === "omitido"));
  return (
    <ol className="flex items-start gap-0 overflow-x-auto -mx-1 px-1 py-1" aria-label="Línea de estado" style={{ scrollbarWidth: "none" }}>
      {pasos.map((p, i) => {
        const color = p.estado === "hecho" ? "bg-emerald-500 text-white" : p.estado === "actual" ? "bg-amber-400 text-slate-900 ring-4 ring-amber-400/25" : p.estado === "rechazado" ? "bg-red-500 text-white" : "bg-[var(--d-card-2)] text-[var(--d-muted)]";
        const line = pasos[i + 1] && (p.estado === "hecho") ? "bg-emerald-500/60" : "bg-[var(--d-hover)]";
        return (
          <li key={p.key} className="flex items-start min-w-[72px] flex-1">
            <div className="flex flex-col items-center w-full">
              <div className="flex items-center w-full">
                <div className={`h-[2px] flex-1 ${i === 0 ? "bg-transparent" : line}`} />
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${color}`} title={p.quien || ""}>
                  {p.estado === "hecho" ? <Check className="w-3.5 h-3.5" /> : p.estado === "rechazado" ? <X className="w-3.5 h-3.5" /> : <Circle className="w-2 h-2 fill-current" />}
                </div>
                <div className={`h-[2px] flex-1 ${i === pasos.length - 1 ? "bg-transparent" : line}`} />
              </div>
              <div className={`mt-1 text-[11px] leading-tight text-center ${p.estado === "actual" ? "text-amber-300 font-semibold" : p.estado === "hecho" ? "text-[var(--d-text)]" : p.estado === "omitido" ? "text-[var(--d-faint)] line-through" : "text-[var(--d-muted)]"}`}>
                {p.label}
                {p.fecha && !compact && <div className="text-[11px] text-[var(--d-muted)] font-normal">{new Date(p.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}</div>}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
