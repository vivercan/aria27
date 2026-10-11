"use client";
/** Catálogo de obras en el teléfono (Doménica 27 · 11-Oct-2026): buscar, ver datos y ubicación, abrir el espacio de la obra. Alta y edición: modo completo. */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, MapPin } from "lucide-react";
import { IcoObra } from "@/components/domenica/IconosObra";
import { Hoja } from "@/components/domenica/ui";
import { Esqueleto } from "@/components/domenica/Esqueleto";
import { supabase } from "@/lib/supabase";
import { Encabezado, Buscador, Pestanas, ModoCompleto, Pagina } from "./base";

type O = { id: string; codigo: string | null; nombre: string; direccion: string | null; cliente: string | null; estado: string | null; presupuesto: number | null; fecha_inicio: string | null; fecha_fin: string | null; latitud: number | null; longitud: number | null; radio_metros: number | null; responsable_email: string | null };
const ESTADO: Record<string, { l: string; c: string }> = {
  ACTIVA: { l: "Activa", c: "#0073ea" }, EN_PLANEACION: { l: "En planeación", c: "#7e3bdd" }, PAUSADA: { l: "Pausada", c: "#b85507" },
  TERMINADA: { l: "Terminada", c: "#55657c" }, CANCELADA: { l: "Cancelada", c: "#d0304a" },
};
const est = (e: string | null) => ESTADO[String(e || "ACTIVA").toUpperCase()] || ESTADO.ACTIVA;
const fecha = (d: string | null) => d ? new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "—";
const dinero = (n: number | null) => n ? Number(n).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }) : "—";

export default function ObrasCatalogoMovil() {
  const [lista, setLista] = useState<O[] | null>(null); const [q, setQ] = useState(""); const [tab, setTab] = useState<"abiertas" | "todas">("abiertas"); const [ver, setVer] = useState<O | null>(null);
  const [nombres, setNombres] = useState<Record<string, string>>({});
  useEffect(() => {
    supabase.from("centros_trabajo").select("id, codigo, nombre, direccion, cliente, estado, presupuesto, fecha_inicio, fecha_fin, latitud, longitud, radio_metros, responsable_email").order("nombre").then(({ data }) => setLista((data || []) as O[]));
    supabase.from("Users").select("email, name").then(({ data }) => setNombres(Object.fromEntries(((data || []) as { email: string; name: string }[]).map(u => [String(u.email).toLowerCase(), u.name]))));
  }, []);
  const abierta = (o: O) => !["TERMINADA", "CANCELADA"].includes(String(o.estado || "").toUpperCase());
  const vis = useMemo(() => { const t = q.trim().toLowerCase(); return (lista || []).filter(o => (tab === "todas" || abierta(o)) && (!t || `${o.nombre} ${o.cliente || ""} ${o.codigo || ""} ${o.direccion || ""}`.toLowerCase().includes(t))); }, [lista, q, tab]);
  const k = useMemo(() => { const l = lista || []; const n = (e: string) => l.filter(o => String(o.estado || "").toUpperCase() === e).length; return { activas: n("ACTIVA"), plan: n("EN_PLANEACION"), pausa: n("PAUSADA"), sinUbic: l.filter(o => abierta(o) && (o.latitud == null || o.longitud == null)).length }; }, [lista]);

  return (
    <Pagina>
      <Encabezado ico={IcoObra} color="#0073ea" titulo="Obras" sub={lista ? `${k.activas} activas` : "Cargando…"}
        accion={<a href="/dashboard/obras/catalogo?web=1&nueva=1" className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-[#0073ea] px-3 py-2.5 text-[14px] font-bold text-white"><Plus className="w-4 h-4" />Nueva</a>} />
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {([["Activas", k.activas, "#0073ea"], ["Planeación", k.plan, "#7e3bdd"], ["Pausadas", k.pausa, "#b85507"], ["Sin ubicación", k.sinUbic, "#d0304a"]] as const).map(([l, n, c]) => (
          <div key={l} className="dom-card rounded-2xl px-2 py-2.5 text-center"><div className="text-[22px] font-bold leading-none" style={{ color: n ? c : "var(--d-faint)" }}>{lista ? n : "–"}</div><div className="mt-1 text-[11px] leading-tight text-[var(--d-muted)]">{l}</div></div>))}
      </div>
      <Buscador valor={q} cambiar={setQ} texto="Buscar obra, cliente o código" />
      <Pestanas valor={tab} cambiar={setTab} opciones={[{ v: "abiertas", l: "En curso" }, { v: "todas", l: "Todas" }]} />
      <div className="mt-3 dom-card rounded-2xl overflow-hidden divide-y divide-[var(--d-border)]">
        {lista === null ? <div className="p-3"><Esqueleto filas={6} alto={56} /></div> : vis.length === 0 ? <p className="p-6 text-center text-[var(--d-muted)]">Sin obras aquí.</p> : vis.map(o => { const e = est(o.estado); return (
          <button key={o.id} type="button" onClick={() => setVer(o)} className="w-full flex items-center gap-3 px-3.5 py-3 text-left active:bg-[var(--d-hover)]">
            <span className="w-1.5 self-stretch rounded-full shrink-0" style={{ background: e.c }} />
            <span className="flex-1 min-w-0"><span className="block text-[15px] font-semibold text-[var(--d-text)] truncate">{o.nombre}</span><span className="block text-[12.5px] text-[var(--d-muted)] truncate">{[e.l, o.cliente].filter(Boolean).join(" · ")}</span></span>
            {o.latitud == null || o.longitud == null ? <span className="shrink-0 rounded-md bg-[#d0304a] px-2 py-1 text-[11px] font-bold text-white">Sin ubicación</span> : <MapPin className="shrink-0 w-4 h-4 text-[var(--d-faint)]" />}
          </button>); })}
      </div>
      <ModoCompleto texto="Alta, edición y geocerca: modo completo" />
      {ver && (
        <Hoja titulo={ver.nombre} onClose={() => setVer(null)}>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-md px-2 py-1 text-[12px] font-bold text-white" style={{ background: est(ver.estado).c }}>{est(ver.estado).l}</span>
            {ver.codigo && <span className="rounded-md bg-[var(--d-card-2)] px-2 py-1 text-[12px] font-semibold text-[var(--d-text-2)]">{ver.codigo}</span>}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2">
            {[["Cliente", ver.cliente], ["Responsable", ver.responsable_email ? (nombres[ver.responsable_email.toLowerCase()] || ver.responsable_email) : null], ["Inicio", fecha(ver.fecha_inicio)], ["Fin", fecha(ver.fecha_fin)], ["Presupuesto", dinero(ver.presupuesto)], ["Geocerca", ver.latitud != null && ver.longitud != null ? `${ver.radio_metros || 150} m` : "Sin ubicación"]].map(([l, v]) => (
              <div key={String(l)} className="rounded-2xl bg-[var(--d-card-2)] px-3 py-2.5 min-w-0"><dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--d-muted)]">{l}</dt><dd className="text-[14px] font-semibold text-[var(--d-text)] truncate">{v || "—"}</dd></div>))}
          </dl>
          {ver.direccion && <p className="mt-3 text-[14px] text-[var(--d-text-2)]">{ver.direccion}</p>}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href={`/dashboard/domenica/obras/${ver.id}`} className="rounded-2xl bg-[#0073ea] py-3 text-center text-[14px] font-bold text-white">Abrir la obra</Link>
            {ver.latitud != null && ver.longitud != null
              ? <a href={`https://www.google.com/maps/search/?api=1&query=${ver.latitud},${ver.longitud}`} target="_blank" rel="noreferrer" className="rounded-2xl bg-[var(--d-card-2)] py-3 text-center text-[14px] font-bold text-[var(--d-text)]">Ver en el mapa</a>
              : <a href="/dashboard/obras/catalogo?web=1" className="rounded-2xl bg-[var(--d-card-2)] py-3 text-center text-[14px] font-bold text-[var(--d-text)]">Poner ubicación</a>}
          </div>
        </Hoja>)}
    </Pagina>
  );
}
