"use client";
/**
 * /dashboard/domenica/obras/[id]/bitacora — Bitácora del día, armada sola (Doménica 27 · 11-Oct-2026)
 * Junta avances, fotos, entregas y solicitudes del día; el residente solo agrega clima, personal e incidentes.
 * Se comparte por WhatsApp o se guarda en PDF (imprimir).
 */
import { IcoBitacora } from "@/components/domenica/IconosObra";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Sun, Users, Wrench, AlertTriangle, Share2, Printer, Pencil, CheckCircle2, Camera, Package, FileText } from "lucide-react";
import { Hoja, api, campo, etiqueta, boton, useAviso } from "@/components/domenica/ui";
import { Esqueleto } from "@/components/domenica/Esqueleto";
import { Vacio } from "@/components/domenica/Vacio";
import { sumarDias, hoyMX } from "@/lib/plantillas";
import type { BitacoraDia } from "@/lib/bitacora-dia";
import { statusLabel } from "@/lib/requi-stepper";
import { fmtMoney } from "@/lib/formatters";

const CLIMAS = ["Soleado", "Nublado", "Lluvia", "Viento", "Frío", "Calor"];
const largo = (f: string) => { const t = new Date(f + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); return t.charAt(0).toUpperCase() + t.slice(1); };

export default function BitacoraPage() {
  const { id } = useParams<{ id: string }>();
  const [fecha, setFecha] = useState("");
  const [b, setB] = useState<BitacoraDia | null>(null); const [cargando, setCargando] = useState(true);
  const [editar, setEditar] = useState(false); const [foto, setFoto] = useState<string | null>(null); const [redactando, setRedactando] = useState(false);
  const redactar = async () => { setRedactando(true); try { await api(`/api/obras/${id}/bitacora/resumen`, "POST", { fecha }); await cargar(); } catch (e) { flash("err", (e as Error).message); } finally { setRedactando(false); } };
  const { flash, nodo } = useAviso();
  useEffect(() => { if (fecha) return; let f = ""; try { f = new URLSearchParams(window.location.search).get("fecha") || ""; } catch { /* */ } setFecha(/^\d{4}-\d{2}-\d{2}$/.test(f) ? f : hoyMX()); }, [fecha]);
  const cargar = useCallback(async () => {
    if (!fecha) return; setCargando(true);
    try { setB(await api<BitacoraDia>(`/api/obras/${id}/bitacora?fecha=${fecha}`)); } catch (e) { flash("err", (e as Error).message); } finally { setCargando(false); }
  }, [id, fecha, flash]);
  useEffect(() => { cargar(); }, [cargar]);

  const compartir = async () => {
    if (!b) return;
    const url = `${window.location.origin}/dashboard/domenica/obras/${id}/bitacora?fecha=${fecha}`;
    const texto = b.registro?.actividades ? `Bitácora ${b.obra.nombre} · ${largo(fecha)}\n\n${b.registro.actividades}` : `Bitácora ${b.obra.nombre} · ${largo(fecha)}: ${b.terminadas.length} terminadas, ${b.avances.length} avances, ${b.fotos.length} fotos${b.registro?.incidentes ? `. Incidentes: ${b.registro.incidentes}` : ""}.`;
    try { if (navigator.share) { await navigator.share({ title: `Bitácora ${b.obra.nombre}`, text: texto, url }); return; } } catch { return; }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto + " " + url)}`, "_blank");
  };
  const esHoy = fecha === hoyMX();
  const chip = "inline-flex items-center gap-1.5 rounded-full bg-[var(--d-card-2)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--d-text-2)]";

  return (
    <div className="dom-page h-full overflow-y-auto print:overflow-visible">
      <div className="px-4 md:px-6 pt-4 pb-28 md:pb-10 max-w-3xl mx-auto">
        <Link href={`/dashboard/domenica/obras/${id}`} className="print:hidden hidden md:inline-flex items-center gap-1 text-xs text-[var(--d-link)] mb-2"><ArrowLeft className="w-3.5 h-3.5" />Obra</Link>
        <div className="dom-in rounded-3xl p-5 text-white relative overflow-hidden" style={{ background: "#0077ad" }}>
          <div className="relative text-[12px] font-bold uppercase tracking-wider text-white/80">Bitácora de obra</div>
          <h1 className="relative text-2xl font-bold leading-tight">{b?.obra.nombre || "…"}</h1>
          <div className="relative mt-3 flex items-center gap-2 print:hidden">
            <button onClick={() => setFecha(sumarDias(fecha, -1))} className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center" aria-label="Día anterior"><ChevronLeft className="w-5 h-5" /></button>
            <div className="flex-1 text-center text-[14px] font-semibold">{fecha ? largo(fecha).replace(/ de \d{4}$/, "") : ""}</div>
            <button onClick={() => !esHoy && setFecha(sumarDias(fecha, 1))} disabled={esHoy} className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center disabled:opacity-30" aria-label="Día siguiente"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <div className="relative mt-1 hidden print:block text-[14px]">{fecha ? largo(fecha) : ""}</div>
        </div>

        <div className="mt-3 flex gap-2 print:hidden">
          <button onClick={() => setEditar(true)} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[var(--d-card)] border border-[var(--d-border)] py-3 text-[13.5px] font-semibold text-[var(--d-text)]"><Pencil className="w-4 h-4" />Agregar lo del día</button>
          <button onClick={compartir} className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#00953f] px-4 py-3 text-[13.5px] font-bold text-white sobre-verde"><Share2 className="w-4 h-4" />Compartir</button>
          <button onClick={() => window.print()} className="inline-flex items-center justify-center rounded-2xl bg-[var(--d-card)] border border-[var(--d-border)] px-3.5 text-[var(--d-text)]" aria-label="Guardar PDF"><Printer className="w-5 h-5" /></button>
        </div>

        {cargando || !b ? <div className="mt-4"><Esqueleto filas={4} alto={90} /></div> : (<>
          {b.registro && (
            <div className="mt-4 flex flex-wrap gap-2">
              {b.registro.clima && <span className={chip}><Sun className="w-4 h-4" />{b.registro.clima}</span>}
              {!!b.registro.personal_en_obra && <span className={chip}><Users className="w-4 h-4" />{b.registro.personal_en_obra} personas en obra</span>}
              {b.registro.maquinaria && <span className={chip}><Wrench className="w-4 h-4" />{b.registro.maquinaria}</span>}
            </div>)}
          {(b.registro?.actividades || b.terminadas.length || b.avances.length || b.fotos.length) ? (
            <div className="mt-4 rounded-2xl border border-[#a25ddc]/30 bg-[#a25ddc]/8 p-4">
              <div className="flex items-center justify-between"><span className="text-[12px] font-bold uppercase tracking-wider text-[var(--d-purple)]">Resumen del día</span>
                <button onClick={redactar} disabled={redactando} className="print:hidden rounded-lg bg-[var(--d-surface)] px-2.5 py-1 text-[12px] font-semibold text-[var(--d-purple)] disabled:opacity-60">{redactando ? "Redactando…" : b.registro?.actividades ? "Rehacer" : "Redactar con IA"}</button></div>
              {b.registro?.actividades ? <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--d-text)] whitespace-pre-wrap">{b.registro.actividades}</p> : <p className="mt-1 text-[13px] text-[var(--d-muted)]">Toca “Redactar con IA” y se escribe solo con lo que pasó hoy, listo para mandarlo al cliente.</p>}
            </div>) : null}
          {b.registro?.incidentes && <div className="mt-3 rounded-2xl bg-[#d0304a]/10 border border-[#d0304a]/30 p-3 text-[14px] text-[var(--d-danger)] flex gap-2"><AlertTriangle className="w-5 h-5 shrink-0" /><div><b>Incidentes:</b> {b.registro.incidentes}</div></div>}

          {!b.registro && !b.terminadas.length && !b.avances.length && !b.fotos.length && !b.entregas.length && !b.solicitudes.length ? (
            <div className="mt-4 dom-card rounded-3xl"><Vacio ico={IcoBitacora} color="#0077ad" titulo="Aún no hay nada este día" texto="Se llena sola con los avances, fotos y entregas que registren en Doménica. Tú solo agrega clima y gente." accion={{ label: "Agregar clima y gente", onClick: () => setEditar(true) }} /></div>
          ) : (<>
            {b.terminadas.length > 0 && <Seccion icono={<CheckCircle2 className="w-5 h-5 text-[var(--c-verde)]" />} titulo={`Terminado (${b.terminadas.length})`}>
              {b.terminadas.map(t => <li key={t.id} className="px-4 py-3 text-[14px] text-[var(--d-text)]"><b>✓</b> {t.titulo}{t.quien ? <span className="text-[var(--d-muted)]"> · {t.quien}</span> : null}</li>)}
            </Seccion>}
            {b.avances.length > 0 && <Seccion icono={<FileText className="w-5 h-5 text-[var(--c-azul)]" />} titulo={`Avances (${b.avances.length})`}>
              {b.avances.map((a, i) => <li key={i} className="px-4 py-3"><div className="text-[12px] text-[var(--d-muted)]">{a.hora} · {a.autor} · {a.titulo}</div><div className="text-[14px] text-[var(--d-text)]">{a.texto}</div></li>)}
            </Seccion>}
            {b.fotos.length > 0 && <div className="mt-4">
              <div className="mb-2 flex items-center gap-2 text-[15px] font-bold text-[var(--d-text)]"><Camera className="w-5 h-5 text-[var(--c-morado)]" />Fotos ({b.fotos.length})</div>
              <div className="grid grid-cols-3 gap-2">{b.fotos.map((f, i) => <button key={i} onClick={() => setFoto(f.url)} className="relative aspect-square rounded-2xl overflow-hidden bg-[var(--d-card-2)]"><img src={f.url} alt={f.de} className="w-full h-full object-cover" loading="lazy" /><span className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-[11px] text-white truncate text-left">{f.de}</span></button>)}</div>
            </div>}
            {b.entregas.length > 0 && <Seccion icono={<Package className="w-5 h-5 text-[var(--c-ambar)]" />} titulo={`Entregas (${b.entregas.length})`}>
              {b.entregas.map((e, i) => <li key={i} className="px-4 py-3 text-[14px] text-[var(--d-text)]">{e.proveedor || "Proveedor"}{e.recibio ? <span className="text-[var(--d-muted)]"> · recibió {e.recibio}</span> : null}</li>)}
            </Seccion>}
            {b.solicitudes.length > 0 && <Seccion icono={<FileText className="w-5 h-5 text-[var(--c-naranja)]" />} titulo={`Solicitudes del día (${b.solicitudes.length})`}>
              {b.solicitudes.map(r => <li key={r.folio} className="px-4 py-3 flex justify-between text-[14px] text-[var(--d-text)]"><span><span className="font-mono text-[12.5px]">{r.folio}</span> · {statusLabel(r.status)}</span><b>{r.total ? fmtMoney(r.total) : ""}</b></li>)}
            </Seccion>}
            {b.registro?.observaciones && <div className="mt-4 dom-card rounded-2xl p-4 text-[14px] text-[var(--d-text)]"><b>Notas:</b> {b.registro.observaciones}</div>}
            <p className="mt-6 text-center text-[11px] text-[var(--d-faint)]">Bitácora generada por Doménica 27{b.registro?.residente_nombre ? ` · registró ${b.registro.residente_nombre}` : ""}</p>
          </>)}
        </>)}
      </div>
      {foto && <div className="fixed inset-0 z-[90] bg-black/90 flex items-center justify-center p-3" onClick={() => setFoto(null)}><img src={foto} alt="Foto" className="max-w-full max-h-full rounded-xl" /></div>}
      {editar && b && <Editor id={id} fecha={fecha} inicial={b.registro} onClose={() => setEditar(false)} onSaved={() => { setEditar(false); cargar(); flash("ok", "Guardado en la bitácora"); }} flash={flash} />}
      {nodo}
    </div>
  );
}

function Seccion({ icono, titulo, children }: { icono: React.ReactNode; titulo: string; children: React.ReactNode }) {
  return <div className="mt-4"><div className="mb-2 flex items-center gap-2 text-[15px] font-bold text-[var(--d-text)]">{icono}{titulo}</div><ul className="dom-card rounded-2xl overflow-hidden divide-y divide-[var(--d-border)]">{children}</ul></div>;
}

function Editor({ id, fecha, inicial, onClose, onSaved, flash }: { id: string; fecha: string; inicial: BitacoraDia["registro"]; onClose: () => void; onSaved: () => void; flash: (t: "ok" | "err", m: string) => void }) {
  const [clima, setClima] = useState(inicial?.clima || ""); const [gente, setGente] = useState(inicial?.personal_en_obra?.toString() || "");
  const [maq, setMaq] = useState(inicial?.maquinaria || ""); const [inc, setInc] = useState(inicial?.incidentes || ""); const [obs, setObs] = useState(inicial?.observaciones || "");
  const [busy, setBusy] = useState(false);
  const guardar = async () => { setBusy(true); try { await api(`/api/obras/${id}/bitacora`, "POST", { fecha, clima, personal_en_obra: gente, maquinaria: maq, incidentes: inc, observaciones: obs }); onSaved(); } catch (e) { flash("err", (e as Error).message); } finally { setBusy(false); } };
  return (
    <Hoja titulo="Lo del día" onClose={onClose} pie={<button onClick={guardar} disabled={busy} className={`${boton} w-full py-3`}>Guardar</button>}>
      <div><span className={etiqueta}>¿Cómo estuvo el clima?</span><div className="mt-1 grid grid-cols-3 gap-2">{CLIMAS.map(c => <button key={c} type="button" onClick={() => setClima(clima === c ? "" : c)} className={`rounded-xl py-2.5 text-[13px] font-semibold ${clima === c ? "bg-[#0073ea] text-white" : "bg-[var(--d-card-2)] text-[var(--d-text-2)]"}`}>{c}</button>)}</div></div>
      <div className="mt-4"><span className={etiqueta}>¿Cuánta gente trabajó hoy?</span>
        <div className="mt-1 flex items-center gap-2"><button type="button" onClick={() => setGente(String(Math.max(0, (Number(gente) || 0) - 1)))} className="w-12 h-12 rounded-xl bg-[var(--d-card-2)] text-xl font-bold text-[var(--d-text)]">−</button>
          <input inputMode="numeric" value={gente} onChange={e => setGente(e.target.value.replace(/\D/g, ""))} className="w-24 h-12 rounded-xl border border-[var(--d-border)] bg-[var(--d-field)] text-center text-xl font-bold text-[var(--d-text)]" />
          <button type="button" onClick={() => setGente(String((Number(gente) || 0) + 1))} className="w-12 h-12 rounded-xl bg-[var(--d-card-2)] text-xl font-bold text-[var(--d-text)]">+</button></div></div>
      <label className="block mt-4"><span className={etiqueta}>Maquinaria (opcional)</span><input value={maq} onChange={e => setMaq(e.target.value)} placeholder="Ej. revolvedora, retroexcavadora" className={campo} /></label>
      <label className="block mt-3"><span className={etiqueta}>¿Pasó algo? Incidentes (opcional)</span><textarea value={inc} onChange={e => setInc(e.target.value)} rows={2} placeholder="Accidentes, retrasos, faltantes…" className={campo} /></label>
      <label className="block mt-3"><span className={etiqueta}>Notas (opcional)</span><textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} className={campo} /></label>
    </Hoja>
  );
}
