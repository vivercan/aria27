"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2, Users, ShoppingCart, Wallet, Warehouse,
  FileText, Settings, ChevronRight, Search, LogOut, Bell, MessageCircle
} from "lucide-react";
import dynamic from "next/dynamic";

const PulsoMessenger = dynamic(() => import("@/components/pulso/PulsoMessenger"), { ssr: false });

const menuItems = [
  { icon: Building2, label: "Obras", href: "/dashboard/obras" },
  { icon: Users, label: "Talento", href: "/dashboard/talento" },
  { icon: ShoppingCart, label: "Requisiciones", href: "/dashboard/requisiciones" },
  { icon: Wallet, label: "Finanzas", href: "/dashboard/finanzas" },
  { icon: Warehouse, label: "Activos", href: "/dashboard/activos" },
  { icon: FileText, label: "Plantillas", href: "/dashboard/plantillas" },
  { icon: Settings, label: "Configuración", href: "/dashboard/configuracion", hasSubmenu: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [showPulso, setShowPulso] = useState(false);
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState(0);

  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    if (!email) {
      router.push("/");
      return;
    }
    setUserEmail(email);

    fetch(`https://yhylkvpynzyorqortbkk.supabase.co/rest/v1/users?email=eq.${encodeURIComponent(email)}`, {
      headers: { "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo" }
    })
      .then(r => r.json())
      .then(data => {
        if (data?.[0]) {
          setUserName(data[0].display_name || data[0].name || "");
          setUserRole(data[0].role || "user");
        }
      });

    setCurrentDate(new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));

    // Verificar mensajes no leídos
    const checkMensajes = async () => {
      try {
        const res = await fetch(`/api/pulso?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        const total = (data.conversaciones || []).reduce((sum: number, c: any) => sum + (c.noLeidos || 0), 0);
        setMensajesNoLeidos(total);
      } catch {}
    };
    checkMensajes();
    const interval = setInterval(checkMensajes, 5000);
    return () => clearInterval(interval);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("userEmail");
    sessionStorage.removeItem("zohoCreds");
    router.push("/");
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      admin: "Administrador", validador: "Validador", compras: "Compras", direccion: "Dirección", user: "Usuario"
    };
    return roles[role] || role;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-[220px] bg-slate-900/80 backdrop-blur-xl border-r border-slate-700/50 flex flex-col z-40">
        {/* Logo */}
        <div className="p-5 border-b border-slate-700/50">
          <Link href="/dashboard" className="block">
            <h1 className="text-2xl font-black text-white tracking-tight">ARIA</h1>
            <p className="text-[10px] text-cyan-400 tracking-widest uppercase">Infinity Loop</p>
          </Link>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                <item.icon className="w-5 h-5" strokeWidth={1.5} />
                <span className="text-sm font-medium">{item.label}</span>
                {item.hasSubmenu && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}

          {/* ARIA Pulso */}
          <button
            onClick={() => setShowPulso(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-slate-400 hover:bg-slate-800/50 hover:text-white relative"
          >
            <MessageCircle className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-sm font-medium">ARIA Pulso</span>
            {mensajesNoLeidos > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {mensajesNoLeidos}
              </span>
            )}
          </button>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700/50">
          <p className="text-[10px] text-slate-500">ARIA v2025.1 · Production</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-[220px] min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
          <div className="flex items-center justify-between px-6 py-3">
            {/* Search */}
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar módulos, documentos..."
                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
              />
            </div>

            {/* Right */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase">{currentDate.split(",")[0]}</p>
                <p className="text-sm text-white">{currentDate.split(",").slice(1).join(",")}</p>
              </div>

              <div className="h-8 w-px bg-slate-700" />

              <button onClick={() => setShowPulso(true)} className="relative p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <MessageCircle className="w-5 h-5 text-slate-400" />
                {mensajesNoLeidos > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                    {mensajesNoLeidos}
                  </span>
                )}
              </button>

              <div className="h-8 w-px bg-slate-700" />

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm text-white font-medium">{userName}</p>
                  <p className="text-xs text-green-400 flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                    {getRoleLabel(userRole)}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-semibold">
                  {userName?.[0]?.toUpperCase() || "?"}
                </div>
                <button onClick={handleLogout} className="p-2 hover:bg-slate-800 rounded-lg transition-colors" title="Cerrar sesión">
                  <LogOut className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">{children}</div>
      </main>

      {/* Pulso Messenger Flotante */}
      {showPulso && userEmail && (
        <PulsoMessenger userEmail={userEmail} onClose={() => setShowPulso(false)} />
      )}
    </div>
  );
}

