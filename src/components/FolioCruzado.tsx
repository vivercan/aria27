"use client";
/**
 * Debajo de un buscador: si escribes un número, dice qué es ese folio aunque esté en otra sección
 * (un solo consecutivo para requisiciones, pagos de servicio y tareas · 11-Oct-2026 · JJ).
 */
import { useEffect, useState } from "react";
import Link from "next/link";

type It = { tipo: string; folio: string; titulo: string; estado: string; href: string };

export default function FolioCruzado({ q, ocultarTipo }: { q: string; ocultarTipo?: "Tarea" | "Requisición" }) {
  const [items, setItems] = useState<It[]>([]);
  useEffect(() => {
    const m = String(q || "").trim().match(/^(?:#|req-|tar-|\d{4}-)*0*(\d{1,6})$/i);
    if (!m) { setItems([]); return; }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/folio?q=${m[1]}`, { credentials: "include", signal: ctl.signal }).then(r => r.ok ? r.json() : { items: [] }).then(j => setItems((j.items || []) as It[])).catch(() => {});
    }, 300);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);
  const ver = items.filter(i => !ocultarTipo || (ocultarTipo === "Requisición" ? i.tipo === "Tarea" : i.tipo !== "Tarea"));
  if (!ver.length) return null;
  return (
    <div className="mt-2 space-y-1.5">
      {ver.map(i => (
        <Link key={i.folio} href={i.href} className="flex items-center gap-3 rounded-xl border border-[var(--d-border)] bg-[var(--d-card)] px-3 py-2.5">
          <span className="shrink-0 rounded-lg px-2 py-1 text-[12px] font-bold text-white" style={{ background: i.tipo === "Tarea" ? "#b85507" : i.tipo === "Pago de servicio" ? "#007a87" : "#0073ea" }}>{i.tipo}</span>
          <span className="flex-1 min-w-0"><span className="block text-[14px] font-bold text-[var(--d-text)]">{i.folio}</span><span className="block text-[12.5px] text-[var(--d-muted)] truncate">{i.titulo}</span></span>
          <span className="text-[13px] font-semibold text-[var(--d-link)]">Abrir</span>
        </Link>))}
    </div>
  );
}
