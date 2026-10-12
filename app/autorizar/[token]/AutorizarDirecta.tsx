"use client";
/**
 * Autorización directa de Dirección desde el link (WhatsApp/correo) · Doménica 27 · 11-Oct-2026
 * Para solicitudes SIN comparativa de Compras (gastos, efectivo, destajos, compra directa).
 * Antes esta pantalla mostraba "$0.00 · 0 productos" y no dejaba aprobar.
 */
import { useState } from "react";
import { IcoSello } from "@/components/domenica/IconosObra";

export type DatosDirecta = {
  token: string; folio: string; obra: string | null; quien: string | null; creada: string; para: string | null; motivo: string | null;
  tipo: string | null; efectivo: boolean; proveedor: string | null; banco: string | null; total: number; partidas: { n: string; c: number | null; u: string | null; p: number | null }[];
};
const $ = (n: number) => n ? n.toLocaleString("es-MX", { style: "currency", currency: "MXN" }) : "Sin monto capturado";
const f = (d: string | null) => d ? new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("es-MX", { day: "numeric", month: "long" }) : "—";
const MOTIVOS = ["Falta cotización", "No es prioritario", "Monto muy alto", "Ya se compró", "Faltan datos"];

export default function AutorizarDirecta({ d }: { d: DatosDirecta }) {
  const [paso, setPaso] = useState<"ver" | "confirmar" | "rechazar" | "listo">("ver");
  const [motivo, setMotivo] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [final, setFinal] = useState<"APROBADA" | "RECHAZADA" | null>(null);
  const dias = Math.max(0, Math.floor((Date.now() - Date.parse(d.creada)) / 864e5));

  const enviar = async (action: "AUTORIZAR" | "RECHAZAR") => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/requisicion/autorizar-token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: d.token, action, comentario: motivo }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || "No se pudo"); return; }
      setFinal(action === "AUTORIZAR" ? "APROBADA" : "RECHAZADA"); setPaso("listo");
      try { navigator.vibrate?.(40); } catch { /* */ }
    } catch { setErr("Sin conexión. Intenta de nuevo."); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[#f6f7fa] text-slate-900" style={{ fontFamily: "var(--font-dom), system-ui, sans-serif" }}>
      <header className="bg-white relative">
        <div className="max-w-xl mx-auto px-5 py-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#1f8500] flex items-center justify-center"><IcoSello className="w-6 h-6" color="#fff" fondo="#1f8500" /></span>
          <div><div className="font-bold leading-tight">Autorizar solicitud</div><div className="text-[12px] text-slate-500">Grupo Constructor Urbano Avante</div></div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-5">
        {paso === "listo" ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center text-white text-3xl font-bold ${final === "APROBADA" ? "bg-[#1f8500]" : "bg-[#d0304a]"} sobre-verde`}>{final === "APROBADA" ? "✓" : "✕"}</div>
            <h1 className="mt-4 text-2xl font-bold">{final === "APROBADA" ? "Autorizada" : "Rechazada"}</h1>
            <p className="mt-1 text-slate-600">{d.folio} · {d.obra}. Ya le avisamos a {d.quien || "quien la pidió"}{final === "APROBADA" && d.efectivo ? " y a Administración para el pago" : ""}.</p>
          </div>
        ) : (<>
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-slate-500">{d.folio}</span>
              <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[12px] font-bold text-white ${dias > 7 ? "bg-[#d0304a]" : "bg-slate-500"}`}>{dias === 0 ? "pedida hoy" : `espera hace ${dias} día${dias === 1 ? "" : "s"}`}</span>
            </div>
            <h1 className="mt-1 text-[22px] font-bold leading-tight">{d.obra || "Sin obra"}</h1>
            <p className="text-[14px] text-slate-600">Pidió <b className="text-slate-800">{d.quien || "—"}</b>{d.para ? ` · para el ${f(d.para)}` : ""}{d.tipo === "DESTAJO" ? " · Destajo" : ""}</p>
            {d.motivo && <p className="mt-3 text-[16px] text-slate-800">{d.motivo}</p>}
            {d.partidas.length > 0 && (
              <ul className="mt-3 divide-y divide-slate-100 rounded-2xl bg-slate-50 px-3">
                {d.partidas.map((x, i) => <li key={i} className="py-2 flex gap-2 text-[14px]"><b className="shrink-0">{x.c ?? ""} {x.u ?? ""}</b><span className="flex-1 min-w-0">{x.n}</span>{x.p ? <span className="shrink-0 text-slate-500">{$(x.p)}</span> : null}</li>)}
              </ul>
            )}
            <div className="mt-4 flex items-end justify-between gap-3">
              <div><div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Total</div><div className="text-[30px] font-bold leading-none">{$(d.total)}</div></div>
              <div className="text-right text-[12.5px] text-slate-600">{d.efectivo && <span className="inline-block mb-1 rounded-md bg-[#1f8500] px-2 py-0.5 text-[11px] font-bold text-white sobre-verde">EFECTIVO</span>}<div>{d.proveedor || ""}</div>{d.banco && <div className="text-slate-400">{d.banco}</div>}</div>
            </div>
          </div>

          {paso === "rechazar" ? (
            <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
              <div className="font-bold">¿Por qué la rechazas?</div>
              <div className="mt-3 flex flex-wrap gap-2">{MOTIVOS.map(m => <button key={m} type="button" onClick={() => setMotivo(m)} className={`rounded-full px-3 py-2 text-[13px] font-semibold ${motivo === m ? "bg-[#d0304a] text-white" : "bg-slate-100 text-slate-700"}`}>{m}</button>)}</div>
              <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} placeholder="O escríbelo aquí" className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-[16px] outline-none focus:border-[#d0304a]" />
              {err && <div className="mt-2 text-sm font-semibold text-red-700">{err}</div>}
              <div className="mt-3 grid grid-cols-[1fr_2fr] gap-2">
                <button onClick={() => { setPaso("ver"); setErr(""); }} className="rounded-2xl bg-slate-100 py-3.5 font-bold text-slate-700">Volver</button>
                <button disabled={busy || motivo.trim().length < 3} onClick={() => enviar("RECHAZAR")} className="rounded-2xl bg-[#d0304a] py-3.5 font-bold text-white disabled:opacity-50">{busy ? "Enviando…" : "Rechazar y avisar"}</button>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              {err && <div className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</div>}
              <div className="grid grid-cols-[1fr_2fr] gap-2">
                <button onClick={() => setPaso("rechazar")} className="rounded-2xl border-2 border-[#d0304a] bg-white py-4 text-[16px] font-bold text-[#d0304a]">Rechazar</button>
                <button disabled={busy} onClick={() => paso === "confirmar" ? enviar("AUTORIZAR") : setPaso("confirmar")} className={`rounded-2xl py-4 text-[16px] font-bold text-white ${paso === "confirmar" ? "bg-[#2fb800]" : "bg-[#1f8500]"} sobre-verde`}>{busy ? "Autorizando…" : paso === "confirmar" ? `Confirmar ${$(d.total)}` : "Autorizar"}</button>
              </div>
              {paso === "confirmar" && <p className="mt-2 text-center text-[13px] text-slate-500">Toca otra vez para confirmar.</p>}
            </div>
          )}
        </>)}
        <p className="mt-8 text-center text-[11px] text-slate-400">Doménica 27 · ARIA27</p>
      </main>
    </div>
  );
}
