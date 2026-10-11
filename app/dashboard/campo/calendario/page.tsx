"use client";
/**
 * /dashboard/campo/calendario — ARIA27 Campo F5
 * Calendario mensual sin librerías: puntos por día con actividades (inicio/límite),
 * fechas requeridas de requis y entregas. Tocar un día lista lo de ese día.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Ficha, IcoTarea, IcoSaco, IcoCamion, IcoCalendario } from "@/components/domenica/IconosObra";
import { Encabezado } from "@/components/movil/base";
import { supabase } from "@/lib/supabase";

type Ev = { kind: "tarea" | "requi" | "entrega"; date: string; title: string; sub?: string; href: string; done?: boolean; urgent?: boolean };
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["L", "M", "X", "J", "V", "S", "D"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function CalendarioPage() {
  const [montado, setMontado] = useState(false);
  useEffect(() => { setMontado(true); }, []);
  const hoy = new Date(); const [cur, setCur] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [sel, setSel] = useState<string>(iso(hoy)); const [evs, setEvs] = useState<Ev[]>([]); const [me, setMe] = useState<{ email: string; role: string } | null>(null);

  useEffect(() => { (async () => { try { const r = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" }); if (r.ok) { const u = await r.json(); setMe({ email: String(u.email || "").toLowerCase(), role: String(u.role || "").toLowerCase() }); } } catch {} })(); }, []);

  useEffect(() => {
    if (!me) return; let alive = true;
    const ini = iso(new Date(cur.getFullYear(), cur.getMonth() - 1, 1)); const fin = iso(new Date(cur.getFullYear(), cur.getMonth() + 2, 0));
    (async () => {
      const out: Ev[] = [];
      const amplio = ["admin", "compras", "rh", "direccion"].includes(me.role);
      // 10-Oct-2026: actividades = tareas_asignadas (tablero tipo Monday)
      let tq = supabase.from("tareas_asignadas").select("id, titulo, obra, fecha_inicio, fecha_compromiso, estatus, prioridad, asignado_email, asignado_por_email, asignado_por").neq("estatus", "CANCELADA");
      if (!amplio) tq = tq.or(`asignado_email.eq.${me.email},asignado_por_email.eq.${me.email},asignado_por.eq.${me.email}`);
      const { data: ts } = await tq;
      for (const t of (ts || []) as Array<{ id: string; titulo: string; obra?: string | null; fecha_inicio?: string | null; fecha_compromiso?: string | null; estatus: string; prioridad?: string | null }>) {
        const href = `/dashboard/actividades?abrir=${t.id}`; const done = t.estatus === "COMPLETADA";
        if (t.fecha_compromiso) out.push({ kind: "tarea", date: t.fecha_compromiso.slice(0, 10), title: t.titulo, sub: `${t.obra || "Oficina"} · entrega`, href, done, urgent: ["ALTA", "URGENTE"].includes(String(t.prioridad || "").toUpperCase()) });
        if (t.fecha_inicio && t.fecha_inicio !== t.fecha_compromiso) out.push({ kind: "tarea", date: t.fecha_inicio.slice(0, 10), title: t.titulo, sub: `${t.obra || "Oficina"} · inicio`, href, done });
      }
      let rq = supabase.from("Requisiciones").select("id, folio, cost_center_name, required_date, status, fecha_entrega, user_email, responsable_email").gte("required_date", ini).lte("required_date", fin);
      if (!amplio) rq = rq.or(`user_email.eq.${me.email},responsable_email.eq.${me.email}`);
      const { data: rs } = await rq;
      for (const r of (rs || []) as Array<{ id: string; folio: string; cost_center_name: string; required_date?: string | null; status: string; fecha_entrega?: string | null }>) {
        if (r.required_date) out.push({ kind: "requi", date: r.required_date, title: `${r.folio}`, sub: `${r.cost_center_name} · requerida`, href: `/dashboard/requisiciones/requisiciones/estatus?open=${r.id}`, done: ["ENTREGADA", "CANCELADA"].includes(r.status) });
        if (r.fecha_entrega) out.push({ kind: "entrega", date: r.fecha_entrega, title: `${r.folio}`, sub: `${r.cost_center_name} · entregada`, href: `/dashboard/requisiciones/requisiciones/estatus?open=${r.id}`, done: true });
      }
      if (alive) setEvs(out);
    })();
    return () => { alive = false; };
  }, [me, cur]);

  const byDay = useMemo(() => { const m: Record<string, Ev[]> = {}; for (const e of evs) (m[e.date] ||= []).push(e); return m; }, [evs]);
  const first = new Date(cur.getFullYear(), cur.getMonth(), 1); const offset = (first.getDay() + 6) % 7; const nDays = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
  const cells: Array<string | null> = [...Array(offset).fill(null), ...Array.from({ length: nDays }, (_, i) => iso(new Date(cur.getFullYear(), cur.getMonth(), i + 1)))];
  const list = byDay[sel] || [];
  const COL: Record<Ev["kind"], string> = { tarea: "#0073ea", requi: "#e8760a", entrega: "#3cde01" };
  const Icon = ({ k }: { k: Ev["kind"] }) => <Ficha ico={k === "tarea" ? IcoTarea : k === "entrega" ? IcoCamion : IcoSaco} color={COL[k]} size="sm" />;
  const proximos = evs.filter(e => !e.done && e.date > sel).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);

  if (!montado) return <div className="dom-page min-h-full" />; // fechas solo en el teléfono (evita desfase de zona horaria)
  return (
    <div className="dom-page min-h-full"><div className="px-4 pt-4 pb-28 max-w-2xl mx-auto space-y-4">
      <Encabezado ico={IcoCalendario} color="#e8760a" titulo="Calendario" sub="Actividades, pedidos y entregas" atras="/dashboard/campo" />
      <div className="mt-3 flex items-center justify-between">
        <button onClick={() => setCur(new Date(cur.getFullYear(), cur.getMonth() - 1, 1))} className="btn-flat p-2.5 rounded-xl bg-[var(--d-card)] border border-[var(--d-border)]" aria-label="Mes anterior"><ChevronLeft className="w-5 h-5" /></button>
        <div className="text-[17px] text-[var(--d-text)] font-bold capitalize">{MESES[cur.getMonth()]} {cur.getFullYear()}</div>
        <button onClick={() => setCur(new Date(cur.getFullYear(), cur.getMonth() + 1, 1))} className="btn-flat p-2.5 rounded-xl bg-[var(--d-card)] border border-[var(--d-border)]" aria-label="Mes siguiente"><ChevronRight className="w-5 h-5" /></button>
      </div>
      <div className="flex gap-3 justify-center text-[11.5px] font-semibold text-[var(--d-muted)]">{([["Actividades", "#0073ea"], ["Pedidos", "#e8760a"], ["Entregas", "#3cde01"]] as const).map(([l, c]) => <span key={l} className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: c }} />{l}</span>)}</div>
      <div className="mt-2 grid grid-cols-7 text-center text-[11px] font-semibold text-[var(--d-muted)]">{DIAS.map(d => <div key={d} className="py-1">{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => d === null ? <div key={`e${i}`} /> : (() => { const l = byDay[d] || []; const isSel = d === sel; const isHoy = d === iso(hoy); const pend = l.filter(e => !e.done); return (
          <button key={d} onClick={() => setSel(d)} className={`btn-flat aspect-square rounded-xl border text-sm flex flex-col items-center justify-center gap-0.5 ${isSel ? "border-[#0073ea] bg-[#0073ea] text-white" : isHoy ? "border-[#0073ea] text-[var(--d-text)]" : "border-[var(--d-border)] text-[var(--d-text-2)]"}`} aria-label={`${d}, ${l.length} eventos`}>
            <span className={isHoy ? "font-bold" : ""}>{Number(d.slice(-2))}</span>
            <span className="flex gap-0.5 h-1.5">{l.slice(0, 3).map((e, j) => <span key={j} className={`w-1.5 h-1.5 rounded-full ${isSel ? "bg-white" : e.done ? "bg-[var(--d-border)]" : ""}`} style={isSel || e.done ? undefined : { background: e.urgent ? "#e2445c" : COL[e.kind] }} />)}</span>
            {pend.length > 3 && <span className={`text-[9px] font-semibold -mt-0.5 ${isSel ? "text-white" : "text-[var(--d-muted)]"}`}>+{pend.length - 3}</span>}
          </button>); })())}
      </div>
      <section className="mt-4">
        <h2 className="text-xs font-semibold tracking-wider text-[var(--d-muted)] uppercase mb-2">{new Date(sel + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}</h2>
        {list.length === 0 ? (<div><p className="text-sm text-[var(--d-muted)]">Nada programado este día.</p>{proximos.length > 0 && <><h3 className="mt-4 mb-2 text-xs font-semibold tracking-wider text-[var(--d-muted)] uppercase">Lo que viene</h3><ul className="space-y-2">{proximos.map((e, i) => <li key={i}><Link href={e.href} className="flex items-center gap-3 rounded-2xl bg-[var(--d-card)] border border-[var(--d-border)] p-3"><Icon k={e.kind} /><div className="flex-1 min-w-0"><div className="text-sm font-semibold text-[var(--d-text)] truncate">{e.title}</div><div className="text-[12px] text-[var(--d-muted)] truncate">{new Date(e.date + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })} · {e.sub}</div></div></Link></li>)}</ul></>}</div>) : (
          <ul className="space-y-2">{list.map((e, i) => (<li key={i}><Link href={e.href} className={`flex items-center gap-3 rounded-xl border border-[var(--d-border)] bg-[var(--d-card)] p-3 ${e.done ? "opacity-60" : ""}`}><Icon k={e.kind} /><div className="flex-1 min-w-0"><div className={`text-sm text-[var(--d-text)] ${e.done ? "line-through" : ""}`}>{e.title}</div><div className="text-[11px] text-[var(--d-muted)] truncate">{e.sub}</div></div></Link></li>))}</ul>
        )}
      </section>
    </div></div>
  );
}
