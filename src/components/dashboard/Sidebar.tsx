"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  HardHat,
  Users,
  Package,
  Wallet,
  Warehouse,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const menuItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    name: "Build Desk",
    href: "/dashboard/build-desk",
    icon: HardHat,
    submenu: [
      { name: "Proyectos", href: "/dashboard/build-desk/projects" },
      { name: "Avances", href: "/dashboard/build-desk/progress" },
    ],
  },
  {
    name: "Talent Hub",
    href: "/dashboard/talent-hub",
    icon: Users,
    submenu: [
      { name: "Colaboradores", href: "/dashboard/talent-hub/people" },
      { name: "Usuarios", href: "/dashboard/talent-hub/users" },
      { name: "Clock-In", href: "/dashboard/talent-hub/clock-in" },
    ],
  },
  {
    name: "Supply Desk",
    href: "/dashboard/supply-desk",
    icon: Package,
    submenu: [
      { name: "Requisiciones", href: "/dashboard/supply-desk/requisitions" },
      { name: "Ordenes de Compra", href: "/dashboard/supply-desk/orders" },
      { name: "Proveedores", href: "/dashboard/supply-desk/suppliers" },
    ],
  },
  { name: "Finance", href: "/dashboard/finance", icon: Wallet },
  { name: "Asset", href: "/dashboard/asset", icon: Warehouse },
  { name: "Templates", href: "/dashboard/templates", icon: FileText },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  const toggleMenu = (name: string) => {
    setOpenMenus((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]
    );
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-[#02081F]/95 border-r border-white/5">
      {/* Barra luminosa superior */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500" />
      
      {/* LOGO SIMPLIFICADO - Solo texto ARIA */}
      <div className="flex items-center justify-center h-20 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span 
            className="text-4xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #38BDF8 0%, #2563EB 50%, #1E40AF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 30px rgba(56, 189, 248, 0.3)'
            }}
          >
            ARIA
          </span>
        </Link>
      </div>

      {/* Menú */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const isOpen = openMenus.includes(item.name);
            const hasSubmenu = item.submenu && item.submenu.length > 0;

            return (
              <li key={item.name}>
                {hasSubmenu ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item.name)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                        active
                          ? "bg-gradient-to-r from-blue-600/20 to-cyan-600/10 text-cyan-400 border border-cyan-500/20"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        {item.name}
                      </div>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    {isOpen && (
                      <ul className="mt-1 ml-4 pl-4 border-l border-white/10 space-y-1">
                        {item.submenu.map((sub) => (
                          <li key={sub.name}>
                            <Link
                              href={sub.href}
                              className={`block px-4 py-2 rounded-lg text-sm transition-all ${
                                pathname === sub.href
                                  ? "text-cyan-400 bg-cyan-500/10"
                                  : "text-slate-500 hover:text-white hover:bg-white/5"
                              }`}
                            >
                              {sub.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      active
                        ? "bg-gradient-to-r from-blue-600/20 to-cyan-600/10 text-cyan-400 border border-cyan-500/20"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout - CAMBIO 5: Icono más grande */}
      <div className="p-4 border-t border-white/5">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="h-6 w-6" />
          <span className="text-sm font-medium">Cerrar Sesión</span>
        </Link>
      </div>
    </aside>
  );
}
