/**
 * Celebracion al terminar una actividad (10-Oct-2026): confeti ligero en canvas + vibracion corta.
 * Sin dependencias. Respeta "reducir movimiento" del sistema.
 */
export function celebrar(origen?: { x: number; y: number }) {
  if (typeof window === "undefined") return;
  try { navigator.vibrate?.([25, 40, 60]); } catch { /* sin vibracion */ }
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const c = document.createElement("canvas");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  Object.assign(c.style, { position: "fixed", inset: "0", width: "100vw", height: "100vh", pointerEvents: "none", zIndex: "9999" } as CSSStyleDeclaration);
  document.body.appendChild(c);
  const ctx = c.getContext("2d"); if (!ctx) { c.remove(); return; }
  ctx.scale(dpr, dpr);
  const colores = ["#00c875", "#579bfc", "#fdab3d", "#ffcb00", "#a25ddc", "#e2445c", "#ffffff"];
  const ox = origen?.x ?? innerWidth / 2, oy = origen?.y ?? innerHeight * 0.45;
  const P = Array.from({ length: 110 }, () => {
    const a = Math.random() * Math.PI * 2, v = 5 + Math.random() * 8;
    return { x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6, r: 3 + Math.random() * 4, c: colores[(Math.random() * colores.length) | 0], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, sq: Math.random() > 0.5 };
  });
  const t0 = performance.now();
  const frame = (t: number) => {
    const k = (t - t0) / 1400;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of P) {
      p.vy += 0.32; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
      if (p.sq) ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); else { ctx.beginPath(); ctx.arc(0, 0, p.r / 1.4, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    if (k < 1) requestAnimationFrame(frame); else c.remove();
  };
  requestAnimationFrame(frame);
}
