/** Doménica 27 · pantallas vacías amables: dibujo + qué significa + qué hacer · 11-Oct-2026 */
import Link from "next/link";

const DIBUJOS = {
  listo: (
    <svg viewBox="0 0 120 120" className="w-28 h-28" aria-hidden>
      <circle cx="60" cy="60" r="52" fill="#00c875" opacity=".12" /><circle cx="60" cy="60" r="38" fill="#00c875" opacity=".18" />
      <path d="M42 61l12 12 25-27" fill="none" stroke="#00a35c" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="96" cy="26" r="5" fill="#fdab3d" /><circle cx="22" cy="34" r="3.5" fill="#a25ddc" /><circle cx="100" cy="88" r="3" fill="#579bfc" />
    </svg>),
  caja: (
    <svg viewBox="0 0 120 120" className="w-28 h-28" aria-hidden>
      <circle cx="60" cy="60" r="52" fill="#579bfc" opacity=".12" />
      <path d="M30 48l30-14 30 14v32l-30 14-30-14z" fill="#fff" stroke="#579bfc" strokeWidth="4" strokeLinejoin="round" />
      <path d="M30 48l30 14 30-14M60 62v32" fill="none" stroke="#579bfc" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="98" cy="30" r="4" fill="#fdab3d" />
    </svg>),
  buscar: (
    <svg viewBox="0 0 120 120" className="w-28 h-28" aria-hidden>
      <circle cx="60" cy="60" r="52" fill="#a25ddc" opacity=".12" />
      <circle cx="54" cy="54" r="20" fill="#fff" stroke="#a25ddc" strokeWidth="5" /><path d="M69 69l16 16" stroke="#a25ddc" strokeWidth="7" strokeLinecap="round" />
    </svg>),
  lista: (
    <svg viewBox="0 0 120 120" className="w-28 h-28" aria-hidden>
      <circle cx="60" cy="60" r="52" fill="#fdab3d" opacity=".14" />
      <rect x="36" y="28" width="48" height="64" rx="8" fill="#fff" stroke="#fdab3d" strokeWidth="4" />
      <path d="M46 46h28M46 58h28M46 70h18" stroke="#fdab3d" strokeWidth="4" strokeLinecap="round" />
    </svg>),
};

export function Vacio({ dibujo = "listo", titulo, texto, accion }: { dibujo?: keyof typeof DIBUJOS; titulo: string; texto?: string; accion?: { label: string; href?: string; onClick?: () => void } }) {
  const btn = "mt-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#0073ea] to-[#579bfc] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_22px_-10px_#0073ea]";
  return (
    <div className="dom-in flex flex-col items-center text-center px-6 py-10">
      {DIBUJOS[dibujo]}
      <div className="mt-3 text-[16px] font-bold text-[var(--d-text)]">{titulo}</div>
      {texto && <div className="mt-1 max-w-xs text-[13px] text-[var(--d-muted)]">{texto}</div>}
      {accion && (accion.href ? <Link href={accion.href} className={btn}>{accion.label}</Link> : <button type="button" onClick={accion.onClick} className={btn}>{accion.label}</button>)}
    </div>
  );
}
