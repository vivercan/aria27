"use client";
/**
 * /dashboard/domenica/carga — Carga de trabajo por persona (ARIA Doménica · 11-Oct-2026)
 * Quién está saturado y quién tiene espacio, con lo atrasado y lo que vence esta semana.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, ChevronRight, AlertTriangle } from "lucide-react";
import { Esqueleto } from "@/components/domenica/Esqueleto";
import { IcoEquipo } from "@/components/domenica/IconosObra";
import { DomHeader } from "@/components/domenica/ui";
import { supabase } from "@/lib/supabase";
import { columnaDe, diasAtraso, iniciales, colorPersona, type Actividad } from "@/lib/actividades";

type Fila = { id: string; nombre: string; abiertas: number; atrasadas: number; semana: number; atoradas: number; obras: Set<string> };
const nivel = (n: number, atr = 0) => n >= 15 || atr >= 5 ? { t: n >= 15 ? "Saturado" : "Muy atrasado", c: "#c2182b" } : n >= 8 || atr >= 2 ? { t: n >= 8 ? "Cargado" : "Con atrasos", c: "#b45309" } : n === 0 ? { t: "Libre", c: "#64748b" } : { t: "Bien", c: "#1f8500" };

export default function CargaPage() {
  const [acts, setActs] = useState<Actividad[] | null>(null);
  const [emps, setEmps] = useState<{ id: string; full_name: string }[]>([]);
  const [verLibres, setVerLibres] = useState(false);
  useEffect(() => {
    (async () => {
      const [{ data: a }, { data: e }] = await Promise.all([
        supabase.from("tareas_asignadas").select("id, titulo, asignado_id, asignado_nombre, estatus, motivo_bloqueo, fecha_compromiso, obra, avance").neq("estatus", "CANCELADA").limit(3000),
        supabase.from("employees").select("id, full_name").eq("status", "ACTIVO").order("full_name"),
      ]);
      setActs((a || []) as Actividad[]); setEmps((e || []) as { id: string; full_name: string }[]);
    })();
  }, []);

  const filas = useMemo(() => {
    if (!acts) return [];
    const en7 = new Date(); en7.setDate(en7.getDate() + 7); const lim = en7.toISOString().slice(0, 10);
    const m = new Map<string, Fila>();
    for (const e of emps) m.set(e.id, { id: e.id, nombre: e.full_name, abiertas: 0, atrasadas: 0, semana: 0, atoradas: 0, obras: new Set() });
    for (const a of acts) {
      const col = columnaDe(a); if (col === "TERMINADA" || !a.asignado_id) continue;
      const f = m.get(a.asignado_id) || { id: a.asignado_id, nombre: a.asignado_nombre || "Sin nombre", abiertas: 0, atrasadas: 0, semana: 0, atoradas: 0, obras: new Set<string>() };
      f.abiertas++; if (diasAtraso(a) > 0) f.atrasadas++; else if (a.fecha_compromiso && a.fecha_compromiso.slice(0, 10) <= lim) f.semana++;
      if (col === "BLOQUEADA") f.atoradas++; if (a.obra) f.obras.add(a.obra);
      m.set(a.asignado_id, f);
    }
    return [...m.values()].sort((x, y) => y.abiertas - x.abiertas || y.atrasadas - x.atrasadas || x.nombre.localeCompare(y.nombre));
  }, [acts, emps]);
  const max = Math.max(8, ...filas.map(f => f.abiertas));
  const conTrabajo = filas.filter(f => f.abiertas > 0);
  const libres = filas.filter(f => f.abiertas === 0);
  const saturados = filas.filter(f => f.abiertas >= 15 || f.atrasadas >= 5).length;

  return (
    <div className="dom-page h-full overflow-y-auto">
      <div className="px-4 md:px-6 pt-4 pb-28 md:pb-10 max-w-4xl mx-auto">
        <DomHeader icon={IcoEquipo} from="#1f8500" titulo="Carga de trabajo" desc="Quién está saturado y quién tiene espacio. Toca a una persona para ver sus actividades." />
        {acts === null ? <div className="mt-5"><Esqueleto filas={4} alto={110} /></div> : (
          <>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[{ n: conTrabajo.length, l: "Con actividades", c: "var(--c-azul)" }, { n: saturados, l: "Saturados o muy atrasados", c: "var(--c-rojo)" }, { n: libres.length, l: "Sin actividades", c: "var(--d-muted)" }].map((k, i) => (
                <div key={k.l} className="dom-card dom-in rounded-2xl p-3" style={{ animationDelay: `${i * 60}ms` }}><div className="text-[26px] font-bold leading-none" style={{ color: k.c }}>{k.n}</div><div className="mt-1.5 text-[11.5px] text-[var(--d-muted)]">{k.l}</div></div>))}
            </div>
            <div className="mt-5 space-y-2">
              {conTrabajo.map((f, i) => { const nv = nivel(f.abiertas, f.atrasadas); return (
                <Link key={f.id} href={`/dashboard/actividades?vista=lista&persona=${f.id}`} className="dom-card dom-in rounded-2xl p-3.5 flex items-center gap-3 active:scale-[0.99] transition" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
                  <span className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: colorPersona(f.nombre) }}>{iniciales(f.nombre)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><span className="text-[14.5px] font-semibold text-[var(--d-text)] truncate">{f.nombre}</span><span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${nv.c === "#1f8500" ? "sobre-verde" : ""}`} style={{ background: nv.c }}>{nv.t}</span></div>
                    <div className="mt-1.5 h-2.5 rounded-full bg-[var(--d-card-2)] overflow-hidden flex">
                      <div style={{ width: `${(f.atrasadas / max) * 100}%`, background: "#d0304a" }} />
                      <div style={{ width: `${(f.semana / max) * 100}%`, background: "#fdab3d" }} />
                      <div style={{ width: `${((f.abiertas - f.atrasadas - f.semana) / max) * 100}%`, background: "#579bfc" }} />
                    </div>
                    <div className="mt-1 text-[11.5px] text-[var(--d-muted)] flex flex-wrap gap-x-3">
                      <span><b className="text-[var(--d-text)]">{f.abiertas}</b> abiertas</span>
                      {f.atrasadas > 0 && <span className="text-[var(--d-danger)]">{f.atrasadas} atrasadas</span>}
                      {f.semana > 0 && <span className="text-[var(--d-warn)]">{f.semana} vencen esta semana</span>}
                      {f.atoradas > 0 && <span className="inline-flex items-center gap-0.5 text-[var(--d-danger)]"><AlertTriangle className="w-3 h-3" />{f.atoradas} atoradas</span>}
                      {f.obras.size > 0 && <span>{f.obras.size} obra{f.obras.size === 1 ? "" : "s"}</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--d-faint)]" />
                </Link>); })}
              {conTrabajo.length === 0 && <div className="rounded-2xl border border-dashed border-[var(--d-border)] p-8 text-center text-sm text-[var(--d-muted)]">Nadie tiene actividades abiertas.</div>}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[var(--d-muted)]"><span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full bg-[#d0304a]" />Atrasadas</span><span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full bg-[#fdab3d]" />Vencen en 7 días</span><span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full bg-[#579bfc]" />Más adelante</span></div>
            {libres.length > 0 && <div className="mt-6">
              <button onClick={() => setVerLibres(v => !v)} className="text-sm font-semibold text-[var(--d-link)]">{verLibres ? "Ocultar" : "Ver"} {libres.length} persona{libres.length === 1 ? "" : "s"} sin actividades</button>
              {verLibres && <div className="mt-2 flex flex-wrap gap-1.5">{libres.map(f => <span key={f.id} className="rounded-full bg-[var(--d-card)] border border-[var(--d-border)] px-2.5 py-1 text-[12px] text-[var(--d-text-2)]">{f.nombre}</span>)}</div>}
            </div>}
          </>
        )}
      </div>
    </div>
  );
}
