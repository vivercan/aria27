"use client";
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
  ChevronRight, LogOut, MessageCircle, Moon, Sun
} from "lucide-react";

const menuItems = [
  { name: "Obras", icon: HardHat, href: "/dashboard/obras" },
  { name: "Talento", icon: Users, href: "/dashboard/talento" },
  { name: "Requisiciones", icon: Package, href: "/dashboard/requisiciones" },
  { name: "Finanzas", icon: Wallet, href: "/dashboard/finanzas" },
  { name: "Activos", icon: Warehouse, href: "/dashboard/activos" },
  { name: "Plantillas", icon: FileText, href: "/dashboard/plantillas" },
  { name: "Configuración", icon: Settings, href: "/dashboard/configuracion", hasSubmenu: true },
  { name: "ARIA Pulso", icon: MessageCircle, href: "#pulso" },
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

  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    if (!email) { router.push("/"); return; }
    setUserEmail(email);
    loadUser(email);
  }, [router]);

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
      } catch (e) { console.error("Error heartbeat:", e); }
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
      
      {/* Sidebar */}
      <aside 
        className="fixed left-0 top-0 h-full w-[180px] flex flex-col z-40 border-r"
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
              <Link key={item.name} href={item.href}
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
          ARIA v2025.1 - Production
        </div>
      </aside>

      {/* Main */}
      <main className="ml-[180px] relative z-10 h-screen flex flex-col overflow-hidden">
        {/* Header */}
        <header 
          className="sticky top-0 z-30 backdrop-blur-md border-b"
          style={{ 
            backgroundColor: isDark ? "rgba(10,22,40,0.8)" : "rgba(255,255,255,0.9)",
            borderColor: colors.cardBorder 
          }}
        >
          <div className="flex items-center justify-between px-6 py-3">
            <div 
              className="flex items-center gap-2 px-3 py-2 rounded-lg w-80"
              style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : colors.card }}
            >
              <Search className="w-4 h-4" style={{ color: colors.textMuted }} />
              <input 
                type="text" 
                placeholder="Buscar módulos, documentos..." 
                className="bg-transparent outline-none text-sm w-full"
                style={{ color: colors.text }}
              />
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



