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
import PanelPorRevisar from "@/components/domenica/PorRevisar";
import { Ficha, IcoOrganizar } from "@/components/domenica/IconosObra";
import { BookOpen, ShieldCheck, Map as MapIcon, Mic, Sun, Zap, GanttChart, LayoutGrid, Link2, Building2, LayoutTemplate, Repeat, AtSign, Users, FileInput, BarChart3, ChevronRight } from "lucide-react";

const NOMBRE_MODULO = "ARIA Doménica";

type Pieza = { t: string; d: string; href?: string; icon: typeof Sun; color: string; estado: "listo" | "parcial" | "pronto" };
const GRUPOS: { titulo: string; piezas: Pieza[] }[] = [
  { titulo: "Planear", piezas: [
    { t: "Línea de tiempo", d: "Cada tarea como una barra en el calendario; en rojo lo que, si se atrasa, atrasa toda la obra", href: "/dashboard/actividades?vista=linea", icon: GanttChart, color: "#a25ddc", estado: "listo" },
    { t: "Qué va primero", d: "Una tarea espera a que termine otra; si una se atrasa, las siguientes se recorren solas", href: "/dashboard/actividades", icon: Link2, color: "#a25ddc", estado: "listo" },
    { t: "Listas de pasos", d: "Ej. arranque de obra: crea todas las tareas de un jalón", href: "/dashboard/domenica/plantillas", icon: LayoutTemplate, color: "#a25ddc", estado: "listo" },
    { t: "Lo que se repite", d: "Tareas que se crean solas: cada lunes, cada día 1", href: "/dashboard/domenica/recurrentes", icon: Repeat, color: "#a25ddc", estado: "listo" },
  ] },
  { titulo: "Coordinar", piezas: [
    { t: "Actividades", d: "Lo mío, por estado o en lista", href: "/dashboard/actividades", icon: LayoutGrid, color: "#00873f", estado: "listo" },
    { t: "Espacio por obra", d: "Actividades, solicitudes, entregas y avance de cada obra", href: "/dashboard/domenica/obras", icon: Building2, color: "#00873f", estado: "listo" },
    { t: "Menciones", d: "Escribe @Daisy en un comentario y le avisa", href: "/dashboard/actividades", icon: AtSign, color: "#00873f", estado: "listo" },
    { t: "Quién está muy cargado", d: "Antes de encargar, ve quién tiene menos trabajo", href: "/dashboard/domenica/carga", icon: Users, color: "#00873f", estado: "listo" },
    { t: "¿Quién está usando Doménica?", d: "Quién no entra y quién tiene cosas atoradas", href: "/dashboard/domenica/uso", icon: BarChart3, color: "#7e3bdd", estado: "listo" },
    { t: "Enlaces para proveedores", d: "Sin cuenta: el proveedor cotiza y el destajista sube fotos de avance", href: "/dashboard/requisiciones/requisiciones/estatus", icon: FileInput, color: "#00873f", estado: "listo" },
  ] },
  { titulo: "En la obra", piezas: [
    { t: "Bitácora diaria", d: "Se arma sola con avances, fotos y entregas; se comparte en PDF", href: "/dashboard/domenica/obras", icon: BookOpen, color: "#0077ad", estado: "listo" },
    { t: "Revisiones con firma", d: "Calidad y seguridad punto por punto, con foto y firma", href: "/dashboard/domenica/revisiones", icon: ShieldCheck, color: "#0077ad", estado: "listo" },
    { t: "Planos con marcas", d: "Pendientes, notas y fotos encima del plano", href: "/dashboard/domenica/planos", icon: MapIcon, color: "#0077ad", estado: "listo" },
    { t: "Dictar por voz", d: "Botón + Nuevo del celular: dilo y se arma la tarea o el pedido", icon: Mic, color: "#0077ad", estado: "listo" },
  ] },
  { titulo: "Controlar", piezas: [
    { t: "Avisos automáticos", d: "Si pasa esto, avisa o haz aquello", href: "/dashboard/domenica/automatizaciones", icon: Zap, color: "#fdab3d", estado: "listo" },
    { t: "Tablero por obra", d: "Avance contra presupuesto, gasto, atrasos y solicitudes detenidas", href: "/dashboard/domenica/obras", icon: BarChart3, color: "#fdab3d", estado: "listo" },
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
  const [miCorreo, setMiCorreo] = useState("");
  useEffect(() => { const leer = () => { try { setMiCorreo(localStorage.getItem("userEmail") || ""); } catch { /* */ } }; leer(); window.addEventListener("aria:perms", leer); return () => window.removeEventListener("aria:perms", leer); }, []);
  return (
    <div className="dom-page h-full overflow-y-auto">
      <div className="px-4 md:px-6 pt-4 pb-28 md:pb-10 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <Ficha ico={IcoOrganizar} color="#7e3bdd" size="md" />
          <div><h1 className="text-[26px] font-bold text-[var(--d-text)] tracking-tight leading-tight">{NOMBRE_MODULO}</h1><p className="text-[13px] text-[var(--d-muted)]">Planea, organiza y sigue el trabajo de todas las obras.</p></div>
        </div>
        {miCorreo && <PanelPorRevisar email={miCorreo} />}
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-2">
          {[["Actividades abiertas", k.abiertas, "var(--c-azul)", "/dashboard/actividades"], ["Atrasadas", k.atrasadas, "var(--c-rojo)", "/dashboard/actividades?vista=mi"], ["Obras activas", k.obras, "var(--c-verde)", "/dashboard/domenica/obras"], ["Avisos automáticos", k.autos, "var(--c-ambar)", "/dashboard/domenica/automatizaciones"]].map(([l, n, c, h]) => (
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
                    {(p.estado as string) !== "listo" && <span className={`text-[11px] font-bold rounded px-1.5 py-0.5 ${(p.estado as string) === "listo" ? "bg-[#00873f]/15 text-[var(--d-ok)]" : p.estado === "parcial" ? "bg-[#579bfc]/20 text-[var(--d-link)]" : "bg-[var(--d-card-2)] text-[var(--d-muted)]"} sobre-verde`}>{(p.estado as string) === "listo" ? "Listo" : p.estado === "parcial" ? "Disponible" : "En construcción"}</span>}</div>
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
