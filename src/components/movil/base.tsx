"use client";
/** Piezas comunes de las pantallas de teléfono (Doménica 27 · 11-Oct-2026) */
import Link from "next/link";
import { Search, Phone, MessageCircle } from "lucide-react";
import { Ficha, type Ico } from "@/components/domenica/IconosObra";

export function Encabezado({ ico, color, titulo, sub, accion, atras = "/dashboard/campo/mas" }: { ico: Ico; color: string; titulo: string; sub?: string; accion?: React.ReactNode; atras?: string }) {
  return (
    <div className="flex items-center gap-3">
      {/* 11-Oct-2026: "Regresar" va siempre arriba en el encabezado del teléfono (RegresarTel) */}
      <span hidden data-atras={atras} />
      <Ficha ico={ico} color={color} size="md" />
      <div className="flex-1 min-w-0"><h1 className="text-[21px] font-bold leading-tight text-[var(--d-text)] truncate">{titulo}</h1>{sub && <p className="text-[12.5px] text-[var(--d-muted)] truncate">{sub}</p>}</div>
      {accion}
    </div>
  );
}

export function Buscador({ valor, cambiar, texto }: { valor: string; cambiar: (v: string) => void; texto: string }) {
  return (
    <label className="mt-4 flex items-center gap-2 rounded-2xl bg-[var(--d-card)] border border-[var(--d-border)] px-3.5 h-12">
      <Search className="w-5 h-5 text-[var(--d-faint)]" />
      <input value={valor} onChange={e => cambiar(e.target.value)} placeholder={texto} className="flex-1 min-w-0 h-full bg-transparent text-[16px] text-[var(--d-text)] outline-none placeholder:text-[var(--d-faint)]" />
    </label>
  );
}

export function Pestanas<T extends string>({ valor, cambiar, opciones }: { valor: T; cambiar: (v: T) => void; opciones: { v: T; l: string; n?: number }[] }) {
  return (
    <div className="mt-3 flex gap-1 rounded-2xl bg-[var(--d-card-2)] p-1">
      {opciones.map(o => <button key={o.v} type="button" onClick={() => cambiar(o.v)} className={`flex-1 rounded-xl py-2.5 text-[13.5px] font-bold ${valor === o.v ? "bg-[var(--d-card)] text-[var(--d-text)] shadow-sm" : "text-[var(--d-muted)]"}`}>{o.l}{o.n !== undefined && <span className="ml-1 text-[var(--d-faint)] font-semibold">{o.n}</span>}</button>)}
    </div>
  );
}

/** Botones de llamar / WhatsApp en un toque */
export function Contacto({ tel }: { tel?: string | null }) {
  const n = String(tel || "").replace(/\D/g, ""); if (n.length < 10) return null;
  const mx = n.length === 10 ? `52${n}` : n;
  return (
    <span className="flex gap-1.5 shrink-0">
      <a href={`tel:+${mx}`} onClick={e => e.stopPropagation()} aria-label="Llamar" className="w-10 h-10 rounded-xl bg-[#0073ea] flex items-center justify-center"><Phone className="w-[18px] h-[18px] text-white" /></a>
      <a href={`https://wa.me/${mx}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} aria-label="WhatsApp" className="w-10 h-10 rounded-xl bg-[#1f8500] flex items-center justify-center"><MessageCircle className="w-[18px] h-[18px] text-white" /></a>
    </span>
  );
}

export const iniciales = (s?: string | null) => String(s || "?").trim().split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase();

/** Enlace a la vista completa (computadora) para lo que solo existe ahí */
export function ModoCompleto({ texto = "Ver todo en modo completo" }: { texto?: string }) {
  const url = typeof window === "undefined" ? "" : `${window.location.pathname}?web=1`;
  return <p className="mt-6 text-center"><a href={url} className="inline-block px-3 py-3 text-[13px] font-semibold text-[var(--d-link)]">{texto}</a></p>;
}

export const Pagina = ({ children }: { children: React.ReactNode }) => <div className="dom-page h-full overflow-y-auto"><div className="px-4 pt-4 pb-28 max-w-2xl mx-auto">{children}</div></div>;
