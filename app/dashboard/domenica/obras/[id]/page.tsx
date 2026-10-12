"use client";
/**
 * /dashboard/domenica/obras/[id] — Espacio de una obra + tablero de la obra (ARIA Doménica · 11-Oct-2026)
 * Semáforo, avance, presupuesto contra gastado, actividades abiertas, solicitudes y accesos rápidos.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Building2, Loader2, LayoutGrid, AlertTriangle, ChevronRight, MapPin } from "lucide-react";
import { Ficha, IcoBitacora, IcoCamara, IcoPlano, IcoTarea, IcoSaco, IcoCalendario, type Ico } from "@/components/domenica/IconosObra";
import { supabase } from "@/lib/supabase";
import { atrasoTexto, columnaDe, diasAtraso, fechaCorta, iniciales, colorPersona, COLUMNAS, type Actividad } from "@/lib/actividades";
import { statusLabel } from "@/lib/requi-stepper";
import { fmtMoney } from "@/lib/formatters";
import { numerosObra, semaforoObra, normObra, type ObraDom, type RequiDom } from "@/lib/obras-dom";
import { enRiesgo } from "@/lib/riesgo";

type Entrega = { id: string; fecha_entrega: string | null; proveedor_nombre: string | null; obra_nombre: string | null; recibido_por_nombre: string | null; foto_url: string | null; status: string | null; requisicion_id: string | null };

export default function ObraDomPage() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<{ o: ObraDom | null; acts: Actividad[]; requis: RequiDom[]; entregas: Entrega[] } | null>(null);
  const [respNombre, setRespNombre] = useState<string | null>(null);
  useEffect(() => { const e = d?.o?.responsable_email; if (!e) return; supabase.from("users").select("name").eq("email", e.toLowerCase()).maybeSingle().then(({ data }) => setRespNombre((data as { name?: string } | null)?.name || null)); }, [d?.o?.responsable_email]);
  useEffect(() => {
    (async () => {
      const { data: o } = await supabase.from("centros_trabajo").select("id, nombre, cliente, presupuesto, presupuesto_contratado, presupuesto_ampliaciones, fecha_inicio, fecha_fin, responsable_email, estado, direccion").eq("id", id).maybeSingle();
      const [{ data: a }, { data: r }, { data: en }] = await Promise.all([
        supabase.from("tareas_asignadas").select("*").neq("estatus", "CANCELADA").limit(3000),
        supabase.from("Requisiciones").select("id, folio, cost_center_name, status, total, monto, proveedor, created_at").order("created_at", { ascending: false }).limit(5000),
        supabase.from("entregas").select("id, fecha_entrega, proveedor_nombre, obra_nombre, recibido_por_nombre, foto_url, status, requisicion_id").order("fecha_entrega", { ascending: false }).limit(500),
      ]);
      setD({ o: (o || null) as ObraDom | null, acts: (a || []) as Actividad[], requis: (r || []) as RequiDom[], entregas: (en || []) as Entrega[] });
    })();
  }, [id]);
  const x = useMemo(() => d?.o ? numerosObra(d.o, d.acts, d.requis) : null, [d]);

  if (!d) return <div className="dom-page h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--d-muted)]" /></div>;
  if (!d.o || !x) return <div className="dom-page h-full p-6 text-[var(--d-muted)]">No se encontró la obra. <Link href="/dashboard/domenica/obras" className="text-[var(--d-link)] underline">Ver obras</Link></div>;
  const o = d.o; const s = semaforoObra(x);
  const porCol = COLUMNAS.map(c => ({ c, n: x.actividades.filter(a => columnaDe(a) === c.id).length }));
  const idsReq = new Set(x.requis.map(q => q.id));
  const entregasObra = d.entregas.filter(e => (e.requisicion_id && idsReq.has(e.requisicion_id)) || normObra(e.obra_nombre) === normObra(o.nombre));
  const abiertasOrden = [...x.abiertas].sort((a, b) => (diasAtraso(b) - diasAtraso(a)) || String(a.fecha_compromiso || "9").localeCompare(String(b.fecha_compromiso || "9")));

  return (
    <div className="dom-page h-full overflow-y-auto">
      <div className="px-4 md:px-6 pt-4 pb-28 md:pb-10 max-w-5xl mx-auto">
        <Link href="/dashboard/domenica/obras" className="hidden md:inline-flex items-center gap-1 text-xs text-[var(--d-link)] mb-2"><ArrowLeft className="w-3.5 h-3.5" />Obras</Link>
        <div className="relative overflow-hidden rounded-3xl p-5 text-white dom-in" style={{ background: "#c9410f" }}>
          <div className="relative flex items-start gap-3">
            <span className="shrink-0 w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center"><Building2 className="w-6 h-6" /></span>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-tight">{o.nombre}</h1>
              <div className="text-[13px] text-white/90">{o.cliente || "Sin cliente"}{o.responsable_email ? ` · Responsable: ${respNombre || o.responsable_email.split("@")[0]}` : ""}</div>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[12px] font-bold"><span className="w-2 h-2 rounded-full" style={{ background: s.c }} />{s.t}</div>
            </div>
          </div>
        </div>

        {/* Golpe de vista: 3 números siempre; lo demás solo si hay algo (no tarjetas en cero) */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[{ n: `${x.avance}%`, l: "Avance", c: "var(--c-azul)" }, { n: String(x.abiertas.length), l: "Abiertas", c: "var(--d-text)" }, { n: String(x.atrasadas), l: "Atrasadas", c: x.atrasadas ? "var(--c-rojo)" : "var(--d-faint)" }].map((k, i) => (
            <div key={k.l} className="dom-card dom-in rounded-2xl px-3 py-2.5" style={{ animationDelay: `${i * 50}ms` }}><div className="text-[24px] font-bold leading-none" style={{ color: k.c }}>{k.n}</div><div className="mt-1.5 text-[12px] text-[var(--d-muted)]">{k.l}</div></div>))}
        </div>
        {(() => { const nRiesgo = x.abiertas.filter(q => enRiesgo(q, new Date().toISOString().slice(0, 10))).length; return (x.atoradas > 0 || x.detenidas.length > 0 || nRiesgo > 0) && <div className="mt-2 flex flex-wrap gap-1.5">
          {x.atoradas > 0 && <span className="rounded-full bg-[#d0304a] px-3 py-1.5 text-[12.5px] font-bold text-white">{x.atoradas} atorada{x.atoradas === 1 ? "" : "s"}</span>}
          {x.detenidas.length > 0 && <span className="rounded-full bg-[#7e3bdd] px-3 py-1.5 text-[12.5px] font-bold text-white">{x.detenidas.length} solicitud{x.detenidas.length === 1 ? "" : "es"} detenida{x.detenidas.length === 1 ? "" : "s"}</span>}
          {nRiesgo > 0 && <span className="rounded-full bg-[#b85507] px-3 py-1.5 text-[12.5px] font-bold text-white">{nRiesgo} en riesgo de atrasarse</span>}
        </div>; })()}

        <div className="mt-3 dom-card dom-in rounded-2xl p-4">
          <div className="flex items-baseline justify-between"><span className="text-sm font-bold text-[var(--d-text)]">Presupuesto contra gastado</span><span className="text-[12px] text-[var(--d-muted)]">{x.requis.length} solicitudes</span></div>
          <div className="mt-2 flex items-end justify-between gap-2"><div><div className="text-[22px] font-bold text-[var(--d-text)]">{fmtMoney(x.gastado)}</div><div className="text-[11.5px] text-[var(--d-muted)]">gastado en solicitudes</div></div>
            <div className="text-right"><div className="text-[15px] font-semibold text-[var(--d-text-2)]">{x.presupuesto ? fmtMoney(x.presupuesto) : "—"}</div><div className="text-[11.5px] text-[var(--d-muted)]">{x.presupuesto ? `presupuesto · ${x.pctGasto}% usado` : "sin presupuesto capturado"}</div></div></div>
          <div className="mt-2 h-3 rounded-full bg-[var(--d-card-2)] overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, x.pctGasto ?? 0)}%`, background: (x.pctGasto ?? 0) > 100 ? "#d0304a" : (x.pctGasto ?? 0) > 85 ? "#fdab3d" : "#00953f" }} /></div>
          {!x.presupuesto && <div className="mt-2 text-[11.5px] text-[var(--d-muted)]">Captura el presupuesto en Obras › Catálogo para ver el porcentaje.</div>}
        </div>

        <div className="mt-3 grid grid-cols-3 md:grid-cols-6 gap-2">
          {([{ href: `/dashboard/domenica/obras/${o.id}/bitacora`, t: "Bitácora", icon: IcoBitacora, c: "#0077ad" }, { href: `/dashboard/domenica/obras/${o.id}/fotos`, t: "Fotos de avance", icon: IcoCamara, c: "#b85507" }, { href: `/dashboard/domenica/planos?obra=${o.id}`, t: "Planos", icon: IcoPlano, c: "#0073ea" },
            { href: `/dashboard/actividades?nueva=1&obra=${o.id}`, t: "Nueva actividad", icon: IcoTarea, c: "#7e3bdd" }, { href: "/dashboard/requisiciones/requisiciones/nuevo", t: "Pedir material", icon: IcoSaco, c: "#00953f" }, { href: `/dashboard/actividades?vista=linea&obra=${o.id}`, t: "Línea de tiempo", icon: IcoCalendario, c: "#c62f5e" }] as { href: string; t: string; icon: Ico; c: string }[]).map(b => (
            <Link key={b.t} href={b.href} className="dom-card rounded-2xl py-3 px-1 flex flex-col items-center gap-1.5 active:scale-[0.98] transition"><Ficha ico={b.icon} color={b.c} size="sm" /><span className="text-[12px] font-semibold text-[var(--d-text)] leading-tight text-center">{b.t}</span></Link>))}
        </div>

        <section className="mt-6">
          <div className="flex items-center justify-between mb-2"><h2 className="text-[15px] font-bold text-[var(--d-text)]">Actividades</h2><Link href={`/dashboard/actividades?vista=tablero&obra=${o.id}`} className="inline-flex items-center gap-1 py-2.5 -my-2.5 pl-3 text-[13px] font-semibold text-[var(--d-link)]"><LayoutGrid className="w-3.5 h-3.5" />Tablero</Link></div>
          <div className="mb-2 flex h-2.5 rounded-full overflow-hidden bg-[var(--d-card-2)]">{porCol.filter(p => p.n).map(p => <div key={p.c.id} title={`${p.c.label}: ${p.n}`} style={{ width: `${(p.n / Math.max(1, x.actividades.length)) * 100}%`, background: p.c.color }} />)}</div>
          <div className="mb-3 flex flex-wrap gap-3 text-[11.5px] text-[var(--d-muted)]">{porCol.map(p => <span key={p.c.id} className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full" style={{ background: p.c.color }} />{p.c.label} {p.n}</span>)}</div>
          <div className="space-y-2">
            {abiertasOrden.slice(0, 15).map(a => { const atr = diasAtraso(a); const col = columnaDe(a); return (
              <Link key={a.id} href={`/dashboard/actividades?abrir=${a.id}`} className="dom-card rounded-xl p-3 flex items-center gap-3">
                <span className="shrink-0 w-1 self-stretch rounded-full" style={{ background: COLUMNAS.find(c => c.id === col)?.color }} />
                <div className="flex-1 min-w-0"><div className="text-[14px] font-semibold text-[var(--d-text)] truncate">{a.titulo}</div>
                  <div className="text-[11.5px] flex flex-wrap gap-x-2"><span className={atr > 0 ? "text-[var(--d-danger)] font-semibold" : "text-[var(--d-muted)]"}>{a.fecha_compromiso ? (atr > 0 ? atrasoTexto(atr) : `Entrega ${fechaCorta(a.fecha_compromiso)}`) : "Sin fecha"}</span>{col === "BLOQUEADA" && <span className="inline-flex items-center gap-0.5 text-[var(--d-danger)]"><AlertTriangle className="w-3 h-3" />Atorada</span>}<span className="text-[var(--d-muted)]">{Number(a.avance) || 0}%</span></div></div>
                <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold" style={{ background: colorPersona(a.asignado_nombre) }} title={a.asignado_nombre || ""}>{iniciales(a.asignado_nombre)}</span>
              </Link>); })}
            {x.abiertas.length === 0 && <div className="rounded-2xl border border-dashed border-[var(--d-border)] p-6 text-center text-sm text-[var(--d-muted)]">No hay actividades abiertas. <Link href={`/dashboard/domenica/plantillas?obra=${o.id}`} className="text-[var(--d-link)] font-semibold">Usa una plantilla</Link> para arrancar.</div>}
            {x.abiertas.length > 15 && <Link href={`/dashboard/actividades?vista=lista&obra=${o.id}`} className="block text-center text-sm font-semibold text-[var(--d-link)] py-2">Ver las {x.abiertas.length}</Link>}
          </div>
        </section>

        {x.detenidas.length > 0 && <section className="mt-6">
          <h2 className="text-[15px] font-bold text-[var(--d-text)] mb-2">Solicitudes detenidas</h2>
          <div className="dom-card rounded-2xl overflow-hidden divide-y divide-[var(--d-border)]">
            {x.detenidas.slice(0, 10).map(q => (
              <Link key={q.id} href={`/dashboard/requisiciones/requisiciones/estatus?open=${q.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-[var(--d-hover)]">
                <span className="shrink-0 text-lg">⏸</span>
                <div className="flex-1 min-w-0"><div className="font-mono text-[12.5px] font-semibold text-[var(--d-link)]">{q.folio}</div><div className="text-[12px] text-[var(--d-muted)] truncate">{statusLabel(q.status)} · hace {Math.floor((Date.now() - Date.parse(String(q.created_at))) / 864e5)} días</div></div>
                <div className="text-[13px] font-bold text-[var(--d-text)]">{fmtMoney(Number(q.monto) || Number(q.total) || 0)}</div>
              </Link>))}
          </div>
        </section>}

        <section className="mt-6">
          <h2 className="text-[15px] font-bold text-[var(--d-text)] mb-2">Entregas en obra</h2>
          <div className="dom-card rounded-2xl overflow-hidden divide-y divide-[var(--d-border)]">
            {entregasObra.slice(0, 8).map(e => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                {e.foto_url ? <a href={e.foto_url} target="_blank" rel="noreferrer" className="shrink-0"><img src={e.foto_url} alt="Foto de la entrega" className="w-12 h-12 rounded-xl object-cover border border-[var(--d-border)]" /></a> : <span className="shrink-0 w-12 h-12 rounded-xl bg-[var(--d-card-2)] flex items-center justify-center text-lg">📦</span>}
                <div className="flex-1 min-w-0"><div className="text-[13.5px] font-semibold text-[var(--d-text)] truncate">{e.proveedor_nombre || "Proveedor"}</div><div className="text-[12px] text-[var(--d-muted)] truncate">{fechaCorta(e.fecha_entrega)}{e.recibido_por_nombre ? ` · recibió ${e.recibido_por_nombre}` : ""}</div></div>
                <span className="text-[11px] font-semibold text-[var(--d-ok)]">{e.status === "PARCIAL" ? "Parcial" : "Recibida"}</span>
              </div>))}
            {entregasObra.length === 0 && <div className="px-4 py-6 text-center text-sm text-[var(--d-muted)]">Aún no hay entregas registradas en esta obra.</div>}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-[15px] font-bold text-[var(--d-text)] mb-2">Últimas solicitudes</h2>
          <div className="dom-card rounded-2xl overflow-hidden divide-y divide-[var(--d-border)]">
            {x.requis.slice(0, 8).map(r => (
              <Link key={r.id} href={`/dashboard/requisiciones/requisiciones/estatus?open=${r.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-[var(--d-hover)]">
                <div className="flex-1 min-w-0"><div className="font-mono text-[12.5px] font-semibold text-[var(--d-link)]">{r.folio}</div><div className="text-[12px] text-[var(--d-muted)] truncate">{r.proveedor || statusLabel(r.status)}</div></div>
                <div className="text-right"><div className="text-[13px] font-bold text-[var(--d-text)]">{fmtMoney(Number(r.monto) || Number(r.total) || 0)}</div><div className="text-[11px] text-[var(--d-muted)]">{statusLabel(r.status)}</div></div>
                <ChevronRight className="w-4 h-4 text-[var(--d-faint)]" />
              </Link>))}
            {x.requis.length === 0 && <div className="px-4 py-6 text-center text-sm text-[var(--d-muted)]">Sin solicitudes registradas con el nombre de esta obra.</div>}
          </div>
        </section>
        {o.fecha_inicio && <div className="mt-4 text-[11.5px] text-[var(--d-muted)] inline-flex items-center gap-1"><MapPin className="w-3 h-3" />Inicio {fechaCorta(o.fecha_inicio)}{o.fecha_fin ? ` · fin ${fechaCorta(o.fecha_fin)}` : ""}</div>}
      </div>
    </div>
  );
}
