"use client";
/** Pedir fotos de avance por link a un destajista o proveedor sin usuario (desde la ficha de una actividad) · 11-Oct-2026 */
import { useState } from "react";
import { Link2, Loader2, MessageCircle, Copy } from "lucide-react";

export default function LinkEvidencia({ tareaId }: { tareaId: string }) {
  const [abierto, setAbierto] = useState(false); const [nombre, setNombre] = useState(""); const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ url: string; mensaje: string } | null>(null); const [err, setErr] = useState(""); const [copiado, setCopiado] = useState(false);
  const crear = async () => {
    setErr(""); if (!nombre.trim()) { setErr("Escribe a quién se lo mandas"); return; }
    setBusy(true);
    try { const r = await fetch(`/api/actividades/${tareaId}/link-evidencia`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre: nombre.trim() }) }); const j = await r.json(); if (!r.ok) setErr(j.error || "No se pudo crear"); else setRes({ url: j.url, mensaje: j.mensaje }); }
    catch { setErr("Sin conexión"); } finally { setBusy(false); }
  };
  if (!abierto) return <button type="button" onClick={() => setAbierto(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--d-card-2)] px-3 py-2 text-xs font-semibold text-[var(--d-text-2)]"><Link2 className="w-4 h-4" />Pedir fotos por link (destajista o proveedor)</button>;
  return (
    <div className="rounded-xl border border-[var(--d-border)] bg-[var(--d-card)] p-3">
      {res ? (<>
        <div className="text-[12.5px] font-semibold text-[var(--d-text)]">Link listo. Mándalo:</div>
        <div className="mt-1 break-all text-[12px] text-[var(--d-link)]">{res.url}</div>
        <div className="mt-2 flex gap-2">
          <a href={`https://wa.me/?text=${encodeURIComponent(res.mensaje)}`} target="_blank" rel="noreferrer" className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#25d366] px-3 py-2 text-[13px] font-bold text-white"><MessageCircle className="w-4 h-4" />WhatsApp</a>
          <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(res.mensaje); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* */ } }} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--d-card-2)] px-3 py-2 text-[13px] font-semibold text-[var(--d-text)]"><Copy className="w-4 h-4" />{copiado ? "Copiado" : "Copiar"}</button>
        </div>
        <div className="mt-1.5 text-[11px] text-[var(--d-faint)]">Sus fotos aparecen aquí en Actualizaciones y te avisamos. Vence en 14 días.</div>
      </>) : (<>
        <div className="flex gap-2">
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del destajista o proveedor" className="flex-1 min-w-0 rounded-lg border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2 text-sm text-[var(--d-text)]" />
          <button type="button" onClick={crear} disabled={busy} className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#0073ea] px-3 py-2 text-[13px] font-bold text-white disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}Crear link</button>
        </div>
        <div className="mt-1.5 text-[11px] text-[var(--d-faint)]">Abre el link sin cuenta, toma fotos, marca el avance y te llega aviso.</div>
      </>)}
      {err && <div className="mt-1 text-[12px] text-[var(--d-danger)]">{err}</div>}
    </div>
  );
}
