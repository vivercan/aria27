"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FileText, Clock, CheckCircle, Package, Camera, Upload, Calendar, DollarSign, X, Loader2, Download, Eye, AlertTriangle } from "lucide-react";

type PurchaseOrder = {
  id: string;
  folio: string;
  requisition_id: string;
  total: number;
  status: string;
  authorized_by: string;
  authorized_at: string;
  received_at: string;
  received_by: string;
  delivery_notes: string;
  invoice_number: string;
  created_at: string;
};

type Requisition = {
  id: string;
  folio: string;
  cost_center_name: string;
  required_date: string;
  created_at: string;
  created_by: string;
};

type Item = {
  id: string;
  product_name: string;
  unit: string;
  quantity: number;
  selected_price: number;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [Requisiciones, setRequisiciones] = useState<{[key: string]: Requisition}>({});
  const [items, setItems] = useState<{[key: string]: Item[]}>({});
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
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

    if (ocs?.length) {
      const reqIds = [...new Set(ocs.map(o => o.requisition_id).filter(Boolean))];
      const { data: reqs } = await supabase.from("Requisiciones").select("*").in("id", reqIds);
      const reqMap: {[key: string]: Requisition} = {};
      (reqs || []).forEach(r => reqMap[r.id] = r);
      setRequisiciones(reqMap);

      // Cargar items de cada requisición
      const itemsMap: {[key: string]: Item[]} = {};
      for (const reqId of reqIds) {
        const { data: reqItems } = await supabase.from("requisition_items").select("*").eq("requisition_id", reqId);
        itemsMap[reqId] = (reqItems || []) as Item[];
      }
      setItems(itemsMap);
    }
    setLoading(false);
  };

  const getDaysRemaining = (requiredDate: string) => {
    if (!requiredDate) return null;
    return Math.ceil((new Date(requiredDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const getTimeInfo = (order: PurchaseOrder) => {
    const req = Requisiciones[order.requisition_id];
    if (!req) return { days: null, color: "gray", text: "N/A", bg: "bg-gray-500" };
    const days = getDaysRemaining(req.required_date);
    if (days === null) return { days: null, color: "gray", text: "N/A", bg: "bg-gray-500" };
    if (days <= 0) return { days: 0, color: "red", text: "¡VENCIDO!", bg: "bg-red-500" };
    if (days === 1) return { days: 1, color: "red", text: "¡MAÑANA!", bg: "bg-red-500" };
    if (days <= 3) return { days, color: "amber", text: `${days} días`, bg: "bg-amber-500" };
    return { days, color: "emerald", text: `${days} días`, bg: "bg-emerald-500" };
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

    // Actualizar requisición
    const req = Requisiciones[selectedOrder.requisition_id];
    if (req) {
      await supabase.from("Requisiciones").update({
        status: "ENTREGADA"
      }).eq("id", req.id);
    }

    setReceiving(false);
    setShowReceiveModal(false);
    setSelectedOrder(null);
    setReceiveForm({ notes: "", invoiceNumber: "" });
    loadOrders();
  };

  const openDetail = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  const openReceive = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setShowReceiveModal(true);
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
          <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-lg text-sm transition ${filter === "all" ? "bg-white/20" : "bg-white/5 hover:bg-white/10"}`}>
            Todas ({orders.length})
          </button>
          <button onClick={() => setFilter("AUTORIZADA")} className={`px-4 py-2 rounded-lg text-sm transition ${filter === "AUTORIZADA" ? "bg-amber-500/30 text-amber-400" : "bg-white/5 hover:bg-white/10"}`}>
            <Clock className="h-4 w-4 inline mr-1" />Pendientes ({orders.filter(o => o.status === "AUTORIZADA").length})
          </button>
          <button onClick={() => setFilter("RECIBIDA")} className={`px-4 py-2 rounded-lg text-sm transition ${filter === "RECIBIDA" ? "bg-emerald-500/30 text-emerald-400" : "bg-white/5 hover:bg-white/10"}`}>
            <CheckCircle className="h-4 w-4 inline mr-1" />Recibidas ({orders.filter(o => o.status === "RECIBIDA").length})
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 p-4 border border-cyan-500/30">
          <div className="text-3xl font-bold">{orders.length}</div>
          <div className="text-sm text-white/60">Total OCs</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 p-4 border border-amber-500/30">
          <div className="text-3xl font-bold text-amber-400">{orders.filter(o => o.status === "AUTORIZADA").length}</div>
          <div className="text-sm text-white/60">Por Recibir</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 p-4 border border-emerald-500/30">
          <div className="text-3xl font-bold text-emerald-400">{orders.filter(o => o.status === "RECIBIDA").length}</div>
          <div className="text-sm text-white/60">Recibidas</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-4 border border-purple-500/30">
          <div className="text-3xl font-bold text-purple-400">${orders.reduce((sum, o) => sum + (o.total || 0), 0).toLocaleString()}</div>
          <div className="text-sm text-white/60">Total Compras</div>
        </div>
      </div>

      {/* Lista de OCs */}
      <div className="rounded-2xl bg-white/5 p-5">
        {loading ? (
          <div className="text-center py-12 text-white/50"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-white/20 mb-4" />
            <p className="text-white/50">No hay órdenes de compra {filter !== "all" && `con estado ${filter}`}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map(order => {
              const req = Requisiciones[order.requisition_id];
              const orderItems = items[order.requisition_id] || [];
              const timeInfo = getTimeInfo(order);
              
              return (
                <div key={order.id} className={`rounded-xl border p-5 transition hover:bg-white/5 ${order.status === "RECIBIDA" ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-black/20"}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${order.status === "RECIBIDA" ? "bg-emerald-500" : timeInfo.bg}`}>
                        {order.status === "RECIBIDA" ? <CheckCircle className="h-7 w-7 text-white" /> : <Clock className="h-7 w-7 text-white" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-xl">{order.folio}</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${order.status === "RECIBIDA" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                            {order.status === "RECIBIDA" ? "✓ ENTREGADA" : "PENDIENTE"}
                          </span>
                        </div>
                        <div className="text-sm text-white/60 mt-1">
                          <span className="text-blue-400">{req?.folio}</span> • {req?.cost_center_name || ""}
                        </div>
                        <div className="text-xs text-white/40 mt-1">
                          Solicitado por: {req?.created_by || "N/A"}
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs text-white/50">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Autorizada: {new Date(order.authorized_at).toLocaleDateString("es-MX")}
                          </span>
                          <span className="flex items-center gap-1 text-emerald-400 font-medium">
                            <DollarSign className="h-3 w-3" />
                            ${order.total?.toLocaleString() || 0} MXN
                          </span>
                        </div>
                        
                        {/* Preview de items */}
                        <div className="mt-3 text-xs text-white/50">
                          {orderItems.slice(0, 2).map(item => (
                            <span key={item.id} className="inline-block bg-white/10 rounded px-2 py-1 mr-2 mb-1">
                              {item.quantity} {item.unit} - {item.product_name}
                            </span>
                          ))}
                          {orderItems.length > 2 && <span className="text-white/30">+{orderItems.length - 2} más</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right flex flex-col items-end gap-2">
                      {order.status !== "RECIBIDA" && (
                        <div className={`text-2xl font-bold ${timeInfo.color === "red" ? "text-red-400" : timeInfo.color === "amber" ? "text-amber-400" : "text-emerald-400"}`}>
                          {timeInfo.text}
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <button onClick={() => openDetail(order)} className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20">
                          <Eye className="h-4 w-4" /> Ver
                        </button>
                        {order.status !== "RECIBIDA" ? (
                          <button onClick={() => openReceive(order)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-emerald-400">
                            <Package className="h-4 w-4" /> Recibir
                          </button>
                        ) : (
                          <span className="text-xs text-white/50 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-emerald-400" />
                            {new Date(order.received_at).toLocaleDateString("es-MX")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Detalle */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 overflow-auto py-8">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-800 p-6 shadow-xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{selectedOrder.folio}</h2>
              <button onClick={() => setShowDetailModal(false)} className="rounded-full p-1 hover:bg-white/10"><X className="h-5 w-5" /></button>
            </div>
            
            {(() => {
              const req = Requisiciones[selectedOrder.requisition_id];
              const orderItems = items[selectedOrder.requisition_id] || [];
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-white/5 p-4">
                      <div className="text-xs text-white/50">Requisición</div>
                      <div className="font-bold text-blue-400">{req?.folio}</div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-4">
                      <div className="text-xs text-white/50">Obra/Centro</div>
                      <div className="font-bold">{req?.cost_center_name}</div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-4">
                      <div className="text-xs text-white/50">Solicitante</div>
                      <div className="font-bold">{req?.created_by}</div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-4">
                      <div className="text-xs text-white/50">Total</div>
                      <div className="font-bold text-emerald-400">${selectedOrder.total?.toLocaleString()} MXN</div>
                    </div>
                  </div>
                  
                  <div className="rounded-xl bg-white/5 p-4">
                    <div className="text-xs text-white/50 mb-2">Materiales</div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-xs text-white/50">
                          <th className="text-left pb-2">Producto</th>
                          <th className="text-center pb-2">Cantidad</th>
                          <th className="text-right pb-2">Precio</th>
                          <th className="text-right pb-2">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderItems.map(item => (
                          <tr key={item.id} className="border-b border-white/5">
                            <td className="py-2">{item.product_name}</td>
                            <td className="text-center py-2">{item.quantity} {item.unit}</td>
                            <td className="text-right py-2">${(item.selected_price || 0).toLocaleString()}</td>
                            <td className="text-right py-2 text-emerald-400">${((item.selected_price || 0) * item.quantity).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-white/50">Autorizado por:</span> {selectedOrder.authorized_by}
                    </div>
                    <div>
                      <span className="text-white/50">Fecha autorización:</span> {new Date(selectedOrder.authorized_at).toLocaleString("es-MX")}
                    </div>
                    {selectedOrder.status === "RECIBIDA" && (
                      <>
                        <div>
                          <span className="text-white/50">Recibido por:</span> {selectedOrder.received_by}
                        </div>
                        <div>
                          <span className="text-white/50">Fecha recepción:</span> {new Date(selectedOrder.received_at).toLocaleString("es-MX")}
                        </div>
                        {selectedOrder.invoice_number && (
                          <div className="col-span-2">
                            <span className="text-white/50">Factura:</span> {selectedOrder.invoice_number}
                          </div>
                        )}
                        {selectedOrder.delivery_notes && (
                          <div className="col-span-2">
                            <span className="text-white/50">Notas:</span> {selectedOrder.delivery_notes}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal Recepción */}
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
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
                <div className="text-sm text-white/50">Orden de Compra</div>
                <div className="text-xl font-bold">{selectedOrder.folio}</div>
                <div className="text-emerald-400 font-bold mt-1">${selectedOrder.total?.toLocaleString()} MXN</div>
              </div>

              <div>
                <label className="text-xs text-white/70">Número de Factura *</label>
                <input className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm mt-1"
                  placeholder="Ej: FAC-12345"
                  value={receiveForm.invoiceNumber}
                  onChange={e => setReceiveForm(f => ({...f, invoiceNumber: e.target.value}))} />
              </div>

              <div>
                <label className="text-xs text-white/70">Notas de Recepción</label>
                <textarea className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm mt-1 h-20"
                  placeholder="Observaciones sobre la entrega, estado del material, etc."
                  value={receiveForm.notes}
                  onChange={e => setReceiveForm(f => ({...f, notes: e.target.value}))} />
              </div>

              <div>
                <label className="text-xs text-white/70 flex items-center gap-2"><Camera className="h-4 w-4" />Evidencia Fotográfica</label>
                <div className="mt-2 border-2 border-dashed border-white/20 rounded-xl p-6 text-center text-white/40 hover:bg-white/5 cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Click para subir fotos de evidencia</p>
                  <p className="text-xs">(Próximamente)</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowReceiveModal(false)} className="px-4 py-2 rounded-full text-sm hover:bg-white/10">Cancelar</button>
              <button onClick={handleReceive} disabled={receiving || !receiveForm.invoiceNumber}
                className={`inline-flex items-center gap-2 rounded-full px-6 py-2 text-sm font-medium ${!receiveForm.invoiceNumber ? "bg-gray-600 cursor-not-allowed" : "bg-emerald-500 text-slate-900 hover:bg-emerald-400"}`}>
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
