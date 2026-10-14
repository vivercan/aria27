"use client";
/**
 * /dashboard/domenica/uso — ¿Quién está usando Doménica? (14-Oct-2026 · JJ)
 * En 8 segundos: quién no entra y quién tiene cosas atoradas. Primero quien más frena.
 * Solo admin, RH y Dirección.
 */
import { useEffect, useMemo, useState } from "react";
import { DomHeader } from "@/components/domenica/ui";
import { Esqueleto } from "@/components/domenica/Esqueleto";
import { IcoEquipo } from "@/components/domenica/IconosObra";
import { iniciales, colorPersona } from "@/lib/actividades";
import { atoradas, nivelUso, type FilaUso, type Nivel } from "@/lib/uso";

const ROL: Record<string, string> = { admin: "Admin", direccion: "Dirección", rh: "RH", compras: "Compras", validador: "Superintendencia", residente: "Residente", usuario: "Administración", ejecutivo: "Ejecutivo", "sin cuenta": "Sin cuenta" };
const NIVEL: Record<Nivel, { t: (d: number | null) => string; c: string }> = {
  activo: { t: d => (d === 0 ? "Entró hoy" : d === 1 ? "Entró ayer" : `Hace ${d} días`), c: "#00873f" },
  poco: { t: d => `Hace ${d} días`, c: "#b45309" },
  "no-entra": { t: d => `Hace ${d} días`, c: "#c2182b" },
  nunca: { t: () => "Nunca ha entrado", c: "#c2182b" },
};
const WA: Record<string, { t: string; c: string }> = { read: { t: "Lee sus WhatsApp", c: "#00873f" }, delivered: { t: "Le llegan los WhatsApp", c: "#0073ea" }, sent: { t: "WhatsApp enviado", c: "#55657c" }, failed: { t: "No le llegan los WhatsApp", c: "#c2182b" } };
type Filtro = "todos" | "no-entran" | "atorados";

export default function UsoPage() {
  const [filas, setFilas] = useState<FilaUso[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  useEffect(() => {
    fetch("/api/domenica/uso", { credentials: "include", cache: "no-store" })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error || "No se pudo cargar"); setFilas(j.filas || []); })
      .catch(e => { setError((e as Error).message); setFilas([]); });
  }, []);

  const k = useMemo(() => {
    const f = filas || [];
    const conCuenta = f.filter(x => !x.soloWhatsApp);
    return {
      activos: conCuenta.filter(x => nivelUso(x.diasSinEntrar) === "activo").length,
      noEntran: conCuenta.filter(x => ["no-entra", "nunca"].includes(nivelUso(x.diasSinEntrar))).length,
      atoradas: f.reduce((s, x) => s + atoradas(x), 0),
      sinWa: f.filter(x => x.ultimoWhatsApp?.estado === "failed").length,
      total: conCuenta.length,
    };
  }, [filas]);
  const visibles = (filas || []).filter(x => filtro === "todos" ? true : filtro === "no-entran" ? !x.soloWhatsApp && ["no-entra", "nunca"].includes(nivelUso(x.diasSinEntrar)) : atoradas(x) > 0);

  return (
    <div className="dom-page h-full overflow-y-auto">
      <div className="px-4 md:px-6 pt-4 pb-28 md:pb-10 max-w-4xl mx-auto">
        <DomHeader icon={IcoEquipo} from="#7e3bdd" titulo="¿Quién está usando Doménica?" desc="Quién no entra y quién tiene cosas atoradas. Primero quien más frena el trabajo." />
        {filas === null ? <div className="mt-5"><Esqueleto filas={4} alto={96} /></div> : error ? <p className="mt-6 rounded-2xl bg-[#c2182b] p-4 text-white font-semibold">{error}</p> : (
          <>
            <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-2">
              {[{ n: `${k.activos}/${k.total}`, l: "Entran seguido (2 días o menos)", c: "#00873f" }, { n: k.noEntran, l: "No entran (7+ días o nunca)", c: "#c2182b" }, { n: k.atoradas, l: "Cosas atoradas en total", c: "#b45309" }, { n: k.sinWa, l: "No les llegan los WhatsApp", c: k.sinWa ? "#c2182b" : "var(--d-muted)" }].map((x, i) => (
                <div key={x.l} className="dom-card dom-in rounded-2xl p-3" style={{ animationDelay: `${i * 60}ms` }}><div className="text-[26px] font-bold leading-none" style={{ color: x.c }}>{x.n}</div><div className="mt-1.5 text-[11.5px] text-[var(--d-muted)]">{x.l}</div></div>))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-[var(--d-card-2)] p-1" role="tablist" aria-label="Filtrar personas">
              {([["todos", "Todos"], ["no-entran", "No entran"], ["atorados", "Con atorados"]] as [Filtro, string][]).map(([v, l]) => (
                <button key={v} role="tab" aria-selected={filtro === v} type="button" onClick={() => setFiltro(v)} className={`rounded-xl py-2.5 text-[13px] font-bold transition ${filtro === v ? "bg-[var(--d-surface)] text-[var(--d-text)] shadow-[var(--d-shadow)]" : "text-[var(--d-muted)]"}`}>{l}</button>))}
            </div>
            <div className="mt-3 space-y-2">
              {visibles.map((f, i) => {
                const nv = nivelUso(f.diasSinEntrar, f.soloWhatsApp); const n = NIVEL[nv]; const at = atoradas(f);
                const wa = f.ultimoWhatsApp?.estado ? WA[f.ultimoWhatsApp.estado] : null;
                const chips = [
                  f.leTocanSolicitudes > 0 && { t: `${f.leTocanSolicitudes} solicitud${f.leTocanSolicitudes === 1 ? "" : "es"} le toca${f.leTocanSolicitudes === 1 ? "" : "n"} mover`, c: "#b85507" },
                  f.actividadesAtrasadas > 0 && { t: `${f.actividadesAtrasadas} actividad${f.actividadesAtrasadas === 1 ? "" : "es"} atrasada${f.actividadesAtrasadas === 1 ? "" : "s"}`, c: "#c2182b" },
                  f.solicitudesViejas > 0 && { t: `${f.solicitudesViejas} solicitud${f.solicitudesViejas === 1 ? "" : "es"} vieja${f.solicitudesViejas === 1 ? "" : "s"} sin cerrar`, c: "#0073ea" },
                  f.porRevisar > 0 && { t: `${f.porRevisar} por dar visto bueno`, c: "#7e3bdd" },
                ].filter(Boolean) as { t: string; c: string }[];
                return (
                  <div key={`${f.email || f.nombre}-${i}`} className="dom-card dom-in rounded-2xl p-3.5 flex items-start gap-3" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
                    <span className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: colorPersona(f.nombre) }}>{iniciales(f.nombre)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[15px] font-semibold text-[var(--d-text)]">{f.nombre}</span>
                        <span className="text-[12px] text-[var(--d-muted)]">{ROL[f.rol] || f.rol}</span>
                        {f.soloWhatsApp ? <span className="rounded-full bg-[#55657c] px-2 py-0.5 text-[11px] font-bold text-white">Solo WhatsApp</span>
                          : <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${n.c === "#00873f" ? "sobre-verde" : ""}`} style={{ background: n.c }}>{n.t(f.diasSinEntrar)}</span>}
                      </div>
                      {chips.length > 0
                        ? <div className="mt-1.5 flex flex-wrap gap-1.5">{chips.map(c => <span key={c.t} className="rounded-lg px-2 py-1 text-[12px] font-semibold" style={{ background: `${c.c}18`, color: c.c }}>{c.t}</span>)}</div>
                        : <div className="mt-1 text-[12.5px] text-[var(--d-muted)]">{f.actividadesAbiertas ? `${f.actividadesAbiertas} actividad${f.actividadesAbiertas === 1 ? "" : "es"} en curso, nada atorado` : "Nada atorado"}</div>}
                      {wa && <div className="mt-1.5 text-[12px] font-semibold" style={{ color: wa.c }}>{wa.t}</div>}
                    </div>
                    {at > 0 && <div className="shrink-0 text-right"><div className="text-[22px] font-bold leading-none text-[#b45309]">{at}</div><div className="text-[10.5px] text-[var(--d-muted)]">atoradas</div></div>}
                  </div>);
              })}
              {!visibles.length && <p className="py-8 text-center text-[14px] text-[var(--d-muted)]">Nadie en esta lista.</p>}
            </div>
            <p className="mt-4 text-[12px] text-[var(--d-muted)]">Atoradas = solicitudes que le toca mover + actividades atrasadas + solicitudes viejas sin cerrar + visto bueno pendiente. Los perfiles de prueba no aparecen.</p>
          </>
        )}
      </div>
    </div>
  );
}
