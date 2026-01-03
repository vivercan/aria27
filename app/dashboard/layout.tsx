"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
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
  { name: "Obras", path: "/dashboard/obras", icon: HardHat },
  { name: "Talento", path: "/dashboard/talento", icon: Users },
  { name: "Requisiciones", path: "/dashboard/requisiciones", icon: ShoppingCart },
  { name: "Finanzas", path: "/dashboard/Finanzas", icon: Wallet },
  { name: "Activos", path: "/dashboard/Activos", icon: Box },
  { name: "Plantillas", path: "/dashboard/Plantillas", icon: FileText },
  { name: "Configuración", path: "/dashboard/configuracion", icon: Settings },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  validador: "Validador", 
  compras: "Compras",
  operacion: "Operación",
  user: "Usuario",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState({ day: "", full: "" });
  const [userName, setUserName] = useState("Cargando...");
  const [userRole, setUserRole] = useState("");
  const [userInitial, setUserInitial] = useState("?");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Fecha
    const now = new Date();
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    setCurrentDate({
      day: days[now.getDay()].toUpperCase(),
      full: `${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`,
    });

    // Obtener usuario de localStorage
    const loadUser = async () => {
      const storedEmail = localStorage.getItem("userEmail");
      if (storedEmail) {
        const { data: user } = await supabase
          .from("Users")
          .select("display_name, name, role")
          .eq("email", storedEmail)
          .single();
        
        if (user) {
          const displayName = user.display_name || user.name || "Usuario";
          setUserName(displayName);
          setUserRole(ROLE_LABELS[user.role] || user.role);
          setUserInitial(displayName.charAt(0).toUpperCase());
        }
      } else {
        // Si no hay email, usar default para demo
        setUserName("Deya Montalvo");
        setUserRole("Administrador");
        setUserInitial("D");
      }
    };
    loadUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("userEmail");
    router.push("/");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0f1a]">
      {/* ===== FONDO AZUL BRILLANTE ===== */}
      <div className="fixed inset-0 z-0 bg-[#0a0f1a]" />
      <div
        className="fixed z-0 pointer-events-none"
        style={{
          width: '100%',
          height: '100%',
          top: 0,
          right: 0,
          background: 'linear-gradient(135deg, #0a0f1a 0%, #0a0f1a 30%, #0066CC 70%, #0055BB 100%)',
        }}
      />
      <div
        className="fixed z-0 pointer-events-none"
        style={{
          width: '60%',
          height: '100%',
          top: 0,
          right: 0,
          background: 'linear-gradient(90deg, transparent 0%, #0066DD 60%, #0077EE 100%)',
          opacity: 0.8,
        }}
      />

      {/* ===== CONTENIDO z-10 ===== */}
      <div className="relative z-10 flex min-h-screen">
        {/* MOBILE MENU */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-white/10 backdrop-blur-xl border border-white/15 text-white shadow-lg"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* ===== SIDEBAR OSCURO ===== */}
        <aside className={`
          fixed left-0 top-0 bottom-0 w-64 flex flex-col
          bg-[#0a0f1a]/98 backdrop-blur-2xl
          border-r border-white/[0.06]
          transition-transform duration-300 z-40
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* LOGO */}
          <div className="flex items-center gap-4 px-6 py-7 border-b border-white/[0.06]">
            <div>
              <h1 className="text-4xl font-black text-white tracking-tight" style={{textShadow: '0 0 20px rgba(34,211,238,0.6), 0 0 40px rgba(34,211,238,0.3)'}}>
                ARIA
              </h1>
              <p className="text-[10px] text-white/90 tracking-[0.15em] font-medium mt-0.5" style={{textShadow: '0 0 10px rgba(255,255,255,0.5)'}}>INFINITY LOOP</p>
            </div>
          </div>

          {/* Menu */}
          <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    group relative flex items-center gap-3 px-4 py-3
                    text-sm font-medium rounded-xl
                    transition-all duration-300
                    outline-none
                    focus-visible:ring-2 focus-visible:ring-blue-500/50
                    ${isActive
                      ? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                    }
                  `}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
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
          {/* ===== TOPBAR ===== */}
          <header className="sticky top-0 z-20 px-4 lg:px-6 py-4">
            <div className="flex items-center justify-between gap-4 px-5 py-3.5 rounded-2xl bg-[#0a0f1a]/90 backdrop-blur-xl border border-white/[0.10] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              {/* Search */}
              <div className="relative flex-1 max-w-md ml-10 lg:ml-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar módulos, documentos..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white/[0.06] border border-white/[0.10] rounded-xl text-sm text-white placeholder-slate-400 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
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
                <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400/30 to-blue-600/30 border border-white/15 text-white text-sm font-semibold">
                  {userInitial}
                </div>
                <button onClick={handleLogout} className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all" title="Cerrar sesión">
                  <LogOut className="w-5 h-5" />
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


