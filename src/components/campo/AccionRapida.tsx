"use client";
/**
 * Doménica 27 · botón "+" central: 4 acciones grandes y dictado por voz (11-Oct-2026)
 * Pensado para no saturar: una sola entrada para crear cualquier cosa; la voz arma el borrador y la persona confirma.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Package, ClipboardCheck, Camera, X, Square, RotateCcw, Check, Loader2 } from "lucide-react";
import type { VozResultado } from "@/lib/voz";

type Fase = "menu" | "lista" | "grabando" | "procesando" | "resultado";

export default function AccionRapida({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>("menu");
  const [seg, setSeg] = useState(0); const [res, setRes] = useState<VozResultado | null>(null); const [err, setErr] = useState("");
  const rec = useRef<MediaRecorder | null>(null); const chunks = useRef<Blob[]>([]); const blobRef = useRef<Blob | null>(null); const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); rec.current?.stream.getTracks().forEach(t => t.stop()); }, []);

  const ir = (href: string) => { onClose(); router.push(href); };
  const enviarAudio = async (blob: Blob, tipo?: "actividad" | "material") => {
    setFase("procesando"); setErr("");
    const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
    const fd = new FormData(); fd.append("audio", blob, `nota.${ext}`); if (tipo) fd.append("tipo", tipo);
    try { const r = await fetch("/api/voz", { method: "POST", body: fd, credentials: "include" }); const j = await r.json(); if (!r.ok) { setErr(j.error || "No se pudo"); setFase("lista"); return; } setRes(j); setFase("resultado"); }
    catch { setErr("Sin conexión. Intenta de nuevo."); setFase("lista"); }
  };
  const grabar = async () => {
    setErr("");
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
  const parar = () => { if (timer.current) clearInterval(timer.current); if (rec.current?.state === "recording") rec.current.stop(); };
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
      <div onClick={e => e.stopPropagation()} className="dom-in w-full max-w-md rounded-t-[28px] bg-[var(--d-surface)] p-5 shadow-2xl" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}>
        <div className="mx-auto -mt-2 mb-3 h-1.5 w-12 rounded-full bg-[var(--d-border)]" />
        <div className="flex items-center mb-4"><h2 className="flex-1 text-[19px] font-bold text-[var(--d-text)]">{fase === "menu" ? "¿Qué quieres hacer?" : "Dictar"}</h2><button onClick={onClose} className="p-2 -m-2 rounded-xl text-[var(--d-muted)]" aria-label="Cerrar"><X className="w-6 h-6" /></button></div>

        {fase === "menu" && (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setFase("lista")} className={`${tile} col-span-2 min-h-[92px] flex-row items-center gap-4`} style={{ background: "linear-gradient(135deg,#7e3bdd,#a25ddc)", boxShadow: "0 14px 26px -14px #7e3bdd" }}>
              <span className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center"><Mic className="w-7 h-7" /></span>
              <span><span className="block text-[17px] font-bold">Dictar por voz</span><span className="block text-[12.5px] text-white/85">Dilo y lo armamos por ti</span></span>
            </button>
            <button onClick={() => ir("/dashboard/requisiciones/requisiciones/nuevo")} className={tile} style={{ background: "linear-gradient(135deg,#0073ea,#579bfc)", boxShadow: "0 14px 26px -14px #0073ea" }}><Package className="w-7 h-7" /><span className="text-[15px] font-bold leading-tight">Pedir material</span></button>
            <button onClick={() => ir("/dashboard/actividades?nueva=1")} className={tile} style={{ background: "linear-gradient(135deg,#e8760a,#fdab3d)", boxShadow: "0 14px 26px -14px #e8760a" }}><ClipboardCheck className="w-7 h-7" /><span className="text-[15px] font-bold leading-tight">Nueva actividad</span></button>
            <button onClick={() => ir("/dashboard/campo/evidencia")} className={`${tile} col-span-2 min-h-[72px] flex-row items-center gap-3`} style={{ background: "linear-gradient(135deg,#00a35c,#00c875)", boxShadow: "0 14px 26px -14px #00a35c" }}><Camera className="w-7 h-7" /><span className="text-[15px] font-bold">Registrar una entrega</span></button>
          </div>)}

        {(fase === "lista" || fase === "grabando") && (
          <div className="flex flex-col items-center py-4">
            <button onClick={fase === "grabando" ? parar : grabar} aria-label={fase === "grabando" ? "Terminar" : "Empezar a hablar"}
              className={`relative w-32 h-32 rounded-full flex items-center justify-center text-white transition ${fase === "grabando" ? "bg-[#e2445c]" : "bg-gradient-to-br from-[#7e3bdd] to-[#a25ddc]"}`} style={{ boxShadow: fase === "grabando" ? "0 0 0 14px rgba(226,68,92,.15), 0 0 0 28px rgba(226,68,92,.07)" : "0 18px 34px -14px #7e3bdd" }}>
              {fase === "grabando" ? <Square className="w-12 h-12" fill="white" /> : <Mic className="w-14 h-14" />}
            </button>
            <div className="mt-6 text-[17px] font-bold text-[var(--d-text)]">{fase === "grabando" ? `Te escucho… ${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}` : "Toca y habla"}</div>
            <div className="mt-1 text-center text-[13px] text-[var(--d-muted)] max-w-[290px]">{fase === "grabando" ? "Toca otra vez cuando termines" : "Ej.: “Que Miguel revise la cimbra del nivel 2 el viernes” o “Necesito 20 sacos de cemento para mañana en Ruiz Cortines”"}</div>
            {err && <div className="mt-4 rounded-xl bg-[#e2445c]/10 px-3 py-2 text-sm font-semibold text-[var(--d-danger)]">{err}</div>}
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
            <button onClick={continuar} className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0073ea] to-[#579bfc] py-4 text-[16px] font-bold text-white shadow-[0_12px_26px_-12px_#0073ea]"><Check className="w-5 h-5" />Sí, revisar y enviar</button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={() => blobRef.current && enviarAudio(blobRef.current, res.tipo === "material" ? "actividad" : "material")} className="rounded-xl bg-[var(--d-card-2)] py-3 text-[13px] font-semibold text-[var(--d-text-2)]">{res.tipo === "material" ? "Era una actividad" : "Era pedir material"}</button>
              <button onClick={() => { setRes(null); setFase("lista"); }} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--d-card-2)] py-3 text-[13px] font-semibold text-[var(--d-text-2)]"><RotateCcw className="w-4 h-4" />Repetir</button>
            </div>
          </div>)}
      </div>
    </div>
  );
}
