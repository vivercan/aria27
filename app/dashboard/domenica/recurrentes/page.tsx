"use client";
/**
 * /dashboard/domenica/recurrentes — Actividades que se crean solas (ARIA Doménica · 11-Oct-2026)
 * Cada día, cada lunes, cada día 1… Se crean a las 6:00 y le llegan al responsable por WhatsApp y al teléfono.
 */
import { useCallback, useEffect, useState } from "react";
import { Repeat, Plus, Pencil, Trash2, Loader2, MapPin, User as UserIcon, CalendarClock } from "lucide-react";
import { Esqueleto } from "@/components/domenica/Esqueleto";
import { DomHeader, Hoja, api, useAviso, useBase, etiqueta, campo, boton } from "@/components/domenica/ui";
import { DIAS_SEMANA, describirRecurrencia, type Frecuencia, type Recurrente } from "@/lib/plantillas";
import { fechaCorta, PRIORIDADES } from "@/lib/actividades";

type Form = { id?: string; titulo: string; descripcion: string; asignado_id: string; obra_id: string; prioridad: string; frecuencia: Frecuencia; dia: number; dias_para_entregar: string; pasos: string };
const VACIO = (miEmp: string | null): Form => ({ titulo: "", descripcion: "", asignado_id: miEmp || "", obra_id: "", prioridad: "MEDIA", frecuencia: "SEMANAL", dia: 1, dias_para_entregar: "0", pasos: "" });
const IDEAS = [
  { titulo: "Reporte semanal de avance con fotos", frecuencia: "SEMANAL" as Frecuencia, dia: 5, dias: 0 },
  { titulo: "Revisar bitácora y firmar", frecuencia: "SEMANAL" as Frecuencia, dia: 1, dias: 1 },
  { titulo: "Inventario de bodega de obra", frecuencia: "MENSUAL" as Frecuencia, dia: 1, dias: 2 },
  { titulo: "Lista de raya / destajos de la semana", frecuencia: "SEMANAL" as Frecuencia, dia: 4, dias: 1 },
];

export default function RecurrentesPage() {
  const base = useBase();
  const { flash, nodo } = useAviso();
  const [lista, setLista] = useState<Recurrente[] | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const cargar = useCallback(async () => {
    try { const r = await api<{ recurrentes: Recurrente[] }>("/api/actividades/recurrentes"); setLista(r.recurrentes); } catch (e) { flash("err", (e as Error).message); setLista([]); }
  }, [flash]);
  useEffect(() => { cargar(); }, [cargar]);
  const nombre = (id: string | null) => base.emps.find(e => e.id === id)?.full_name || "—";
  const obra = (id: string | null) => base.obras.find(o => o.id === id)?.nombre || null;

  const toggle = async (r: Recurrente) => {
    setLista(l => (l || []).map(x => x.id === r.id ? { ...x, activa: !r.activa } : x));
    try { await api(`/api/actividades/recurrentes/${r.id}`, "PATCH", { activa: !r.activa }); cargar(); } catch (e) { flash("err", (e as Error).message); cargar(); }
  };
  const borrar = async (r: Recurrente) => {
    if (!window.confirm(`¿Borrar "${r.titulo}"? Ya no se creará.`)) return;
    try { await api(`/api/actividades/recurrentes/${r.id}`, "DELETE"); cargar(); flash("ok", "Borrada"); } catch (e) { flash("err", (e as Error).message); }
  };

  return (
    <div className="dom-page h-full overflow-y-auto">
      <div className="px-4 md:px-6 pt-4 pb-28 md:pb-10 max-w-4xl mx-auto">
        <DomHeader icon={Repeat} from="#0073ea" titulo="Recurrentes" desc="Lo que se repite se crea solo: cada día, cada semana o cada mes, a las 6:00, y le avisa al responsable."
          accion={<button onClick={() => setForm(VACIO(base.miEmp))} className={boton}><Plus className="w-4 h-4" />Nueva</button>} />

        {lista === null ? <div className="mt-5"><Esqueleto filas={4} alto={110} /></div> : (
          <>
            {lista.length === 0 && (
              <section className="mt-6">
                <h2 className="text-sm font-bold text-[var(--d-text)] mb-2">Ideas para empezar</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {IDEAS.map((x, i) => (
                    <button key={x.titulo} onClick={() => setForm({ ...VACIO(base.miEmp), titulo: x.titulo, frecuencia: x.frecuencia, dia: x.dia, dias_para_entregar: String(x.dias) })} className="dom-card dom-in rounded-2xl p-3 text-left" style={{ animationDelay: `${i * 60}ms` }}>
                      <div className="text-[14px] font-semibold text-[var(--d-text)]">{x.titulo}</div>
                      <div className="text-[12px] text-[var(--d-muted)]">{describirRecurrencia(x.frecuencia, x.dia)}</div>
                    </button>))}
                </div>
              </section>
            )}
            <div className="mt-6 space-y-2">
              {lista.map((r, i) => (
                <div key={r.id} className={`dom-card dom-in rounded-2xl p-4 ${r.activa ? "" : "opacity-60"}`} style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggle(r)} aria-label={r.activa ? "Pausar" : "Activar"} className={`mt-0.5 shrink-0 w-11 h-6 rounded-full relative transition ${r.activa ? "bg-[#3cde01]" : "bg-[var(--d-border)]"}`}><span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${r.activa ? "left-[22px]" : "left-0.5"}`} /></button>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-semibold text-[var(--d-text)]">{r.titulo}</div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[var(--d-muted)]">
                        <span className="inline-flex items-center gap-1 font-semibold text-[var(--d-link)]"><Repeat className="w-3.5 h-3.5" />{describirRecurrencia(r.frecuencia, r.dia)}</span>
                        <span className="inline-flex items-center gap-1"><UserIcon className="w-3.5 h-3.5" />{nombre(r.asignado_id)}</span>
                        {obra(r.obra_id) && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{obra(r.obra_id)}</span>}
                        {r.activa && <span className="inline-flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" />Siguiente: {fechaCorta(r.proxima)}</span>}
                      </div>
                    </div>
                    <button onClick={() => setForm({ id: r.id, titulo: r.titulo, descripcion: r.descripcion || "", asignado_id: r.asignado_id, obra_id: r.obra_id || "", prioridad: r.prioridad, frecuencia: r.frecuencia, dia: r.dia || 1, dias_para_entregar: String(r.dias_para_entregar || 0), pasos: (r.checklist || []).join("\n") })} className="p-2 rounded-lg text-[var(--d-text-2)] hover:bg-[var(--d-hover)]" aria-label="Editar"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => borrar(r)} className="p-2 rounded-lg text-[var(--d-danger)] hover:bg-[#e2445c]/10" aria-label="Borrar"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>))}
            </div>
          </>
        )}
      </div>
      {form && <Editor f={form} setF={setForm} emps={base.emps} obras={base.obras} onSaved={() => { setForm(null); cargar(); flash("ok", "Guardada. Se creará sola."); }} flash={flash} />}
      {nodo}
    </div>
  );
}

function Editor({ f, setF, emps, obras, onSaved, flash }: { f: Form; setF: (f: Form | null) => void; emps: { id: string; full_name: string }[]; obras: { id: string; nombre: string }[]; onSaved: () => void; flash: (t: "ok" | "err", m: string) => void }) {
  const [busy, setBusy] = useState(false);
  const up = (p: Partial<Form>) => setF({ ...f, ...p });
  const guardar = async () => {
    setBusy(true);
    const body = { titulo: f.titulo, descripcion: f.descripcion, asignado_id: f.asignado_id, obra_id: f.obra_id || null, prioridad: f.prioridad, frecuencia: f.frecuencia, dia: f.dia, dias_para_entregar: Number(f.dias_para_entregar) || 0, checklist: f.pasos.split("\n").map(x => x.trim()).filter(Boolean) };
    try { if (f.id) await api(`/api/actividades/recurrentes/${f.id}`, "PATCH", body); else await api("/api/actividades/recurrentes", "POST", body); onSaved(); }
    catch (e) { flash("err", (e as Error).message); } finally { setBusy(false); }
  };
  const chip = (on: boolean) => `rounded-xl px-3 py-2 text-sm font-semibold transition ${on ? "bg-[#0073ea] text-white shadow-[0_6px_14px_-8px_#0073ea]" : "bg-[var(--d-card-2)] text-[var(--d-text-2)]"}`;
  return (
    <Hoja titulo={f.id ? "Editar recurrente" : "Nueva recurrente"} onClose={() => setF(null)} pie={<button onClick={guardar} disabled={busy} className={`${boton} w-full py-3`}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Guardar</button>}>
      <label className="block"><span className={etiqueta}>Qué hay que hacer</span><input value={f.titulo} onChange={e => up({ titulo: e.target.value })} placeholder="Ej. Reporte semanal de avance con fotos" className={campo} /></label>
      <div className="mt-4"><span className={etiqueta}>Cada cuándo</span>
        <div className="mt-1 grid grid-cols-3 gap-2">{(["DIARIA", "SEMANAL", "MENSUAL"] as Frecuencia[]).map(x => <button key={x} type="button" onClick={() => up({ frecuencia: x, dia: x === "MENSUAL" ? 1 : x === "SEMANAL" ? 1 : 1 })} className={chip(f.frecuencia === x)}>{x === "DIARIA" ? "Diario" : x === "SEMANAL" ? "Semanal" : "Mensual"}</button>)}</div>
        {f.frecuencia === "SEMANAL" && <div className="mt-2 grid grid-cols-7 gap-1">{[1, 2, 3, 4, 5, 6, 7].map(d => <button key={d} type="button" onClick={() => up({ dia: d })} className={`rounded-lg py-2 text-xs font-bold ${f.dia === d ? "bg-[#0073ea] text-white" : "bg-[var(--d-card-2)] text-[var(--d-text-2)]"}`}>{DIAS_SEMANA[d].slice(0, 2).toUpperCase()}</button>)}</div>}
        {f.frecuencia === "MENSUAL" && <select value={f.dia} onChange={e => up({ dia: Number(e.target.value) })} className={campo}>{Array.from({ length: 28 }, (_, i) => i + 1).map(d => <option key={d} value={d}>Día {d} de cada mes</option>)}<option value={31}>Último día del mes</option></select>}
        <div className="mt-2 text-[12px] text-[var(--d-link)] font-semibold">{describirRecurrencia(f.frecuencia, f.dia)}</div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block"><span className={etiqueta}>Quién la hace</span><select value={f.asignado_id} onChange={e => up({ asignado_id: e.target.value })} className={campo}><option value="">Elige…</option>{emps.map(x => <option key={x.id} value={x.id}>{x.full_name}</option>)}</select></label>
        <label className="block"><span className={etiqueta}>Obra</span><select value={f.obra_id} onChange={e => up({ obra_id: e.target.value })} className={campo}><option value="">Sin obra (oficina)</option>{obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select></label>
        <label className="block"><span className={etiqueta}>Días para entregarla</span><select value={f.dias_para_entregar} onChange={e => up({ dias_para_entregar: e.target.value })} className={campo}>{[0, 1, 2, 3, 5, 7].map(d => <option key={d} value={String(d)}>{d === 0 ? "El mismo día" : `${d} día${d === 1 ? "" : "s"} después`}</option>)}</select></label>
        <label className="block"><span className={etiqueta}>Prioridad</span><select value={f.prioridad} onChange={e => up({ prioridad: e.target.value })} className={campo}>{PRIORIDADES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
      </div>
      <label className="block mt-3"><span className={etiqueta}>Pasos (uno por renglón, opcional)</span><textarea value={f.pasos} onChange={e => up({ pasos: e.target.value })} rows={3} className={campo} /></label>
      <label className="block mt-3"><span className={etiqueta}>Detalles (opcional)</span><textarea value={f.descripcion} onChange={e => up({ descripcion: e.target.value })} rows={2} className={campo} /></label>
    </Hoja>
  );
}
