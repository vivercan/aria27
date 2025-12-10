# ========================================
# ARIA27 - DISEÑO FINAL 10/10 CON ICONOS PREMIUM
# ========================================

cd "D:\aria27"

# ========================================
# 1. COMPONENTE ModuleCard MEJORADO
# ========================================
@'
"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: string;
  badge?: string;
  badgeColor?: string;
  disabled?: boolean;
}

export function ModuleCard({ 
  title, 
  description, 
  icon: Icon, 
  href, 
  color, 
  badge, 
  badgeColor = "bg-white/10 text-white/70",
  disabled 
}: ModuleCardProps) {
  const cardContent = (
    <div className={`
      group relative overflow-hidden rounded-2xl 
      border border-white/[0.08] 
      bg-gradient-to-br from-slate-800/50 to-slate-900/50
      backdrop-blur-xl
      p-5 h-full min-h-[140px]
      shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)]
      transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]
      ${disabled 
        ? 'opacity-40 cursor-not-allowed grayscale' 
        : 'cursor-pointer hover:-translate-y-1.5 hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-white/[0.15] active:translate-y-0 active:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.3)]'
      }
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
    `}>
      {/* Gradient glow on hover */}
      <div className={`absolute -inset-px bg-gradient-to-br ${color} opacity-0 group-hover:opacity-[0.12] transition-opacity duration-500 rounded-2xl blur-sm`} />
      
      {/* Top shine line */}
      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header: Icon + Badge */}
        <div className="flex items-start justify-between mb-4">
          {/* Icon Badge */}
          <div className={`
            relative flex items-center justify-center 
            w-11 h-11 rounded-xl 
            bg-gradient-to-br ${color}
            shadow-lg shadow-black/30
            transition-all duration-300
            group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-black/40
            before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-t before:from-black/20 before:to-transparent
            after:absolute after:inset-[1px] after:rounded-[10px] after:bg-gradient-to-b after:from-white/20 after:to-transparent after:opacity-60
          `}>
            <Icon className="relative z-10 h-5 w-5 text-white drop-shadow-sm" strokeWidth={2} />
          </div>
          
          {/* Badge */}
          {badge && (
            <span className={`
              inline-flex items-center px-2.5 py-1 rounded-full 
              text-[10px] font-semibold tracking-wide uppercase
              ${badgeColor}
              border border-white/10
              shadow-sm
            `}>
              {badge}
            </span>
          )}
        </div>
        
        {/* Title */}
        <h3 className="text-[15px] font-semibold text-white/95 leading-tight mb-1.5 group-hover:text-white transition-colors">
          {title}
        </h3>
        
        {/* Description */}
        <p className="text-[13px] text-white/45 leading-relaxed group-hover:text-white/55 transition-colors">
          {description}
        </p>
      </div>
      
      {/* Bottom gradient line on hover */}
      <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${color} opacity-0 group-hover:opacity-60 transition-opacity duration-300`} />
    </div>
  );

  if (disabled) {
    return cardContent;
  }

  return (
    <Link href={href} className="block focus:outline-none">
      {cardContent}
    </Link>
  );
}
'@ | Set-Content "src\components\dashboard\ModuleCard.tsx" -Encoding UTF8

Write-Host "✓ ModuleCard.tsx mejorado" -ForegroundColor Green

# ========================================
# 2. COMPONENTE ModuleHeader MEJORADO
# ========================================
@'
"use client";

interface ModuleHeaderProps {
  title: string;
  subtitle: string;
}

export function ModuleHeader({ title, subtitle }: ModuleHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-white tracking-tight mb-2 drop-shadow-sm">
        {title}
      </h1>
      <p className="text-base text-white/50 font-medium">
        {subtitle}
      </p>
    </div>
  );
}
'@ | Set-Content "src\components\dashboard\ModuleHeader.tsx" -Encoding UTF8

Write-Host "✓ ModuleHeader.tsx mejorado" -ForegroundColor Green

# ========================================
# 3. COMPONENTE ModuleGrid MEJORADO
# ========================================
@'
"use client";

import { ReactNode } from "react";

interface ModuleGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}

export function ModuleGrid({ children, columns = 3 }: ModuleGridProps) {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4 lg:gap-5`}>
      {children}
    </div>
  );
}
'@ | Set-Content "src\components\dashboard\ModuleGrid.tsx" -Encoding UTF8

Write-Host "✓ ModuleGrid.tsx mejorado" -ForegroundColor Green

# ========================================
# 4. LAYOUT DASHBOARD MEJORADO
# ========================================
@'
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
'@ | Set-Content "app\dashboard\layout.tsx" -Encoding UTF8

Write-Host "✓ layout.tsx mejorado con diseño premium" -ForegroundColor Green

# ========================================
# 5. SUPPLY DESK PAGE - DISEÑO FINAL
# ========================================
@'
"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { 
  FileCheck,
  Package,
  Users,
  ClipboardList,
  Truck,
  Settings,
  ShoppingCart,
  CreditCard
} from "lucide-react";

const modules = [
  { 
    title: "Requisiciones", 
    description: "Solicitudes de materiales para obra.", 
    icon: FileCheck, 
    href: "/dashboard/supply-desk/requisitions", 
    color: "from-emerald-500 to-emerald-600",
    badge: "Activo",
    badgeColor: "bg-emerald-500/20 text-emerald-300"
  },
  { 
    title: "Inventario", 
    description: "Control de stock y almacén.", 
    icon: Package, 
    href: "/dashboard/supply-desk/inventory", 
    color: "from-blue-500 to-blue-600" 
  },
  { 
    title: "Maestro Proveedores", 
    description: "Catálogo de proveedores.", 
    icon: Users, 
    href: "/dashboard/supply-desk/vendors", 
    color: "from-violet-500 to-violet-600",
    badge: "CRUD",
    badgeColor: "bg-violet-500/20 text-violet-300"
  },
  { 
    title: "Órdenes de Compra", 
    description: "Gestión de órdenes autorizadas.", 
    icon: ClipboardList, 
    href: "/dashboard/supply-desk/requisitions/orders", 
    color: "from-amber-500 to-amber-600" 
  },
  { 
    title: "Compras", 
    description: "Cotizaciones y comparativas.", 
    icon: ShoppingCart, 
    href: "/dashboard/supply-desk/requisitions/purchasing", 
    color: "from-cyan-500 to-cyan-600" 
  },
  { 
    title: "Pagos", 
    description: "Control de pagos a proveedores.", 
    icon: CreditCard, 
    href: "/dashboard/supply-desk/payments", 
    color: "from-rose-500 to-rose-600" 
  },
  { 
    title: "Logística", 
    description: "Entregas y seguimiento.", 
    icon: Truck, 
    href: "/dashboard/supply-desk/delivery", 
    color: "from-teal-500 to-teal-600" 
  },
  { 
    title: "Configuración", 
    description: "Ajustes del módulo.", 
    icon: Settings, 
    href: "/dashboard/supply-desk/settings", 
    color: "from-slate-500 to-slate-600" 
  },
];

export default function SupplyDeskPage() {
  return (
    <div>
      <ModuleHeader 
        title="Supply Desk" 
        subtitle="Gestión de compras, inventario y proveedores."
      />
      <ModuleGrid columns={4}>
        {modules.map((mod, idx) => (
          <ModuleCard
            key={idx}
            title={mod.title}
            description={mod.description}
            icon={mod.icon}
            href={mod.href}
            color={mod.color}
            badge={mod.badge}
            badgeColor={mod.badgeColor}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\supply-desk\page.tsx" -Encoding UTF8

Write-Host "✓ supply-desk/page.tsx finalizado" -ForegroundColor Green

# ========================================
# 6. BUILD DESK PAGE - DISEÑO FINAL
# ========================================
@'
"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { 
  Briefcase, 
  FileSearch, 
  PackageCheck, 
  Scale, 
  ClipboardCheck, 
  Calculator 
} from "lucide-react";

const modules = [
  { 
    title: "Obra Pipeline", 
    description: "Seguimiento de proyectos activos.", 
    icon: Briefcase, 
    href: "/dashboard/build-desk/pipeline", 
    color: "from-amber-500 to-orange-600",
    badge: "5 obras",
    badgeColor: "bg-amber-500/20 text-amber-300"
  },
  { 
    title: "Tender Hub", 
    description: "Gestión de licitaciones.", 
    icon: FileSearch, 
    href: "/dashboard/build-desk/tender", 
    color: "from-blue-500 to-blue-600" 
  },
  { 
    title: "Packing List", 
    description: "Control de envíos y materiales.", 
    icon: PackageCheck, 
    href: "/dashboard/build-desk/packing", 
    color: "from-emerald-500 to-emerald-600" 
  },
  { 
    title: "Legal Pack", 
    description: "Documentación legal de obras.", 
    icon: Scale, 
    href: "/dashboard/build-desk/legal", 
    color: "from-violet-500 to-purple-600" 
  },
  { 
    title: "SIROC Desk", 
    description: "Registro IMSS obras.", 
    icon: ClipboardCheck, 
    href: "/dashboard/build-desk/siroc", 
    color: "from-rose-500 to-pink-600" 
  },
  { 
    title: "Estimate Flow", 
    description: "Presupuestos y estimaciones.", 
    icon: Calculator, 
    href: "/dashboard/build-desk/estimates", 
    color: "from-cyan-500 to-cyan-600" 
  },
];

export default function BuildDeskPage() {
  return (
    <div>
      <ModuleHeader 
        title="Build Desk" 
        subtitle="Control de obras, licitaciones y documentación."
      />
      <ModuleGrid columns={3}>
        {modules.map((mod, idx) => (
          <ModuleCard
            key={idx}
            title={mod.title}
            description={mod.description}
            icon={mod.icon}
            href={mod.href}
            color={mod.color}
            badge={mod.badge}
            badgeColor={mod.badgeColor}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\build-desk\page.tsx" -Encoding UTF8

Write-Host "✓ build-desk/page.tsx finalizado" -ForegroundColor Green

# ========================================
# 7. TALENT HUB PAGE - DISEÑO FINAL
# ========================================
@'
"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { 
  Users, 
  Clock, 
  Wallet, 
  SlidersHorizontal, 
  Scale, 
  Grid3X3,
  UserCog
} from "lucide-react";

const modules = [
  { 
    title: "HR People", 
    description: "Expedientes de colaboradores.", 
    icon: Users, 
    href: "/dashboard/talent-hub/people", 
    color: "from-violet-500 to-purple-600",
    badge: "16 registros",
    badgeColor: "bg-violet-500/20 text-violet-300"
  },
  { 
    title: "Clock-In Hub", 
    description: "Control de asistencia.", 
    icon: Clock, 
    href: "/dashboard/talent-hub/clock-in", 
    color: "from-blue-500 to-blue-600" 
  },
  { 
    title: "Payroll Flow", 
    description: "Gestión de nómina.", 
    icon: Wallet, 
    href: "/dashboard/talent-hub/payroll", 
    color: "from-emerald-500 to-emerald-600" 
  },
  { 
    title: "Adjustments", 
    description: "Incidencias y ajustes.", 
    icon: SlidersHorizontal, 
    href: "/dashboard/talent-hub/adjustments", 
    color: "from-amber-500 to-orange-600" 
  },
  { 
    title: "Legal HR", 
    description: "Contratos y documentos legales.", 
    icon: Scale, 
    href: "/dashboard/talent-hub/legal", 
    color: "from-rose-500 to-pink-600" 
  },
  { 
    title: "Salary Matrix", 
    description: "Tabulador de sueldos.", 
    icon: Grid3X3, 
    href: "/dashboard/talent-hub/matrix", 
    color: "from-cyan-500 to-cyan-600" 
  },
  { 
    title: "User Access", 
    description: "Control de usuarios del sistema.", 
    icon: UserCog, 
    href: "/dashboard/talent-hub/users", 
    color: "from-slate-500 to-slate-600",
    badge: "Admin",
    badgeColor: "bg-slate-500/20 text-slate-300"
  },
];

export default function TalentHubPage() {
  return (
    <div>
      <ModuleHeader 
        title="Talent Hub" 
        subtitle="Gestión de recursos humanos y nómina."
      />
      <ModuleGrid columns={4}>
        {modules.map((mod, idx) => (
          <ModuleCard
            key={idx}
            title={mod.title}
            description={mod.description}
            icon={mod.icon}
            href={mod.href}
            color={mod.color}
            badge={mod.badge}
            badgeColor={mod.badgeColor}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\talent-hub\page.tsx" -Encoding UTF8

Write-Host "✓ talent-hub/page.tsx finalizado" -ForegroundColor Green

# ========================================
# 8. FINANCE PAGE - DISEÑO FINAL
# ========================================
@'
"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { 
  Calculator, 
  Receipt, 
  Banknote, 
  Building2, 
  CreditCard, 
  TrendingUp 
} from "lucide-react";

const modules = [
  { 
    title: "Job Costing", 
    description: "Costeo por proyecto.", 
    icon: Calculator, 
    href: "/dashboard/finance/job-costing", 
    color: "from-blue-500 to-cyan-600"
  },
  { 
    title: "Billing Desk", 
    description: "Facturación y cobros.", 
    icon: Receipt, 
    href: "/dashboard/finance/billing", 
    color: "from-emerald-500 to-emerald-600" 
  },
  { 
    title: "Field Cash", 
    description: "Caja chica de obra.", 
    icon: Banknote, 
    href: "/dashboard/finance/field-cash", 
    color: "from-amber-500 to-orange-600" 
  },
  { 
    title: "Bank Reco", 
    description: "Conciliación bancaria.", 
    icon: Building2, 
    href: "/dashboard/finance/bank-reco", 
    color: "from-violet-500 to-purple-600" 
  },
  { 
    title: "Accounts Payable", 
    description: "Cuentas por pagar.", 
    icon: CreditCard, 
    href: "/dashboard/finance/accounts-payable", 
    color: "from-rose-500 to-pink-600" 
  },
  { 
    title: "Receivables", 
    description: "Cuentas por cobrar.", 
    icon: TrendingUp, 
    href: "/dashboard/finance/receivables", 
    color: "from-teal-500 to-teal-600" 
  },
];

export default function FinancePage() {
  return (
    <div>
      <ModuleHeader 
        title="Finance" 
        subtitle="Control financiero y contabilidad."
      />
      <ModuleGrid columns={3}>
        {modules.map((mod, idx) => (
          <ModuleCard
            key={idx}
            title={mod.title}
            description={mod.description}
            icon={mod.icon}
            href={mod.href}
            color={mod.color}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\finance\page.tsx" -Encoding UTF8

Write-Host "✓ finance/page.tsx finalizado" -ForegroundColor Green

# ========================================
# 9. ASSET PAGE - DISEÑO FINAL
# ========================================
@'
"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { 
  Box, 
  Activity, 
  MapPin, 
  Wrench 
} from "lucide-react";

const modules = [
  { 
    title: "Asset Master", 
    description: "Catálogo de activos fijos.", 
    icon: Box, 
    href: "/dashboard/asset/master", 
    color: "from-rose-500 to-pink-600"
  },
  { 
    title: "Asset Status", 
    description: "Estado actual de activos.", 
    icon: Activity, 
    href: "/dashboard/asset/status", 
    color: "from-blue-500 to-blue-600" 
  },
  { 
    title: "Site Allocation", 
    description: "Asignación por obra.", 
    icon: MapPin, 
    href: "/dashboard/asset/allocation", 
    color: "from-emerald-500 to-emerald-600" 
  },
  { 
    title: "Maintenance", 
    description: "Mantenimiento preventivo.", 
    icon: Wrench, 
    href: "/dashboard/asset/maintenance", 
    color: "from-amber-500 to-orange-600" 
  },
];

export default function AssetPage() {
  return (
    <div>
      <ModuleHeader 
        title="Asset" 
        subtitle="Gestión de activos fijos y maquinaria."
      />
      <ModuleGrid columns={4}>
        {modules.map((mod, idx) => (
          <ModuleCard
            key={idx}
            title={mod.title}
            description={mod.description}
            icon={mod.icon}
            href={mod.href}
            color={mod.color}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\asset\page.tsx" -Encoding UTF8

Write-Host "✓ asset/page.tsx finalizado" -ForegroundColor Green

# ========================================
# 10. TEMPLATES PAGE - DISEÑO FINAL
# ========================================
@'
"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { 
  FileText, 
  FolderOpen, 
  FileSpreadsheet, 
  ClipboardList 
} from "lucide-react";

const modules = [
  { 
    title: "Templates", 
    description: "Plantillas de documentos.", 
    icon: FileText, 
    href: "/dashboard/templates/library", 
    color: "from-slate-400 to-slate-600"
  },
  { 
    title: "Docs Center", 
    description: "Centro de documentación.", 
    icon: FolderOpen, 
    href: "/dashboard/templates/docs", 
    color: "from-blue-500 to-blue-600" 
  },
  { 
    title: "Bid Pack", 
    description: "Paquetes de licitación.", 
    icon: FileSpreadsheet, 
    href: "/dashboard/templates/bids", 
    color: "from-emerald-500 to-emerald-600" 
  },
  { 
    title: "PO Pack", 
    description: "Formatos de órdenes.", 
    icon: ClipboardList, 
    href: "/dashboard/templates/po", 
    color: "from-amber-500 to-orange-600" 
  },
];

export default function TemplatesPage() {
  return (
    <div>
      <ModuleHeader 
        title="Templates" 
        subtitle="Plantillas y documentación estándar."
      />
      <ModuleGrid columns={4}>
        {modules.map((mod, idx) => (
          <ModuleCard
            key={idx}
            title={mod.title}
            description={mod.description}
            icon={mod.icon}
            href={mod.href}
            color={mod.color}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\templates\page.tsx" -Encoding UTF8

Write-Host "✓ templates/page.tsx finalizado" -ForegroundColor Green

# ========================================
# 11. SETTINGS PAGE - DISEÑO FINAL
# ========================================
@'
"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { 
  Shield, 
  Bell, 
  Sliders, 
  Database, 
  Mail, 
  Clock,
  Rocket
} from "lucide-react";

const modules = [
  { 
    title: "Access Control", 
    description: "Permisos y roles.", 
    icon: Shield, 
    href: "/dashboard/settings/access", 
    color: "from-violet-500 to-purple-600"
  },
  { 
    title: "Alert Engine", 
    description: "Configuración de alertas.", 
    icon: Bell, 
    href: "/dashboard/settings/alerts", 
    color: "from-amber-500 to-orange-600" 
  },
  { 
    title: "Config Matrix", 
    description: "Parámetros del sistema.", 
    icon: Sliders, 
    href: "/dashboard/settings/config", 
    color: "from-blue-500 to-blue-600" 
  },
  { 
    title: "Master Data", 
    description: "Catálogos maestros.", 
    icon: Database, 
    href: "/dashboard/settings/master-data", 
    color: "from-emerald-500 to-emerald-600" 
  },
  { 
    title: "Mail Config", 
    description: "Configuración de correo.", 
    icon: Mail, 
    href: "/dashboard/settings/mail", 
    color: "from-rose-500 to-pink-600" 
  },
  { 
    title: "Reminders", 
    description: "Recordatorios automáticos.", 
    icon: Clock, 
    href: "/dashboard/settings/reminders", 
    color: "from-cyan-500 to-cyan-600" 
  },
  { 
    title: "Deploy", 
    description: "Estado del sistema.", 
    icon: Rocket, 
    href: "/dashboard/settings/deploy", 
    color: "from-slate-500 to-slate-600" 
  },
];

export default function SettingsPage() {
  return (
    <div>
      <ModuleHeader 
        title="Settings" 
        subtitle="Configuración general del sistema."
      />
      <ModuleGrid columns={4}>
        {modules.map((mod, idx) => (
          <ModuleCard
            key={idx}
            title={mod.title}
            description={mod.description}
            icon={mod.icon}
            href={mod.href}
            color={mod.color}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\settings\page.tsx" -Encoding UTF8

Write-Host "✓ settings/page.tsx finalizado" -ForegroundColor Green

# ========================================
# BUILD Y DEPLOY
# ========================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Ejecutando build final..." -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ BUILD EXITOSO - DISEÑO 10/10 COMPLETADO" -ForegroundColor Green
    
    git add .
    git commit -m "feat: diseno final 10/10 - iconos premium, badges coloreados, hover effects, sidebar mejorado, responsive mobile"
    git push
    
    Write-Host "`n🚀 DEPLOY INICIADO" -ForegroundColor Cyan
    Write-Host "Espera 2-3 minutos y refresca https://aria.jjcrm27.com" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ ERROR EN BUILD" -ForegroundColor Red
}
