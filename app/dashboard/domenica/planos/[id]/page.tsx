"use client";
/**
 * /dashboard/domenica/planos/[id] — Visor de plano con marcas (Doménica 27 · 11-Oct-2026)
 * Acerca/aleja, toca "Marcar" y luego el punto: queda un pin con pendiente, nota o foto (y si quieres, una actividad asignada).
 * PDFs: se dibuja la primera hoja en el teléfono (pdf.js), sin subir nada extra.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Plus, Minus, MapPin, Camera, Loader2, Check, RotateCcw, Trash2 } from "lucide-react";
import { Hoja, api, useAviso, useBase, etiqueta, campo, boton, ymdLocal } from "@/components/domenica/ui";
import { supabase } from "@/lib/supabase";

type Marca = { id: string; x: number; y: number; titulo: string; tipo: string; nota: string | null; foto_url: string | null; tarea_id: string | null; estado: string; creado_nombre: string | null; created_at: string };
type Plano = { id: string; obra_id: string | null; obra_nombre: string | null; nombre: string; url: string; tipo_archivo: string | null };
const COLOR: Record<string, string> = { PENDIENTE: "#e2445c", NOTA: "#0073ea", FOTO: "#a25ddc" };

async function pdfAImagen(url: string): Promise<string> {
  const v = "4.4.168";
  // import dinámico desde la red (sin pasar por el empaquetador)
  const importar = new Function("u", "return import(u)") as (u: string) => Promise<unknown>;
  const pdfjs = await importar(`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${v}/pdf.min.mjs`) as { getDocument: (u: string) => { promise: Promise<{ getPage: (n: number) => Promise<{ getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> } }> }> }; GlobalWorkerOptions: { workerSrc: string } };
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${v}/pdf.worker.min.mjs`;
  const doc = await pdfjs.getDocument(url).promise; const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 2 }); const c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height;
  await page.render({ canvasContext: c.getContext("2d")!, viewport: vp }).promise;
  return c.toDataURL("image/jpeg", 0.85);
}

export default function PlanoVisor() {
  const { id } = useParams<{ id: string }>(); const base = useBase(); const { flash, nodo } = useAviso();
  const [plano, setPlano] = useState<Plano | null>(null); const [marcas, setMarcas] = useState<Marca[]>([]); const [img, setImg] = useState(""); const [err, setErr] = useState("");
  const [zoom, setZoom] = useState(1); const [marcando, setMarcando] = useState(false); const [nueva, setNueva] = useState<{ x: number; y: number } | null>(null); const [ver, setVer] = useState<Marca | null>(null);
  const [verResueltas, setVerResueltas] = useState(false);
  const cargar = useCallback(async () => {
    try { const r = await api<{ plano: Plano; marcas: Marca[] }>(`/api/planos/${id}/marcas`); setPlano(r.plano); setMarcas(r.marcas);
      if (!img) { if (r.plano.tipo_archivo === "PDF" || r.plano.url.toLowerCase().endsWith(".pdf")) { try { setImg(await pdfAImagen(r.plano.url)); } catch { setErr("No se pudo abrir el PDF en este teléfono. Súbelo como foto."); } } else setImg(r.plano.url); }
    } catch (e) { setErr((e as Error).message); }
  }, [id, img]);
  useEffect(() => { cargar(); }, [cargar]);
  const tocar = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!marcando) return; const r = e.currentTarget.getBoundingClientRect();
    setNueva({ x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) }); setMarcando(false);
  };
  const visibles = marcas.filter(m => verResueltas || m.estado === "ABIERTA");
  const abiertas = marcas.filter(m => m.estado === "ABIERTA").length;

  return (
    <div className="dom-page h-full flex flex-col">
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b border-[var(--d-border)]">
        <Link href="/dashboard/domenica/planos" className="p-2 -m-1 rounded-xl text-[var(--d-link)]" aria-label="Planos"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1 min-w-0"><div className="text-[15px] font-bold text-[var(--d-text)] truncate">{plano?.nombre || "Plano"}</div><div className="text-[12px] text-[var(--d-muted)] truncate">{plano?.obra_nombre} · {abiertas} pendiente{abiertas === 1 ? "" : "s"}</div></div>
        <button onClick={() => setVerResueltas(v => !v)} className={`rounded-xl px-2.5 py-1.5 text-[12px] font-semibold ${verResueltas ? "bg-[#0073ea] text-white" : "bg-[var(--d-card-2)] text-[var(--d-text-2)]"}`}>Resueltas</button>
      </div>
      <div className="relative flex-1 overflow-auto bg-[var(--d-card-2)]">
        {err ? <div className="p-6 text-center text-[var(--d-muted)]">{err}</div> : !img ? <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--d-muted)]" /></div> : (
          <div className="relative inline-block origin-top-left" style={{ width: `${zoom * 100}%`, minWidth: "100%" }} onClick={tocar}>
            <img src={img} alt={plano?.nombre || "Plano"} className={`block w-full select-none ${marcando ? "cursor-crosshair" : ""}`} draggable={false} />
            {visibles.map(m => (
              <button key={m.id} onClick={e => { e.stopPropagation(); setVer(m); }} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }} aria-label={m.titulo}>
                <span className="block w-8 h-8 rounded-full rounded-br-none rotate-45 border-2 border-white shadow-lg flex items-center justify-center" style={{ background: m.estado === "RESUELTA" ? "#00a35c" : COLOR[m.tipo] || "#e2445c" }}>
                  <span className="-rotate-45 text-white text-[13px] font-extrabold">{m.estado === "RESUELTA" ? "✓" : m.tipo === "FOTO" ? "📷" : m.tipo === "NOTA" ? "i" : "!"}</span></span>
              </button>))}
            {nueva && <span className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e2445c] ring-4 ring-[#e2445c]/30 animate-pulse" style={{ left: `${nueva.x * 100}%`, top: `${nueva.y * 100}%` }} />}
          </div>)}
        {marcando && <div className="sticky bottom-4 left-0 right-0 mx-auto w-fit rounded-full bg-[#0f172a] px-4 py-2 text-[13px] font-semibold text-white shadow-lg">Toca el punto del plano</div>}
      </div>
      <div className="px-4 py-3 flex items-center gap-2 border-t border-[var(--d-border)] bg-[var(--d-surface)] mb-[calc(64px+env(safe-area-inset-bottom))] md:mb-0">
        <button onClick={() => setZoom(z => Math.max(1, z - 0.5))} className="w-11 h-11 rounded-xl bg-[var(--d-card-2)] flex items-center justify-center text-[var(--d-text)]" aria-label="Alejar"><Minus className="w-5 h-5" /></button>
        <button onClick={() => setZoom(z => Math.min(4, z + 0.5))} className="w-11 h-11 rounded-xl bg-[var(--d-card-2)] flex items-center justify-center text-[var(--d-text)]" aria-label="Acercar"><Plus className="w-5 h-5" /></button>
        <button onClick={() => setMarcando(m => !m)} className={`flex-1 h-11 rounded-xl inline-flex items-center justify-center gap-1.5 text-[15px] font-bold ${marcando ? "bg-[#0f172a] text-white" : "bg-gradient-to-r from-[#e2445c] to-[#ff642e] text-white"}`}><MapPin className="w-5 h-5" />{marcando ? "Cancelar" : "Marcar un punto"}</button>
      </div>
      {nueva && <NuevaMarca planoId={id} pos={nueva} emps={base.emps} onClose={() => setNueva(null)} onSaved={m => { setNueva(null); setMarcas(x => [...x, m]); flash("ok", m.tarea_id ? "Marcado y asignado" : "Marcado"); }} flash={flash} />}
      {ver && <Hoja titulo={ver.titulo} onClose={() => setVer(null)} pie={<div className="flex gap-2">
        <button onClick={async () => { try { const r = await api<{ marca: Marca }>(`/api/planos/marcas/${ver.id}`, "PATCH", { estado: ver.estado === "ABIERTA" ? "RESUELTA" : "ABIERTA" }); setMarcas(x => x.map(m => m.id === ver.id ? r.marca : m)); setVer(null); } catch (e) { flash("err", (e as Error).message); } }} className={`${boton} flex-1 py-3`}>{ver.estado === "ABIERTA" ? <><Check className="w-4 h-4" />Ya quedó</> : <><RotateCcw className="w-4 h-4" />Reabrir</>}</button>
        <button onClick={async () => { if (!window.confirm("¿Quitar esta marca?")) return; try { await api(`/api/planos/marcas/${ver.id}`, "DELETE"); setMarcas(x => x.filter(m => m.id !== ver.id)); setVer(null); } catch (e) { flash("err", (e as Error).message); } }} className="rounded-xl bg-[#e2445c]/10 px-4 text-[var(--d-danger)]" aria-label="Quitar"><Trash2 className="w-5 h-5" /></button></div>}>
        <div className="text-[12.5px] text-[var(--d-muted)]">{ver.tipo === "PENDIENTE" ? "Pendiente" : ver.tipo === "NOTA" ? "Nota" : "Foto"} · {ver.creado_nombre} · {new Date(ver.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</div>
        {ver.nota && <p className="mt-2 text-[15px] text-[var(--d-text)]">{ver.nota}</p>}
        {ver.foto_url && <img src={ver.foto_url} alt="" className="mt-3 w-full rounded-2xl" />}
        {ver.tarea_id && <Link href={`/dashboard/actividades?abrir=${ver.tarea_id}`} className="mt-3 block rounded-xl bg-[var(--d-card-2)] px-4 py-3 text-[14px] font-semibold text-[var(--d-link)]">Ver la actividad asignada →</Link>}
      </Hoja>}
      {nodo}
    </div>
  );
}

function NuevaMarca({ planoId, pos, emps, onClose, onSaved, flash }: { planoId: string; pos: { x: number; y: number }; emps: { id: string; full_name: string }[]; onClose: () => void; onSaved: (m: Marca) => void; flash: (t: "ok" | "err", m: string) => void }) {
  const [tipo, setTipo] = useState("PENDIENTE"); const [titulo, setTitulo] = useState(""); const [nota, setNota] = useState(""); const [foto, setFoto] = useState<string | null>(null);
  const [asignar, setAsignar] = useState(""); const [fecha, setFecha] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 2); return ymdLocal(d); }); const [busy, setBusy] = useState(false); const [subiendo, setSubiendo] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const guardar = async () => { setBusy(true); try { const r = await api<{ marca: Marca }>(`/api/planos/${planoId}/marcas`, "POST", { ...pos, tipo, titulo, nota, foto_url: foto, asignar_a: tipo === "PENDIENTE" ? asignar : null, fecha }); onSaved(r.marca); } catch (e) { flash("err", (e as Error).message); } finally { setBusy(false); } };
  return (
    <Hoja titulo="¿Qué hay en este punto?" onClose={onClose} pie={<button onClick={guardar} disabled={busy} className={`${boton} w-full py-3`}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Guardar marca</button>}>
      <div className="grid grid-cols-3 gap-2">{[["PENDIENTE", "❗ Pendiente"], ["NOTA", "ℹ️ Nota"], ["FOTO", "📷 Foto"]].map(([k, l]) => <button key={k} type="button" onClick={() => setTipo(k)} className={`rounded-xl py-3 text-[14px] font-bold ${tipo === k ? "text-white" : "bg-[var(--d-card-2)] text-[var(--d-text-2)]"}`} style={tipo === k ? { background: COLOR[k] } : undefined}>{l}</button>)}</div>
      <label className="block mt-4"><span className={etiqueta}>¿Qué es?</span><input autoFocus value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej. Falta resane en muro norte" className={campo} /></label>
      <label className="block mt-3"><span className={etiqueta}>Detalle (opcional)</span><textarea value={nota} onChange={e => setNota(e.target.value)} rows={2} className={campo} /></label>
      <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" onChange={async e => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; setSubiendo(true); try { const path = `planos/marcas/${Date.now()}.jpg`; const { error } = await supabase.storage.from("expedientes").upload(path, f, { contentType: f.type || "image/jpeg" }); if (error) throw new Error(error.message); setFoto(supabase.storage.from("expedientes").getPublicUrl(path).data.publicUrl); } catch (er) { flash("err", (er as Error).message); } finally { setSubiendo(false); } }} />
      <button type="button" onClick={() => ref.current?.click()} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[var(--d-card-2)] px-4 py-2.5 text-[13px] font-semibold text-[var(--d-text)]">{subiendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}{foto ? "Cambiar foto" : "Agregar foto"}</button>
      {foto && <img src={foto} alt="" className="mt-2 h-28 rounded-xl" />}
      {tipo === "PENDIENTE" && <div className="mt-4 rounded-2xl border border-[var(--d-border)] p-3">
        <span className={etiqueta}>¿Quién lo resuelve? (opcional, crea la actividad)</span>
        <select value={asignar} onChange={e => setAsignar(e.target.value)} className={campo}><option value="">Nadie por ahora</option>{emps.map(x => <option key={x.id} value={x.id}>{x.full_name}</option>)}</select>
        {asignar && <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={campo} />}
      </div>}
    </Hoja>
  );
}
