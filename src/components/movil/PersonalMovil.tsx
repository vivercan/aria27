"use client";
/** Personal en el teléfono (Doménica 27 · 11-Oct-2026): buscar, ver ficha y llamar o mandar WhatsApp en un toque. Alta y expediente completo: modo completo. */
import { useEffect, useMemo, useState } from "react";
import { Plus, ChevronRight } from "lucide-react";
import { IcoEquipo } from "@/components/domenica/IconosObra";
import { Hoja } from "@/components/domenica/ui";
import { Esqueleto } from "@/components/domenica/Esqueleto";
import { supabase } from "@/lib/supabase";
import { colorPersona } from "@/lib/actividades";
import { Encabezado, Buscador, Pestanas, Contacto, iniciales, ModoCompleto, Pagina } from "./base";

type E = { id: string; employee_number: string | null; full_name: string; position: string | null; project_site: string | null; email: string | null; status: string | null; whatsapp: string | null; fecha_ingreso: string | null; empresa_id: string | null; centro_trabajo_id: string | null };
const f = (d: string | null) => d ? new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function PersonalMovil() {
  const [lista, setLista] = useState<E[] | null>(null); const [emp, setEmp] = useState<Record<string, string>>({}); const [obras, setObras] = useState<Record<string, string>>({});
  const [q, setQ] = useState(""); const [tab, setTab] = useState<"activos" | "baja">("activos"); const [ver, setVer] = useState<E | null>(null);
  useEffect(() => { (async () => {
    const [{ data: p }, { data: e }, { data: o }] = await Promise.all([
      supabase.from("Personal").select("id, employee_number, full_name, position, project_site, email, status, whatsapp, fecha_ingreso, empresa_id, centro_trabajo_id").order("full_name"),
      supabase.from("empresas").select("id, nombre"), supabase.from("centros_trabajo").select("id, nombre")]);
    setLista((p || []) as E[]); setEmp(Object.fromEntries(((e || []) as { id: string; nombre: string }[]).map(x => [x.id, x.nombre]))); setObras(Object.fromEntries(((o || []) as { id: string; nombre: string }[]).map(x => [x.id, x.nombre])));
  })(); }, []);
  const activo = (e: E) => String(e.status || "ACTIVO").toUpperCase() === "ACTIVO";
  const vis = useMemo(() => { const t = q.trim().toLowerCase(); return (lista || []).filter(e => (tab === "activos") === activo(e) && (!t || `${e.full_name} ${e.position || ""} ${e.employee_number || ""}`.toLowerCase().includes(t))); }, [lista, q, tab]);
  const n = (a: boolean) => (lista || []).filter(e => activo(e) === a).length;
  const obraDe = (e: E) => (e.centro_trabajo_id && obras[e.centro_trabajo_id]) || e.project_site || null;

  return (
    <Pagina>
      <Encabezado ico={IcoEquipo} color="#d83a6b" titulo="Personal" sub={lista ? `${n(true)} trabajando` : "Cargando…"}
        accion={<a href="/dashboard/talento/personal?web=1" className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-[#0073ea] px-3 py-2.5 text-[14px] font-bold text-white"><Plus className="w-4 h-4" />Alta</a>} />
      <Buscador valor={q} cambiar={setQ} texto="Buscar nombre, puesto o número" />
      <Pestanas valor={tab} cambiar={setTab} opciones={[{ v: "activos", l: "Activos", n: n(true) }, { v: "baja", l: "De baja", n: n(false) }]} />
      <div className="mt-3 dom-card rounded-2xl overflow-hidden divide-y divide-[var(--d-border)]">
        {lista === null ? <div className="p-3"><Esqueleto filas={6} alto={56} /></div> : vis.length === 0 ? <p className="p-6 text-center text-[var(--d-muted)]">Nadie aquí.</p> : vis.map(e => (
          <div key={e.id} role="button" tabIndex={0} onClick={() => setVer(e)} className="flex items-center gap-3 px-3.5 py-3 active:bg-[var(--d-hover)]">
            <span className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-[15px]" style={{ background: colorPersona(e.full_name) }}>{iniciales(e.full_name)}</span>
            <span className="flex-1 min-w-0"><span className="block text-[15px] font-semibold text-[var(--d-text)] truncate">{e.full_name}</span><span className="block text-[12.5px] text-[var(--d-muted)] truncate">{[e.position, obraDe(e)].filter(Boolean).join(" · ") || "Sin puesto"}</span></span>
            {e.whatsapp ? <Contacto tel={e.whatsapp} /> : <ChevronRight className="w-4 h-4 text-[var(--d-faint)]" />}
          </div>))}
      </div>
      <ModoCompleto texto="Alta, expediente y nómina: modo completo" />
      {ver && (
        <Hoja titulo={ver.full_name} onClose={() => setVer(null)}>
          <div className="flex items-center gap-3"><span className="shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-[18px]" style={{ background: colorPersona(ver.full_name) }}>{iniciales(ver.full_name)}</span>
            <div className="flex-1 min-w-0"><div className="text-[15px] font-semibold text-[var(--d-text)]">{ver.position || "Sin puesto"}</div><div className="text-[12.5px] text-[var(--d-muted)]">{ver.employee_number || ""}</div></div><Contacto tel={ver.whatsapp} /></div>
          <dl className="mt-4 grid grid-cols-2 gap-2">
            {[["Obra", obraDe(ver)], ["Empresa", ver.empresa_id ? emp[ver.empresa_id] : null], ["Ingreso", f(ver.fecha_ingreso)], ["Estado", activo(ver) ? "Activo" : "De baja"], ["Correo", ver.email], ["WhatsApp", ver.whatsapp]].map(([k, v]) => (
              <div key={String(k)} className="rounded-2xl bg-[var(--d-card-2)] px-3 py-2.5 min-w-0"><dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--d-muted)]">{k}</dt><dd className="text-[14px] font-semibold text-[var(--d-text)] truncate">{v || "—"}</dd></div>))}
          </dl>
          <a href={`/dashboard/talento/personal?web=1`} className="mt-4 block text-center text-[13px] font-semibold text-[var(--d-link)]">Editar expediente en modo completo</a>
        </Hoja>)}
    </Pagina>
  );
}
