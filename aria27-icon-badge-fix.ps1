# ========================================
# ARIA27 - AJUSTE ICON BADGE GRANDE + UI
# ========================================

cd "D:\aria27"

# ========================================
# 1. COMPONENTE ModuleCard CON ICON BADGE GRANDE
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
  badgeColor = "bg-white/10 text-white/70",
  meta,
  disabled 
}: ModuleCardProps) {
  const cardContent = (
    <div className={`
      group relative overflow-hidden rounded-2xl 
      border border-white/[0.08] 
      bg-gradient-to-br from-slate-800/50 to-slate-900/50
      backdrop-blur-xl
      p-6 h-[180px]
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
      
      {/* Badge - esquina superior derecha */}
      {badge && (
        <div className="absolute top-4 right-4 z-20">
          <span className={`
            inline-flex items-center px-2.5 py-1 rounded-full 
            text-[10px] font-bold tracking-wider uppercase
            ${badgeColor}
            border border-white/10
            shadow-sm
          `}>
            {badge}
          </span>
        </div>
      )}
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* ICON BADGE GRANDE - 56x56px */}
        <div className={`
          relative flex items-center justify-center 
          w-14 h-14 rounded-2xl 
          bg-gradient-to-br ${color}
          shadow-lg shadow-black/30
          mb-4
          transition-all duration-300
          group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-black/40
          before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-t before:from-black/20 before:to-transparent
          after:absolute after:inset-[1px] after:rounded-[14px] after:bg-gradient-to-b after:from-white/25 after:to-transparent after:opacity-60
        `}>
          <Icon className="relative z-10 h-7 w-7 text-white drop-shadow-md" strokeWidth={1.75} />
        </div>
        
        {/* Texto */}
        <div className="flex-1 flex flex-col">
          {/* Title */}
          <h3 className="text-[15px] font-semibold text-white/95 leading-tight mb-1 group-hover:text-white transition-colors">
            {title}
          </h3>
          
          {/* Description */}
          <p className="text-[13px] text-white/45 leading-relaxed group-hover:text-white/55 transition-colors flex-1">
            {description}
          </p>
          
          {/* Meta info - renglón opcional */}
          {meta && (
            <p className="text-[11px] text-white/30 mt-2 font-medium tracking-wide">
              {meta}
            </p>
          )}
        </div>
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

Write-Host "✓ ModuleCard.tsx con icon badge 56x56" -ForegroundColor Green

# ========================================
# 2. SUPPLY DESK - ACTUALIZADO
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
    badgeColor: "bg-emerald-500/20 text-emerald-300",
    meta: "Flujo completo de requisiciones"
  },
  { 
    title: "Inventario", 
    description: "Control de stock y almacén.", 
    icon: Package, 
    href: "/dashboard/supply-desk/inventory", 
    color: "from-blue-500 to-blue-600",
    meta: "Próximamente"
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
            meta={mod.meta}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\supply-desk\page.tsx" -Encoding UTF8

Write-Host "✓ supply-desk/page.tsx actualizado" -ForegroundColor Green

# ========================================
# 3. BUILD DESK - ACTUALIZADO
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
    badge: "5 Obras",
    badgeColor: "bg-amber-500/20 text-amber-300",
    meta: "Proyectos en ejecución"
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
            meta={mod.meta}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\build-desk\page.tsx" -Encoding UTF8

Write-Host "✓ build-desk/page.tsx actualizado" -ForegroundColor Green

# ========================================
# 4. TALENT HUB - ACTUALIZADO
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
    badge: "16",
    badgeColor: "bg-violet-500/20 text-violet-300",
    meta: "Colaboradores registrados"
  },
  { 
    title: "Clock-In Hub", 
    description: "Control de asistencia.", 
    icon: Clock, 
    href: "/dashboard/talent-hub/clock-in", 
    color: "from-blue-500 to-blue-600",
    meta: "WhatsApp integration"
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
            meta={mod.meta}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\talent-hub\page.tsx" -Encoding UTF8

Write-Host "✓ talent-hub/page.tsx actualizado" -ForegroundColor Green

# ========================================
# 5. FINANCE - ACTUALIZADO
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
    color: "from-blue-500 to-cyan-600",
    meta: "Análisis de costos por obra"
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
            meta={mod.meta}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\finance\page.tsx" -Encoding UTF8

Write-Host "✓ finance/page.tsx actualizado" -ForegroundColor Green

# ========================================
# 6. ASSET - ACTUALIZADO
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
    color: "from-rose-500 to-pink-600",
    meta: "Maquinaria y equipo"
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
            meta={mod.meta}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\asset\page.tsx" -Encoding UTF8

Write-Host "✓ asset/page.tsx actualizado" -ForegroundColor Green

# ========================================
# 7. TEMPLATES - ACTUALIZADO
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
    color: "from-slate-400 to-slate-600",
    meta: "Formatos estándar"
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
            meta={mod.meta}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
'@ | Set-Content "app\dashboard\templates\page.tsx" -Encoding UTF8

Write-Host "✓ templates/page.tsx actualizado" -ForegroundColor Green

# ========================================
# 8. SETTINGS - ACTUALIZADO
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
    color: "from-violet-500 to-purple-600",
    meta: "Seguridad del sistema"
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
    color: "from-rose-500 to-pink-600",
    badge: "Resend",
    badgeColor: "bg-rose-500/20 text-rose-300"
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
    color: "from-slate-500 to-slate-600",
    badge: "Prod",
    badgeColor: "bg-emerald-500/20 text-emerald-300"
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

Write-Host "✓ settings/page.tsx actualizado" -ForegroundColor Green

# ========================================
# BUILD Y DEPLOY
# ========================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Ejecutando build..." -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ BUILD EXITOSO - ICON BADGE 56x56px" -ForegroundColor Green
    
    git add .
    git commit -m "feat: icon badge grande 56x56, altura fija 180px, meta info, badges uniformes"
    git push
    
    Write-Host "`n🚀 DEPLOY INICIADO - Espera 2 min" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ ERROR EN BUILD" -ForegroundColor Red
}
