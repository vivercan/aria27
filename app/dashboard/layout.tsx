"use client";
import { clientLogger } from "@/lib/client-logger";
import AlertasGlobales from "@/components/AlertasGlobales";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import SeasonEffects from "@/components/SeasonEffects";
import PulsoMessenger from "@/components/pulso/PulsoMessenger";
import { canAccessModule, type UserPermissions } from "@/lib/permissions";
import {
  HardHat, Users, Package, Wallet, Warehouse, FileText, Settings, Search,
  ChevronRight, LogOut, MessageCircle, Moon, Sun, X, Briefcase, Bell, Menu
} from "lucide-react";

const menuItems = [
  { name: "Inbox", icon: Bell, href: "/dashboard/inbox" },
  { name: "Obras", icon: HardHat, href: "/dashboard/obras" },
  { name: "Talento", icon: Users, href: "/dashboard/talento" },
  { name: "Requisiciones", icon: Package, href: "/dashboard/requisiciones" },
  { name: "Finanzas", icon: Wallet, href: "/dashboard/finanzas" },
  { name: "Activos", icon: Warehouse, href: "/dashboard/activos" },
  { name: "Plantillas", icon: FileText, href: "/dashboard/plantillas" },
  { name: "AdministraciÃ³n", icon: Briefcase, href: "/dashboard/administracion" },
  { name: "ConfiguraciÃ³n", icon: Settings, href: "/dashboard/configuracion", hasSubmenu: true },
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

  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    if (!email) { router.push("/"); return; }
    setUserEmail(email);
    loadUser(email);
  }, [router]);

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
  const sidebarBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
  const headerBg = isDark ? "rgba(3,11,24,0.95)" : "rgba(255,255,255,0.92)";
  const navMuted = "#3d5470";
  const navActive = "#5b9bf8";

  return (
    <div
      className="min-h-screen relative"
      style={{ background: isDark ? "linear-gradient(155deg,#030b18 0%,#050e1f 55%,#040c1a 100%)" : colors.bgGradient }}
    >
      <SeasonEffects />

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/70 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* âââ Sidebar âââ */}
      <aside
        className={`fixed left-0 top-0 h-full w-[220px] flex flex-col z-40 transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
        style={{
          backgroundColor: sidebarBg,
          borderRight: `1px solid ${sidebarBorder}`,
        }}
      >
        {/* Brand */}
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: `1px solid ${sidebarBorder}` }}>
          <Link href="/dashboard" className="block">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[20px] font-black tracking-tight" style={{ color: "#2563eb" }}>ARIA</span>
              <span className="text-[20px] font-black tracking-tight" style={{ color: isDark ? "rgba(255,255,255,0.85)" : "#1e293b" }}>27</span>
            </div>
            <p className="text-[10px] font-medium tracking-[0.12em] mt-0.5 uppercase" style={{ color: navMuted }}>
              GCU Â· Avante
            </p>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto" style={{ overflowX: "hidden" }}>
          <div className="space-y-0.5 px-2">
            {menuItems.filter((item) => {
              if (item.href === "#pulso") return true;
              const moduleKey = item.href.replace("/dashboard/", "");
              return canAccessModule(userRole, userPermissions, moduleKey);
            }).map((item) => {
              const isActive = pathname.startsWith(item.href) && item.href !== "#pulso";
              const isPulso = item.href === "#pulso";
              const isItemActive = isPulso ? showPulso : isActive;

              const navStyle: React.CSSProperties = {
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: isItemActive ? 500 : 400,
                color: isItemActive ? navActive : navMuted,
                backgroundColor: isItemActive ? "rgba(37,99,235,0.12)" : "transparent",
                boxShadow: isItemActive ? "inset 3px 0 0 #2563eb" : "none",
                transition: "all 0.15s ease",
                textDecoration: "none",
                cursor: "pointer",
                border: "none",
                textAlign: "left",
              };

              if (isPulso) {
                return (
                  <button key={item.name} onClick={() => setShowPulso(!showPulso)} style={navStyle}>
                    <item.icon style={{ width: "16px", height: "16px", flexShrink: 0 }} />
                    <span>{item.name}</span>
                  </button>
                );
              }

              return (
                <Link key={item.name} href={item.href} onClick={() => setMobileOpen(false)} style={navStyle}>
                  <item.icon style={{ width: "16px", height: "16px", flexShrink: 0 }} />
                  <span className="truncate flex-1">{item.name}</span>
                  {item.hasSubmenu && <ChevronRight style={{ width: "12px", height: "12px", opacity: 0.4 }} />}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div
          className="px-5 py-3 flex items-center gap-2"
          style={{ borderTop: `1px solid ${sidebarBorder}` }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
            style={{ backgroundColor: "rgba(37,99,235,0.18)", color: "#5b9bf8" }}
          >
            {userName.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium truncate" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#1e293b" }}>
              {userName || "â"}
            </p>
            <p className="text-[10px] truncate" style={{ color: navMuted }}>
              {userRole === "admin" ? "Administrador" : "Usuario"}
            </p>
          </div>
          <button onClick={handleLogout} className="p-1.5 rounded-lg transition-opacity hover:opacity-70 flex-shrink-0" style={{ color: navMuted }}>
            <LogOut style={{ width: "13px", height: "13px" }} />
          </button>
        </div>
      </aside>

      {/* âââ Main âââ */}
      <main className="md:ml-[220px] relative z-10 h-screen flex flex-col overflow-hidden">

        {/* Header 52px */}
        <header
          className="sticky top-0 z-30 flex-shrink-0"
          style={{
            height: "52px",
            backgroundColor: headerBg,
            borderBottom: `1px solid ${sidebarBorder}`,
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center h-full px-5 gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-white/[0.06]"
              style={{ color: navMuted }}
              aria-label="Abrir menÃº"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search */}
            <div className="relative flex-1 md:w-72 md:flex-none">
              <div
                className="flex items-center gap-2 px-3 h-8 rounded-lg"
                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", border: `1px solid ${sidebarBorder}` }}
              >
                <Search style={{ width: "13px", height: "13px", color: navMuted, flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Buscar mÃ³dulos..."
                  className="bg-transparent outline-none text-[13px] w-full"
                  style={{ color: isDark ? "rgba(255,255,255,0.75)" : "#1e293b" }}
                  value={searchQuery}
                  onChange={(e) => {
                    const q = e.target.value;
                    setSearchQuery(q);
                    if (q.trim().length > 0) {
                      setSearchResults(searchableItems.filter(item =>
                        item.name.toLowerCase().includes(q.toLowerCase()) && item.href !== "#pulso"
                      ));
                    } else {
                      setSearchResults([]);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") { setSearchQuery(""); setSearchResults([]); }
                    if (e.key === "Enter" && searchResults.length > 0) {
                      router.push(searchResults[0].href);
                      setSearchQuery(""); setSearchResults([]);
                    }
                  }}
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(""); setSearchResults([]); }} style={{ color: navMuted }}>
                    <X style={{ width: "12px", height: "12px" }} />
                  </button>
                )}
              </div>
              {searchResults.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-xl border shadow-2xl z-50 overflow-hidden py-1"
                  style={{ backgroundColor: isDark ? "#070f1e" : "#ffffff", borderColor: sidebarBorder }}
                >
                  {searchResults.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                      className="flex items-center gap-3 px-4 py-2 text-[13px] transition-colors hover:bg-white/[0.04]"
                      style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#1e293b" }}
                    >
                      <item.icon style={{ width: "14px", height: "14px", color: "#3b82f6" }} />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <ThemeToggle />

              {/* Date */}
              <div className="hidden md:block text-right">
                <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: navMuted }} suppressHydrationWarning>
                  {new Date().toLocaleDateString("es-MX", { weekday: "long" })}
                </p>
                <p className="text-[11px] font-medium" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "#475569" }} suppressHydrationWarning>
                  {new Date().toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>

              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold"
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
