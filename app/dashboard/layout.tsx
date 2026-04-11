"use client";
import AriaBackButton from "@/components/AriaBackButton";
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
  { name: "Administración", icon: Briefcase, href: "/dashboard/administracion" },
  { name: "Configuración", icon: Settings, href: "/dashboard/configuracion", hasSubmenu: true },
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
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "bg-white/10 hover:bg-white/20" : "bg-slate-200 hover:bg-slate-300"}`}
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
    >
      {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
    </button>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
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

  // Bug 6: Atajo global de regreso (Alt+Left) en todo el dashboard.
  // Ignora si el foco esta en un input/textarea/contenteditable para no pisar escritura.
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

  // HEARTBEAT: Actualizar last_seen cada 30 segundos para estado en línea real
  useEffect(() => {
    if (!userEmail) return;
    
    const actualizarPresencia = async () => {
      try {
        await fetch("/api/pulso/estado", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail })
        });
      } catch (e) { /* error handled */ }
    };

    // Actualizar inmediatamente al cargar
    actualizarPresencia();
    
    // Luego cada 30 segundos
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

  return (
    <div className={`min-h-screen bg-gradient-to-br ${colors.bgGradient} relative`}>
      <SeasonEffects />
      
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-[180px] flex flex-col z-40 border-r transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
        style={{
          backgroundColor: colors.sidebar,
          borderColor: colors.cardBorder
        }}
      >
        <div className="p-4" style={{ borderBottom: `1px solid ${colors.cardBorder}` }}>
          <Link href="/dashboard">
            <h1 className="text-2xl font-black">
              <span style={{ color: colors.accent }}>ARIA</span>
            </h1>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: colors.textMuted }}>Infinity Loop</p>
          </Link>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {menuItems.filter((item) => {
            if (item.href === "#pulso") return true;
            const moduleKey = item.href.replace("/dashboard/", "");
            return canAccessModule(userRole, userPermissions, moduleKey);
          }).map((item) => {
            const isActive = pathname.startsWith(item.href) && item.href !== "#pulso";
            const isPulso = item.href === "#pulso";

            if (isPulso) {
              return (
                <button key={item.name} onClick={() => setShowPulso(!showPulso)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all"
                  style={{ 
                    backgroundColor: showPulso ? colors.accentBg : "transparent",
                    color: showPulso ? colors.accent : colors.textMuted 
                  }}>
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </button>
              );
            }

            return (
              <Link key={item.name} href={item.href} onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all"
                style={{ 
                  backgroundColor: isActive ? colors.accentBg : "transparent",
                  color: isActive ? colors.accent : colors.textMuted 
                }}>
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
                {item.hasSubmenu && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 text-xs" style={{ borderTop: `1px solid ${colors.cardBorder}`, color: colors.textMuted }}>
          ARIA v2026.1 - Production
        </div>
      </aside>

      {/* Main */}
      <main className="md:ml-[180px] relative z-10 h-screen flex flex-col overflow-hidden">
        {/* Header */}
        <header 
          className="sticky top-0 z-30 backdrop-blur-md border-b"
          style={{ 
            backgroundColor: isDark ? "rgba(10,22,40,0.8)" : "rgba(255,255,255,0.9)",
            borderColor: colors.cardBorder 
          }}
        >
          <div className="flex items-center justify-between px-4 md:px-6 py-3 gap-2">
            <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-white/10" style={{ color: colors.text }} aria-label="Abrir menú">
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative flex-1 md:w-80 md:flex-none">
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : colors.card }}
              >
                <Search className="w-4 h-4" style={{ color: colors.textMuted }} />
                <input
                  type="text"
                  placeholder="Buscar módulos, documentos..."
                  className="bg-transparent outline-none text-sm w-full"
                  style={{ color: colors.text }}
                  value={searchQuery}
                  onChange={(e) => {
                    const q = e.target.value;
                    setSearchQuery(q);
                    if (q.trim().length > 0) {
                      const filtered = searchableItems.filter(item =>
                        item.name.toLowerCase().includes(q.toLowerCase()) && item.href !== "#pulso"
                      );
                      setSearchResults(filtered);
                    } else {
                      setSearchResults([]);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") { setSearchQuery(""); setSearchResults([]); }
                    if (e.key === "Enter" && searchResults.length > 0) {
                      router.push(searchResults[0].href);
                      setSearchQuery("");
                      setSearchResults([]);
                    }
                  }}
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(""); setSearchResults([]); }} className="p-0.5" style={{ color: colors.textMuted }}>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              {searchResults.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-lg z-50 overflow-hidden"
                  style={{ backgroundColor: colors.sidebar, borderColor: colors.cardBorder }}
                >
                  {searchResults.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:opacity-80"
                      style={{ color: colors.text }}
                    >
                      <item.icon className="w-4 h-4" style={{ color: colors.accent }} />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="text-right">
                <p className="text-xs uppercase" style={{ color: colors.textMuted }} suppressHydrationWarning>
             {new Date().toLocaleDateString("es-MX", { weekday: "long" }).toUpperCase()}
                </p>
                <p className="text-sm" style={{ color: colors.text }} suppressHydrationWarning>
                  {new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium" style={{ color: colors.text }}>{userName}</p>
                  <p className="text-xs" style={{ color: colors.accent }}>{userRole === "admin" ? "Administrador" : "Usuario"}</p>
                </div>
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                  style={{ backgroundColor: colors.accentBg, color: colors.accent }}
                >
                  {userName.charAt(0).toUpperCase()}
                </div>
                <button onClick={handleLogout} className="p-2 rounded-lg hover:opacity-80" style={{ color: colors.textMuted }}>
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">{children}</div>
      </main>

      {/* ARIA Pulso Messenger */}
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



