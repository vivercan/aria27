"use client";
/**
 * Doménica 27 · botón "+" central: 4 acciones grandes y dictado por voz (11-Oct-2026)
 * Pensado para no saturar: una sola entrada para crear cualquier cosa; la voz arma el borrador y la persona confirma.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, X, Square, RotateCcw, Check, Loader2 } from "lucide-react";
import type { VozResultado } from "@/lib/voz";
import { interpretar } from "@/lib/comandos-voz";
import { celebrar } from "@/lib/celebrar";
import { IcoMicro, IcoSaco, IcoTarea, IcoCamion } from "@/components/domenica/IconosObra";

type Fase = "menu" | "lista" | "grabando" | "procesando" | "resultado" | "escribir" | "pendientes";
type Pend = { titulo: string; fecha: string; hora: string | null; obra_id: string | null; obra: string | null; prioridad: string; quitar?: boolean };
const diaCorto = (f: string) => { const d = new Date(f + "T12:00:00"); const h = new Date(); h.setHours(12, 0, 0, 0); const dd = Math.round((d.getTime() - h.getTime()) / 864e5); return dd === 0 ? "Hoy" : dd === 1 ? "Mañana" : d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" }); };
// Reconocimiento de voz del propio teléfono (gratis, ve las palabras mientras hablas). Si no existe, se graba audio.
type Reco = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null };
const crearReco = (): Reco | null => { if (typeof window === "undefined") return null; const W = window as unknown as { SpeechRecognition?: new () => Reco; webkitSpeechRecognition?: new () => Reco }; const C = W.SpeechRecognition || W.webkitSpeechRecognition; return C ? new C() : null; };

export default function AccionRapida({ onClose, auto = false }: { onClose: () => void; auto?: boolean }) {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>(auto ? "lista" : "menu");
  // Modo "anota mis pendientes": lo que digas se separa en pendientes con fecha y se va a tu agenda
  const [modoPend, setModoPend] = useState(false); const [pends, setPends] = useState<Pend[]>([]); const [guardando, setGuardando] = useState(false); const [aviso, setAviso] = useState("");
  const modoPendRef = useRef(false); useEffect(() => { modoPendRef.current = modoPend; }, [modoPend]);
  // Evita el "toque fantasma": el mismo toque que abrió la hoja no debe elegir el botón que quedó debajo del dedo
  const abiertoEn = useRef(0); useEffect(() => { abiertoEn.current = Date.now(); }, []);
  const [seg, setSeg] = useState(0); const [res, setRes] = useState<VozResultado | null>(null); const [err, setErr] = useState("");
  const [vivo, setVivo] = useState(""); const [escrito, setEscrito] = useState(""); const reco = useRef<Reco | null>(null); const textoRef = useRef("");
  const rec = useRef<MediaRecorder | null>(null); const chunks = useRef<Blob[]>([]); const blobRef = useRef<Blob | null>(null); const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); rec.current?.stream.getTracks().forEach(t => t.stop()); }, []);

  const ir = (href: string) => { onClose(); router.push(href); };
  const enviarTexto = async (texto: string, tipo?: "actividad" | "material") => {
    if (!texto.trim()) { setErr("No se escuchó nada. Intenta otra vez."); setFase("lista"); return; }
    if (!tipo && modoPendRef.current) { entenderPendientes(texto); return; }
    if (!tipo) {
      // Lo simple se resuelve sin IA, al instante
      const c = interpretar(texto);
      if (c.tipo === "ir") { setAviso(c.aviso); setTimeout(() => ir(c.href), 450); return; }
      if (c.tipo === "pregunta") { ir(`/dashboard/campo/pregunta?q=${encodeURIComponent(texto.slice(0, 400))}`); return; }
      if (c.tipo === "pendientes") { if (c.texto) { setModoPend(true); entenderPendientes(c.texto); } else { setModoPend(true); setFase("lista"); setTimeout(() => grabarRef.current?.(), 350); } return; }
      if (c.pista) tipo = c.pista;
    }
    setFase("procesando"); setErr(""); textoRef.current = texto;
    const fd = new FormData(); fd.append("texto", texto); if (tipo) fd.append("tipo", tipo);
    try { const r = await fetch("/api/voz", { method: "POST", body: fd, credentials: "include" }); const j = await r.json(); if (!r.ok) { setErr(j.error || "No se pudo"); setFase("lista"); return; } setRes(j); setFase("resultado"); }
    catch { setErr("Sin conexión. Intenta de nuevo."); setFase("lista"); }
  };
  const entenderPendientes = async (texto: string) => {
    setFase("procesando"); setErr("");
    try {
      const r = await fetch("/api/voz/pendientes", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "entender", texto }) });
      const j = await r.json(); if (!r.ok) { setErr(j.error || "No se pudo"); setFase("lista"); return; }
      setPends(p => [...p, ...((j.pendientes || []) as Pend[])]); setFase("pendientes");
    } catch { setErr("Sin conexión. Intenta de nuevo."); setFase("lista"); }
  };
  const guardarPendientes = async () => {
    const lista = pends.filter(p => !p.quitar); if (!lista.length) return;
    setGuardando(true); setErr("");
    try {
      const r = await fetch("/api/voz/pendientes", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "guardar", pendientes: lista }) });
      const j = await r.json(); if (!r.ok) { setErr(j.error || "No se pudo guardar"); return; }
      celebrar(); setAviso(`${j.creados} pendiente${j.creados === 1 ? "" : "s"} en tu agenda`); setTimeout(() => ir("/dashboard/campo/calendario"), 900);
    } catch { setErr("Sin conexión. Intenta de nuevo."); } finally { setGuardando(false); }
  };
  const enviarAudio = async (blob: Blob, tipo?: "actividad" | "material") => {
    setFase("procesando"); setErr("");
    const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
    const fd = new FormData(); fd.append("audio", blob, `nota.${ext}`); if (tipo) fd.append("tipo", tipo);
    try { const r = await fetch("/api/voz", { method: "POST", body: fd, credentials: "include" }); const j = await r.json(); if (!r.ok) { setErr(j.error || "No se pudo"); setFase("lista"); return; } setRes(j); setFase("resultado"); }
    catch { setErr("Sin conexión. Intenta de nuevo."); setFase("lista"); }
  };
  const grabar = async () => {
    setErr(""); setVivo("");
    const rc = crearReco();
    if (rc) {
      let final = "";
      rc.lang = "es-MX"; rc.continuous = true; rc.interimResults = true;
      rc.onresult = e => { let parcial = ""; final = ""; for (let i = 0; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) final += t + " "; else parcial += t; } setVivo((final + parcial).trim()); };
      rc.onerror = e => { if (e.error === "not-allowed" || e.error === "service-not-allowed") { setErr("Permite el micrófono para dictar (en Ajustes del navegador)."); setFase("lista"); } };
      rc.onend = () => { if (timer.current) clearInterval(timer.current); const t = (final || "").trim() || vivoRef.current; reco.current = null; if (t) enviarTexto(t); else setFase(f => (f === "grabando" ? "lista" : f)); };
      reco.current = rc;
      try { rc.start(); setSeg(0); setFase("grabando"); try { navigator.vibrate?.(30); } catch { /* */ } timer.current = setInterval(() => setSeg(x => { if (x >= 119) { parar(); return x; } return x + 1; }), 1000); return; } catch { reco.current = null; }
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tipos = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg"]; const mime = tipos.find(t => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); chunks.current = [];
      r.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data); };
      r.onstop = () => { stream.getTracks().forEach(t => t.stop()); const b = new Blob(chunks.current, { type: r.mimeType || "audio/webm" }); blobRef.current = b; enviarAudio(b); };
      rec.current = r; r.start(); setSeg(0); setFase("grabando");
      try { navigator.vibrate?.(30); } catch { /* */ }
      timer.current = setInterval(() => setSeg(s => { if (s >= 119) { parar(); return s; } return s + 1; }), 1000);
    } catch { setErr("Permite el micrófono para dictar (en Ajustes del navegador)."); setFase("lista"); }
  };
  const grabarRef = useRef<(() => void) | null>(null); useEffect(() => { grabarRef.current = grabar; });
  // Desde el micrófono de Inicio: empieza a escuchar sin pasos extra
  useEffect(() => { if (auto) { const t = setTimeout(() => grabarRef.current?.(), 60); return () => clearTimeout(t); } }, [auto]);
  const parar = () => { if (timer.current) clearInterval(timer.current); if (reco.current) { reco.current.stop(); return; } if (rec.current?.state === "recording") rec.current.stop(); };
  const vivoRef = useRef(""); useEffect(() => { vivoRef.current = vivo; }, [vivo]);
  const continuar = () => {
    if (!res) return;
    if (res.tipo === "material" && res.material) {
      const m = res.material; const p = new URLSearchParams({ tipo: "MATERIALES" });
      if (m.obra) p.set("obra", m.obra); if (m.fecha_requerida) p.set("fecha", m.fecha_requerida); if (m.prioridad) p.set("prioridad", m.prioridad); if (m.comentarios) p.set("comentarios", m.comentarios);
      p.set("mats", JSON.stringify(m.materiales.map(x => ({ name: x.name, qty: x.qty, unit: x.unit, observations: x.observations || "" }))));
      ir(`/dashboard/requisiciones/requisiciones/nuevo?${p.toString()}`);
    } else {
      try { sessionStorage.setItem("dom:voz", JSON.stringify(res.actividad || { titulo: res.texto })); } catch { /* */ }
      ir("/dashboard/actividades?nueva=1&voz=1");
    }
  };

  const tile = "rounded-3xl p-4 min-h-[112px] flex flex-col justify-between text-left text-white active:scale-[0.97] transition";
  return (
    <div className="aria-sheet fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-[2px]" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} onClickCapture={e => { if (Date.now() - abiertoEn.current < 400) { e.stopPropagation(); e.preventDefault(); } }} className="dom-in w-full max-w-md rounded-t-[28px] bg-[var(--d-surface)] p-5 shadow-2xl" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}>
        <div className="mx-auto -mt-2 mb-3 h-1.5 w-12 rounded-full bg-[var(--d-border)]" />
        <div className="flex items-center mb-4"><h2 className="flex-1 text-[19px] font-bold text-[var(--d-text)]">{fase === "menu" ? "¿Qué quieres hacer?" : fase === "escribir" ? "Escríbelo" : fase === "resultado" ? "¿Así está bien?" : fase === "pendientes" ? "Tus pendientes" : modoPend ? "Dicta tus pendientes" : "Habla con Doménica"}</h2><button onClick={onClose} className="p-2 -m-2 rounded-xl text-[var(--d-muted)]" aria-label="Cerrar"><X className="w-6 h-6" /></button></div>

        {fase === "menu" && (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setFase("lista")} className={`${tile} col-span-2 min-h-[92px] flex-row items-center gap-4`} style={{ background: "#6d35c9" }}>
              <span className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center"><IcoMicro className="w-7 h-7" color="#fff" /></span>
              <span><span className="block text-[17px] font-bold">Habla con Doménica</span><span className="block text-[12.5px] text-white/90">Pide, asigna o pregunta. Ella lo arma.</span></span>
            </button>
            <button onClick={() => ir("/dashboard/requisiciones/requisiciones/nuevo")} className={tile} style={{ background: "#0073ea" }}><IcoSaco className="w-8 h-8" color="#fff" /><span className="text-[15px] font-bold leading-tight">Pedir material</span></button>
            <button onClick={() => ir("/dashboard/actividades?nueva=1")} className={tile} style={{ background: "#e8760a" }}><IcoTarea className="w-8 h-8" color="#fff" /><span className="text-[15px] font-bold leading-tight">Nueva actividad</span></button>
            <button onClick={() => ir("/dashboard/campo/evidencia")} className={`${tile} col-span-2 min-h-[72px] flex-row items-center gap-3`} style={{ background: "#3cde01" }}><IcoCamion className="w-8 h-8" color="#fff" /><span className="text-[15px] font-bold">Registrar una entrega</span></button>
          </div>)}

        {(fase === "lista" || fase === "grabando") && (
          <div className="flex flex-col items-center py-4">
            <button onClick={fase === "grabando" ? parar : grabar} aria-label={fase === "grabando" ? "Terminar" : "Empezar a hablar"}
              className={`relative w-32 h-32 rounded-full flex items-center justify-center text-white transition ${fase === "grabando" ? "bg-[#e2445c]" : "bg-[#6d35c9]"}`} style={{ boxShadow: fase === "grabando" ? "0 0 0 14px rgba(226,68,92,.15), 0 0 0 28px rgba(226,68,92,.07)" : "0 14px 26px -16px #6d35c9" }}>
              {fase === "grabando" ? <Square className="w-12 h-12" fill="white" /> : <Mic className="w-14 h-14" />}
            </button>
            <div className="mt-6 text-[17px] font-bold text-[var(--d-text)]">{fase === "grabando" ? `Te escucho… ${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}` : "Toca y habla"}</div>
            {fase === "grabando" && vivo && <div className="mt-3 w-full rounded-2xl bg-[var(--d-card-2)] px-4 py-3 text-[15px] text-[var(--d-text)]">“{vivo}”</div>}
            <div className="mt-1 text-center text-[13px] text-[var(--d-muted)] max-w-[300px]">{fase === "grabando" ? "Toca otra vez cuando termines" : modoPend ? "Ej.: “Mañana a las 10 llamo a Miguel, el viernes reviso los planos de Tanque y pago la renta el lunes”" : "Ej.: “Ayúdame a hacer una requisición”, “Anota mis pendientes”, “Abre mi agenda” o “¿Qué está atrasado en Tanque?”"}</div>
            {err && <div className="mt-4 rounded-xl bg-[#e2445c]/10 px-3 py-2 text-sm font-semibold text-[var(--d-danger)]">{err}</div>}
            {fase === "lista" && <button type="button" onClick={() => setFase("escribir")} className="mt-5 text-[14px] font-semibold text-[var(--d-link)]">Prefiero escribirlo</button>}
          </div>)}

        {fase === "escribir" && (
          <div>
            <textarea autoFocus value={escrito} onChange={e => setEscrito(e.target.value)} rows={4} placeholder="Ej.: Necesito 20 sacos de cemento para Ruiz Cortines · ¿Qué me toca hoy?" className="w-full rounded-2xl border border-[var(--d-border)] bg-[var(--d-input)] px-4 py-3 text-[16px] text-[var(--d-text)] outline-none" />
            <button type="button" onClick={() => enviarTexto(escrito)} className="mt-3 w-full rounded-2xl bg-[#6d35c9] py-4 text-[16px] font-bold text-white">Listo, que lo arme</button>
            <button type="button" onClick={() => setFase("lista")} className="mt-2 w-full py-2 text-[13px] font-semibold text-[var(--d-muted)]">Mejor dictarlo</button>
          </div>)}

        {aviso && <div className="mb-3 rounded-2xl bg-[#0073ea] px-4 py-3 text-center text-[15px] font-bold text-white">{aviso}</div>}

        {fase === "pendientes" && (
          <div>
            <ul className="space-y-2 max-h-[45vh] overflow-y-auto">
              {pends.map((p, i) => (
                <li key={i} className={`flex items-start gap-3 rounded-2xl border border-[var(--d-border)] p-3 ${p.quitar ? "opacity-40" : ""}`}>
                  <button type="button" onClick={() => setPends(x => x.map((y, k) => k === i ? { ...y, quitar: !y.quitar } : y))} aria-label={p.quitar ? "Volver a incluir" : "Quitar"} className={`mt-0.5 shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${p.quitar ? "border-2 border-[var(--d-border)]" : "bg-[#3cde01]"}`}>{!p.quitar && <Check className="w-4 h-4 text-white" strokeWidth={3} />}</button>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-[var(--d-text)] leading-snug">{p.titulo}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[12px] font-semibold">
                      <span className="rounded-md bg-[#0073ea] px-2 py-0.5 text-white">{diaCorto(p.fecha)}{p.hora ? ` · ${p.hora}` : ""}</span>
                      {p.obra && <span className="rounded-md bg-[var(--d-card-2)] px-2 py-0.5 text-[var(--d-text-2)]">{p.obra}</span>}
                      {(p.prioridad === "URGENTE" || p.prioridad === "ALTA") && <span className="rounded-md bg-[#e2445c] px-2 py-0.5 text-white">{p.prioridad === "URGENTE" ? "Urgente" : "Alta"}</span>}
                    </div>
                  </div>
                </li>))}
            </ul>
            {err && <div className="mt-3 rounded-xl bg-[#e2445c] px-3 py-2 text-sm font-semibold text-white">{err}</div>}
            <button onClick={guardarPendientes} disabled={guardando || !pends.some(p => !p.quitar)} className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#3cde01] py-4 text-[16px] font-bold text-white disabled:opacity-50">{guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" strokeWidth={3} />}Guardar {pends.filter(p => !p.quitar).length} en mi agenda</button>
            <button onClick={() => { setFase("lista"); setTimeout(() => grabarRef.current?.(), 200); }} className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--d-card-2)] py-3 text-[14px] font-semibold text-[var(--d-text-2)]"><Mic className="w-4 h-4" />Agregar más por voz</button>
          </div>)}

        {fase === "procesando" && <div className="flex flex-col items-center py-10"><Loader2 className="w-10 h-10 animate-spin text-[#a25ddc]" /><div className="mt-4 text-[16px] font-bold text-[var(--d-text)]">Entendiendo lo que dijiste…</div></div>}

        {fase === "resultado" && res && (
          <div>
            <div className="rounded-2xl bg-[var(--d-card-2)] p-3 text-[14px] italic text-[var(--d-text-2)]">“{res.texto}”</div>
            <div className="mt-3 rounded-2xl border-2 border-[#a25ddc]/40 p-4">
              <div className="text-[12px] font-bold uppercase tracking-wide text-[var(--d-purple)]">{res.tipo === "material" ? "Vas a pedir material" : "Vas a crear una actividad"}</div>
              {res.tipo === "material" && res.material ? (<>
                <ul className="mt-2 space-y-1">{res.material.materiales.slice(0, 6).map((m, i) => <li key={i} className="text-[15px] text-[var(--d-text)]"><b>{m.qty} {m.unit}</b> · {m.name}</li>)}</ul>
                <div className="mt-2 text-[12.5px] text-[var(--d-muted)]">{res.material.obra || "Obra por elegir"}{res.material.fecha_requerida ? ` · para ${res.material.fecha_requerida.split("-").reverse().join("/")}` : ""}</div>
              </>) : (<>
                <div className="mt-1 text-[17px] font-bold text-[var(--d-text)]">{res.actividad?.titulo}</div>
                <div className="mt-1 text-[12.5px] text-[var(--d-muted)]">{[res.actividad?.persona ? `Para ${res.actividad.persona}` : null, res.actividad?.obra, res.actividad?.fecha ? `entrega ${res.actividad.fecha.split("-").reverse().join("/")}` : null].filter(Boolean).join(" · ") || "Completa quién y cuándo en el siguiente paso"}</div>
              </>)}
            </div>
            <button onClick={continuar} className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0073ea] py-4 text-[16px] font-bold text-white"><Check className="w-5 h-5" />Sí, revisar y enviar</button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={() => { const otro = res.tipo === "material" ? "actividad" : "material"; if (res.texto) enviarTexto(res.texto, otro); else if (blobRef.current) enviarAudio(blobRef.current, otro); }} className="rounded-xl bg-[var(--d-card-2)] py-3 text-[13px] font-semibold text-[var(--d-text-2)]">{res.tipo === "material" ? "Era una actividad" : "Era pedir material"}</button>
              <button onClick={() => { setRes(null); setFase("lista"); }} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--d-card-2)] py-3 text-[13px] font-semibold text-[var(--d-text-2)]"><RotateCcw className="w-4 h-4" />Repetir</button>
            </div>
          </div>)}
      </div>
    </div>
  );
}
