"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShoppingCart, Calendar, Building2, DollarSign, Send, Loader2, Trash2 } from "lucide-react";

type Requisition = {
  id: string;
  folio: string;
  cost_center_name: string;
  required_date: string;
  created_by: string;
  instructions: string;
  status: string;
};

type Item = {
  id: string;
  product_name: string;
  unit: string;
  quantity: number;
  comments: string;
  unit_cost: number;
  total_cost: number;
};

type Supplier = {
  id: number;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  payment_method: string;
  credit_days: number;
};

export default function PurchasingPage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<"view" | "manual">("view");
  const [message, setMessage] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: reqs } = await supabase
      .from("requisitions")
      .select("*")
      .eq("status", "APROBADA")
      .order("required_date", { ascending: true });
    setRequisitions((reqs || []) as Requisition[]);

    const { data: supps } = await supabase.from("suppliers").select("*").eq("active", true);
    setSuppliers((supps || []) as Supplier[]);
    setLoading(false);
  };

  const selectReq = async (req: Requisition) => {
    console.log("Seleccionando requisicion:", req.id, req.folio);
    setSelectedReq(req);
    setMode("view");
    setSelectedSupplier(null);
    
    const { data, error } = await supabase
      .from("requisition_items")
      .select("*")
      .eq("requisition_id", req.id);
    
    console.log("Items cargados:", data, "Error:", error);
    
    if (error) {
      console.error("Error cargando items:", error);
      setMessage("Error cargando items: " + error.message);
    }
    
    const loadedItems = (data || []).map((i: any) => ({
      id: i.id,
      product_name: i.product_name,
      unit: i.unit,
      quantity: Number(i.quantity),
      comments: i.comments || "",
      unit_cost: 0,
      total_cost: 0
    }));
    console.log("Items procesados:", loadedItems);
    setItems(loadedItems);
  };

  const deleteReq = async (reqId: string) => {
    if (!confirm("¿Eliminar esta requisición?")) return;
    await supabase.from("requisition_items").delete().eq("requisition_id", reqId);
    await supabase.from("requisitions").delete().eq("id", reqId);
    setMessage("Requisición eliminada");
    setSelectedReq(null);
    setItems([]);
    loadData();
  };

  const updateItemCost = (id: string, cost: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, unit_cost: cost, total_cost: cost * i.quantity } : i));
  };

  const getTotal = () => items.reduce((sum, i) => sum + (i.total_cost || 0), 0);

  const getDaysUntil = (date: string) => {
    if (!date) return 99;
    return Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  };

  const sendToAuthorization = async () => {
    if (!selectedReq || !selectedSupplier || getTotal() === 0) return;
    const supplier = suppliers.find(s => s.id === selectedSupplier);
    if (!supplier) return;
    
    setSending(true);
    try {
      const token = crypto.randomUUID();
      
      await supabase.from("quotations").insert({
        requisition_id: selectedReq.id,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        total: getTotal()
      });

      await supabase.from("requisitions").update({ 
        purchase_status: "POR_AUTORIZAR",
        authorization_comments: token
      }).eq("id", selectedReq.id);

      await fetch("/api/requisicion/authorize-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requisition: selectedReq, items, supplier, total: getTotal(), token })
      });

      setMessage("Enviado a autorización");
      loadData();
      setSelectedReq(null);
      setItems([]);
    } catch (err: any) {
      setMessage("Error: " + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-blue-400" />
          Compras - Requisiciones por Atender
        </h1>
        <p className="text-white/60 text-sm">Gestiona cotizaciones y órdenes de compra.</p>
      </div>

      {message && <div className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-sm">{message}</div>}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="rounded-2xl bg-white/5 p-5">
          <h2 className="text-lg font-semibold mb-4">Por Atender ({requisitions.length})</h2>
          {loading ? <p className="text-white/50">Cargando...</p> : requisitions.length === 0 ? <p className="text-white/50">No hay requisiciones</p> : (
            <div className="space-y-2">
              {requisitions.map(r => {
                const days = getDaysUntil(r.required_date);
                return (
                  <div key={r.id} className={`rounded-xl p-3 border transition ${selectedReq?.id === r.id ? "border-blue-500 bg-blue-500/20" : days <= 2 ? "border-red-500 bg-red-500/10" : "border-white/10 bg-white/5"}`}>
                    <button onClick={() => selectReq(r)} className="w-full text-left">
                      <div className="flex justify-between">
                        <span className="font-mono text-xs text-blue-400">{r.folio}</span>
                        <span className={`text-xs px-2 rounded ${days <= 2 ? "bg-red-500" : "bg-white/20"}`}>{days <= 0 ? "URGENTE" : `${days} días`}</span>
                      </div>
                      <div className="text-sm font-medium mt-1">{r.cost_center_name}</div>
                      <div className="text-xs text-white/50 flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />{r.required_date ? new Date(r.required_date).toLocaleDateString("es-MX") : "Sin fecha"}
                      </div>
                    </button>
                    <button onClick={() => deleteReq(r.id)} className="mt-2 text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                      <Trash2 className="h-3 w-3" /> Eliminar
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!selectedReq ? (
            <div className="rounded-2xl bg-white/5 p-12 text-center text-white/50">Selecciona una requisición</div>
          ) : (
            <>
              <div className="rounded-2xl bg-white/5 p-5">
                <div className="flex justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold">{selectedReq.folio}</h2>
                    <p className="text-white/60">{selectedReq.cost_center_name}</p>
                    <p className="text-xs text-white/40">ID: {selectedReq.id}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-white/50">Fecha requerida</div>
                    <div className="text-amber-400">{selectedReq.required_date ? new Date(selectedReq.required_date).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" }) : "N/A"}</div>
                  </div>
                </div>

                {selectedReq.instructions && <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 mb-4 text-sm"><strong>Instrucciones:</strong> {selectedReq.instructions}</div>}

                <div className="flex gap-2 mb-4">
                  <button onClick={() => setMode("view")} className={`px-3 py-1 rounded-lg text-sm ${mode === "view" ? "bg-blue-500" : "bg-white/10"}`}>Ver ({items.length})</button>
                  <button onClick={() => setMode("manual")} className={`px-3 py-1 rounded-lg text-sm ${mode === "manual" ? "bg-blue-500" : "bg-white/10"}`}>
                    <DollarSign className="h-4 w-4 inline mr-1" />Capturar Costos
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="text-center py-8 text-white/50">
                    <p>No hay materiales en esta requisición</p>
                    <p className="text-xs mt-2">ID: {selectedReq.id}</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
                    <div className={`grid ${mode === "manual" ? "grid-cols-[2fr_70px_60px_90px_90px]" : "grid-cols-[2fr_80px_60px_1fr]"} gap-2 bg-white/5 px-3 py-2 text-xs uppercase text-white/50`}>
                      <div>Material</div><div>Unidad</div><div>Cant.</div>
                      {mode === "manual" ? <><div>P.Unit</div><div>Total</div></> : <div>Obs.</div>}
                    </div>
                    {items.map(item => (
                      <div key={item.id} className={`grid ${mode === "manual" ? "grid-cols-[2fr_70px_60px_90px_90px]" : "grid-cols-[2fr_80px_60px_1fr]"} gap-2 px-3 py-2 text-sm border-b border-white/5`}>
                        <div>{item.product_name}</div>
                        <div className="text-white/60">{item.unit}</div>
                        <div>{item.quantity}</div>
                        {mode === "manual" ? (
                          <>
                            <input type="number" className="w-full rounded bg-black/40 px-2 py-1 text-right" placeholder="0" value={item.unit_cost || ""} onChange={e => updateItemCost(item.id, Number(e.target.value))} />
                            <div className="text-right text-emerald-400">${(item.total_cost || 0).toLocaleString()}</div>
                          </>
                        ) : <div className="text-white/50 text-xs">{item.comments || "-"}</div>}
                      </div>
                    ))}
                    {mode === "manual" && (
                      <div className="grid grid-cols-[2fr_70px_60px_90px_90px] gap-2 px-3 py-3 bg-white/5 font-bold">
                        <div className="col-span-4 text-right">TOTAL:</div>
                        <div className="text-right text-emerald-400">${getTotal().toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {mode === "manual" && items.length > 0 && (
                <div className="rounded-2xl bg-white/5 p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-emerald-400" />Seleccionar Proveedor
                  </h3>
                  <div className="grid md:grid-cols-3 gap-3 mb-4">
                    {suppliers.map(s => (
                      <button key={s.id} onClick={() => setSelectedSupplier(s.id)}
                        className={`rounded-xl p-3 border text-left ${selectedSupplier === s.id ? "border-emerald-500 bg-emerald-500/20" : "border-white/10 bg-black/20"}`}>
                        <div className="font-medium text-sm">{s.name}</div>
                        <div className="text-xs text-white/50">{s.contact_name}</div>
                        <span className={`text-xs px-2 py-0.5 rounded mt-2 inline-block ${s.payment_method === "credito" ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"}`}>
                          {s.payment_method === "credito" ? `Crédito ${s.credit_days}d` : s.payment_method}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <button onClick={sendToAuthorization} disabled={!selectedSupplier || getTotal() === 0 || sending}
                      className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold ${!selectedSupplier || getTotal() === 0 ? "bg-gray-600 cursor-not-allowed" : "bg-emerald-500 text-slate-900 hover:bg-emerald-400"}`}>
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Enviar a Autorización
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
