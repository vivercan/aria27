# ========================================
# ARIA27 - TIMONFX + FIX COMPRAS LISTA SUPER
# ========================================

cd "D:\aria27"

# ========================================
# 1. TOKENS/VARIABLES CSS GLOBALES
# ========================================
@'

/* ===== ARIA27 DESIGN TOKENS - TIMONFX ===== */
:root {
  /* Primary Blues - Pantone 293C inspired */
  --aria-blue-core: #003DA5;
  --aria-blue-soft: #0D3F8D;
  --aria-blue-glow: #38BDF8;
  --aria-blue-accent: #2563EB;
  
  /* Dark Navy */
  --aria-deep-navy: #020712;
  --aria-card-bg: rgba(8, 16, 30, 0.85);
  --aria-card-bg-hover: rgba(12, 22, 40, 0.90);
  
  /* Borders */
  --aria-border-subtle: rgba(255, 255, 255, 0.04);
  --aria-border-hover: rgba(56, 189, 248, 0.40);
  
  /* Shadows */
  --aria-card-shadow: 0 18px 40px rgba(0, 0, 0, 0.55);
  --aria-card-shadow-hover: 0 24px 50px rgba(0, 0, 0, 0.65);
  --aria-glow-blue: 0 0 18px rgba(0, 125, 255, 0.35);
  
  /* Radius */
  --aria-card-radius: 20px;
  --aria-badge-radius: 999px;
  
  /* Spacing */
  --aria-card-gap: 24px;
  --aria-card-padding: 16px 20px;
}

/* Noise texture muy sutil */
.aria-noise-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.12;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
}
'@ | Add-Content "app\globals.css"

Write-Host "✓ Tokens CSS agregados a globals.css" -ForegroundColor Green

# ========================================
# 2. PÁGINA COMPRAS (PURCHASING) REDISEÑADA
# ========================================
@'
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  ShoppingCart, 
  Calendar, 
  Eye, 
  Trash2, 
  Clock, 
  Building2,
  AlertCircle,
  FileText,
  ChevronRight
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
    if (days <= 0) {
      return { text: "HOY", color: "from-red-500 to-red-600", textColor: "text-white" };
    } else if (days <= 2) {
      return { text: `${days}d`, color: "from-orange-500 to-orange-600", textColor: "text-white" };
    } else if (days <= 5) {
      return { text: `${days}d`, color: "from-amber-500 to-amber-600", textColor: "text-white" };
    }
    return { text: `${days}d`, color: "from-slate-500 to-slate-600", textColor: "text-white" };
  };

  return (
    <div className="relative min-h-[calc(100vh-120px)]">
      {/* Fondo con gradiente ARIA */}
      <div 
        className="absolute inset-0 -z-10 rounded-3xl overflow-hidden"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 80% 85%, #0D3F8D 0%, #020712 55%, #02030A 100%)",
        }}
      />
      
      {/* Noise muy sutil */}
      <div 
        className="absolute inset-0 -z-10 opacity-[0.12] pointer-events-none rounded-3xl"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Vignette sutil superior */}
      <div 
        className="absolute inset-0 -z-10 pointer-events-none rounded-3xl"
        style={{
          background: "linear-gradient(180deg, rgba(2,7,18,0.4) 0%, transparent 15%, transparent 85%, rgba(2,7,18,0.3) 100%)",
        }}
      />

      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#38BDF8] to-[#2563EB] shadow-lg">
            <ShoppingCart className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Compras</h1>
            <p className="text-sm text-white/50">Lista del Súper – Requisiciones por atender</p>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="px-6 pb-6">
        <div className="grid lg:grid-cols-[380px_1fr] gap-6">
          
          {/* LEFT COLUMN - Lista de requisiciones */}
          <div className="space-y-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                <FileText className="w-4 h-4 text-white/50" />
                Por Atender
                <span className="ml-1 px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/70">
                  {requisitions.length}
                </span>
              </h2>
            </div>
            
            <div className="space-y-5">
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
                        relative overflow-hidden
                        rounded-[20px] 
                        border transition-all duration-300
                        ${isSelected 
                          ? "border-[#38BDF8]/50 shadow-[0_0_20px_rgba(56,189,248,0.25)]" 
                          : "border-white/[0.04] hover:border-white/[0.08]"
                        }
                        bg-[rgba(8,16,30,0.85)] backdrop-blur-xl
                        shadow-[0_18px_40px_rgba(0,0,0,0.55)]
                        hover:shadow-[0_24px_50px_rgba(0,0,0,0.65)]
                        hover:-translate-y-[3px] hover:scale-[1.01]
                        hover:bg-[rgba(12,22,40,0.90)]
                        active:translate-y-0 active:scale-[0.99]
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020712]
                      `}
                    >
                      {/* Inner glow on selected */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#38BDF8]/10 to-transparent rounded-[20px]" />
                      )}
                      
                      {/* Card content - más compacto */}
                      <div className="relative z-10 p-4 flex items-center gap-4">
                        {/* Left: Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[15px] font-semibold text-white truncate">
                              {req.folio}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-white/50 text-[13px]">
                            <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{req.cost_center_name}</span>
                          </div>
                        </div>
                        
                        {/* Right: Urgency badge + arrow */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`
                            inline-flex items-center px-2.5 py-1 
                            rounded-full text-[11px] font-bold tracking-wide
                            bg-gradient-to-r ${urgency.color} ${urgency.textColor}
                            shadow-sm
                          `}>
                            {urgency.text}
                          </span>
                          
                          <ChevronRight className={`
                            w-4 h-4 text-white/30 transition-all
                            ${isSelected ? "text-[#38BDF8] translate-x-0.5" : "group-hover:text-white/50 group-hover:translate-x-0.5"}
                          `} />
                        </div>
                      </div>
                      
                      {/* Bottom accent line on hover */}
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#38BDF8] to-[#2563EB] opacity-0 group-hover:opacity-60 transition-opacity" />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANEL - Detalle */}
          <div className={`
            relative overflow-hidden
            rounded-[20px]
            border border-white/[0.04]
            bg-[rgba(8,16,30,0.85)] backdrop-blur-xl
            shadow-[0_18px_40px_rgba(0,0,0,0.55)]
            min-h-[300px]
            flex items-center justify-center
            transition-all duration-300
            ${selectedReq ? "" : "hover:border-white/[0.08] hover:bg-[rgba(12,22,40,0.90)]"}
          `}>
            {/* Gradiente interno sutil */}
            <div 
              className="absolute inset-0 opacity-30 rounded-[20px]"
              style={{
                background: "linear-gradient(145deg, rgba(2,8,31,0.5) 0%, rgba(4,23,49,0.3) 100%)",
              }}
            />
            
            {/* Top shine */}
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            
            {selectedReq ? (
              <div className="relative z-10 p-6 w-full">
                {/* Header del detalle */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">{selectedReq.folio}</h2>
                    <p className="text-sm text-white/50">{selectedReq.cost_center_name}</p>
                  </div>
                  <span className={`
                    inline-flex items-center px-3 py-1.5 
                    rounded-full text-xs font-bold tracking-wide
                    bg-gradient-to-r ${getUrgencyBadge(selectedReq.required_date).color} text-white
                  `}>
                    <Clock className="w-3 h-3 mr-1.5" />
                    {getUrgencyBadge(selectedReq.required_date).text}
                  </span>
                </div>
                
                {/* Info grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-white/40 mb-1">Fecha requerida</p>
                    <p className="text-sm text-white font-medium">
                      {new Date(selectedReq.required_date).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-white/40 mb-1">Solicitado por</p>
                    <p className="text-sm text-white font-medium">{selectedReq.created_by || "—"}</p>
                  </div>
                </div>
                
                {/* Instrucciones */}
                {selectedReq.instructions && (
                  <div className="bg-white/5 rounded-xl p-4 mb-6">
                    <p className="text-xs text-white/40 mb-2">Instrucciones</p>
                    <p className="text-sm text-white/80">{selectedReq.instructions}</p>
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex gap-3">
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#2563EB] text-white font-medium text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
                    <Eye className="w-4 h-4" />
                    Ver Artículos
                  </button>
                  <button className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 font-medium text-sm hover:bg-white/10 hover:text-white transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative z-10 text-center p-8">
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
    </div>
  );
}
'@ | Set-Content "app\dashboard\supply-desk\requisitions\purchasing\page.tsx" -Encoding UTF8

Write-Host "✓ purchasing/page.tsx rediseñado estilo TIMONFX" -ForegroundColor Green

# ========================================
# 3. LAYOUT DASHBOARD - TIMONFX ACTUALIZADO
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
    <div className="relative min-h-screen overflow-hidden bg-[#020712]">
      {/* ===== FONDO TIMONFX - CAPAS ===== */}
      
      {/* Capa 1: Gradiente base ultra oscuro */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: "linear-gradient(145deg, #020617 0%, #020B2A 35%, #011229 55%, #0B2558 100%)",
        }}
      />
      
      {/* Capa 2: Halo metálico principal - Pantone 293C inspired */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 85% 85%, rgba(0,61,165,0.30) 0%, rgba(13,63,141,0.12) 40%, transparent 70%)",
        }}
      />
      
      {/* Capa 3: Halo secundario central */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(15,23,42,0.5) 0%, transparent 50%)",
        }}
      />
      
      {/* Capa 4: Accent cyan sutil */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 15% 15%, rgba(56,189,248,0.04) 0%, transparent 30%)",
        }}
      />
      
      {/* Capa 5: Noise texture - MUY sutil */}
      <div 
        className="fixed inset-0 z-0 opacity-[0.10] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ===== CONTENIDO z-10 ===== */}
      <div className="relative z-10 flex min-h-screen">
        
        {/* ===== MOBILE MENU BUTTON ===== */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-[rgba(8,16,30,0.9)] backdrop-blur-xl border border-white/10 text-white shadow-lg"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* ===== SIDEBAR TIMONFX ===== */}
        <aside className={`
          fixed left-0 top-0 bottom-0 w-64 flex flex-col 
          bg-[#02081F]/95 backdrop-blur-2xl 
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
                      ? "bg-white/[0.05] text-white" 
                      : "text-white/70 hover:text-white/90 hover:bg-white/[0.03]"
                    }
                  `}
                >
                  {/* Barra luminosa activa */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-[#38BDF8] to-[#003DA5] rounded-full shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
                  )}
                  
                  <item.icon className={`w-5 h-5 ${isActive ? "text-white" : "text-white/70"}`} strokeWidth={2} />
                  <span className="flex-1">{item.name}</span>
                  
                  {isActive && (
                    <ChevronRight className="w-4 h-4 text-white/40" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer sidebar */}
          <div className="px-4 py-4 border-t border-white/[0.04]">
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
              bg-[rgba(8,16,30,0.85)] backdrop-blur-xl
              border border-white/[0.06]
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
                    bg-white/[0.04] backdrop-blur
                    border border-white/[0.06] rounded-xl 
                    text-sm text-white placeholder-white/40 
                    outline-none 
                    focus:border-[#38BDF8]/40 focus:ring-1 focus:ring-[#38BDF8]/50 focus:bg-white/[0.06]
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
                <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#38BDF8] to-[#003DA5] text-white text-sm font-semibold shadow-lg shadow-blue-500/20">
                  {userName.charAt(0)}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.05] transition-all border border-transparent hover:border-white/10"
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

Write-Host "✓ layout.tsx TIMONFX actualizado" -ForegroundColor Green

# ========================================
# 4. MODULECARD - TIMONFX FINAL
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
      border border-white/[0.04]
      bg-[rgba(8,16,30,0.85)] backdrop-blur-xl
      p-5 h-[180px]
      shadow-[0_18px_40px_rgba(0,0,0,0.55)]
      transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]
      ${disabled 
        ? 'opacity-40 cursor-not-allowed grayscale' 
        : 'cursor-pointer hover:-translate-y-[3px] hover:scale-[1.01] hover:shadow-[0_24px_50px_rgba(0,0,0,0.65),0_0_18px_rgba(0,125,255,0.35)] hover:border-white/[0.08] hover:bg-[rgba(12,22,40,0.90)] active:translate-y-0 active:scale-[0.99]'
      }
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020712]
    `}>
      {/* Gradiente interno sutil */}
      <div 
        className="absolute inset-0 opacity-30 rounded-[20px]"
        style={{
          background: "linear-gradient(145deg, rgba(2,8,31,0.5) 0%, rgba(4,23,49,0.3) 100%)",
        }}
      />
      
      {/* Top shine */}
      <div className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      
      {/* Badge - esquina superior derecha */}
      {badge && (
        <div className="absolute top-4 right-4 z-20">
          <span className={`
            inline-flex items-center px-2.5 py-1 rounded-full 
            text-[10px] font-bold tracking-wider uppercase
            ${badgeColor}
            border
          `}>
            {badge}
          </span>
        </div>
      )}
      
      {/* Content */}
      <div className="relative z-10 flex gap-4 h-full">
        {/* ICON BADGE - 56x56px */}
        <div className={`
          relative flex-shrink-0 flex items-center justify-center 
          w-14 h-14 rounded-2xl 
          bg-gradient-to-br ${color}
          border border-white/30
          shadow-[0_12px_30px_rgba(0,0,0,0.45)]
          transition-all duration-300
          group-hover:scale-105 group-hover:shadow-[0_16px_40px_rgba(0,0,0,0.55)]
        `}>
          {/* Inner glow */}
          <div className="absolute inset-[1px] rounded-[14px] bg-gradient-to-b from-white/20 to-transparent opacity-60" />
          <Icon className="relative z-10 h-7 w-7 text-white drop-shadow-md" strokeWidth={2} />
        </div>
        
        {/* Texto */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          {/* Title */}
          <h3 className="text-[15px] font-semibold text-white/95 leading-tight mb-1 group-hover:text-white transition-colors truncate">
            {title}
          </h3>
          
          {/* Description */}
          <p className="text-[13px] text-white/60 leading-relaxed group-hover:text-white/70 transition-colors line-clamp-2">
            {description}
          </p>
          
          {/* Meta info */}
          {meta && (
            <p className="text-[11px] text-white/40 mt-2 font-medium">
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

Write-Host "✓ ModuleCard.tsx TIMONFX final" -ForegroundColor Green

# ========================================
# BUILD Y DEPLOY
# ========================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Build TIMONFX + Compras Lista Super..." -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ BUILD EXITOSO - TIMONFX COMPLETO" -ForegroundColor Green
    
    git add .
    git commit -m "feat: estilo TIMONFX completo - Compras rediseñado, cards glass premium, noise reducido"
    git push
    
    Write-Host "`n🚀 DEPLOY INICIADO" -ForegroundColor Cyan
    Write-Host "Espera 2-3 min y refresca https://aria.jjcrm27.com" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ ERROR EN BUILD" -ForegroundColor Red
}
