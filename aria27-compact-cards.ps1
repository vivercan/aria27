# ========================================
# ARIA27 - CARDS COMPACTAS (ANCHO REDUCIDO)
# Grid 2 columnas, max-width 540px
# ========================================

cd "D:\aria27"

# ========================================
# 1. MODULEGRID - GRID 2 COLUMNAS CON MAX-WIDTH
# ========================================
@'
"use client";

import { ReactNode } from "react";

interface ModuleGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}

export function ModuleGrid({ children, columns = 2 }: ModuleGridProps) {
  // Grid compacto: 2 columnas con max-width por card
  // En pantallas grandes: cards de max 540px con gap visible
  // En pantallas pequeñas: 1 columna
  
  return (
    <div className="
      grid 
      grid-cols-1 
      lg:grid-cols-2 
      gap-x-8 
      gap-y-6
      lg:max-w-[1120px]
    " style={{
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 540px))'
    }}>
      {children}
    </div>
  );
}
'@ | Set-Content "src\components\dashboard\ModuleGrid.tsx" -Encoding UTF8

Write-Host "✓ ModuleGrid.tsx - Grid 2 columnas max-width 540px" -ForegroundColor Green

# ========================================
# 2. MODULECARD - SIN CAMBIOS EN ALTURA
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
      rounded-[20px] 
      border border-white/[0.06]
      bg-[rgba(2,16,36,0.85)] backdrop-blur-xl
      p-5 h-[180px]
      w-full max-w-[540px]
      shadow-[0_16px_40px_rgba(0,0,0,0.50)]
      transition-all duration-300 ease-out
      ${disabled 
        ? 'opacity-40 cursor-not-allowed grayscale' 
        : 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.60),0_0_20px_rgba(56,189,248,0.15)] hover:border-white/[0.10] hover:bg-[rgba(4,20,44,0.90)] active:translate-y-0'
      }
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#021024]
    `}>
      {/* Top shine */}
      <div className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      {/* Badge */}
      {badge && (
        <div className="absolute top-4 right-4 z-20">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${badgeColor} border`}>
            {badge}
          </span>
        </div>
      )}
      
      {/* Content */}
      <div className="relative z-10 flex gap-4 h-full">
        {/* Icon Badge 56x56 */}
        <div className={`
          relative flex-shrink-0 flex items-center justify-center 
          w-14 h-14 rounded-2xl 
          bg-gradient-to-br ${color}
          border border-white/25
          shadow-[0_10px_25px_rgba(0,0,0,0.40)]
          transition-all duration-300
          group-hover:scale-105 group-hover:shadow-[0_14px_35px_rgba(0,0,0,0.50)]
        `}>
          <div className="absolute inset-[1px] rounded-[14px] bg-gradient-to-b from-white/20 to-transparent opacity-50" />
          <Icon className="relative z-10 h-7 w-7 text-white drop-shadow-sm" strokeWidth={2} />
        </div>
        
        {/* Text */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <h3 className="text-[15px] font-semibold text-white/95 leading-tight mb-1 group-hover:text-white transition-colors truncate">
            {title}
          </h3>
          <p className="text-[13px] text-white/55 leading-relaxed group-hover:text-white/65 transition-colors line-clamp-2">
            {description}
          </p>
          {meta && (
            <p className="text-[11px] text-white/35 mt-2 font-medium">{meta}</p>
          )}
        </div>
      </div>
      
      {/* Bottom line on hover */}
      <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${color} opacity-0 group-hover:opacity-50 transition-opacity duration-300`} />
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

Write-Host "✓ ModuleCard.tsx - max-width 540px añadido" -ForegroundColor Green

# ========================================
# 3. SUPPLY DESK - GRID COMPACTO
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
    href: "/dashboard/supply-desk/products", 
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
      <ModuleGrid>
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
# 4. BUILD DESK - GRID COMPACTO
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
      <ModuleGrid>
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
# 5. TALENT HUB - GRID COMPACTO
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
      <ModuleGrid>
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
# 6. FINANCE - GRID COMPACTO
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
      <ModuleGrid>
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
# 7. ASSET - GRID COMPACTO
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
      <ModuleGrid>
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
# 8. TEMPLATES - GRID COMPACTO
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
      <ModuleGrid>
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
# 9. SETTINGS - GRID COMPACTO
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
      <ModuleGrid>
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
# 10. PURCHASING - CARDS COMPACTAS
# ========================================
@'
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  ShoppingCart, 
  Clock, 
  Building2,
  AlertCircle,
  FileText,
  ChevronRight,
  Eye,
  Trash2
} from "lucide-react";

type Requisition = {
  id: number;
  folio: string;
  cost_center_name: string;
  required_date: string;
  created_at: string;
  created_by: string;
  instructions: string;
  purchase_status: string;
  status: string;
};

export default function PurchasingPage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: reqs } = await supabase
      .from("requisitions")
      .select("*")
      .eq("status", "APROBADA")
      .order("required_date", { ascending: true });
    setRequisitions((reqs || []) as Requisition[]);
    setLoading(false);
  };

  const getDaysUntil = (date: string) => {
    const diff = Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getUrgencyBadge = (date: string) => {
    const days = getDaysUntil(date);
    if (days <= 0) return { text: "HOY", color: "from-red-500 to-red-600" };
    if (days <= 2) return { text: `${days}d`, color: "from-orange-500 to-orange-600" };
    if (days <= 5) return { text: `${days}d`, color: "from-amber-500 to-amber-600" };
    return { text: `${days}d`, color: "from-slate-500 to-slate-600" };
  };

  return (
    <div className="min-h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#38BDF8] to-[#003DA5] shadow-lg">
            <ShoppingCart className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Compras</h1>
            <p className="text-sm text-white/50">Lista del Súper – Requisiciones por atender</p>
          </div>
        </div>
      </div>

      {/* Content Grid - Cards max 420px */}
      <div className="grid lg:grid-cols-[420px_1fr] gap-8">
        
        {/* LEFT COLUMN - Cards compactas */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
              <FileText className="w-4 h-4 text-white/50" />
              Por Atender
              <span className="ml-1 px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/70">{requisitions.length}</span>
            </h2>
          </div>
          
          {/* Cards con gap 24px y max-width */}
          <div className="flex flex-col gap-6">
            {loading ? (
              <div className="text-center py-8 text-white/40 text-sm">Cargando...</div>
            ) : requisitions.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-10 h-10 text-white/20 mx-auto mb-2" />
                <p className="text-white/40 text-sm">Sin requisiciones pendientes</p>
              </div>
            ) : (
              requisitions.map((req) => {
                const urgency = getUrgencyBadge(req.required_date);
                const isSelected = selectedReq?.id === req.id;
                
                return (
                  <button
                    key={req.id}
                    onClick={() => setSelectedReq(req)}
                    className={`
                      group w-full max-w-[420px] text-left
                      rounded-[20px] 
                      border transition-all duration-300
                      ${isSelected 
                        ? "border-[#38BDF8]/40 shadow-[0_0_20px_rgba(56,189,248,0.20)]" 
                        : "border-white/[0.06] hover:border-white/[0.10]"
                      }
                      bg-[rgba(2,16,36,0.85)] backdrop-blur-xl
                      shadow-[0_16px_40px_rgba(0,0,0,0.50)]
                      hover:shadow-[0_20px_50px_rgba(0,0,0,0.60)]
                      hover:-translate-y-1
                      hover:bg-[rgba(4,20,44,0.90)]
                      active:translate-y-0
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]
                    `}
                  >
                    <div className="relative z-10 p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <span className="text-[15px] font-semibold text-white truncate block">{req.folio}</span>
                        <div className="flex items-center gap-2 text-white/50 text-[13px] mt-1">
                          <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{req.cost_center_name}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-gradient-to-r ${urgency.color} text-white shadow-sm`}>
                          {urgency.text}
                        </span>
                        <ChevronRight className={`w-4 h-4 text-white/30 transition-all ${isSelected ? "text-[#38BDF8]" : "group-hover:text-white/50"}`} />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className={`
          rounded-[20px]
          border border-white/[0.06]
          bg-[rgba(2,16,36,0.85)] backdrop-blur-xl
          shadow-[0_16px_40px_rgba(0,0,0,0.50)]
          min-h-[300px]
          flex items-center justify-center
          transition-all duration-300
        `}>
          {selectedReq ? (
            <div className="p-6 w-full">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">{selectedReq.folio}</h2>
                  <p className="text-sm text-white/50">{selectedReq.cost_center_name}</p>
                </div>
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r ${getUrgencyBadge(selectedReq.required_date).color} text-white`}>
                  <Clock className="w-3 h-3 mr-1.5" />
                  {getUrgencyBadge(selectedReq.required_date).text}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-white/40 mb-1">Fecha requerida</p>
                  <p className="text-sm text-white font-medium">
                    {new Date(selectedReq.required_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-white/40 mb-1">Solicitado por</p>
                  <p className="text-sm text-white font-medium">{selectedReq.created_by || "—"}</p>
                </div>
              </div>
              
              {selectedReq.instructions && (
                <div className="bg-white/5 rounded-xl p-4 mb-6">
                  <p className="text-xs text-white/40 mb-2">Instrucciones</p>
                  <p className="text-sm text-white/80">{selectedReq.instructions}</p>
                </div>
              )}
              
              <div className="flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#003DA5] text-white font-medium text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
                  <Eye className="w-4 h-4" />
                  Ver Artículos
                </button>
                <button className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 font-medium text-sm hover:bg-white/10 hover:text-white transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center p-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                <FileText className="w-8 h-8 text-white/20" />
              </div>
              <p className="text-white/40 text-sm">Selecciona una requisición</p>
              <p className="text-white/25 text-xs mt-1">para ver los detalles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
'@ | Set-Content "app\dashboard\supply-desk\requisitions\purchasing\page.tsx" -Encoding UTF8

Write-Host "✓ purchasing/page.tsx - Cards max 420px" -ForegroundColor Green

# ========================================
# BUILD Y DEPLOY
# ========================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Build - Cards compactas 2 columnas..." -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ BUILD EXITOSO" -ForegroundColor Green
    
    git add .
    git commit -m "feat: cards compactas max-width 540px, grid 2 columnas, gap 32px horizontal"
    git push
    
    Write-Host "`n🚀 DEPLOY INICIADO" -ForegroundColor Cyan
    Write-Host "Espera 2 min y refresca https://aria.jjcrm27.com" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ ERROR EN BUILD" -ForegroundColor Red
}
