/** Doménica 27 · íconos propios (dos tonos, esquinas suaves). Activo = relleno de color · 11-Oct-2026 */
type P = { activo?: boolean; className?: string };
const base = (activo?: boolean) => ({ stroke: activo ? "#0073ea" : "currentColor", fill: activo ? "rgba(0,115,234,.18)" : "none" });

export function IcoInicio({ activo, className = "w-6 h-6" }: P) {
  const c = base(activo);
  return <svg viewBox="0 0 24 24" className={className} fill="none" strokeWidth={activo ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3.5 10.6 12 4l8.5 6.6V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19z" stroke={c.stroke} fill={c.fill} />
    <path d="M9.5 20.5v-5.2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v5.2" stroke={c.stroke} />
    {activo && <circle cx="17.5" cy="7" r="2" fill="#fdab3d" stroke="none" />}
  </svg>;
}
export function IcoSolicitudes({ activo, className = "w-6 h-6" }: P) {
  const c = base(activo);
  return <svg viewBox="0 0 24 24" className={className} fill="none" strokeWidth={activo ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M7 3.5h7.5L19 8v11a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5z" stroke={c.stroke} fill={c.fill} />
    <path d="M14.5 3.5V8H19" stroke={c.stroke} />
    <path d="M9 12.5h6M9 16h4" stroke={activo ? "#0073ea" : "currentColor"} />
  </svg>;
}
export function IcoActividades({ activo, className = "w-6 h-6" }: P) {
  const c = base(activo);
  return <svg viewBox="0 0 24 24" className={className} fill="none" strokeWidth={activo ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="4" y="4" width="16" height="16" rx="4.5" stroke={c.stroke} fill={c.fill} />
    <path d="m8 12.2 2.6 2.6L16 9.4" stroke={activo ? "#00a35c" : "currentColor"} strokeWidth={activo ? 2.6 : 2} />
  </svg>;
}
export function IcoMas({ activo, className = "w-6 h-6" }: P) {
  const c = base(activo);
  return <svg viewBox="0 0 24 24" className={className} fill="none" strokeWidth={activo ? 2.2 : 1.8} strokeLinejoin="round" aria-hidden>
    <rect x="4" y="4" width="6.5" height="6.5" rx="2" stroke={c.stroke} fill={c.fill} /><rect x="13.5" y="4" width="6.5" height="6.5" rx="2" stroke={c.stroke} />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="2" stroke={c.stroke} /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="3.25" stroke={c.stroke} fill={activo ? "#fdab3d" : "none"} />
  </svg>;
}
export function IcoMasGrande({ className = "w-8 h-8" }: P) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden><path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.8" strokeLinecap="round" /><circle cx="18.6" cy="5.4" r="1.6" fill="#fdab3d" /></svg>;
}
