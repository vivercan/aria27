"use client";
/**
 * /dashboard/domenica/revisiones — Revisiones de calidad y seguridad con firma (Doménica 27 · 11-Oct-2026)
 * Un punto a la vez (fácil, sin saturar): ✓ Bien / ✗ Mal / No aplica, foto si algo está mal, firma al final.
 * Lo que salió mal se puede convertir en actividades para corregir.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck, Plus, Check, X, Minus, Camera, ChevronLeft, Loader2, Eraser } from "lucide-react";
import { DomHeader, Hoja, api, useAviso, useBase, etiqueta, campo, boton } from "@/components/domenica/ui";
import { Esqueleto } from "@/components/domenica/Esqueleto";
import { Vacio } from "@/components/domenica/Vacio";
import { supabase } from "@/lib/supabase";

type Formato = { id: string; nombre: string; tipo: string; descripcion: string | null; puntos: string[] };
type Resp = { texto: string; estado: "OK" | "NO" | "NA"; nota?: string | null; foto_url?: string | null };
type Revision = { id: string; formato_nombre: string; tipo: string; obra_nombre: string; realizada_nombre: string; respuestas: Resp[]; total: number; ok: number; fallas: number; firma_url: string; nombre_firma: string; created_at: string };

async function subir(blob: Blob, carpeta: string, ext: string): Promise<string> {
  const path = `revisiones/${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from("expedientes").upload(path, blob, { contentType: ext === "png" ? "image/png" : "image/jpeg", upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from("expedientes").getPublicUrl(path).data.publicUrl;
}
async function comprimir(f: File): Promise<Blob> {
  const img = await createImageBitmap(f); const k = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return await new Promise(r => c.toBlob(b => r(b as Blob), "image/jpeg", 0.8));
}

export default function RevisionesPage() {
  const base = useBase(); const { flash, nodo } = useAviso();
  const [d, setD] = useState<{ formatos: Formato[]; revisiones: Revision[] } | null>(null);
  const [nueva, setNueva] = useState(false); const [ver, setVer] = useState<Revision | null>(null); const [crearF, setCrearF] = useState(false);
  const cargar = useCallback(async () => { try { const r = await api<{ formatos: Formato[]; revisiones: Revision[] }>("/api/revisiones"); setD(r); const v = new URLSearchParams(window.location.search).get("ver"); if (v) setVer(r.revisiones.find(x => x.id === v) || null); } catch (e) { flash("err", (e as Error).message); } }, [flash]);
  useEffect(() => { cargar(); }, [cargar]);
  return (
    <div className="dom-page h-full overflow-y-auto">
      <div className="px-4 md:px-6 pt-4 pb-28 md:pb-10 max-w-3xl mx-auto">
        <DomHeader icon={ShieldCheck} from="#0f766e" to="#00c875" titulo="Revisiones" desc="Calidad y seguridad con foto y firma. Si algo sale mal, se vuelve una actividad para corregirlo."
          accion={<button onClick={() => setNueva(true)} className={boton}><Plus className="w-4 h-4" />Revisar</button>} />
        {!d ? <div className="mt-5"><Esqueleto filas={4} /></div> : d.revisiones.length === 0 ? (
          <div className="mt-6 dom-card rounded-3xl"><Vacio dibujo="lista" titulo="Aún no hay revisiones" texto="Elige una lista (antes del colado, seguridad semanal o entrega de área), revisa punto por punto y firma." accion={{ label: "Hacer la primera revisión", onClick: () => setNueva(true) }} /></div>
        ) : (
          <div className="mt-5 space-y-2">
            {d.revisiones.map((r, i) => (
              <button key={r.id} onClick={() => setVer(r)} className="dom-card dom-in w-full text-left rounded-2xl p-4 flex items-center gap-3" style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
                <span className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-[15px] font-extrabold ${r.fallas ? "bg-[#e2445c]/12 text-[var(--d-danger)]" : "bg-[#00c875]/15 text-[var(--d-ok)]"}`}>{r.ok}/{r.total}</span>
                <div className="flex-1 min-w-0"><div className="text-[15px] font-bold text-[var(--d-text)] truncate">{r.formato_nombre}</div>
                  <div className="text-[12.5px] text-[var(--d-muted)] truncate">{r.obra_nombre} · {new Date(r.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short" })} · {r.realizada_nombre}</div></div>
                {r.fallas > 0 && <span className="shrink-0 rounded-full bg-[#e2445c] px-2.5 py-1 text-[11px] font-bold text-white">{r.fallas} falla{r.fallas === 1 ? "" : "s"}</span>}
              </button>))}
          </div>)}
        {d && <button onClick={() => setCrearF(true)} className="mt-6 w-full rounded-2xl border border-dashed border-[var(--d-border)] py-3 text-sm font-semibold text-[var(--d-link)]">+ Crear una lista de revisión propia</button>}
      </div>
      {nueva && d && base.me && <Nueva formatos={d.formatos} obras={base.obras} emps={base.emps} miEmp={base.miEmp} onClose={() => setNueva(false)} onSaved={(n) => { setNueva(false); cargar(); flash("ok", n ? `Guardada. Se crearon ${n} actividades para corregir.` : "Revisión guardada"); }} flash={flash} />}
      {ver && <Hoja titulo={ver.formato_nombre} onClose={() => setVer(null)}>
        <div className="text-[13px] text-[var(--d-muted)]">{ver.obra_nombre} · {new Date(ver.created_at).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</div>
        <ul className="mt-3 dom-card rounded-2xl divide-y divide-[var(--d-border)] overflow-hidden">{ver.respuestas.map((r, i) => (
          <li key={i} className="px-4 py-3 flex gap-3"><span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold ${r.estado === "OK" ? "bg-[#00a35c]" : r.estado === "NO" ? "bg-[#e2445c]" : "bg-[#94a3b8]"}`}>{r.estado === "OK" ? "✓" : r.estado === "NO" ? "✗" : "–"}</span>
            <div className="flex-1"><div className="text-[14px] text-[var(--d-text)]">{r.texto}</div>{r.nota && <div className="text-[12.5px] text-[var(--d-muted)]">{r.nota}</div>}{r.foto_url && <img src={r.foto_url} alt="" className="mt-2 max-h-40 rounded-xl" />}</div></li>))}</ul>
        <div className="mt-4 text-[12px] text-[var(--d-muted)]">Firma de {ver.nombre_firma}</div>
        <img src={ver.firma_url} alt="Firma" className="mt-1 h-24 rounded-xl border border-[var(--d-border)] bg-white" />
      </Hoja>}
      {crearF && <CrearFormato onClose={() => setCrearF(false)} onSaved={() => { setCrearF(false); cargar(); flash("ok", "Lista creada"); }} flash={flash} />}
      {nodo}
    </div>
  );
}

function Nueva({ formatos, obras, emps, miEmp, onClose, onSaved, flash }: { formatos: Formato[]; obras: { id: string; nombre: string }[]; emps: { id: string; full_name: string }[]; miEmp: string | null; onClose: () => void; onSaved: (n: number) => void; flash: (t: "ok" | "err", m: string) => void }) {
  const [f, setF] = useState<Formato | null>(null); const [obra, setObra] = useState(""); const [i, setI] = useState(-1);
  const [resp, setResp] = useState<Resp[]>([]); const [subiendo, setSubiendo] = useState(false);
  const [nombreFirma, setNombreFirma] = useState(""); const [crear, setCrear] = useState(true); const [asignar, setAsignar] = useState(miEmp || ""); const [busy, setBusy] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null); const dibujando = useRef(false); const [firmado, setFirmado] = useState(false);
  const fotoRef = useRef<HTMLInputElement>(null);
  const empezar = () => { if (!f) { flash("err", "Elige qué vas a revisar"); return; } if (!obra) { flash("err", "Elige la obra"); return; } setResp(f.puntos.map(t => ({ texto: t, estado: "NA" }))); setI(0); };
  const marcar = (estado: Resp["estado"]) => { setResp(r => r.map((x, k) => k === i ? { ...x, estado } : x)); try { navigator.vibrate?.(15); } catch { /* */ } if (estado !== "NO") setTimeout(() => setI(k => k + 1), 180); };
  const actual = f && i >= 0 && i < f.puntos.length ? resp[i] : null;
  const fallas = resp.filter(r => r.estado === "NO").length;
  // firma
  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); return { x: (e.clientX - r.left) * (e.currentTarget.width / r.width), y: (e.clientY - r.top) * (e.currentTarget.height / r.height) }; };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => { const c = canvas.current!.getContext("2d")!; c.lineWidth = 3.2; c.lineCap = "round"; c.strokeStyle = "#0f172a"; const p = pos(e); c.beginPath(); c.moveTo(p.x, p.y); dibujando.current = true; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => { if (!dibujando.current) return; const c = canvas.current!.getContext("2d")!; const p = pos(e); c.lineTo(p.x, p.y); c.stroke(); setFirmado(true); };
  const limpiar = () => { const c = canvas.current; if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height); setFirmado(false); };
  const guardar = async () => {
    if (!firmado) { flash("err", "Firma con el dedo en el recuadro"); return; }
    setBusy(true);
    try {
      const png: Blob = await new Promise(r => canvas.current!.toBlob(b => r(b as Blob), "image/png"));
      const firma_url = await subir(png, "firmas", "png");
      const r = await api<{ creadas: number }>("/api/revisiones", "POST", { formato_id: f!.id, obra_id: obra, respuestas: resp, firma_url, nombre_firma: nombreFirma, crear_actividades: crear && fallas > 0, asignar_a: asignar });
      onSaved(r.creadas || 0);
    } catch (e) { flash("err", (e as Error).message); } finally { setBusy(false); }
  };

  if (i < 0) return (
    <Hoja titulo="Nueva revisión" onClose={onClose} pie={<button onClick={empezar} className={`${boton} w-full py-3.5 text-base`}>Empezar</button>}>
      <span className={etiqueta}>¿Qué vas a revisar?</span>
      <div className="mt-2 space-y-2">{formatos.map(x => (
        <button key={x.id} type="button" onClick={() => setF(x)} className={`w-full text-left rounded-2xl border-2 p-3.5 transition ${f?.id === x.id ? "border-[#0073ea] bg-[#0073ea]/8" : "border-[var(--d-border)] bg-[var(--d-card)]"}`}>
          <div className="flex items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold text-white ${x.tipo === "SEGURIDAD" ? "bg-[#e8760a]" : "bg-[#0f766e]"}`}>{x.tipo === "SEGURIDAD" ? "Seguridad" : "Calidad"}</span><span className="text-[15px] font-bold text-[var(--d-text)]">{x.nombre}</span></div>
          <div className="mt-0.5 text-[12.5px] text-[var(--d-muted)]">{x.puntos.length} puntos{x.descripcion ? ` · ${x.descripcion}` : ""}</div>
        </button>))}</div>
      <label className="block mt-4"><span className={etiqueta}>Obra</span><select value={obra} onChange={e => setObra(e.target.value)} className={campo}><option value="">Elige…</option>{obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select></label>
    </Hoja>);

  if (actual && f) return (
    <Hoja titulo={f.nombre} onClose={onClose}>
      <div className="flex gap-1">{f.puntos.map((_, k) => <div key={k} className={`h-1.5 flex-1 rounded-full ${k < i ? (resp[k].estado === "NO" ? "bg-[#e2445c]" : "bg-[#00c875]") : k === i ? "bg-[#0073ea]" : "bg-[var(--d-border)]"}`} />)}</div>
      <div className="mt-2 text-[12.5px] font-semibold text-[var(--d-muted)]">Punto {i + 1} de {f.puntos.length}</div>
      <div key={i} className="dom-in mt-6 min-h-[110px] text-center text-[22px] font-bold leading-snug text-[var(--d-text)]">{actual.texto}</div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button onClick={() => marcar("OK")} className={`rounded-3xl py-6 text-[18px] font-bold flex flex-col items-center gap-1 ${actual.estado === "OK" ? "bg-[#00a35c] text-white" : "bg-[#00c875]/15 text-[var(--d-ok)]"}`}><Check className="w-9 h-9" strokeWidth={3} />Bien</button>
        <button onClick={() => marcar("NO")} className={`rounded-3xl py-6 text-[18px] font-bold flex flex-col items-center gap-1 ${actual.estado === "NO" ? "bg-[#e2445c] text-white" : "bg-[#e2445c]/12 text-[var(--d-danger)]"}`}><X className="w-9 h-9" strokeWidth={3} />Mal</button>
      </div>
      <button onClick={() => marcar("NA")} className="mt-3 w-full rounded-2xl bg-[var(--d-card-2)] py-3 text-[14px] font-semibold text-[var(--d-text-2)] inline-flex items-center justify-center gap-1.5"><Minus className="w-4 h-4" />No aplica</button>
      {actual.estado === "NO" && (
        <div className="dom-in mt-4 rounded-2xl border border-[#e2445c]/30 bg-[#e2445c]/6 p-3">
          <input ref={fotoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={async e => { const file = e.target.files?.[0]; e.target.value = ""; if (!file) return; setSubiendo(true); try { const u = await subir(await comprimir(file), "fotos", "jpg"); setResp(r => r.map((x, k) => k === i ? { ...x, foto_url: u } : x)); } catch (er) { flash("err", (er as Error).message); } finally { setSubiendo(false); } }} />
          <div className="flex gap-2">
            <button onClick={() => fotoRef.current?.click()} className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[var(--d-surface)] px-3 py-2.5 text-[13px] font-semibold text-[var(--d-text)] border border-[var(--d-border)]">{subiendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}{actual.foto_url ? "Otra foto" : "Foto"}</button>
            <input value={actual.nota || ""} onChange={e => setResp(r => r.map((x, k) => k === i ? { ...x, nota: e.target.value } : x))} placeholder="¿Qué está mal?" className="flex-1 min-w-0 rounded-xl border border-[var(--d-border)] bg-[var(--d-field)] px-3 py-2.5 text-[15px] text-[var(--d-text)]" />
          </div>
          {actual.foto_url && <img src={actual.foto_url} alt="" className="mt-2 h-24 rounded-xl" />}
          <button onClick={() => setI(k => k + 1)} className={`${boton} mt-3 w-full py-3`}>Siguiente</button>
        </div>)}
      {i > 0 && <button onClick={() => setI(k => k - 1)} className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--d-muted)]"><ChevronLeft className="w-4 h-4" />Anterior</button>}
    </Hoja>);

  return (
    <Hoja titulo="Firma y listo" onClose={onClose} pie={<button onClick={guardar} disabled={busy} className={`${boton} w-full py-3.5 text-base`}>{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}Guardar revisión</button>}>
      <div className={`rounded-2xl p-4 text-center ${fallas ? "bg-[#e2445c]/10" : "bg-[#00c875]/12"}`}>
        <div className={`text-[34px] font-extrabold ${fallas ? "text-[var(--d-danger)]" : "text-[var(--d-ok)]"}`}>{resp.filter(r => r.estado === "OK").length}/{resp.filter(r => r.estado !== "NA").length}</div>
        <div className="text-[14px] font-semibold text-[var(--d-text)]">{fallas ? `${fallas} punto${fallas === 1 ? "" : "s"} con falla` : "¡Todo bien!"}</div>
      </div>
      {fallas > 0 && <div className="mt-4 rounded-2xl border border-[var(--d-border)] p-3">
        <label className="flex items-center gap-2 text-[14px] font-semibold text-[var(--d-text)]"><input type="checkbox" checked={crear} onChange={e => setCrear(e.target.checked)} className="w-5 h-5" />Crear {fallas} actividad{fallas === 1 ? "" : "es"} para corregir</label>
        {crear && <select value={asignar} onChange={e => setAsignar(e.target.value)} className={campo}><option value="">¿Quién corrige?</option>{emps.map(x => <option key={x.id} value={x.id}>{x.full_name}</option>)}</select>}
      </div>}
      <label className="block mt-4"><span className={etiqueta}>Nombre de quien firma</span><input value={nombreFirma} onChange={e => setNombreFirma(e.target.value)} placeholder="Tu nombre" className={campo} /></label>
      <div className="mt-3 flex items-center justify-between"><span className={etiqueta}>Firma con el dedo</span><button onClick={limpiar} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--d-muted)]"><Eraser className="w-3.5 h-3.5" />Borrar</button></div>
      <canvas ref={canvas} width={900} height={300} onPointerDown={down} onPointerMove={move} onPointerUp={() => { dibujando.current = false; }} className="mt-1 w-full h-36 rounded-2xl border-2 border-dashed border-[var(--d-border)] bg-white touch-none" />
      <button onClick={() => setI(f!.puntos.length - 1)} className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--d-muted)]"><ChevronLeft className="w-4 h-4" />Regresar a los puntos</button>
    </Hoja>);
}

function CrearFormato({ onClose, onSaved, flash }: { onClose: () => void; onSaved: () => void; flash: (t: "ok" | "err", m: string) => void }) {
  const [nombre, setNombre] = useState(""); const [tipo, setTipo] = useState("CALIDAD"); const [puntos, setPuntos] = useState(""); const [busy, setBusy] = useState(false);
  const guardar = async () => { setBusy(true); try { await api("/api/revisiones/formatos", "POST", { nombre, tipo, puntos: puntos.split("\n").map(x => x.trim()).filter(Boolean) }); onSaved(); } catch (e) { flash("err", (e as Error).message); } finally { setBusy(false); } };
  return (
    <Hoja titulo="Nueva lista de revisión" onClose={onClose} pie={<button onClick={guardar} disabled={busy} className={`${boton} w-full py-3`}>Guardar lista</button>}>
      <label className="block"><span className={etiqueta}>Nombre</span><input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Revisión de impermeabilización" className={campo} /></label>
      <div className="mt-3 grid grid-cols-2 gap-2">{[["CALIDAD", "Calidad"], ["SEGURIDAD", "Seguridad"]].map(([k, l]) => <button key={k} type="button" onClick={() => setTipo(k)} className={`rounded-xl py-2.5 text-sm font-bold ${tipo === k ? "bg-[#0073ea] text-white" : "bg-[var(--d-card-2)] text-[var(--d-text-2)]"}`}>{l}</button>)}</div>
      <label className="block mt-3"><span className={etiqueta}>Puntos a revisar (uno por renglón)</span><textarea value={puntos} onChange={e => setPuntos(e.target.value)} rows={8} className={campo} /></label>
    </Hoja>
  );
}
