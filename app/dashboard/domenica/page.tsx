"use client";
/**
 * /dashboard/domenica — ARIA Doménica (10-Oct-2026)
 * "Lo que Monday promete, conectado a tus obras, requis y personal". Hub de las 10 herramientas.
 * Nombre provisional: cambiar NOMBRE_MODULO.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { columnaDe, diasAtraso, type Actividad } from "@/lib/actividades";
import { Contador } from "@/components/domenica/ui";
import { Sun, Zap, GanttChart, LayoutGrid, Link2, Building2, LayoutTemplate, Repeat, AtSign, Users, FileInput, BarChart3, ChevronRight } from "lucide-react";

const NOMBRE_MODULO = "ARIA Doménica";

type Pieza = { t: string; d: string; href?: string; icon: typeof Sun; color: string; estado: "listo" | "parcial" | "pronto" };
const GRUPOS: { titulo: string; piezas: Pieza[] }[] = [
  { titulo: "Planear", piezas: [
    { t: "Línea de tiempo", d: "Barras por obra, con lo que espera a qué", href: "/dashboard/actividades?vista=linea", icon: GanttChart, color: "#a25ddc", estado: "listo" },
    { t: "Dependencias", d: "Colado antes de curado; avisa “ya puedes empezar”", href: "/dashboard/actividades", icon: Link2, color: "#a25ddc", estado: "listo" },
    { t: "Plantillas", d: "Arranque de obra en un clic", href: "/dashboard/domenica/plantillas", icon: LayoutTemplate, color: "#a25ddc", estado: "listo" },
    { t: "Recurrentes", d: "Cada lunes, cada día 1", href: "/dashboard/domenica/recurrentes", icon: Repeat, color: "#a25ddc", estado: "listo" },
  ] },
  { titulo: "Coordinar", piezas: [
    { t: "Tablero de actividades", d: "Mi trabajo · Tablero · Lista", href: "/dashboard/actividades", icon: LayoutGrid, color: "#00c875", estado: "listo" },
    { t: "Espacio por obra", d: "Todo de una obra junto", href: "/dashboard/domenica/obras", icon: Building2, color: "#00c875", estado: "listo" },
    { t: "Menciones", d: "Escribe @Daisy en un comentario y le avisa", href: "/dashboard/actividades", icon: AtSign, color: "#00c875", estado: "listo" },
    { t: "Carga de trabajo", d: "Quién está saturado", href: "/dashboard/domenica/carga", icon: Users, color: "#00c875", estado: "listo" },
    { t: "Formularios públicos", d: "Proveedor sin usuario", icon: FileInput, color: "#00c875", estado: "pronto" },
  ] },
  { titulo: "Controlar", piezas: [
    { t: "Automatizaciones", d: "Si pasa esto, haz aquello", href: "/dashboard/domenica/automatizaciones", icon: Zap, color: "#fdab3d", estado: "listo" },
    { t: "Tablero por obra", d: "Avance y gasto contra presupuesto", href: "/dashboard/domenica/obras", icon: BarChart3, color: "#fdab3d", estado: "listo" },
  ] },
];

export default function DomenicaHub() {
  const [k, setK] = useState({ abiertas: 0, atrasadas: 0, autos: 0, obras: 0 });
  useEffect(() => {
    (async () => {
      const [{ data: a }, { count: obras }, auto] = await Promise.all([
        supabase.from("tareas_asignadas").select("id, estatus, motivo_bloqueo, fecha_compromiso").neq("estatus", "CANCELADA"),
        supabase.from("centros_trabajo").select("id", { count: "exact", head: true }).eq("activo", true),
        fetch("/api/automatizaciones", { credentials: "include" }).then(r => r.ok ? r.json() : { reglas: [] }).catch(() => ({ reglas: [] })),
      ]);
      const acts = (a || []) as Actividad[];
      setK({ abiertas: acts.filter(x => columnaDe(x) !== "TERMINADA").length, atrasadas: acts.filter(x => diasAtraso(x) > 0).length, autos: ((auto.reglas || []) as { activa: boolean }[]).filter(r => r.activa).length, obras: obras || 0 });
    })();
  }, []);
  return (
    <div className="dom-page h-full overflow-y-auto">
      <div className="px-4 md:px-6 pt-4 pb-28 md:pb-10 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <span className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ffcb00] to-[#ff642e] flex items-center justify-center shadow-[0_8px_24px_rgba(255,100,46,0.35)]"><Sun className="w-7 h-7 text-white" /></span>
          <div><h1 className="text-[26px] font-bold text-[var(--d-text)] tracking-tight leading-tight">{NOMBRE_MODULO}</h1><p className="text-[13px] text-[var(--d-muted)]">Lo que Monday promete, conectado a tus obras, requisiciones y personal.</p></div>
        </div>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-2">
          {[["Actividades abiertas", k.abiertas, "#579bfc", "/dashboard/actividades"], ["Atrasadas", k.atrasadas, "#e2445c", "/dashboard/actividades?vista=mi"], ["Obras activas", k.obras, "#00c875", "/dashboard/domenica/obras"], ["Automatizaciones activas", k.autos, "#fdab3d", "/dashboard/domenica/automatizaciones"]].map(([l, n, c, h]) => (
            <Link key={String(l)} href={String(h)} className="dom-card dom-in rounded-2xl p-3"><div className="text-[11px] text-[var(--d-muted)]">{l}</div><div className="text-2xl font-bold" style={{ color: Number(n) > 0 ? String(c) : "var(--d-faint)" }}><Contador n={Number(n)} /></div></Link>))}
        </div>
        {GRUPOS.map(g => (
          <section key={g.titulo} className="mt-6">
            <h2 className="text-[13px] font-bold text-[var(--d-muted)] mb-2">{g.titulo}</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {g.piezas.map(p => { const Icon = p.icon; const inner = (
                <div className={`dom-card dom-in h-full rounded-2xl p-4 flex items-start gap-3 transition ${p.href ? "hover:-translate-y-0.5" : "opacity-70"}`}>
                  <span className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${p.color}22` }}><Icon className="w-5 h-5" style={{ color: p.color }} /></span>
                  <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className={`text-[14px] font-semibold ${p.href ? "text-[var(--d-text)]" : "text-[var(--d-muted)]"}`}>{p.t}</span>
                    <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${p.estado === "listo" ? "bg-[#00c875]/15 text-[var(--d-ok)]" : p.estado === "parcial" ? "bg-[#579bfc]/20 text-[var(--d-link)]" : "bg-[var(--d-card-2)] text-[var(--d-muted)]"}`}>{p.estado === "listo" ? "Listo" : p.estado === "parcial" ? "Disponible" : "En construcción"}</span></div>
                    <div className="text-[12px] text-[var(--d-muted)]">{p.d}</div></div>
                  {p.href && <ChevronRight className="w-4 h-4 text-[var(--d-faint)] mt-1" />}
                </div>);
                return p.href ? <Link key={p.t} href={p.href}>{inner}</Link> : <div key={p.t}>{inner}</div>; })}
            </div>
          </section>))}
      </div>
    </div>
  );
}
