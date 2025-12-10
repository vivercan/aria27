# ========================================
# ARIA27 - ESTILO TIMONFX PREMIUM
# Glass + Metal + Ultra Oscuro
# ========================================

cd "D:\aria27"

# ========================================
# 1. LAYOUT DASHBOARD - FONDO TIMONFX
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
    <div className="relative min-h-screen overflow-hidden bg-[#020617]">
      {/* ===== FONDO TIMONFX - CAPAS ===== */}
      
      {/* Capa 1: Gradiente base ultra oscuro */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: "linear-gradient(145deg, #020617 0%, #020B2A 35%, #011229 55%, #0B2558 100%)",
        }}
      />
      
      {/* Capa 2: Halo metálico principal - esquina inferior derecha */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 85% 85%, rgba(37,99,235,0.25) 0%, rgba(37,99,235,0.08) 40%, transparent 70%)",
        }}
      />
      
      {/* Capa 3: Halo secundario central */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(15,23,42,0.5) 0%, transparent 50%)",
        }}
      />
      
      {/* Capa 4: Halo superior izquierdo sutil */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 10% 10%, rgba(56,189,248,0.06) 0%, transparent 35%)",
        }}
      />
      
      {/* Capa 5: Noise texture */}
      <div 
        className="fixed inset-0 z-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ===== CONTENIDO z-10 ===== */}
      <div className="relative z-10 flex min-h-screen">
        
        {/* ===== MOBILE MENU BUTTON ===== */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 text-white shadow-lg"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* ===== SIDEBAR TIMONFX ===== */}
        <aside className={`
          fixed left-0 top-0 bottom-0 w-64 flex flex-col 
          bg-[#02081F]/95 backdrop-blur-2xl 
          border-r border-white/5
          shadow-[4px_0_30px_-4px_rgba(0,0,0,0.5)]
          transition-transform duration-300 z-40
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-white/5">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-[#38BDF8] to-[#2563EB] shadow-lg shadow-blue-500/30">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                ARIA
              </h1>
              <p className="text-[10px] text-white/40 tracking-[0.2em] font-medium">OPERATIONS OS</p>
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
                    group relative flex items-center gap-3 px-3 py-2.5 
                    text-sm font-medium rounded-xl
                    transition-all duration-200
                    outline-none 
                    focus-visible:ring-2 focus-visible:ring-[#38BDF8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]
                    ${isActive 
                      ? "bg-white/5 text-white" 
                      : "text-white/70 hover:text-white/90 hover:bg-white/[0.03]"
                    }
                  `}
                >
                  {/* Barra luminosa activa */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-[#38BDF8] to-[#2563EB] rounded-full shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
                  )}
                  
                  <item.icon className={`w-5 h-5 ${isActive ? "text-white" : "text-white/70"}`} strokeWidth={1.75} />
                  <span className="flex-1">{item.name}</span>
                  
                  {isActive && (
                    <ChevronRight className="w-4 h-4 text-white/40" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer sidebar */}
          <div className="px-4 py-4 border-t border-white/5">
            <div className="flex items-center gap-2 justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
              <p className="text-[10px] text-white/30 tracking-wide">
                ARIA v2025.1 · Production
              </p>
            </div>
          </div>
        </aside>

        {/* ===== OVERLAY MOBILE ===== */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ===== MAIN CONTENT ===== */}
        <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
          
          {/* ===== TOPBAR GLASS TIMONFX ===== */}
          <header className="sticky top-0 z-20 px-4 lg:px-6 py-4">
            <div className="
              flex items-center justify-between gap-4 
              px-5 py-3.5 
              rounded-2xl 
              bg-white/5 backdrop-blur-lg
              border border-white/10
              shadow-[0_18px_45px_rgba(0,0,0,0.55)]
            ">
              {/* Search */}
              <div className="relative flex-1 max-w-md ml-10 lg:ml-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Buscar módulos, documentos..."
                  className="
                    w-full pl-10 pr-4 py-2.5 
                    bg-white/5 backdrop-blur
                    border border-white/10 rounded-xl 
                    text-sm text-white placeholder-white/40 
                    outline-none 
                    focus:border-[#38BDF8]/50 focus:ring-1 focus:ring-[#38BDF8] focus:bg-white/[0.07]
                    transition-all
                  "
                />
              </div>

              {/* Date */}
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[11px] font-semibold text-white/80 tracking-wider">
                  {currentDate.day}
                </span>
                <span className="text-[11px] text-white/50">
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
                    <span className="text-[11px] text-white/50">{userRole}</span>
                  </div>
                </div>
                <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#38BDF8] to-[#2563EB] text-white text-sm font-semibold shadow-lg shadow-blue-500/25">
                  {userName.charAt(0)}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
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

Write-Host "✓ layout.tsx TIMONFX creado" -ForegroundColor Green

# ========================================
# 2. MODULECARD - GLASS + METAL TIMONFX
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
  meta?: string;
  disabled?: boolean;
}

export function ModuleCard({ 
  title, 
  description, 
  icon: Icon, 
  href, 
  color, 
  badge, 
  badgeColor = "bg-white/10 text-white/80 border-white/15",
  meta,
  disabled 
}: ModuleCardProps) {
  const cardContent = (
    <div className={`
      group relative overflow-hidden 
      rounded-3xl 
      border border-white/10
      bg-white/5 backdrop-blur-lg
      p-6 h-[190px]
      shadow-[0_24px_60px_rgba(0,0,0,0.65)]
      transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]
      ${disabled 
        ? 'opacity-40 cursor-not-allowed grayscale' 
        : 'cursor-pointer hover:-translate-y-[3px] hover:shadow-[0_30px_80px_rgba(0,0,0,0.8)] hover:border-[#38BDF8]/60 active:translate-y-0 active:shadow-[0_18px_45px_rgba(0,0,0,0.7)] active:scale-[0.99]'
      }
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]
    `}>
      {/* Gradiente interno sutil */}
      <div 
        className="absolute inset-0 opacity-30 rounded-3xl"
        style={{
          background: "linear-gradient(145deg, rgba(2,8,31,0.5) 0%, rgba(4,23,49,0.3) 100%)",
        }}
      />
      
      {/* Hover gradient glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-500 rounded-3xl`} />
      
      {/* Top shine */}
      <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
      
      {/* Badge - esquina superior derecha */}
      {badge && (
        <div className="absolute top-4 right-4 z-20">
          <span className={`
            inline-flex items-center px-3 py-1 rounded-full 
            text-[10px] font-bold tracking-wider uppercase
            ${badgeColor}
            border
          `}>
            {badge}
          </span>
        </div>
      )}
      
      {/* Content */}
      <div className="relative z-10 flex gap-5 h-full">
        {/* ICON BADGE GRANDE - 60x60px */}
        <div className={`
          relative flex-shrink-0 flex items-center justify-center 
          w-[60px] h-[60px] rounded-2xl 
          bg-gradient-to-br ${color}
          border border-white/40
          shadow-[0_12px_30px_rgba(0,0,0,0.45)]
          transition-all duration-300
          group-hover:scale-105 group-hover:shadow-[0_16px_40px_rgba(0,0,0,0.55)]
        `}>
          {/* Inner glow */}
          <div className="absolute inset-[1px] rounded-[14px] bg-gradient-to-b from-white/25 to-transparent opacity-60" />
          <Icon className="relative z-10 h-8 w-8 text-white drop-shadow-md" strokeWidth={1.5} />
        </div>
        
        {/* Texto */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          {/* Title */}
          <h3 className="text-lg font-semibold text-white/95 leading-tight mb-1.5 group-hover:text-white transition-colors truncate">
            {title}
          </h3>
          
          {/* Description */}
          <p className="text-sm text-white/70 leading-relaxed group-hover:text-white/80 transition-colors line-clamp-2">
            {description}
          </p>
          
          {/* Meta info */}
          {meta && (
            <p className="text-xs text-white/50 mt-2 font-medium">
              {meta}
            </p>
          )}
        </div>
      </div>
      
      {/* Bottom gradient line on hover */}
      <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${color} opacity-0 group-hover:opacity-70 transition-opacity duration-300`} />
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

Write-Host "✓ ModuleCard.tsx TIMONFX Glass+Metal" -ForegroundColor Green

# ========================================
# 3. MODULEGRID ACTUALIZADO
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
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-5`}>
      {children}
    </div>
  );
}
'@ | Set-Content "src\components\dashboard\ModuleGrid.tsx" -Encoding UTF8

Write-Host "✓ ModuleGrid.tsx actualizado" -ForegroundColor Green

# ========================================
# 4. SUPPLY DESK - TIMONFX
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
    color: "from-[#22C55E] to-[#16A34A]",
    badge: "Activo",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    meta: "Flujo completo de requisiciones"
  },
  { 
    title: "Inventario", 
    description: "Control de stock y almacén.", 
    icon: Package, 
    href: "/dashboard/supply-desk/inventory", 
    color: "from-[#38BDF8] to-[#2563EB]",
    meta: "Próximamente"
  },
  { 
    title: "Maestro Proveedores", 
    description: "Catálogo de proveedores.", 
    icon: Users, 
    href: "/dashboard/supply-desk/vendors", 
    color: "from-[#A855F7] to-[#7C3AED]",
    badge: "CRUD",
    badgeColor: "bg-violet-500/20 text-violet-400 border-violet-500/30"
  },
  { 
    title: "Órdenes de Compra", 
    description: "Gestión de órdenes autorizadas.", 
    icon: ClipboardList, 
    href: "/dashboard/supply-desk/requisitions/orders", 
    color: "from-[#F59E0B] to-[#D97706]"
  },
  { 
    title: "Compras", 
    description: "Cotizaciones y comparativas.", 
    icon: ShoppingCart, 
    href: "/dashboard/supply-desk/requisitions/purchasing", 
    color: "from-[#06B6D4] to-[#0891B2]"
  },
  { 
    title: "Pagos", 
    description: "Control de pagos a proveedores.", 
    icon: CreditCard, 
    href: "/dashboard/supply-desk/payments", 
    color: "from-[#FB7185] to-[#EF4444]"
  },
  { 
    title: "Logística", 
    description: "Entregas y seguimiento.", 
    icon: Truck, 
    href: "/dashboard/supply-desk/delivery", 
    color: "from-[#14B8A6] to-[#0D9488]"
  },
  { 
    title: "Configuración", 
    description: "Ajustes del módulo.", 
    icon: Settings, 
    href: "/dashboard/supply-desk/settings", 
    color: "from-[#64748B] to-[#475569]"
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
            meta={mod.meta}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\supply-desk\page.tsx" -Encoding UTF8

Write-Host "✓ supply-desk/page.tsx TIMONFX" -ForegroundColor Green

# ========================================
# 5. BUILD DESK - TIMONFX
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
    color: "from-[#F59E0B] to-[#D97706]",
    badge: "5 Obras",
    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    meta: "Proyectos en ejecución"
  },
  { 
    title: "Tender Hub", 
    description: "Gestión de licitaciones.", 
    icon: FileSearch, 
    href: "/dashboard/build-desk/tender", 
    color: "from-[#38BDF8] to-[#2563EB]"
  },
  { 
    title: "Packing List", 
    description: "Control de envíos y materiales.", 
    icon: PackageCheck, 
    href: "/dashboard/build-desk/packing", 
    color: "from-[#22C55E] to-[#16A34A]"
  },
  { 
    title: "Legal Pack", 
    description: "Documentación legal de obras.", 
    icon: Scale, 
    href: "/dashboard/build-desk/legal", 
    color: "from-[#A855F7] to-[#7C3AED]"
  },
  { 
    title: "SIROC Desk", 
    description: "Registro IMSS obras.", 
    icon: ClipboardCheck, 
    href: "/dashboard/build-desk/siroc", 
    color: "from-[#FB7185] to-[#EF4444]"
  },
  { 
    title: "Estimate Flow", 
    description: "Presupuestos y estimaciones.", 
    icon: Calculator, 
    href: "/dashboard/build-desk/estimates", 
    color: "from-[#06B6D4] to-[#0891B2]"
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
            meta={mod.meta}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\build-desk\page.tsx" -Encoding UTF8

Write-Host "✓ build-desk/page.tsx TIMONFX" -ForegroundColor Green

# ========================================
# 6. TALENT HUB - TIMONFX
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
    color: "from-[#A855F7] to-[#7C3AED]",
    badge: "16",
    badgeColor: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    meta: "Colaboradores registrados"
  },
  { 
    title: "Clock-In Hub", 
    description: "Control de asistencia.", 
    icon: Clock, 
    href: "/dashboard/talent-hub/clock-in", 
    color: "from-[#38BDF8] to-[#2563EB]",
    meta: "WhatsApp integration"
  },
  { 
    title: "Payroll Flow", 
    description: "Gestión de nómina.", 
    icon: Wallet, 
    href: "/dashboard/talent-hub/payroll", 
    color: "from-[#22C55E] to-[#16A34A]"
  },
  { 
    title: "Adjustments", 
    description: "Incidencias y ajustes.", 
    icon: SlidersHorizontal, 
    href: "/dashboard/talent-hub/adjustments", 
    color: "from-[#F59E0B] to-[#D97706]"
  },
  { 
    title: "Legal HR", 
    description: "Contratos y documentos legales.", 
    icon: Scale, 
    href: "/dashboard/talent-hub/legal", 
    color: "from-[#FB7185] to-[#EF4444]"
  },
  { 
    title: "Salary Matrix", 
    description: "Tabulador de sueldos.", 
    icon: Grid3X3, 
    href: "/dashboard/talent-hub/matrix", 
    color: "from-[#06B6D4] to-[#0891B2]"
  },
  { 
    title: "User Access", 
    description: "Control de usuarios del sistema.", 
    icon: UserCog, 
    href: "/dashboard/talent-hub/users", 
    color: "from-[#64748B] to-[#475569]",
    badge: "Admin",
    badgeColor: "bg-slate-500/20 text-slate-400 border-slate-500/30"
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
            meta={mod.meta}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\talent-hub\page.tsx" -Encoding UTF8

Write-Host "✓ talent-hub/page.tsx TIMONFX" -ForegroundColor Green

# ========================================
# 7. FINANCE - TIMONFX
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
    color: "from-[#38BDF8] to-[#2563EB]",
    meta: "Análisis de costos por obra"
  },
  { 
    title: "Billing Desk", 
    description: "Facturación y cobros.", 
    icon: Receipt, 
    href: "/dashboard/finance/billing", 
    color: "from-[#22C55E] to-[#16A34A]"
  },
  { 
    title: "Field Cash", 
    description: "Caja chica de obra.", 
    icon: Banknote, 
    href: "/dashboard/finance/field-cash", 
    color: "from-[#F59E0B] to-[#D97706]"
  },
  { 
    title: "Bank Reco", 
    description: "Conciliación bancaria.", 
    icon: Building2, 
    href: "/dashboard/finance/bank-reco", 
    color: "from-[#A855F7] to-[#7C3AED]"
  },
  { 
    title: "Accounts Payable", 
    description: "Cuentas por pagar.", 
    icon: CreditCard, 
    href: "/dashboard/finance/accounts-payable", 
    color: "from-[#FB7185] to-[#EF4444]"
  },
  { 
    title: "Receivables", 
    description: "Cuentas por cobrar.", 
    icon: TrendingUp, 
    href: "/dashboard/finance/receivables", 
    color: "from-[#14B8A6] to-[#0D9488]"
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
            meta={mod.meta}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\finance\page.tsx" -Encoding UTF8

Write-Host "✓ finance/page.tsx TIMONFX" -ForegroundColor Green

# ========================================
# 8. ASSET - TIMONFX
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
    color: "from-[#FB7185] to-[#EF4444]",
    meta: "Maquinaria y equipo"
  },
  { 
    title: "Asset Status", 
    description: "Estado actual de activos.", 
    icon: Activity, 
    href: "/dashboard/asset/status", 
    color: "from-[#38BDF8] to-[#2563EB]"
  },
  { 
    title: "Site Allocation", 
    description: "Asignación por obra.", 
    icon: MapPin, 
    href: "/dashboard/asset/allocation", 
    color: "from-[#22C55E] to-[#16A34A]"
  },
  { 
    title: "Maintenance", 
    description: "Mantenimiento preventivo.", 
    icon: Wrench, 
    href: "/dashboard/asset/maintenance", 
    color: "from-[#F59E0B] to-[#D97706]"
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
            meta={mod.meta}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\asset\page.tsx" -Encoding UTF8

Write-Host "✓ asset/page.tsx TIMONFX" -ForegroundColor Green

# ========================================
# 9. TEMPLATES - TIMONFX
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
    color: "from-[#64748B] to-[#475569]",
    meta: "Formatos estándar"
  },
  { 
    title: "Docs Center", 
    description: "Centro de documentación.", 
    icon: FolderOpen, 
    href: "/dashboard/templates/docs", 
    color: "from-[#38BDF8] to-[#2563EB]"
  },
  { 
    title: "Bid Pack", 
    description: "Paquetes de licitación.", 
    icon: FileSpreadsheet, 
    href: "/dashboard/templates/bids", 
    color: "from-[#22C55E] to-[#16A34A]"
  },
  { 
    title: "PO Pack", 
    description: "Formatos de órdenes.", 
    icon: ClipboardList, 
    href: "/dashboard/templates/po", 
    color: "from-[#F59E0B] to-[#D97706]"
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
            meta={mod.meta}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\templates\page.tsx" -Encoding UTF8

Write-Host "✓ templates/page.tsx TIMONFX" -ForegroundColor Green

# ========================================
# 10. SETTINGS - TIMONFX
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
    color: "from-[#A855F7] to-[#7C3AED]",
    meta: "Seguridad del sistema"
  },
  { 
    title: "Alert Engine", 
    description: "Configuración de alertas.", 
    icon: Bell, 
    href: "/dashboard/settings/alerts", 
    color: "from-[#F59E0B] to-[#D97706]"
  },
  { 
    title: "Config Matrix", 
    description: "Parámetros del sistema.", 
    icon: Sliders, 
    href: "/dashboard/settings/config", 
    color: "from-[#38BDF8] to-[#2563EB]"
  },
  { 
    title: "Master Data", 
    description: "Catálogos maestros.", 
    icon: Database, 
    href: "/dashboard/settings/master-data", 
    color: "from-[#22C55E] to-[#16A34A]"
  },
  { 
    title: "Mail Config", 
    description: "Configuración de correo.", 
    icon: Mail, 
    href: "/dashboard/settings/mail", 
    color: "from-[#FB7185] to-[#EF4444]",
    badge: "Resend",
    badgeColor: "bg-rose-500/20 text-rose-400 border-rose-500/30"
  },
  { 
    title: "Reminders", 
    description: "Recordatorios automáticos.", 
    icon: Clock, 
    href: "/dashboard/settings/reminders", 
    color: "from-[#06B6D4] to-[#0891B2]"
  },
  { 
    title: "Deploy", 
    description: "Estado del sistema.", 
    icon: Rocket, 
    href: "/dashboard/settings/deploy", 
    color: "from-[#64748B] to-[#475569]",
    badge: "Prod",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
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
            badge={mod.badge}
            badgeColor={mod.badgeColor}
            meta={mod.meta}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\settings\page.tsx" -Encoding UTF8

Write-Host "✓ settings/page.tsx TIMONFX" -ForegroundColor Green

# ========================================
# BUILD Y DEPLOY
# ========================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Build ESTILO TIMONFX..." -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ BUILD EXITOSO - ESTILO TIMONFX PREMIUM" -ForegroundColor Green
    
    git add .
    git commit -m "feat: estilo TIMONFX - glass metal, fondo ultra oscuro, iconos 60px, halos azul metalico"
    git push
    
    Write-Host "`n🚀 DEPLOY TIMONFX INICIADO" -ForegroundColor Cyan
    Write-Host "Espera 2-3 min y refresca https://aria.jjcrm27.com" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ ERROR EN BUILD" -ForegroundColor Red
}
