/** Doménica 27 · tarjetas "fantasma" mientras carga (se siente más rápido que un círculo girando) · 11-Oct-2026 */
export function Esqueleto({ filas = 4, alto = 72, className = "" }: { filas?: number; alto?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-busy="true" aria-label="Cargando">
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="dom-card rounded-2xl p-3.5 flex items-center gap-3" style={{ height: alto, opacity: 1 - i * 0.12 }}>
          <div className="dom-shimmer w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2"><div className="dom-shimmer h-3 rounded-full w-3/4" /><div className="dom-shimmer h-2.5 rounded-full w-1/2" /></div>
        </div>))}
    </div>
  );
}
export function EsqueletoKpis({ n = 3 }: { n?: number }) {
  return <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${n}, minmax(0,1fr))` }}>{Array.from({ length: n }).map((_, i) => <div key={i} className="dom-card rounded-2xl p-3 h-[86px]"><div className="dom-shimmer h-6 w-10 rounded-lg" /><div className="dom-shimmer mt-3 h-2.5 w-16 rounded-full" /></div>)}</div>;
}
