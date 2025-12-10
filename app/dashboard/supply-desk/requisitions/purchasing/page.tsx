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
