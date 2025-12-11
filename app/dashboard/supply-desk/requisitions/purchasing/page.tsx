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
  Trash2,
  Package,
  X
} from "lucide-react";

type Requisition = {
  id: number;
  folio: string;
  cost_center_name: string;
  required_date: string;
  created_at: string;
  created_by: string;
  user_email: string;
  instructions: string;
  purchase_status: string;
  status: string;
};

type RequisitionItem = {
  id: number;
  product_name: string;
  unit: string;
  quantity: number;
  comments: string;
};

export default function PurchasingPage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
  const [items, setItems] = useState<RequisitionItem[]>([]);
  const [showItems, setShowItems] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);

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

  const loadItems = async (reqId: number) => {
    setLoadingItems(true);
    const { data } = await supabase
      .from("requisition_items")
      .select("*")
      .eq("requisition_id", reqId);
    setItems((data || []) as RequisitionItem[]);
    setShowItems(true);
    setLoadingItems(false);
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

      <div className="grid lg:grid-cols-[420px_1fr] gap-8">
        {/* LEFT COLUMN */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
              <FileText className="w-4 h-4 text-white/50" />
              Por Atender
              <span className="ml-1 px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/70">{requisitions.length}</span>
            </h2>
          </div>

          <div className="flex flex-col gap-4">
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
                    onClick={() => { setSelectedReq(req); setShowItems(false); }}
                    className={`
                      group w-full text-left rounded-2xl border transition-all duration-300
                      ${isSelected
                        ? "border-[#38BDF8]/40 shadow-[0_0_20px_rgba(56,189,248,0.20)]"
                        : "border-white/[0.06] hover:border-white/[0.10]"
                      }
                      bg-[rgba(2,16,36,0.85)] backdrop-blur-xl
                      shadow-[0_8px_24px_rgba(0,0,0,0.40)]
                      hover:shadow-[0_12px_32px_rgba(0,0,0,0.50)]
                      hover:-translate-y-0.5
                      active:translate-y-0
                    `}
                  >
                    <div className="p-4 flex items-center gap-4">
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
        <div className="rounded-2xl border border-white/[0.06] bg-[rgba(2,16,36,0.85)] backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.50)] min-h-[300px]">
          {selectedReq ? (
            <div className="p-6">
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
                  <p className="text-sm text-white font-medium">{selectedReq.user_email || selectedReq.created_by || "—"}</p>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 mb-6">
                <button 
                  onClick={() => loadItems(selectedReq.id)}
                  disabled={loadingItems}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#003DA5] text-white font-medium text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50"
                >
                  <Eye className="w-4 h-4" />
                  {loadingItems ? "Cargando..." : "Ver Artículos"}
                </button>
                <button className="inline-flex items-center justify-center p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Lista de artículos */}
              {showItems && (
                <div className="border-t border-white/10 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                      <Package className="w-4 h-4 text-[#38BDF8]" />
                      Artículos ({items.length})
                    </h3>
                    <button onClick={() => setShowItems(false)} className="p-1 rounded hover:bg-white/10">
                      <X className="w-4 h-4 text-white/40" />
                    </button>
                  </div>
                  
                  {items.length === 0 ? (
                    <p className="text-white/40 text-sm text-center py-4">Sin artículos</p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-auto">
                      {items.map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/8 transition-all">
                          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[#38BDF8]/20 text-[#38BDF8] text-xs font-bold">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate">{item.product_name}</p>
                            {item.comments && <p className="text-xs text-white/40 truncate">{item.comments}</p>}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm text-white font-semibold">{item.quantity}</p>
                            <p className="text-xs text-white/40">{item.unit}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <div className="text-center p-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-white/20" />
                </div>
                <p className="text-white/40 text-sm">Selecciona una requisición</p>
                <p className="text-white/25 text-xs mt-1">para ver los detalles</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
