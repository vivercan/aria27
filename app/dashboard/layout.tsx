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
    <div className="relative min-h-screen overflow-hidden bg-[#0f172a]">
      {/* ===== DEEP GLASS BACKGROUND ===== */}
      <div className="fixed inset-0 z-0 bg-[#0f172a]" />
      
      {/* Ambient blob 1 */}
      <div 
        className="fixed z-0 pointer-events-none"
        style={{
          width: '800px',
          height: '800px',
          top: '-200px',
          left: '-200px',
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      
      {/* Ambient blob 2 */}
      <div 
        className="fixed z-0 pointer-events-none"
        style={{
          width: '1000px',
          height: '1000px',
          bottom: '-300px',
          right: '-200px',
          background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(59,130,246,0.08) 40%, transparent 70%)',
          filter: 'blur(100px)',
        }}
      />

      {/* ===== CONTENIDO z-10 ===== */}
      <div className="relative z-10 flex min-h-screen">
        
        {/* MOBILE MENU */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 text-white shadow-lg"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* ===== SIDEBAR ===== */}
        <aside className={`
          fixed left-0 top-0 bottom-0 w-64 flex flex-col 
          bg-[#0a0f1a]/90 backdrop-blur-2xl 
          border-r border-white/[0.06]
          transition-transform duration-300 z-40
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-white/[0.06]">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/15 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white tracking-tight">ARIA</h1>
              <p className="text-[10px] text-slate-400 tracking-[0.2em] font-medium">OPERATIONS OS</p>
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
                    group relative flex items-center gap-3 px-4 py-3 
                    text-sm font-medium rounded-2xl
                    transition-all duration-300
                    outline-none 
                    focus-visible:ring-2 focus-visible:ring-blue-500/50
                    ${isActive 
                      ? "bg-white/[0.08] text-white shadow-[0_0_20px_rgba(59,130,246,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]" 
                      : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                    }
                  `}
                >
                  {isActive && (
                    <>
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 bg-gradient-to-b from-blue-400 to-purple-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-transparent" />
                    </>
                  )}
                  <item.icon className={`relative z-10 w-5 h-5 ${isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"}`} strokeWidth={1.75} />
                  <span className="relative z-10 flex-1">{item.name}</span>
                  {isActive && <ChevronRight className="relative z-10 w-4 h-4 text-slate-500" />}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-4 py-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 justify-center">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <p className="text-[10px] text-slate-500 tracking-wide">ARIA v2025.1 · Production</p>
            </div>
          </div>
        </aside>

        {/* OVERLAY */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ===== MAIN ===== */}
        <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
          
          {/* ===== TOPBAR MÁS VISIBLE ===== */}
          <header className="sticky top-0 z-20 px-4 lg:px-6 py-4">
            <div className="
              flex items-center justify-between gap-4 
              px-5 py-3.5 
              rounded-2xl 
              bg-slate-900/80 backdrop-blur-xl
              border border-white/[0.12]
              shadow-[0_8px_32px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.3)]
            ">
              {/* Search */}
              <div className="relative flex-1 max-w-md ml-10 lg:ml-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar módulos, documentos..."
                  className="
                    w-full pl-10 pr-4 py-2.5 
                    bg-white/[0.06] backdrop-blur
                    border border-white/[0.10] rounded-xl 
                    text-sm text-white placeholder-slate-400 
                    outline-none 
                    focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 focus:bg-white/[0.08]
                    transition-all
                  "
                />
              </div>

              {/* Date */}
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[11px] font-semibold text-white tracking-wider">{currentDate.day}</span>
                <span className="text-[11px] text-slate-300">{currentDate.full}</span>
              </div>

              <div className="hidden md:block w-px h-8 bg-white/15" />

              {/* User */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-medium text-white">{userName}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                    <span className="text-[11px] text-slate-300">{userRole}</span>
                  </div>
                </div>
                <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/15 text-white text-sm font-semibold shadow-[0_0_15px_rgba(59,130,246,0.25)]">
                  {userName.charAt(0)}
                </div>
                <button onClick={handleLogout} className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all border border-transparent hover:border-white/15" title="Cerrar sesión">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

          {/* PAGE CONTENT */}
          <main className="flex-1 px-4 lg:px-6 pb-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
