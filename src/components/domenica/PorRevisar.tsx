"use client";
/** Panel "Por revisar" (11-Oct-2026): lo que encargaste y ya te contestaron. Se ve arriba de Actividades y en el hub de ARIA Doménica. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { cargarPorRevisar, type PorRevisar } from "@/lib/revisar";

export default function PanelPorRevisar({ email, onAbrir, recargar = 0 }: { email: string; onAbrir?: (id: string) => void; recargar?: number }) {
  const [l, setL] = useState<PorRevisar[]>([]);
  useEffect(() => { let v = true; cargarPorRevisar(email).then(x => { if (v) setL(x); }).catch(() => {}); return () => { v = false; }; }, [email, recargar]);
  if (!l.length) return null;
  return (
    <section id="por-revisar" className="mt-4 rounded-2xl border-2 border-[#b85507] bg-[var(--d-card)] p-3">
      <h2 className="text-[16px] font-bold text-[var(--d-text)]">Por revisar ({l.length})</h2>
      <p className="text-[14px] text-[var(--d-muted)]">Lo que encargaste y ya te contestaron.</p>
      <ul className="mt-2 divide-y divide-[var(--d-border)]">
        {l.slice(0, 8).map(x => {
          const atorada = !x.por_aprobar && !!x.motivo_bloqueo;
          const cuerpo = <>
            <span className="flex-1 min-w-0"><span className="block text-[15px] font-semibold text-[var(--d-text)] truncate">{x.titulo}</span>
              <span className={`block text-[13.5px] truncate ${atorada ? "text-[var(--d-danger)]" : "text-[var(--d-muted)]"}`}>{x.asignado_nombre || "—"} · {atorada ? `atorada: ${x.motivo_bloqueo}` : "dice que ya terminó"}</span></span>
            <span className={`shrink-0 rounded-xl px-3 py-2 text-[14px] font-bold text-white ${atorada ? "bg-[#d0304a]" : "bg-[#b85507]"}`}>{atorada ? "Ver" : "Revisar"}</span></>;
          return <li key={x.id}>{onAbrir
            ? <button type="button" onClick={() => onAbrir(x.id)} className="w-full flex items-center gap-3 py-2.5 text-left">{cuerpo}</button>
            : <Link href={`/dashboard/actividades?abrir=${x.id}`} className="flex items-center gap-3 py-2.5">{cuerpo}</Link>}</li>;
        })}
      </ul>
    </section>
  );
}
