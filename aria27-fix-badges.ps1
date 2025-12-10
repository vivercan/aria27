# ========================================
# ARIA27 - FIX: BADGES, ESPACIADO, TOPBAR
# ========================================

cd "D:\aria27"

# ========================================
# 1. MODULECARD - BADGE EN ESQUINA DERECHA
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
  glowColor: string;
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
  glowColor,
  badge, 
  badgeColor = "bg-white/10 text-slate-300 border-white/10",
  meta,
  disabled 
}: ModuleCardProps) {
  const cardContent = (
    <div className={`
      group relative overflow-hidden 
      rounded-3xl 
      border border-white/[0.08]
      bg-white/[0.03] backdrop-blur-xl
      p-5 h-[160px]
      w-full max-w-[580px]
      shadow-[0_8px_32px_rgba(0,0,0,0.3)]
      transition-all duration-300 ease-out
      ${disabled 
        ? 'opacity-40 cursor-not-allowed grayscale' 
        : 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(0,0,0,0.4)] hover:border-white/[0.12] hover:bg-white/[0.05] active:translate-y-0'
      }
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a]
    `}>
      {/* Top edge gradient border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      {/* Content con badge integrado */}
      <div className="relative z-10 flex items-center gap-4 h-full">
        {/* NEON ICON SQUIRCLE */}
        <div className={`
          relative flex-shrink-0 flex items-center justify-center 
          w-14 h-14 
          rounded-[18px]
          bg-gradient-to-br ${color}
          border border-white/20
          shadow-[0_0_20px_${glowColor},inset_0_1px_0_rgba(255,255,255,0.2)]
          transition-all duration-300
          group-hover:shadow-[0_0_30px_${glowColor},0_0_60px_${glowColor}]
          group-hover:scale-105
        `}>
          <div className="absolute inset-[2px] rounded-[16px] bg-gradient-to-b from-white/30 to-transparent opacity-60" />
          <div className={`absolute -inset-2 rounded-[22px] bg-gradient-to-br ${color} opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-300`} />
          <Icon className="relative z-10 h-7 w-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" strokeWidth={1.75} />
        </div>
        
        {/* Text - centro */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <h3 className="text-[15px] font-semibold text-white leading-tight mb-1.5 group-hover:text-white transition-colors truncate">
            {title}
          </h3>
          <p className="text-[13px] text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors line-clamp-2">
            {description}
          </p>
          {meta && (
            <p className="text-[11px] text-slate-500 mt-1.5 font-medium">{meta}</p>
          )}
        </div>
        
        {/* BADGE - EXTREMA DERECHA */}
        {badge && (
          <div className="flex-shrink-0 self-start mt-1">
            <span className={`
              inline-flex items-center 
              px-3 py-1.5 
              rounded-full 
              text-[10px] font-bold tracking-wider uppercase
              ${badgeColor} 
              border 
              backdrop-blur-sm
              shadow-sm
            `}>
              {badge}
            </span>
          </div>
        )}
      </div>
      
      {/* Bottom accent line on hover */}
      <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${color} opacity-0 group-hover:opacity-60 transition-opacity duration-300`} />
    </div>
  );

  if (disabled) return cardContent;

  return (
    <Link href={href} className="block focus:outline-none">
      {cardContent}
    </Link>
  );
}
'@ | Set-Content "src\components\dashboard\ModuleCard.tsx" -Encoding UTF8

Write-Host "✓ ModuleCard.tsx - Badge en extrema derecha" -ForegroundColor Green

# ========================================
# 2. MODULEGRID - MÁS ESPACIO ENTRE CARDS
# ========================================
@'
"use client";

import { ReactNode } from "react";

interface ModuleGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}

export function ModuleGrid({ children, columns = 2 }: ModuleGridProps) {
  return (
    <div 
      className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-7 lg:max-w-[1200px]"
      style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 580px))'
      }}
    >
      {children}
    </div>
  );
}
'@ | Set-Content "src\components\dashboard\ModuleGrid.tsx" -Encoding UTF8

Write-Host "✓ ModuleGrid.tsx - Gap aumentado a 28px" -ForegroundColor Green

# ========================================
# 3. MODULEHEADER - SUBTÍTULO MÁS VISIBLE
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
      <h1 className="text-3xl font-semibold text-white tracking-tight mb-2">
        {title}
      </h1>
      <p className="text-base text-slate-300">
        {subtitle}
      </p>
    </div>
  );
}
'@ | Set-Content "src\components\dashboard\ModuleHeader.tsx" -Encoding UTF8

Write-Host "✓ ModuleHeader.tsx - Subtítulo más visible" -ForegroundColor Green

# ========================================
# 4. LAYOUT - TOPBAR MÁS VISIBLE
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
'@ | Set-Content "app\dashboard\layout.tsx" -Encoding UTF8

Write-Host "✓ layout.tsx - Topbar más visible" -ForegroundColor Green

# ========================================
# 5. BUILD DESK - ACTUALIZADO
# ========================================
@'
"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { Briefcase, FileSearch, PackageCheck, Scale, ClipboardCheck, Calculator } from "lucide-react";

const modules = [
  { title: "Obra Pipeline", description: "Seguimiento de proyectos activos.", icon: Briefcase, href: "/dashboard/build-desk/pipeline", color: "from-amber-500 to-orange-500", glowColor: "rgba(245,158,11,0.4)", badge: "5 Obras", badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30", meta: "Proyectos activos" },
  { title: "Tender Hub", description: "Gestión de licitaciones.", icon: FileSearch, href: "/dashboard/build-desk/tender", color: "from-blue-500 to-blue-600", glowColor: "rgba(59,130,246,0.4)" },
  { title: "Packing List", description: "Control de envíos y materiales.", icon: PackageCheck, href: "/dashboard/build-desk/packing", color: "from-emerald-500 to-emerald-600", glowColor: "rgba(52,211,153,0.4)" },
  { title: "Legal Pack", description: "Documentación legal de obras.", icon: Scale, href: "/dashboard/build-desk/legal", color: "from-purple-500 to-purple-600", glowColor: "rgba(168,85,247,0.4)" },
  { title: "SIROC Desk", description: "Registro IMSS obras.", icon: ClipboardCheck, href: "/dashboard/build-desk/siroc", color: "from-rose-500 to-rose-600", glowColor: "rgba(244,63,94,0.4)" },
  { title: "Estimate Flow", description: "Presupuestos y estimaciones.", icon: Calculator, href: "/dashboard/build-desk/estimates", color: "from-cyan-500 to-cyan-600", glowColor: "rgba(6,182,212,0.4)" },
];

export default function BuildDeskPage() {
  return (
    <div>
      <ModuleHeader title="Build Desk" subtitle="Control de obras, licitaciones y documentación." />
      <ModuleGrid>
        {modules.map((mod, idx) => (
          <ModuleCard key={idx} title={mod.title} description={mod.description} icon={mod.icon} href={mod.href} color={mod.color} glowColor={mod.glowColor} badge={mod.badge} badgeColor={mod.badgeColor} meta={mod.meta} />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\build-desk\page.tsx" -Encoding UTF8

Write-Host "✓ build-desk/page.tsx actualizado" -ForegroundColor Green

# ========================================
# 6. SUPPLY DESK - ACTUALIZADO
# ========================================
@'
"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { FileCheck, Package, Users, ClipboardList, Truck, Settings, ShoppingCart, CreditCard } from "lucide-react";

const modules = [
  { title: "Requisiciones", description: "Solicitudes de materiales para obra.", icon: FileCheck, href: "/dashboard/supply-desk/requisitions", color: "from-emerald-500 to-emerald-600", glowColor: "rgba(52,211,153,0.4)", badge: "Activo", badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", meta: "Flujo completo" },
  { title: "Inventario", description: "Control de stock y almacén.", icon: Package, href: "/dashboard/supply-desk/products", color: "from-blue-500 to-blue-600", glowColor: "rgba(59,130,246,0.4)" },
  { title: "Maestro Proveedores", description: "Catálogo de proveedores.", icon: Users, href: "/dashboard/supply-desk/vendors", color: "from-purple-500 to-purple-600", glowColor: "rgba(168,85,247,0.4)", badge: "CRUD", badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { title: "Órdenes de Compra", description: "Gestión de órdenes autorizadas.", icon: ClipboardList, href: "/dashboard/supply-desk/requisitions/orders", color: "from-amber-500 to-orange-500", glowColor: "rgba(245,158,11,0.4)" },
  { title: "Compras", description: "Cotizaciones y comparativas.", icon: ShoppingCart, href: "/dashboard/supply-desk/requisitions/purchasing", color: "from-cyan-500 to-cyan-600", glowColor: "rgba(6,182,212,0.4)" },
  { title: "Pagos", description: "Control de pagos a proveedores.", icon: CreditCard, href: "/dashboard/supply-desk/payments", color: "from-rose-500 to-rose-600", glowColor: "rgba(244,63,94,0.4)" },
  { title: "Logística", description: "Entregas y seguimiento.", icon: Truck, href: "/dashboard/supply-desk/delivery", color: "from-teal-500 to-teal-600", glowColor: "rgba(20,184,166,0.4)" },
  { title: "Configuración", description: "Ajustes del módulo.", icon: Settings, href: "/dashboard/supply-desk/settings", color: "from-slate-500 to-slate-600", glowColor: "rgba(100,116,139,0.3)" },
];

export default function SupplyDeskPage() {
  return (
    <div>
      <ModuleHeader title="Supply Desk" subtitle="Gestión de compras, inventario y proveedores." />
      <ModuleGrid>
        {modules.map((mod, idx) => (
          <ModuleCard key={idx} title={mod.title} description={mod.description} icon={mod.icon} href={mod.href} color={mod.color} glowColor={mod.glowColor} badge={mod.badge} badgeColor={mod.badgeColor} meta={mod.meta} />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\supply-desk\page.tsx" -Encoding UTF8

Write-Host "✓ supply-desk/page.tsx actualizado" -ForegroundColor Green

# ========================================
# 7. TALENT HUB - ACTUALIZADO
# ========================================
@'
"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { Users, Clock, Wallet, SlidersHorizontal, Scale, Grid3X3, UserCog } from "lucide-react";

const modules = [
  { title: "HR People", description: "Expedientes de colaboradores.", icon: Users, href: "/dashboard/talent-hub/people", color: "from-purple-500 to-purple-600", glowColor: "rgba(168,85,247,0.4)", badge: "16", badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30", meta: "Colaboradores" },
  { title: "Clock-In Hub", description: "Control de asistencia.", icon: Clock, href: "/dashboard/talent-hub/clock-in", color: "from-blue-500 to-blue-600", glowColor: "rgba(59,130,246,0.4)", meta: "WhatsApp" },
  { title: "Payroll Flow", description: "Gestión de nómina.", icon: Wallet, href: "/dashboard/talent-hub/payroll", color: "from-emerald-500 to-emerald-600", glowColor: "rgba(52,211,153,0.4)" },
  { title: "Adjustments", description: "Incidencias y ajustes.", icon: SlidersHorizontal, href: "/dashboard/talent-hub/adjustments", color: "from-amber-500 to-orange-500", glowColor: "rgba(245,158,11,0.4)" },
  { title: "Legal HR", description: "Contratos y documentos legales.", icon: Scale, href: "/dashboard/talent-hub/legal", color: "from-rose-500 to-rose-600", glowColor: "rgba(244,63,94,0.4)" },
  { title: "Salary Matrix", description: "Tabulador de sueldos.", icon: Grid3X3, href: "/dashboard/talent-hub/matrix", color: "from-cyan-500 to-cyan-600", glowColor: "rgba(6,182,212,0.4)" },
  { title: "User Access", description: "Control de usuarios del sistema.", icon: UserCog, href: "/dashboard/talent-hub/users", color: "from-slate-500 to-slate-600", glowColor: "rgba(100,116,139,0.3)", badge: "Admin", badgeColor: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
];

export default function TalentHubPage() {
  return (
    <div>
      <ModuleHeader title="Talent Hub" subtitle="Gestión de recursos humanos y nómina." />
      <ModuleGrid>
        {modules.map((mod, idx) => (
          <ModuleCard key={idx} title={mod.title} description={mod.description} icon={mod.icon} href={mod.href} color={mod.color} glowColor={mod.glowColor} badge={mod.badge} badgeColor={mod.badgeColor} meta={mod.meta} />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\talent-hub\page.tsx" -Encoding UTF8

Write-Host "✓ talent-hub/page.tsx actualizado" -ForegroundColor Green

# ========================================
# 8. FINANCE - ACTUALIZADO
# ========================================
@'
"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { Calculator, Receipt, Banknote, Building2, CreditCard, TrendingUp } from "lucide-react";

const modules = [
  { title: "Job Costing", description: "Costeo por proyecto.", icon: Calculator, href: "/dashboard/finance/job-costing", color: "from-blue-500 to-blue-600", glowColor: "rgba(59,130,246,0.4)", meta: "Costos por obra" },
  { title: "Billing Desk", description: "Facturación y cobros.", icon: Receipt, href: "/dashboard/finance/billing", color: "from-emerald-500 to-emerald-600", glowColor: "rgba(52,211,153,0.4)" },
  { title: "Field Cash", description: "Caja chica de obra.", icon: Banknote, href: "/dashboard/finance/field-cash", color: "from-amber-500 to-orange-500", glowColor: "rgba(245,158,11,0.4)" },
  { title: "Bank Reco", description: "Conciliación bancaria.", icon: Building2, href: "/dashboard/finance/bank-reco", color: "from-purple-500 to-purple-600", glowColor: "rgba(168,85,247,0.4)" },
  { title: "Accounts Payable", description: "Cuentas por pagar.", icon: CreditCard, href: "/dashboard/finance/accounts-payable", color: "from-rose-500 to-rose-600", glowColor: "rgba(244,63,94,0.4)" },
  { title: "Receivables", description: "Cuentas por cobrar.", icon: TrendingUp, href: "/dashboard/finance/receivables", color: "from-teal-500 to-teal-600", glowColor: "rgba(20,184,166,0.4)" },
];

export default function FinancePage() {
  return (
    <div>
      <ModuleHeader title="Finance" subtitle="Control financiero y contabilidad." />
      <ModuleGrid>
        {modules.map((mod, idx) => (
          <ModuleCard key={idx} title={mod.title} description={mod.description} icon={mod.icon} href={mod.href} color={mod.color} glowColor={mod.glowColor} meta={mod.meta} />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\finance\page.tsx" -Encoding UTF8

Write-Host "✓ finance/page.tsx actualizado" -ForegroundColor Green

# ========================================
# 9. ASSET - ACTUALIZADO
# ========================================
@'
"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { Box, Activity, MapPin, Wrench } from "lucide-react";

const modules = [
  { title: "Asset Master", description: "Catálogo de activos fijos.", icon: Box, href: "/dashboard/asset/master", color: "from-rose-500 to-rose-600", glowColor: "rgba(244,63,94,0.4)", meta: "Maquinaria" },
  { title: "Asset Status", description: "Estado actual de activos.", icon: Activity, href: "/dashboard/asset/status", color: "from-blue-500 to-blue-600", glowColor: "rgba(59,130,246,0.4)" },
  { title: "Site Allocation", description: "Asignación por obra.", icon: MapPin, href: "/dashboard/asset/allocation", color: "from-emerald-500 to-emerald-600", glowColor: "rgba(52,211,153,0.4)" },
  { title: "Maintenance", description: "Mantenimiento preventivo.", icon: Wrench, href: "/dashboard/asset/maintenance", color: "from-amber-500 to-orange-500", glowColor: "rgba(245,158,11,0.4)" },
];

export default function AssetPage() {
  return (
    <div>
      <ModuleHeader title="Asset" subtitle="Gestión de activos fijos y maquinaria." />
      <ModuleGrid>
        {modules.map((mod, idx) => (
          <ModuleCard key={idx} title={mod.title} description={mod.description} icon={mod.icon} href={mod.href} color={mod.color} glowColor={mod.glowColor} meta={mod.meta} />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\asset\page.tsx" -Encoding UTF8

Write-Host "✓ asset/page.tsx actualizado" -ForegroundColor Green

# ========================================
# 10. TEMPLATES - ACTUALIZADO
# ========================================
@'
"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { FileText, FolderOpen, FileSpreadsheet, ClipboardList } from "lucide-react";

const modules = [
  { title: "Templates", description: "Plantillas de documentos.", icon: FileText, href: "/dashboard/templates/library", color: "from-slate-500 to-slate-600", glowColor: "rgba(100,116,139,0.3)", meta: "Formatos" },
  { title: "Docs Center", description: "Centro de documentación.", icon: FolderOpen, href: "/dashboard/templates/docs", color: "from-blue-500 to-blue-600", glowColor: "rgba(59,130,246,0.4)" },
  { title: "Bid Pack", description: "Paquetes de licitación.", icon: FileSpreadsheet, href: "/dashboard/templates/bids", color: "from-emerald-500 to-emerald-600", glowColor: "rgba(52,211,153,0.4)" },
  { title: "PO Pack", description: "Formatos de órdenes.", icon: ClipboardList, href: "/dashboard/templates/po", color: "from-amber-500 to-orange-500", glowColor: "rgba(245,158,11,0.4)" },
];

export default function TemplatesPage() {
  return (
    <div>
      <ModuleHeader title="Templates" subtitle="Plantillas y documentación estándar." />
      <ModuleGrid>
        {modules.map((mod, idx) => (
          <ModuleCard key={idx} title={mod.title} description={mod.description} icon={mod.icon} href={mod.href} color={mod.color} glowColor={mod.glowColor} meta={mod.meta} />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\templates\page.tsx" -Encoding UTF8

Write-Host "✓ templates/page.tsx actualizado" -ForegroundColor Green

# ========================================
# 11. SETTINGS - ACTUALIZADO
# ========================================
@'
"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { Shield, Bell, Sliders, Database, Mail, Clock, Rocket } from "lucide-react";

const modules = [
  { title: "Access Control", description: "Permisos y roles.", icon: Shield, href: "/dashboard/settings/access", color: "from-purple-500 to-purple-600", glowColor: "rgba(168,85,247,0.4)", meta: "Seguridad" },
  { title: "Alert Engine", description: "Configuración de alertas.", icon: Bell, href: "/dashboard/settings/alerts", color: "from-amber-500 to-orange-500", glowColor: "rgba(245,158,11,0.4)" },
  { title: "Config Matrix", description: "Parámetros del sistema.", icon: Sliders, href: "/dashboard/settings/config", color: "from-blue-500 to-blue-600", glowColor: "rgba(59,130,246,0.4)" },
  { title: "Master Data", description: "Catálogos maestros.", icon: Database, href: "/dashboard/settings/master-data", color: "from-emerald-500 to-emerald-600", glowColor: "rgba(52,211,153,0.4)" },
  { title: "Mail Config", description: "Configuración de correo.", icon: Mail, href: "/dashboard/settings/mail", color: "from-rose-500 to-rose-600", glowColor: "rgba(244,63,94,0.4)", badge: "Resend", badgeColor: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  { title: "Reminders", description: "Recordatorios automáticos.", icon: Clock, href: "/dashboard/settings/reminders", color: "from-cyan-500 to-cyan-600", glowColor: "rgba(6,182,212,0.4)" },
  { title: "Deploy", description: "Estado del sistema.", icon: Rocket, href: "/dashboard/settings/deploy", color: "from-slate-500 to-slate-600", glowColor: "rgba(100,116,139,0.3)", badge: "Prod", badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
];

export default function SettingsPage() {
  return (
    <div>
      <ModuleHeader title="Settings" subtitle="Configuración general del sistema." />
      <ModuleGrid>
        {modules.map((mod, idx) => (
          <ModuleCard key={idx} title={mod.title} description={mod.description} icon={mod.icon} href={mod.href} color={mod.color} glowColor={mod.glowColor} badge={mod.badge} badgeColor={mod.badgeColor} meta={mod.meta} />
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
Write-Host "Build - Badges, espaciado, topbar..." -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ BUILD EXITOSO" -ForegroundColor Green
    git add .
    git commit -m "fix: badges en extrema derecha, gap 28px, topbar mas visible, subtitulos legibles"
    git push
    Write-Host "`n🚀 DEPLOY INICIADO - Espera 2 min" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ ERROR EN BUILD" -ForegroundColor Red
}
