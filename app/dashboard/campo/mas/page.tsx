"use client";
/**
 * /dashboard/campo/mas — "Más" de Doménica 27 (10-Oct-2026)
 * Reemplaza al menu de la web en el celular: solo lo del dia a dia, por rol, mas ajustes (tema, avisos, salir).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, PlusCircle, ListTodo, CalendarDays, PackageCheck, HardHat, Truck, Package, Users, UserCog, Fingerprint, Zap, Sun, Moon, BellRing, LogOut, ChevronRight, Smartphone, Building2, LayoutTemplate, Repeat, BarChart3 } from "lucide-react";
import { guardarTema, useTemaDom, type TemaDom } from "@/lib/dom-tema";
import { estadoPush, activarPush } from "@/lib/push-client";
import { iniciales, colorPersona } from "@/lib/actividades";

type Item = { href: string; t: string; d: string; icon: typeof FileText; color: string; roles?: string[] };
const SECCIONES: { titulo: string; items: Item[] }[] = [
  { titulo: "Mi día", items: [
    { href: "/dashboard/requisiciones/requisiciones/nuevo", t: "Pedir material", d: "Materiales o destajo", icon: PlusCircle, color: "#0073ea" },
    { href: "/dashboard/requisiciones/requisiciones/estatus", t: "Mis solicitudes", d: "En qué paso va cada una", icon: FileText, color: "#579bfc" },
    { href: "/dashboard/actividades", t: "Actividades", d: "Mi trabajo, tablero y línea de tiempo", icon: ListTodo, color: "#a25ddc" },
    { href: "/dashboard/campo/calendario", t: "Calendario", d: "Entregas y actividades", icon: CalendarDays, color: "#fdab3d" },
    { href: "/dashboard/campo/evidencia", t: "Registrar entregas", d: "Foto, ubicación y quién recibió", icon: PackageCheck, color: "#00c875" },
  ] },
  { titulo: "Obras", items: [
    { href: "/dashboard/obras/catalogo", t: "Obras", d: "Alta con ubicación GPS", icon: HardHat, color: "#ff642e" },
  ] },
  { titulo: "Compras", items: [
    { href: "/dashboard/requisiciones/proveedores", t: "Proveedores", d: "Directorio y datos bancarios", icon: Truck, color: "#0086c0", roles: ["admin", "compras", "direccion", "rh", "validador"] },
    { href: "/dashboard/requisiciones/productos", t: "Productos", d: "Catálogo de materiales", icon: Package, color: "#0086c0", roles: ["admin", "compras", "direccion", "rh"] },
  ] },
  { titulo: "Equipo", items: [
    { href: "/dashboard/talento/usuarios", t: "Usuarios", d: "Altas, bajas y permisos", icon: UserCog, color: "#bb3354", roles: ["admin", "rh"] },
    { href: "/dashboard/talento/personal", t: "Personal", d: "Empleados", icon: Users, color: "#bb3354", roles: ["admin", "rh", "direccion"] },
    { href: "/dashboard/talento/checadas", t: "Checadas", d: "Asistencias del día", icon: Fingerprint, color: "#bb3354", roles: ["admin", "rh", "direccion", "validador"] },
  ] },
  { titulo: "Organizar el trabajo", items: [
    { href: "/dashboard/domenica/obras", t: "Mis obras", d: "Avance, atrasos y gasto de cada obra", icon: Building2, color: "#ff642e" },
    { href: "/dashboard/domenica/plantillas", t: "Plantillas", d: "Arranque de obra en un clic", icon: LayoutTemplate, color: "#a25ddc" },
    { href: "/dashboard/domenica/recurrentes", t: "Recurrentes", d: "Lo que se repite se crea solo", icon: Repeat, color: "#579bfc" },
    { href: "/dashboard/domenica/carga", t: "Carga de trabajo", d: "Quién está saturado", icon: BarChart3, color: "#00c875", roles: ["admin", "rh", "direccion", "validador", "compras"] },
    { href: "/dashboard/domenica/automatizaciones", t: "Automatizaciones", d: "Si pasa esto, avisa a…", icon: Zap, color: "#fdab3d", roles: ["admin", "rh", "direccion", "validador", "compras"] },
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
                <span className="flex -space-x-1.5">{items.slice(0, 3).map(({ icon: Icon, color, href }) => <span key={href} className="w-8 h-8 rounded-full flex items-center justify-center ring-2 ring-[var(--d-card)]" style={{ background: `${color}26` }}><Icon className="w-4 h-4" style={{ color }} /></span>)}</span>
                <span className="flex-1"><span className="block text-[15px] font-bold text-[var(--d-text)]">{sec.titulo}</span><span className="block text-[12px] text-[var(--d-muted)]">{items.length} opci{items.length === 1 ? "ón" : "ones"}</span></span>
                <ChevronRight className={`w-5 h-5 text-[var(--d-faint)] transition-transform ${open ? "rotate-90" : ""}`} />
              </button>)}
            {open && <div className={`dom-card rounded-2xl overflow-hidden divide-y divide-[var(--d-border)] ${fijo ? "" : "mt-2 dom-in"}`}>
              {items.map(({ href, t, d, icon: Icon, color }) => (
                <Link key={href} href={href} className="flex items-center gap-3 px-4 py-3.5 active:bg-[var(--d-hover)]">
                  <span className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}1f` }}><Icon className="w-5 h-5" style={{ color }} /></span>
                  <div className="flex-1 min-w-0"><div className="text-[15px] font-semibold text-[var(--d-text)]">{t}</div><div className="text-[12px] text-[var(--d-muted)] truncate">{d}</div></div>
                  <ChevronRight className="w-4 h-4 text-[var(--d-faint)]" />
                </Link>))}
            </div>}
          </section>); })}

        <section className="mt-6">
          <h2 className="px-1 mb-2 text-[12px] font-bold uppercase tracking-wider text-[var(--d-faint)]">Ajustes</h2>
          <div className="dom-card rounded-2xl overflow-hidden divide-y divide-[var(--d-border)]">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--d-card-2)]">{tema === "claro" ? <Sun className="w-5 h-5 text-[#fdab3d]" /> : <Moon className="w-5 h-5 text-[#a25ddc]" />}</span>
              <div className="flex-1"><div className="text-[15px] font-semibold text-[var(--d-text)]">Apariencia</div><div className="text-[12px] text-[var(--d-muted)]">{tema === "claro" ? "Claro" : "Oscuro"}</div></div>
              <div className="inline-flex rounded-xl bg-[var(--d-card-2)] p-1">
                {(["claro", "oscuro"] as const).map(t => <button key={t} onClick={() => cambiarTema(t)} className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize ${tema === t ? "bg-[#0073ea] text-white" : "text-[var(--d-muted)]"}`}>{t}</button>)}
              </div>
            </div>
            <button onClick={async () => { if (push === "activo") return; const r = await activarPush(); if (r.ok) { setPush("activo"); setPushMsg("Activas. Te mandamos una de prueba."); } else setPushMsg(r.error || ""); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
              <span className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-[#a25ddc1f]"><BellRing className="w-5 h-5 text-[#a25ddc]" /></span>
              <div className="flex-1 min-w-0"><div className="text-[15px] font-semibold text-[var(--d-text)]">Notificaciones del teléfono</div><div className="text-[12px] text-[var(--d-muted)]">{pushMsg || (push === "activo" ? "Activas" : push === "instalar-primero" ? "En iPhone, primero agrega la app a tu pantalla de inicio" : push === "bloqueado" ? "Bloqueadas en el navegador" : "Toca para activarlas")}</div></div>
              {push === "activo" ? <span className="text-[11px] font-bold text-[var(--d-ok)]">● Activas</span> : <ChevronRight className="w-4 h-4 text-[var(--d-faint)]" />}
            </button>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-[#0073ea1f]"><Smartphone className="w-5 h-5 text-[#0073ea]" /></span>
              <div className="flex-1 min-w-0"><div className="text-[15px] font-semibold text-[var(--d-text)]">Tener Doménica 27 como app</div><div className="text-[12px] text-[var(--d-muted)]">iPhone: Compartir › Agregar a inicio · Android: ⋮ › Instalar app</div></div>
            </div>
            <button onClick={salir} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
              <span className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-[#e2445c1f]"><LogOut className="w-5 h-5 text-[#e2445c]" /></span>
              <div className="flex-1 text-[15px] font-semibold text-[var(--d-danger)]">Cerrar sesión</div>
            </button>
          </div>
        </section>
        <p className="mt-6 text-center text-[11px] text-[var(--d-faint)]">Doménica 27 · parte de ARIA27</p>
      </div>
    </div>
  );
}
