"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FileText, Clock, CheckCircle, Package, Camera, Upload, Truck, Calendar, DollarSign, Building2, X, Loader2 } from "lucide-react";

type PurchaseOrder = {
  id: string;
  folio: string;
  requisition_id: string;
  total: number;
  status: string;
  authorized_by: string;
  authorized_at: string;
  supplier_id: number;
  supplier_name: string;
  received_at: string;
  received_by: string;
  delivery_notes: string;
  invoice_number: string;
  invoice_file: string;
  evidence_photos: string[];
  created_at: string;
};

type Requisition = {
  id: string;
  folio: string;
  cost_center_name: string;
  required_date: string;
  created_at: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [requisitions, setRequisitions] = useState<{[key: string]: Requisition}>({});
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [receiveForm, setReceiveForm] = useState({ notes: "", invoiceNumber: "" });
  const [filter, setFilter] = useState<"all" | "AUTORIZADA" | "RECIBIDA">("all");

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    const { data: ocs } = await supabase
      .from("purchase_orders")
      .select("*")
      .order("created_at", { ascending: false });
    
    setOrders((ocs || []) as PurchaseOrder[]);

    // Cargar requisiciones relacionadas
    if (ocs?.length) {
      const reqIds = [...new Set(ocs.map(o => o.requisition_id).filter(Boolean))];
      const { data: reqs } = await supabase.from("requisitions").select("*").in("id", reqIds);
      const reqMap: {[key: string]: Requisition} = {};
      (reqs || []).forEach(r => reqMap[r.id] = r);
      setRequisitions(reqMap);
    }
    setLoading(false);
  };

  const getDaysRemaining = (requiredDate: string) => {
    if (!requiredDate) return null;
    const diff = Math.ceil((new Date(requiredDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getTimeInfo = (order: PurchaseOrder) => {
    const req = requisitions[order.requisition_id];
    if (!req) return { days: null, color: "gray", text: "N/A" };
    const days = getDaysRemaining(req.required_date);
    if (days === null) return { days: null, color: "gray", text: "N/A" };
    if (days <= 0) return { days: 0, color: "red", text: "¡VENCIDO!" };
    if (days === 1) return { days: 1, color: "red", text: "¡MAÑANA!" };
    if (days <= 3) return { days, color: "amber", text: `${days} días` };
    return { days, color: "emerald", text: `${days} días` };
  };

  const handleReceive = async () => {
    if (!selectedOrder) return;
    setReceiving(true);
    
    await supabase.from("purchase_orders").update({
      status: "RECIBIDA",
      received_at: new Date().toISOString(),
      received_by: "Compras",
      delivery_notes: receiveForm.notes,
      invoice_number: receiveForm.invoiceNumber
    }).eq("id", selectedOrder.id);

    setReceiving(false);
    setShowReceiveModal(false);
    setSelectedOrder(null);
    setReceiveForm({ notes: "", invoiceNumber: "" });
    loadOrders();
  };

  const filteredOrders = orders.filter(o => filter === "all" || o.status === filter);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-cyan-400" />
            Órdenes de Compra
          </h1>
          <p className="text-white/60 text-sm">Seguimiento de compras autorizadas y recepción de materiales.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-lg text-sm ${filter === "all" ? "bg-white/20" : "bg-white/5"}`}>Todas ({orders.length})</button>
          <button onClick={() => setFilter("AUTORIZADA")} className={`px-4 py-2 rounded-lg text-sm ${filter === "AUTORIZADA" ? "bg-amber-500/30 text-amber-400" : "bg-white/5"}`}>
            Pendientes ({orders.filter(o => o.status === "AUTORIZADA").length})
          </button>
          <button onClick={() => setFilter("RECIBIDA")} className={`px-4 py-2 rounded-lg text-sm ${filter === "RECIBIDA" ? "bg-emerald-500/30 text-emerald-400" : "bg-white/5"}`}>
            Recibidas ({orders.filter(o => o.status === "RECIBIDA").length})
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white/5 p-5">
        {loading ? (
          <div className="text-center py-12 text-white/50">Cargando...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-white/50">No hay órdenes de compra {filter !== "all" && `con estado ${filter}`}</div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map(order => {
              const req = requisitions[order.requisition_id];
              const timeInfo = getTimeInfo(order);
              return (
                <div key={order.id} className={`rounded-xl border p-5 ${order.status === "RECIBIDA" ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-black/20"}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${order.status === "RECIBIDA" ? "bg-emerald-500" : "bg-amber-500"}`}>
                        {order.status === "RECIBIDA" ? <CheckCircle className="h-6 w-6 text-white" /> : <Clock className="h-6 w-6 text-white" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg">{order.folio}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${order.status === "RECIBIDA" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                            {order.status === "RECIBIDA" ? "✓ RECIBIDA" : "PENDIENTE RECEPCIÓN"}
                          </span>
                        </div>
                        <div className="text-sm text-white/60 mt-1">
                          Requisición: {req?.folio || "N/A"} • {req?.cost_center_name || ""}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Autorizada: {new Date(order.authorized_at).toLocaleDateString("es-MX")}</span>
                          <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${order.total?.toLocaleString() || 0} MXN</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {order.status !== "RECIBIDA" && (
                        <div className={`text-2xl font-bold ${timeInfo.color === "red" ? "text-red-400" : timeInfo.color === "amber" ? "text-amber-400" : "text-emerald-400"}`}>
                          {timeInfo.text}
                        </div>
                      )}
                      {order.status !== "RECIBIDA" ? (
                        <button onClick={() => { setSelectedOrder(order); setShowReceiveModal(true); }}
                          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-emerald-400">
                          <Package className="h-4 w-4" /> Registrar Recepción
                        </button>
                      ) : (
                        <div className="text-xs text-white/50 mt-2">
                          Recibida: {new Date(order.received_at).toLocaleDateString("es-MX")}
                          {order.invoice_number && <div>Factura: {order.invoice_number}</div>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Recepción */}
      {showReceiveModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-lg rounded-2xl bg-slate-800 p-6 shadow-xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-400" />
                Registrar Recepción
              </h2>
              <button onClick={() => setShowReceiveModal(false)} className="rounded-full p-1 hover:bg-white/10"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="space-y-4">
              <div className="rounded-xl bg-white/5 p-4">
                <div className="text-sm text-white/50">Orden de Compra</div>
                <div className="text-xl font-bold">{selectedOrder.folio}</div>
                <div className="text-emerald-400 font-bold mt-1">${selectedOrder.total?.toLocaleString()} MXN</div>
              </div>

              <div>
                <label className="text-xs text-white/70">Número de Factura</label>
                <input className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm mt-1"
                  placeholder="Ej: FAC-12345"
                  value={receiveForm.invoiceNumber}
                  onChange={e => setReceiveForm(f => ({...f, invoiceNumber: e.target.value}))} />
              </div>

              <div>
                <label className="text-xs text-white/70">Notas de Recepción</label>
                <textarea className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm mt-1 h-24"
                  placeholder="Observaciones sobre la entrega, estado del material, etc."
                  value={receiveForm.notes}
                  onChange={e => setReceiveForm(f => ({...f, notes: e.target.value}))} />
              </div>

              <div>
                <label className="text-xs text-white/70 flex items-center gap-2"><Camera className="h-4 w-4" />Evidencia Fotográfica (próximamente)</label>
                <div className="mt-2 border-2 border-dashed border-white/20 rounded-xl p-8 text-center text-white/40">
                  <Upload className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Función de fotos próximamente</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowReceiveModal(false)} className="px-4 py-2 rounded-full text-sm hover:bg-white/10">Cancelar</button>
              <button onClick={handleReceive} disabled={receiving}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-2 text-sm font-medium text-slate-900 hover:bg-emerald-400">
                {receiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Confirmar Recepción
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
