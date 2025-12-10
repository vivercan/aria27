# ========================================
# ARIA27 - REDISEÑO DASHBOARD ENTERPRISE 2025
# NO TOCA: Login (page.tsx raíz) ni panel de validación
# ========================================

cd "D:\aria27"

# ========================================
# 1. COMPONENTE: ModuleCard.tsx
# ========================================
New-Item -ItemType Directory -Path "components\dashboard" -Force | Out-Null

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
  disabled?: boolean;
}

export function ModuleCard({ title, description, icon: Icon, href, color, badge, disabled }: ModuleCardProps) {
  const cardContent = (
    <div className={`
      group relative overflow-hidden rounded-2xl 
      border border-white/[0.08] 
      bg-gradient-to-br from-white/[0.05] to-white/[0.02]
      backdrop-blur-sm
      p-6 h-full
      shadow-[0_4px_24px_-4px_rgba(0,0,0,0.3)]
      transition-all duration-300 ease-out
      ${disabled 
        ? 'opacity-50 cursor-not-allowed' 
        : 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.4)] hover:border-white/[0.15] active:translate-y-0 active:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.3)]'
      }
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
    `}>
      {/* Glow effect on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-300`} />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Icon container */}
        <div className={`
          inline-flex items-center justify-center 
          w-12 h-12 rounded-xl 
          bg-gradient-to-br ${color}
          shadow-lg shadow-black/20
          mb-4
          transition-transform duration-300
          group-hover:scale-105
        `}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        
        {/* Title + Badge row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-base font-semibold text-white/95 leading-tight">
            {title}
          </h3>
          {badge && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white/70 border border-white/10 whitespace-nowrap">
              {badge}
            </span>
          )}
        </div>
        
        {/* Description */}
        <p className="text-sm text-white/50 leading-relaxed">
          {description}
        </p>
      </div>
      
      {/* Bottom shine line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
'@ | Set-Content "components\dashboard\ModuleCard.tsx" -Encoding UTF8

Write-Host "✓ ModuleCard.tsx creado" -ForegroundColor Green

# ========================================
# 2. COMPONENTE: ModuleHeader.tsx
# ========================================
@'
"use client";

interface ModuleHeaderProps {
  title: string;
  subtitle: string;
}

export function ModuleHeader({ title, subtitle }: ModuleHeaderProps) {
  return (
    <div className="flex flex-col gap-1 mb-8">
      <h1 className="text-3xl font-bold text-white tracking-tight">
        {title}
      </h1>
      <p className="text-base text-white/50">
        {subtitle}
      </p>
    </div>
  );
}
'@ | Set-Content "components\dashboard\ModuleHeader.tsx" -Encoding UTF8

Write-Host "✓ ModuleHeader.tsx creado" -ForegroundColor Green

# ========================================
# 3. COMPONENTE: ModuleGrid.tsx
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
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-5`}>
      {children}
    </div>
  );
}
'@ | Set-Content "components\dashboard\ModuleGrid.tsx" -Encoding UTF8

Write-Host "✓ ModuleGrid.tsx creado" -ForegroundColor Green

# ========================================
# 4. COMPONENTE: index.ts (exports)
# ========================================
@'
export { ModuleCard } from "./ModuleCard";
export { ModuleHeader } from "./ModuleHeader";
export { ModuleGrid } from "./ModuleGrid";
'@ | Set-Content "components\dashboard\index.ts" -Encoding UTF8

Write-Host "✓ index.ts exports creado" -ForegroundColor Green

# ========================================
# 5. LAYOUT PRINCIPAL DEL DASHBOARD
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
'@ | Set-Content "app\dashboard\layout.tsx" -Encoding UTF8

Write-Host "✓ layout.tsx actualizado" -ForegroundColor Green

# ========================================
# 6. SUPPLY DESK PAGE
# ========================================
@'
"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { 
  FileText, 
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
    icon: FileText, 
    href: "/dashboard/supply-desk/requisitions", 
    color: "from-emerald-500 to-emerald-600",
    badge: "Activo"
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
    color: "from-purple-500 to-purple-600",
    badge: "CRUD"
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
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\supply-desk\page.tsx" -Encoding UTF8

Write-Host "✓ supply-desk/page.tsx actualizado" -ForegroundColor Green

# ========================================
# 7. BUILD DESK PAGE
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
    badge: "5 activos"
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
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\build-desk\page.tsx" -Encoding UTF8

Write-Host "✓ build-desk/page.tsx actualizado" -ForegroundColor Green

# ========================================
# 8. TALENT HUB PAGE
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
  UserPlus
} from "lucide-react";

const modules = [
  { 
    title: "HR People", 
    description: "Expedientes de colaboradores.", 
    icon: Users, 
    href: "/dashboard/talent-hub/people", 
    color: "from-violet-500 to-purple-600",
    badge: "16 registros"
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
    icon: UserPlus, 
    href: "/dashboard/talent-hub/users", 
    color: "from-slate-500 to-slate-600",
    badge: "Admin"
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
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\talent-hub\page.tsx" -Encoding UTF8

Write-Host "✓ talent-hub/page.tsx actualizado" -ForegroundColor Green

# ========================================
# 9. FINANCE PAGE
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
            badge={mod.badge}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\finance\page.tsx" -Encoding UTF8

Write-Host "✓ finance/page.tsx actualizado" -ForegroundColor Green

# ========================================
# 10. ASSET PAGE
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

Write-Host "✓ asset/page.tsx actualizado" -ForegroundColor Green

# ========================================
# 11. TEMPLATES PAGE
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

Write-Host "✓ templates/page.tsx actualizado" -ForegroundColor Green

# ========================================
# 12. SETTINGS PAGE
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

Write-Host "✓ settings/page.tsx actualizado" -ForegroundColor Green

# ========================================
# BUILD Y DEPLOY
# ========================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Ejecutando build..." -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ BUILD EXITOSO" -ForegroundColor Green
    Write-Host "Haciendo commit y push..." -ForegroundColor Yellow
    
    git add .
    git commit -m "feat: rediseno premium dashboard - componentes reutilizables, fondo degradado, sidebar luminoso, topbar glass, tarjetas enterprise"
    git push
    
    Write-Host "`n🚀 DEPLOY INICIADO - Espera 2-3 minutos y refresca" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ ERROR EN BUILD - Revisa los errores arriba" -ForegroundColor Red
}
