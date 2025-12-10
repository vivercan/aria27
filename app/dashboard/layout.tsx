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
} from "lucide-react";

const menuItems = [
  { name: "Build Desk", path: "/dashboard/build-desk", icon: HardHat, color: "from-amber-500 to-orange-600" },
  { name: "Talent Hub", path: "/dashboard/talent-hub", icon: Users, color: "from-violet-500 to-purple-600" },
  { name: "Supply Desk", path: "/dashboard/supply-desk", icon: ShoppingCart, color: "from-emerald-500 to-green-600" },
  { name: "Finance", path: "/dashboard/finance", icon: Wallet, color: "from-blue-500 to-cyan-600" },
  { name: "Asset", path: "/dashboard/asset", icon: Box, color: "from-rose-500 to-pink-600" },
  { name: "Templates", path: "/dashboard/templates", icon: FileText, color: "from-slate-400 to-slate-600" },
  { name: "Settings", path: "/dashboard/settings", icon: Settings, color: "from-gray-500 to-gray-700" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState({ day: "", full: "" });
  const [userName] = useState("Admin");
  const [userRole] = useState("Administrador");

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
      {/* ===== FONDO GLOBAL ===== */}
      {/* Capa 1: Degradado base */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: "linear-gradient(135deg, #020617 0%, #020617 40%, #0a1628 60%, #0047FF 100%)",
        }}
      />
      
      {/* Capa 2: Halo radial inferior derecho */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse 80% 80% at 85% 80%, rgba(0,71,255,0.25) 0%, transparent 50%)",
        }}
      />
      
      {/* Capa 3: Noise texture */}
      <div 
        className="fixed inset-0 z-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ===== CONTENIDO ===== */}
      <div className="relative z-10 flex min-h-screen">
        
        {/* ===== SIDEBAR ===== */}
        <aside className="fixed left-0 top-0 bottom-0 w-64 flex flex-col bg-black/20 backdrop-blur-xl border-r border-white/[0.06]">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-white/[0.06]">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                ARIA
              </h1>
              <p className="text-[10px] text-white/40 tracking-widest">OPERATIONS OS</p>
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
                  className={`
                    group relative flex items-center gap-3 px-3 py-2.5 
                    text-sm font-medium rounded-xl
                    transition-all duration-200
                    outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50
                    ${isActive 
                      ? "bg-white/10 text-white" 
                      : "text-white/60 hover:text-white hover:bg-white/[0.05]"
                    }
                  `}
                >
                  {/* Barra luminosa activa */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                  )}
                  <item.icon className={`w-5 h-5 transition-colors ${isActive ? "text-blue-400" : ""}`} />
                  <span>{item.name}</span>
                  {isActive && (
                    <ChevronRight className="w-4 h-4 ml-auto text-white/30" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer sidebar */}
          <div className="px-4 py-4 border-t border-white/[0.06]">
            <p className="text-[10px] text-white/30 text-center">
              ARIA v2025.1 · Secure
            </p>
          </div>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <div className="flex-1 ml-64 flex flex-col min-h-screen">
          
          {/* ===== TOPBAR ===== */}
          <header className="sticky top-0 z-40 px-6 py-4">
            <div className="flex items-center justify-between gap-4 px-5 py-3 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] shadow-lg">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  placeholder="Buscar módulos, documentos..."
                  className="w-full pl-10 pr-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white placeholder-white/30 outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all"
                />
              </div>

              {/* Date */}
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs font-semibold text-white/80 tracking-wider">
                  {currentDate.day}
                </span>
                <span className="text-xs text-white/40">
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
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-white/40">{userRole}</span>
                  </div>
                </div>
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white text-sm font-semibold shadow-lg">
                  {userName.charAt(0)}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.05] transition-all"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

          {/* ===== PAGE CONTENT ===== */}
          <main className="flex-1 px-6 pb-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
