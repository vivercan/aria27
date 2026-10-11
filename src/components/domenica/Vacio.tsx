/** Doménica 27 · pantallas vacías amables: ícono de color sólido + qué significa + qué hacer · 11-Oct-2026 (sin círculos difuminados ni confeti) */
import Link from "next/link";
import { IcoTarea, IcoSaco, type Ico } from "@/components/domenica/IconosObra";

const Palomita: Ico = ({ className, color = "#fff" }) => <svg viewBox="0 0 24 24" className={className} fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
const Lupa: Ico = ({ className, color = "#fff" }) => <svg viewBox="0 0 24 24" className={className} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" aria-hidden><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>;
const DIBUJOS: Record<string, { ico: Ico; color: string }> = {
  listo: { ico: Palomita, color: "#3cde01" }, caja: { ico: IcoSaco, color: "#0073ea" }, buscar: { ico: Lupa, color: "#7e3bdd" }, lista: { ico: IcoTarea, color: "#e8760a" },
};

export function Vacio({ dibujo = "listo", ico, color, titulo, texto, accion }: { dibujo?: keyof typeof DIBUJOS; ico?: Ico; color?: string; titulo: string; texto?: string; accion?: { label: string; href?: string; onClick?: () => void } }) {
  const d = DIBUJOS[dibujo] || DIBUJOS.listo; const I = ico || d.ico; const c = color || d.color;
  const btn = "mt-5 inline-flex items-center justify-center rounded-xl bg-[#0073ea] px-5 py-3 text-[15px] font-bold text-white";
  return (
    <div className="dom-in flex flex-col items-center text-center px-6 py-10">
      <span className="w-[72px] h-[72px] rounded-[22px] flex items-center justify-center" style={{ background: c }}><I className="w-10 h-10" color="#fff" fondo={c} /></span>
      <div className="mt-4 text-[17px] font-bold text-[var(--d-text)]">{titulo}</div>
      {texto && <div className="mt-1 max-w-xs text-[13.5px] text-[var(--d-muted)]">{texto}</div>}
      {accion && (accion.href ? <Link href={accion.href} className={btn}>{accion.label}</Link> : <button type="button" onClick={accion.onClick} className={btn}>{accion.label}</button>)}
    </div>
  );
}
