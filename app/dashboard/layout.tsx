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
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    // Generar fecha: "Lunes, 08 Diciembre 2025"
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const raw = date.toLocaleDateString('es-ES', options);
    setDateStr(raw.charAt(0).toUpperCase() + raw.slice(1));
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col m-4 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl z-20">
        <div className="p-8">
          <h2 className="text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">
            ARIA<span className="text-blue-500">27</span>
          </h2>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-hide">
          {menu.map((item) => {
             const isActive = pathname.startsWith(item.path);
             return (
              <Link key={item.path} href={item.path} 
                className={`flex items-center gap-4 px-4 py-3 text-sm font-medium rounded-xl transition-all ${isActive ? "bg-blue-600/20 text-white border border-blue-500/30" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
                <item.icon className={`w-5 h-5 ${isActive ? "text-blue-400" : "text-slate-500"}`} />
                {item.name}
              </Link>
             )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col my-4 mr-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden relative shadow-2xl z-10">
         {/* HEADER SUPERIOR */}
         <header className="h-20 flex items-center justify-between px-8 border-b border-white/5 bg-white/[0.02]">
            {/* Izquierda (Buscador decorativo) */}
            <div className="hidden md:flex items-center gap-3 text-slate-400 bg-black/20 px-4 py-2 rounded-full border border-white/5 w-64">
               <Search size={16} />
               <span className="text-sm text-slate-500">Buscar...</span>
            </div>

            {/* Derecha: Fecha + Usuario + Salir */}
            <div className="flex items-center gap-6">
               {/* FECHA (Separada 20px aprox del usuario) */}
               <div className="hidden md:flex items-center gap-2 text-slate-300 text-sm font-medium bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                  <Calendar size={14} className="text-blue-400" />
                  {dateStr}
               </div>

               <div className="h-8 w-[1px] bg-white/10" />

               {/* USUARIO */}
               <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-white leading-none">Deya Montalvo</p>
                    <p className="text-[11px] text-blue-400 font-medium mt-1">Administradora</p>
                  </div>
                  <UserCircle className="text-slate-200" size={32} />
               </div>

               <Link href="/" className="text-rose-400 hover:bg-rose-500/10 p-2 rounded-full transition-colors"><LogOut size={20}/></Link>
            </div>
         </header>

         <div className="flex-1 overflow-auto p-8 scrollbar-hide">
           {children}
        </div>
      </main>
    </div>
  )
}
