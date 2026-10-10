"use client";
/**
 * /dashboard/campo — ARIA27 Campo F4 · Inicio móvil
 * Saludo, "Tienes N pendientes", 6 accesos grandes, barra inferior, banner "Agregar a pantalla de inicio".
 * Reutiliza las pantallas existentes; no duplica flujos.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusCircle, FileText, Inbox, ClipboardList, CalendarDays, Camera, Share, Loader2, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { accionPara, statusLabel } from "@/lib/requi-stepper";
import CampoNav from "@/components/campo/CampoNav";

type R = { id: string; folio: string; cost_center_name: string; status: string; purchase_status?: string | null; user_email?: string; responsable_email?: string | null; tipo_solicitud?: string | null; created_at: string; required_date?: string | null; proveedor?: string | null };

export default function CampoHome() {
  const router = useRouter();
  const [me, setMe] = useState<{ email: string; role: string; name: string } | null>(null);
  const [reqs, setReqs] = useState<R[]>([]); const [tareas, setTareas] = useState<number>(0);
  const [loading, setLoading] = useState(true); const [isIos, setIsIos] = useState(false); const [standalone, setStandalone] = useState(true);
  const [saludo, setSaludo] = useState("Hola");

  useEffect(() => {
    const ua = navigator.userAgent; setIsIos(/iPhone|iPad|iPod/i.test(ua));
    const h = new Date().getHours(); setSaludo(h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches");
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
    try { localStorage.setItem("aria:modo", "campo"); } catch {}
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        if (r.status === 401) { router.replace("/"); return; }
        const u = await r.json(); if (!alive) return;
        const email = String(u.email || "").toLowerCase(); const role = String(u.role || "").toLowerCase();
        setMe({ email, role, name: u.display_name || u.name || email });
        let q = supabase.from("Requisiciones").select("id, folio, cost_center_name, status, purchase_status, user_email, responsable_email, tipo_solicitud, created_at, required_date, proveedor").order("created_at", { ascending: false }).limit(400);
        if (!["admin", "compras", "rh", "direccion"].includes(role)) q = q.or(`user_email.eq.${email},responsable_email.eq.${email}`);
        const { data } = await q; if (!alive) return; setReqs((data || []) as R[]);
        const { count } = await supabase.from("tareas_obra").select("*", { count: "exact", head: true }).neq("status", "COMPLETADA").or(`asignado_a.eq.${email},responsable.eq.${email},created_by.eq.${email}`);
        if (alive) setTareas(count || 0);
      } catch { /* best effort */ } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [router]);

  const pendientes = useMemo(() => me ? reqs.filter(r => accionPara(r, me.role, me.email) !== null && accionPara(r, me.role, me.email) !== "REGISTRAR_ENTREGA") : [], [reqs, me]);
  const porEntregar = useMemo(() => me ? reqs.filter(r => accionPara(r, me.role, me.email) === "REGISTRAR_ENTREGA").slice(0, 50) : [], [reqs, me]);
  const n = pendientes.length + tareas;
  const enCurso = useMemo(() => me ? reqs.filter(r => (r.user_email || "").toLowerCase() === me.email && !["ENTREGADA", "CANCELADA", "RECHAZADA_RESPONSABLE", "RECHAZADA_DIRECCION"].includes(r.status)).length : 0, [reqs, me]);

  const tiles = [
    { href: "/dashboard/requisiciones/requisiciones/nuevo", icon: PlusCircle, t: "Nueva solicitud", d: "Materiales, destajo o actividad", accent: true },
    { href: "/dashboard/requisiciones/requisiciones/estatus", icon: FileText, t: "Mis solicitudes", d: `${reqs.length} en total` },
    { href: "/dashboard/requisiciones/requisiciones/estatus?chip=mis_pendientes", icon: Inbox, t: "Mis pendientes", d: `${pendientes.length} por atender` },
    { href: "/dashboard/obras/tareas", icon: ClipboardList, t: "Actividades", d: `${tareas} abiertas` },
    { href: "/dashboard/campo/calendario", icon: CalendarDays, t: "Calendario", d: "Entregas y actividades" },
    { href: "/dashboard/campo/evidencia", icon: Camera, t: "Evidencia", d: `${porEntregar.length} por entregar` },
  ];

  return (
    <div className="aria-page-canon pb-24 max-w-2xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[#7f93b0] text-sm">{saludo}{me ? "," : ""}</p><h1 className="text-2xl font-bold text-white leading-tight">{me?.name || "…"}</h1></div>
        {loading ? <Loader2 className="w-5 h-5 animate-spin text-aria-accent mt-2" /> : null}
      </div>

      <Link href="/dashboard/requisiciones/requisiciones/estatus?chip=mis_pendientes" className={`mt-4 block rounded-2xl border p-4 ${n > 0 ? "border-amber-400/40 bg-amber-500/10" : "border-emerald-500/30 bg-emerald-500/[0.06]"}`}>
        <div className="flex items-center justify-between"><div><div className={`text-3xl font-bold ${n > 0 ? "text-amber-300" : "text-emerald-300"}`}>{loading ? "–" : n}</div><div className="text-sm text-white">{n === 1 ? "pendiente te espera" : n === 0 ? "nada pendiente de tu parte" : "pendientes te esperan"}</div>
          {!loading && n > 0 && <div className="text-[11px] text-[#c9d8ed] mt-1">{pendientes.length} solicitud{pendientes.length === 1 ? "" : "es"} · {tareas} actividad{tareas === 1 ? "" : "es"}</div>}
          {!loading && n === 0 && <div className="text-[11px] text-[#c9d8ed] mt-1">{enCurso} solicitud{enCurso === 1 ? "" : "es"} tuya{enCurso === 1 ? "" : "s"} en curso</div>}</div><ChevronRight className="w-5 h-5 text-[#7f93b0]" /></div>
      </Link>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {tiles.map(({ href, icon: Icon, t, d, accent }) => (
          <Link key={href} href={href} className={`rounded-2xl border p-4 min-h-[112px] flex flex-col justify-between active:scale-[0.98] transition ${accent ? "border-aria-accent/50 bg-aria-accent/15" : "border-white/[0.10] bg-white/[0.04]"}`}>
            <Icon className={`w-7 h-7 ${accent ? "text-white" : "text-aria-accent"}`} /><div><div className="text-sm font-semibold text-white">{t}</div><div className="text-[11px] text-[#7f93b0]">{d}</div></div>
          </Link>
        ))}
      </div>

      {pendientes.length > 0 && (
        <section className="mt-5"><h2 className="text-xs font-semibold tracking-wider text-[#7f93b0] uppercase mb-2">Lo que te toca ahora</h2>
          <ul className="space-y-2">{pendientes.slice(0, 5).map(r => { const a = accionPara(r, me!.role, me!.email); const label = a === "AUTORIZAR_RESPONSABLE" ? "Autorizar" : a === "COTIZAR" ? "Cotizar" : a === "APROBAR_DIRECCION" ? "Aprobar" : a === "PAGAR" ? "Pagar" : "Ver";
            return (<li key={r.id}><Link href={`/dashboard/requisiciones/requisiciones/estatus?open=${r.id}`} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"><div className="flex-1 min-w-0"><div className="text-sm text-white font-medium">{r.folio} <span className="text-[#7f93b0] font-normal">· {r.cost_center_name}</span></div><div className="text-[11px] text-[#7f93b0] truncate">{statusLabel(r.status)}{r.proveedor ? ` · ${r.proveedor}` : ""}</div></div><span className="shrink-0 rounded-full bg-amber-400 text-slate-900 text-xs font-bold px-3 py-1">{label}</span></Link></li>); })}</ul>
        </section>
      )}

      {!standalone && (
        <div className="mt-6 rounded-2xl border border-white/[0.10] bg-white/[0.03] p-4 text-sm text-[#c9d8ed]">
          <div className="flex items-center gap-2 font-semibold text-white mb-1"><Share className="w-4 h-4 text-aria-accent" />Agrega ARIA27 a tu pantalla de inicio</div>
          {isIos ? <p>En Safari toca <span className="text-white">Compartir</span> (el cuadrito con flecha) y luego <span className="text-white">Agregar a pantalla de inicio</span>.</p> : <p>En Chrome toca el menú <span className="text-white">⋮</span> y luego <span className="text-white">Instalar app</span> o <span className="text-white">Agregar a pantalla principal</span>.</p>}
        </div>
      )}
      <CampoNav />
    </div>
  );
}
