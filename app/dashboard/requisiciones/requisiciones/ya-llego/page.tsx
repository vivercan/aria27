"use client";
/**
 * /dashboard/requisiciones/requisiciones/ya-llego — "¿Ya llegó?" (14-Oct-2026 · JJ)
 * Las solicitudes que llevan 15 días o más sin moverse. Con un toque: Sí ya llegó (se cierra como Entregada),
 * Aún no (sigue viva) o Ya no se ocupa (se cancela). Lo mismo se puede contestar por WhatsApp: "SI 757".
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Clock, X, Loader2 } from "lucide-react";
import { DomHeader } from "@/components/domenica/ui";
import { Esqueleto } from "@/components/domenica/Esqueleto";
import { Vacio } from "@/components/domenica/Vacio";
import { IcoCamion } from "@/components/domenica/IconosObra";

type R = { id: string; folio: string | null; status: string | null; user_email?: string | null; cost_center_name?: string | null; descripcion_corta?: string | null; descripcion_compra?: string | null; purchase_status?: string | null; forma_pago?: string | null; seg_respuesta?: string | null; dias: number };
const num = (f?: string | null) => { const m = String(f || "").match(/(\d+)\s*$/); return m ? `#${Number(m[1])}` : "—"; };
const efectivo = (r: R) => r.purchase_status === "GASTO_EFECTIVO_PENDIENTE" || /EFECTIVO|CAJA/i.test(String(r.forma_pago || ""));
const quien = (e?: string | null) => String(e || "").split("@")[0].replace(/[._]/g, " ");

export default function YaLlegoPage() {
  const [lista, setLista] = useState<R[] | null>(null);
  const [todas, setTodas] = useState(false);
  const [puedeTodas, setPuedeTodas] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [cancelarId, setCancelarId] = useState<string | null>(null);
  const [confirmarTodas, setConfirmarTodas] = useState(false);
  const [aviso, setAviso] = useState<{ t: "ok" | "err"; m: string } | null>(null);
  const flash = (t: "ok" | "err", m: string) => { setAviso({ t, m }); setTimeout(() => setAviso(null), 3500); };

  const cargar = useCallback(async (verTodas: boolean) => {
    setLista(null);
    try {
      const r = await fetch(`/api/requisicion/seguimiento${verTodas ? "?todas=1" : ""}`, { credentials: "include", cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo cargar");
      setLista(j.lista || []); setPuedeTodas(!!j.puedeVerTodas);
    } catch (e) { setLista([]); flash("err", (e as Error).message); }
  }, []);
  useEffect(() => { cargar(todas); }, [todas, cargar]);

  const contestar = async (ids: string[], accion: "si" | "no" | "cancelar") => {
    setOcupado(ids.length > 1 ? "todas" : `${ids[0]}:${accion}`);
    try {
      const r = await fetch("/api/requisicion/seguimiento", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, accion }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo guardar");
      const n = j.hechas || 0;
      flash("ok", accion === "si" ? `${n === 1 ? "Quedó" : `Quedaron ${n}`} como entregada${n === 1 ? "" : "s"}` : accion === "no" ? "Anotado: sigue pendiente. Compras lo verá." : "Solicitud cancelada");
      setLista(l => (l || []).filter(x => !ids.includes(x.id)));
    } catch (e) { flash("err", (e as Error).message); }
    finally { setOcupado(null); setCancelarId(null); setConfirmarTodas(false); }
  };

  const masVieja = useMemo(() => Math.max(0, ...(lista || []).map(r => r.dias)), [lista]);

  return (
    <div className="dom-page h-full overflow-y-auto">
      <div className="px-4 md:px-6 pt-4 pb-28 md:pb-10 max-w-3xl mx-auto">
        <DomHeader icon={IcoCamion} from="#0073ea" titulo="¿Ya llegó?" desc="Solicitudes con 15 días o más sin moverse. Dinos si ya llegaron y se cierran solas." />

        {puedeTodas && (
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-[var(--d-card-2)] p-1" role="tablist" aria-label="Qué solicitudes ver">
            {([[false, "Las mías"], [true, "De todos"]] as [boolean, string][]).map(([v, l]) => (
              <button key={l} role="tab" aria-selected={todas === v} type="button" onClick={() => setTodas(v)} className={`rounded-xl py-2.5 text-[13px] font-bold transition ${todas === v ? "bg-[var(--d-surface)] text-[var(--d-text)] shadow-[var(--d-shadow)]" : "text-[var(--d-muted)]"}`}>{l}</button>))}
          </div>)}

        {lista === null ? <div className="mt-5"><Esqueleto filas={4} alto={120} /></div>
          : lista.length === 0 ? <div className="mt-8"><Vacio dibujo="listo" titulo="Todo al día" texto={todas ? "No hay solicitudes viejas sin cerrar." : "No tienes solicitudes viejas sin cerrar. Cuando una lleve 15 días sin moverse, aparece aquí."} accion={{ label: "Ver mis solicitudes", href: "/dashboard/requisiciones/requisiciones/estatus?tab=mias" }} /></div>
          : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="dom-card rounded-2xl p-3"><div className="text-[26px] font-bold leading-none text-[var(--c-azul)]">{lista.length}</div><div className="mt-1.5 text-[11.5px] text-[var(--d-muted)]">por confirmar</div></div>
                <div className="dom-card rounded-2xl p-3"><div className="text-[26px] font-bold leading-none text-[var(--d-danger)]">{masVieja} días</div><div className="mt-1.5 text-[11.5px] text-[var(--d-muted)]">la más vieja</div></div>
              </div>

              {!todas && lista.length > 1 && (
                confirmarTodas
                  ? <div className="mt-3 rounded-2xl border-2 border-[#00873f] p-3 flex flex-wrap items-center gap-2">
                      <span className="flex-1 min-w-[180px] text-[13.5px] font-semibold text-[var(--d-text)]">¿Seguro? Se cierran las {lista.length} como entregadas.</span>
                      <button type="button" onClick={() => contestar(lista.map(r => r.id), "si")} disabled={!!ocupado} className="rounded-xl bg-[#00873f] px-4 py-2.5 text-[13.5px] font-bold text-white sobre-verde disabled:opacity-60">{ocupado === "todas" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sí, ya llegaron todas"}</button>
                      <button type="button" onClick={() => setConfirmarTodas(false)} className="rounded-xl bg-[var(--d-card-2)] px-4 py-2.5 text-[13.5px] font-bold text-[var(--d-text-2)]">No</button>
                    </div>
                  : <button type="button" onClick={() => setConfirmarTodas(true)} className="mt-3 w-full rounded-2xl border border-[var(--d-border)] bg-[var(--d-surface)] py-3 text-[14px] font-bold text-[#00873f]">Ya llegaron todas ({lista.length})</button>
              )}

              <div className="mt-3 space-y-2.5">
                {lista.map((r, i) => (
                  <div key={r.id} className="dom-card dom-in rounded-2xl p-3.5" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Link href={`/dashboard/requisiciones/requisiciones/estatus?open=${r.id}`} className="text-[15px] font-bold text-[var(--d-link)]">{num(r.folio)}</Link>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${r.dias >= 30 ? "bg-[#c2182b]" : "bg-[#b45309]"}`}>{r.dias} días sin moverse</span>
                          {efectivo(r) && <span className="rounded-full bg-[#007a87] px-2 py-0.5 text-[11px] font-bold text-white">Efectivo</span>}
                          {r.seg_respuesta === "NO" && <span className="rounded-full bg-[var(--d-card-2)] px-2 py-0.5 text-[11px] font-bold text-[var(--d-text-2)]">Dijeron que aún no</span>}
                        </div>
                        <div className="mt-1 text-[14px] font-semibold text-[var(--d-text)] truncate">{r.descripcion_corta || r.descripcion_compra || "Material"}</div>
                        <div className="text-[12.5px] text-[var(--d-muted)] truncate">{r.cost_center_name || "Sin obra"}{todas && r.user_email ? ` · pidió ${quien(r.user_email)}` : ""}</div>
                      </div>
                    </div>
                    {cancelarId === r.id ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="flex-1 min-w-[160px] text-[13px] font-semibold text-[var(--d-danger)]">¿Cancelarla? Ya no se compra.</span>
                        <button type="button" onClick={() => contestar([r.id], "cancelar")} disabled={!!ocupado} className="rounded-xl bg-[#c2182b] px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-60">Sí, cancelar</button>
                        <button type="button" onClick={() => setCancelarId(null)} className="rounded-xl bg-[var(--d-card-2)] px-4 py-2.5 text-[13px] font-bold text-[var(--d-text-2)]">No</button>
                      </div>
                    ) : (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <button type="button" onClick={() => contestar([r.id], "si")} disabled={!!ocupado} aria-label={`Sí, ya llegó la ${num(r.folio)}`} className="rounded-xl bg-[#00873f] py-3 text-[13.5px] font-bold text-white sobre-verde inline-flex items-center justify-center gap-1.5 disabled:opacity-60">{ocupado === `${r.id}:si` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Ya llegó</button>
                        <button type="button" onClick={() => contestar([r.id], "no")} disabled={!!ocupado} aria-label={`Aún no llega la ${num(r.folio)}`} className="rounded-xl bg-[var(--d-card-2)] py-3 text-[13.5px] font-bold text-[var(--d-text)] inline-flex items-center justify-center gap-1.5 disabled:opacity-60">{ocupado === `${r.id}:no` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}Aún no</button>
                        <button type="button" onClick={() => setCancelarId(r.id)} disabled={!!ocupado} aria-label={`Ya no se ocupa la ${num(r.folio)}`} className="rounded-xl border border-[var(--d-border)] py-3 text-[13px] font-bold text-[var(--d-danger)] inline-flex items-center justify-center gap-1 disabled:opacity-60"><X className="w-4 h-4" />No se ocupa</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[12px] text-[var(--d-muted)]">También por WhatsApp: contesta <b>SI 757</b> si ya llegó o <b>NO 757</b> si sigue pendiente (con el número de tu solicitud).</p>
            </>
          )}
      </div>
      {aviso && <div role="status" className={`fixed left-1/2 -translate-x-1/2 bottom-[calc(96px+env(safe-area-inset-bottom))] z-[80] rounded-2xl px-4 py-3 text-[14px] font-semibold text-white shadow-xl ${aviso.t === "ok" ? "bg-[#0f172a]" : "bg-[#c2182b]"}`}>{aviso.m}</div>}
    </div>
  );
}
