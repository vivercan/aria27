"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  HardHat, Users, ShoppingCart, PieChart, Truck, FileText, Settings,
  Search, LogOut, Calendar, UserCircle
} from "lucide-react";

const menu = [
  { name: "Build Desk", icon: HardHat, path: "/dashboard/build-desk" },
  { name: "Talent Hub", icon: Users, path: "/dashboard/talent-hub" },
  { name: "Supply Desk", icon: ShoppingCart, path: "/dashboard/supply-desk" },
  { name: "Finance", icon: PieChart, path: "/dashboard/finance" },
  { name: "Asset", icon: Truck, path: "/dashboard/asset" },
  { name: "Templates", icon: FileText, path: "/dashboard/templates" },
  { name: "Settings", icon: Settings, path: "/dashboard/settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [dateStr, setDateStr] = useState({ weekday: "", full: "" });

  useEffect(() => {
    const date = new Date();
    const weekday = date.toLocaleDateString('es-ES', { weekday: 'long' });
    const full = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    setDateStr({
      weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
      full: full.charAt(0).toUpperCase() + full.slice(1)
    });
  }, []);

  return (
    <div className="relative flex h-screen overflow-hidden">
      {/* FONDO PREMIUM - 5 capas como login */}
      <div className="absolute inset-0 z-0">
        {/* Capa 1: Degradado base */}
        <div 
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #020617 0%, #0f172a 40%, #1e3a5f 70%, #0066FF 100%)"
          }}
        />
        {/* Capa 2: Halo radial principal */}
        <div 
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 70% 80%, rgba(0,102,255,0.35) 0%, transparent 60%)"
          }}
        />
        {/* Capa 3: Halo secundario */}
        <div 
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at 90% 90%, rgba(59,130,246,0.25) 0%, transparent 40%)"
          }}
        />
        {/* Capa 4: Glow difuso */}
        <div 
          className="absolute bottom-0 right-0 w-[60%] h-[60%] opacity-40"
          style={{
            background: "radial-gradient(circle, rgba(0,102,255,0.4) 0%, transparent 70%)",
            filter: "blur(60px)"
          }}
        />
        {/* Capa 5: Noise texture */}
        <div 
          className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")"
          }}
        />
      </div>

      {/* Sidebar */}
      <aside className="relative z-20 w-56 flex flex-col m-3 bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {/* Logo ARIA27 */}
        <div className="p-6 pb-4">
          <h2 
            className="text-2xl font-black tracking-tight"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(148,163,184,0.8) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
            }}
          >
            ARIA<span style={{ color: "#3b82f6", WebkitTextFillColor: "#3b82f6" }}>27</span>
          </h2>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-hide">
          {menu.map((item) => {
            const isActive = pathname.startsWith(item.path);
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`group relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}
              >
                {/* Barra luminosa activa */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                )}
                <item.icon className={`w-5 h-5 transition-colors ${isActive ? "text-blue-400" : ""}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer sidebar */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
            <span>PROD</span>
            <span className="text-slate-600">|</span>
            <span>v2025.1</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col my-3 mr-3 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        {/* TOPBAR */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-white/[0.02] backdrop-blur-sm">
          {/* Buscador */}
          <div className="hidden md:flex items-center gap-2 text-slate-400 bg-black/30 px-4 py-2 rounded-xl border border-white/5 w-56 hover:border-white/10 transition-colors cursor-pointer">
            <Search size={14} className="text-slate-500" />
            <span className="text-sm text-slate-500">Buscar...</span>
          </div>

          {/* Derecha */}
          <div className="flex items-center gap-4">
            {/* Fecha en dos lineas */}
            <div className="hidden md:flex flex-col items-end text-right bg-white/5 px-4 py-1.5 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">{dateStr.weekday}</span>
              <span className="text-xs text-slate-300 font-medium">{dateStr.full}</span>
            </div>

            <div className="h-8 w-[1px] bg-white/10" />

            {/* Usuario */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-white leading-none">Deya Montalvo</p>
                <div className="flex items-center justify-end gap-1.5 mt-1">
                  <span className="text-[11px] text-blue-400 font-medium">Administradora</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]" />
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-blue-500/20">
                DM
              </div>
            </div>

            {/* Logout */}
            <Link 
              href="/" 
              className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 p-2 rounded-xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-rose-500/50 outline-none"
            >
              <LogOut size={18}/>
            </Link>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 scrollbar-hide">
          {children}
        </div>
      </main>
    </div>
  );
}
