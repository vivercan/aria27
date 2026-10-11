"use client";
/**
 * /dashboard/campo — Inicio en celular (rediseño 10-Oct-2026, estilo Monday "Mi trabajo")
 * 1) Saludo  2) 3 numeros que importan  3) 4 acciones grandes  4) "Lo que te toca" (solicitudes + actividades en una sola lista)
 * Todo con un toque. Sin menus escondidos.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusCircle, ClipboardCheck, PackageCheck, CalendarDays, FileText, ChevronRight, Loader2, X, Share, ListTodo, BellRing } from "lucide-react";
import { estadoPush, activarPush } from "@/lib/push-client";
import { supabase } from "@/lib/supabase";
import { accionPara, statusLabel } from "@/lib/requi-stepper";
import { columnaDe, diasAtraso, venceHoy, esMia, fechaCorta, iniciales, colorPersona, type Actividad } from "@/lib/actividades";

type R = { id: string; folio: string; cost_center_name: string; status: string; purchase_status?: string | null; user_email?: string; responsable_email?: string | null; tipo_solicitud?: string | null; created_at: string; required_date?: string | null; proveedor?: string | null };
type Item = { key: string; href: string; titulo: string; sub: string; boton: string; color: string; icon: "req" | "act"; urg: number };

export default function CampoHome() {
  const router = useRouter();
  const [me, setMe] = useState<{ email: string; role: string; name: string } | null>(null);
  const [reqs, setReqs] = useState<R[]>([]);
  const [acts, setActs] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [saludo, setSaludo] = useState("Hola"); const [hoyTxt, setHoyTxt] = useState("");
  const [isIos, setIsIos] = useState(false); const [verInstalar, setVerInstalar] = useState(false);
  const [push, setPush] = useState<string>(""); const [pushBusy, setPushBusy] = useState(false); const [pushMsg, setPushMsg] = useState("");
  useEffect(() => { estadoPush().then(setPush).catch(() => setPush("no-soportado")); }, []);
  const onActivarPush = async () => { setPushBusy(true); setPushMsg(""); const r = await activarPush(); setPushBusy(false); if (r.ok) { setPush("activo"); setPushMsg("¡Listo! Te mandamos una notificación de prueba."); } else setPushMsg(r.error || "No se pudo activar"); };

  useEffect(() => {
    const ua = navigator.userAgent; setIsIos(/iPhone|iPad|iPod/i.test(ua));
    const d = new Date(); const h = d.getHours();
    setSaludo(h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches");
    setHoyTxt(d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }));
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    let oculto = false; try { oculto = localStorage.getItem("aria:instalar-oculto") === "1"; localStorage.setItem("aria:modo", "campo"); } catch {}
    setVerInstalar(!standalone && !oculto);
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
        const [{ data: rq }, { data: emp }] = await Promise.all([q, supabase.from("employees").select("id").or(`usuario_email.eq.${email},email.eq.${email}`).limit(1).maybeSingle()]);
        const empId = (emp as { id?: string } | null)?.id || null;
        let aq = supabase.from("tareas_asignadas").select("*").not("estatus", "in", "(COMPLETADA,CANCELADA)");
        aq = empId ? aq.or(`asignado_email.eq.${email},asignado_id.eq.${empId}`) : aq.eq("asignado_email", email);
        const { data: ac } = await aq;
        if (!alive) return;
        setReqs((rq || []) as R[]); setActs(((ac || []) as Actividad[]).filter(a => esMia(a, email, empId)));
      } catch { /* best effort */ } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [router]);

  const pendReq = useMemo(() => me ? reqs.filter(r => { const a = accionPara(r, me.role, me.email); return a !== null && a !== "REGISTRAR_ENTREGA"; }) : [], [reqs, me]);
  const porEntregar = useMemo(() => me ? reqs.filter(r => accionPara(r, me.role, me.email) === "REGISTRAR_ENTREGA") : [], [reqs, me]);
  const atrasadas = useMemo(() => acts.filter(a => diasAtraso(a) > 0), [acts]);
  const enCurso = useMemo(() => me ? reqs.filter(r => (r.user_email || "").toLowerCase() === me.email && !["ENTREGADA", "CANCELADA", "RECHAZADA_RESPONSABLE", "RECHAZADA_DIRECCION"].includes(r.status)).length : 0, [reqs, me]);

  const items: Item[] = useMemo(() => {
    if (!me) return [];
    const out: Item[] = [];
    for (const r of pendReq) {
      const a = accionPara(r, me.role, me.email);
      const boton = a === "AUTORIZAR_RESPONSABLE" ? "Autorizar" : a === "COTIZAR" ? "Cotizar" : a === "APROBAR_DIRECCION" ? "Aprobar" : a === "PAGAR" ? "Pagar" : "Ver";
      out.push({ key: "r" + r.id, href: `/dashboard/requisiciones/requisiciones/estatus?open=${r.id}`, titulo: `${r.folio} · ${r.cost_center_name || ""}`, sub: statusLabel(r.status) + (r.proveedor ? ` · ${r.proveedor}` : ""), boton, color: "#fdab3d", icon: "req", urg: 2 });
    }
    for (const a of acts) {
      const d = diasAtraso(a); const h = venceHoy(a); const col = columnaDe(a);
      out.push({ key: "a" + a.id, href: `/dashboard/actividades?abrir=${a.id}`, titulo: a.titulo, sub: `${a.obra || "Oficina"} · ${d > 0 ? `${d} día${d === 1 ? "" : "s"} tarde` : h ? "vence hoy" : a.fecha_compromiso ? `entrega ${fechaCorta(a.fecha_compromiso)}` : "sin fecha"} · ${Number(a.avance) || 0}%`, boton: col === "BLOQUEADA" ? "Atorada" : "Abrir", color: d > 0 ? "#e2445c" : h ? "#ffcb00" : col === "BLOQUEADA" ? "#e2445c" : "#579bfc", icon: "act", urg: d > 0 ? 0 : h ? 1 : 3 });
    }
    return out.sort((x, y) => x.urg - y.urg);
  }, [pendReq, acts, me]);

  const nombre = (me?.name || "").split(" ")[0];
  const acciones = [
    { href: "/dashboard/requisiciones/requisiciones/nuevo", t: "Pedir material", d: "Materiales, destajo", icon: PlusCircle, from: "#0073ea", to: "#579bfc" },
    { href: "/dashboard/actividades?nueva=1", t: "Nueva actividad", d: "Asignar a alguien", icon: ClipboardCheck, from: "#7e3bdd", to: "#a25ddc" },
    { href: "/dashboard/campo/evidencia", t: "Registrar entrega", d: `${porEntregar.length} por recibir`, icon: PackageCheck, from: "#00a35c", to: "#00c875" },
    { href: "/dashboard/campo/calendario", t: "Calendario", d: "Qué viene", icon: CalendarDays, from: "#e8760a", to: "#fdab3d" },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 pt-4 pb-28 max-w-2xl mx-auto">
        {/* Saludo */}
        <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#123a7a] via-[#0d2a5c] to-[#1b1350] border border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-[#579bfc]/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-[#b9cdf0] capitalize">{hoyTxt}</p>
              <h1 className="text-[26px] font-bold text-white leading-tight">{saludo}{nombre ? `, ${nombre}` : ""}</h1>
              <p className="mt-1 text-[13px] text-[#c9d8ed]">{loading ? "Revisando tus pendientes…" : items.length === 0 ? "Todo al día. No tienes nada pendiente 🎉" : `Tienes ${items.length} cosa${items.length === 1 ? "" : "s"} por atender`}</p>
            </div>
            {me && <span className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ring-2 ring-white/30" style={{ background: colorPersona(me.name) }}>{iniciales(me.name)}</span>}
          </div>
        </div>

        {/* Notificaciones del telefono */}
        {(push === "pendiente" || push === "instalar-primero" || push === "bloqueado" || pushMsg) && (
          <div className="mt-3 rounded-2xl border border-[#a25ddc]/40 bg-gradient-to-r from-[#a25ddc]/20 to-[#579bfc]/15 p-4">
            <div className="flex items-center gap-3">
              <span className="shrink-0 w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><BellRing className="w-5 h-5 text-white" /></span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">{push === "activo" ? "Notificaciones activas" : "Que te avise el teléfono"}</div>
                <div className="text-[12px] text-[#d6e2f5]">{pushMsg || (push === "instalar-primero" ? "En iPhone: primero agrega ARIA27 a tu pantalla de inicio (abajo te decimos cómo) y ábrela desde ese ícono." : push === "bloqueado" ? "Las bloqueaste antes. Actívalas en Ajustes del navegador › Notificaciones." : "Te avisamos al momento cuando te asignen algo, te autoricen o algo se atore.")}</div>
              </div>
              {push === "pendiente" && <button onClick={onActivarPush} disabled={pushBusy} className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#3b1d6e] active:scale-95 disabled:opacity-60">{pushBusy ? "…" : "Activar"}</button>}
            </div>
          </div>
        )}

        {/* 3 numeros */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { n: pendReq.length, l: "Solicitudes por atender", c: "#fdab3d", href: "/dashboard/requisiciones/requisiciones/estatus?chip=mis_pendientes" },
            { n: acts.length, l: "Mis actividades", c: "#579bfc", href: "/dashboard/actividades?vista=mi" },
            { n: atrasadas.length, l: "Atrasadas", c: "#e2445c", href: "/dashboard/actividades?vista=mi" },
          ].map(k => (
            <Link key={k.l} href={k.href} className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-3 active:scale-[0.97] transition">
              <div className="text-[26px] font-bold leading-none" style={{ color: k.n > 0 ? k.c : "#5f7390" }}>{loading ? "–" : k.n}</div>
              <div className="mt-1.5 text-[11px] leading-tight text-[#9fb4d4]">{k.l}</div>
            </Link>
          ))}
        </div>

        {/* Acciones grandes */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {acciones.map(({ href, t, d, icon: Icon, from, to }) => (
            <Link key={href} href={href} className="rounded-2xl p-4 min-h-[118px] flex flex-col justify-between active:scale-[0.97] transition shadow-[0_6px_18px_rgba(0,0,0,0.25)]" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
              <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><Icon className="w-6 h-6 text-white" /></span>
              <div><div className="text-[15px] font-bold text-white">{t}</div><div className="text-[11.5px] text-white/80">{d}</div></div>
            </Link>
          ))}
        </div>

        {/* Lo que te toca */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[15px] font-bold text-white">Lo que te toca</h2>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-[#579bfc]" />}
          </div>
          {!loading && items.length === 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-center">
              <div className="text-3xl">✅</div>
              <div className="mt-1 text-sm text-white font-semibold">Nada pendiente de tu parte</div>
              <div className="text-xs text-[#7f93b0]">{enCurso} solicitud{enCurso === 1 ? "" : "es"} tuya{enCurso === 1 ? "" : "s"} en camino</div>
            </div>
          )}
          <ul className="space-y-2">
            {items.slice(0, 12).map(it => (
              <li key={it.key}>
                <Link href={it.href} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] border border-white/[0.07] p-3 active:scale-[0.99] transition">
                  <span className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${it.color}26` }}>
                    {it.icon === "req" ? <FileText className="w-5 h-5" style={{ color: it.color }} /> : <ListTodo className="w-5 h-5" style={{ color: it.color }} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-white truncate">{it.titulo}</div>
                    <div className="text-[11.5px] text-[#9fb4d4] truncate">{it.sub}</div>
                  </div>
                  <span className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: it.color, color: it.color === "#ffcb00" || it.color === "#fdab3d" ? "#2a1a00" : "#fff" }}>{it.boton}</span>
                </Link>
              </li>
            ))}
          </ul>
          {items.length > 12 && <Link href="/dashboard/actividades?vista=mi" className="mt-2 flex items-center justify-center gap-1 text-sm text-[#9cc3ff]">Ver todo <ChevronRight className="w-4 h-4" /></Link>}
        </section>

        {/* Accesos secundarios */}
        <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.03] divide-y divide-white/[0.06]">
          {[
            { href: "/dashboard/requisiciones/requisiciones/estatus", t: "Mis solicitudes", d: `${reqs.length} en total` },
            { href: "/dashboard/actividades?vista=tablero", t: "Tablero de actividades", d: "Por hacer · En proceso · Atoradas · Terminadas" },
          ].map(x => (
            <Link key={x.href} href={x.href} className="flex items-center gap-3 px-4 py-3.5">
              <div className="flex-1 min-w-0"><div className="text-sm text-white font-medium">{x.t}</div><div className="text-[11px] text-[#7f93b0] truncate">{x.d}</div></div>
              <ChevronRight className="w-4 h-4 text-[#5f7390]" />
            </Link>
          ))}
        </div>

        {verInstalar && (
          <div className="mt-5 relative rounded-2xl border border-[#579bfc]/30 bg-[#579bfc]/10 p-4 pr-10 text-[13px] text-[#c9d8ed]">
            <button onClick={() => { setVerInstalar(false); try { localStorage.setItem("aria:instalar-oculto", "1"); } catch {} }} className="absolute right-2 top-2 p-1.5 rounded-lg text-[#9fb4d4]" aria-label="Ocultar"><X className="w-4 h-4" /></button>
            <div className="flex items-center gap-2 font-semibold text-white mb-1"><Share className="w-4 h-4 text-[#579bfc]" />Ponla como app en tu celular</div>
            {isIos ? <p>En Safari toca <b className="text-white">Compartir</b> y luego <b className="text-white">Agregar a pantalla de inicio</b>.</p> : <p>En Chrome toca <b className="text-white">⋮</b> y luego <b className="text-white">Instalar app</b>.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
