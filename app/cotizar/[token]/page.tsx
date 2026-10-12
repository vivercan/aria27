"use client";
/**
 * /cotizar/[token] — Formulario público para proveedores (sin usuario) · 11-Oct-2026
 * El proveedor ve qué se necesita y sube su cotización (PDF o foto) con el total. Le llega aviso a Compras.
 */
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

type Datos = { proveedor: string; folio: string; obra: string | null; para: string | null; vence: string; enviadas: number; partidas: { product_name: string; unit: string | null; quantity: number | null; comments: string | null }[] };
const fecha = (d?: string | null) => d ? new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) : "—";

export default function CotizarPublico() {
  const { token } = useParams<{ token: string }>();
  const [d, setD] = useState<Datos | null>(null);
  const [err, setErr] = useState("");
  const [total, setTotal] = useState(""); const [dias, setDias] = useState(""); const [forma, setForma] = useState("TRANSFERENCIA"); const [factura, setFactura] = useState("si"); const [notas, setNotas] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false); const [listo, setListo] = useState(false); const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/publico/cotizar/${token}`, { cache: "no-store" }).then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) setErr(j.error || "No se pudo abrir el link"); else setD(j); }).catch(() => setErr("Sin conexión. Intenta de nuevo."));
  }, [token]);

  const enviar = async () => {
    setMsg("");
    if (!archivo) { setMsg("Sube tu cotización en PDF o foto."); return; }
    if (!(Number(total.replace(/[$,\s]/g, "")) > 0)) { setMsg("Escribe el total de tu cotización."); return; }
    setEnviando(true);
    const fd = new FormData(); fd.append("archivo", archivo); fd.append("total", total); fd.append("dias_entrega", dias); fd.append("forma_pago", forma); fd.append("factura", factura); fd.append("notas", notas);
    try { const r = await fetch(`/api/publico/cotizar/${token}`, { method: "POST", body: fd }); const j = await r.json().catch(() => ({})); if (!r.ok) setMsg(j.error || "No se pudo enviar"); else setListo(true); }
    catch { setMsg("Sin conexión. Intenta de nuevo."); } finally { setEnviando(false); }
  };

  const campo = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[16px] text-slate-900 outline-none focus:border-[#0073ea]";
  return (
    <div className="min-h-screen bg-[#f6f7fa] text-slate-900" style={{ fontFamily: "var(--font-dom), system-ui, sans-serif" }}>
      <header className="bg-white shadow-[0_8px_24px_-16px_rgba(15,23,42,.5)] relative">
        <div className="max-w-xl mx-auto px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0073ea] text-white font-extrabold italic flex items-center justify-center">GA</div>
          <div><div className="font-bold leading-tight">Grupo Constructor Urbano Avante</div><div className="text-[12px] text-slate-500">Solicitud de cotización</div></div>
        </div>
        <div className="absolute left-0 right-0 bottom-0 h-[2px]" style={{ background: "linear-gradient(90deg,#0073ea,#7e3bdd 45%,#d0304a 78%,#fdab3d)" }} />
      </header>
      <main className="max-w-xl mx-auto px-4 py-6">
        {err ? <div className="rounded-2xl bg-white p-6 text-center shadow-sm"><div className="text-4xl">🔗</div><div className="mt-2 font-semibold">{err}</div></div>
        : !d ? <div className="py-20 text-center text-slate-500">Cargando…</div>
        : listo ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <div className="text-5xl">✅</div>
            <h1 className="mt-3 text-xl font-bold">¡Gracias, {d.proveedor}!</h1>
            <p className="mt-1 text-slate-600">Recibimos tu cotización de la solicitud {d.folio}. Compras ya fue avisado y te contactará.</p>
          </div>
        ) : (<>
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="text-[13px] text-slate-500">Hola, <b className="text-slate-800">{d.proveedor}</b>. Te pedimos cotizar:</div>
            <h1 className="mt-1 text-2xl font-bold">{d.folio}</h1>
            <div className="mt-1 text-[13px] text-slate-600">{d.obra ? `Obra: ${d.obra} · ` : ""}Lo necesitamos para el {fecha(d.para)}</div>
            <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {d.partidas.map((p, i) => (
                <li key={i} className="flex items-start gap-3 px-4 py-3">
                  <span className="shrink-0 rounded-lg bg-[#0073ea]/10 px-2 py-1 text-[13px] font-bold text-[#0060d0]">{Number(p.quantity) || 0} {p.unit || ""}</span>
                  <div className="min-w-0"><div className="text-[14.5px] font-semibold">{p.product_name}</div>{p.comments && <div className="text-[12.5px] text-slate-500">{p.comments}</div>}</div>
                </li>))}
              {d.partidas.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Sin partidas capturadas.</li>}
            </ul>
            <div className="mt-2 text-[11.5px] text-slate-500">Este link vence el {fecha(d.vence)}.</div>
          </div>

          <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">Tu cotización</h2>
            <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={e => setArchivo(e.target.files?.[0] || null)} />
            <button type="button" onClick={() => fileRef.current?.click()} className={`mt-3 w-full rounded-2xl border-2 border-dashed px-4 py-6 text-center ${archivo ? "border-[#00873f] bg-[#00873f]/5" : "border-slate-300"} sobre-verde`}>
              <div className="text-3xl">{archivo ? "📎" : "📄"}</div>
              <div className="mt-1 font-semibold">{archivo ? archivo.name : "Sube tu cotización (PDF o foto)"}</div>
              <div className="text-[12px] text-slate-500">{archivo ? `${(archivo.size / 1024 / 1024).toFixed(1)} MB · toca para cambiar` : "Máximo 10 MB"}</div>
            </button>
            <label className="mt-4 block"><span className="text-[13px] font-semibold text-slate-700">Total con IVA (MXN)</span><input inputMode="decimal" value={total} onChange={e => setTotal(e.target.value)} placeholder="$ 0.00" className={campo} /></label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block"><span className="text-[13px] font-semibold text-slate-700">Días de entrega</span><input inputMode="numeric" value={dias} onChange={e => setDias(e.target.value)} placeholder="Ej. 3" className={campo} /></label>
              <label className="block"><span className="text-[13px] font-semibold text-slate-700">Forma de pago</span><select value={forma} onChange={e => setForma(e.target.value)} className={campo}><option value="TRANSFERENCIA">Transferencia</option><option value="EFECTIVO">Efectivo</option><option value="CREDITO">Crédito</option></select></label>
            </div>
            <div className="mt-3"><span className="text-[13px] font-semibold text-slate-700">¿Emites factura?</span>
              <div className="mt-1 grid grid-cols-2 gap-2">{[["si", "Sí"], ["no", "No"]].map(([v, l]) => <button key={v} type="button" onClick={() => setFactura(v)} className={`rounded-xl py-2.5 font-semibold ${factura === v ? "bg-[#0073ea] text-white" : "bg-slate-100 text-slate-700"}`}>{l}</button>)}</div></div>
            <label className="mt-3 block"><span className="text-[13px] font-semibold text-slate-700">Comentarios (opcional)</span><textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3} className={campo} /></label>
            {msg && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{msg}</div>}
            <button type="button" onClick={enviar} disabled={enviando} className="mt-4 w-full rounded-2xl bg-[#0073ea] py-4 text-base font-bold text-white disabled:opacity-60">{enviando ? "Enviando…" : "Enviar cotización"}</button>
            {d.enviadas > 0 && <div className="mt-2 text-center text-[12px] text-slate-500">Ya enviaste {d.enviadas} vez{d.enviadas === 1 ? "" : "es"}; si mandas otra, Compras verá ambas.</div>}
          </div>
          <p className="mt-6 text-center text-[11px] text-slate-400">Este formulario es solo para cotizar esta solicitud. No compartas el link.</p>
        </>)}
      </main>
    </div>
  );
}
