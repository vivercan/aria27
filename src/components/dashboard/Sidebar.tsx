"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, HardHat, Users, Package, Wallet, Warehouse, FileText, Settings, LogOut, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

const menuItems = [
  { name: "Build Desk", href: "/dashboard/build-desk", icon: HardHat },
  { name: "Talent Hub", href: "/dashboard/talent-hub", icon: Users },
  { name: "Supply Desk", href: "/dashboard/supply-desk", icon: Package },
  { name: "Finance", href: "/dashboard/finance", icon: Wallet },
  { name: "Asset", href: "/dashboard/asset", icon: Warehouse },
  { name: "Templates", href: "/dashboard/templates", icon: FileText },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<string[]>(["Talent Hub", "Supply Desk"]);
  const toggleMenu = (name: string) => setOpenMenus((prev) => prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-56 bg-[#0a1628] border-r border-white/10 flex flex-col">
      <div className="flex items-center gap-2 h-16 px-4 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-3xl font-black tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">ARIA</span>
        </Link>
      </div>
      <p className="px-4 pt-1 text-[10px] text-slate-500 uppercase tracking-wider">Operations OS</p>
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.name}>
                <Link href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? "bg-blue-600/20 text-cyan-400" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-3 border-t border-white/10">
        <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <LogOut className="h-6 w-6" />
          <span className="text-sm">Cerrar Sesión</span>
        </Link>
      </div>
      <div className="px-4 py-2 text-[10px] text-slate-600">ARIA v2025.1 · Production</div>
    </aside>
  );
}
