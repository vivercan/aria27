"use client";
/**
 * /dashboard/campo — Inicio en celular (rediseño 10-Oct-2026, estilo Monday "Mi trabajo")
 * 1) Saludo  2) 3 numeros que importan  3) 4 acciones grandes  4) "Lo que te toca" (solicitudes + actividades en una sola lista)
 * Todo con un toque. Sin menus escondidos.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, X, Share, BellRing, MapPin } from "lucide-react";
import { Ficha, IcoCamion, IcoSello, IcoTarea, IcoSaco, IcoMicro, IcoBillete } from "@/components/domenica/IconosObra";
import { obraAqui, type ObraGeo } from "@/lib/geo";
import { enRiesgo } from "@/lib/riesgo";
import { normObra } from "@/lib/obras-dom";
import { estadoPush, activarPush } from "@/lib/push-client";
import { Esqueleto } from "@/components/domenica/Esqueleto";
import { Vacio } from "@/components/domenica/Vacio";
import { supabase } from "@/lib/supabase";
import { accionPara, puedeRegistrarEntrega, statusLabel } from "@/lib/requi-stepper";
import { cargarPorRevisar } from "@/lib/revisar";
import { atrasoTexto, columnaDe, diasAtraso, venceHoy, esMia, fechaCorta, iniciales, colorPersona, type Actividad } from "@/lib/actividades";

type R = { id: string; folio: string; cost_center_name: string; status: string; purchase_status?: string | null; user_email?: string; responsable_email?: string | null; tipo_solicitud?: string | null; created_at: string; required_date?: string | null; proveedor?: string | null };
type Item = { key: string; href: string; titulo: string; sub: string; boton: string; color: string; icon: "req" | "act"; urg: number; obra?: string | null };

export default function CampoHome() {
  const router = useRouter();
  const [me, setMe] = useState<{ email: string; role: string; name: string } | null>(null);
  const [reqs, setReqs] = useState<R[]>([]);
  const [acts, setActs] = useState<Actividad[]>([]);
  const [porAprobar, setPorAprobar] = useState<Actividad[]>([]); // terminadas que esperan MI visto bueno
  const [loading, setLoading] = useState(true);
  const [saludo, setSaludo] = useState("Hola"); const [hoyTxt, setHoyTxt] = useState("");
  const [isIos, setIsIos] = useState(false); const [verInstalar, setVerInstalar] = useState(false);
  const [push, setPush] = useState<string>(""); const [pushBusy, setPushBusy] = useState(false); const [pushMsg, setPushMsg] = useState("");
  const [pushOculto, setPushOculto] = useState(true);
  // ¿En qué obra estás? (si ya diste permiso de ubicación, se detecta solo)
  const [aqui, setAqui] = useState<{ id: string; nombre: string; metros: number } | null>(null);
  const [geoEstado, setGeoEstado] = useState<"" | "preguntar" | "buscando" | "fuera">("");
  const [geoOculto, setGeoOculto] = useState(true);
  useEffect(() => { try { setGeoOculto(localStorage.getItem("dom:geo-oculto") === "1"); } catch { /* */ } }, []);
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
        const [{ data: ac }, { data: apr }] = await Promise.all([aq, cargarPorRevisar(email).then(data => ({ data }))]);
        if (!alive) return;
        setReqs((rq || []) as R[]); setActs(((ac || []) as Actividad[]).filter(a => esMia(a, email, empId))); setPorAprobar((apr || []) as Actividad[]);
      } catch { /* best effort */ } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [router]);

  const pendReq = useMemo(() => me ? reqs.filter(r => { const a = accionPara(r, me.role, me.email); return a !== null && a !== "REGISTRAR_ENTREGA"; }) : [], [reqs, me]);
  const porEntregar = useMemo(() => me ? reqs.filter(r => puedeRegistrarEntrega(r, me.role, me.email)) : [], [reqs, me]);
  const atrasadas = useMemo(() => acts.filter(a => diasAtraso(a) > 0), [acts]);
  const porAutorizar = useMemo(() => me ? reqs.filter(r => { const a = accionPara(r, me.role, me.email); return a === "AUTORIZAR_RESPONSABLE" || a === "APROBAR_DIRECCION"; }).length : 0, [reqs, me]);
  const enCurso = useMemo(() => me ? reqs.filter(r => (r.user_email || "").toLowerCase() === me.email && !["ENTREGADA", "CANCELADA", "RECHAZADA_RESPONSABLE", "RECHAZADA_DIRECCION"].includes(r.status)).length : 0, [reqs, me]);

  const hoyIso = useMemo(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }, []);
  const items: Item[] = useMemo(() => {
    if (!me) return [];
    const out: Item[] = [];
    for (const r of pendReq) {
      const a = accionPara(r, me.role, me.email);
      const boton = a === "AUTORIZAR_RESPONSABLE" ? "Autorizar" : a === "COTIZAR" ? "Cotizar" : a === "APROBAR_DIRECCION" ? "Aprobar" : a === "PAGAR" ? "Pagar" : "Ver";
      const autoriza = a === "AUTORIZAR_RESPONSABLE" || a === "APROBAR_DIRECCION";
      out.push({ obra: r.cost_center_name, key: "r" + r.id, href: autoriza ? "/dashboard/campo/autorizar" : `/dashboard/requisiciones/requisiciones/estatus?open=${r.id}`, titulo: `${r.folio} · ${r.cost_center_name || ""}`, sub: statusLabel(r.status) + (r.proveedor ? ` · ${r.proveedor}` : ""), boton, color: autoriza ? "#00873f" : "#b85507", icon: "req", urg: 2 });
    }
    for (const a of acts) {
      const d = diasAtraso(a); const h = venceHoy(a); const col = columnaDe(a); const rg = enRiesgo(a, hoyIso);
      out.push({ obra: a.obra, key: "a" + a.id, href: `/dashboard/actividades?abrir=${a.id}`, titulo: a.titulo, sub: rg && d <= 0 ? `Riesgo: ${rg.motivo} · ${a.obra || "Oficina"}` : `${a.obra || "Oficina"} · ${d > 0 ? atrasoTexto(d) : h ? "vence hoy" : a.fecha_compromiso ? `entrega ${fechaCorta(a.fecha_compromiso)}` : "sin fecha"} · ${Number(a.avance) || 0}%`, boton: col === "BLOQUEADA" ? "Atorada" : "Abrir", color: d > 0 ? "#d0304a" : h ? "#b85507" : rg ? "#c2570c" : col === "BLOQUEADA" ? "#d0304a" : "#0073ea", icon: "act", urg: d > 0 ? 0 : h ? 1 : rg ? 2 : 3 });
    }
    for (const a of porAprobar) { const atorada = !a.por_aprobar && !!a.motivo_bloqueo;
      out.push({ obra: a.obra, key: "v" + a.id, href: `/dashboard/actividades?abrir=${a.id}`, titulo: a.titulo, sub: atorada ? `${a.asignado_nombre || "Alguien"} avisa que está atorada: ${a.motivo_bloqueo}` : `${a.asignado_nombre || "Alguien"} dice que ya terminó · dale tu visto bueno`, boton: atorada ? "Ver" : "Revisar", color: atorada ? "#d0304a" : "#b85507", icon: "act", urg: atorada ? 0 : 1 }); }
    // Si estás en una obra, lo de esa obra va primero
    const enAqui = (x: Item) => (aqui && normObra(x.obra) === normObra(aqui.nombre) ? 0 : 1);
    return out.sort((x, y) => enAqui(x) - enAqui(y) || x.urg - y.urg);
  }, [pendReq, acts, porAprobar, me, aqui, hoyIso]);

  const nombre = (me?.name || "").split(" ")[0];

  return (
    <div className="dom-page h-full overflow-y-auto">
      <div className="px-4 pt-4 pb-28 max-w-2xl mx-auto">
        {/* Saludo */}
        <div className="dom-in relative overflow-hidden rounded-3xl px-4 py-3.5 bg-[#0060c7]">
          <div className="relative flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[14px] text-white">{hoyTxt}</p>
              <h1 className="text-[23px] font-bold text-white leading-tight truncate">{saludo}{nombre ? `, ${nombre}` : ""}</h1>
              <p className="mt-1 text-[15px] text-white">{loading ? "Revisando tus pendientes…" : items.length === 0 ? "Todo al día. No tienes nada pendiente" : `Tienes ${items.length} cosa${items.length === 1 ? "" : "s"} por atender`}</p>
            </div>
            {me && <span className="shrink-0 w-10 h-10 text-base rounded-full flex items-center justify-center text-white font-bold text-lg ring-2 ring-white/30" style={{ background: colorPersona(me.name) }}>{iniciales(me.name)}</span>}
          </div>
        </div>

        {/* 11-Oct-2026 · De lo general a lo particular: 1) lo que te toca  2) ¿qué quieres hacer?  3) lo demás está en Más */}

        {/* Estás en una obra (geocerca): lo de esa obra primero */}
        {aqui && (
          <div className="dom-in mt-3 flex items-center gap-3 rounded-2xl px-3.5 py-3 bg-[#00873f]">
            <MapPin className="w-6 h-6 text-white shrink-0" />
            <div className="flex-1 min-w-0 text-white"><div className="text-[13px] font-semibold text-white">Estás en</div><div className="text-[16px] font-bold truncate">{aqui.nombre}</div></div>
            <Link href={`/dashboard/domenica/obras/${aqui.id}`} className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-[15px] font-bold text-[#1f7a00]">Ver obra</Link>
          </div>
        )}

        {/* 1) LO QUE TE TOCA AHORA: una sola cosa grande */}
        <section className="mt-4">
          <h2 className="mb-2 text-[15px] font-bold text-[var(--d-text)]">Lo que te toca ahora</h2>
          {loading ? <Esqueleto filas={1} alto={132} /> : items.length === 0 ? (
            <div className="dom-card rounded-3xl px-4 py-4 flex items-center gap-3">
              <span className="shrink-0 w-12 h-12 rounded-2xl bg-[#00873f] flex items-center justify-center"><svg viewBox="0 0 24 24" className="w-7 h-7"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
              <div className="flex-1 min-w-0"><div className="text-[18px] font-bold text-[var(--d-text)]">¡Todo al día!</div><div className="text-[15px] text-[var(--d-muted)]">{enCurso ? `No te toca nada. Tienes ${enCurso} solicitud${enCurso === 1 ? "" : "es"} en camino.` : "No te toca nada por ahora."}</div></div>
            </div>
          ) : (() => { const it = items[0]; return (
            <Link href={it.href} className="dom-in block rounded-3xl p-4 active:scale-[0.99] transition relative overflow-hidden" style={{ background: "var(--d-card)", boxShadow: "var(--d-shadow)", border: `2px solid ${it.color}` }}>
              <div className="relative flex items-start gap-3">
                <Ficha ico={it.icon === "req" ? (it.boton === "Autorizar" || it.boton === "Aprobar" ? IcoSello : IcoSaco) : IcoTarea} color={it.color} size="lg" />
                <div className="flex-1 min-w-0"><div className="text-[18px] font-bold leading-snug text-[var(--d-text)] line-clamp-2">{it.titulo}</div><div className="mt-0.5 text-[15px] text-[var(--d-muted)] line-clamp-2">{it.sub}</div></div>
              </div>
              <div className="relative mt-3 flex items-center justify-between gap-2">
                <span className="text-[14px] text-[var(--d-muted)]">{items.length > 1 ? `Después: ${items.length - 1} más` : "Es lo único pendiente"}</span>
                <span className="rounded-2xl px-5 py-3 text-[17px] font-bold" style={{ background: it.color === "#00873f" ? "#00873f" : it.color, color: "#fff" }}>{it.boton} →</span>
              </div>
            </Link>); })()}
        </section>

        {/* Después: máximo 2, y un botón claro para ver todo */}
        {!loading && items.length > 1 && (
          <section className="mt-3">
            <ul className="space-y-2">
              {items.slice(1, 3).map((it, ii) => (
              <li key={it.key} className="dom-in" style={{ animationDelay: `${120 + ii * 60}ms` }}>
                <Link href={it.href} className="dom-card flex items-center gap-3 rounded-2xl p-3 active:scale-[0.99] transition">
                  <Ficha ico={it.icon === "req" ? (it.boton === "Autorizar" || it.boton === "Aprobar" ? IcoSello : IcoSaco) : IcoTarea} color={it.color} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[16px] font-semibold text-[var(--d-text)] truncate">{it.titulo}</div>
                    <div className="text-[14px] text-[var(--d-muted)] truncate">{it.sub}</div>
                  </div>
                  <span className="shrink-0 rounded-xl px-3 py-2 text-[14px] font-bold text-white" style={{ background: it.color === "#00873f" ? "#00873f" : it.color }}>{it.boton}</span>
                </Link>
              </li>
              ))}
            </ul>
            {items.length > 3 && <Link href={porAutorizar > 0 ? "/dashboard/campo/autorizar" : "/dashboard/actividades?vista=mi"} className="mt-2 flex items-center justify-center gap-1 h-12 rounded-2xl border border-[var(--d-border)] text-[16px] font-bold text-[var(--d-link)]">Ver todo lo que te toca ({items.length}) <ChevronRight className="w-5 h-5" /></Link>}
          </section>
        )}

        {/* 2) ¿QUÉ QUIERES HACER? — las mismas 4 opciones, colores y nombres que el botón + Nuevo */}
        <section className="mt-6">
          <h2 className="mb-2 text-[15px] font-bold text-[var(--d-text)]">¿Qué quieres hacer?</h2>
          <button type="button" onClick={() => { try { window.dispatchEvent(new Event("dom:hablar")); } catch { /* */ } }} className="w-full flex items-center gap-3 rounded-2xl bg-[#6d35c9] px-4 py-3.5 text-left text-white active:scale-[0.99] transition">
            <span className="shrink-0 w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center"><IcoMicro className="w-7 h-7" color="#fff" fondo="#6d35c9" /></span>
            <span className="flex-1 min-w-0"><span className="block text-[17px] font-bold leading-tight">Habla con Doménica</span><span className="block text-[14px] text-white">Dile lo que necesitas y ella lo arma</span></span>
          </button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Link href="/dashboard/requisiciones/requisiciones/nuevo?tipo=MATERIALES" className="rounded-2xl bg-[#0073ea] p-3.5 text-white flex flex-col gap-1.5 min-h-[112px] active:scale-[0.98] transition">
              <IcoSaco className="w-8 h-8" color="#fff" fondo="#0073ea" /><span className="text-[16px] font-bold leading-tight">Requisición</span><span className="text-[13.5px] leading-tight text-white">Material o servicio. Se cotiza y se paga</span></Link>
            <Link href="/dashboard/actividades?nueva=1" className="rounded-2xl bg-[#b85507] p-3.5 text-white flex flex-col gap-1.5 min-h-[112px] active:scale-[0.98] transition">
              <IcoTarea className="w-8 h-8" color="#fff" fondo="#b85507" /><span className="text-[16px] font-bold leading-tight">Tarea</span><span className="text-[13.5px] leading-tight text-white">Encárgale algo a alguien</span></Link>
          </div>
          <Link href="/dashboard/requisiciones/requisiciones/nuevo?tipo=PAGO" className="mt-2 flex items-center gap-3 rounded-2xl bg-[#007a87] px-4 py-3.5 text-white active:scale-[0.99] transition">
            <IcoBillete className="w-8 h-8 shrink-0" color="#fff" fondo="#007a87" /><span className="flex-1"><span className="block text-[16px] font-bold leading-tight">Pago de servicio</span><span className="block text-[13.5px] text-white">En efectivo. Va directo a pago</span></span></Link>
          <Link href="/dashboard/campo/evidencia" className="mt-2 flex items-center gap-3 rounded-2xl bg-[#00873f] px-4 py-3.5 text-white active:scale-[0.99] transition">
            <IcoCamion className="w-8 h-8 shrink-0" color="#fff" fondo="#00873f" /><span className="flex-1"><span className="block text-[16px] font-bold leading-tight">Registrar una entrega{porEntregar.length ? ` (${porEntregar.length})` : ""}</span><span className="block text-[13.5px] text-white">Llegó material: foto y quién recibió</span></span></Link>
          {porAutorizar > 0 && <Link href="/dashboard/campo/autorizar" className="mt-2 flex items-center gap-3 rounded-2xl dom-card px-4 py-3.5 active:scale-[0.99] transition"><Ficha ico={IcoSello} color="#00873f" /><span className="flex-1 text-[16px] font-bold text-[var(--d-text)]">Autorizar ({porAutorizar})</span><ChevronRight className="w-5 h-5 text-[var(--d-faint)]" /></Link>}
          <p className="mt-3 text-center text-[14px] text-[var(--d-muted)]">Obras, calendario, equipo y ajustes están en <b className="text-[var(--d-text)]">Más</b>, abajo a la derecha.</p>
        </section>

        {geoEstado === "preguntar" && !geoOculto && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-dashed border-[var(--d-border)] pl-3.5 pr-1">
            <MapPin className="w-5 h-5 shrink-0 text-[var(--d-link)]" />
            <button onClick={detectarObra} className="flex-1 py-3 text-left text-[14.5px] font-semibold text-[var(--d-link)]">¿Estás en una obra? Toca y te muestro lo de ahí</button>
            <button onClick={() => { setGeoOculto(true); try { localStorage.setItem("dom:geo-oculto", "1"); } catch { /* */ } }} className="w-11 h-11 flex items-center justify-center text-[var(--d-muted)]" aria-label="Ocultar"><X className="w-5 h-5" /></button>
          </div>
        )}

        {/* Notificaciones del telefono */}
        {(push === "pendiente" || pushMsg) && (
          <div className="dom-in mt-5 rounded-2xl bg-[#6d35c9] p-4">
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
          <div className="mt-5 relative dom-card rounded-2xl p-4 pr-10 text-[13px] text-[var(--d-text-2)]">
            <button onClick={() => { setVerInstalar(false); try { localStorage.setItem("aria:instalar-oculto", "1"); } catch {} }} className="absolute right-1 top-1 w-10 h-10 inline-flex items-center justify-center rounded-lg text-[var(--d-muted)]" aria-label="Ocultar"><X className="w-4 h-4" /></button>
            <div className="flex items-center gap-2 font-semibold text-[var(--d-text)] mb-1"><span className="w-6 h-6 rounded-md bg-[#0073ea] flex items-center justify-center"><Share className="w-3.5 h-3.5 text-white" /></span>Ponla como app en tu celular</div>
            {isIos ? <p>En Safari toca <b className="text-[var(--d-text)]">Compartir</b> y luego <b className="text-[var(--d-text)]">Agregar a pantalla de inicio</b>.</p> : <p>En Chrome toca <b className="text-[var(--d-text)]">⋮</b> y luego <b className="text-[var(--d-text)]">Instalar app</b>.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
