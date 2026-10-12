"use client";
/**
 * Guía de bienvenida de Doménica 27 (11-Oct-2026)
 * Sale sola la primera vez que entras a Inicio en el teléfono. Se vuelve a ver con el botón "Ayuda" de arriba.
 * 4 pasos, de lo general a lo particular. Letras grandes, una idea por paso.
 */
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { IcoInicio, IcoSolicitudes, IcoActividades, IcoMas } from "@/components/domenica/Iconos";
import { IcoMicro, IcoSaco, IcoTarea, IcoCamion } from "@/components/domenica/IconosObra";

const CLAVE = "dom:guia-v1";
type Paso = { titulo: string; texto: string; dibujo: React.ReactNode };

const fila = (Icon: React.ComponentType<{ activo?: boolean; className?: string }>, t: string, d: string) => (
  <div className="flex items-center gap-3 rounded-2xl bg-[var(--d-card-2)] px-3 py-2.5">
    <span className="shrink-0 w-10 h-10 rounded-xl bg-[var(--d-card)] flex items-center justify-center text-[var(--d-nav-on)]"><Icon activo className="w-6 h-6" /></span>
    <span className="text-left"><b className="block text-[16px] text-[var(--d-text)]">{t}</b><span className="block text-[14px] text-[var(--d-muted)]">{d}</span></span>
  </div>);
const ficha = (Icon: React.ComponentType<{ className?: string; color?: string; fondo?: string }>, bg: string, t: string) => (
  <div className="rounded-2xl px-3 py-3 text-white flex flex-col items-center gap-1.5" style={{ background: bg }}><Icon className="w-8 h-8" color="#fff" fondo={bg} /><span className="text-[14px] font-bold leading-tight text-center">{t}</span></div>);

const PASOS: Paso[] = [
  { titulo: "Hola, soy Doménica", texto: "Te ayudo a llevar tu trabajo del día: lo que te toca, lo que pides y lo que llega. Todo se hace con uno o dos toques.",
    dibujo: <div className="mx-auto w-24 h-24 rounded-[28px] bg-[#6d35c9] flex items-center justify-center"><IcoMicro className="w-12 h-12" color="#fff" fondo="#6d35c9" /></div> },
  { titulo: "Abajo están tus 4 lugares", texto: "Siempre en el mismo sitio. Si te pierdes, toca Inicio.",
    dibujo: <div className="space-y-2">{fila(IcoInicio, "Inicio", "Lo que te toca hoy")}{fila(IcoSolicitudes, "Solicitudes", "Lo que pediste y su avance")}{fila(IcoActividades, "Actividades", "Tus pendientes y encargos")}{fila(IcoMas, "Más", "Obras, equipo, ajustes y ayuda")}</div> },
  { titulo: "El botón azul + Nuevo", texto: "Está en medio, abajo. Con él creas cualquier cosa.",
    dibujo: <div className="grid grid-cols-3 gap-2">{ficha(IcoSaco, "#0073ea", "Requisición")}{ficha(IcoTarea, "#b85507", "Tarea")}{ficha(IcoCamion, "#00873f", "Registrar entrega")}</div> },
  { titulo: "O simplemente háblale", texto: "Toca “Habla con Doménica” y dile lo que necesitas, como a una persona: “pide 10 bultos de cemento para Tanque”.",
    dibujo: <div className="rounded-2xl bg-[#6d35c9] px-4 py-4 text-white text-left"><b className="block text-[17px]">Habla con Doménica</b><span className="block text-[14px] text-white/90">Ella arma la solicitud y tú solo confirmas.</span></div> },
];

export default function Guia() {
  const path = usePathname() || "";
  const [abierta, setAbierta] = useState(false); const [i, setI] = useState(0);
  useEffect(() => {
    const abrir = () => { setI(0); setAbierta(true); };
    window.addEventListener("dom:guia", abrir);
    try { if (path === "/dashboard/campo" && !localStorage.getItem(CLAVE)) abrir(); } catch { /* */ }
    return () => window.removeEventListener("dom:guia", abrir);
  }, [path]);
  if (!abierta) return null;
  const cerrar = () => { setAbierta(false); try { localStorage.setItem(CLAVE, "1"); } catch { /* */ } };
  const p = PASOS[i]; const ultimo = i === PASOS.length - 1;
  return (
    <div role="dialog" aria-modal="true" aria-label="Cómo se usa Doménica" className="aria-sheet fixed inset-0 z-[95] flex items-end justify-center bg-black/55" onClick={cerrar}>
      <div onClick={e => e.stopPropagation()} className="dom-in w-full max-w-md rounded-t-[28px] bg-[var(--d-surface)] px-5 pt-5" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 18px)" }}>
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5" aria-label={`Paso ${i + 1} de ${PASOS.length}`}>{PASOS.map((_, k) => <span key={k} className={`h-2 rounded-full transition-all ${k === i ? "w-6 bg-[#0073ea]" : "w-2 bg-[var(--d-border)]"}`} />)}</div>
          <button type="button" onClick={cerrar} className="h-11 px-3 text-[15px] font-semibold text-[var(--d-muted)]">Saltar</button>
        </div>
        <div className="mt-3">{p.dibujo}</div>
        <h2 className="mt-5 text-[24px] font-bold leading-tight text-[var(--d-text)]">{p.titulo}</h2>
        <p className="mt-2 text-[17px] leading-snug text-[var(--d-text-2)]">{p.texto}</p>
        <div className="mt-6 flex gap-2">
          {i > 0 && <button type="button" onClick={() => setI(i - 1)} className="h-14 px-5 rounded-2xl bg-[var(--d-card-2)] text-[17px] font-bold text-[var(--d-text)]">Atrás</button>}
          <button type="button" onClick={() => ultimo ? cerrar() : setI(i + 1)} className="flex-1 h-14 rounded-2xl bg-[#0073ea] text-white text-[18px] font-bold">{ultimo ? "¡Listo, empezar!" : "Siguiente"}</button>
        </div>
        <p className="mt-3 text-center text-[13.5px] text-[var(--d-muted)]">Puedes volver a verla con el botón “Ayuda” de arriba.</p>
      </div>
    </div>
  );
}
