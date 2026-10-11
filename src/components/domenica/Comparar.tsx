"use client";
/**
 * Comparar dos imágenes (antes / ahora, versión vieja / nueva) · Doménica 27 · 11-Oct-2026
 * - Deslizar: arrastra la barra y ves una o la otra (como Fieldwire / OpenSpace).
 * - Encimar: una sobre otra con transparencia (para planos: lo que cambió "salta").
 */
import { useRef, useState } from "react";

type Img = { url: string; label: string };

export default function Comparar({ antes, ahora, modoInicial = "deslizar" }: { antes: Img; ahora: Img; modoInicial?: "deslizar" | "encimar" }) {
  const [modo, setModo] = useState(modoInicial); const [pos, setPos] = useState(50);
  const caja = useRef<HTMLDivElement>(null);
  const mover = (clientX: number) => { const r = caja.current?.getBoundingClientRect(); if (!r) return; setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100))); };
  return (
    <div>
      <div className="mb-2 grid grid-cols-2 gap-1 rounded-xl bg-[var(--d-card-2)] p-1">
        {(["deslizar", "encimar"] as const).map(m => <button key={m} type="button" onClick={() => setModo(m)} className={`rounded-lg py-2 text-[13px] font-bold ${modo === m ? "bg-[var(--d-card)] text-[var(--d-text)] shadow-sm" : "text-[var(--d-muted)]"}`}>{m === "deslizar" ? "Deslizar" : "Encimar"}</button>)}
      </div>
      <div ref={caja} className="relative w-full overflow-hidden rounded-2xl bg-black select-none touch-none"
        onPointerDown={e => { if (modo !== "deslizar") return; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); mover(e.clientX); }}
        onPointerMove={e => { if (modo === "deslizar" && e.buttons) mover(e.clientX); }}>
        <img src={ahora.url} alt={ahora.label} className="block w-full h-auto" draggable={false} />
        {modo === "deslizar" ? (
          <>
            <img src={antes.url} alt={antes.label} className="absolute inset-0 w-full h-full object-cover" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} draggable={false} />
            <div className="absolute top-0 bottom-0 w-[3px] bg-white" style={{ left: `calc(${pos}% - 1.5px)` }}>
              <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-1/2 w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center text-[#0f172a] text-sm font-bold">⇆</span>
            </div>
          </>
        ) : <img src={antes.url} alt={antes.label} className="absolute inset-0 w-full h-full object-cover mix-blend-normal" style={{ opacity: (100 - pos) / 100 }} draggable={false} />}
        <span className="absolute left-2 top-2 rounded-md bg-[#0f172a] px-2 py-1 text-[11px] font-bold text-white">{antes.label}</span>
        <span className="absolute right-2 top-2 rounded-md bg-[#0073ea] px-2 py-1 text-[11px] font-bold text-white">{ahora.label}</span>
      </div>
      <input type="range" min={0} max={100} value={pos} onChange={e => setPos(Number(e.target.value))} aria-label={modo === "deslizar" ? "Mover la división" : "Transparencia"} className="mt-3 w-full accent-[#0073ea]" />
      <div className="flex justify-between text-[11.5px] font-semibold text-[var(--d-muted)]"><span>{antes.label}</span><span>{ahora.label}</span></div>
    </div>
  );
}
