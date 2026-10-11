"use client";
/**
 * /evidencia/[token] — Formulario público para destajistas y proveedores (sin usuario) · 11-Oct-2026
 * Toman fotos del avance desde su celular, marcan el porcentaje y se le avisa al responsable.
 */
import { IcoCamara, IcoComparar } from "@/components/domenica/IconosObra";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

type Datos = { quien: string; titulo: string; obra: string | null; entrega: string | null; avance: number; enviadas: number; vence: string };
const fecha = (d?: string | null) => d ? new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("es-MX", { day: "numeric", month: "long" }) : "—";

export default function EvidenciaPublica() {
  const { token } = useParams<{ token: string }>();
  const [d, setD] = useState<Datos | null>(null); const [err, setErr] = useState("");
  const [fotos, setFotos] = useState<File[]>([]); const [avance, setAvance] = useState<number | null>(null); const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false); const [listo, setListo] = useState(0); const [msg, setMsg] = useState("");
  const camRef = useRef<HTMLInputElement>(null); const galRef = useRef<HTMLInputElement>(null);
  const cargar = () => fetch(`/api/publico/evidencia/${token}`, { cache: "no-store" }).then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) setErr(j.error || "No se pudo abrir el link"); else setD(j); }).catch(() => setErr("Sin conexión. Intenta de nuevo."));
  useEffect(() => { cargar(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  const agregar = (l: FileList | null) => { if (!l) return; setFotos(f => [...f, ...Array.from(l)].slice(0, 5)); };
  const enviar = async () => {
    setMsg(""); if (!fotos.length) { setMsg("Toma o elige al menos una foto."); return; }
    setEnviando(true);
    const fd = new FormData(); fotos.forEach(f => fd.append("fotos", f)); if (avance !== null) fd.append("avance", String(avance)); fd.append("comentario", comentario);
    try { const r = await fetch(`/api/publico/evidencia/${token}`, { method: "POST", body: fd }); const j = await r.json().catch(() => ({})); if (!r.ok) setMsg(j.error || "No se pudo enviar"); else { setListo(j.fotos || fotos.length); setFotos([]); setComentario(""); setAvance(null); cargar(); } }
    catch { setMsg("Sin conexión. Intenta de nuevo."); } finally { setEnviando(false); }
  };
  return (
    <div className="min-h-screen bg-[#eceff4] text-slate-900" style={{ fontFamily: "var(--font-dom), system-ui, sans-serif" }}>
      <header className="bg-white shadow-[0_8px_24px_-16px_rgba(15,23,42,.5)] relative">
        <div className="max-w-xl mx-auto px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#3cde01] text-white font-extrabold italic flex items-center justify-center sobre-verde">GA</div>
          <div><div className="font-bold leading-tight">Grupo Constructor Urbano Avante</div><div className="text-[12px] text-slate-500">Fotos de avance</div></div>
        </div>
        <div className="absolute left-0 right-0 bottom-0 h-[2px]" style={{ background: "linear-gradient(90deg,#0073ea,#7e3bdd 45%,#e2445c 78%,#fdab3d)" }} />
      </header>
      <main className="max-w-xl mx-auto px-4 py-6">
        {err ? <div className="rounded-2xl bg-white p-6 text-center shadow-sm"><div className="text-4xl">🔗</div><div className="mt-2 font-semibold">{err}</div></div>
        : !d ? <div className="py-20 text-center text-slate-500">Cargando…</div> : (<>
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="text-[13px] text-slate-500">Hola, <b className="text-slate-800">{d.quien}</b>. Sube fotos de:</div>
            <h1 className="mt-1 text-2xl font-bold leading-tight">{d.titulo}</h1>
            <div className="mt-1 text-[13px] text-slate-600">{d.obra ? `Obra: ${d.obra} · ` : ""}Entrega: {fecha(d.entrega)}</div>
            <div className="mt-3"><div className="flex justify-between text-[12px] text-slate-500"><span>Avance registrado</span><b className="text-slate-800">{d.avance}%</b></div>
              <div className="mt-1 h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-[#3cde01]" style={{ width: `${d.avance}%` }} /></div></div>
          </div>
          {listo > 0 && <div className="mt-4 rounded-2xl bg-[#3cde01]/10 border border-[#3cde01]/40 p-4 text-center font-semibold text-[#2fb800]">✅ ¡Listo! Se enviaron {listo} foto{listo === 1 ? "" : "s"}. Ya le avisamos al responsable.</div>}
          <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
            <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { agregar(e.target.files); e.target.value = ""; }} />
            <input ref={galRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={e => { agregar(e.target.files); e.target.value = ""; }} />
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => camRef.current?.click()} className="rounded-2xl bg-[#0073ea] py-5 text-white font-bold"><div className="flex justify-center mb-1"><IcoCamara className="w-8 h-8" color="#fff" /></div>Tomar foto</button>
              <button type="button" onClick={() => galRef.current?.click()} className="rounded-2xl bg-slate-100 py-5 font-bold text-slate-700"><div className="flex justify-center mb-1"><IcoComparar className="w-8 h-8" color="#334155" /></div>De la galería</button>
            </div>
            {fotos.length > 0 && <div className="mt-3 grid grid-cols-5 gap-2">{fotos.map((f, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                {f.type.startsWith("image/") ? <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs">PDF</div>}
                <button type="button" onClick={() => setFotos(x => x.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white text-[11px]" aria-label="Quitar">×</button>
              </div>))}</div>}
            <div className="mt-1 text-[11.5px] text-slate-500">Hasta 5 fotos por envío.</div>
            <div className="mt-4"><span className="text-[13px] font-semibold text-slate-700">¿Cuánto lleva? (opcional)</span>
              <div className="mt-1 grid grid-cols-5 gap-1.5">{[0, 25, 50, 75, 100].map(p => <button key={p} type="button" onClick={() => setAvance(avance === p ? null : p)} className={`rounded-xl py-2.5 text-sm font-bold ${avance === p ? "bg-[#3cde01] text-white" : "bg-slate-100 text-slate-700"} sobre-verde`}>{p}%</button>)}</div></div>
            <label className="mt-4 block"><span className="text-[13px] font-semibold text-slate-700">Comentario (opcional)</span><textarea value={comentario} onChange={e => setComentario(e.target.value)} rows={3} placeholder="Qué se hizo, qué falta, qué necesitas…" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[16px] outline-none focus:border-[#0073ea]" /></label>
            {msg && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{msg}</div>}
            <button type="button" onClick={enviar} disabled={enviando} className="mt-4 w-full rounded-2xl bg-[#3cde01] py-4 text-base font-bold text-white disabled:opacity-60 sobre-verde">{enviando ? "Enviando…" : "Enviar fotos"}</button>
          </div>
          <p className="mt-6 text-center text-[11px] text-slate-400">Link solo para esta actividad. Vence el {fecha(d.vence)}. No lo compartas.</p>
        </>)}
      </main>
    </div>
  );
}
