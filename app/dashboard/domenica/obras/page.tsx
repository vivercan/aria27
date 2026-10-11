"use client";
/**
 * /dashboard/domenica/obras — Espacio por obra (ARIA Doménica · 11-Oct-2026)
 * Cada obra con su semáforo: actividades, atrasos, avance y gasto contra presupuesto.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, ChevronRight, Search } from "lucide-react";
import { Esqueleto } from "@/components/domenica/Esqueleto";
import { IcoObra } from "@/components/domenica/IconosObra";
import { DomHeader } from "@/components/domenica/ui";
import { supabase } from "@/lib/supabase";
import type { Actividad } from "@/lib/actividades";
import { fmtMoney } from "@/lib/formatters";
import { numerosObra, semaforoObra, type ObraDom, type RequiDom } from "@/lib/obras-dom";

export default function ObrasDomPage() {
  const [datos, setDatos] = useState<{ obras: ObraDom[]; acts: Actividad[]; requis: RequiDom[] } | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    (async () => {
      const [{ data: o }, { data: a }, { data: r }] = await Promise.all([
        supabase.from("centros_trabajo").select("id, nombre, cliente, presupuesto, presupuesto_contratado, presupuesto_ampliaciones, fecha_inicio, fecha_fin, responsable_email, estado").eq("activo", true).order("nombre"),
        supabase.from("tareas_asignadas").select("id, titulo, obra, obra_id, estatus, motivo_bloqueo, fecha_compromiso, avance").neq("estatus", "CANCELADA").limit(3000),
        supabase.from("Requisiciones").select("id, folio, cost_center_name, status, total, monto, created_at").limit(5000),
      ]);
      setDatos({ obras: (o || []) as ObraDom[], acts: (a || []) as Actividad[], requis: (r || []) as RequiDom[] });
    })();
  }, []);
  const filas = useMemo(() => {
    if (!datos) return [];
    const n = q.trim().toLowerCase();
    return datos.obras.filter(o => !n || o.nombre.toLowerCase().includes(n) || String(o.cliente || "").toLowerCase().includes(n))
      .map(o => ({ o, x: numerosObra(o, datos.acts, datos.requis) }))
      .sort((a, b) => b.x.abiertas.length - a.x.abiertas.length || b.x.gastado - a.x.gastado);
  }, [datos, q]);

  return (
    <div className="dom-page h-full overflow-y-auto">
      <div className="px-4 md:px-6 pt-4 pb-28 md:pb-10 max-w-5xl mx-auto">
        <DomHeader icon={IcoObra} from="#ff642e" titulo="Obras" desc="Todo de cada obra en un lugar: actividades, atrasos, avance y lo gastado contra el presupuesto." />
        <div className="mt-4 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--d-muted)]" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar obra o cliente…" className="w-full rounded-xl border border-[var(--d-border)] bg-[var(--d-field)] pl-9 pr-3 py-2.5 text-sm text-[var(--d-text)]" /></div>
        {!datos ? <div className="mt-5"><Esqueleto filas={4} alto={110} /></div> : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {filas.map(({ o, x }, i) => { const s = semaforoObra(x); return (
              <Link key={o.id} href={`/dashboard/domenica/obras/${o.id}`} className="dom-card dom-in rounded-2xl p-4 block active:scale-[0.99] transition" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 shrink-0 w-2.5 h-2.5 rounded-full" style={{ background: s.c, boxShadow: `0 0 0 4px ${s.c}22` }} />
                  <div className="flex-1 min-w-0"><div className="text-[15.5px] font-bold text-[var(--d-text)] truncate">{o.nombre}</div><div className="text-[12px] text-[var(--d-muted)] truncate">{o.cliente || "Sin cliente"} · {s.t}</div></div>
                  <ChevronRight className="w-4 h-4 mt-1 text-[var(--d-faint)]" />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div><div className="text-lg font-bold text-[var(--d-text)]">{x.abiertas.length}</div><div className="text-[10.5px] text-[var(--d-muted)]">abiertas</div></div>
                  <div><div className="text-lg font-bold" style={{ color: x.atrasadas ? "var(--c-rojo)" : "var(--d-faint)" }}>{x.atrasadas}</div><div className="text-[10.5px] text-[var(--d-muted)]">atrasadas</div></div>
                  <div><div className="text-lg font-bold text-[var(--d-text)]">{x.avance}%</div><div className="text-[10.5px] text-[var(--d-muted)]">avance</div></div>
                </div>
                {x.detenidas.length > 0 && <div className="mt-2 rounded-lg bg-[#fdab3d]/10 px-2.5 py-1.5 text-[12px] font-semibold text-[var(--d-warn)]">⏸ {x.detenidas.length} solicitud{x.detenidas.length === 1 ? "" : "es"} detenida{x.detenidas.length === 1 ? "" : "s"} (+3 días sin autorizar)</div>}
                <div className="mt-3">
                  <div className="flex justify-between text-[11.5px]"><span className="text-[var(--d-muted)]">Gastado {fmtMoney(x.gastado)}</span><span className="text-[var(--d-text-2)] font-semibold">{x.presupuesto ? `${x.pctGasto}% de ${fmtMoney(x.presupuesto)}` : "Sin presupuesto"}</span></div>
                  <div className="mt-1 h-2 rounded-full bg-[var(--d-card-2)] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(100, x.pctGasto ?? 0)}%`, background: (x.pctGasto ?? 0) > 100 ? "#e2445c" : (x.pctGasto ?? 0) > 85 ? "#fdab3d" : "#00c875" }} /></div>
                </div>
              </Link>); })}
            {filas.length === 0 && <div className="md:col-span-2 rounded-2xl border border-dashed border-[var(--d-border)] p-8 text-center text-sm text-[var(--d-muted)]">No hay obras con ese nombre.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
