"use client";
/**
 * /dashboard/campo — Inicio en celular (rediseño 10-Oct-2026, estilo Monday "Mi trabajo")
 * 1) Saludo  2) 3 numeros que importan  3) 4 acciones grandes  4) "Lo que te toca" (solicitudes + actividades en una sola lista)
 * Todo con un toque. Sin menus escondidos.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PackageCheck, CalendarDays, FileText, ChevronRight, X, Share, ListTodo, BellRing, Building2, MapPin } from "lucide-react";
import { obraAqui, type ObraGeo } from "@/lib/geo";
import { enRiesgo } from "@/lib/riesgo";
import { normObra } from "@/lib/obras-dom";
import { estadoPush, activarPush } from "@/lib/push-client";
import { Contador } from "@/components/domenica/ui";
import { Esqueleto } from "@/components/domenica/Esqueleto";
import { Vacio } from "@/components/domenica/Vacio";
import { supabase } from "@/lib/supabase";
import { accionPara, statusLabel } from "@/lib/requi-stepper";
import { columnaDe, diasAtraso, venceHoy, esMia, fechaCorta, iniciales, colorPersona, type Actividad } from "@/lib/actividades";

type R = { id: string; folio: string; cost_center_name: string; status: string; purchase_status?: string | null; user_email?: string; responsable_email?: string | null; tipo_solicitud?: string | null; created_at: string; required_date?: string | null; proveedor?: string | null };
type Item = { key: string; href: string; titulo: string; sub: string; boton: string; color: string; icon: "req" | "act"; urg: number; obra?: string | null };

export default function CampoHome() {
  const router = useRouter();
  const [me, setMe] = useState<{ email: string; role: string; name: string } | null>(null);
  const [reqs, setReqs] = useState<R[]>([]);
  const [acts, setActs] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [saludo, setSaludo] = useState("Hola"); const [hoyTxt, setHoyTxt] = useState("");
  const [isIos, setIsIos] = useState(false); const [verInstalar, setVerInstalar] = useState(false);
  const [push, setPush] = useState<string>(""); const [pushBusy, setPushBusy] = useState(false); const [pushMsg, setPushMsg] = useState("");
  const [pushOculto, setPushOculto] = useState(true);
  // ¿En qué obra estás? (si ya diste permiso de ubicación, se detecta solo)
  const [aqui, setAqui] = useState<{ id: string; nombre: string; metros: number } | null>(null);
  const [geoEstado, setGeoEstado] = useState<"" | "preguntar" | "buscando" | "fuera">("");
  const detectarObra = useCallback(() => {
    if (!navigator.geolocation) return; setGeoEstado("buscando");
    navigator.geolocation.getCurrentPosition(async p => {
      const { data } = await supabase.from("centros_trabajo").select("id, nombre, latitud, longitud, radio_metros").eq("activo", true);
      const r = obraAqui({ lat: p.coords.latitude, lng: p.coords.longitude, precision: p.coords.accuracy }, (data || []) as ObraGeo[]);
      if (r) { setAqui({ id: r.obra.id, nombre: r.obra.nombre, metros: r.metros }); setGeoEstado(""); } else setGeoEstado("fuera");
    }, () => setGeoEstado(""), { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 });
  }, []);
  useEffect(() => {
    try { (navigator.permissions?.query({ name: "geolocation" as PermissionName }) || Promise.reject()).then(st => { if (st.state === "granted") detectarObra(); else if (st.state === "prompt") setGeoEstado("preguntar"); }).catch(() => setGeoEstado("preguntar")); } catch { setGeoEstado("preguntar"); }
  }, [detectarObra]);
  useEffect(() => { estadoPush().then(setPush).catch(() => setPush("no-soportado")); try { const t = Number(localStorage.getItem("dom:push-oculto") || 0); setPushOculto(Date.now() - t < 7 * 864e5); } catch { setPushOculto(false); } }, []);
  const onActivarPush = async () => { setPushBusy(true); setPushMsg(""); const r = await activarPush(); setPushBusy(false); if (r.ok) { setPush("activo"); setPushMsg("¡Listo! Te mandamos una notificación de prueba."); } else setPushMsg(r.error || "No se pudo activar"); };

  useEffect(() => {
    const ua = navigator.userAgent; setIsIos(/iPhone|iPad|iPod/i.test(ua));
    const d = new Date(); const h = d.getHours();
    setSaludo(h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches");
    const fx = d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }); setHoyTxt(fx.charAt(0).toUpperCase() + fx.slice(1));
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
        if (!["admin", "compras", "rh", "direccion", "validador"].includes(role)) q = q.or(`user_email.eq.${email},responsable_email.eq.${email}`);
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

  const hoyIso = useMemo(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }, []);
  const items: Item[] = useMemo(() => {
    if (!me) return [];
    const out: Item[] = [];
    for (const r of pendReq) {
      const a = accionPara(r, me.role, me.email);
      const boton = a === "AUTORIZAR_RESPONSABLE" ? "Autorizar" : a === "COTIZAR" ? "Cotizar" : a === "APROBAR_DIRECCION" ? "Aprobar" : a === "PAGAR" ? "Pagar" : "Ver";
      out.push({ obra: r.cost_center_name, key: "r" + r.id, href: `/dashboard/requisiciones/requisiciones/estatus?open=${r.id}`, titulo: `${r.folio} · ${r.cost_center_name || ""}`, sub: statusLabel(r.status) + (r.proveedor ? ` · ${r.proveedor}` : ""), boton, color: "#fdab3d", icon: "req", urg: 2 });
    }
    for (const a of acts) {
      const d = diasAtraso(a); const h = venceHoy(a); const col = columnaDe(a); const rg = enRiesgo(a, hoyIso);
      out.push({ obra: a.obra, key: "a" + a.id, href: `/dashboard/actividades?abrir=${a.id}`, titulo: a.titulo, sub: rg && d <= 0 ? `⚠ ${rg.motivo} · ${a.obra || "Oficina"}` : `${a.obra || "Oficina"} · ${d > 0 ? `${d} día${d === 1 ? "" : "s"} tarde` : h ? "vence hoy" : a.fecha_compromiso ? `entrega ${fechaCorta(a.fecha_compromiso)}` : "sin fecha"} · ${Number(a.avance) || 0}%`, boton: col === "BLOQUEADA" ? "Atorada" : "Abrir", color: d > 0 ? "#e2445c" : h ? "#ffcb00" : rg ? "#fdab3d" : col === "BLOQUEADA" ? "#e2445c" : "#579bfc", icon: "act", urg: d > 0 ? 0 : h ? 1 : rg ? 2 : 3 });
    }
    // Si estás en una obra, lo de esa obra va primero
    const enAqui = (x: Item) => (aqui && normObra(x.obra) === normObra(aqui.nombre) ? 0 : 1);
    return out.sort((x, y) => enAqui(x) - enAqui(y) || x.urg - y.urg);
  }, [pendReq, acts, me, aqui, hoyIso]);

  const nombre = (me?.name || "").split(" ")[0];

  return (
    <div className="dom-page h-full overflow-y-auto">
      <div className="px-4 pt-4 pb-28 max-w-2xl mx-auto">
        {/* Saludo */}
        <div className="dom-in relative overflow-hidden rounded-3xl px-4 py-3.5 bg-gradient-to-br from-[#0073ea] via-[#4f46e5] to-[#7e3bdd] shadow-[0_14px_34px_rgba(79,70,229,0.35)]">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-[#579bfc]/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-white/85">{hoyTxt}</p>
              <h1 className="text-[21px] font-bold text-white leading-tight truncate">{saludo}{nombre ? `, ${nombre}` : ""}</h1>
              <p className="mt-1 text-[13px] text-white/85">{loading ? "Revisando tus pendientes…" : items.length === 0 ? "Todo al día. No tienes nada pendiente 🎉" : `Tienes ${items.length} cosa${items.length === 1 ? "" : "s"} por atender`}</p>
            </div>
            {me && <span className="shrink-0 w-10 h-10 text-base rounded-full flex items-center justify-center text-white font-bold text-lg ring-2 ring-white/30" style={{ background: colorPersona(me.name) }}>{iniciales(me.name)}</span>}
          </div>
        </div>

        {/* Estás en una obra (geocerca): lo de esa obra primero */}
        {aqui ? (
          <div className="dom-in mt-3 flex items-center gap-3 rounded-2xl px-3.5 py-3" style={{ background: "linear-gradient(135deg,#0f766e,#00a35c)", boxShadow: "0 10px 22px -12px #0f766e" }}>
            <MapPin className="w-6 h-6 text-white shrink-0" />
            <div className="flex-1 min-w-0 text-white"><div className="text-[11px] font-semibold uppercase tracking-wider text-white/80">Estás en</div><div className="text-[15px] font-bold truncate">{aqui.nombre}</div></div>
            <Link href={`/dashboard/domenica/obras/${aqui.id}/bitacora`} className="shrink-0 rounded-xl bg-white/20 px-3 py-2 text-[12.5px] font-bold text-white">Bitácora</Link>
            <Link href={`/dashboard/domenica/obras/${aqui.id}`} className="shrink-0 rounded-xl bg-white px-3 py-2 text-[12.5px] font-bold text-[#0f766e]">Obra</Link>
          </div>
        ) : geoEstado === "preguntar" ? (
          <button onClick={detectarObra} className="mt-3 w-full flex items-center gap-2 rounded-2xl border border-dashed border-[var(--d-border)] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[var(--d-link)]"><MapPin className="w-4 h-4" />¿Estás en una obra? Toca para que te muestre lo de ahí</button>
        ) : geoEstado === "buscando" ? <div className="mt-3 text-[12.5px] text-[var(--d-muted)] flex items-center gap-1.5"><MapPin className="w-4 h-4" />Buscando en qué obra estás…</div> : null}

        {/* 3 numeros */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { n: pendReq.length, l: "Solicitudes por atender", c: "var(--c-ambar)", href: "/dashboard/requisiciones/requisiciones/estatus?tab=toca" },
            { n: acts.length, l: "Mis actividades", c: "var(--c-azul)", href: "/dashboard/actividades?vista=mi" },
            { n: atrasadas.length, l: "Atrasadas", c: "var(--c-rojo)", href: "/dashboard/actividades?vista=mi" },
          ].map((k, ki) => (
            <Link key={k.l} href={k.href} style={{ animationDelay: `${80 + ki * 60}ms` }} className="dom-card dom-in rounded-2xl px-3 py-2.5 active:scale-[0.97] transition">
              <div className="text-[22px] font-bold leading-none" style={{ color: k.n > 0 ? k.c : "var(--d-faint)" }}>{loading ? "–" : <Contador n={k.n} />}</div>
              <div className="mt-1.5 text-[11px] leading-tight text-[var(--d-muted)]">{k.l}</div>
            </Link>
          ))}
        </div>


        {/* AHORA: una sola cosa grande (enfoque) */}
        <section className="mt-4">
          <h2 className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-[var(--d-faint)]">Ahora</h2>
          {loading ? <Esqueleto filas={1} alto={132} /> : items.length === 0 ? (
            <div className="dom-card rounded-3xl"><Vacio dibujo="listo" titulo="¡Todo al día!" texto={enCurso ? `No te toca nada. Tienes ${enCurso} solicitud${enCurso === 1 ? "" : "es"} en camino.` : "No te toca nada por ahora. Usa el botón + para pedir o asignar algo."} /></div>
          ) : (() => { const it = items[0]; return (
            <Link href={it.href} className="dom-in block rounded-3xl p-4 active:scale-[0.99] transition relative overflow-hidden" style={{ background: "var(--d-card)", boxShadow: "var(--d-shadow)", border: `2px solid ${it.color}` }}>
              <span aria-hidden className="absolute -right-6 -top-6 w-24 h-24 rounded-full" style={{ background: `${it.color}1f` }} />
              <div className="relative flex items-start gap-3">
                <span className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${it.color}26` }}>{it.icon === "req" ? <FileText className="w-6 h-6" style={{ color: it.color }} /> : <ListTodo className="w-6 h-6" style={{ color: it.color }} />}</span>
                <div className="flex-1 min-w-0"><div className="text-[18px] font-bold leading-snug text-[var(--d-text)] line-clamp-2">{it.titulo}</div><div className="mt-0.5 text-[13px] text-[var(--d-muted)] line-clamp-2">{it.sub}</div></div>
              </div>
              <div className="relative mt-3 flex items-center justify-between">
                <span className="text-[12px] text-[var(--d-faint)]">{items.length > 1 ? `y ${items.length - 1} más después` : "Es lo único pendiente"}</span>
                <span className="rounded-2xl px-5 py-2.5 text-[15px] font-bold shadow" style={{ background: it.color, color: it.color === "#ffcb00" || it.color === "#fdab3d" ? "#2a1a00" : "#fff" }}>{it.boton} →</span>
              </div>
            </Link>); })()}
        </section>

        {/* DESPUÉS: máximo 3, sin saturar */}
        {!loading && items.length > 1 && (
          <section className="mt-4">
            <div className="mb-1.5 flex items-center justify-between"><h2 className="text-[12px] font-bold uppercase tracking-wider text-[var(--d-faint)]">Después</h2>
              {items.length > 3 && <Link href="/dashboard/actividades?vista=mi" className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-[var(--d-link)]">Ver las {items.length} <ChevronRight className="w-4 h-4" /></Link>}</div>
            <ul className="space-y-2">
              {items.slice(1, 3).map((it, ii) => (
              <li key={it.key} className="dom-in" style={{ animationDelay: `${120 + ii * 60}ms` }}>
                <Link href={it.href} className="dom-card flex items-center gap-3 rounded-2xl p-3 active:scale-[0.99] transition">
                  <span className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${it.color}26` }}>
                    {it.icon === "req" ? <FileText className="w-5 h-5" style={{ color: it.color }} /> : <ListTodo className="w-5 h-5" style={{ color: it.color }} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-[var(--d-text)] truncate">{it.titulo}</div>
                    <div className="text-[11.5px] text-[var(--d-muted)] truncate">{it.sub}</div>
                  </div>
                  <span className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: it.color, color: it.color === "#ffcb00" || it.color === "#fdab3d" ? "#2a1a00" : "#fff" }}>{it.boton}</span>
                </Link>
              </li>
              ))}
            </ul>
          </section>
        )}

        {/* Atajos discretos (lo demás está en el botón +) */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { href: "/dashboard/campo/calendario", t: "Calendario", icon: CalendarDays, c: "var(--c-ambar)" },
            { href: "/dashboard/domenica/obras", t: "Mis obras", icon: Building2, c: "var(--c-naranja)" },
            { href: "/dashboard/campo/evidencia", t: porEntregar.length ? `Por recibir (${porEntregar.length})` : "Entregas", icon: PackageCheck, c: "var(--c-verde)" },
          ].map(x => (
            <Link key={x.href} href={x.href} className="dom-card rounded-2xl py-3 flex flex-col items-center gap-1.5 active:scale-[0.97] transition">
              <x.icon className="w-6 h-6" style={{ color: x.c }} /><span className="text-[12px] font-semibold text-[var(--d-text-2)] text-center leading-tight">{x.t}</span>
            </Link>))}
        </div>

        {/* Notificaciones del telefono */}
        {(push === "pendiente" || pushMsg) && (
          <div className="dom-in mt-5 rounded-2xl bg-gradient-to-r from-[#a25ddc] to-[#579bfc] shadow-[0_8px_24px_rgba(162,93,220,0.3)] p-4">
            <div className="flex items-center gap-3">
              <span className="shrink-0 w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><BellRing className="w-5 h-5 text-white" /></span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">{push === "activo" ? "Notificaciones activas" : "Que te avise el teléfono"}</div>
                <div className="text-[12px] text-white/85">{pushMsg || (push === "instalar-primero" ? "En iPhone: primero agrega Doménica 27 a tu pantalla de inicio (abajo te decimos cómo) y ábrela desde ese ícono." : push === "bloqueado" ? "Las bloqueaste antes. Actívalas en Ajustes del navegador › Notificaciones." : "Te avisamos al momento cuando te asignen algo, te autoricen o algo se atore.")}</div>
              </div>
              {(push === "bloqueado" || push === "instalar-primero") && <button onClick={() => { setPushOculto(true); try { localStorage.setItem("dom:push-oculto", String(Date.now())); } catch { /* */ } }} className="shrink-0 self-start -m-1 p-1.5 rounded-lg text-white/80" aria-label="Ocultar aviso"><X className="w-4 h-4" /></button>}
              {push === "pendiente" && <button onClick={onActivarPush} disabled={pushBusy} className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#3b1d6e] active:scale-95 disabled:opacity-60">{pushBusy ? "…" : "Activar"}</button>}
            </div>
          </div>
        )}

        {verInstalar && (
          <div className="mt-5 relative rounded-2xl border border-[#579bfc]/30 bg-[#579bfc]/10 p-4 pr-10 text-[13px] text-[var(--d-text-2)]">
            <button onClick={() => { setVerInstalar(false); try { localStorage.setItem("aria:instalar-oculto", "1"); } catch {} }} className="absolute right-2 top-2 p-1.5 rounded-lg text-[var(--d-muted)]" aria-label="Ocultar"><X className="w-4 h-4" /></button>
            <div className="flex items-center gap-2 font-semibold text-[var(--d-text)] mb-1"><Share className="w-4 h-4 text-[#579bfc]" />Ponla como app en tu celular</div>
            {isIos ? <p>En Safari toca <b className="text-[var(--d-text)]">Compartir</b> y luego <b className="text-[var(--d-text)]">Agregar a pantalla de inicio</b>.</p> : <p>En Chrome toca <b className="text-[var(--d-text)]">⋮</b> y luego <b className="text-[var(--d-text)]">Instalar app</b>.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
