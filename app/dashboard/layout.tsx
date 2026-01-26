"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
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
      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
    >
      {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
    </button>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { theme, colors } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [showPulso, setShowPulso] = useState(false);

  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    if (!email) { router.push("/"); return; }
    setUserEmail(email);
    loadUser(email);
  }, [router]);

  const loadUser = async (email: string) => {
    const { data } = await supabase.from("users").select("*").eq("email", email).single();
    if (data) {
      setUserName(data.display_name || data.name || email);
      setUserRole(data.role || "user");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("userEmail");
    router.push("/");
  };

  const isLight = theme === "light";

  return (
    <div className={`min-h-screen bg-gradient-to-br ${colors.bgGradient}`}>
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-[180px] ${isLight ? "bg-white border-r border-slate-200" : "bg-[#0a1628] border-r border-white/10"} flex flex-col z-40`}>
        <div className="p-4 border-b border-white/10">
          <Link href="/dashboard">
            <h1 className="text-2xl font-black">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">ARIA</span>
            </h1>
            <p className={`text-[10px] uppercase tracking-wider ${isLight ? "text-slate-400" : "text-slate-500"}`}>Infinity Loop</p>
          </Link>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.href) && item.href !== "#pulso";
            const isPulso = item.href === "#pulso";

            if (isPulso) {
              return (
                <button key={item.name} onClick={() => setShowPulso(!showPulso)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${showPulso ? (isLight ? "bg-cyan-50 text-cyan-600" : "bg-cyan-500/20 text-cyan-400") : (isLight ? "text-slate-600 hover:bg-slate-100" : "text-slate-400 hover:bg-white/5")}`}>
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </button>
              );
            }

            return (
              <Link key={item.name} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${isActive ? (isLight ? "bg-cyan-50 text-cyan-600" : "bg-white/10 text-white") : (isLight ? "text-slate-600 hover:bg-slate-100" : "text-slate-400 hover:bg-white/5")}`}>
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
                {item.hasSubmenu && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className={`p-3 border-t ${isLight ? "border-slate-200" : "border-white/10"} text-xs ${isLight ? "text-slate-400" : "text-slate-500"}`}>
          ARIA v2025.1 - Production
        </div>
      </aside>

      {/* Main */}
      <main className="ml-[180px]">
        {/* Header */}
        <header className={`sticky top-0 z-30 ${isLight ? "bg-white/80 border-b border-slate-200" : "bg-[#0a1628]/80 border-b border-white/10"} backdrop-blur-md`}>
          <div className="flex items-center justify-between px-6 py-3">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isLight ? "bg-slate-100" : "bg-white/5"} w-80`}>
              <Search className={`w-4 h-4 ${isLight ? "text-slate-400" : "text-slate-500"}`} />
              <input type="text" placeholder="Buscar módulos, documentos..." className={`bg-transparent outline-none text-sm ${isLight ? "text-slate-700 placeholder:text-slate-400" : "text-white placeholder:text-slate-500"} w-full`} />
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="text-right">
                <p className={`text-xs ${isLight ? "text-slate-400" : "text-slate-500"} uppercase`}>
                  {new Date().toLocaleDateString("es-MX", { weekday: "long" }).toUpperCase()}
                </p>
                <p className={`text-sm ${isLight ? "text-slate-700" : "text-white"}`}>
                  {new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`text-sm font-medium ${isLight ? "text-slate-700" : "text-white"}`}>{userName}</p>
                  <p className={`text-xs ${colors.accent}`}>● {userRole === "admin" ? "Administrador" : "Usuario"}</p>
                </div>
                <div className={`w-10 h-10 rounded-full ${isLight ? "bg-cyan-100 text-cyan-600" : "bg-cyan-500/20 text-cyan-400"} flex items-center justify-center font-bold`}>
                  {userName.charAt(0).toUpperCase()}
                </div>
                <button onClick={handleLogout} className={`p-2 rounded-lg ${isLight ? "hover:bg-slate-100 text-slate-500" : "hover:bg-white/10 text-slate-400"}`}>
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6">{children}</div>
      </main>

      {/* Pulso Modal */}
      {showPulso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={`w-[400px] h-[600px] ${isLight ? "bg-white" : "bg-[#0a1628]"} rounded-2xl shadow-2xl p-4`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`font-bold ${isLight ? "text-slate-700" : "text-white"}`}>ARIA Pulso</h2>
              <button onClick={() => setShowPulso(false)} className={`${isLight ? "text-slate-500" : "text-slate-400"}`}>✕</button>
            </div>
            <p className={`text-sm ${isLight ? "text-slate-500" : "text-slate-400"}`}>Chat interno del equipo</p>
          </div>
        </div>
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
