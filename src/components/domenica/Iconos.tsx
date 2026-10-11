/** Doménica 27 · íconos de la barra de abajo (11-Oct-2026 v2): inactivo = contorno; activo = glifo sólido azul con calados (mismo idioma que los íconos de obra) */
type P = { activo?: boolean; className?: string };
const AZ = "#0073ea";
const lin = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const cal = { fill: "none", stroke: "#fff", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function IcoInicio({ activo, className = "w-6 h-6" }: P) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden>{activo ? <>
    <path d="M3 10.4 12 3.4l9 7V19.4a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 19.4z" fill={AZ} />
    <path d="M9.4 21v-5.4a1 1 0 0 1 1-1h3.2a1 1 0 0 1 1 1V21" {...cal} />
  </> : <>
    <path d="M3.5 10.6 12 4l8.5 6.6V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19z" {...lin} />
    <path d="M9.5 20.5v-5.2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v5.2" {...lin} />
  </>}</svg>;
}
export function IcoSolicitudes({ activo, className = "w-6 h-6" }: P) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden>{activo ? <>
    <path d="M6.6 2.8h8.2L19.6 7.6v12a2 2 0 0 1-2 2H6.6a2 2 0 0 1-2-2V4.8a2 2 0 0 1 2-2z" fill={AZ} />
    <path d="M14.6 3v4.8h4.8M8.4 12.4h7M8.4 16h4.6" {...cal} />
  </> : <>
    <path d="M7 3.5h7.5L19 8v11a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5z" {...lin} />
    <path d="M14.5 3.5V8H19M9 12.5h6M9 16h4" {...lin} />
  </>}</svg>;
}
export function IcoActividades({ activo, className = "w-6 h-6" }: P) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden>{activo ? <>
    <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.6" fill={AZ} />
    <path d="m7.8 12.2 2.8 2.8 5.6-5.8" {...cal} strokeWidth={2.2} />
  </> : <>
    <rect x="4" y="4" width="16" height="16" rx="4.5" {...lin} />
    <path d="m8 12.2 2.6 2.6L16 9.4" {...lin} strokeWidth={2} />
  </>}</svg>;
}
export function IcoMas({ activo, className = "w-6 h-6" }: P) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden>{activo ? <>
    <rect x="3.4" y="3.4" width="7.4" height="7.4" rx="2.2" fill={AZ} /><rect x="13.2" y="3.4" width="7.4" height="7.4" rx="2.2" fill={AZ} />
    <rect x="3.4" y="13.2" width="7.4" height="7.4" rx="2.2" fill={AZ} /><rect x="13.2" y="13.2" width="7.4" height="7.4" rx="3.7" fill={AZ} />
  </> : <>
    <rect x="4" y="4" width="6.5" height="6.5" rx="2" {...lin} /><rect x="13.5" y="4" width="6.5" height="6.5" rx="2" {...lin} />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="2" {...lin} /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="3.25" {...lin} />
  </>}</svg>;
}
export function IcoMasGrande({ className = "w-8 h-8" }: P) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden><path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.8" strokeLinecap="round" /></svg>;
}
