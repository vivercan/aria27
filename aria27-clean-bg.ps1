# ========================================
# ARIA27 - FIX: FONDO LIMPIO + ESPACIADO CARDS
# Sin noise, gradiente limpio, gap 24px
# ========================================

cd "D:\aria27"

# ========================================
# 1. LAYOUT DASHBOARD - FONDO LIMPIO SIN NOISE
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
    <div className="relative min-h-screen overflow-hidden bg-[#021024]">
      {/* ===== FONDO LIMPIO - SIN NOISE ===== */}
      
      {/* Capa única: Gradiente radial limpio estilo Pantone 293C */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse 80% 70% at 85% 90%, #0B57D0 0%, #003DA5 45%, #021024 100%)",
        }}
      />

      {/* ===== CONTENIDO z-10 ===== */}
      <div className="relative z-10 flex min-h-screen">
        
        {/* ===== MOBILE MENU BUTTON ===== */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-[rgba(2,16,36,0.95)] backdrop-blur-xl border border-white/10 text-white shadow-lg"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* ===== SIDEBAR ===== */}
        <aside className={`
          fixed left-0 top-0 bottom-0 w-64 flex flex-col 
          bg-[#010B18]/98 backdrop-blur-2xl 
          border-r border-white/[0.04]
          shadow-[4px_0_30px_-4px_rgba(0,0,0,0.5)]
          transition-transform duration-300 z-40
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-white/[0.04]">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-[#38BDF8] to-[#003DA5] shadow-lg shadow-blue-500/25">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">ARIA</h1>
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
                    focus-visible:ring-2 focus-visible:ring-[#38BDF8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#021024]
                    ${isActive 
                      ? "bg-white/[0.06] text-white" 
                      : "text-white/70 hover:text-white/90 hover:bg-white/[0.03]"
                    }
                  `}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-[#38BDF8] to-[#003DA5] rounded-full shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
                  )}
                  <item.icon className={`w-5 h-5 ${isActive ? "text-white" : "text-white/70"}`} strokeWidth={2} />
                  <span className="flex-1">{item.name}</span>
                  {isActive && <ChevronRight className="w-4 h-4 text-white/40" />}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-4 py-4 border-t border-white/[0.04]">
            <div className="flex items-center gap-2 justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
              <p className="text-[10px] text-white/30 tracking-wide">ARIA v2025.1 · Production</p>
            </div>
          </div>
        </aside>

        {/* ===== OVERLAY MOBILE ===== */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ===== MAIN CONTENT ===== */}
        <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
          
          {/* ===== TOPBAR ===== */}
          <header className="sticky top-0 z-20 px-4 lg:px-6 py-4">
            <div className="flex items-center justify-between gap-4 px-5 py-3.5 rounded-2xl bg-[rgba(2,16,36,0.90)] backdrop-blur-xl border border-white/[0.06] shadow-[0_18px_45px_rgba(0,0,0,0.55)]">
              {/* Search */}
              <div className="relative flex-1 max-w-md ml-10 lg:ml-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Buscar módulos, documentos..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.06] rounded-xl text-sm text-white placeholder-white/40 outline-none focus:border-[#38BDF8]/40 focus:ring-1 focus:ring-[#38BDF8]/50 transition-all"
                />
              </div>

              {/* Date */}
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[11px] font-semibold text-white/80 tracking-wider">{currentDate.day}</span>
                <span className="text-[11px] text-white/50">{currentDate.full}</span>
              </div>

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
                <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#38BDF8] to-[#003DA5] text-white text-sm font-semibold shadow-lg shadow-blue-500/20">
                  {userName.charAt(0)}
                </div>
                <button onClick={handleLogout} className="p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.05] transition-all border border-transparent hover:border-white/10" title="Cerrar sesión">
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

Write-Host "✓ layout.tsx - Fondo limpio sin noise" -ForegroundColor Green

# ========================================
# 2. MODULEGRID - GAP 24px
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
    <div className={`grid ${gridCols[columns]} gap-6`}>
      {children}
    </div>
  );
}
'@ | Set-Content "src\components\dashboard\ModuleGrid.tsx" -Encoding UTF8

Write-Host "✓ ModuleGrid.tsx - Gap 24px (gap-6)" -ForegroundColor Green

# ========================================
# 3. MODULECARD - ESTILO LIMPIO
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

Write-Host "✓ ModuleCard.tsx - Estilo limpio" -ForegroundColor Green

# ========================================
# 4. PURCHASING PAGE - FONDO LIMPIO + GAP 24px
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

      {/* Content Grid */}
      <div className="grid lg:grid-cols-[380px_1fr] gap-6">
        
        {/* LEFT COLUMN */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
              <FileText className="w-4 h-4 text-white/50" />
              Por Atender
              <span className="ml-1 px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/70">{requisitions.length}</span>
            </h2>
          </div>
          
          {/* Cards con gap-6 (24px) */}
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
                      group w-full text-left
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

Write-Host "✓ purchasing/page.tsx - Fondo limpio + gap 24px" -ForegroundColor Green

# ========================================
# BUILD Y DEPLOY
# ========================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Build - Fondo limpio + Espaciado..." -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ BUILD EXITOSO" -ForegroundColor Green
    
    git add .
    git commit -m "fix: fondo limpio sin noise, gradiente Pantone 293C, gap 24px entre cards"
    git push
    
    Write-Host "`n🚀 DEPLOY INICIADO" -ForegroundColor Cyan
    Write-Host "Espera 2 min y refresca https://aria.jjcrm27.com" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ ERROR EN BUILD" -ForegroundColor Red
}
