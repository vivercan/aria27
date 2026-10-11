"use client";
/**
 * /dashboard/campo/pregunta — Pregúntale a Doménica (11-Oct-2026)
 * Preguntas en lenguaje normal sobre tus obras, actividades y solicitudes. Contesta corto y te da 1-3 botones para ir directo.
 * Solo lee datos; para crear algo se usa el botón +.
 */
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mic, Send, Square, ChevronRight } from "lucide-react";
import { Ficha, IcoPregunta } from "@/components/domenica/IconosObra";
import { api } from "@/components/domenica/ui";

type Msg = { q: string; a?: string; acciones?: { label: string; href: string }[]; err?: string };
type Reco = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null };
const crearReco = (): Reco | null => { if (typeof window === "undefined") return null; const W = window as unknown as { SpeechRecognition?: new () => Reco; webkitSpeechRecognition?: new () => Reco }; const C = W.SpeechRecognition || W.webkitSpeechRecognition; return C ? new C() : null; };

const SUGERENCIAS = ["¿Qué me toca hoy?", "¿Qué está atrasado?", "¿Qué falta por autorizar?", "¿Cómo va la obra Tanque?"];

export default function PreguntaPage() {
  return <Suspense fallback={null}><Pregunta /></Suspense>;
}

function Pregunta() {
  const sp = useSearchParams();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState(""); const [busy, setBusy] = useState(false);
  const [oyendo, setOyendo] = useState(false); const reco = useRef<Reco | null>(null);
  const fin = useRef<HTMLDivElement>(null); const primera = useRef(false);
  const msgsRef = useRef<Msg[]>([]); useEffect(() => { msgsRef.current = msgs; }, [msgs]);

  const preguntar = useCallback(async (q: string) => {
    const p = q.trim(); if (!p || busy) return;
    setTexto(""); setBusy(true);
    const historial = msgsRef.current.filter(x => x.a).map(x => ({ q: x.q, a: x.a || "" }));
    setMsgs(m => [...m, { q: p }]);
    try {
      const r = await api<{ respuesta: string; acciones: { label: string; href: string }[] }>("/api/domenica/pregunta", "POST", { pregunta: p, historial });
      setMsgs(m => m.map((x, i) => i === m.length - 1 ? { ...x, a: r.respuesta, acciones: r.acciones } : x));
    } catch (e) { setMsgs(m => m.map((x, i) => i === m.length - 1 ? { ...x, err: (e as Error).message } : x)); }
    finally { setBusy(false); }
  }, [busy]);

  // Si llegó desde el botón + con la pregunta ya dicha
  useEffect(() => { const q = sp.get("q"); if (q && !primera.current) { primera.current = true; preguntar(q); } }, [sp, preguntar]);
  useEffect(() => { fin.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, busy]);

  const hablar = () => {
    if (oyendo) { reco.current?.stop(); return; }
    const rc = crearReco(); if (!rc) { setMsgs(m => [...m, { q: "Hablar", err: "Este teléfono no deja dictar aquí. Escríbelo abajo." }]); return; }
    let final = ""; rc.lang = "es-MX"; rc.continuous = false; rc.interimResults = true;
    rc.onresult = e => { let t = ""; final = ""; for (let i = 0; i < e.results.length; i++) { t += e.results[i][0].transcript; if (e.results[i].isFinal) final += e.results[i][0].transcript; } setTexto(t); };
    rc.onerror = () => setOyendo(false);
    rc.onend = () => { setOyendo(false); reco.current = null; if (final.trim()) preguntar(final); };
    reco.current = rc; try { rc.start(); setOyendo(true); try { navigator.vibrate?.(25); } catch { /* */ } } catch { setOyendo(false); }
  };

  return (
    <div className="dom-page h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-40 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Ficha ico={IcoPregunta} color="#6d35c9" size="lg" />
            <div><h1 className="text-[22px] font-bold text-[var(--d-text)] leading-tight">Pregúntale a Doménica</h1><p className="text-[13px] text-[var(--d-muted)]">Sobre tus obras, actividades y solicitudes.</p></div>
          </div>

          {msgs.length === 0 && (
            <div className="mt-6 grid grid-cols-2 gap-2">
              {SUGERENCIAS.map(s => <button key={s} onClick={() => preguntar(s)} className="dom-card rounded-2xl px-3.5 py-3 text-left text-[14px] font-semibold text-[var(--d-text)] active:scale-[0.98] transition">{s}</button>)}
            </div>
          )}

          <div className="mt-5 space-y-4">
            {msgs.map((m, i) => (
              <div key={i} className="dom-in space-y-2">
                <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#0073ea] px-3.5 py-2.5 text-[15px] text-white">{m.q}</div></div>
                {m.a ? (
                  <div className="flex gap-2 items-end">
                    <Ficha ico={IcoPregunta} color="#6d35c9" size="sm" />
                    <div className="max-w-[85%]">
                      <div className="dom-card rounded-2xl rounded-bl-md px-3.5 py-2.5 text-[15px] leading-relaxed text-[var(--d-text)] whitespace-pre-line">{m.a}</div>
                      {!!m.acciones?.length && <div className="mt-2 flex flex-wrap gap-1.5">{m.acciones.map(a => <Link key={a.href} href={a.href} className="inline-flex items-center gap-0.5 rounded-full bg-[#6d35c9] px-3 py-1.5 text-[13px] font-semibold text-white">{a.label}<ChevronRight className="w-3.5 h-3.5" /></Link>)}</div>}
                    </div>
                  </div>
                ) : m.err ? <div className="text-[13px] font-semibold text-[var(--d-danger)] px-1">{m.err}</div>
                  : <div className="flex gap-2 items-center"><Ficha ico={IcoPregunta} color="#6d35c9" size="sm" /><span className="dom-card rounded-2xl px-4 py-3 inline-flex gap-1">{[0, 1, 2].map(k => <span key={k} className="w-2 h-2 rounded-full bg-[#6d35c9] animate-bounce" style={{ animationDelay: `${k * 120}ms` }} />)}</span></div>}
              </div>
            ))}
            <div ref={fin} />
          </div>
        </div>
      </div>

      {/* Barra para escribir o hablar (arriba de la barra de abajo) */}
      <div className="fixed left-0 right-0 z-30 px-3" style={{ bottom: "calc(5.4rem + env(safe-area-inset-bottom))" }}>
        <form onSubmit={e => { e.preventDefault(); preguntar(texto); }} className="max-w-2xl mx-auto flex items-center gap-2 rounded-2xl bg-[var(--d-card)] p-1.5 shadow-[0_8px_24px_-10px_rgba(15,23,42,.35)] border border-[var(--d-border)]">
          <button type="button" onClick={hablar} aria-label={oyendo ? "Terminar" : "Hablar"} className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-white ${oyendo ? "bg-[#d0304a]" : "bg-[#6d35c9]"}`}>{oyendo ? <Square className="w-5 h-5" fill="white" /> : <Mic className="w-5 h-5" />}</button>
          <input value={texto} onChange={e => setTexto(e.target.value)} placeholder={oyendo ? "Te escucho…" : "Escribe tu pregunta"} className="flex-1 min-w-0 bg-transparent px-1 text-[16px] text-[var(--d-text)] outline-none" />
          <button type="submit" disabled={!texto.trim() || busy} aria-label="Preguntar" className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-[#0073ea] text-white disabled:bg-[var(--d-card-2)] disabled:text-[var(--d-faint)]"><Send className="w-5 h-5" /></button>
        </form>
      </div>
    </div>
  );
}
