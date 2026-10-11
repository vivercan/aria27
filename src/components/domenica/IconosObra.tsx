/**
 * Doménica 27 · íconos de obra propios (11-Oct-2026)
 * Dibujados para construcción (casco, grúa, saco, camión, plano, sello…), no la librería genérica.
 * Estilo: trazo 1.7 redondeado + una sola zona de relleno suave del mismo color (dos tonos).
 * Uso: <IcoCasco className="w-6 h-6" color="#ff642e" />  ·  <Ficha ico={IcoCasco} color="#ff642e" />
 */
import type { ComponentType } from "react";

export type IcoProps = { className?: string; color?: string };
export type Ico = ComponentType<IcoProps>;

function S({ className = "w-6 h-6", color = "currentColor", children }: IcoProps & { children: (c: string, f: string) => React.ReactNode }) {
  const fill = color === "currentColor" ? "currentColor" : color;
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children(color, fill)}
    </svg>
  );
}
const suave = { fillOpacity: 0.3 } as const;

/** Casco de obra — Obras / alta de obra */
export const IcoCasco: Ico = p => <S {...p}>{(_, f) => <>
  <path d="M4.5 16C4.5 11.2 7.8 7.6 12 7.6s7.5 3.6 7.5 8.4z" fill={f} {...suave} />
  <path d="M10.4 7.8V6.2a1.6 1.6 0 0 1 3.2 0v1.6" />
  <path d="M8.6 9.3 9.3 16M15.4 9.3 14.7 16" />
  <path d="M2.5 16h19v1.4a1.6 1.6 0 0 1-1.6 1.6H4.1a1.6 1.6 0 0 1-1.6-1.6z" />
</>}</S>;

/** Edificio con grúa — Mis obras */
export const IcoObra: Ico = p => <S {...p}>{(_, f) => <>
  <path d="M4 20.5V11l5-2.5v12" fill={f} {...suave} />
  <path d="M9 20.5V8.5h6v12" />
  <path d="M15 5V3.5M11.5 3.5H21M17 3.5l3 3.2M18 3.5v4" />
  <path d="M6.5 13.5v.01M6.5 16.5v.01M11.5 11.5h1M11.5 14.5h1M11.5 17.5h1" />
  <path d="M2.5 20.5h19" />
</>}</S>;

/** Camión de entrega — Por recibir / Registrar entrega */
export const IcoCamion: Ico = p => <S {...p}>{(_, f) => <>
  <path d="M2.5 6.5h11v10h-11z" fill={f} {...suave} />
  <path d="M13.5 9.5h4.2l3 3.6v3.4h-7.2" />
  <path d="M2.5 16.5h1.8M9.8 16.5h5.4M20.7 16.5h.8" />
  <circle cx="7" cy="17.3" r="1.9" /><circle cx="17.5" cy="17.3" r="1.9" />
  <path d="M6 10l1.6 1.6L10.5 8.7" />
</>}</S>;

/** Saco de cemento — Pedir material */
export const IcoSaco: Ico = p => <S {...p}>{(_, f) => <>
  <path d="M6.2 5.5h11.6l1.2 13.3a1.5 1.5 0 0 1-1.5 1.7H6.5A1.5 1.5 0 0 1 5 18.8z" fill={f} {...suave} />
  <path d="M6.2 5.5 7.5 3.5M17.8 5.5l-1.3-2M7.5 3.5h9" />
  <path d="M9 11h6M9.8 14h4.4" />
</>}</S>;

/** Lista con palomita — Actividad */
export const IcoTarea: Ico = p => <S {...p}>{(_, f) => <>
  <rect x="4" y="3.5" width="16" height="17" rx="3" fill={f} {...suave} />
  <path d="m7.5 9 1.4 1.4L11.5 8M7.5 15l1.4 1.4 2.6-2.4" />
  <path d="M14 9.2h3M14 15.2h3" />
</>}</S>;

/** Calendario de obra (con día marcado) */
export const IcoCalendario: Ico = p => <S {...p}>{(_, f) => <>
  <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
  <path d="M3.5 9.5h17" />
  <path d="M3.5 9.5V8a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3v1.5z" fill={f} {...suave} />
  <path d="M8 3v3.5M16 3v3.5" />
  <rect x="13" y="13" width="4" height="4" rx="1" fill={f} fillOpacity={0.55} stroke="none" />
</>}</S>;

/** Plano enrollado — Planos */
export const IcoPlano: Ico = p => <S {...p}>{(_, f) => <>
  <path d="M6 4.5h13.5v15H6" fill={f} {...suave} />
  <path d="M6 4.5a2.5 2.5 0 0 0-2.5 2.5v12a2.5 2.5 0 0 1 2.5-2.5h0V4.5" />
  <path d="M3.5 19a2.5 2.5 0 0 0 2.5 2.5h13.5v-2" />
  <path d="M9.5 8.5h6.5v7H9.5zM12.5 8.5v3h3.5" />
</>}</S>;

/** Tabla con nivel — Revisiones de calidad/seguridad */
export const IcoRevision: Ico = p => <S {...p}>{(_, f) => <>
  <rect x="4.5" y="4" width="15" height="17" rx="2.5" fill={f} {...suave} />
  <path d="M9 4V3h6v1M9 4.5h6" />
  <path d="m8 13 2.4 2.4L16 9.8" />
</>}</S>;

/** Bitácora (libreta con lápiz) */
export const IcoBitacora: Ico = p => <S {...p}>{(_, f) => <>
  <path d="M5 3.5h10.5a2 2 0 0 1 2 2v15H7a2 2 0 0 1-2-2z" fill={f} {...suave} />
  <path d="M5 18.5a2 2 0 0 1 2-2h10.5" />
  <path d="M8.5 7.5h5.5M8.5 10.5h3.5" />
  <path d="m20.5 9-4.6 7.8-1.6.6.1-1.7L19 8z" />
</>}</S>;

/** Sello de autorizado — Por autorizar */
export const IcoSello: Ico = p => <S {...p}>{(_, f) => <>
  <path d="M9.5 3.5h5l-.9 6.5h-3.2z" />
  <path d="M5 13a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v2H5z" fill={f} {...suave} />
  <path d="M4 18h16M6 21h12" />
</>}</S>;

/** Cámara de obra — foto / evidencia */
export const IcoCamara: Ico = p => <S {...p}>{(_, f) => <>
  <path d="M3.5 8.5a2 2 0 0 1 2-2h2.2l1.5-2.2h5.6l1.5 2.2h2.2a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" fill={f} {...suave} />
  <circle cx="12" cy="13" r="3.6" />
</>}</S>;

/** Escanear documento (esquinas + hoja) — escanear nota de remisión */
export const IcoEscanear: Ico = p => <S {...p}>{(_, f) => <>
  <path d="M3.5 8V5.5a2 2 0 0 1 2-2H8M16 3.5h2.5a2 2 0 0 1 2 2V8M20.5 16v2.5a2 2 0 0 1-2 2H16M8 20.5H5.5a2 2 0 0 1-2-2V16" />
  <rect x="7.5" y="6.5" width="9" height="11" rx="1.5" fill={f} {...suave} />
  <path d="M9.8 10h4.4M9.8 13h3" />
</>}</S>;

/** Micrófono — dictar */
export const IcoMicro: Ico = p => <S {...p}>{(_, f) => <>
  <rect x="8.5" y="3" width="7" height="11.5" rx="3.5" fill={f} {...suave} />
  <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" />
</>}</S>;

/** Pregúntale a Doménica: globo de diálogo con la "D" de la marca (no la chispa genérica de IA) */
export const IcoPregunta: Ico = p => <S {...p}>{(_, f) => <>
  <path d="M4 6.5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-6l-4.5 4v-4H7a3 3 0 0 1-3-3z" fill={f} {...suave} />
  <path d="M10 7.5v5.5h1.6a2.75 2.75 0 0 0 0-5.5z" />
</>}</S>;

/** Equipo (dos personas) */
export const IcoEquipo: Ico = p => <S {...p}>{(_, f) => <>
  <circle cx="9" cy="8" r="3.2" />
  <path d="M3 20.5a6 6 0 0 1 12 0z" fill={f} {...suave} />
  <circle cx="17" cy="9" r="2.5" />
  <path d="M16.4 14.1a4.8 4.8 0 0 1 4.6 4.9" />
</>}</S>;

/** Proveedor (tienda/bodega) */
export const IcoBodega: Ico = p => <S {...p}>{(_, f) => <>
  <path d="M3.5 9.5 12 4l8.5 5.5v11h-17z" fill={f} {...suave} />
  <path d="M7.5 20.5v-7h9v7M7.5 16.5h9" />
</>}</S>;

/** Engranes de trabajo — Organizar / automatizaciones */
export const IcoOrganizar: Ico = p => <S {...p}>{(_, f) => <>
  <rect x="3.5" y="3.5" width="7" height="7" rx="2" fill={f} {...suave} />
  <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
  <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
  <path d="M17 13.5v7M13.5 17h7" />
</>}</S>;

/** Reloj con palomita — checadas / asistencia */
export const IcoChecada: Ico = p => <S {...p}>{(_, f) => <>
  <circle cx="11" cy="12" r="8" fill={f} {...suave} />
  <path d="M11 7.5V12l3 2" />
  <path d="m15.5 19 2 2 4-4.2" />
</>}</S>;

/** Sin señal (antena tachada) */
export const IcoSinSenal: Ico = p => <S {...p}>{() => <>
  <path d="M5 12.5a10 10 0 0 1 3-2M2 9a14 14 0 0 1 4.5-3M12 19.5h.01M9 16a5 5 0 0 1 4.5-1.2M15.5 10.6A10 10 0 0 1 19 12.5M17.5 6.3A14 14 0 0 1 22 9" />
  <path d="m3 3 18 18" />
</>}</S>;

/** Comparar (dos hojas desplazadas) — versiones de plano / fotos antes-después */
export const IcoComparar: Ico = p => <S {...p}>{(_, f) => <>
  <rect x="3.5" y="5" width="10" height="14" rx="2" fill={f} {...suave} />
  <rect x="10.5" y="3" width="10" height="14" rx="2" />
  <path d="M12 21h7.5a1 1 0 0 0 1-1v-1" />
</>}</S>;

/** Ficha: color SÓLIDO con el dibujo en blanco (estilo ajustes de iPhone / apps de obra 2026). Sin degradados ni pastel. */
export function Ficha({ ico: I, color, size = "md" }: { ico: Ico; color: string; size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "w-12 h-12 rounded-[14px]" : size === "sm" ? "w-8 h-8 rounded-[9px]" : "w-10 h-10 rounded-xl";
  const ic = size === "lg" ? "w-7 h-7" : size === "sm" ? "w-[18px] h-[18px]" : "w-6 h-6";
  return (
    <span className={`shrink-0 ${box} flex items-center justify-center`} style={{ background: color }}>
      <I className={ic} color="#ffffff" />
    </span>
  );
}
