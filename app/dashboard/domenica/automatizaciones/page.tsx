"use client";
/**
 * /dashboard/domenica/automatizaciones — ARIA Doménica · "si pasa X, haz Y" sin programar (10-Oct-2026)
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { DISPARADORES, ESTADOS_REQUI, PLANTILLAS, ROLES_DESTINO, describir, type Disparador, type Regla } from "@/lib/automatizaciones";
import { Zap, Plus, X, Play, Trash2, Pencil, Loader2, ArrowLeft, FlaskConical, Bell, ClipboardCheck, Clock } from "lucide-react";

type U = { email: string; name?: string | null; display_name?: string | null; role: string };
type Emp = { id: string; full_name: string };
type Obra = { id: string; nombre: string };
type Prueba = { total: number; casos: { etiqueta: string; obra: string; dias: number; url: string }[]; simulacion: { envios: { nombre: string; email: string; casos: number; mensaje: string }[]; nuevos: number; resumen: string } };

async function api<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const r = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error || `Error ${r.status}`);
  return j as T;
}

const VACIA = (): Omit<Regla, "id"> => ({ nombre: "", activa: true, modo_prueba: true, disparador: "REQUI_ESTANCADA", params: { estado: "EN_AUTORIZACION", dias: 2, antiguedad_max: 30 }, destinatarios: { roles: ["direccion"], personas: [], involucrado: false }, accion: "AVISAR", accion_params: {}, mensaje: "", repetir_cada_horas: 24 });

export default function AutomatizacionesPage() {
  const [reglas, setReglas] = useState<Regla[]>([]);
  const [casos7d, setCasos7d] = useState<Record<string, number>>({});
  const [puede, setPuede] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<U[]>([]); const [emps, setEmps] = useState<Emp[]>([]); const [obras, setObras] = useState<Obra[]>([]);
  const [edit, setEdit] = useState<(Omit<Regla, "id"> & { id?: string }) | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [prueba, setPrueba] = useState<{ regla: Regla; data: Prueba | null } | null>(null);
  const [toast, setToast] = useState<{ t: "ok" | "err"; m: string } | null>(null);
  const flash = (t: "ok" | "err", m: string) => { setToast({ t, m }); setTimeout(() => setToast(null), 3500); };

  const cargar = useCallback(async () => {
    try { const r = await api<{ reglas: Regla[]; casos7d: Record<string, number>; puedeEditar: boolean }>("/api/automatizaciones"); setReglas(r.reglas); setCasos7d(r.casos7d); setPuede(r.puedeEditar); }
    catch (e) { flash("err", (e as Error).message); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    cargar();
    supabase.from("Users").select("email, name, display_name, role, active").then(({ data }) => setUsers(((data || []) as (U & { active?: boolean })[]).filter(u => u.active !== false)));
    supabase.from("employees").select("id, full_name").eq("status", "ACTIVO").order("full_name").then(({ data }) => setEmps((data || []) as Emp[]));
    supabase.from("centros_trabajo").select("id, nombre").eq("activo", true).order("nombre").then(({ data }) => setObras((data || []) as Obra[]));
  }, [cargar]);

  const usar = async (p: (typeof PLANTILLAS)[number]) => {
    try { await api("/api/automatizaciones", "POST", { ...p, activa: true, modo_prueba: true }); flash("ok", "Activada en modo prueba: los avisos te llegan solo a ti"); cargar(); }
    catch (e) { flash("err", (e as Error).message); }
  };
  const guardar = async () => {
    if (!edit) return; setGuardando(true);
    try {
      if (edit.id) await api(`/api/automatizaciones/${edit.id}`, "PATCH", edit); else await api("/api/automatizaciones", "POST", edit);
      flash("ok", edit.id ? "Automatización actualizada" : "Automatización creada"); setEdit(null); cargar();
    } catch (e) { flash("err", (e as Error).message); } finally { setGuardando(false); }
  };
  const toggle = async (r: Regla, campo: "activa" | "modo_prueba") => {
    setReglas(p => p.map(x => x.id === r.id ? { ...x, [campo]: !r[campo] } : x));
    try { await api(`/api/automatizaciones/${r.id}`, "PATCH", { [campo]: !r[campo] }); }
    catch (e) { flash("err", (e as Error).message); cargar(); }
  };
  const borrar = async (r: Regla) => {
    if (!window.confirm(`¿Borrar "${r.nombre}"?`)) return;
    try { await api(`/api/automatizaciones/${r.id}`, "DELETE"); setReglas(p => p.filter(x => x.id !== r.id)); } catch (e) { flash("err", (e as Error).message); }
  };
  const probar = async (r: Regla) => {
    setPrueba({ regla: r, data: null });
    try { const d = await api<Prueba>(`/api/automatizaciones/${r.id}/probar`, "POST"); setPrueba({ regla: r, data: d }); }
    catch (e) { flash("err", (e as Error).message); setPrueba(null); }
  };
  const usadas = useMemo(() => new Set(reglas.map(r => r.nombre)), [reglas]);

  return (
    <div className="dom-page h-full overflow-y-auto">
      <div className="px-4 md:px-6 pt-4 pb-28 md:pb-10 max-w-5xl mx-auto">
        <Link href="/dashboard/domenica" className="hidden md:inline-flex items-center gap-1 text-xs text-[var(--d-link)] mb-2"><ArrowLeft className="w-3.5 h-3.5" />ARIA Doménica</Link>
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-11 h-11 rounded-2xl bg-[#b85507] flex items-center justify-center"><Zap className="w-6 h-6 text-white" /></span>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[var(--d-text)] tracking-tight">Automatizaciones</h1>
            <p className="text-[13px] text-[var(--d-muted)]">Reglas que vigilan por ti: cuando pasa algo, avisan por WhatsApp y al teléfono, o crean una actividad. Se revisan cada 30 minutos, de 7:00 a 20:00.</p>
          </div>
          {puede && <button onClick={() => setEdit(VACIA())} className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[#0073ea] px-4 py-2.5 text-sm font-semibold text-white"><Plus className="w-4 h-4" />Nueva</button>}
        </div>

        {puede && (
          <section className="mt-6">
            <h2 className="text-sm font-bold text-[var(--d-text)] mb-2">Listas para usar <span className="font-normal text-[var(--d-muted)]">· un clic y quedan en modo prueba</span></h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {PLANTILLAS.map(p => (
                <div key={p.nombre} className="rounded-2xl border border-[var(--d-border)] bg-[var(--d-card)] p-3 flex flex-col gap-2">
                  <div className="text-[13.5px] font-semibold text-[var(--d-text)]">{p.nombre}</div>
                  <div className="text-[11.5px] text-[var(--d-muted)] flex-1">{describir(p)}</div>
                  <button disabled={usadas.has(p.nombre)} onClick={() => usar(p)} className="self-start rounded-lg bg-[var(--d-card-2)] px-3 py-1.5 text-xs font-semibold text-[var(--d-text)] disabled:opacity-40">{usadas.has(p.nombre) ? "Ya la tienes" : "Usar"}</button>
                </div>))}
            </div>
          </section>
        )}

        <section className="mt-7">
          <h2 className="text-sm font-bold text-[var(--d-text)] mb-2">Tus automatizaciones</h2>
          {loading ? <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#579bfc]" /></div> :
            reglas.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--d-border)] p-8 text-center text-[var(--d-muted)]">Todavía no hay automatizaciones. Usa una de arriba o crea la tuya.</div> :
              <div className="space-y-2">
                {reglas.map(r => (
                  <div key={r.id} className={`rounded-2xl border p-4 ${r.activa ? "border-[var(--d-border)] bg-[var(--d-card)]" : "border-[var(--d-border)] bg-[var(--d-card)] opacity-70"}`}>
                    <div className="flex items-start gap-3">
                      <button disabled={!puede} onClick={() => toggle(r, "activa")} aria-label={r.activa ? "Apagar" : "Encender"} className={`mt-0.5 shrink-0 w-11 h-6 rounded-full relative transition ${r.activa ? "bg-[#1f8500]" : "bg-[var(--d-border)]"} sobre-verde`}><span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${r.activa ? "left-[22px]" : "left-0.5"}`} /></button>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><span className="text-[14.5px] font-semibold text-[var(--d-text)]">{r.nombre}</span>
                          {r.modo_prueba && <span className="inline-flex items-center gap-1 rounded-md bg-[#a25ddc]/20 text-[var(--d-purple)] text-[11px] font-semibold px-1.5 py-0.5"><FlaskConical className="w-3 h-3" />Prueba: solo te llega a ti</span>}</div>
                        <div className="text-[12.5px] text-[var(--d-text-2)] mt-0.5">{describir(r)}</div>
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--d-muted)]">
                          <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{r.ultima_corrida ? `Revisó ${new Date(r.ultima_corrida).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "Aún no corre"}</span>
                          {r.ultimo_resultado && <span>{r.ultimo_resultado}</span>}
                          <span>{casos7d[r.id] || 0} caso(s) en 7 días</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => probar(r)} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--d-card-2)] px-3 py-1.5 text-xs font-semibold text-[var(--d-text)]"><Play className="w-3.5 h-3.5" />Probar ahora</button>
                      {puede && <button onClick={() => toggle(r, "modo_prueba")} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--d-card-2)] px-3 py-1.5 text-xs font-semibold text-[var(--d-text)]"><FlaskConical className="w-3.5 h-3.5" />{r.modo_prueba ? "Pasar a real" : "Volver a prueba"}</button>}
                      {puede && <button onClick={() => setEdit({ ...r })} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--d-card-2)] px-3 py-1.5 text-xs font-semibold text-[var(--d-text)]"><Pencil className="w-3.5 h-3.5" />Editar</button>}
                      {puede && <button onClick={() => borrar(r)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--d-danger)] hover:bg-[#d0304a]/10"><Trash2 className="w-3.5 h-3.5" />Borrar</button>}
                    </div>
                  </div>))}
              </div>}
        </section>
      </div>

      {/* Editor */}
      {edit && (
        <div className="aria-sheet fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/55" onClick={() => setEdit(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full md:max-w-2xl max-h-[94dvh] rounded-t-3xl md:rounded-3xl bg-[var(--d-surface)] border border-[var(--d-border)] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-4"><h2 className="text-lg font-bold text-[var(--d-text)]">{edit.id ? "Editar automatización" : "Nueva automatización"}</h2><button onClick={() => setEdit(null)} className="p-2 rounded-xl hover:bg-[var(--d-hover)] text-[var(--d-text-2)]" aria-label="Cerrar"><X className="w-5 h-5" /></button></div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              <input value={edit.nombre} onChange={e => setEdit({ ...edit, nombre: e.target.value })} placeholder="Nombre (ej. Requis detenidas en Dirección)" className="w-full rounded-xl bg-[var(--d-card)] border border-[var(--d-border)] px-4 py-3 text-[var(--d-text)] placeholder-[#5f7390]" />
              <div className="rounded-2xl border border-[#579bfc]/30 bg-[#579bfc]/[0.06] p-4 space-y-3">
                <div className="text-[11px] uppercase tracking-wide text-[var(--d-link)] font-bold">Cuando…</div>
                <select value={edit.disparador} onChange={e => { const d = e.target.value as Disparador; const def: Record<string, unknown> = { antiguedad_max: edit.params.antiguedad_max ?? 30 }; for (const p of DISPARADORES[d].params) def[p.key] = p.def; setEdit({ ...edit, disparador: d, params: def }); }} className="w-full rounded-xl px-3 py-2.5 text-sm">
                  {(Object.keys(DISPARADORES) as Disparador[]).map(k => <option key={k} value={k}>{DISPARADORES[k].titulo}</option>)}
                </select>
                <div className="grid gap-3 sm:grid-cols-3">
                  {DISPARADORES[edit.disparador].params.map(p => (
                    <label key={p.key} className={`block ${p.tipo === "estado" ? "sm:col-span-2" : ""}`}><span className="text-[11px] text-[var(--d-muted)]">{p.label}</span>
                      {p.tipo === "estado"
                        ? <select value={String(edit.params[p.key] ?? p.def)} onChange={e => setEdit({ ...edit, params: { ...edit.params, [p.key]: e.target.value } })} className="mt-1 w-full rounded-xl px-3 py-2 text-sm">{ESTADOS_REQUI.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
                        : <input type="number" inputMode="numeric" min={0} value={String(edit.params[p.key] ?? p.def)} onChange={e => setEdit({ ...edit, params: { ...edit.params, [p.key]: e.target.value } })} className="mt-1 w-full rounded-xl bg-[var(--d-card)] border border-[var(--d-border)] px-3 py-2 text-sm text-[var(--d-text)]" />}
                    </label>))}
                  <label className="block"><span className="text-[11px] text-[var(--d-muted)]">Solo en la obra</span>
                    <select value={String(edit.params.obra || "")} onChange={e => setEdit({ ...edit, params: { ...edit.params, obra: e.target.value || undefined } })} className="mt-1 w-full rounded-xl px-3 py-2 text-sm"><option value="">Todas las obras</option>{obras.map(o => <option key={o.id} value={o.nombre}>{o.nombre}</option>)}</select></label>
                  {edit.disparador !== "REQUI_MONTO_ALTO" && <label className="block"><span className="text-[11px] text-[var(--d-muted)]">Ignorar casos de más de (días)</span>
                    <input type="number" min={1} value={String(edit.params.antiguedad_max ?? 30)} onChange={e => setEdit({ ...edit, params: { ...edit.params, antiguedad_max: e.target.value } })} className="mt-1 w-full rounded-xl bg-[var(--d-card)] border border-[var(--d-border)] px-3 py-2 text-sm text-[var(--d-text)]" /></label>}
                </div>
              </div>
              <div className="rounded-2xl border border-[#1f8500]/30 bg-[#1f8500]/[0.05] p-4 space-y-3">
                <div className="text-[11px] uppercase tracking-wide text-[var(--d-ok)] font-bold">Entonces…</div>
                <div className="grid grid-cols-2 gap-2">
                  {([["AVISAR", "Avisar", Bell], ["CREAR_ACTIVIDAD", "Crear una actividad", ClipboardCheck]] as const).map(([v, l, I]) => (
                    <button key={v} onClick={() => setEdit({ ...edit, accion: v })} className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold ${edit.accion === v ? "bg-[#1f8500] text-white" : "bg-[var(--d-card-2)] text-[var(--d-text-2)]"} sobre-verde`}><I className="w-4 h-4" />{l}</button>))}
                </div>
                {edit.accion === "AVISAR" ? (<>
                  <div className="flex flex-wrap gap-2">
                    {ROLES_DESTINO.map(r => { const on = (edit.destinatarios.roles || []).includes(r.id); return (
                      <button key={r.id} onClick={() => setEdit({ ...edit, destinatarios: { ...edit.destinatarios, roles: on ? (edit.destinatarios.roles || []).filter(x => x !== r.id) : [...(edit.destinatarios.roles || []), r.id] } })} className={`rounded-full px-3 py-1.5 text-xs font-semibold border ${on ? "bg-[#0073ea] border-[#0073ea] text-white" : "border-[var(--d-border)] text-[var(--d-text-2)]"}`}>{r.label}</button>); })}
                    <button onClick={() => setEdit({ ...edit, destinatarios: { ...edit.destinatarios, involucrado: !edit.destinatarios.involucrado } })} className={`rounded-full px-3 py-1.5 text-xs font-semibold border ${edit.destinatarios.involucrado ? "bg-[#0073ea] border-[#0073ea] text-white" : "border-[var(--d-border)] text-[var(--d-text-2)]"}`}>Al involucrado</button>
                  </div>
                  <select value="" onChange={e => { const v = e.target.value; if (v && !(edit.destinatarios.personas || []).includes(v)) setEdit({ ...edit, destinatarios: { ...edit.destinatarios, personas: [...(edit.destinatarios.personas || []), v] } }); }} className="w-full rounded-xl px-3 py-2 text-sm"><option value="">+ Agregar una persona</option>{users.map(u => <option key={u.email} value={u.email}>{u.display_name || u.name || u.email}</option>)}</select>
                  {(edit.destinatarios.personas || []).length > 0 && <div className="flex flex-wrap gap-2">{(edit.destinatarios.personas || []).map(p => <span key={p} className="inline-flex items-center gap-1 rounded-full bg-[var(--d-card-2)] px-3 py-1 text-xs text-[var(--d-text)]">{users.find(u => u.email === p)?.display_name || p}<button onClick={() => setEdit({ ...edit, destinatarios: { ...edit.destinatarios, personas: (edit.destinatarios.personas || []).filter(x => x !== p) } })} aria-label="Quitar"><X className="w-3 h-3" /></button></span>)}</div>}
                  <textarea value={edit.mensaje || ""} onChange={e => setEdit({ ...edit, mensaje: e.target.value })} rows={2} placeholder={`Mensaje (opcional). Por defecto: ${DISPARADORES[edit.disparador].mensaje}`} className="w-full rounded-xl bg-[var(--d-card)] border border-[var(--d-border)] p-3 text-sm text-[var(--d-text)] placeholder-[#5f7390]" />
                </>) : (<>
                  <select value={edit.accion_params.empleado_id || ""} onChange={e => setEdit({ ...edit, accion_params: { ...edit.accion_params, empleado_id: e.target.value } })} className="w-full rounded-xl px-3 py-2 text-sm"><option value="">¿A quién se le asigna?</option>{emps.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select>
                  <input value={edit.accion_params.titulo || ""} onChange={e => setEdit({ ...edit, accion_params: { ...edit.accion_params, titulo: e.target.value } })} placeholder="Título de la actividad (ej. Revisar requi detenida)" className="w-full rounded-xl bg-[var(--d-card)] border border-[var(--d-border)] px-3 py-2 text-sm text-[var(--d-text)] placeholder-[#5f7390]" />
                </>)}
                <label className="flex items-center gap-2 text-sm text-[var(--d-text-2)]">No repetir el mismo caso antes de
                  <input type="number" min={1} value={edit.repetir_cada_horas} onChange={e => setEdit({ ...edit, repetir_cada_horas: Number(e.target.value) || 24 })} className="w-20 rounded-lg bg-[var(--d-card)] border border-[var(--d-border)] px-2 py-1 text-sm text-[var(--d-text)]" /> horas</label>
              </div>
              <label className="flex items-center gap-3 rounded-2xl border border-[#a25ddc]/30 bg-[#a25ddc]/[0.08] p-3 text-sm text-white">
                <input type="checkbox" checked={edit.modo_prueba} onChange={e => setEdit({ ...edit, modo_prueba: e.target.checked })} className="w-5 h-5" />
                <span><b>Modo prueba</b> · los avisos te llegan solo a ti hasta que la pases a real</span>
              </label>
              <div className="rounded-xl bg-[var(--d-card)] p-3 text-[13px] text-[var(--d-text-2)]"><span className="text-[var(--d-muted)]">Así queda: </span>{describir(edit)}</div>
            </div>
            <div className="px-5 py-3 border-t border-[var(--d-border)]" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
              <button onClick={guardar} disabled={guardando} className="w-full rounded-xl bg-[#0073ea] py-3 text-sm font-bold text-white disabled:opacity-60">{guardando ? "Guardando…" : "Guardar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Probar */}
      {prueba && (
        <div className="aria-sheet fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/55" onClick={() => setPrueba(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full md:max-w-2xl max-h-[90dvh] rounded-t-3xl md:rounded-3xl bg-[var(--d-surface)] border border-[var(--d-border)] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-4"><h2 className="text-lg font-bold text-[var(--d-text)]">Si corriera ahora…</h2><button onClick={() => setPrueba(null)} className="p-2 rounded-xl hover:bg-[var(--d-hover)] text-[var(--d-text-2)]" aria-label="Cerrar"><X className="w-5 h-5" /></button></div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {!prueba.data ? <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#579bfc]" /></div> : (<>
                <div className="text-sm text-[var(--d-text-2)]"><b className="text-[var(--d-text)]">{prueba.data.total}</b> caso(s) cumplen la regla · <b className="text-[var(--d-text)]">{prueba.data.simulacion.nuevos}</b> se avisarían (los demás ya se avisaron hace poco). No se mandó nada.</div>
                {prueba.data.simulacion.envios.map((e, i) => (
                  <div key={i} className="rounded-xl border border-[var(--d-border)] bg-[var(--d-card)] p-3">
                    <div className="text-xs text-[var(--d-muted)]">Le llegaría a <b className="text-[var(--d-text)]">{e.nombre}</b> ({e.casos} caso{e.casos === 1 ? "" : "s"})</div>
                    <div className="mt-1 text-[13px] text-[var(--d-text)]">{e.mensaje}</div>
                  </div>))}
                {prueba.data.casos.length > 0 && <div><div className="text-[11px] uppercase tracking-wide text-[var(--d-muted)] mb-1">Casos</div>
                  <ul className="divide-y divide-[var(--d-border)] rounded-xl border border-[var(--d-border)]">{prueba.data.casos.map((c, i) => <li key={i}><Link href={c.url} className="flex justify-between gap-3 px-3 py-2 text-sm hover:bg-[var(--d-hover)]"><span className="text-[var(--d-text)] truncate">{c.etiqueta} <span className="text-[var(--d-muted)]">· {c.obra}</span></span><span className="text-[var(--d-warn)] shrink-0">{c.dias} días</span></Link></li>)}</ul></div>}
              </>)}
            </div>
          </div>
        </div>
      )}
      {toast && <div className={`fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-8 z-[80] rounded-xl px-4 py-2.5 text-sm font-medium shadow-2xl ${toast.t === "ok" ? "bg-[#1f8500] text-white" : "bg-[#d0304a] text-white"} sobre-verde`}>{toast.m}</div>}
    </div>
  );
}
