"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  HardHat,
  Users,
  ShoppingCart,
  Wallet,
  Box,
  FileText,
  Settings,
  Search,
  LogOut,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

const menuItems = [
  { name: "Build Desk", path: "/dashboard/build-desk", icon: HardHat },
  { name: "Talent Hub", path: "/dashboard/talent-hub", icon: Users },
  { name: "Supply Desk", path: "/dashboard/supply-desk", icon: ShoppingCart },
  { name: "Finance", path: "/dashboard/finance", icon: Wallet },
  { name: "Asset", path: "/dashboard/asset", icon: Box },
  { name: "Templates", path: "/dashboard/templates", icon: FileText },
  { name: "Settings", path: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState({ day: "", full: "" });
  const [userName] = useState("Admin");
  const [userRole] = useState("Administrador");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const now = new Date();
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    setCurrentDate({
      day: days[now.getDay()].toUpperCase(),
      full: `${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`,
    });
  }, []);

  const handleLogout = () => {
    router.push("/");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020712]">
      {/* ===== FONDO TIMONFX - CAPAS ===== */}
      
      {/* Capa 1: Gradiente base ultra oscuro */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: "linear-gradient(145deg, #020617 0%, #020B2A 35%, #011229 55%, #0B2558 100%)",
        }}
      />
      
      {/* Capa 2: Halo metálico principal - Pantone 293C inspired */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 85% 85%, rgba(0,61,165,0.30) 0%, rgba(13,63,141,0.12) 40%, transparent 70%)",
        }}
      />
      
      {/* Capa 3: Halo secundario central */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(15,23,42,0.5) 0%, transparent 50%)",
        }}
      />
      
      {/* Capa 4: Accent cyan sutil */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 15% 15%, rgba(56,189,248,0.04) 0%, transparent 30%)",
        }}
      />
      
      {/* Capa 5: Noise texture - MUY sutil */}
      <div 
        className="fixed inset-0 z-0 opacity-[0.10] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ===== CONTENIDO z-10 ===== */}
      <div className="relative z-10 flex min-h-screen">
        
        {/* ===== MOBILE MENU BUTTON ===== */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-[rgba(8,16,30,0.9)] backdrop-blur-xl border border-white/10 text-white shadow-lg"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* ===== SIDEBAR TIMONFX ===== */}
        <aside className={`
          fixed left-0 top-0 bottom-0 w-64 flex flex-col 
          bg-[#02081F]/95 backdrop-blur-2xl 
          border-r border-white/[0.04]
          shadow-[4px_0_30px_-4px_rgba(0,0,0,0.5)]
          transition-transform duration-300 z-40
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-white/[0.04]">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-[#38BDF8] to-[#003DA5] shadow-lg shadow-blue-500/25">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                ARIA
              </h1>
              <p className="text-[10px] text-white/40 tracking-[0.2em] font-medium">OPERATIONS OS</p>
            </div>
          </div>

          {/* Menu */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    group relative flex items-center gap-3 px-3 py-2.5 
                    text-sm font-medium rounded-xl
                    transition-all duration-200
                    outline-none 
                    focus-visible:ring-2 focus-visible:ring-[#38BDF8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]
                    ${isActive 
                      ? "bg-white/[0.05] text-white" 
                      : "text-white/70 hover:text-white/90 hover:bg-white/[0.03]"
                    }
                  `}
                >
                  {/* Barra luminosa activa */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-[#38BDF8] to-[#003DA5] rounded-full shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
                  )}
                  
                  <item.icon className={`w-5 h-5 ${isActive ? "text-white" : "text-white/70"}`} strokeWidth={2} />
                  <span className="flex-1">{item.name}</span>
                  
                  {isActive && (
                    <ChevronRight className="w-4 h-4 text-white/40" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer sidebar */}
          <div className="px-4 py-4 border-t border-white/[0.04]">
            <div className="flex items-center gap-2 justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
              <p className="text-[10px] text-white/30 tracking-wide">
                ARIA v2025.1 · Production
              </p>
            </div>
          </div>
        </aside>

        {/* ===== OVERLAY MOBILE ===== */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ===== MAIN CONTENT ===== */}
        <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
          
          {/* ===== TOPBAR GLASS TIMONFX ===== */}
          <header className="sticky top-0 z-20 px-4 lg:px-6 py-4">
            <div className="
              flex items-center justify-between gap-4 
              px-5 py-3.5 
              rounded-2xl 
              bg-[rgba(8,16,30,0.85)] backdrop-blur-xl
              border border-white/[0.06]
              shadow-[0_18px_45px_rgba(0,0,0,0.55)]
            ">
              {/* Search */}
              <div className="relative flex-1 max-w-md ml-10 lg:ml-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Buscar módulos, documentos..."
                  className="
                    w-full pl-10 pr-4 py-2.5 
                    bg-white/[0.04] backdrop-blur
                    border border-white/[0.06] rounded-xl 
                    text-sm text-white placeholder-white/40 
                    outline-none 
                    focus:border-[#38BDF8]/40 focus:ring-1 focus:ring-[#38BDF8]/50 focus:bg-white/[0.06]
                    transition-all
                  "
                />
              </div>

              {/* Date */}
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[11px] font-semibold text-white/80 tracking-wider">
                  {currentDate.day}
                </span>
                <span className="text-[11px] text-white/50">
                  {currentDate.full}
                </span>
              </div>

              {/* Divider */}
              <div className="hidden md:block w-px h-8 bg-white/10" />

              {/* User */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-medium text-white/90">{userName}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                    <span className="text-[11px] text-white/50">{userRole}</span>
                  </div>
                </div>
                <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#38BDF8] to-[#003DA5] text-white text-sm font-semibold shadow-lg shadow-blue-500/20">
                  {userName.charAt(0)}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.05] transition-all border border-transparent hover:border-white/10"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

          {/* ===== PAGE CONTENT ===== */}
          <main className="flex-1 px-4 lg:px-6 pb-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
