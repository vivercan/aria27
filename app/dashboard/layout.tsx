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
  { name: "Build Desk", path: "/dashboard/build-desk", icon: HardHat, color: "from-amber-500 to-orange-600" },
  { name: "Talent Hub", path: "/dashboard/talent-hub", icon: Users, color: "from-violet-500 to-purple-600" },
  { name: "Supply Desk", path: "/dashboard/supply-desk", icon: ShoppingCart, color: "from-emerald-500 to-green-600" },
  { name: "Finance", path: "/dashboard/finance", icon: Wallet, color: "from-blue-500 to-cyan-600" },
  { name: "Asset", path: "/dashboard/asset", icon: Box, color: "from-rose-500 to-pink-600" },
  { name: "Templates", path: "/dashboard/templates", icon: FileText, color: "from-slate-400 to-slate-600" },
  { name: "Settings", path: "/dashboard/settings", icon: Settings, color: "from-zinc-500 to-zinc-700" },
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
    <div className="relative min-h-screen overflow-hidden">
      {/* ===== FONDO GLOBAL PREMIUM ===== */}
      {/* Capa 1: Base oscura */}
      <div className="fixed inset-0 z-0 bg-[#030712]" />
      
      {/* Capa 2: Degradado principal */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: "linear-gradient(135deg, #020617 0%, #0a0f1c 30%, #0c1929 50%, #0a1628 70%, #061224 100%)",
        }}
      />
      
      {/* Capa 3: Halo azul inferior derecho */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 90% 90%, rgba(0,71,255,0.15) 0%, rgba(0,50,180,0.08) 30%, transparent 60%)",
        }}
      />
      
      {/* Capa 4: Halo secundario */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.05) 0%, transparent 40%)",
        }}
      />
      
      {/* Capa 5: Noise texture */}
      <div 
        className="fixed inset-0 z-0 opacity-[0.012] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ===== CONTENIDO ===== */}
      <div className="relative z-10 flex min-h-screen">
        
        {/* ===== MOBILE MENU BUTTON ===== */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-white/10 backdrop-blur-xl border border-white/10 text-white"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* ===== SIDEBAR ===== */}
        <aside className={`
          fixed left-0 top-0 bottom-0 w-64 flex flex-col 
          bg-black/40 backdrop-blur-2xl 
          border-r border-white/[0.06]
          shadow-[4px_0_24px_-4px_rgba(0,0,0,0.3)]
          transition-transform duration-300 z-40
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-white/[0.06]">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/25">
              <span className="text-white font-bold text-lg">A</span>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-transparent to-white/20" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                ARIA
              </h1>
              <p className="text-[10px] text-white/40 tracking-[0.2em] font-medium">OPERATIONS OS</p>
            </div>
          </div>

          {/* Menu */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
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
                    outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50
                    ${isActive 
                      ? "bg-white/[0.08] text-white shadow-sm" 
                      : "text-white/55 hover:text-white hover:bg-white/[0.04]"
                    }
                  `}
                >
                  {/* Barra luminosa activa */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.7)]" />
                  )}
                  
                  {/* Icon con color en activo */}
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200
                    ${isActive 
                      ? `bg-gradient-to-br ${item.color} shadow-md` 
                      : "bg-white/[0.05] group-hover:bg-white/[0.08]"
                    }
                  `}>
                    <item.icon className={`w-4 h-4 ${isActive ? "text-white" : "text-white/70"}`} strokeWidth={2} />
                  </div>
                  
                  <span className="flex-1">{item.name}</span>
                  
                  {isActive && (
                    <ChevronRight className="w-4 h-4 text-white/40" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer sidebar */}
          <div className="px-4 py-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
              <p className="text-[10px] text-white/30 tracking-wide">
                ARIA v2025.1 · Production
              </p>
            </div>
          </div>
        </aside>

        {/* ===== OVERLAY MOBILE ===== */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ===== MAIN CONTENT ===== */}
        <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
          
          {/* ===== TOPBAR ===== */}
          <header className="sticky top-0 z-20 px-4 lg:px-6 py-4">
            <div className="flex items-center justify-between gap-4 px-4 lg:px-5 py-3 rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.06] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.2)]">
              {/* Search */}
              <div className="relative flex-1 max-w-md ml-10 lg:ml-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  placeholder="Buscar módulos, documentos..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-white/30 outline-none focus:border-blue-500/40 focus:bg-white/[0.06] focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {/* Date */}
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[11px] font-semibold text-white/70 tracking-wider">
                  {currentDate.day}
                </span>
                <span className="text-[11px] text-white/40">
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
                    <span className="text-[11px] text-white/40">{userRole}</span>
                  </div>
                </div>
                <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white text-sm font-semibold shadow-lg shadow-blue-500/20">
                  {userName.charAt(0)}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/20" />
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-all border border-transparent hover:border-white/10"
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
