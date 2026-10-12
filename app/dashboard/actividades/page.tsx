"use client";
/**
 * /dashboard/actividades — Tablero de actividades tipo Monday (10-Oct-2026)
 * Vistas: Mi trabajo (por fecha) · Tablero (columnas por estado, arrastrar en escritorio) · Lista (grupos)
 * Ficha: estado, avance, responsable, fechas, prioridad, obra, descripcion, checklist y actualizaciones con foto.
 * Fuente: tareas_asignadas (la misma que contesta el bot de WhatsApp). Cambios por /api/actividades (historial + avisos WA).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { numeroCorto } from "@/lib/folio";
import FolioCruzado from "@/components/FolioCruzado";
import { celebrar } from "@/lib/celebrar";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PanelPorRevisar from "@/components/domenica/PorRevisar";
import { atrasoTexto,
  COLUMNAS, PRIORIDADES, prioridadDe, columnaDe, diasAtraso, venceHoy, esMia, laAsigneYo, iniciales, colorPersona, fechaCorta, haceCuanto, resumen,
  type Actividad, type ColumnaId,
} from "@/lib/actividades";
import {
  Plus, X, Search, LayoutGrid, List, Sun, Camera, Send, Trash2, CheckSquare, Square, MessageSquare, CalendarDays, Loader2,
  ChevronDown, ChevronRight, AlertTriangle, Flag, MapPin, Paperclip, User as UserIcon, GanttChart, Hourglass,
} from "lucide-react";
import { mencionesEnTexto } from "@/lib/plantillas";
import { parecido, type VozActividad } from "@/lib/voz";
import { rutaCritica } from "@/lib/dependencias";
import LinkEvidencia from "@/components/domenica/LinkEvidencia";
import { enRiesgo } from "@/lib/riesgo";
import { Esqueleto } from "@/components/domenica/Esqueleto";
import { Vacio } from "@/components/domenica/Vacio";

type Emp = { id: string; full_name: string; whatsapp?: string | null };
type Obra = { id: string; nombre: string };
type Chk = { id: string; tarea_id: string; texto: string; hecho: boolean; orden: number };
type Upd = { id: string; tarea_id: string; autor_email?: string | null; autor_nombre?: string | null; tipo: string; texto?: string | null; foto_url?: string | null; archivo_url?: string | null; archivo_nombre?: string | null; created_at: string };
type Vista = "mi" | "tablero" | "lista" | "linea";
type Ambito = "mias" | "asigne" | "todas";

const SUPER = ["admin", "administrador", "rh", "direccion", "validador"];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** Pinta en azul los @Nombre de un comentario */
function resaltarMenciones(texto: string, personas: { id: string; nombre: string }[]): React.ReactNode {
  const nombres = personas.map(p => p.nombre).filter(n => n && texto.toLowerCase().includes("@" + n.toLowerCase())).sort((a, b) => b.length - a.length);
  if (!nombres.length) return texto;
  const re = new RegExp("(" + nombres.map(n => "@" + n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
  return texto.split(re).map((parte, i) => i % 2 === 1 ? <span key={i} className="font-semibold text-[var(--d-link)] bg-[#0073ea]/10 rounded px-0.5">{parte}</span> : parte);
}

// ── Cola sin señal (10-Oct-2026): si no hay conexión, el cambio se guarda en el teléfono y se envía al volver la señal ──
const COLA = "aria:cola-actividades";
type Pendiente = { url: string; method: string; body?: unknown; t: number };
const leerCola = (): Pendiente[] => { try { return JSON.parse(localStorage.getItem(COLA) || "[]") as Pendiente[]; } catch { return []; } };
const guardarCola = (c: Pendiente[]) => { try { localStorage.setItem(COLA, JSON.stringify(c.slice(-200))); } catch { /* sin espacio */ } };
/** Rechazos al mandar lo guardado sin señal (antes se contaban como "enviados" y se perdían sin avisar) */
let rechazosCola: string[] = [];
async function enviarCola(): Promise<number> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return 0;
  const cola = leerCola(); if (!cola.length) return 0;
  const resto: Pendiente[] = []; let enviados = 0; rechazosCola = [];
  for (const p of cola) {
    try {
      const r = await fetch(p.url, { method: p.method, credentials: "include", headers: { "Content-Type": "application/json" }, body: p.body ? JSON.stringify(p.body) : undefined });
      if (r.ok) enviados++;
      else if (r.status >= 400 && r.status < 500 && r.status !== 401) { const j = await r.json().catch(() => ({})) as { error?: string }; const t = (p.body as { titulo?: string } | undefined)?.titulo; rechazosCola.push(`${t ? `"${String(t).slice(0, 40)}": ` : ""}${j.error || `error ${r.status}`}`); }
      else resto.push(p);
    } catch { resto.push(p); }
  }
  guardarCola(resto); return enviados;
}
async function api<T = Record<string, unknown>>(url: string, method: string, body?: unknown): Promise<T> {
  const encolar = () => { guardarCola([...leerCola(), { url, method, body, t: Date.now() }]); return { encolado: true } as unknown as T; };
  if (method !== "GET" && typeof navigator !== "undefined" && navigator.onLine === false) return encolar();
  let r: Response;
  try { r = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); }
  catch (e) { if (method !== "GET") return encolar(); throw e; }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error || `Error ${r.status}`);
  return j as T;
}

async function comprimir(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const max = 1600; const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
  return await new Promise<Blob>(res => c.toBlob(b => res(b || file), "image/jpeg", 0.8));
}

function Avatar({ nombre, size = 28 }: { nombre?: string | null; size?: number }) {
  return (
    <span title={nombre || ""} className="inline-flex items-center justify-center rounded-full font-bold text-white shrink-0"
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.4)), background: colorPersona(nombre) }}>{iniciales(nombre)}</span>
  );
}

function StatusPill({ col, small }: { col: ColumnaId; small?: boolean }) {
  const c = COLUMNAS.find(x => x.id === col)!;
  return <span className={`inline-flex items-center rounded-md font-semibold text-white ${small ? "text-[11px] px-1.5 py-0.5" : "text-xs px-2.5 py-1"}`} style={{ background: c.color }}>{c.label}</span>;
}

function Fecha({ a }: { a: Actividad }) {
  if (!a.fecha_compromiso) return <span className="text-[11px] text-[var(--d-faint)]">Sin fecha</span>;
  const d = diasAtraso(a); const h = venceHoy(a); const term = columnaDe(a) === "TERMINADA";
  const cls = term ? "text-[var(--d-muted)]" : d > 0 ? "text-[var(--d-danger)] font-semibold" : h ? "text-[var(--d-warn)] font-semibold" : "text-[var(--d-text-2)]";
  return <span className={`inline-flex items-center gap-1 text-[11px] ${cls}`}><CalendarDays className="w-3 h-3" />{h && !term ? "Hoy" : fechaCorta(a.fecha_compromiso)}{a.hora_compromiso ? ` ${String(a.hora_compromiso).slice(0, 5)}` : ""}{d > 0 && !term ? ` · ${atrasoTexto(d)}` : ""}</span>;
}

function Barra({ pct, col }: { pct: number; col: ColumnaId }) {
  const c = COLUMNAS.find(x => x.id === col)!;
  return <div className="h-1.5 rounded-full bg-[var(--d-card-2)] overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: c.color }} /></div>;
}

export default function ActividadesPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ email: string; role: string; name: string } | null>(null);
  const [miEmp, setMiEmp] = useState<string | null>(null);
  const [acts, setActs] = useState<Actividad[]>([]);
  const [emps, setEmps] = useState<Emp[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [chk, setChk] = useState<Chk[]>([]);
  const [updCount, setUpdCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState<Vista>("mi");
  const [ambito, setAmbito] = useState<Ambito>("mias");
  const [fObra, setFObra] = useState(""); const [fPersona, setFPersona] = useState(""); const [q, setQ] = useState("");
  const [verTerminadas, setVerTerminadas] = useState(false);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [nueva, setNueva] = useState(false);
  const [toast, setToast] = useState<{ t: "ok" | "err"; m: string } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [motivoPara, setMotivoPara] = useState<{ id: string } | null>(null);
  const [motivoTxt, setMotivoTxt] = useState("");
  const [colapsados, setColapsados] = useState<Record<string, boolean>>({});
  const [verFiltros, setVerFiltros] = useState(false);
  // Deslizar tarjeta (vista Mi trabajo): derecha = terminar, izquierda = atorada
  const swipe = useRef<{ id: string; x0: number; y0: number; dx: number; el: HTMLElement | null; lock: boolean | null } | null>(null);
  const suprimirClick = useRef(false);

  const flash = (t: "ok" | "err", m: string) => { setToast({ t, m }); setTimeout(() => setToast(null), 3200); };

  const cargar = useCallback(async () => {
    const [{ data: a }, { data: c }, { data: u }] = await Promise.all([
      supabase.from("tareas_asignadas").select("*").order("fecha_compromiso", { ascending: true, nullsFirst: false }).limit(1000),
      supabase.from("tarea_checklist").select("id, tarea_id, texto, hecho, orden").order("orden"),
      supabase.from("tarea_actualizaciones").select("tarea_id").limit(5000),
    ]);
    setActs(((a || []) as Actividad[]).filter(x => String(x.estatus).toUpperCase() !== "CANCELADA"));
    setChk((c || []) as Chk[]);
    const cnt: Record<string, number> = {}; for (const r of (u || []) as { tarea_id: string }[]) cnt[r.tarea_id] = (cnt[r.tarea_id] || 0) + 1; setUpdCount(cnt);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        if (r.status === 401) { router.replace("/"); return; }
        const u = await r.json(); if (!alive) return;
        const email = String(u.email || "").toLowerCase(); const role = String(u.role || "").toLowerCase();
        setMe({ email, role, name: u.display_name || u.name || email });
        const sp = new URLSearchParams(window.location.search);
        const movil = window.innerWidth < 768;
        const vp = sp.get("vista"); setVista(vp && vp !== "revisar" ? (vp as Vista) : (movil ? "mi" : "tablero"));
        if (vp === "revisar") setTimeout(() => { try { document.getElementById("por-revisar")?.scrollIntoView({ behavior: "smooth" }); } catch { /* */ } }, 1200);
        setAmbito(SUPER.includes(role) ? "todas" : "mias");
        if (sp.get("nueva") === "1") setNueva(true);
        if (sp.get("persona")) { setFPersona(sp.get("persona") || ""); setAmbito("todas"); }
        if (sp.get("obra")) setFObra(sp.get("obra") || "");
        if (sp.get("abrir") || sp.get("id")) setAbierta(sp.get("abrir") || sp.get("id"));
        const [{ data: e }, { data: o }, { data: mine }] = await Promise.all([
          supabase.from("employees").select("id, full_name, whatsapp").eq("status", "ACTIVO").order("full_name"),
          supabase.from("centros_trabajo").select("id, nombre").eq("activo", true).order("nombre"),
          supabase.from("employees").select("id").or(`usuario_email.eq.${email},email.eq.${email}`).limit(1).maybeSingle(),
        ]);
        if (!alive) return;
        setEmps((e || []) as Emp[]); setObras((o || []) as Obra[]); setMiEmp((mine as { id?: string } | null)?.id || null);
        await cargar();
      } finally { if (alive) setLoading(false); }
    })();
    const onFocus = () => { cargar(); };
    const onOnline = async () => { const n = await enviarCola(); if (rechazosCola.length) flash("err", `No se pudo guardar ${rechazosCola.join(" · ")}`); else if (n) { flash("ok", `Se enviaron ${n} cambio${n === 1 ? "" : "s"} guardados sin señal`); } cargar(); };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    enviarCola().then(n => { if (rechazosCola.length) flash("err", `No se pudo guardar ${rechazosCola.join(" · ")}`); if (n) cargar(); });
    const iv = setInterval(() => { if (document.visibilityState === "visible") cargar(); }, 60000);
    return () => { alive = false; window.removeEventListener("focus", onFocus); window.removeEventListener("online", onOnline); clearInterval(iv); };
  }, [cargar, router]);

  const esSuper = !!me && SUPER.includes(me.role);

  const visibles = useMemo(() => {
    if (!me) return [];
    const nq = norm(q.trim());
    return acts.filter(a => {
      if (ambito === "mias" && !esMia(a, me.email, miEmp)) return false;
      if (ambito === "asigne" && !laAsigneYo(a, me.email)) return false;
      if (ambito === "todas" && !esSuper && !esMia(a, me.email, miEmp) && !laAsigneYo(a, me.email)) return false;
      if (fObra && a.obra_id !== fObra && norm(a.obra || "") !== norm(obras.find(o => o.id === fObra)?.nombre || "~")) return false;
      if (fPersona && a.asignado_id !== fPersona) return false;
      if (nq && !norm(`${a.folio || ""} ${a.titulo} ${a.descripcion || ""} ${a.obra || ""} ${a.asignado_nombre || ""}`).includes(nq)) return false;
      return true;
    });
  }, [acts, me, miEmp, ambito, fObra, fPersona, q, obras, esSuper]);

  const kpi = useMemo(() => resumen(visibles), [visibles]);
  // Carga de trabajo para decidir a quién asignar (abiertas por persona)
  const carga = useMemo(() => { const m: Record<string, number> = {}; for (const a of acts) if (a.asignado_id && columnaDe(a) !== "TERMINADA") m[a.asignado_id] = (m[a.asignado_id] || 0) + 1; return m; }, [acts]);
  const chkDe = useCallback((id: string) => chk.filter(c => c.tarea_id === id), [chk]);
  const actual = useMemo(() => acts.find(a => a.id === abierta) || null, [acts, abierta]);

  const patch = async (id: string, body: Record<string, unknown>, optimista?: Partial<Actividad>) => {
    const antes = acts;
    if (optimista) setActs(prev => prev.map(a => a.id === id ? { ...a, ...optimista } : a));
    try {
      const r = await api<{ tarea?: Actividad; encolado?: boolean }>(`/api/actividades/${id}`, "PATCH", body);
      if (r.encolado) { flash("ok", "Sin señal: se guardó en tu teléfono y se enviará solo"); return true; }
      if (r.tarea) setActs(prev => prev.map(a => a.id === id ? r.tarea as Actividad : a));
      setUpdCount(c => ({ ...c, [id]: (c[id] || 0) + 1 }));
      return true;
    } catch (e) {
      setActs(antes);
      const m = (e as Error).message;
      if (esSuper && m.startsWith("Primero se tiene que terminar") && !body.forzar && window.confirm(`${m}\n\n¿Empezarla de todos modos?`)) return patch(id, { ...body, forzar: true }, optimista);
      flash("err", m); return false;
    }
  };

  const mover = async (id: string, col: ColumnaId, motivo?: string) => {
    const a = acts.find(x => x.id === id); if (!a || columnaDe(a) === col) return;
    if (col === "BLOQUEADA" && !motivo) { setMotivoPara({ id }); setMotivoTxt(""); return; }
    const opt: Partial<Actividad> = col === "TERMINADA" ? { estatus: "COMPLETADA", avance: 100, motivo_bloqueo: null } : col === "BLOQUEADA" ? { estatus: "EN_PROGRESO", motivo_bloqueo: motivo } : col === "EN_PROCESO" ? { estatus: "EN_PROGRESO", motivo_bloqueo: null } : { estatus: "PENDIENTE", motivo_bloqueo: null };
    if (col === "TERMINADA") celebrar();
    const ok = await patch(id, { columna: col, motivo }, opt);
    if (ok) flash("ok", col === "TERMINADA" ? "¡Terminada! Se avisó a quien la asignó" : col === "BLOQUEADA" ? "Marcada como atorada; se avisó" : `Movida a ${COLUMNAS.find(c => c.id === col)?.label}`);
  };

  // ── Agrupaciones ──
  const terminadasOcultas = (list: Actividad[]) => verTerminadas ? list : list.filter(a => columnaDe(a) !== "TERMINADA" || (a.completada_at && Date.now() - new Date(a.completada_at).getTime() < 7 * 86400000));
  const porColumna = (col: ColumnaId) => terminadasOcultas(visibles).filter(a => columnaDe(a) === col);
  const gruposMi = useMemo(() => {
    const hoy = new Date(); const h = ymd(hoy); const fin = new Date(hoy); fin.setDate(hoy.getDate() + (7 - hoy.getDay()));
    const abiertas = visibles.filter(a => columnaDe(a) !== "TERMINADA");
    const g = { atrasadas: [] as Actividad[], hoy: [] as Actividad[], semana: [] as Actividad[], despues: [] as Actividad[], sinFecha: [] as Actividad[] };
    for (const a of abiertas) {
      const f = (a.fecha_compromiso || "").slice(0, 10);
      if (!f) g.sinFecha.push(a); else if (diasAtraso(a) > 0) g.atrasadas.push(a); else if (f === h) g.hoy.push(a); else if (f <= ymd(fin)) g.semana.push(a); else g.despues.push(a);
    }
    return g;
  }, [visibles]);

  // ── Tarjeta ──
  const tarjeta = (a: Actividad, compacta?: boolean) => {
    const col = columnaDe(a); const cl = chkDe(a.id); const hechos = cl.filter(c => c.hecho).length; const nUpd = updCount[a.id] || 0;
    const prio = PRIORIDADES.find(p => p.id === prioridadDe(a.prioridad));
    return (
      // 12-Oct · auditoría: la tarjeta ya no es <button> (tenía otro botón adentro: el círculo de terminar); se abre con clic, Enter o Espacio
      <div key={a.id} data-card role="group" tabIndex={0} aria-label={`Abrir actividad ${a.folio ? numeroCorto(a.folio) + " " : ""}${a.titulo}`} draggable={vista === "tablero"} onDragStart={() => setDragId(a.id)} onDragEnd={() => setDragId(null)} onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); setAbierta(a.id); } }} onClick={() => { if (suprimirClick.current) { suprimirClick.current = false; return; } setAbierta(a.id); }}
        className={`group w-full text-left rounded-xl border border-[var(--d-border)] bg-[var(--d-surface)] hover:bg-[var(--d-surface)] hover:border-[var(--d-border)] active:scale-[0.99] transition shadow-[var(--d-shadow)] overflow-hidden ${dragId === a.id ? "opacity-40" : ""}`}>
        <div className="flex">
          <span className="w-1 shrink-0" style={{ background: COLUMNAS.find(c => c.id === col)!.color }} />
          <div className="flex-1 min-w-0 p-3 space-y-2">
            <div className="flex items-start gap-2.5">
              <span role="button" tabIndex={0} aria-label={col === "TERMINADA" ? "Terminada" : "Marcar como terminada"} title={col === "TERMINADA" ? "Terminada" : "Toca para terminarla"}
                onClick={e => { e.stopPropagation(); if (col !== "TERMINADA") mover(a.id, "TERMINADA"); }}
                onKeyDown={e => { if (e.key === "Enter") { e.stopPropagation(); if (col !== "TERMINADA") mover(a.id, "TERMINADA"); } }}
                className="-m-2 p-2 shrink-0 inline-flex">
                <span className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${col === "TERMINADA" ? "bg-[#00873f] border-[#00873f] text-white" : "border-[var(--d-faint)] hover:border-[#00873f] hover:bg-[#00873f]/15"} sobre-verde`}>
                  {col === "TERMINADA" ? <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 dom-pop" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6-7" /></svg> : null}
                </span>
              </span>
              <div className={`flex-1 text-[14px] font-semibold leading-snug ${col === "TERMINADA" ? "text-[var(--d-muted)] line-through" : "text-[var(--d-text)]"} line-clamp-2`}>{a.folio && <span className="mr-1 text-[12px] font-bold text-[var(--d-muted)]">{numeroCorto(a.folio)}</span>}{a.titulo}</div>
              {prio && prio.id !== "MEDIA" && <Flag className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: prio.color }} />}
            </div>
            {(() => { const rg = enRiesgo(a, ymd(new Date())); return rg ? <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--d-warn)] bg-[#fdab3d]/10 rounded-md px-2 py-1"><span className="shrink-0 font-bold">Riesgo:</span><span className="truncate">{rg.motivo}</span></div> : null; })()}
            {(() => { const p = a.depende_de ? acts.find(x => x.id === a.depende_de) : null; return p && columnaDe(p) !== "TERMINADA" && col !== "TERMINADA" ? <div className="flex items-center gap-1.5 text-[11px] text-[var(--d-warn)] bg-[#fdab3d]/10 rounded-md px-2 py-1"><span className="shrink-0 font-bold">Espera:</span><span className="truncate">No empieza hasta: {p.titulo}</span></div> : null; })()}
            {a.por_aprobar && <div className="flex items-center gap-1.5 text-[12px] font-bold text-white bg-[#b85507] rounded-md px-2 py-1 w-fit">Terminada · falta visto bueno</div>}
            {col === "BLOQUEADA" && a.motivo_bloqueo && <div className="flex items-start gap-1.5 text-[11px] text-[var(--d-danger)] bg-[#d0304a]/10 rounded-md px-2 py-1"><AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /><span className="line-clamp-2">{a.motivo_bloqueo}</span></div>}
            {!compacta && a.obra && <div className="hidden md:inline-flex items-center gap-1 text-[11px] text-[var(--d-muted)] bg-[var(--d-card)] rounded-md px-1.5 py-0.5 max-w-full"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{a.obra}</span></div>}
            <Barra pct={Number(a.avance) || 0} col={col} />
            <div className="flex items-center gap-2">
              <Avatar nombre={a.asignado_nombre} size={24} />
              <Fecha a={a} />
              {!compacta && a.obra && <span className="md:hidden min-w-0 truncate text-[11px] text-[var(--d-muted)]">· {a.obra}</span>}
              <span className="ml-auto flex items-center gap-2 text-[11px] text-[var(--d-muted)]">
                {cl.length > 0 && <span className={`inline-flex items-center gap-0.5 ${hechos === cl.length ? "text-[var(--d-ok)]" : ""}`}><CheckSquare className="w-3 h-3" />{hechos}/{cl.length}</span>}
                {nUpd > 0 && <span className="inline-flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{nUpd}</span>}
                <span className="font-semibold text-[var(--d-text-2)]">{Number(a.avance) || 0}%</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const deslizable = (a: Actividad) => (
    <div key={a.id} className="relative rounded-xl overflow-hidden touch-pan-y select-none"
      onPointerDown={e => { if (e.pointerType === "mouse") return; swipe.current = { id: a.id, x0: e.clientX, y0: e.clientY, dx: 0, el: (e.currentTarget as HTMLElement).querySelector("[data-card]"), lock: null }; }}
      onPointerMove={e => {
        const sw = swipe.current; if (!sw || sw.id !== a.id || !sw.el) return;
        const dx = e.clientX - sw.x0, dy = e.clientY - sw.y0;
        if (sw.lock === null) { if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.3) sw.lock = true; else if (Math.abs(dy) > 12) { sw.lock = false; } }
        if (sw.lock) { const fo = (e.currentTarget as HTMLElement).querySelector("[data-fondo]") as HTMLElement | null; if (fo) fo.style.opacity = "1"; sw.dx = dx; sw.el.style.transition = "none"; sw.el.style.transform = `translateX(${Math.max(-140, Math.min(140, dx))}px)`; }
      }}
      onPointerUp={e => {
        const fo = (e.currentTarget as HTMLElement).querySelector("[data-fondo]") as HTMLElement | null; if (fo) setTimeout(() => { fo.style.opacity = "0"; }, 230);
        const sw = swipe.current; swipe.current = null; if (!sw || !sw.el) return;
        sw.el.style.transition = "transform .22s ease"; sw.el.style.transform = "translateX(0)";
        if (sw.lock) { suprimirClick.current = true; setTimeout(() => { suprimirClick.current = false; }, 350);
          if (sw.dx > 90) mover(a.id, "TERMINADA"); else if (sw.dx < -90) mover(a.id, "BLOQUEADA"); }
      }}
      onPointerCancel={() => { const sw = swipe.current; swipe.current = null; if (sw?.el) { sw.el.style.transition = "transform .22s ease"; sw.el.style.transform = "translateX(0)"; } }}>
      <div data-fondo className="absolute inset-0 flex items-center justify-between px-4 text-sm font-bold opacity-0">
        <span className="text-white bg-[#00873f] absolute inset-y-0 left-0 w-1/2 flex items-center pl-4 sobre-verde">Terminar</span>
        <span className="text-white bg-[#d0304a] absolute inset-y-0 right-0 w-1/2 flex items-center justify-end pr-4">Atorada</span>
      </div>
      <div className="relative">{tarjeta(a)}</div>
    </div>
  );

  // ── Línea de tiempo (Gantt) por obra ──
  const lineaDeTiempo = () => {
    const items = terminadasOcultas(visibles).filter(a => a.fecha_compromiso || a.fecha_inicio);
    if (!items.length) return <div className="mt-10 text-center text-[var(--d-muted)]">Ponle fecha de entrega a las actividades para verlas en la línea de tiempo.</div>;
    const DAY = 86400000; const dia = (iso: string) => new Date(iso.slice(0, 10) + "T12:00:00").getTime();
    const hoyT = dia(ymd(new Date()));
    const ini = (a: Actividad) => dia(String(a.fecha_inicio || a.fecha_compromiso));
    const fin = (a: Actividad) => Math.max(ini(a), dia(String(a.fecha_compromiso || a.fecha_inicio)));
    let min = Math.min(hoyT - 3 * DAY, ...items.map(ini)); let max = Math.max(hoyT + 14 * DAY, ...items.map(fin));
    min = Math.max(min, hoyT - 45 * DAY); max = Math.min(max, hoyT + 120 * DAY);
    const nDias = Math.round((max - min) / DAY) + 1;
    const W = typeof window !== "undefined" && window.innerWidth < 768 ? 26 : 34; const LBL = typeof window !== "undefined" && window.innerWidth < 768 ? 132 : 220;
    const x = (t: number) => Math.round((Math.max(min, Math.min(max, t)) - min) / DAY) * W;
    const grupos = new Map<string, Actividad[]>();
    for (const a of items.sort((p, q) => ini(p) - ini(q))) { const k = a.obra || "Oficina"; grupos.set(k, [...(grupos.get(k) || []), a]); }
    const dias = Array.from({ length: nDias }, (_, i) => new Date(min + i * DAY));
    const critica = rutaCritica(items);
    return (
      <div className="mt-5 rounded-2xl border border-[var(--d-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ width: LBL + nDias * W }} className="relative">
            <div className="flex sticky top-0 z-10 bg-[var(--d-surface)] border-b border-[var(--d-border)]">
              <div style={{ width: LBL }} className="shrink-0 sticky left-0 z-20 bg-[var(--d-surface)] px-3 py-2 text-[11px] font-semibold text-[var(--d-muted)]">Actividad</div>
              {dias.map((d, i) => { const fin_ = d.getDay() === 0 || d.getDay() === 6; const esHoy = Math.round((d.getTime() - hoyT) / DAY) === 0; return (
                <div key={i} style={{ width: W }} className={`shrink-0 text-center py-1 border-l border-[var(--d-border)] ${fin_ ? "bg-[var(--d-card)]" : ""}`}>
                  {(d.getDate() === 1 || i === 0) && <div className="text-[11px] uppercase text-[var(--d-link)] font-bold leading-none">{d.toLocaleDateString("es-MX", { month: "short" })}</div>}
                  <div className={`text-[11px] leading-tight ${esHoy ? "text-[var(--d-text)] font-bold" : "text-[var(--d-muted)]"}`}>{d.getDate()}</div>
                </div>); })}
            </div>
            <div className="absolute top-0 bottom-0 w-0.5 bg-[#579bfc] z-[5] pointer-events-none" style={{ left: LBL + x(hoyT) + W / 2 }} />
            {[...grupos.entries()].map(([obra, list]) => (
              <div key={obra}>
                <div className="flex items-center py-1.5 text-[11.5px] font-bold text-[var(--d-link)] bg-[var(--d-card)] border-y border-[var(--d-border)]" style={{ width: LBL + nDias * W }}><span className="sticky left-0 inline-flex items-center gap-1.5 px-3"><MapPin className="w-3 h-3" />{obra}<span className="text-[var(--d-faint)] font-normal">· {list.length}</span></span></div>
                <div className="relative">
                {/* Flechas "espera a" (dependencias) dentro de la obra */}
                <svg className="absolute top-0 pointer-events-none z-[4]" style={{ left: LBL }} width={nDias * W} height={list.length * 44}>
                  <defs><marker id={`fl-${obra.length}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="var(--d-muted)" /></marker><marker id={`flc-${obra.length}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#d0304a" /></marker></defs>
                  {list.map((a, ia) => { const ip = a.depende_de ? list.findIndex(p => p.id === a.depende_de) : -1; if (ip < 0) return null; const p = list[ip];
                    const x1 = x(fin(p)) + W - 2, y1 = ip * 44 + 22, x2 = x(ini(a)) + 1, y2 = ia * 44 + 22; const crit = critica.has(a.id) && critica.has(p.id);
                    const xm = Math.max(x1 + 6, Math.min(x2 - 6, x1 + 10));
                    return <path key={a.id} d={`M${x1},${y1} H${xm} V${y2} H${x2 - 1}`} fill="none" stroke={crit ? "#d0304a" : "var(--d-muted)"} strokeWidth={crit ? 2 : 1.4} strokeDasharray={crit ? "" : "4 3"} markerEnd={`url(#${crit ? "flc" : "fl"}-${obra.length})`} />; })}
                </svg>
                {list.map(a => { const col = columnaDe(a); const c = COLUMNAS.find(k => k.id === col)!; const l = x(ini(a)); const w = Math.max(W, x(fin(a)) - l + W); const atr = diasAtraso(a) > 0; const crit = critica.has(a.id);
                  return (
                    <div key={a.id} className="flex items-center h-11 border-b border-[var(--d-border)] hover:bg-[var(--d-hover)]">
                      <button onClick={() => setAbierta(a.id)} style={{ width: LBL }} className="shrink-0 sticky left-0 z-[6] bg-[var(--d-surface)] h-full flex items-center gap-2 px-3 text-left border-r border-[var(--d-border)]">
                        <Avatar nombre={a.asignado_nombre} size={24} /><span className={`text-[12px] truncate ${col === "TERMINADA" ? "text-[var(--d-muted)] line-through" : "text-[var(--d-text)]"}`}>{a.titulo}</span>
                      </button>
                      <div className="relative h-full" style={{ width: nDias * W }}>
                        {atr && col !== "TERMINADA" && <div className="absolute top-3 h-5 rounded-r-md" style={{ left: l + w - 2, width: Math.max(0, x(hoyT) - (l + w) + W), background: "repeating-linear-gradient(45deg, rgba(226,68,92,.55) 0 6px, rgba(226,68,92,.25) 6px 12px)" }} />}
                        <button onClick={() => setAbierta(a.id)} title={`${a.titulo} · ${fechaCorta(a.fecha_inicio || a.fecha_compromiso)} → ${fechaCorta(a.fecha_compromiso)}`}
                          className="absolute top-2.5 h-6 rounded-md overflow-hidden text-left shadow" style={{ left: l + 2, width: w - 4, background: c.soft, border: `1px solid ${c.color}`, boxShadow: crit && col !== "TERMINADA" ? "0 0 0 2px #d0304a" : undefined }}>
                          <div className="h-full" style={{ width: `${Number(a.avance) || 0}%`, background: c.color, opacity: 0.85 }} />
                          <span className="absolute inset-0 flex items-center px-2 text-[11px] font-semibold text-[var(--d-text)] truncate">{Number(a.avance) || 0}%</span>
                        </button>
                      </div>
                    </div>); })}
                </div>
              </div>))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-[11px] text-[var(--d-muted)] border-t border-[var(--d-border)]">
          <span className="inline-flex items-center gap-1.5"><i className="inline-block w-5 h-3 rounded-sm" style={{ boxShadow: "0 0 0 2px #d0304a" }} />Ruta crítica: si se atrasa, se atrasa la obra</span>
          <span className="inline-flex items-center gap-1.5"><svg width="22" height="8"><path d="M0,4 H18" stroke="var(--d-muted)" strokeDasharray="4 3" /><path d="M16,1 L21,4 L16,7 z" fill="var(--d-muted)" /></svg>Espera a</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block w-5 h-3 rounded-sm" style={{ background: "repeating-linear-gradient(45deg, rgba(226,68,92,.55) 0 4px, rgba(226,68,92,.25) 4px 8px)" }} />Atraso</span>
        </div>
      </div>
    );
  };

  const [pistaVista, setPistaVista] = useState(false);
  useEffect(() => { try { const n = Number(localStorage.getItem("dom:pista-act-n") || 0); if (localStorage.getItem("dom:pista-act") === "1" || n >= 3) setPistaVista(true); else localStorage.setItem("dom:pista-act-n", String(n + 1)); } catch { /* */ } }, []);
  const kpiBtn = (label: string, n: number, color: string, onClick?: () => void) => (
    <button key={label} onClick={onClick} className="flex-1 min-w-[96px] rounded-xl border border-[var(--d-border)] bg-[var(--d-card)] px-3 py-2.5 text-left hover:bg-[var(--d-hover)] transition">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-[var(--d-muted)]"><span className="w-2 h-2 rounded-full" style={{ background: color }} />{label}</div>
      <div className="text-xl font-bold text-[var(--d-text)] mt-0.5">{n}</div>
    </button>
  );

  // 12-Oct · auditoría: los chips de arriba antes no hacían nada visible; ahora llevan al grupo
  const irAGrupo = (id: string | null, v: "mi" | "tablero") => {
    setVista(v); if (id) setColapsados(c => ({ ...c, [id]: false }));
    setTimeout(() => { try { document.getElementById(id ? `grupo-${id}` : "tablero-col")?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch { /* */ } }, 120);
  };
  const grupo = (id: string, titulo: string, color: string, list: Actividad[]) => {
    if (list.length === 0) return null; const col = !!colapsados[id];
    return (
      <section key={id} id={`grupo-${id}`} className="mb-4 scroll-mt-24">
        <button onClick={() => setColapsados(c => ({ ...c, [id]: !c[id] }))} className="flex items-center gap-2 mb-2 w-full text-left">
          {col ? <ChevronRight className="w-4 h-4" style={{ color }} /> : <ChevronDown className="w-4 h-4" style={{ color }} />}
          <span className="text-sm font-bold" style={{ color }}>{titulo}</span><span className="text-xs text-[var(--d-muted)]">{list.length}</span>
        </button>
        {!col && <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{list.map(a => deslizable(a))}</div>}
      </section>
    );
  };

  return (
    <div className="dom-page h-full overflow-y-auto">
      <div className="px-4 md:px-6 pt-4 pb-28 md:pb-8 max-w-[1500px] mx-auto">
        {/* Encabezado */}
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-[26px] font-bold text-[var(--d-text)] tracking-tight">Actividades</h1>
            <p className="text-xs text-[var(--d-muted)]">{loading ? "Cargando…" : `${kpi.abiertas} abiertas · ${kpi.terminadas} terminadas`}</p>
          </div>
          <button onClick={() => setNueva(true)} className="hidden md:inline-flex items-center gap-1.5 rounded-xl bg-[#0073ea] px-4 py-2.5 text-sm font-semibold text-white active:scale-95 transition">
            <Plus className="w-4 h-4" /> Nueva
          </button>
        </div>

        {/* KPIs */}
        {/* Celular: solo lo que urge, en chips de color sólido (si es 0 no aparece) */}
        <div className="md:hidden mt-3 flex flex-wrap gap-1.5">
          {([["Atrasadas", kpi.atrasadas, "#d0304a", "atr", "mi"], ["Atoradas", kpi.atoradas, "#c2410c", null, "tablero"], ["Vencen hoy", kpi.hoy, "#b85507", "hoy", "mi"], ["En proceso", kpi.enProceso, "#0073ea", null, "tablero"]] as const).filter(([, n]) => n > 0).map(([l, n, c, g, v]) => (
            <button key={l} onClick={() => irAGrupo(g, v)} className="rounded-full px-3 py-1.5 text-[12.5px] font-bold text-white" style={{ background: c }}>{n} {l.toLowerCase()}</button>))}
        </div>
        <div className="hidden md:flex mt-4 gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                    {kpiBtn("En proceso", kpi.enProceso, "#fdab3d", () => setVista("tablero"))}
          {kpiBtn("Atoradas", kpi.atoradas, "#d0304a", () => setVista("tablero"))}
          {kpiBtn("Atrasadas", kpi.atrasadas, "#c9410f", () => irAGrupo("atr", "mi"))}
          {kpiBtn("Vencen hoy", kpi.hoy, "#ffcb00", () => irAGrupo("hoy", "mi"))}
          {kpiBtn("En riesgo", visibles.filter(x => enRiesgo(x, ymd(new Date()))).length, "#fdab3d", () => setVista("mi"))}
        </div>

        {/* Vistas + filtros */}
        {me && <PanelPorRevisar email={me.email} onAbrir={id => setAbierta(id)} recargar={acts.length + acts.filter(x => x.por_aprobar).length} />}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="inline-flex max-w-full overflow-x-auto rounded-xl bg-[var(--d-card)] p-1 border border-[var(--d-border)]">
            {([["mi", "Mi trabajo", Sun], ["tablero", "Por estado", LayoutGrid], ["lista", "Lista", List], ["linea", "Línea", GanttChart]] as const).map(([v, l, I]) => (
              <button key={v} onClick={() => setVista(v)} className={`${v === "lista" || v === "linea" ? "hidden md:inline-flex" : ""} shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition ${vista === v ? "bg-[#0073ea] text-white" : "text-[var(--d-text-2)] hover:text-[var(--d-text)]"}`}><I className="w-3.5 h-3.5 hidden sm:block" />{l}</button>
            ))}
          </div>
          {/* Celular: el ámbito es un selector compacto (una sola fila de controles) */}
          <select value={ambito} onChange={e => setAmbito(e.target.value as Ambito)} aria-label="Cuáles ver" className="md:hidden rounded-xl bg-[var(--d-card)] border border-[var(--d-border)] px-3 py-2 text-[13px] font-semibold text-[var(--d-text)]"><option value="mias">Mías</option><option value="asigne">Las que encargué</option><option value="todas">Todas</option></select>
          <div className="hidden md:inline-flex rounded-xl bg-[var(--d-card)] p-1 border border-[var(--d-border)]">
            {([["mias", "Mías"], ["asigne", "Las que encargué"], ["todas", "Todas"]] as const).map(([v, l]) => (
              <button key={v} onClick={() => setAmbito(v)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${ambito === v ? "bg-[#0073ea] text-white" : "text-[var(--d-text-2)] hover:text-[var(--d-text)]"}`}>{l}</button>
            ))}
          </div>
          <button onClick={() => setVerFiltros(v => !v)} className={`md:hidden ml-auto inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold border ${verFiltros || fObra || fPersona || q ? "border-[#0073ea] text-[#0073ea] bg-[var(--d-card)]" : "border-[var(--d-border)] text-[var(--d-text-2)] bg-[var(--d-card)]"}`}><Search className="w-4 h-4" /><span className="sr-only">Buscar</span>{fObra || fPersona || q ? <span className="w-1.5 h-1.5 rounded-full bg-[#0073ea]" /> : null}</button>
          <div className={`${verFiltros ? "flex" : "hidden"} md:flex w-full md:w-auto flex-wrap gap-2 md:flex-1`}>
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-4 h-4 text-[var(--d-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar actividad, número, obra o persona" className="w-full rounded-xl bg-[var(--d-card)] border border-[var(--d-border)] pl-9 pr-3 py-2 text-sm text-[var(--d-text)] placeholder-[var(--d-faint)]" />
          </div>
          {q.trim() && <div className="w-full"><FolioCruzado q={q} /></div>}
          <select aria-label="Filtrar por obra" value={fObra} onChange={e => setFObra(e.target.value)} className="rounded-xl px-3 py-2 text-sm max-w-[170px]"><option value="">Todas las obras</option>{obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select>
          {esSuper && <select aria-label="Filtrar por persona" value={fPersona} onChange={e => setFPersona(e.target.value)} className="rounded-xl px-3 py-2 text-sm max-w-[170px]"><option value="">Todas las personas</option>{emps.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select>}
          </div>
        </div>

        {!loading && visibles.length > 0 && !pistaVista && <p className="mt-3 text-[11.5px] text-[var(--d-muted)]" onClick={() => { setPistaVista(true); try { localStorage.setItem("dom:pista-act", "1"); } catch { /* */ } }}>{vista === "mi" ? "Toca el círculo para terminarla. Toca la tarjeta para ver, comentar o subir foto." : vista === "tablero" ? "Toca el círculo para terminarla · en computadora arrastra la tarjeta de columna." : vista === "linea" ? "Cada barra va del inicio a la entrega · la línea azul es hoy." : "Toca una fila para abrirla."}</p>}

        {loading ? (
          <div className="mt-5"><Esqueleto filas={5} alto={96} /></div>
        ) : visibles.length === 0 ? (
          <div className="mt-6 dom-card rounded-3xl">{ambito === "mias" && !q && !fObra && !fPersona
            ? <Vacio dibujo="listo" titulo="No tienes actividades pendientes" texto="Cuando alguien te asigne algo, aparece aquí y te avisamos." accion={{ label: "Crear una actividad", onClick: () => setNueva(true) }} />
            : <Vacio dibujo="buscar" titulo="Nada con estos filtros" texto="Prueba quitar la obra, la persona o la búsqueda." accion={{ label: "Quitar filtros", onClick: () => { setQ(""); setFObra(""); setFPersona(""); } }} />}</div>
        ) : vista === "mi" ? (
          <div className="mt-5">
            {grupo("atr", "Atrasadas", "var(--c-naranja)", gruposMi.atrasadas)}
            {grupo("hoy", "Hoy", "var(--c-amarillo)", gruposMi.hoy)}
            {grupo("sem", "Esta semana", "var(--c-azul)", gruposMi.semana)}
            {grupo("des", "Más adelante", "var(--c-morado)", gruposMi.despues)}
            {grupo("sf", "Sin fecha", "var(--d-muted)", gruposMi.sinFecha)}
            {gruposMi.atrasadas.length + gruposMi.hoy.length + gruposMi.semana.length + gruposMi.despues.length + gruposMi.sinFecha.length === 0 && <div className="text-center text-[var(--d-muted)] py-10">Todo terminado</div>}
          </div>
        ) : vista === "linea" ? (
          lineaDeTiempo()
        ) : vista === "tablero" ? (
          <>
          {/* Celular: brincar a una columna (una columna por pantalla) */}
          <div className="md:hidden mt-4 flex gap-1.5 overflow-x-auto -mx-4 px-4">{COLUMNAS.map(c => <button key={c.id} type="button" onClick={() => document.getElementById(`col-${c.id}`)?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" })} className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[var(--d-card)] border border-[var(--d-border)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--d-text)]"><i className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />{c.label} {porColumna(c.id).length}</button>)}</div>
          <div className="mt-3 md:mt-5 -mx-4 md:mx-0 px-4 md:px-0 flex md:grid md:grid-cols-4 gap-3 overflow-x-auto snap-x snap-mandatory pb-4">
            {COLUMNAS.map(c => { const list = porColumna(c.id); return (
              <div key={c.id} id={`col-${c.id}`} onDragOver={e => e.preventDefault()} onDrop={() => { if (dragId) mover(dragId, c.id); setDragId(null); }}
                className={`snap-start shrink-0 w-[84vw] sm:w-[340px] md:w-auto rounded-2xl border border-[var(--d-border)] bg-[var(--d-card)] flex flex-col max-h-[calc(100dvh-300px)] min-h-[260px] ${dragId ? "ring-1 ring-[var(--d-border)]" : ""}`}>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-t-2xl" style={{ background: c.color }}>
                  <span className={`text-sm font-bold text-white ${c.id === "TERMINADA" ? "sobre-verde" : ""}`}>{c.label}</span>
                  <span className="text-xs font-bold text-[#0f172a] bg-white rounded-full px-2">{list.length}</span>
                  {c.id === "POR_HACER" && <button onClick={() => setNueva(true)} className="ml-auto p-2 -m-1 rounded-md text-white" aria-label="Nueva actividad"><Plus className="w-4 h-4" /></button>}
                  {c.id === "TERMINADA" && <button onClick={() => setVerTerminadas(v => !v)} className="ml-auto text-[11px] font-semibold text-white underline sobre-verde">{verTerminadas ? "Solo 7 días" : "Ver todas"}</button>}
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {list.map(a => tarjeta(a))}
                  {list.length === 0 && <div className="text-center text-[11px] text-[var(--d-faint)] py-6">{dragId ? "Suelta aquí" : "Sin actividades"}</div>}
                </div>
              </div>); })}
          </div>
          </>
        ) : (
          <div className="mt-5 space-y-4">
            {COLUMNAS.map(c => { const list = porColumna(c.id); if (!list.length) return null; const cerrado = !!colapsados["l" + c.id]; return (
              <section key={c.id} className="rounded-2xl border border-[var(--d-border)] overflow-hidden">
                <button onClick={() => setColapsados(x => ({ ...x, ["l" + c.id]: !x["l" + c.id] }))} className="w-full flex items-center gap-2 px-4 py-2.5 text-left" style={{ borderLeft: `4px solid ${c.color}`, background: c.soft }}>
                  {cerrado ? <ChevronRight className="w-4 h-4" style={{ color: c.text }} /> : <ChevronDown className="w-4 h-4" style={{ color: c.text }} />}
                  <span className="font-bold text-sm" style={{ color: c.text }}>{c.label}</span><span className="text-xs text-[var(--d-muted)]">{list.length}</span>
                </button>
                {!cerrado && <div className="divide-y divide-[var(--d-border)]">{list.map(a => (
                  <button key={a.id} onClick={() => setAbierta(a.id)} className="w-full grid grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1fr)_150px_110px_120px_90px] items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--d-hover)]">
                    <div className="min-w-0"><div className="text-sm text-[var(--d-text)] truncate">{a.titulo}</div><div className="text-[11px] text-[var(--d-muted)] truncate md:hidden">{a.asignado_nombre} · {a.obra || "Sin obra"}</div></div>
                    <div className="hidden md:flex items-center gap-2 min-w-0"><Avatar nombre={a.asignado_nombre} size={24} /><span className="text-xs text-[var(--d-text-2)] truncate">{a.asignado_nombre}</span></div>
                    <div className="hidden md:block"><StatusPill col={columnaDe(a)} small /></div>
                    <div className="hidden md:block"><Fecha a={a} /></div>
                    <div className="flex items-center gap-2 justify-end"><div className="w-12 hidden md:block"><Barra pct={Number(a.avance) || 0} col={columnaDe(a)} /></div><span className="text-xs font-semibold text-[var(--d-text-2)]">{Number(a.avance) || 0}%</span></div>
                  </button>))}</div>}
              </section>); })}
          </div>
        )}
      </div>

      {/* Motivo de atorada */}
      {motivoPara && (
        <div className="aria-sheet fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/60 p-0 md:p-4" onClick={() => setMotivoPara(null)}>
          <div className="w-full md:max-w-md rounded-t-3xl md:rounded-2xl bg-[var(--d-surface)] border border-[var(--d-border)] p-5 space-y-3" onClick={e => e.stopPropagation()} style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}>
            <div className="flex items-center gap-2 text-[var(--d-text)] font-semibold"><AlertTriangle className="w-5 h-5 text-[#d0304a]" />¿Qué la tiene atorada?</div>
            <textarea autoFocus value={motivoTxt} onChange={e => setMotivoTxt(e.target.value)} rows={3} placeholder="Ej. no ha llegado el material, falta autorización…" className="w-full rounded-xl bg-[var(--d-card)] border border-[var(--d-border)] p-3 text-[var(--d-text)] text-sm" />
            <div className="flex gap-2 justify-end"><button onClick={() => setMotivoPara(null)} className="px-4 py-2 rounded-xl text-sm text-[var(--d-text-2)] bg-[var(--d-card)]">Cancelar</button>
              <button disabled={!motivoTxt.trim()} onClick={async () => { const id = motivoPara.id; setMotivoPara(null); await mover(id, "BLOQUEADA", motivoTxt.trim()); }} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#d0304a] disabled:opacity-50">Marcar atorada y avisar</button></div>
          </div>
        </div>
      )}

      {actual && me && (
        <Ficha key={actual.id} a={actual} todas={acts} carga={carga} me={me} emps={emps} obras={obras} checklist={chkDe(actual.id)} esSuper={esSuper}
          onClose={() => { setAbierta(null); try { const u = new URL(window.location.href); u.searchParams.delete("abrir"); u.searchParams.delete("id"); window.history.replaceState(null, "", u.toString()); } catch {} }}
          onPatch={(body, opt) => patch(actual.id, body, opt)} onMover={(col) => mover(actual.id, col)}
          onChk={setChk} onUpd={() => setUpdCount(c => ({ ...c, [actual.id]: (c[actual.id] || 0) + 1 }))}
          onDeleted={() => { setActs(p => p.filter(x => x.id !== actual.id)); setAbierta(null); flash("ok", "Actividad borrada"); }} flash={flash} />
      )}

      {nueva && me && <Nueva emps={emps} obras={obras} miEmp={miEmp} carga={carga} onClose={() => setNueva(false)} onCreated={async (id, notif) => { setNueva(false); await cargar(); setAbierta(id); flash("ok", notif ? "Creada y avisada por WhatsApp" : "Actividad creada"); }} flash={flash} />}

      {toast && <div className={`fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-8 z-[80] rounded-xl px-4 py-2.5 text-sm font-medium shadow-2xl ${toast.t === "ok" ? "bg-[#00873f] text-white" : "bg-[#d0304a] text-white"} sobre-verde`}>{toast.m}</div>}
    </div>
  );
}

/* ───────────────────────── Ficha de la actividad ───────────────────────── */
function Ficha({ a, todas, carga, me, emps, obras, checklist, esSuper, onClose, onPatch, onMover, onChk, onUpd, onDeleted, flash }: {
  a: Actividad; todas: Actividad[]; carga: Record<string, number>; me: { email: string; role: string; name: string }; emps: Emp[]; obras: Obra[]; checklist: Chk[]; esSuper: boolean;
  onClose: () => void; onPatch: (b: Record<string, unknown>, opt?: Partial<Actividad>) => Promise<boolean>; onMover: (c: ColumnaId) => void;
  onChk: React.Dispatch<React.SetStateAction<Chk[]>>; onUpd: () => void; onDeleted: () => void; flash: (t: "ok" | "err", m: string) => void;
}) {
  const col = columnaDe(a);
  const [titulo, setTitulo] = useState(a.titulo); const [desc, setDesc] = useState(a.descripcion || "");
  const [avance, setAvance] = useState(Number(a.avance) || 0);
  const [upds, setUpds] = useState<Upd[]>([]); const [txt, setTxt] = useState(""); const [enviando, setEnviando] = useState(false);
  const [nuevoChk, setNuevoChk] = useState("");
  const [tabF, setTabF] = useState<"resumen" | "detalles" | "charla">("resumen");
  const [regresando, setRegresando] = useState(false); const [motivoReg, setMotivoReg] = useState("");
  const [sugMencion, setSugMencion] = useState<{ q: string; desde: number } | null>(null);
  const txtRef = useRef<HTMLTextAreaElement>(null);
  const candidatos = useMemo(() => emps.map(e => ({ id: e.id, nombre: e.full_name })), [emps]);
  const onTxt = (v: string, caret: number) => {
    setTxt(v);
    const antes = v.slice(0, caret); const m = antes.match(/(^|\s)@([^\s@]{0,20})$/);
    setSugMencion(m ? { q: m[2], desde: caret - m[2].length - 1 } : null);
  };
  const elegirMencion = (nombre: string) => {
    if (!sugMencion) return;
    const caret = txtRef.current?.selectionStart ?? txt.length;
    const nuevo = txt.slice(0, sugMencion.desde) + "@" + nombre + " " + txt.slice(caret);
    setTxt(nuevo); setSugMencion(null); setTimeout(() => txtRef.current?.focus(), 0);
  };
  const sugeridas = sugMencion ? emps.filter(e => norm(e.full_name).includes(norm(sugMencion.q))).slice(0, 6) : [];
  const espera = a.depende_de ? todas.find(x => x.id === a.depende_de) || null : null;
  const opcionesEspera = useMemo(() => todas.filter(x => x.id !== a.id && x.depende_de !== a.id && columnaDe(x) !== "TERMINADA").sort((x, y) => (x.obra_id === a.obra_id ? 0 : 1) - (y.obra_id === a.obra_id ? 0 : 1)).slice(0, 200), [todas, a.id, a.obra_id]);
  const fileRef = useRef<HTMLInputElement>(null);
  const puedeBorrar = laAsigneYo(a, me.email) || ["admin", "administrador", "rh"].includes(me.role);
  const puedeEditar = esSuper || esMia(a, me.email) || laAsigneYo(a, me.email);

  useEffect(() => { setAvance(Number(a.avance) || 0); }, [a.avance]);
  const cargarUpds = useCallback(async () => {
    const { data } = await supabase.from("tarea_actualizaciones").select("*").eq("tarea_id", a.id).order("created_at", { ascending: false }).limit(100);
    setUpds((data || []) as Upd[]);
  }, [a.id]);
  useEffect(() => { cargarUpds(); }, [cargarUpds, a.updated_at]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);

  const enviar = async (fotoUrl?: string, archivo?: { url: string; nombre: string }) => {
    if (!txt.trim() && !fotoUrl && !archivo) return;
    setEnviando(true);
    try {
      const r = await api<{ encolado?: boolean }>(`/api/actividades/${a.id}/actualizacion`, "POST", { texto: txt.trim(), foto_url: fotoUrl, archivo_url: archivo?.url, archivo_nombre: archivo?.nombre, menciones: mencionesEnTexto(txt, candidatos) });
      if (r.encolado) { setUpds(p => [{ id: "local-" + Date.now(), tarea_id: a.id, autor_nombre: me.name, tipo: "comentario", texto: `${txt.trim()} (se enviará al volver la señal)`, created_at: new Date().toISOString() }, ...p]); setTxt(""); return; }
      setTxt(""); onUpd(); await cargarUpds();
    } catch (e) { flash("err", (e as Error).message); } finally { setEnviando(false); }
  };
  const subir = async (f: File) => {
    setEnviando(true);
    try {
      const esImg = f.type.startsWith("image/");
      const blob = esImg ? await comprimir(f) : f;
      const ext = esImg ? "jpg" : (f.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `actividades/${a.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("expedientes").upload(path, blob, { upsert: false, contentType: esImg ? "image/jpeg" : f.type || undefined });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from("expedientes").getPublicUrl(path);
      if (esImg) await enviar(data.publicUrl); else await enviar(undefined, { url: data.publicUrl, nombre: f.name });
    } catch (e) { flash("err", "No se pudo subir: " + (e as Error).message); setEnviando(false); }
  };

  const toggleChk = async (c: Chk) => {
    onChk(p => p.map(x => x.id === c.id ? { ...x, hecho: !x.hecho } : x));
    const { error } = await supabase.from("tarea_checklist").update({ hecho: !c.hecho }).eq("id", c.id);
    if (error) { onChk(p => p.map(x => x.id === c.id ? { ...x, hecho: c.hecho } : x)); flash("err", error.message); }
  };
  const addChk = async () => {
    const t = nuevoChk.trim(); if (!t) return; setNuevoChk("");
    const { data, error } = await supabase.from("tarea_checklist").insert({ tarea_id: a.id, texto: t.slice(0, 200), orden: checklist.length }).select("id, tarea_id, texto, hecho, orden").single();
    if (error) { flash("err", error.message); return; } onChk(p => [...p, data as Chk]);
  };
  const delChk = async (c: Chk) => { onChk(p => p.filter(x => x.id !== c.id)); await supabase.from("tarea_checklist").delete().eq("id", c.id); };
  const borrar = async () => {
    if (!window.confirm(`¿Borrar la actividad "${a.titulo}"? Se guarda un respaldo.`)) return;
    try { await api(`/api/actividades/${a.id}`, "DELETE"); onDeleted(); } catch (e) { flash("err", (e as Error).message); }
  };
  const hechos = checklist.filter(c => c.hecho).length;

  return (
    <div className="aria-sheet fixed inset-0 z-[60] flex md:justify-end bg-black/55 backdrop-blur-[2px]" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="mt-auto md:mt-0 w-full md:w-[520px] h-[94dvh] md:h-full rounded-t-3xl md:rounded-none bg-[var(--d-surface)] border-t md:border-t-0 md:border-l border-[var(--d-border)] flex flex-col shadow-2xl">
        <div className="md:hidden mx-auto mt-2 h-1.5 w-12 rounded-full bg-[var(--d-border)]" />
        {/* Cabecera */}
        <div className="px-5 pt-3 md:pt-5 pb-3 border-b border-[var(--d-border)]">
          {a.folio && <div className="text-[12.5px] font-bold text-[var(--d-muted)] mb-0.5">Tarea {numeroCorto(a.folio)}</div>}
          <div className="flex items-start gap-2">
            <textarea value={titulo} disabled={!puedeEditar} onChange={e => setTitulo(e.target.value)} onBlur={() => { if (titulo.trim() && titulo.trim() !== a.titulo) onPatch({ titulo: titulo.trim() }, { titulo: titulo.trim() }); }} rows={2}
              className="flex-1 resize-none bg-transparent text-lg font-bold text-[var(--d-text)] leading-snug focus:outline-none focus:bg-[var(--d-hover)] rounded-lg px-1 -mx-1" />
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--d-hover)] text-[var(--d-text-2)]" aria-label="Cerrar"><X className="w-5 h-5" /></button>
          </div>
          <div className="mt-1 text-[11px] text-[var(--d-muted)]">Asignó {a.asignado_por_email || a.asignado_por || "—"} · {haceCuanto(a.created_at)}</div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div className="md:hidden sticky -top-4 z-10 -mx-5 px-5 pb-2 pt-1 bg-[var(--d-surface)]">
            <div className="grid grid-cols-3 gap-1 rounded-2xl bg-[var(--d-card-2)] p-1">
              {([["resumen", "Estado"], ["detalles", "Detalles"], ["charla", `Conversación${upds.filter(u => u.tipo !== "estado" && u.tipo !== "sistema").length ? ` (${upds.filter(u => u.tipo !== "estado" && u.tipo !== "sistema").length})` : ""}`]] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setTabF(k)} className={`rounded-xl py-2 text-[13px] font-bold transition ${tabF === k ? "bg-[var(--d-surface)] text-[var(--d-text)] shadow-[var(--d-shadow)]" : "text-[var(--d-muted)]"}`}>{l}</button>))}
            </div>
          </div>
          <div className={tabF === "resumen" ? "space-y-5" : "hidden md:block space-y-5"}>
          {/* Resumen a golpe de vista (celular): quién, cuándo, dónde, qué tan urgente y lo último que pasó */}
          <div className="md:hidden grid grid-cols-2 gap-2">
            <div className="col-span-2 flex items-center gap-2.5 rounded-2xl bg-[var(--d-card-2)] px-3 py-2.5"><Avatar nombre={a.asignado_nombre} size={34} /><div className="min-w-0"><div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--d-muted)]">Responsable</div><div className="text-[15px] font-semibold text-[var(--d-text)] truncate">{a.asignado_nombre || "Sin asignar"}</div></div></div>
            <div className="rounded-2xl bg-[var(--d-card-2)] px-3 py-2.5"><div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--d-muted)]">Entrega</div><div className={`text-[15px] font-semibold ${diasAtraso(a) > 0 ? "text-[var(--d-danger)]" : "text-[var(--d-text)]"}`}>{a.fecha_compromiso ? fechaCorta(a.fecha_compromiso) : "Sin fecha"}{a.hora_compromiso ? ` · ${String(a.hora_compromiso).slice(0, 5)}` : ""}{diasAtraso(a) > 0 ? ` · ${atrasoTexto(diasAtraso(a))}` : ""}</div></div>
            <div className="rounded-2xl bg-[var(--d-card-2)] px-3 py-2.5 min-w-0"><div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--d-muted)]">Obra</div><div className="text-[15px] font-semibold text-[var(--d-text)] truncate">{a.obra || "Oficina"}</div></div>
            {(() => { const u = upds.find(x => x.tipo !== "sistema" && x.texto); return u ? <button type="button" onClick={() => setTabF("charla")} className="col-span-2 text-left rounded-2xl border border-[var(--d-border)] px-3 py-2.5"><div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--d-muted)]">Lo último</div><div className="text-[14px] text-[var(--d-text)] line-clamp-2">{u.texto}</div></button> : <button type="button" onClick={() => setTabF("charla")} className="col-span-2 flex items-center gap-3 text-left rounded-2xl border border-dashed border-[var(--d-border)] px-3 py-3"><span className="shrink-0 w-9 h-9 rounded-xl bg-[#0073ea] text-white inline-flex items-center justify-center"><svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6A.5.5 0 0 1 5 19.2V16a2.5 2.5 0 0 1-1-2V5.5Z" /></svg></span><span className="min-w-0"><span className="block text-[14px] font-semibold text-[var(--d-text)]">Nadie ha comentado</span><span className="block text-[12.5px] text-[var(--d-muted)]">Escribe cómo va o sube una foto</span></span></button>; })()}
          </div>
          {/* Estado */}
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[var(--d-muted)] mb-2">Estado</div>
            <div className="grid grid-cols-4 gap-1.5">
              {COLUMNAS.map(c => (
                <button key={c.id} disabled={!puedeEditar} onClick={() => onMover(c.id)} className={`rounded-lg py-2.5 text-[12px] font-bold transition ${col === c.id ? "text-white shadow-lg scale-[1.03]" : "text-[var(--d-muted)] bg-[var(--d-card)] hover:bg-[var(--d-hover)]"}`} style={col === c.id ? { background: c.color } : undefined}>{c.label}</button>
              ))}
            </div>
            {col === "BLOQUEADA" && a.motivo_bloqueo && <div className="mt-2 flex items-start gap-2 rounded-lg bg-[#d0304a]/10 border border-[#d0304a]/30 px-3 py-2 text-sm text-[var(--d-danger)]"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{a.motivo_bloqueo}</div>}
          </div>

          {/* 11-Oct-2026 · Visto bueno del que la encargó */}
          {a.por_aprobar && (laAsigneYo(a, me.email) || esSuper) && (
            <div className="rounded-2xl border-2 border-[#b85507] bg-[#b85507]/10 p-3">
              <div className="text-[15px] font-bold text-[var(--d-text)]">{a.asignado_nombre || "Quien la hace"} dice que ya terminó</div>
              <div className="text-[14px] text-[var(--d-muted)]">Revisa los comentarios y fotos abajo y dale tu visto bueno.</div>
              {regresando ? (
                <div className="mt-2">
                  <textarea value={motivoReg} onChange={e => setMotivoReg(e.target.value)} rows={2} placeholder="¿Qué le falta?" className="w-full rounded-xl bg-[var(--d-card)] border border-[var(--d-border)] p-3 text-[15px] text-[var(--d-text)]" />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setRegresando(false)} className="h-12 rounded-xl bg-[var(--d-card-2)] text-[15px] font-bold text-[var(--d-text)]">Cancelar</button>
                    <button type="button" disabled={!motivoReg.trim()} onClick={async () => { try { await api(`/api/actividades/${a.id}/aprobar`, "POST", { accion: "regresar", motivo: motivoReg.trim() }); flash("ok", "Se la regresaste y le avisamos"); setRegresando(false); onUpd(); try { window.dispatchEvent(new Event("dom:revisar")); } catch { /* */ } } catch (e) { flash("err", (e as Error).message); } }} className="h-12 rounded-xl bg-[#d0304a] text-[15px] font-bold text-white disabled:opacity-50">Regresar</button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setRegresando(true)} className="h-12 rounded-xl border-2 border-[#d0304a] text-[15px] font-bold text-[var(--d-danger)]">Regresar</button>
                  <button type="button" onClick={async () => { try { await api(`/api/actividades/${a.id}/aprobar`, "POST", { accion: "aprobar" }); flash("ok", "Aprobada. Le avisamos por WhatsApp"); onUpd(); try { window.dispatchEvent(new Event("dom:revisar")); } catch { /* */ } } catch (e) { flash("err", (e as Error).message); } }} className="h-12 rounded-xl bg-[#00873f] text-[15px] font-bold text-white">Aprobar</button>
                </div>
              )}
            </div>
          )}
          {a.por_aprobar && !(laAsigneYo(a, me.email) || esSuper) && <div className="rounded-xl bg-[#b85507]/10 px-3 py-2 text-[14px] font-semibold text-[var(--d-text)]">Terminada · esperando el visto bueno de quien la encargó</div>}
          {!a.por_aprobar && a.aprobada_at && <div className="rounded-xl bg-[#00873f]/10 px-3 py-2 text-[14px] font-semibold text-[var(--d-ok)]">Aprobada{a.aprobada_por === "automatico" ? " sola (nadie contestó en 3 días)" : ""}</div>}

          {/* Avance */}
          <div>
            <div className="flex items-center justify-between mb-2"><span className="text-[11px] uppercase tracking-wide text-[var(--d-muted)]">Avance</span><span className="text-2xl font-bold text-[var(--d-text)]">{avance}%</span></div>
            <input type="range" min={0} max={100} step={5} value={avance} disabled={!puedeEditar} onChange={e => setAvance(Number(e.target.value))} onMouseUp={() => { if (avance !== (Number(a.avance) || 0)) onPatch({ avance }, { avance }); }} onTouchEnd={() => { if (avance !== (Number(a.avance) || 0)) onPatch({ avance }, { avance }); }}
              className="rango w-full" style={{ ["--p" as string]: `${avance}%` } as React.CSSProperties} />
            <div className="mt-2 grid grid-cols-5 gap-1.5">{[0, 25, 50, 75, 100].map(p => (
              <button key={p} disabled={!puedeEditar} onClick={() => { setAvance(p); onPatch({ avance: p }, { avance: p }); }} className={`rounded-lg py-2 text-xs font-semibold ${avance === p ? "bg-[#00873f] text-white" : "bg-[var(--d-card)] text-[var(--d-text-2)] hover:bg-[var(--d-hover)]"} sobre-verde`}>{p}%</button>))}</div>
          </div>

          </div>
          <div className={tabF === "detalles" ? "space-y-5" : "hidden md:block space-y-5"}>
          {/* Campos */}
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 block"><span className="text-[11px] uppercase tracking-wide text-[var(--d-muted)] flex items-center gap-1"><UserIcon className="w-3 h-3" />Responsable</span>
              <div className="mt-1 flex items-center gap-2"><Avatar nombre={a.asignado_nombre} size={32} />
                <select disabled={!puedeEditar} value={a.asignado_id || ""} onChange={e => onPatch({ asignado_id: e.target.value })} className="flex-1 rounded-xl px-3 py-2 text-sm">{!a.asignado_id && <option value="">{a.asignado_nombre || "Sin asignar"}</option>}{emps.map(p => <option key={p.id} value={p.id}>{p.full_name}{carga[p.id] ? ` · ${carga[p.id]} abiertas` : ""}</option>)}</select></div>
            </label>
            <label className="block"><span className="text-[11px] uppercase tracking-wide text-[var(--d-muted)]">Entrega</span>
              <input type="date" disabled={!puedeEditar} value={(a.fecha_compromiso || "").slice(0, 10)} onChange={e => onPatch({ fecha_compromiso: e.target.value }, { fecha_compromiso: e.target.value })} className="mt-1 w-full rounded-xl bg-[var(--d-card)] border border-[var(--d-border)] px-3 py-2 text-sm text-[var(--d-text)]" /></label>
            <label className="block"><span className="text-[11px] uppercase tracking-wide text-[var(--d-muted)]">Inicio</span>
              <input type="date" disabled={!puedeEditar} value={(a.fecha_inicio || "").slice(0, 10)} onChange={e => onPatch({ fecha_inicio: e.target.value }, { fecha_inicio: e.target.value })} className="mt-1 w-full rounded-xl bg-[var(--d-card)] border border-[var(--d-border)] px-3 py-2 text-sm text-[var(--d-text)]" /></label>
            <label className="block"><span className="text-[11px] uppercase tracking-wide text-[var(--d-muted)]">Hora de entrega</span>
              <input type="time" disabled={!puedeEditar} value={(a.hora_compromiso || "").slice(0, 5)} onChange={e => onPatch({ hora_compromiso: e.target.value || null }, { hora_compromiso: e.target.value || null })} className="mt-1 w-full rounded-xl bg-[var(--d-card)] border border-[var(--d-border)] px-3 py-2 text-sm text-[var(--d-text)]" /></label>
            <label className="col-span-2 block"><span className="text-[11px] uppercase tracking-wide text-[var(--d-muted)] flex items-center gap-1"><MapPin className="w-3 h-3" />Obra</span>
              <select disabled={!puedeEditar} value={a.obra_id || ""} onChange={e => onPatch({ obra_id: e.target.value })} className="mt-1 w-full rounded-xl px-3 py-2 text-sm"><option value="">{a.obra && !a.obra_id ? a.obra : "Sin obra (oficina)"}</option>{obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select></label>
            <div className="col-span-2"><span className="text-[11px] uppercase tracking-wide text-[var(--d-muted)]">Prioridad</span>
              <div className="mt-1 grid grid-cols-4 gap-1.5">{PRIORIDADES.map(p => (
                <button key={p.id} disabled={!puedeEditar} onClick={() => onPatch({ prioridad: p.id }, { prioridad: p.id })} className={`rounded-lg py-2 text-xs font-semibold ${prioridadDe(a.prioridad) === p.id ? "text-white" : "text-[var(--d-muted)] bg-[var(--d-card)]"}`} style={prioridadDe(a.prioridad) === p.id ? { background: p.color } : undefined}>{p.label}</button>))}</div></div>
          </div>

          <label className="block"><span className="text-[11px] uppercase tracking-wide text-[var(--d-muted)] flex items-center gap-1"><Hourglass className="w-3 h-3" />Espera a (no se puede empezar antes)</span>
            <select disabled={!puedeEditar} value={a.depende_de || ""} onChange={e => onPatch({ depende_de: e.target.value || null }, { depende_de: e.target.value || null })} className="mt-1 w-full rounded-xl px-3 py-2 text-sm">
              <option value="">No espera a ninguna</option>
              {espera && !opcionesEspera.some(x => x.id === espera.id) && <option value={espera.id}>{espera.titulo} (terminada)</option>}
              {opcionesEspera.map(x => <option key={x.id} value={x.id}>{x.titulo}{x.obra ? ` · ${x.obra}` : ""}</option>)}
            </select>
            {espera && <div className={`mt-1.5 text-xs ${columnaDe(espera) === "TERMINADA" ? "text-[var(--d-ok)]" : "text-[var(--d-warn)]"}`}>{columnaDe(espera) === "TERMINADA" ? "✓ Ya se terminó, puedes avanzar" : `${espera.asignado_nombre || "Alguien"} todavía no la termina. Te avisamos cuando quede.`}</div>}
          </label>

          <label className="block"><span className="text-[11px] uppercase tracking-wide text-[var(--d-muted)]">Descripción</span>
            <textarea value={desc} disabled={!puedeEditar} onChange={e => setDesc(e.target.value)} onBlur={() => { if (desc !== (a.descripcion || "")) onPatch({ descripcion: desc }, { descripcion: desc }); }} rows={3} placeholder="Detalles, medidas, a quién buscar…" className="mt-1 w-full rounded-xl bg-[var(--d-card)] border border-[var(--d-border)] p-3 text-sm text-[var(--d-text)] placeholder-[var(--d-faint)]" /></label>

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2"><span className="text-[11px] uppercase tracking-wide text-[var(--d-muted)]">Pasos</span>{checklist.length > 0 && <span className="text-xs text-[var(--d-text-2)]">{hechos} de {checklist.length}</span>}</div>
            {checklist.length > 0 && <div className="mb-2 h-1.5 rounded-full bg-[var(--d-card-2)] overflow-hidden"><div className="h-full bg-[#00873f] transition-all" style={{ width: `${(hechos / checklist.length) * 100}%` }} /></div>}
            <div className="space-y-1">{checklist.map(c => (
              <div key={c.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--d-hover)]">
                <button onClick={() => toggleChk(c)} className="shrink-0" aria-label={c.hecho ? "Desmarcar" : "Marcar"}>{c.hecho ? <CheckSquare className="w-5 h-5 text-[#1f8f00]" /> : <Square className="w-5 h-5 text-[var(--d-muted)]" />}</button>
                <span className={`flex-1 text-sm ${c.hecho ? "text-[var(--d-muted)] line-through" : "text-[var(--d-text)]"}`}>{c.texto}</span>
                <button onClick={() => delChk(c)} className="opacity-60 md:opacity-0 group-hover:opacity-100 p-1 text-[var(--d-muted)] hover:text-[var(--d-danger)]" aria-label="Quitar paso"><X className="w-3.5 h-3.5" /></button>
              </div>))}</div>
            <div className="mt-1 flex gap-2"><input value={nuevoChk} onChange={e => setNuevoChk(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addChk(); }} placeholder="Agregar paso…" className="flex-1 rounded-xl bg-[var(--d-card)] border border-[var(--d-border)] px-3 py-2 text-sm text-[var(--d-text)] placeholder-[var(--d-faint)]" />
              <button onClick={addChk} className="rounded-xl bg-[var(--d-card-2)] px-3 text-[var(--d-text)]" aria-label="Agregar paso"><Plus className="w-4 h-4" /></button></div>
          </div>

          </div>
          <div className={tabF === "charla" ? "space-y-5" : "hidden md:block space-y-5"}>
          {/* Actualizaciones */}
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[var(--d-muted)] mb-2">Actualizaciones</div>
            {puedeEditar && <div className="mb-2"><LinkEvidencia tareaId={a.id} /></div>}
            <div className="rounded-2xl border border-[var(--d-border)] bg-[var(--d-card)] p-2">
              {sugeridas.length > 0 && <div className="mb-1 rounded-xl border border-[var(--d-border)] bg-[var(--d-surface)] shadow-[var(--d-shadow)] overflow-hidden">{sugeridas.map(e => (
                <button key={e.id} type="button" onMouseDown={ev => ev.preventDefault()} onClick={() => elegirMencion(e.full_name)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-[var(--d-text)] hover:bg-[var(--d-hover)]"><Avatar nombre={e.full_name} size={24} />{e.full_name}</button>))}</div>}
              <textarea ref={txtRef} value={txt} onChange={e => onTxt(e.target.value, e.target.selectionStart ?? e.target.value.length)} rows={2} placeholder="Escribe una actualización… usa @ para avisarle a alguien" className="w-full bg-transparent p-2 text-sm text-[var(--d-text)] placeholder-[var(--d-faint)] focus:outline-none" />
              <div className="flex items-center gap-2 px-1 pb-1">
                <input ref={fileRef} type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) subir(f); e.target.value = ""; }} />
                <button onClick={() => fileRef.current?.click()} disabled={enviando} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--d-card-2)] px-3 py-2 text-xs text-[var(--d-text-2)]"><Camera className="w-4 h-4" />Foto</button>
                <button onClick={() => { if (fileRef.current) { fileRef.current.removeAttribute("capture"); fileRef.current.click(); setTimeout(() => fileRef.current?.setAttribute("capture", "environment"), 500); } }} disabled={enviando} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--d-card-2)] px-3 py-2 text-xs text-[var(--d-text-2)]"><Paperclip className="w-4 h-4" />Archivo</button>
                <button onClick={() => enviar()} disabled={enviando || !txt.trim()} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[#0073ea] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Enviar</button>
              </div>
            </div>
            <ol className="mt-3 space-y-3">
              {upds.map(u => (
                <li key={u.id} className="flex gap-3">
                  <Avatar nombre={u.autor_nombre || u.autor_email} size={30} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs"><span className="font-semibold text-[var(--d-text)]">{u.autor_nombre || u.autor_email || "Sistema"}</span> <span className="text-[var(--d-faint)]">· {haceCuanto(u.created_at)}</span></div>
                    {u.texto && <div className={`mt-0.5 text-sm whitespace-pre-wrap break-words ${u.tipo === "estado" || u.tipo === "sistema" ? "text-[var(--d-muted)] italic" : u.tipo === "whatsapp" ? "text-[var(--d-ok)]" : "text-[var(--d-text)]"}`}>{resaltarMenciones(u.texto, candidatos)}</div>}
                    {u.foto_url && <a href={u.foto_url} target="_blank" rel="noreferrer" className="mt-1.5 block"><img src={u.foto_url} alt="Foto de avance" className="rounded-xl max-h-60 border border-[var(--d-border)]" /></a>}
                    {u.archivo_url && <a href={u.archivo_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-sm text-[var(--d-link)] underline"><Paperclip className="w-3.5 h-3.5" />{u.archivo_nombre || "Archivo"}</a>}
                  </div>
                </li>))}
              {upds.length === 0 && <li className="text-xs text-[var(--d-faint)]">Aún no hay actualizaciones.</li>}
            </ol>
          </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[var(--d-border)] flex items-center gap-2" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
          {puedeBorrar && <button onClick={borrar} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs text-[var(--d-danger)] hover:bg-[#d0304a]/10"><Trash2 className="w-4 h-4" />Borrar</button>}
          {col !== "TERMINADA" && puedeEditar && <button onClick={() => onMover("TERMINADA")} className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-[#00873f] px-5 py-2.5 text-sm font-bold text-white active:scale-95 sobre-verde"><svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6-7" /></svg>Terminada</button>}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Nueva actividad ───────────────────────── */
function Nueva({ emps, obras, miEmp, carga, onClose, onCreated, flash }: { emps: Emp[]; obras: Obra[]; miEmp: string | null; carga: Record<string, number>; onClose: () => void; onCreated: (id: string, notificado: boolean) => void; flash: (t: "ok" | "err", m: string) => void }) {
  const hoy = new Date();
  const dia = (n: number) => { const d = new Date(hoy); d.setDate(hoy.getDate() + n); return ymd(d); };
  const viernes = (() => { const d = new Date(hoy); const k = (5 - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + k); return ymd(d); })();
  const [f, setF] = useState(() => { let obra = ""; try { obra = new URLSearchParams(window.location.search).get("obra") || ""; } catch { /* */ } return { titulo: "", asignado_id: "", fecha_compromiso: dia(1), hora: "", obra_id: obra, prioridad: "MEDIA", descripcion: "", pasos: "" }; });
  const [busy, setBusy] = useState(false);
  const [buscaP, setBuscaP] = useState("");
  const [deVoz, setDeVoz] = useState(false);
  // Borrador que viene de una nota de voz (botón + › Dictar)
  useEffect(() => {
    if (!emps.length) return;
    let raw: string | null = null; try { raw = sessionStorage.getItem("dom:voz"); } catch { /* */ }
    if (!raw) return;
    try {
      const v = JSON.parse(raw) as VozActividad; sessionStorage.removeItem("dom:voz");
      const per = parecido(v.persona, emps.map(e => ({ ...e, nombre: e.full_name })));
      const ob = parecido(v.obra, obras);
      setF(x => ({ ...x, titulo: v.titulo || x.titulo, descripcion: v.descripcion || "", asignado_id: per?.id || x.asignado_id, obra_id: ob?.id || x.obra_id, fecha_compromiso: v.fecha || x.fecha_compromiso, prioridad: v.prioridad || x.prioridad, pasos: (v.pasos || []).join("\n") }));
      setDeVoz(true);
    } catch { /* */ }
  }, [emps, obras]);
  // Solo las 5 personas que más usas (y "Yo"); el resto aparece al buscar o con "Ver todas"
  const [frec, setFrec] = useState<Record<string, number>>({}); const [todas, setTodas] = useState(false);
  useEffect(() => { try { setFrec(JSON.parse(localStorage.getItem("dom:personas-frec") || "{}")); } catch { /* */ } }, []);
  const personas = useMemo(() => {
    const n = norm(buscaP); if (n) return emps.filter(e => norm(e.full_name).includes(n));
    const orden = [...emps].sort((x, y) => (frec[y.id] || 0) - (frec[x.id] || 0) || (carga[y.id] || 0) - (carga[x.id] || 0));
    const top = todas ? orden : orden.filter(e => e.id !== miEmp).slice(0, 5);
    // 11-Oct-2026: si ya hay alguien elegido (por voz o búsqueda) que no está entre las 5, se muestra igual para que se vea quién quedó
    const sel = f.asignado_id && f.asignado_id !== miEmp && !top.some(e => e.id === f.asignado_id) ? emps.find(e => e.id === f.asignado_id) : null;
    return sel ? [sel, ...top] : top;
  }, [emps, buscaP, frec, carga, todas, miEmp, f.asignado_id]);
  // 11-Oct-2026: si algo falta, se completa solo cuando se puede (el título sale de los pasos o detalles)
  // y si no, se dice AHÍ MISMO qué falta (antes era un aviso de 3 segundos que nadie veía y "no dejaba guardar")
  const [falta, setFalta] = useState<"" | "titulo" | "persona">("");
  const crear = async () => {
    let titulo = f.titulo.trim();
    if (!titulo) {
      const primera = [f.pasos, f.descripcion].join("\n").split("\n").map(x => x.trim()).find(Boolean) || "";
      if (primera) { titulo = primera.slice(0, 120); setF(x => ({ ...x, titulo })); }
    }
    if (!titulo) { setFalta("titulo"); return; }
    if (!f.asignado_id) { setFalta("persona"); try { document.getElementById("quien-la-hace")?.scrollIntoView({ behavior: "smooth", block: "center" }); } catch { /* */ } return; }
    setFalta("");
    setBusy(true);
    try {
      const r = await api<{ id: string; notificado: boolean; encolado?: boolean }>("/api/actividades", "POST", { ...f, titulo, checklist: f.pasos.split("\n").map(s => s.trim()).filter(Boolean) });
      if (r.encolado) { flash("ok", "Sin señal: la actividad se creará sola al volver la conexión"); onClose(); return; }
      try { const m = { ...frec, [f.asignado_id]: (frec[f.asignado_id] || 0) + 1 }; localStorage.setItem("dom:personas-frec", JSON.stringify(m)); } catch { /* */ }
      onCreated(r.id, r.notificado);
    } catch (e) { flash("err", (e as Error).message); setBusy(false); }
  };
  return (
    <div className="aria-sheet fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/55 backdrop-blur-[2px]" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full md:max-w-xl max-h-[94dvh] rounded-t-3xl md:rounded-3xl bg-[var(--d-surface)] border border-[var(--d-border)] flex flex-col shadow-2xl">
        <div className="md:hidden mx-auto mt-2 h-1.5 w-12 rounded-full bg-[var(--d-border)]" />
        <div className="flex items-center justify-between px-5 pt-3 md:pt-5"><h2 className="text-lg font-bold text-[var(--d-text)]">Nueva actividad</h2><button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--d-hover)] text-[var(--d-text-2)]" aria-label="Cerrar"><X className="w-5 h-5" /></button></div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {deVoz && <div className="rounded-xl bg-[#a25ddc]/10 border border-[#a25ddc]/30 px-3 py-2 text-[12.5px] font-semibold text-[var(--d-purple)]">Lo llenamos con lo que dictaste. Revisa y toca Crear.</div>}
          {falta === "titulo" && <div className="rounded-xl bg-[#d0304a] px-3 py-2.5 text-[15px] font-bold text-white">Escribe qué hay que hacer (aquí arriba o en los pasos de abajo).</div>}
          <input autoFocus value={f.titulo} onChange={e => setF({ ...f, titulo: e.target.value })} placeholder="¿Qué hay que hacer?" className="w-full rounded-xl bg-[var(--d-card)] border border-[var(--d-border)] px-4 py-3 text-base text-[var(--d-text)] placeholder-[var(--d-faint)]" />
          <div>
            {falta === "persona" && <div className="mb-2 rounded-xl bg-[#d0304a] px-3 py-2.5 text-[15px] font-bold text-white">Falta elegir quién la hace: toca a una persona (o “Yo”).</div>}
            <div id="quien-la-hace" className="text-[11px] uppercase tracking-wide text-[var(--d-muted)] mb-2">¿Quién la hace? <span className="normal-case tracking-normal font-normal">· el número es cuántas tiene abiertas</span></div>
            {emps.length > 6 && <input value={buscaP} onChange={e => setBuscaP(e.target.value)} placeholder="Buscar persona" className="mb-2 w-full rounded-xl bg-[var(--d-card)] border border-[var(--d-border)] px-3 py-2 text-sm text-[var(--d-text)] placeholder-[var(--d-faint)]" />}
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {miEmp && <button onClick={() => { setF({ ...f, asignado_id: miEmp }); setFalta(""); }} className={`inline-flex items-center gap-1.5 rounded-full border pl-1 pr-3 py-1 text-xs ${f.asignado_id === miEmp ? "border-[#0073ea] bg-[#0073ea]/15 text-[var(--d-text)] font-semibold" : "border-[var(--d-border)] text-[var(--d-text-2)]"}`}><Avatar nombre="Yo" size={24} />Yo</button>}
              {personas.filter(p => p.id !== miEmp).map(p => (
                <button key={p.id} onClick={() => { setF({ ...f, asignado_id: p.id }); setFalta(""); }} className={`inline-flex items-center gap-1.5 rounded-full border pl-1 pr-3 py-1 text-xs ${f.asignado_id === p.id ? "border-[#0073ea] bg-[#0073ea]/15 text-[var(--d-text)] font-semibold" : "border-[var(--d-border)] text-[var(--d-text-2)] hover:bg-[var(--d-hover)]"}`}><Avatar nombre={p.full_name} size={24} />{p.full_name.split(" ").slice(0, 2).join(" ")}{(carga[p.id] || 0) > 0 && <span title="Actividades abiertas" className={`ml-0.5 rounded-full px-1.5 text-[11px] font-bold ${carga[p.id] >= 15 ? "bg-[#d0304a] text-white" : carga[p.id] >= 8 ? "bg-[#fdab3d] text-[#3d2300]" : "bg-[var(--d-card-2)] text-[var(--d-muted)]"}`}>{carga[p.id]}</span>}</button>))}
              {!buscaP && !todas && emps.length > 6 && <button type="button" onClick={() => setTodas(true)} className="inline-flex items-center rounded-full border border-dashed border-[var(--d-border)] px-3 py-1 text-xs font-semibold text-[var(--d-link)]">Ver todas ({emps.length})</button>}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[var(--d-muted)] mb-2">¿Para cuándo?</div>
            <div className="flex flex-wrap gap-2">
              {[["Hoy", dia(0)], ["Mañana", dia(1)], ["Viernes", viernes], ["En una semana", dia(7)]].map(([l, v]) => (
                <button key={l} onClick={() => setF({ ...f, fecha_compromiso: v })} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${f.fecha_compromiso === v ? "bg-[#0073ea] text-white" : "bg-[var(--d-card-2)] text-[var(--d-text-2)]"}`}>{l}</button>))}
              <input type="date" value={f.fecha_compromiso} onChange={e => setF({ ...f, fecha_compromiso: e.target.value })} className="rounded-full bg-[var(--d-card-2)] border border-[var(--d-border)] px-3 py-1 text-xs text-[var(--d-text)]" />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-semibold text-[var(--d-muted)]">Hora:</span>
              {[["Sin hora", ""], ["9:00", "09:00"], ["12:00", "12:00"], ["16:00", "16:00"]].map(([l, v]) => (
                <button key={l} type="button" onClick={() => setF({ ...f, hora: v })} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${f.hora === v ? "bg-[#0073ea] text-white" : "bg-[var(--d-card-2)] text-[var(--d-text-2)]"}`}>{l}</button>))}
              <input type="time" value={f.hora} onChange={e => setF({ ...f, hora: e.target.value })} aria-label="Otra hora" className="rounded-full bg-[var(--d-card-2)] border border-[var(--d-border)] px-3 py-1 text-xs text-[var(--d-text)]" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block"><span className="text-[11px] uppercase tracking-wide text-[var(--d-muted)]">Obra</span>
              <select value={f.obra_id} onChange={e => setF({ ...f, obra_id: e.target.value })} className="mt-1 w-full rounded-xl px-3 py-2 text-sm"><option value="">Oficina / sin obra</option>{obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select></label>
            <div><span className="text-[11px] uppercase tracking-wide text-[var(--d-muted)]">Prioridad</span>
              <div className="mt-1 grid grid-cols-4 gap-1">{PRIORIDADES.map(p => <button key={p.id} onClick={() => setF({ ...f, prioridad: p.id })} className={`rounded-lg py-2 text-[11px] font-semibold ${f.prioridad === p.id ? "text-white" : "text-[var(--d-muted)] bg-[var(--d-card)]"}`} style={f.prioridad === p.id ? { background: p.color } : undefined}>{p.label}</button>)}</div></div>
          </div>
          <textarea value={f.descripcion} onChange={e => setF({ ...f, descripcion: e.target.value })} rows={2} placeholder="Detalles (opcional)" className="w-full rounded-xl bg-[var(--d-card)] border border-[var(--d-border)] p-3 text-sm text-[var(--d-text)] placeholder-[var(--d-faint)]" />
          <textarea value={f.pasos} onChange={e => setF({ ...f, pasos: e.target.value })} rows={3} placeholder={"Pasos o lista de actividades (opcional, una por renglón)\nEj. Medir\nCotizar\nComprar"} className="w-full rounded-xl bg-[var(--d-card)] border border-[var(--d-border)] p-3 text-sm text-[var(--d-text)] placeholder-[var(--d-faint)]" />
        </div>
        <div className="px-5 py-3 border-t border-[var(--d-border)]" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
          <button onClick={crear} disabled={busy} className="w-full rounded-xl bg-[#0073ea] py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? "Creando…" : f.asignado_id && f.asignado_id === miEmp ? "Crear" : "Crear y avisar"}</button>
        </div>
      </div>
    </div>
  );
}
