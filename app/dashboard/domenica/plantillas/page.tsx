"use client";
/**
 * /dashboard/domenica/plantillas — Plantillas de actividades (ARIA Doménica · 11-Oct-2026)
 * "Arranque de obra en un clic": una plantilla crea todas sus actividades con fechas, responsables, pasos y orden.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LayoutTemplate, Plus, Play, Pencil, Trash2, Loader2, CalendarDays, Hourglass, ListChecks, X } from "lucide-react";
import { Esqueleto } from "@/components/domenica/Esqueleto";
import { DomHeader, Hoja, api, useAviso, useBase, etiqueta, campo, boton, ymdLocal } from "@/components/domenica/ui";
import { programar, type ItemPlantilla, type Plantilla } from "@/lib/plantillas";
import { fechaCorta, PRIORIDADES } from "@/lib/actividades";

const duracionTotal = (items: ItemPlantilla[]) => items.reduce((m, it) => Math.max(m, it.dia + it.duracion), 0);
type Fila = { titulo: string; dia: string; duracion: string; prioridad: string; pasos: string; depende: string };
const aFila = (it: ItemPlantilla): Fila => ({ titulo: it.titulo, dia: String(it.dia), duracion: String(it.duracion), prioridad: it.prioridad, pasos: (it.checklist || []).join("\n"), depende: it.depende === null || it.depende === undefined ? "" : String(it.depende) });
const FILA_VACIA: Fila = { titulo: "", dia: "0", duracion: "1", prioridad: "MEDIA", pasos: "", depende: "" };

export default function PlantillasPage() {
  const base = useBase();
  const { flash, nodo } = useAviso();
  const [lista, setLista] = useState<Plantilla[] | null>(null);
  const [usar, setUsar] = useState<Plantilla | null>(null);
  const [editar, setEditar] = useState<{ id?: string; nombre: string; descripcion: string; filas: Fila[] } | null>(null);
  const [obraInicial, setObraInicial] = useState("");

  const cargar = useCallback(async () => {
    try { const r = await api<{ plantillas: Plantilla[] }>("/api/actividades/plantillas"); setLista(r.plantillas); } catch (e) { flash("err", (e as Error).message); setLista([]); }
  }, [flash]);
  useEffect(() => { cargar(); try { setObraInicial(new URLSearchParams(window.location.search).get("obra") || ""); } catch { /* */ } }, [cargar]);

  const borrar = async (p: Plantilla) => {
    if (!window.confirm(`¿Borrar la plantilla "${p.nombre}"? Las actividades que ya creó no se tocan.`)) return;
    try { await api(`/api/actividades/plantillas/${p.id}`, "DELETE"); flash("ok", "Plantilla borrada"); cargar(); } catch (e) { flash("err", (e as Error).message); }
  };

  return (
    <div className="dom-page h-full overflow-y-auto">
      <div className="px-4 md:px-6 pt-4 pb-28 md:pb-10 max-w-5xl mx-auto">
        <DomHeader icon={LayoutTemplate} from="#7e3bdd" titulo="Plantillas" desc="Arma una obra en un clic: cada plantilla crea sus actividades con fechas, responsables, pasos y el orden en que van."
          accion={<button onClick={() => setEditar({ nombre: "", descripcion: "", filas: [{ ...FILA_VACIA }] })} className={boton}><Plus className="w-4 h-4" />Nueva</button>} />

        {lista === null ? <div className="mt-5"><Esqueleto filas={4} alto={110} /></div> : (
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {lista.map((p, i) => (
              <div key={p.id} className="dom-card dom-in rounded-2xl p-4 flex flex-col gap-3" style={{ animationDelay: `${i * 60}ms` }}>
                <div>
                  <div className="text-[16px] font-bold text-[var(--d-text)]">{p.nombre}</div>
                  {p.descripcion && <div className="text-[12.5px] text-[var(--d-muted)] mt-0.5">{p.descripcion}</div>}
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11.5px]">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#a25ddc]/10 text-[var(--d-purple)] px-2.5 py-1 font-semibold"><ListChecks className="w-3.5 h-3.5" />{p.items.length} actividades</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--d-card-2)] text-[var(--d-text-2)] px-2.5 py-1"><CalendarDays className="w-3.5 h-3.5" />{duracionTotal(p.items)} días</span>
                  {p.items.some(it => it.depende !== null && it.depende !== undefined) && <span className="inline-flex items-center gap-1 rounded-full bg-[#fdab3d]/10 text-[var(--d-warn)] px-2.5 py-1"><Hourglass className="w-3.5 h-3.5" />con orden</span>}
                </div>
                <ol className="text-[12.5px] text-[var(--d-text-2)] space-y-0.5 list-decimal list-inside">
                  {p.items.slice(0, 4).map((it, k) => <li key={k} className="truncate">{it.titulo}</li>)}
                  {p.items.length > 4 && <li className="list-none text-[var(--d-faint)]">y {p.items.length - 4} más…</li>}
                </ol>
                <div className="mt-auto flex items-center gap-2">
                  <button onClick={() => setUsar(p)} className={boton}><Play className="w-4 h-4" />Usar</button>
                  <button onClick={() => setEditar({ id: p.id, nombre: p.nombre, descripcion: p.descripcion || "", filas: p.items.map(aFila) })} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--d-text-2)] bg-[var(--d-card-2)]"><Pencil className="w-4 h-4" />Editar</button>
                  <button onClick={() => borrar(p)} className="ml-auto p-2.5 rounded-xl text-[var(--d-danger)] hover:bg-[#d0304a]/10" aria-label="Borrar plantilla"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {lista.length === 0 && <div className="md:col-span-2 rounded-2xl border border-dashed border-[var(--d-border)] p-8 text-center text-sm text-[var(--d-muted)]">Todavía no hay plantillas. Crea la primera con “Nueva”.</div>}
          </div>
        )}
      </div>

      {usar && base.me && <Usar p={usar} emps={base.emps} obras={base.obras} miEmp={base.miEmp} obraInicial={obraInicial} onClose={() => setUsar(null)} flash={flash} />}
      {editar && <Editor inicial={editar} onClose={() => setEditar(null)} onSaved={() => { setEditar(null); cargar(); flash("ok", "Plantilla guardada"); }} flash={flash} />}
      {nodo}
    </div>
  );
}

function Usar({ p, emps, obras, miEmp, obraInicial, onClose, flash }: { p: Plantilla; emps: { id: string; full_name: string }[]; obras: { id: string; nombre: string }[]; miEmp: string | null; obraInicial: string; onClose: () => void; flash: (t: "ok" | "err", m: string) => void }) {
  const [obra, setObra] = useState(obraInicial);
  const [inicio, setInicio] = useState(ymdLocal());
  const [quien, setQuien] = useState(miEmp || "");
  const [porItem, setPorItem] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [hecho, setHecho] = useState<{ creadas: number; avisados: number } | null>(null);
  const fechas = useMemo(() => programar(p.items, inicio || ymdLocal()), [p.items, inicio]);
  const aplicar = async () => {
    if (!inicio) { flash("err", "Elige el día de arranque"); return; }
    if (!quien && p.items.some((_, i) => !porItem[String(i)])) { flash("err", "Elige quién hace las actividades"); return; }
    setBusy(true);
    try { const r = await api<{ creadas: number; avisados: number; errores: string[] }>(`/api/actividades/plantillas/${p.id}/aplicar`, "POST", { obra_id: obra || null, fecha_inicio: inicio, asignado_id: quien, asignaciones: porItem }); setHecho(r); if (r.errores?.length) flash("err", `${r.errores.length} no se pudieron crear`); }
    catch (e) { flash("err", (e as Error).message); } finally { setBusy(false); }
  };
  if (hecho) return (
    <Hoja titulo="¡Listo!" onClose={onClose}>
      <div className="py-6 text-center">
        <div className="mx-auto w-16 h-16 rounded-[20px] bg-[#00953f] flex items-center justify-center"><svg viewBox="0 0 24 24" className="w-9 h-9" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></div>
        <div className="mt-3 text-lg font-bold text-[var(--d-text)]">Se crearon {hecho.creadas} actividades</div>
        <div className="text-sm text-[var(--d-muted)]">{hecho.avisados ? `Avisamos por WhatsApp a ${hecho.avisados} persona${hecho.avisados === 1 ? "" : "s"}.` : "Cada responsable las ve en su Mi trabajo."}</div>
        <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
          <Link href={`/dashboard/actividades?vista=linea${obra ? `&obra=${obra}` : ""}`} className={boton}>Ver en línea de tiempo</Link>
          <Link href={`/dashboard/actividades?vista=tablero${obra ? `&obra=${obra}` : ""}`} className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold bg-[var(--d-card-2)] text-[var(--d-text)]">Ver tablero</Link>
        </div>
      </div>
    </Hoja>
  );
  return (
    <Hoja titulo={`Usar “${p.nombre}”`} onClose={onClose} pie={<button onClick={aplicar} disabled={busy} className={`${boton} w-full py-3`}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}Crear {p.items.length} actividades</button>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2"><span className={etiqueta}>Obra</span>
          <select value={obra} onChange={e => setObra(e.target.value)} className={campo}><option value="">Sin obra (oficina)</option>{obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select></label>
        <label className="block"><span className={etiqueta}>Día de arranque</span><input type="date" value={inicio} onChange={e => setInicio(e.target.value)} className={campo} /></label>
        <label className="block"><span className={etiqueta}>Responsable de todo</span>
          <select value={quien} onChange={e => setQuien(e.target.value)} className={campo}><option value="">Elige…</option>{emps.map(x => <option key={x.id} value={x.id}>{x.full_name}</option>)}</select></label>
      </div>
      <div className="mt-5 text-[12px] text-[var(--d-muted)]">Así quedarían. Puedes cambiar el responsable de cada una:</div>
      <ol className="mt-2 space-y-2">
        {p.items.map((it, i) => (
          <li key={i} className="rounded-xl border border-[var(--d-border)] bg-[var(--d-card)] p-3">
            <div className="flex items-start gap-2">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[#a25ddc]/15 text-[var(--d-purple)] text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-[var(--d-text)]">{it.titulo}</div>
                <div className="text-[11.5px] text-[var(--d-muted)]">{fechaCorta(fechas[i].fecha_inicio)}{fechas[i].fecha_compromiso !== fechas[i].fecha_inicio ? ` → ${fechaCorta(fechas[i].fecha_compromiso)}` : ""}{it.depende !== null && it.depende !== undefined ? ` · espera a la ${it.depende + 1}` : ""}{it.checklist?.length ? ` · ${it.checklist.length} pasos` : ""}</div>
              </div>
            </div>
            <select value={porItem[String(i)] || ""} onChange={e => setPorItem(m => ({ ...m, [String(i)]: e.target.value }))} className="mt-2 w-full rounded-lg border border-[var(--d-border)] bg-[var(--d-field)] px-2.5 py-1.5 text-[13px] text-[var(--d-text)]">
              <option value="">{quien ? `Igual: ${emps.find(x => x.id === quien)?.full_name || "responsable"}` : "Elige quién…"}</option>
              {emps.map(x => <option key={x.id} value={x.id}>{x.full_name}</option>)}
            </select>
          </li>))}
      </ol>
    </Hoja>
  );
}

function Editor({ inicial, onClose, onSaved, flash }: { inicial: { id?: string; nombre: string; descripcion: string; filas: Fila[] }; onClose: () => void; onSaved: () => void; flash: (t: "ok" | "err", m: string) => void }) {
  const [nombre, setNombre] = useState(inicial.nombre);
  const [descripcion, setDescripcion] = useState(inicial.descripcion);
  const [filas, setFilas] = useState<Fila[]>(inicial.filas.length ? inicial.filas : [{ ...FILA_VACIA }]);
  const [busy, setBusy] = useState(false);
  const set = (i: number, k: keyof Fila, v: string) => setFilas(fs => fs.map((f, j) => j === i ? { ...f, [k]: v } : f));
  const quitar = (i: number) => setFilas(fs => fs.filter((_, j) => j !== i).map(f => {
    if (f.depende === "") return f; const d = Number(f.depende);
    return { ...f, depende: d === i ? "" : d > i ? String(d - 1) : f.depende };
  }));
  const guardar = async () => {
    setBusy(true);
    const items = filas.map(f => ({ titulo: f.titulo, dia: Number(f.dia) || 0, duracion: Number(f.duracion) || 1, prioridad: f.prioridad, checklist: f.pasos.split("\n").map(x => x.trim()).filter(Boolean), depende: f.depende === "" ? null : Number(f.depende) }));
    try {
      if (inicial.id) await api(`/api/actividades/plantillas/${inicial.id}`, "PATCH", { nombre, descripcion, items });
      else await api("/api/actividades/plantillas", "POST", { nombre, descripcion, items });
      onSaved();
    } catch (e) { flash("err", (e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Hoja titulo={inicial.id ? "Editar plantilla" : "Nueva plantilla"} onClose={onClose} pie={<button onClick={guardar} disabled={busy} className={`${boton} w-full py-3`}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Guardar plantilla</button>}>
      <label className="block"><span className={etiqueta}>Nombre</span><input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Arranque de obra" className={campo} /></label>
      <label className="block mt-3"><span className={etiqueta}>Para qué sirve (opcional)</span><input value={descripcion} onChange={e => setDescripcion(e.target.value)} className={campo} /></label>
      <div className="mt-5 text-[12px] text-[var(--d-muted)]">“Día” es cuántos días después del arranque empieza (0 = el mismo día).</div>
      <ol className="mt-2 space-y-3">
        {filas.map((f, i) => (
          <li key={i} className="rounded-2xl border border-[var(--d-border)] bg-[var(--d-card)] p-3">
            <div className="flex items-center gap-2">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[#a25ddc]/15 text-[var(--d-purple)] text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
              <input value={f.titulo} onChange={e => set(i, "titulo", e.target.value)} placeholder="Qué hay que hacer" className="flex-1 rounded-lg border border-[var(--d-border)] bg-[var(--d-field)] px-2.5 py-2 text-sm text-[var(--d-text)]" />
              {filas.length > 1 && <button onClick={() => quitar(i)} className="p-2 rounded-lg text-[var(--d-muted)] hover:text-[var(--d-danger)]" aria-label="Quitar"><X className="w-4 h-4" /></button>}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <label className="block"><span className="text-[11px] text-[var(--d-muted)]">Día</span><input type="number" min={0} value={f.dia} onChange={e => set(i, "dia", e.target.value)} className="w-full rounded-lg border border-[var(--d-border)] bg-[var(--d-field)] px-2 py-1.5 text-sm text-[var(--d-text)]" /></label>
              <label className="block"><span className="text-[11px] text-[var(--d-muted)]">Dura (días)</span><input type="number" min={1} value={f.duracion} onChange={e => set(i, "duracion", e.target.value)} className="w-full rounded-lg border border-[var(--d-border)] bg-[var(--d-field)] px-2 py-1.5 text-sm text-[var(--d-text)]" /></label>
              <label className="block"><span className="text-[11px] text-[var(--d-muted)]">Prioridad</span><select value={f.prioridad} onChange={e => set(i, "prioridad", e.target.value)} className="w-full rounded-lg border border-[var(--d-border)] bg-[var(--d-field)] px-2 py-1.5 text-sm text-[var(--d-text)]">{PRIORIDADES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
            </div>
            {i > 0 && <label className="block mt-2"><span className="text-[11px] text-[var(--d-muted)]">Espera a</span><select value={f.depende} onChange={e => set(i, "depende", e.target.value)} className="w-full rounded-lg border border-[var(--d-border)] bg-[var(--d-field)] px-2 py-1.5 text-sm text-[var(--d-text)]"><option value="">No espera a ninguna</option>{filas.slice(0, i).map((g, j) => <option key={j} value={String(j)}>{j + 1}. {g.titulo || "(sin nombre)"}</option>)}</select></label>}
            <label className="block mt-2"><span className="text-[11px] text-[var(--d-muted)]">Pasos (uno por renglón, opcional)</span><textarea value={f.pasos} onChange={e => set(i, "pasos", e.target.value)} rows={2} className="w-full rounded-lg border border-[var(--d-border)] bg-[var(--d-field)] px-2.5 py-1.5 text-sm text-[var(--d-text)]" /></label>
          </li>))}
      </ol>
      <button onClick={() => setFilas(fs => [...fs, { ...FILA_VACIA, dia: fs.length ? String((Number(fs[fs.length - 1].dia) || 0) + (Number(fs[fs.length - 1].duracion) || 1)) : "0" }])} className="mt-3 w-full rounded-xl border border-dashed border-[var(--d-border)] py-2.5 text-sm font-semibold text-[var(--d-link)]"><Plus className="w-4 h-4 inline -mt-0.5" /> Agregar actividad</button>
    </Hoja>
  );
}
