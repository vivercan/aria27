"use client";
import { clientLogger } from "@/lib/client-logger";
import AlertasGlobales from "@/components/AlertasGlobales";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import SeasonEffects from "@/components/SeasonEffects";
import PulsoMessenger from "@/components/pulso/PulsoMessenger";
import { canAccessModule, type UserPermissions } from "@/lib/permissions";
import {
  HardHat, Users, Package, Wallet, Warehouse, FileText, Settings, Search,
  ChevronRight, LogOut, Power, MessageCircle, Moon, Sun, X, Briefcase, Bell, Menu
} from "lucide-react";
import React from "react";

const menuItems = [
  { name: "Inbox", icon: Bell, href: "/dashboard/inbox" },
  { name: "Obras", icon: HardHat, href: "/dashboard/obras" },
  { name: "Talento", icon: Users, href: "/dashboard/talento" },
  { name: "Requisiciones", icon: Package, href: "/dashboard/requisiciones" },
  { name: "Finanzas", icon: Wallet, href: "/dashboard/finanzas" },
  { name: "Activos", icon: Warehouse, href: "/dashboard/activos" },
  { name: "Plantillas", icon: FileText, href: "/dashboard/plantillas" },
  // ── grupo Administración ──
  { name: "Administración", icon: Briefcase, href: "/dashboard/administracion" },
  { name: "Comunicación", icon: MessageCircle, href: "/dashboard/comunicacion" },
  { name: "Configuración", icon: Settings, href: "/dashboard/configuracion", hasSubmenu: true },
  // ── herramientas ──
  { name: "ARIA Pulso", icon: MessageCircle, href: "#pulso" },
];

const searchableItems = [
  ...menuItems,
  { name: "Pipeline", icon: ChevronRight, href: "/dashboard/obras/pipeline" },
  { name: "Licitaciones", icon: ChevronRight, href: "/dashboard/obras/licitaciones" },
  { name: "Expedientes", icon: ChevronRight, href: "/dashboard/obras/expedientes" },
  { name: "Contratos", icon: ChevronRight, href: "/dashboard/obras/contratos" },
  { name: "SIROC Obras", icon: ChevronRight, href: "/dashboard/obras/siroc" },
  { name: "Presupuestos", icon: ChevronRight, href: "/dashboard/obras/presupuestos" },
  { name: "Inventario", icon: ChevronRight, href: "/dashboard/obras/inventario" },
  { name: "Concreto", icon: ChevronRight, href: "/dashboard/obras/concreto" },
  { name: "Planos", icon: ChevronRight, href: "/dashboard/obras/planos" },
  { name: "Tareas", icon: ChevronRight, href: "/dashboard/obras/tareas" },
  { name: "Fotos de Avance", icon: ChevronRight, href: "/dashboard/obras/fotos" },
  { name: "Personal", icon: ChevronRight, href: "/dashboard/talento/personal" },
  { name: "Usuarios", icon: ChevronRight, href: "/dashboard/talento/usuarios" },
  { name: "Asistencias", icon: ChevronRight, href: "/dashboard/talento/checadas" },
  { name: "Nomina", icon: ChevronRight, href: "/dashboard/talento/nomina" },
  { name: "Incidencias", icon: ChevronRight, href: "/dashboard/talento/incidencias" },
  { name: "Prestaciones", icon: ChevronRight, href: "/dashboard/talento/prestaciones" },
  { name: "Documentos Legales", icon: ChevronRight, href: "/dashboard/talento/legales" },
  { name: "Matriz Salarial", icon: ChevronRight, href: "/dashboard/talento/matriz" },
  { name: "Mis Documentos", icon: ChevronRight, href: "/dashboard/talento/documentos" },
  { name: "Requisiciones", icon: ChevronRight, href: "/dashboard/requisiciones/requisiciones" },
  { name: "Productos", icon: ChevronRight, href: "/dashboard/requisiciones/productos" },
  { name: "Proveedores", icon: ChevronRight, href: "/dashboard/requisiciones/proveedores" },
  { name: "Compras", icon: ChevronRight, href: "/dashboard/requisiciones/compras" },
  { name: "Pagos", icon: ChevronRight, href: "/dashboard/requisiciones/pagos" },
  { name: "Entregas", icon: ChevronRight, href: "/dashboard/requisiciones/entregas" },
  { name: "Prospeccion", icon: ChevronRight, href: "/dashboard/requisiciones/prospeccion" },
  { name: "Cotizaciones", icon: ChevronRight, href: "/dashboard/requisiciones/cotizaciones" },
  { name: "Documentacion Legal", icon: ChevronRight, href: "/dashboard/administracion/documentacion" },
  { name: "Polizas", icon: ChevronRight, href: "/dashboard/administracion/polizas" },
  { name: "Opiniones Cumplimiento", icon: ChevronRight, href: "/dashboard/administracion/opiniones" },
  { name: "Datos de Empresa", icon: ChevronRight, href: "/dashboard/administracion/empresa" },
  { name: "SUA Aportaciones", icon: ChevronRight, href: "/dashboard/administracion/sua" },
  { name: "SIROC Admin", icon: ChevronRight, href: "/dashboard/administracion/siroc" },
  { name: "Centro de Control Obras", icon: ChevronRight, href: "/dashboard/obras/control" },
  { name: "Avance Fisico", icon: ChevronRight, href: "/dashboard/obras/avance" },
  { name: "Catalogo Maestro Obras", icon: ChevronRight, href: "/dashboard/obras/catalogo" },
  { name: "SIROC IMSS", icon: ChevronRight, href: "/dashboard/obras/siroc/registros" },
  { name: "Control de Concreto", icon: ChevronRight, href: "/dashboard/obras/concreto/remisiones" },
  { name: "Tareas Asignadas", icon: ChevronRight, href: "/dashboard/talento/tareas" },
  { name: "Gastos de Obra", icon: ChevronRight, href: "/dashboard/finanzas/gastos-obra" },
  // 21-Abr-2026: atajos filtrados por metodo de pago (solicitud Osita Montalvo RH)
  { name: "Gastos Efectivo", icon: ChevronRight, href: "/dashboard/finanzas/gastos-obra?metodo=EFECTIVO" },
  { name: "Pagos Transferencia", icon: ChevronRight, href: "/dashboard/requisiciones/pagos?metodo=TRANSFERENCIA" },
  { name: "Costeo", icon: ChevronRight, href: "/dashboard/finanzas/costeo" },
  { name: "Facturacion", icon: ChevronRight, href: "/dashboard/finanzas/facturacion" },
  { name: "Caja Chica", icon: ChevronRight, href: "/dashboard/finanzas/caja" },
  { name: "Bancos", icon: ChevronRight, href: "/dashboard/finanzas/bancos" },
  { name: "Por Pagar", icon: ChevronRight, href: "/dashboard/finanzas/por-pagar" },
  { name: "Cobranza", icon: ChevronRight, href: "/dashboard/finanzas/cobranza" },
  { name: "SUA Infonavit", icon: ChevronRight, href: "/dashboard/finanzas/sua" },
  { name: "Ingreso Egresos", icon: ChevronRight, href: "/dashboard/finanzas/ingreso-egresos" },
  { name: "Catalogo Activos", icon: ChevronRight, href: "/dashboard/activos/catalogo" },
  { name: "Estado Activos", icon: ChevronRight, href: "/dashboard/activos/estado" },
  { name: "Asignacion Activos", icon: ChevronRight, href: "/dashboard/activos/asignacion" },
  { name: "Mantenimiento", icon: ChevronRight, href: "/dashboard/activos/mantenimiento" },
  { name: "Vehiculos", icon: ChevronRight, href: "/dashboard/activos/vehiculos" },
  { name: "General Configuracion", icon: ChevronRight, href: "/dashboard/configuracion/general" },
  { name: "Datos Maestros", icon: ChevronRight, href: "/dashboard/configuracion/maestros" },
  { name: "Correo", icon: ChevronRight, href: "/dashboard/configuracion/correo" },
  { name: "Alertas", icon: ChevronRight, href: "/dashboard/configuracion/alertas" },
  { name: "Recordatorios", icon: ChevronRight, href: "/dashboard/configuracion/recordatorios" },
  { name: "Dashboard CEO", icon: ChevronRight, href: "/dashboard/ceo" },
  { name: "KPIs Dirección", icon: ChevronRight, href: "/dashboard/ceo" },
  { name: "Clientes", icon: ChevronRight, href: "/dashboard/clientes" },
  { name: "Cotizaciones a Cliente", icon: ChevronRight, href: "/dashboard/clientes/cotizaciones" },
  { name: "Reportes", icon: ChevronRight, href: "/dashboard/reportes" },
  { name: "Reporte Cobranza Mensual", icon: ChevronRight, href: "/dashboard/reportes/cobranza-mensual" },
  { name: "Estado Cuenta Proveedor", icon: ChevronRight, href: "/dashboard/reportes/estado-cuenta-proveedor" },
  { name: "Nomina Semanal Reporte", icon: ChevronRight, href: "/dashboard/reportes/nomina-semanal" },
  { name: "Auditoría Sistema", icon: ChevronRight, href: "/dashboard/admin/auditoria" },
  { name: "Roles Permisos", icon: ChevronRight, href: "/dashboard/admin/roles" },
  { name: "WhatsApp Log", icon: ChevronRight, href: "/dashboard/whatsapp/log" },
  { name: "Importar CSV", icon: ChevronRight, href: "/dashboard/import" },
  // PL48 17-Abr-2026: rutas huérfanas indexadas (antes no buscables desde sidebar).
  // Plantillas sub-tipos
  { name: "Biblioteca Plantillas", icon: ChevronRight, href: "/dashboard/plantillas/biblioteca" },
  { name: "Plantillas Documentos", icon: ChevronRight, href: "/dashboard/plantillas/documentos" },
  { name: "Plantillas Órdenes", icon: ChevronRight, href: "/dashboard/plantillas/ordenes" },
  { name: "Plantillas Propuestas", icon: ChevronRight, href: "/dashboard/plantillas/propuestas" },
  // Talento sub-vistas
  { name: "Finiquitos", icon: ChevronRight, href: "/dashboard/talento/finiquitos" },
  { name: "Checadas Incompletas", icon: ChevronRight, href: "/dashboard/talento/checadas/incompletas" },
  { name: "Pre-nómina Semanal", icon: ChevronRight, href: "/dashboard/talento/nomina/pre-nomina" },
  { name: "Recibos de Nómina", icon: ChevronRight, href: "/dashboard/talento/nomina/recibos" },
  { name: "Nómina Manual", icon: ChevronRight, href: "/dashboard/talento/nomina/manual" },
  { name: "Histórico de Nómina", icon: ChevronRight, href: "/dashboard/talento/nomina/historico" },
  { name: "Aguinaldo", icon: ChevronRight, href: "/dashboard/talento/prestaciones/aguinaldo" },
  { name: "Incapacidades", icon: ChevronRight, href: "/dashboard/talento/prestaciones/incapacidades" },
  { name: "Préstamos", icon: ChevronRight, href: "/dashboard/talento/prestaciones/prestamos" },
  { name: "Vacaciones", icon: ChevronRight, href: "/dashboard/talento/prestaciones/vacaciones" },
  // Obras sub-vistas
  { name: "Bitácora Diaria", icon: ChevronRight, href: "/dashboard/obras/bitacora" },
  { name: "Estimaciones", icon: ChevronRight, href: "/dashboard/obras/estimaciones" },
  { name: "Reporte Ejecutivo Obra", icon: ChevronRight, href: "/dashboard/obras/reporte" },
  { name: "Kardex Movimientos", icon: ChevronRight, href: "/dashboard/obras/inventario/kardex" },
  { name: "SIROC Bimestrales", icon: ChevronRight, href: "/dashboard/obras/siroc/bimestrales" },
  // Finanzas sub-vistas
  { name: "Movimientos Bancarios", icon: ChevronRight, href: "/dashboard/finanzas/bancos/movimientos" },
  { name: "Cobros Manuales", icon: ChevronRight, href: "/dashboard/finanzas/cobranza/manual" },
  // Configuración sub-vistas
  { name: "Centros de Trabajo", icon: ChevronRight, href: "/dashboard/configuracion/maestros/centros" },
  { name: "Maestros Nómina", icon: ChevronRight, href: "/dashboard/configuracion/maestros/nomina" },
  // Admin y Comunicación
  { name: "Restaurar Sistema", icon: ChevronRight, href: "/dashboard/admin/restore" },
  { name: "Hub Comunicación", icon: ChevronRight, href: "/dashboard/comunicacion" },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-lg transition-colors"
      style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
    >
      {theme === "dark"
        ? <Sun className="w-4 h-4" style={{ color: "#f59e0b" }} />
        : <Moon className="w-4 h-4" style={{ color: "#4a6080" }} />}
    </button>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const log = clientLogger("DASHBOARD");
  const { theme, season, colors } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({});
  const [showPulso, setShowPulso] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof menuItems>([]);
  // Búsqueda global: resultados de datos (obras, requisiciones, clientes, etc.)
  interface GlobalResult { type: string; id: string; title: string; subtitle?: string; url: string; badge?: string; }
  const [globalResults, setGlobalResults] = useState<GlobalResult[]>([]);
  const globalSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [inboxUnread, setInboxUnread] = useState(0);
  /* Ref: true mientras el inbox page está montado — suspende el poll */
  const inboxActiveRef = useRef(false);
  const inboxVisitedRef = useRef(false);
  const lastImapCountRef = useRef<number>(-1);

  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    if (!email) { router.push("/"); return; }
    setUserEmail(email);
    loadUser(email);
  }, [router]);

  /* ── Polling no-leídos Inbox (cada 30s) — PAUSA si inbox/page está activo ── */
  useEffect(() => {
    const fetchUnread = async () => {
      if (inboxActiveRef.current) return; /* inbox/page lo gestiona via custom event */
      try {
        const r = await fetch("/api/mail/unread-count", { headers: { "x-user-email": (typeof window !== "undefined" ? localStorage.getItem("userEmail")||"" : "") } });
        if (r.ok) {
          const d = await r.json().catch(() => ({}));
          const serverCount = d.count || 0;
          if (!inboxVisitedRef.current) {
            /* inbox nunca visitado: solo guardar baseline, badge queda en 0
               (el raw IMAP no es confiable — emails leídos en app no sincronizan \Seen) */
            lastImapCountRef.current = serverCount;
          } else if (lastImapCountRef.current >= 0 && serverCount > lastImapCountRef.current) {
            /* IMAP subió → llegaron correos nuevos reales → incrementar badge */
            const delta = serverCount - lastImapCountRef.current;
            lastImapCountRef.current = serverCount;
            setInboxUnread(prev => prev + delta);
          } else {
            /* Sin correos nuevos → solo actualizar baseline, no tocar badge */
            lastImapCountRef.current = serverCount;
          }
        }
      } catch { /* silencioso */ }
    };
    fetchUnread();
    const iv = setInterval(fetchUnread, 30 * 1000);
    return () => clearInterval(iv);
  }, []);

  /* ── Actualización inmediata desde inbox/page (custom event) ── */
  useEffect(() => {
    const hUpdate = (e: Event) => {
      inboxActiveRef.current = true; /* inbox está activo → poll suspendido */
      inboxVisitedRef.current = true; /* inbox visitado → count preciso */
      const count = (e as CustomEvent<{count:number}>).detail?.count;
      if (typeof count === "number") setInboxUnread(count);
    };
    const hUnmount = () => { inboxActiveRef.current = false; }; /* inbox desmontado → poll reanuda */
    window.addEventListener("inboxUnreadUpdate", hUpdate);
    window.addEventListener("inboxUnmount", hUnmount);
    return () => {
      window.removeEventListener("inboxUnreadUpdate", hUpdate);
      window.removeEventListener("inboxUnmount", hUnmount);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.key !== "ArrowLeft") return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (pathname === "/dashboard") return;
      e.preventDefault();
      router.back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname, router]);

  /* ── Mobile drawer hardening 18-Abr-2026: ESC + body scroll lock ──
     Solo actúa cuando mobileOpen=true. Desktop no se entera. */
  useEffect(() => {
    if (!mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  /* ── Cerrar drawer móvil automáticamente al cambiar de ruta ──
     Cubre navegaciones vía Link sin onClick (ej. breadcrumbs internos, push programático). */
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!userEmail) return;
    const actualizarPresencia = async () => {
      try {
        await fetch("/api/pulso/estado", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail })
        });
      } catch (e: unknown) { log.error("Error heartbeat:", { data: e }); }
    };
    actualizarPresencia();
    const interval = setInterval(actualizarPresencia, 30000);
    return () => clearInterval(interval);
  }, [userEmail]);

  const loadUser = async (email: string) => {
    const { data } = await supabase.from("Users").select("*").eq("email", email).single();
    if (data) {
      setUserName(data.display_name || data.name || email);
      const userRoleValue = data.role || "user";
      setUserRole(userRoleValue);
      const perms = data.permissions || {};
      setUserPermissions(perms);
      localStorage.setItem("userRole", userRoleValue);
      localStorage.setItem("userPermissions", JSON.stringify(perms));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userPermissions");
    localStorage.removeItem("ariaSession");
    sessionStorage.removeItem("zohoCreds");
    router.push("/");
  };

  const isDark = theme === "dark";
  const sidebarBg = isDark ? "#030b18" : "#ffffff";
  const sidebarBorder = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";
  const headerBg = isDark ? "rgba(5,13,28,0.97)" : "rgba(255,255,255,0.94)";
  const navMuted = isDark ? "rgba(255,255,255,0.52)" : "#3d5470";
  /* 18-Abr-2026 PM: nav active — de azul eléctrico a azul gris sólido */
  const navActive = isDark ? "#c9d8ed" : "#4e6b87";

  /* Current top-level module name for header breadcrumb */
  const currentModule = menuItems.find(
    (item) => item.href !== "#pulso" && item.href !== "/dashboard" && pathname.startsWith(item.href)
  )?.name ?? "";

  return (
    <div
      className="min-h-screen relative"
      style={{ background: isDark ? "linear-gradient(155deg,#06152F 0%,#081E46 55%,#0A2450 100%)" : colors.bgGradient }}
    >
      <SeasonEffects />

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/70 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ─── Sidebar ─── */}
      <aside
        aria-label="Menú principal"
        className={`fixed left-0 top-0 h-full w-[220px] flex flex-col z-40 transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
        style={{
          backgroundColor: sidebarBg,
          borderRight: `1px solid ${sidebarBorder}`,
        }}
      >
        {/* ── Brand — 52px, matches main header ── */}
        <div
          className="flex-shrink-0 flex items-center px-5"
          style={{
            height: "52px",
            borderBottom: `1px solid ${sidebarBorder}`,
            /* 18-Abr-2026 PM: gradient azul eléctrico → slate corporate sutil */
            background: isDark
              ? "linear-gradient(180deg, rgba(78,107,135,0.22) 0%, transparent 100%)"
              : "transparent",
          }}
        >
          <Link href="/dashboard" className="block" style={{ textDecoration: "none" }}>
            <div className="flex items-baseline gap-0.5">
              {/* 19-Abr-2026: logo ARIA — azul sólido #2563EB como EXCEPCIÓN de branding.
                  El resto del sistema mantiene Steel Corporate (#7A95AE / #4E6B87); este
                  callsite del logo es identidad de marca y se destaca intencionalmente.
                  NO replicar #2563EB en otros callsites. */}
              <span style={{
                fontSize: "22px", fontWeight: 900, letterSpacing: "-0.04em",
                color: "#2563EB",
                textShadow: [
                  "0 -1px 0 rgba(180,205,255,0.35)",   /* filo superior ligero */
                  "0  1px 0 rgba(0,8,25,0.90)",        /* pared inferior sólida */
                ].join(", "),
              }}>
                ARIA
              </span>
              {/* 18-Abr-2026 PM: "27" — glow blanco eliminado, sombra sólida */}
              <span style={{
                fontSize: "22px", fontWeight: 900, letterSpacing: "-0.04em",
                color: isDark ? "#FFFFFF" : "#1e293b",
                textShadow: isDark
                  ? "0 1px 0 rgba(0,0,0,0.95), 0 -1px 0 rgba(255,255,255,0.25)"
                  : "0 1px 0 rgba(255,255,255,0.90), 0 -1px 0 rgba(0,0,0,0.20), 0 2px 4px rgba(0,0,0,0.18)",
              }}>
                27
              </span>
            </div>
            <p style={{
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.14em",
              marginTop: "1px",
              textTransform: "uppercase",
              color: isDark ? "rgba(148,190,245,0.72)" : "#4a6080",
            }}>
              GCU · Avante
            </p>
          </Link>
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 py-3 overflow-y-auto" style={{ overflowX: "hidden" }}>
          <div className="px-2" style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            {menuItems.filter((item) => {
              if (item.href === "#pulso") return true;
              const moduleKey = item.href.replace("/dashboard/", "");
              return canAccessModule(userRole, userPermissions, moduleKey);
            }).map((item) => {
              const isActive = pathname.startsWith(item.href) && item.href !== "#pulso";
              const isPulso = item.href === "#pulso";
              const isAdminGroup = item.name === "Administración";
              const isItemActive = isPulso ? showPulso : isActive;

              const navStyle: React.CSSProperties = {
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: isItemActive ? 600 : 400,
                color: isItemActive ? navActive : navMuted,
                /* 18-Abr-2026 PM: nav active bg azul eléctrico → slate corporate */
                backgroundColor: isItemActive
                  ? (isDark ? "rgba(78,107,135,0.40)" : "rgba(78,107,135,0.12)")
                  : "transparent",
                boxShadow: isItemActive ? "inset 3px 0 0 #7a95ae" : "none",
                transition: "all 0.15s ease",
                textDecoration: "none",
                cursor: "pointer",
                border: "none",
                textAlign: "left",
              };

              if (isPulso) {
                return (
                  <React.Fragment key={item.name}>
                    {/* Divider before ARIA Pulso */}
                    <div style={{
                      margin: "8px 10px 6px",
                      height: "1px",
                      background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
                    }} />
                    <button onClick={() => setShowPulso(!showPulso)} style={navStyle}>
                      <item.icon style={{ width: "15px", height: "15px", flexShrink: 0 }} />
                      <span>{item.name}</span>
                    </button>
                  </React.Fragment>
                );
              }

              const isInbox = item.href === "/dashboard/inbox";
              return (
                <React.Fragment key={item.name}>
                  {/* Labeled separator before Administración group */}
                  {isAdminGroup && (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      margin: "10px 10px 6px",
                    }}>
                      <div style={{
                        flex: 1,
                        height: "1px",
                        background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
                      }} />
                      <span style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: isDark ? "rgba(148,190,245,0.38)" : "#94a3b8",
                        flexShrink: 0,
                      }}>
                        Admin
                      </span>
                      <div style={{
                        flex: 1,
                        height: "1px",
                        background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
                      }} />
                    </div>
                  )}
                  <Link href={item.href} onClick={() => setMobileOpen(false)} style={navStyle}>
                    <item.icon style={{ width: "15px", height: "15px", flexShrink: 0 }} />
                    <span className="truncate flex-1">{item.name}</span>
                    {isInbox && inboxUnread > 0 && (
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "22px",
                        height: "22px",
                        padding: "0 6px",
                        borderRadius: "9999px",
                        background: "linear-gradient(160deg,#8E2929 0%,#5F1A1A 50%,#2E0C0C 100%)",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: 800,
                        lineHeight: 1,
                        flexShrink: 0,
                        boxShadow: "0 5px 16px rgba(200,15,15,0.65), 0 2px 5px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,200,200,0.30)",
                        border: "1.5px solid rgba(200,60,60,0.22)",
                        letterSpacing: "-0.3px",
                        textShadow: "0 1px 2px rgba(0,0,0,0.35)",
                      }}>
                        {inboxUnread > 99 ? "99+" : inboxUnread}
                      </span>
                    )}
                    {item.hasSubmenu && <ChevronRight style={{ width: "12px", height: "12px", opacity: 0.4 }} />}
                  </Link>
                </React.Fragment>
              );
            })}
          </div>
        </nav>

        {/* ── Search — sidebar bottom ── */}
        <div className="px-3 py-2 relative" style={{ borderTop: `1px solid ${sidebarBorder}` }}>
          <div
            className="flex items-center gap-2 px-3 h-8 rounded-lg"
            style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", border: `1px solid ${sidebarBorder}` }}
          >
            <Search style={{ width: "13px", height: "13px", color: navMuted, flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Buscar módulos..."
              className="bg-transparent outline-none text-[12px] w-full"
              style={{ color: isDark ? "rgba(255,255,255,0.70)" : "#1e293b" }}
              value={searchQuery}
              onChange={(e) => {
                const q = e.target.value;
                setSearchQuery(q);
                if (q.trim().length > 0) {
                  setSearchResults(searchableItems.filter(item =>
                    item.name.toLowerCase().includes(q.toLowerCase()) && item.href !== "#pulso"
                  ));
                  // Búsqueda global con debounce 250ms — datos reales (obras, requisiciones, clientes, etc.)
                  if (globalSearchTimerRef.current) clearTimeout(globalSearchTimerRef.current);
                  if (q.trim().length >= 2) {
                    globalSearchTimerRef.current = setTimeout(async () => {
                      try {
                        const r = await fetch(`/api/search/global?q=${encodeURIComponent(q.trim())}`);
                        const j = await r.json();
                        if (Array.isArray(j.results)) setGlobalResults(j.results as GlobalResult[]);
                      } catch {}
                    }, 250);
                  } else {
                    setGlobalResults([]);
                  }
                } else {
                  setSearchResults([]);
                  setGlobalResults([]);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setSearchQuery(""); setSearchResults([]); setGlobalResults([]); }
                if (e.key === "Enter" && searchResults.length > 0) {
                  router.push(searchResults[0].href);
                  setSearchQuery(""); setSearchResults([]); setGlobalResults([]);
                } else if (e.key === "Enter" && globalResults.length > 0) {
                  router.push(globalResults[0].url);
                  setSearchQuery(""); setSearchResults([]); setGlobalResults([]);
                }
              }}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setSearchResults([]); setGlobalResults([]); }} style={{ color: navMuted }}>
                <X style={{ width: "12px", height: "12px" }} />
              </button>
            )}
          </div>
          {/* dropdown abre hacia ARRIBA — muestra secciones: Pantallas + Datos */}
          {(searchResults.length > 0 || globalResults.length > 0) && (
            <div
              className="absolute bottom-full left-3 right-3 mb-1 rounded-xl border shadow-2xl z-50 overflow-hidden py-1 max-h-[60vh] overflow-y-auto"
              style={{ backgroundColor: isDark ? "#070f1e" : "#ffffff", borderColor: sidebarBorder }}
            >
              {searchResults.length > 0 && (
                <>
                  <div className="px-4 py-1 text-[10px] uppercase tracking-wider text-[#7f93b0] font-semibold">Pantallas</div>
                  {searchResults.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => { setSearchQuery(""); setSearchResults([]); setGlobalResults([]); }}
                      className="flex items-center gap-3 px-4 py-2 text-[12px] transition-colors hover:bg-white/[0.04]"
                      style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#1e293b" }}
                    >
                      <item.icon style={{ width: "13px", height: "13px", color: "#7a95ae" }} />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </>
              )}
              {globalResults.length > 0 && (
                <>
                  <div className="px-4 py-1 mt-1 text-[10px] uppercase tracking-wider text-[#7f93b0] font-semibold border-t border-white/[0.06]">Datos</div>
                  {globalResults.map((item) => (
                    <Link
                      key={`${item.type}-${item.id}`}
                      href={item.url}
                      onClick={() => { setSearchQuery(""); setSearchResults([]); setGlobalResults([]); }}
                      className="flex items-start gap-3 px-4 py-2 text-[12px] transition-colors hover:bg-white/[0.04]"
                      style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#1e293b" }}
                    >
                      <span className="flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white/[0.06] text-[#7a95ae] uppercase tracking-wider">
                        {item.badge}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{item.title}</div>
                        {item.subtitle && <div className="truncate text-[10px] text-[#7f93b0]">{item.subtitle}</div>}
                      </div>
                    </Link>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="px-5 py-3 flex items-center gap-2"
          style={{ borderTop: `1px solid ${sidebarBorder}` }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
            style={{ backgroundColor: "rgba(37,99,235,0.20)", color: "#5b9bf8" }}
          >
            {userName.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium truncate" style={{ color: isDark ? "rgba(255,255,255,0.75)" : "#1e293b" }}>
              {userName || "—"}
            </p>
            <p className="text-[10px] truncate" style={{ color: navMuted }}>
              {userRole === "admin" ? "Administrador" : "Usuario"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg flex-shrink-0 transition-all duration-150 hover:bg-red-500/20"
            style={{ color: "rgba(239,68,68,0.75)" }}
            title="Cerrar sesión"
          >
            <Power style={{ width: "18px", height: "18px" }} />
          </button>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <main
        className="md:ml-[220px] relative z-10 h-screen flex flex-col overflow-hidden"
        style={{ background: "transparent" }}
      >
        {/* ── Header 52px ── */}
        <header
          className="sticky top-0 z-30 flex-shrink-0"
          style={{
            height: "52px",
            backgroundColor: headerBg,
            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.09)"}`,
            backdropFilter: "blur(14px)",
          }}
        >
          <div className="flex items-center h-full px-5 gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-white/[0.06]"
              style={{ color: navMuted }}
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Current module indicator — desktop only */}
            {currentModule && (
              <span
                className="hidden md:block text-[13px] font-semibold"
                style={{
                  color: isDark ? "rgba(210,230,255,0.80)" : "#1e293b",
                  letterSpacing: "-0.01em",
                }}
              >
                {currentModule}
              </span>
            )}

            {/* Right group */}
            <div className="flex items-center gap-3 ml-auto">
              <ThemeToggle />

              {/* Date + Avatar — grouped pill container */}
              <div
                className="hidden md:flex items-center gap-2.5 px-3 rounded-xl"
                style={{
                  height: "34px",
                  background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                }}
              >
                <div suppressHydrationWarning style={{fontSize:11,fontWeight:600,whiteSpace:"nowrap",color:isDark?"rgba(195,220,255,0.75)":"#475569",letterSpacing:"0.02em",textTransform:"capitalize"}}>
                  {new Date().toLocaleDateString("es-MX",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}
                </div>
                
              </div>

              {/* Mobile avatar only */}
              <div
                className="w-8 h-8 rounded-full md:hidden flex items-center justify-center text-[12px] font-bold"
                style={{ backgroundColor: "rgba(37,99,235,0.18)", color: "#5b9bf8" }}
              >
                {userName.charAt(0).toUpperCase() || "U"}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">{children}</div>
      </main>

      <AlertasGlobales />
      {showPulso && userEmail && (
        <PulsoMessenger userEmail={userEmail} onClose={() => setShowPulso(false)} />
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <DashboardContent>{children}</DashboardContent>
    </ThemeProvider>
  );
}
