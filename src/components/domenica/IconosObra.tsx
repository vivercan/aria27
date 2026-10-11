/**
 * Doménica 27 · íconos de obra propios, estilo "glifo relleno" (11-Oct-2026 v2)
 * Silueta sólida + detalles calados (no son contornos de librería). Hechos para construcción.
 * - Suelto: <IcoCasco className="w-6 h-6" color="#ff642e" />  (silueta del color, calados blancos)
 * - En ficha: <Ficha ico={IcoCasco} color="#ff642e" />        (cuadro de color, silueta blanca, calados del color)
 */
import type { ComponentType } from "react";

export type IcoProps = { className?: string; color?: string; fondo?: string };
export type Ico = ComponentType<IcoProps>;

function S({ className = "w-6 h-6", color = "currentColor", fondo = "#fff", children }: IcoProps & { children: (c: string, k: string) => React.ReactNode }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden>{children(color, fondo)}</svg>;
}
const linea = (k: string, w = 1.5) => ({ fill: "none", stroke: k, strokeWidth: w, strokeLinecap: "round" as const, strokeLinejoin: "round" as const });

/** Casco de obra */
export const IcoCasco: Ico = p => <S {...p}>{(c, k) => <>
  <path d="M3.6 15.6C3.6 10.4 7.4 6.6 12 6.6s8.4 3.8 8.4 9z" fill={c} />
  <rect x="10.4" y="4.4" width="3.2" height="5" rx="1.4" fill={c} />
  <path d="M8.4 9.4 9 15.4M15.6 9.4 15 15.4" {...linea(k, 1.4)} />
  <path d="M2 15.6h20v2.1a1.4 1.4 0 0 1-1.4 1.4H3.4A1.4 1.4 0 0 1 2 17.7z" fill={c} />
</>}</S>;

/** Edificio con grúa — obras */
export const IcoObra: Ico = p => <S {...p}>{(c, k) => <>
  <rect x="3" y="9" width="10" height="12" rx="1.2" fill={c} />
  <path d="M5.6 12h1.6M8.8 12h1.6M5.6 15h1.6M8.8 15h1.6" {...linea(k, 1.5)} />
  <path d="M7 21v-3h2v3" fill={k} />
  <path d="M16.5 21V4.5M11.5 4.5h10M20 4.5v3.5" {...linea(c, 2)} />
  <path d="M18.8 8h2.4v1.6a1.2 1.2 0 0 1-2.4 0z" fill={c} />
  <path d="M2 21h20" {...linea(c, 2)} />
</>}</S>;

/** Camión de entrega */
export const IcoCamion: Ico = p => <S {...p}>{(c, k) => <>
  <rect x="1.8" y="5.5" width="12.4" height="11" rx="1.6" fill={c} />
  <path d="M14.2 8.6h4.3l3.5 4.1v3.8h-7.8z" fill={c} />
  <path d="M15.8 10.2h2l1.8 2.1h-3.8z" fill={k} />
  <path d="m5.2 10.8 1.7 1.7 3.4-3.4" {...linea(k, 1.7)} />
  <circle cx="6.5" cy="17.6" r="2.4" fill={c} stroke={k} strokeWidth="1.3" /><circle cx="17.6" cy="17.6" r="2.4" fill={c} stroke={k} strokeWidth="1.3" />
</>}</S>;

/** Saco de cemento — pedir material */
export const IcoSaco: Ico = p => <S {...p}>{(c, k) => <>
  <path d="M7.2 6.6 8.3 3.4h7.4l1.1 3.2z" fill={c} />
  <path d="M5.8 6.6h12.4l1.5 12.9a1.6 1.6 0 0 1-1.6 1.8H5.9a1.6 1.6 0 0 1-1.6-1.8z" fill={c} />
  <rect x="8.3" y="10.6" width="7.4" height="5.2" rx="1.2" fill={k} />
  <path d="M10 13.2h4" {...linea(c, 1.5)} />
</>}</S>;

/** Tabla con palomitas — actividad */
export const IcoTarea: Ico = p => <S {...p}>{(c, k) => <>
  <rect x="4" y="4" width="16" height="17.5" rx="2.6" fill={c} />
  <rect x="8.5" y="2.4" width="7" height="3.6" rx="1.4" fill={c} stroke={k} strokeWidth="1.3" />
  <path d="m7.6 11 1.6 1.6 2.8-2.8M7.6 16.4l1.6 1.6 2.8-2.8M14 11.2h3M14 16.6h3" {...linea(k, 1.6)} />
</>}</S>;

/** Calendario */
export const IcoCalendario: Ico = p => <S {...p}>{(c, k) => <>
  <rect x="3" y="4.6" width="18" height="16.6" rx="3" fill={c} />
  <path d="M8 2.8v3.6M16 2.8v3.6" {...linea(k, 2.2)} />
  <path d="M8 2.8v3.2M16 2.8v3.2" {...linea(c, 1.4)} />
  <path d="M3 9.6h18" {...linea(k, 1.4)} />
  <rect x="6.3" y="12.2" width="2.6" height="2.4" rx=".6" fill={k} /><rect x="10.7" y="12.2" width="2.6" height="2.4" rx=".6" fill={k} />
  <rect x="15.1" y="12.2" width="2.6" height="2.4" rx=".6" fill={k} /><rect x="6.3" y="16.2" width="2.6" height="2.4" rx=".6" fill={k} />
  <rect x="10.7" y="16.2" width="2.6" height="2.4" rx=".6" fill={k} opacity=".55" />
</>}</S>;

/** Plano enrollado */
export const IcoPlano: Ico = p => <S {...p}>{(c, k) => <>
  <rect x="6" y="4" width="15" height="16" rx="1.6" fill={c} />
  <path d="M2.6 6.6a2.6 2.6 0 0 1 5.2 0v12.6a2.6 2.6 0 0 0-5.2 0z" fill={c} stroke={k} strokeWidth="1.2" />
  <path d="M10.4 8h7.2v7.6h-7.2zM14 8v3.8h3.6" {...linea(k, 1.5)} />
</>}</S>;

/** Tabla con nivel — revisiones de calidad/seguridad */
export const IcoRevision: Ico = p => <S {...p}>{(c, k) => <>
  <rect x="4" y="4" width="16" height="17.5" rx="2.6" fill={c} />
  <rect x="8.5" y="2.4" width="7" height="3.6" rx="1.4" fill={c} stroke={k} strokeWidth="1.3" />
  <path d="m7.8 13.4 2.8 2.8 5.6-6" {...linea(k, 2.2)} />
</>}</S>;

/** Bitácora (libreta con lápiz) */
export const IcoBitacora: Ico = p => <S {...p}>{(c, k) => <>
  <rect x="4" y="3" width="13" height="18.2" rx="2" fill={c} />
  <path d="M6.6 3v18.2" {...linea(k, 1.2)} />
  <path d="M9.4 8h4.8M9.4 11h3.4" {...linea(k, 1.5)} />
  <path d="m20.6 8.4-7.4 7.4-2.9.9.9-2.9 7.4-7.4z" fill={c} stroke={k} strokeWidth="1.3" strokeLinejoin="round" />
</>}</S>;

/** Sello de autorizado */
export const IcoSello: Ico = p => <S {...p}>{(c, k) => <>
  <path d="M9.2 2.6h5.6a1 1 0 0 1 1 1.1l-.9 6.3H9.1l-.9-6.3a1 1 0 0 1 1-1.1z" fill={c} />
  <rect x="4.2" y="10" width="15.6" height="5.6" rx="2" fill={c} />
  <path d="M6.6 12.8h10.8" {...linea(k, 1.3)} />
  <rect x="3" y="17.4" width="18" height="2.4" rx="1.2" fill={c} />
  <path d="M5.5 21.6h13" {...linea(c, 1.4)} />
</>}</S>;

/** Cámara de obra */
export const IcoCamara: Ico = p => <S {...p}>{(c, k) => <>
  <path d="M3 8.6a2.2 2.2 0 0 1 2.2-2.2h2.3l1.6-2.3h5.8l1.6 2.3h2.3A2.2 2.2 0 0 1 21 8.6v9.6a2.2 2.2 0 0 1-2.2 2.2H5.2A2.2 2.2 0 0 1 3 18.2z" fill={c} />
  <circle cx="12" cy="13.2" r="4.2" fill={k} /><circle cx="12" cy="13.2" r="2.4" fill={c} />
  <circle cx="17.8" cy="9.4" r=".9" fill={k} />
</>}</S>;

/** Escanear documento */
export const IcoEscanear: Ico = p => <S {...p}>{(c, k) => <>
  <path d="M3 8V5.4A2.4 2.4 0 0 1 5.4 3H8M16 3h2.6A2.4 2.4 0 0 1 21 5.4V8M21 16v2.6a2.4 2.4 0 0 1-2.4 2.4H16M8 21H5.4A2.4 2.4 0 0 1 3 18.6V16" {...linea(c, 2)} />
  <rect x="7" y="6.2" width="10" height="11.6" rx="1.6" fill={c} />
  <path d="M9.4 9.6h5.2M9.4 12h5.2M9.4 14.4h3.2" {...linea(k, 1.3)} />
</>}</S>;

/** Micrófono */
export const IcoMicro: Ico = p => <S {...p}>{(c, k) => <>
  <rect x="8.2" y="2.4" width="7.6" height="12.6" rx="3.8" fill={c} />
  <path d="M10.6 6.4h2.8M10.6 9h2.8" {...linea(k, 1.3)} />
  <path d="M5.4 11.4a6.6 6.6 0 0 0 13.2 0M12 18v3.2M8.8 21.4h6.4" {...linea(c, 2)} />
</>}</S>;

/** Pregúntale a Doménica (globo con la D de la marca) */
export const IcoPregunta: Ico = p => <S {...p}>{(c, k) => <>
  <path d="M3.4 6.4a3 3 0 0 1 3-3h11.2a3 3 0 0 1 3 3v7.8a3 3 0 0 1-3 3h-5.8l-4.6 3.9v-3.9h-.8a3 3 0 0 1-3-3z" fill={c} />
  <path d="M9.6 7v6.6h1.8a3.3 3.3 0 0 0 0-6.6z" {...linea(k, 1.8)} />
</>}</S>;

/** Equipo (dos personas) */
export const IcoEquipo: Ico = p => <S {...p}>{(c, k) => <>
  <circle cx="16.6" cy="8.2" r="2.8" fill={c} />
  <path d="M12.6 20.6a4.4 4.4 0 0 1 8.8 0z" fill={c} />
  <circle cx="9" cy="7.6" r="3.6" fill={c} stroke={k} strokeWidth="1.3" />
  <path d="M2.6 21a6.4 6.4 0 0 1 12.8 0z" fill={c} stroke={k} strokeWidth="1.3" strokeLinejoin="round" />
</>}</S>;

/** Bodega — proveedores / compras */
export const IcoBodega: Ico = p => <S {...p}>{(c, k) => <>
  <path d="M2.4 9.8 12 3.6l9.6 6.2v10.4a1 1 0 0 1-1 1H3.4a1 1 0 0 1-1-1z" fill={c} />
  <rect x="7" y="12" width="10" height="9.2" rx=".8" fill={k} />
  <path d="M7 14.8h10M7 17.6h10" {...linea(c, 1.3)} />
</>}</S>;

/** Organizar el trabajo (tablero) */
export const IcoOrganizar: Ico = p => <S {...p}>{(c, k) => <>
  <rect x="3" y="3" width="8" height="8" rx="2.2" fill={c} /><rect x="13" y="3" width="8" height="8" rx="2.2" fill={c} />
  <rect x="3" y="13" width="8" height="8" rx="2.2" fill={c} />
  <rect x="13" y="13" width="8" height="8" rx="2.2" fill={c} />
  <path d="M17 15.2v3.6M15.2 17h3.6" {...linea(k, 1.6)} />
</>}</S>;

/** Reloj checador */
export const IcoChecada: Ico = p => <S {...p}>{(c, k) => <>
  <circle cx="11" cy="12" r="8.6" fill={c} />
  <path d="M11 7.4V12l3 2" {...linea(k, 1.8)} />
  <circle cx="18" cy="18" r="4" fill={c} stroke={k} strokeWidth="1.3" />
  <path d="m16.3 18 1.2 1.2 2.2-2.3" {...linea(k, 1.5)} />
</>}</S>;

/** Sin señal */
export const IcoSinSenal: Ico = p => <S {...p}>{c => <>
  <path d="M5 12.5a10 10 0 0 1 3-2M2 9a14 14 0 0 1 4.5-3M12 19.5h.01M9 16a5 5 0 0 1 4.5-1.2M15.5 10.6A10 10 0 0 1 19 12.5M17.5 6.3A14 14 0 0 1 22 9" {...linea(c, 1.8)} />
  <path d="m3 3 18 18" {...linea(c, 1.8)} />
</>}</S>;

/** Comparar (dos hojas) */
export const IcoComparar: Ico = p => <S {...p}>{(c, k) => <>
  <rect x="10" y="3" width="11" height="14.5" rx="2" fill={c} />
  <rect x="3" y="6.5" width="11" height="14.5" rx="2" fill={c} stroke={k} strokeWidth="1.4" />
  <path d="M6 11h5M6 14h5M6 17h3" {...linea(k, 1.3)} />
</>}</S>;

/** Ficha: cuadro de color SÓLIDO con la silueta en blanco y los calados del mismo color */
export function Ficha({ ico: I, color, size = "md" }: { ico: Ico; color: string; size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "w-12 h-12 rounded-[14px]" : size === "sm" ? "w-8 h-8 rounded-[9px]" : "w-10 h-10 rounded-xl";
  const ic = size === "lg" ? "w-7 h-7" : size === "sm" ? "w-[18px] h-[18px]" : "w-6 h-6";
  return (
    <span className={`shrink-0 ${box} flex items-center justify-center`} style={{ background: color }}>
      <I className={ic} color="#ffffff" fondo={color} />
    </span>
  );
}
