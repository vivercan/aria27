"use client";
/**
 * /dashboard/domenica/obras/[id]/fotos — Avance en fotos (Doménica 27 · 11-Oct-2026)
 * Todas las fotos de la obra por día (avance, actividades, entregas, planos, bitácora).
 * "Antes y ahora": fotos del mismo punto (ej. "Fachada norte") para comparar deslizando.
 * Tomar foto de avance: cámara → ¿de qué punto? → listo.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { Ficha, IcoCamara, IcoComparar } from "@/components/domenica/IconosObra";
import { Hoja, api, useAviso } from "@/components/domenica/ui";
import { Esqueleto } from "@/components/domenica/Esqueleto";
import { Vacio } from "@/components/domenica/Vacio";
import Comparar from "@/components/domenica/Comparar";
import { supabase } from "@/lib/supabase";
import { guardarPendiente, esSinSenal } from "@/lib/cola-offline";

type Foto = { url: string; fecha: string; de: string; punto: string | null; fuente: string };
const ETIQ: Record<string, string> = { avance: "Avance", actividad: "Actividad", entrega: "Entrega", plano: "Plano", bitacora: "Bitácora" };
const dia = (f: string) => new Date(f).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Mexico_City" });
const corta = (f: string) => new Date(f).toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "America/Mexico_City" });

async function comprimir(file: File, max = 1800, q = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  const url = URL.createObjectURL(file); const img = new Image(); img.src = url; await img.decode();
  const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
  return await new Promise<Blob>(res => c.toBlob(b => res(b || file), "image/jpeg", q));
}

export default function FotosObra() {
  const { id } = useParams<{ id: string }>(); const { flash, nodo } = useAviso();
  const [d, setD] = useState<{ obra: { nombre: string }; fotos: Foto[]; puntos: string[] } | null>(null);
  const [ver, setVer] = useState<Foto | null>(null); const [comparar, setComparar] = useState<[Foto, Foto] | null>(null);
  const [elegir, setElegir] = useState(false); const [sel, setSel] = useState<Foto[]>([]);
  const [nueva, setNueva] = useState<File | null>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const cargar = useCallback(async () => { try { setD(await api(`/api/obras/${id}/fotos`)); } catch (e) { flash("err", (e as Error).message); setD({ obra: { nombre: "" }, fotos: [], puntos: [] }); } }, [id, flash]);
  useEffect(() => { cargar(); }, [cargar]);

  const porDia = useMemo(() => { const m = new Map<string, Foto[]>(); for (const f of d?.fotos || []) { const k = dia(f.fecha); (m.get(k) || m.set(k, []).get(k)!).push(f); } return [...m.entries()]; }, [d]);
  // Antes y ahora por punto: la más vieja contra la más nueva del mismo punto
  const parejas = useMemo(() => (d?.puntos || []).map(p => { const fs = (d?.fotos || []).filter(f => f.fuente === "avance" && f.punto === p); return fs.length >= 2 ? { punto: p, antes: fs[fs.length - 1], ahora: fs[0], n: fs.length } : null; }).filter(Boolean) as { punto: string; antes: Foto; ahora: Foto; n: number }[], [d]);

  const tocar = (f: Foto) => {
    if (!elegir) { setVer(f); return; }
    setSel(s => { const ya = s.find(x => x.url === f.url); const n = ya ? s.filter(x => x.url !== f.url) : [...s, f].slice(-2);
      if (n.length === 2) { const [a, b] = [...n].sort((x, y) => Date.parse(x.fecha) - Date.parse(y.fecha)); setComparar([a, b]); setElegir(false); return []; }
      return n; });
  };

  return (
    <div className="dom-page h-full overflow-y-auto">
      <div className="px-4 pt-4 pb-32 max-w-3xl mx-auto">
        <Link href={`/dashboard/domenica/obras/${id}`} className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--d-link)]"><ArrowLeft className="w-4 h-4" />{d?.obra.nombre || "Obra"}</Link>
        <div className="mt-2 flex items-center gap-3">
          <Ficha ico={IcoCamara} color="#c85f08" size="lg" />
          <div className="flex-1 min-w-0"><h1 className="text-[22px] font-bold text-[var(--d-text)] leading-tight">Avance en fotos</h1><p className="text-[13px] text-[var(--d-muted)]">{d ? `${d.fotos.length} fotos` : "Cargando…"}</p></div>
        </div>

        <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0] || null; e.target.value = ""; if (f) setNueva(f); }} />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => camRef.current?.click()} className="rounded-2xl bg-[#c85f08] py-3.5 text-[15px] font-bold text-white inline-flex items-center justify-center gap-2"><IcoCamara className="w-5 h-5" color="#fff" fondo="#c85f08" />Tomar foto</button>
          <button onClick={() => { setElegir(e => !e); setSel([]); }} disabled={(d?.fotos.length || 0) < 2} className={`rounded-2xl py-3.5 text-[15px] font-bold inline-flex items-center justify-center gap-2 disabled:opacity-40 ${elegir ? "bg-[#0f172a] text-white" : "bg-[var(--d-card)] text-[var(--d-text)] border border-[var(--d-border)]"}`}><IcoComparar className="w-5 h-5" color={elegir ? "#fff" : "#0073ea"} />{elegir ? `Elige ${2 - sel.length} foto${2 - sel.length === 1 ? "" : "s"}` : "Comparar"}</button>
        </div>

        {parejas.length > 0 && !elegir && (
          <section className="mt-5">
            <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-[var(--d-faint)]">Antes y ahora</h2>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
              {parejas.map(p => (
                <button key={p.punto} onClick={() => setComparar([p.antes, p.ahora])} className="dom-card shrink-0 w-44 rounded-2xl overflow-hidden text-left">
                  <div className="grid grid-cols-2 h-24"><img src={p.antes.url} alt="" className="w-full h-full object-cover" loading="lazy" /><img src={p.ahora.url} alt="" className="w-full h-full object-cover" loading="lazy" /></div>
                  <div className="p-2"><div className="text-[13px] font-bold text-[var(--d-text)] truncate">{p.punto}</div><div className="text-[11px] text-[var(--d-muted)]">{corta(p.antes.fecha)} → {corta(p.ahora.fecha)} · {p.n} fotos</div></div>
                </button>))}
            </div>
          </section>
        )}

        <div className="mt-5 space-y-5">
          {d === null ? <Esqueleto filas={2} alto={140} /> : !d.fotos.length ? (
            <div className="dom-card rounded-3xl"><Vacio ico={IcoCamara} color="#c85f08" titulo="Aún no hay fotos" texto="Toma la primera del avance. Si le pones el punto (ej. “Fachada norte”), luego comparas el antes y el ahora." accion={{ label: "Tomar foto", onClick: () => camRef.current?.click() }} /></div>
          ) : porDia.map(([k, fs]) => (
            <section key={k}>
              <h2 className="mb-2 text-[13px] font-bold text-[var(--d-text-2)] first-letter:uppercase">{k}</h2>
              <div className="grid grid-cols-3 gap-1.5">
                {fs.map((f, i) => { const s = sel.some(x => x.url === f.url); return (
                  <button key={f.url + i} onClick={() => tocar(f)} className="relative aspect-square rounded-xl overflow-hidden bg-[var(--d-card-2)]" style={{ boxShadow: s ? "inset 0 0 0 3px #0073ea" : undefined }}>
                    <img src={f.url} alt={f.de} className="w-full h-full object-cover" loading="lazy" />
                    <span className="absolute left-1 bottom-1 rounded-md bg-[#0f172a] px-1.5 py-0.5 text-[10px] font-bold text-white">{f.punto || ETIQ[f.fuente]}</span>
                    {s && <span className="absolute right-1 top-1 w-6 h-6 rounded-full bg-[#0073ea] text-white text-xs font-bold flex items-center justify-center">✓</span>}
                  </button>); })}
              </div>
            </section>))}
        </div>
      </div>

      {ver && (
        <div className="fixed inset-0 z-[90] bg-black flex flex-col" onClick={() => setVer(null)}>
          <div className="flex items-center gap-2 p-3 text-white"><div className="flex-1 min-w-0"><div className="font-bold truncate">{ver.de}</div><div className="text-[12px] text-white/70">{dia(ver.fecha)}{ver.punto ? ` · ${ver.punto}` : ""}</div></div><button className="p-2" aria-label="Cerrar"><X className="w-6 h-6" /></button></div>
          <div className="flex-1 flex items-center justify-center p-2"><img src={ver.url} alt={ver.de} className="max-w-full max-h-full object-contain" /></div>
        </div>)}

      {comparar && (
        <Hoja titulo={comparar[0].punto && comparar[0].punto === comparar[1].punto ? comparar[0].punto : "Comparar"} onClose={() => setComparar(null)}>
          <Comparar antes={{ url: comparar[0].url, label: corta(comparar[0].fecha) }} ahora={{ url: comparar[1].url, label: corta(comparar[1].fecha) }} />
        </Hoja>)}

      {nueva && <NuevaFoto archivo={nueva} obraId={id} puntos={d?.puntos || []} onClose={() => setNueva(null)} onOk={() => { setNueva(null); flash("ok", "Foto guardada"); cargar(); }} flash={flash} />}
      {nodo}
    </div>
  );
}

function NuevaFoto({ archivo, obraId, puntos, onClose, onOk, flash }: { archivo: File; obraId: string; puntos: string[]; onClose: () => void; onOk: () => void; flash: (t: "ok" | "err", m: string) => void }) {
  const [punto, setPunto] = useState(""); const [desc, setDesc] = useState(""); const [busy, setBusy] = useState(false);
  const [prev] = useState(() => URL.createObjectURL(archivo));
  useEffect(() => () => URL.revokeObjectURL(prev), [prev]);
  const guardar = async () => {
    setBusy(true);
    const blob0 = await comprimir(archivo); const path0 = `avance/${obraId}/${Date.now()}.jpg`;
    const sinSenal = async () => { await guardarPendiente({ tipo: "foto-avance", titulo: "Foto de avance", url: `/api/obras/${obraId}/fotos`, body: { punto, descripcion: desc }, foto: { blob: blob0, path: path0, campo: "url" } }); flash("ok", "Sin señal: la foto se guardó y se sube sola al volver la señal"); onClose(); };
    if (navigator.onLine === false) { try { await sinSenal(); } finally { setBusy(false); } return; }
    try {
      const blob = blob0;
      const path = path0;
      const { error } = await supabase.storage.from("expedientes").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw new Error("No se pudo subir la foto");
      const url = supabase.storage.from("expedientes").getPublicUrl(path).data.publicUrl;
      await api(`/api/obras/${obraId}/fotos`, "POST", { url, punto, descripcion: desc });
      onOk();
    } catch (e) { if (esSinSenal(e)) await sinSenal(); else flash("err", (e as Error).message); } finally { setBusy(false); }
  };
  const sugeridos = [...new Set([...puntos, "Fachada", "Losa", "Interior", "Acceso"])].slice(0, 8);
  return (
    <Hoja titulo="Foto de avance" onClose={onClose} pie={<button onClick={guardar} disabled={busy} className="w-full rounded-2xl bg-[#c85f08] py-3.5 text-[15px] font-bold text-white inline-flex items-center justify-center gap-2 disabled:opacity-60">{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : null}Guardar foto</button>}>
      <img src={prev} alt="Vista previa" className="w-full max-h-64 object-cover rounded-2xl" />
      <div className="mt-4 text-[13px] font-semibold text-[var(--d-text-2)]">¿De qué punto? <span className="font-normal text-[var(--d-muted)]">(para comparar el antes y el ahora)</span></div>
      <div className="mt-2 flex flex-wrap gap-2">{sugeridos.map(p => <button key={p} type="button" onClick={() => setPunto(punto === p ? "" : p)} className={`rounded-full px-3 py-2 text-[13px] font-semibold ${punto === p ? "bg-[#c85f08] text-white" : "bg-[var(--d-card-2)] text-[var(--d-text-2)]"}`}>{p}</button>)}</div>
      <input value={punto} onChange={e => setPunto(e.target.value)} placeholder="O escribe el punto (ej. Fachada norte)" className="mt-2 w-full rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3.5 py-3 text-[16px] text-[var(--d-text)] outline-none" />
      <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Nota (opcional)" className="mt-2 w-full rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3.5 py-3 text-[16px] text-[var(--d-text)] outline-none" />
    </Hoja>
  );
}
