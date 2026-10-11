"use client";
/**
 * /dashboard/campo/autorizar — Por autorizar (Doménica 27 · 11-Oct-2026)
 * Para quien autoriza: responsable de obra / Superintendencia (nivel obra) y Dirección (nivel dirección).
 * Cada tarjeta dice qué se pide, cuánto, quién y cuántos días lleva esperando. Autorizar = 2 toques (toca y confirma).
 * "Elegir varias" para autorizar en lote. Las que traen comparativa de Compras abren la comparativa (ahí se elige proveedor).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, X, ChevronRight, Loader2 } from "lucide-react";
import { Ficha, IcoSello } from "@/components/domenica/IconosObra";
import { Hoja, api, useAviso } from "@/components/domenica/ui";
import { Esqueleto } from "@/components/domenica/Esqueleto";
import { Vacio } from "@/components/domenica/Vacio";
import { celebrar } from "@/lib/celebrar";

type P = { id: string; folio: string; obra: string | null; nivel: "OBRA" | "DIRECCION"; quien: string | null; para: string | null; prioridad: string | null; dias: number; que: string; tipo: string; efectivo: boolean; proveedor: string | null; total: number; partidas: { n: string | null; c: number | null; u: string | null }[]; mas: number; comparativa: string | null };
const $ = (n: number) => n ? n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: n >= 1000 ? 0 : 2 }) : "Sin monto";
const MOTIVOS = ["Falta cotización", "No es prioritario", "Monto muy alto", "Ya se compró", "Faltan datos"];

export default function AutorizarPage() {
  const { flash, nodo } = useAviso();
  const [lista, setLista] = useState<P[] | null>(null); const [dir, setDir] = useState(false);
  const [nivel, setNivel] = useState<"OBRA" | "DIRECCION">("OBRA");
  const [confirmar, setConfirmar] = useState<string | null>(null); const [busy, setBusy] = useState<string | null>(null);
  const [varias, setVarias] = useState(false); const [sel, setSel] = useState<Set<string>>(new Set());
  const [rechazo, setRechazo] = useState<P[] | null>(null);
  const [fuera, setFuera] = useState<Set<string>>(new Set());

  const cargar = useCallback(async () => {
    try {
      const r = await api<{ lista: P[]; puedeDireccion: boolean }>("/api/requisicion/por-autorizar");
      setLista(r.lista); setDir(r.puedeDireccion);
      const obra = r.lista.filter(x => x.nivel === "OBRA").length; setNivel(n => (n === "OBRA" && obra === 0 && r.puedeDireccion ? "DIRECCION" : n));
    } catch (e) { flash("err", (e as Error).message); setLista([]); }
  }, [flash]);
  useEffect(() => { cargar(); }, [cargar]);

  const visibles = useMemo(() => (lista || []).filter(x => x.nivel === nivel && !fuera.has(x.id)).sort((a, b) => b.dias - a.dias), [lista, nivel, fuera]);
  const cuenta = (n: "OBRA" | "DIRECCION") => (lista || []).filter(x => x.nivel === n && !fuera.has(x.id)).length;
  const suma = visibles.reduce((s, x) => s + x.total, 0);
  const selLista = visibles.filter(x => sel.has(x.id) && !x.comparativa);

  const quitar = (ids: string[]) => { setFuera(f => new Set([...f, ...ids])); setSel(new Set()); setConfirmar(null); };

  const autorizar = async (items: P[]) => {
    if (!items.length) return; setBusy(items.length === 1 ? items[0].id : "lote");
    try {
      if (items[0].nivel === "OBRA") {
        for (const it of items) await api("/api/requisicion/autorizar-responsable", "POST", { id: it.id, action: "AUTORIZAR" });
        quitar(items.map(x => x.id));
      } else {
        const r = await api<{ hechas: string[]; saltadas: { folio: string; motivo: string }[] }>("/api/requisicion/autorizar-direccion", "POST", { ids: items.map(x => x.id), action: "AUTORIZAR" });
        quitar(items.filter(x => r.hechas.includes(x.folio)).map(x => x.id));
        if (r.saltadas.length) flash("err", `${r.saltadas.length} no se pudo: ${r.saltadas[0].folio} ${r.saltadas[0].motivo}`);
      }
      celebrar(); flash("ok", items.length === 1 ? `${items[0].folio} autorizada` : `${items.length} autorizadas`); setVarias(false);
    } catch (e) { flash("err", (e as Error).message); } finally { setBusy(null); }
  };

  const rechazar = async (items: P[], motivo: string) => {
    setBusy("rechazo");
    try {
      if (items[0].nivel === "OBRA") { for (const it of items) await api("/api/requisicion/autorizar-responsable", "POST", { id: it.id, action: "RECHAZAR", comentario: motivo }); quitar(items.map(x => x.id)); }
      else { const r = await api<{ hechas: string[] }>("/api/requisicion/autorizar-direccion", "POST", { ids: items.map(x => x.id), action: "RECHAZAR", comentario: motivo }); quitar(items.filter(x => r.hechas.includes(x.folio)).map(x => x.id)); }
      flash("ok", items.length === 1 ? `${items[0].folio} rechazada. Ya le avisamos.` : `${items.length} rechazadas`); setRechazo(null); setVarias(false);
    } catch (e) { flash("err", (e as Error).message); } finally { setBusy(null); }
  };

  return (
    <div className="dom-page h-full overflow-y-auto">
      <div className="px-4 pt-4 pb-40 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Ficha ico={IcoSello} color="#3cde01" size="lg" />
          <div className="flex-1 min-w-0"><h1 className="text-[22px] font-bold text-[var(--d-text)] leading-tight whitespace-nowrap">Por autorizar</h1>
            <p className="text-[13px] text-[var(--d-muted)]">{lista === null ? "Cargando…" : visibles.length ? `${visibles.length} esperan · ${$(suma)}` : "Nada pendiente aquí"}</p></div>
          {visibles.length > 1 && <button onClick={() => { setVarias(v => !v); setSel(new Set()); }} className={`shrink-0 rounded-xl px-2.5 py-2 text-[12px] font-bold ${varias ? "bg-[#0f172a] text-white" : "bg-[var(--d-card-2)] text-[var(--d-text-2)]"}`}>{varias ? "Listo" : "Elegir varias"}</button>}
        </div>

        {dir && cuenta("OBRA") > 0 && cuenta("DIRECCION") > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-[var(--d-card-2)] p-1">
            {(["OBRA", "DIRECCION"] as const).map(n => <button key={n} onClick={() => { setNivel(n); setVarias(false); setSel(new Set()); }} className={`rounded-xl py-2.5 text-[14px] font-bold ${nivel === n ? "bg-[var(--d-card)] text-[var(--d-text)] shadow-sm" : "text-[var(--d-muted)]"}`}>{n === "OBRA" ? "En obra" : "Dirección"} <span className="ml-1 rounded-full bg-[#3cde01] px-1.5 text-[11px] text-white sobre-verde">{cuenta(n)}</span></button>)}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {lista === null ? <Esqueleto filas={3} alto={170} /> : visibles.length === 0 ? (
            <div className="dom-card rounded-3xl"><Vacio dibujo="listo" titulo="¡Nada por autorizar!" texto="Cuando alguien pida algo que te toque autorizar, aparece aquí y te avisamos." /></div>
          ) : visibles.map((p, i) => {
            const marcado = sel.has(p.id); const tarde = p.dias > 7;
            return (
              <div key={p.id} className="dom-card dom-in rounded-3xl p-4" style={{ animationDelay: `${Math.min(i, 8) * 40}ms`, boxShadow: marcado ? "inset 0 0 0 2px #3cde01" : undefined }}
                onClick={varias && !p.comparativa ? () => setSel(s => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; }) : undefined}>
                <div className="flex items-start gap-3">
                  {varias && !p.comparativa && <span className={`mt-1 shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${marcado ? "bg-[#3cde01]" : "border-2 border-[var(--d-border)]"} sobre-verde`}>{marcado && <Check className="w-4 h-4 text-white" strokeWidth={3} />}</span>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-bold text-[var(--d-text)] truncate">{p.obra || "Sin obra"}</span>
                      <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${tarde ? "bg-[#d0304a]" : "bg-[#64748b]"}`}>{p.dias === 0 ? "hoy" : `${p.dias} día${p.dias === 1 ? "" : "s"}`}</span>
                    </div>
                    <div className="text-[12px] text-[var(--d-muted)] truncate">{p.folio} · pidió {p.quien || "—"}{p.tipo === "DESTAJO" ? " · Destajo" : ""}</div>
                  </div>
                </div>
                {p.que && <div className="mt-2 text-[14.5px] text-[var(--d-text)] line-clamp-2">{p.que}</div>}
                {!!p.partidas.length && <ul className="mt-2 space-y-0.5">{p.partidas.slice(0, 3).map((x, k) => <li key={k} className="text-[13px] text-[var(--d-text-2)] truncate"><b className="text-[var(--d-text)]">{x.c} {x.u}</b> · {x.n}</li>)}{(p.partidas.length > 3 || p.mas > 0) && <li className="text-[12px] text-[var(--d-muted)]">y {p.partidas.length - 3 + p.mas} más</li>}</ul>}
                <div className="mt-3 flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[24px] font-bold leading-none text-[var(--d-text)]">{$(p.total)}</div>
                    <div className="mt-1 flex flex-wrap gap-1">{p.efectivo && <span className="rounded-md bg-[#3cde01] px-1.5 py-0.5 text-[11px] font-bold text-white sobre-verde">EFECTIVO</span>}{p.proveedor && <span className="text-[11.5px] text-[var(--d-muted)] truncate">{p.proveedor}</span>}</div>
                  </div>
                </div>
                {!varias && (p.comparativa ? (
                  <a href={p.comparativa} className="mt-3 w-full inline-flex items-center justify-center gap-1 rounded-2xl bg-[#0073ea] py-3 text-[15px] font-bold text-white">Ver comparativa y elegir<ChevronRight className="w-4 h-4" /></a>
                ) : (
                  <div className="mt-3 grid grid-cols-[1fr_2fr] gap-2">
                    <button onClick={() => setRechazo([p])} className="rounded-2xl border-2 border-[#d0304a] py-3 text-[15px] font-bold text-[var(--d-danger)] active:scale-[0.98]">Rechazar</button>
                    <button disabled={!!busy} onClick={() => confirmar === p.id ? autorizar([p]) : setConfirmar(p.id)} className={`rounded-2xl py-3 text-[15px] font-bold text-white active:scale-[0.98] inline-flex items-center justify-center gap-1.5 ${confirmar === p.id ? "bg-[#2fb800]" : "bg-[#3cde01]"} sobre-verde`}>
                      {busy === p.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" strokeWidth={3} />}{confirmar === p.id ? "Toca para confirmar" : "Autorizar"}
                    </button>
                  </div>
                ))}
              </div>);
          })}
        </div>
      </div>

      {varias && selLista.length > 0 && (
        <div className="fixed left-0 right-0 z-30 px-3" style={{ bottom: "calc(5.4rem + env(safe-area-inset-bottom))" }}>
          <div className="max-w-2xl mx-auto grid grid-cols-[1fr_2fr] gap-2 rounded-2xl bg-[var(--d-card)] p-2 shadow-[0_10px_30px_-10px_rgba(15,23,42,.45)] border border-[var(--d-border)]">
            <button onClick={() => setRechazo(selLista)} className="rounded-xl border-2 border-[#d0304a] py-3 text-[14px] font-bold text-[var(--d-danger)]">Rechazar {selLista.length}</button>
            <button disabled={!!busy} onClick={() => { if (window.confirm(`¿Autorizar ${selLista.length} solicitudes por ${$(selLista.reduce((s, x) => s + x.total, 0))}?`)) autorizar(selLista); }} className="rounded-xl bg-[#3cde01] py-3 text-[14px] font-bold text-white inline-flex items-center justify-center gap-1.5 sobre-verde">{busy === "lote" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" strokeWidth={3} />}Autorizar {selLista.length} · {$(selLista.reduce((s, x) => s + x.total, 0))}</button>
          </div>
        </div>
      )}

      {rechazo && <Rechazo items={rechazo} busy={busy === "rechazo"} onClose={() => setRechazo(null)} onOk={m => rechazar(rechazo, m)} />}
      {nodo}
    </div>
  );
}

function Rechazo({ items, busy, onClose, onOk }: { items: P[]; busy: boolean; onClose: () => void; onOk: (m: string) => void }) {
  const [m, setM] = useState("");
  return (
    <Hoja titulo={items.length === 1 ? "Rechazar solicitud" : `Rechazar ${items.length} solicitudes`} onClose={onClose}
      pie={<button disabled={busy || m.trim().length < 3} onClick={() => onOk(m.trim())} className="w-full rounded-2xl bg-[#d0304a] py-3.5 text-[15px] font-bold text-white disabled:opacity-50 inline-flex items-center justify-center gap-1.5">{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />}Rechazar y avisar</button>}>
      <p className="text-[14px] text-[var(--d-text-2)]">¿Por qué? Se lo avisamos a quien lo pidió.</p>
      <div className="mt-3 flex flex-wrap gap-2">{MOTIVOS.map(x => <button key={x} type="button" onClick={() => setM(x)} className={`rounded-full px-3 py-2 text-[13px] font-semibold ${m === x ? "bg-[#d0304a] text-white" : "bg-[var(--d-card-2)] text-[var(--d-text-2)]"}`}>{x}</button>)}</div>
      <textarea value={m} onChange={e => setM(e.target.value)} rows={3} placeholder="O escríbelo aquí" className="mt-3 w-full rounded-2xl border border-[var(--d-border)] bg-[var(--d-input)] px-4 py-3 text-[16px] text-[var(--d-text)] outline-none" />
    </Hoja>
  );
}
