"use client";
/**
 * /dashboard/campo/mas — "Más" de Doménica 27 (10-Oct-2026)
 * Reemplaza al menu de la web en el celular: solo lo del dia a dia, por rol, mas ajustes (tema, avisos, salir).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fingerprint } from "lucide-react";
import { huellaDisponible, huellaActivada, activarHuella, olvidarHuellaLocal } from "@/lib/huella-client";
import { Sun, Moon, BellRing, LogOut, ChevronRight, Smartphone, UserCog, LayoutTemplate, Repeat, BarChart3, Zap, Package } from "lucide-react";
import { Ficha, IcoCalendario, IcoCamion, IcoObra, IcoRevision, IcoPlano, IcoCasco, IcoBodega, IcoEquipo, IcoChecada, IcoOrganizar, IcoSello, IcoPregunta, type Ico } from "@/components/domenica/IconosObra";
import { guardarTema, useTemaDom, type TemaDom } from "@/lib/dom-tema";
import { estadoPush, activarPush } from "@/lib/push-client";
import { iniciales, colorPersona } from "@/lib/actividades";

type Item = { href: string; t: string; d: string; icon: Ico; color: string; roles?: string[] };
const SECCIONES: { titulo: string; icon?: Ico; color?: string; items: Item[] }[] = [
  { titulo: "Mi día", items: [
    { href: "/dashboard/campo/autorizar", t: "Por autorizar", d: "Autoriza o rechaza en un toque", icon: IcoSello, color: "#3cde01", roles: ["admin", "direccion", "validador", "residente"] },
    { href: "/dashboard/campo/pregunta", t: "Pregúntale a Doménica", d: "“¿Qué está atrasado en Tanque?”", icon: IcoPregunta, color: "#7e3bdd" },
    { href: "/dashboard/campo/calendario", t: "Calendario", d: "Entregas y actividades", icon: IcoCalendario, color: "#b85507" },
    { href: "/dashboard/campo/evidencia", t: "Registrar entregas", d: "Foto, ubicación y quién recibió", icon: IcoCamion, color: "#0077ad" },
  ] },
  { titulo: "Obras", icon: IcoCasco, color: "#c9410f", items: [
    { href: "/dashboard/domenica/obras", t: "Mis obras", d: "Avance, gasto y bitácora del día", icon: IcoObra, color: "#c9410f" },
    { href: "/dashboard/domenica/revisiones", t: "Revisiones", d: "Calidad y seguridad con foto y firma", icon: IcoRevision, color: "#3cde01" },
    { href: "/dashboard/domenica/planos", t: "Planos", d: "Marca pendientes encima del plano", icon: IcoPlano, color: "#0073ea" },
    { href: "/dashboard/obras/catalogo", t: "Catálogo de obras", d: "Ver, ubicar y dar de alta", icon: IcoCasco, color: "#c2461a" },
  ] },
  { titulo: "Compras", icon: IcoBodega, color: "#0077ad", items: [
    { href: "/dashboard/requisiciones/proveedores", t: "Proveedores", d: "Directorio y datos bancarios", icon: IcoBodega, color: "#0077ad", roles: ["admin", "compras", "direccion", "rh", "validador"] },
    { href: "/dashboard/requisiciones/productos", t: "Productos", d: "Catálogo de materiales", icon: Package as unknown as Ico, color: "#0073ea", roles: ["admin", "compras", "direccion", "rh"] },
  ] },
  { titulo: "Equipo", icon: IcoEquipo, color: "#c62f5e", items: [
    { href: "/dashboard/talento/usuarios", t: "Usuarios", d: "Altas, bajas y permisos", icon: UserCog as unknown as Ico, color: "#c62f5e", roles: ["admin", "rh"] },
    { href: "/dashboard/talento/personal", t: "Personal", d: "Empleados", icon: IcoEquipo, color: "#c62f5e", roles: ["admin", "rh", "direccion", "validador"] },
    { href: "/dashboard/talento/checadas", t: "Checadas", d: "Asistencias del día", icon: IcoChecada, color: "#c62f5e", roles: ["admin", "rh", "validador"] },
  ] },
  { titulo: "Organizar el trabajo", icon: IcoOrganizar, color: "#7e3bdd", items: [
    { href: "/dashboard/domenica/plantillas", t: "Plantillas", d: "Arranque de obra en un clic", icon: LayoutTemplate as unknown as Ico, color: "#7e3bdd" },
    { href: "/dashboard/domenica/recurrentes", t: "Recurrentes", d: "Lo que se repite se crea solo", icon: Repeat as unknown as Ico, color: "#0073ea" },
    { href: "/dashboard/domenica/carga", t: "Carga de trabajo", d: "Quién está saturado", icon: BarChart3 as unknown as Ico, color: "#3cde01", roles: ["admin", "rh", "direccion", "validador", "compras"] },
    { href: "/dashboard/domenica/automatizaciones", t: "Automatizaciones", d: "Si pasa esto, avisa a…", icon: Zap as unknown as Ico, color: "#b85507", roles: ["admin", "rh", "direccion", "validador", "compras"] },
  ] },
];

export default function MasPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ email: string; role: string; name: string } | null>(null);
  const tema = useTemaDom();
  // Secciones plegables: solo "Mi día" abierta; las demás se abren al tocarlas (y se recuerda)
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});
  useEffect(() => { try { setAbiertas(JSON.parse(localStorage.getItem("dom:mas-abiertas") || "{}")); } catch { /* */ } }, []);
  const alternar = (k: string) => setAbiertas(a => { const n = { ...a, [k]: !a[k] }; try { localStorage.setItem("dom:mas-abiertas", JSON.stringify(n)); } catch { /* */ } return n; });
  const [push, setPush] = useState(""); const [pushMsg, setPushMsg] = useState("");
  const [prueba, setPrueba] = useState<{ disponible: boolean; activo?: boolean }>({ disponible: false });
  useEffect(() => { fetch("/api/auth/modo-prueba", { credentials: "include" }).then(r => r.ok ? r.json() : { disponible: false }).then(setPrueba).catch(() => {}); }, []);
  const tocarPrueba = async () => { const r = await fetch("/api/auth/modo-prueba", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: !prueba.activo }) }).then(x => x.json()).catch(() => null); if (r?.ok) setPrueba({ disponible: true, activo: r.activo }); };
  const [huella, setHuella] = useState<"no" | "si" | "off">("off"); const [huellaMsg, setHuellaMsg] = useState("");
  useEffect(() => { huellaDisponible().then(d => setHuella(!d ? "no" : huellaActivada() ? "si" : "off")); }, []);
  const tocarHuella = async () => {
    if (huella === "no") return;
    if (huella === "si") {
      if (!window.confirm("¿Quitar la entrada con huella o rostro en este teléfono?")) return;
      try { const r = await fetch("/api/auth/huella/mias", { credentials: "include" }).then(x => x.json()); for (const l of (r.llaves || []) as { id: string }[]) await fetch(`/api/auth/huella/mias?id=${l.id}`, { method: "DELETE", credentials: "include" }); } catch { /* */ }
      olvidarHuellaLocal(); setHuella("off"); setHuellaMsg("Quitada"); return;
    }
    try { setHuellaMsg("Sigue las indicaciones del teléfono…"); await activarHuella(); setHuella("si"); setHuellaMsg("Listo: la próxima vez entras con tu huella o rostro"); }
    catch (e) { setHuellaMsg((e as Error).message); }
  };
  useEffect(() => {
    estadoPush().then(setPush).catch(() => setPush("no-soportado"));
    fetch("/api/auth/me", { credentials: "include", cache: "no-store" }).then(r => r.ok ? r.json() : null).then(u => { if (u) setMe({ email: String(u.email || ""), role: String(u.role || "").toLowerCase(), name: u.display_name || u.name || u.email }); }).catch(() => {});
  }, []);
  const cambiarTema = (t: TemaDom) => guardarTema(t);
  const salir = async () => { try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch { /* */ } try { localStorage.removeItem("userEmail"); } catch { /* */ } router.replace("/"); };
  const visible = (i: Item) => !i.roles || (me && (i.roles.includes(me.role) || me.role === "administrador"));

  return (
    <div className="dom-page h-full overflow-y-auto">
      <div className="px-4 pt-4 pb-28 max-w-2xl mx-auto">
        <div className="dom-card rounded-3xl p-5 flex items-center gap-4">
          <span className="shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl" style={{ background: colorPersona(me?.name) }}>{iniciales(me?.name)}</span>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold text-[var(--d-text)] truncate">{me?.name || "…"}</div>
            <div className="text-[12.5px] text-[var(--d-muted)] truncate">{me?.email}</div>
          </div>
        </div>

        {SECCIONES.map((sec, si) => { const items = sec.items.filter(visible); if (!items.length) return null; const fijo = si === 0; const open = fijo || !!abiertas[sec.titulo]; return (
          <section key={sec.titulo} className="mt-5">
            {fijo ? <h2 className="px-1 mb-2 text-[12px] font-bold uppercase tracking-wider text-[var(--d-faint)]">{sec.titulo}</h2> : (
              <button type="button" onClick={() => alternar(sec.titulo)} aria-expanded={open} className="dom-card w-full rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left">
                {sec.icon ? <Ficha ico={sec.icon} color={sec.color || "#0073ea"} /> : null}
                <span className="flex-1"><span className="block text-[15px] font-bold text-[var(--d-text)]">{sec.titulo}</span><span className="block text-[12px] text-[var(--d-muted)]">{items.length} opci{items.length === 1 ? "ón" : "ones"}</span></span>
                <ChevronRight className={`w-5 h-5 text-[var(--d-faint)] transition-transform ${open ? "rotate-90" : ""}`} />
              </button>)}
            {open && <div className={`dom-card rounded-2xl overflow-hidden divide-y divide-[var(--d-border)] ${fijo ? "" : "mt-2 dom-in"}`}>
              {items.map(({ href, t, d, icon: Icon, color }) => (
                <Link key={href} href={href} className="flex items-center gap-3 px-4 py-3.5 active:bg-[var(--d-hover)]">
                  <Ficha ico={Icon} color={color} />
                  <div className="flex-1 min-w-0"><div className="text-[15px] font-semibold text-[var(--d-text)]">{t}</div><div className="text-[12px] text-[var(--d-muted)] truncate">{d}</div></div>
                  <ChevronRight className="w-4 h-4 text-[var(--d-faint)]" />
                </Link>))}
            </div>}
          </section>); })}

        <section className="mt-6">
          <h2 className="px-1 mb-2 text-[12px] font-bold uppercase tracking-wider text-[var(--d-faint)]">Ajustes</h2>
          <div className="dom-card rounded-2xl overflow-hidden divide-y divide-[var(--d-border)]">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: tema === "claro" ? "#e8890c" : "#5b4bc4" }}>{tema === "claro" ? <Sun className="w-5 h-5 text-white" /> : <Moon className="w-5 h-5 text-white" />}</span>
              <div className="flex-1"><div className="text-[15px] font-semibold text-[var(--d-text)]">Apariencia</div><div className="text-[12px] text-[var(--d-muted)]">{tema === "claro" ? "Claro" : "Oscuro"}</div></div>
              <div className="inline-flex rounded-xl bg-[var(--d-card-2)] p-1">
                {(["claro", "oscuro"] as const).map(t => <button key={t} onClick={() => cambiarTema(t)} className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize ${tema === t ? "bg-[#0073ea] text-white" : "text-[var(--d-muted)]"}`}>{t}</button>)}
              </div>
            </div>
            <button onClick={async () => { if (push === "activo") return; const r = await activarPush(); if (r.ok) { setPush("activo"); setPushMsg("Activas. Te mandamos una de prueba."); } else setPushMsg(r.error || ""); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
              <span className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-[#7e3bdd]"><BellRing className="w-5 h-5 text-white" /></span>
              <div className="flex-1 min-w-0"><div className="text-[15px] font-semibold text-[var(--d-text)]">Notificaciones del teléfono</div><div className="text-[12px] text-[var(--d-muted)]">{pushMsg || (push === "activo" ? "Activas" : push === "instalar-primero" ? "En iPhone, primero agrega la app a tu pantalla de inicio" : push === "bloqueado" ? "Bloqueadas en el navegador" : "Toca para activarlas")}</div></div>
              {push === "activo" ? <span className="text-[11px] font-bold text-[var(--d-ok)]">● Activas</span> : <ChevronRight className="w-4 h-4 text-[var(--d-faint)]" />}
            </button>
            {prueba.disponible && <button onClick={tocarPrueba} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
              <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${prueba.activo ? "bg-[#b85507]" : "bg-[#55657c]"}`}><svg viewBox="0 0 24 24" className="w-5 h-5" fill="#fff"><path d="M9 3h6v2h-1v4.2l5.2 8.6A2.1 2.1 0 0 1 17.4 21H6.6a2.1 2.1 0 0 1-1.8-3.2L10 9.2V5H9V3Zm3 9.5L8.6 18h6.8L12 12.5Z" /></svg></span>
              <div className="flex-1 min-w-0"><div className="text-[15px] font-semibold text-[var(--d-text)]">Modo prueba</div><div className="text-[12px] text-[var(--d-muted)]">{prueba.activo ? "Activo: lo que hagas le avisa solo a ti (WhatsApp, correo y notificación)" : "Apagado: tus acciones avisan a las personas reales"}</div></div>
              <span className={`text-[11px] font-bold ${prueba.activo ? "text-[var(--d-warn)]" : "text-[var(--d-muted)]"}`}>{prueba.activo ? "Activo" : "Apagado"}</span>
            </button>}
            <button onClick={tocarHuella} disabled={huella === "no"} className="w-full flex items-center gap-3 px-4 py-3.5 text-left disabled:opacity-60">
              <span className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-[#0060c7]"><Fingerprint className="w-5 h-5 text-white" /></span>
              <div className="flex-1 min-w-0"><div className="text-[15px] font-semibold text-[var(--d-text)]">Entrar con huella o rostro</div><div className="text-[12px] text-[var(--d-muted)]">{huellaMsg || (huella === "si" ? "Activo en este teléfono · toca para quitarlo" : huella === "no" ? "Este teléfono no tiene huella ni rostro configurados" : "Toca para activarlo y no escribir la contraseña")}</div></div>
              {huella === "si" ? <span className="text-[11px] font-bold text-[var(--d-ok)]">Activo</span> : <ChevronRight className="w-4 h-4 text-[var(--d-faint)]" />}
            </button>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-[#0073ea]"><Smartphone className="w-5 h-5 text-white" /></span>
              <div className="flex-1 min-w-0"><div className="text-[15px] font-semibold text-[var(--d-text)]">Tener Doménica 27 como app</div><div className="text-[12px] text-[var(--d-muted)]">iPhone: Compartir › Agregar a inicio · Android: ⋮ › Instalar app</div></div>
            </div>
            <button onClick={salir} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
              <span className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-[#d0304a]"><LogOut className="w-5 h-5 text-white" /></span>
              <div className="flex-1 text-[15px] font-semibold text-[var(--d-danger)]">Cerrar sesión</div>
            </button>
          </div>
        </section>
        <p className="mt-6 text-center text-[11px] text-[var(--d-faint)]">Doménica 27 · parte de ARIA27</p>
      </div>
    </div>
  );
}
