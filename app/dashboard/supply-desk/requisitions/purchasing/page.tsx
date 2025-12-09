"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShoppingCart, Calendar, Building2, Upload, DollarSign, Send, Loader2 } from "lucide-react";

type Requisition = {
  id: number;
  folio: string;
  cost_center_name: string;
  required_date: string;
  created_at: string;
  created_by: string;
  instructions: string;
  purchase_status: string;
};

type Item = {
  id: number;
  product_name: string;
  unit: string;
  quantity: number;
  observations: string;
  unit_cost?: number;
  total_cost?: number;
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
  const [mode, setMode] = useState<"view" | "manual" | "upload">("view");
  const [message, setMessage] = useState<string | null>(null);

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
    setSelectedReq(req);
    setMode("view");
    setSelectedSupplier(null);
    const { data } = await supabase.from("requisition_items").select("*").eq("requisition_id", req.id);
    setItems((data || []).map((i: any) => ({ ...i, unit_cost: 0, total_cost: 0 })) as Item[]);
  };

  const updateItemCost = (id: number, cost: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, unit_cost: cost, total_cost: cost * i.quantity } : i));
  };

  const getTotal = () => items.reduce((sum, i) => sum + (i.total_cost || 0), 0);

  const getDaysUntil = (date: string) => {
    const diff = Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const sendToAuthorization = async () => {
    if (!selectedReq || !selectedSupplier) return;
    const supplier = suppliers.find(s => s.id === selectedSupplier);
    if (!supplier) return;
    
    setSending(true);
    try {
      const token = crypto.randomUUID();
      
      // Guardar cotización
      await supabase.from("quotations").insert({
        requisition_id: selectedReq.id,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        total: getTotal(),
        notes: "Cotización manual"
      });

      // Actualizar estado
      await supabase.from("requisitions").update({ 
        purchase_status: "POR_AUTORIZAR",
        authorization_comments: token
      }).eq("id", selectedReq.id);

      // Enviar email a autorizador
      await fetch("/api/requisicion/authorize-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requisition: selectedReq,
          items,
          supplier,
          total: getTotal(),
          token
        })
      });

      setMessage("Enviado a autorización exitosamente");
      loadData();
      setSelectedReq(null);
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

      {message && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">{message}</div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 rounded-2xl bg-white/5 p-5 shadow-lg backdrop-blur">
          <h2 className="text-lg font-semibold mb-4">Por Atender ({requisitions.length})</h2>
          {loading ? (
            <div className="text-center py-4 text-white/50">Cargando...</div>
          ) : requisitions.length === 0 ? (
            <div className="text-center py-4 text-white/50">No hay requisiciones pendientes</div>
          ) : (
            <div className="space-y-2">
              {requisitions.map((r) => {
                const days = getDaysUntil(r.required_date);
                const urgentClass = days <= 2 ? "border-red-500 bg-red-500/10" : days <= 5 ? "border-amber-500 bg-amber-500/10" : "border-white/10 bg-white/5";
                return (
                  <button key={r.id} onClick={() => selectReq(r)}
                    className={`w-full text-left rounded-xl p-3 border transition ${selectedReq?.id === r.id ? "border-blue-500 bg-blue-500/20" : urgentClass} hover:bg-white/10`}>
                    <div className="flex justify-between items-start">
                      <div className="font-mono text-xs text-blue-400">{r.folio}</div>
                      <div className={`text-xs px-2 py-0.5 rounded ${days <= 2 ? "bg-red-500 text-white" : days <= 5 ? "bg-amber-500 text-black" : "bg-white/20"}`}>
                        {days <= 0 ? "URGENTE" : `${days} días`}
                      </div>
                    </div>
                    <div className="text-sm font-medium mt-1">{r.cost_center_name}</div>
                    <div className="text-xs text-white/50 flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(r.required_date).toLocaleDateString("es-MX")}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!selectedReq ? (
            <div className="rounded-2xl bg-white/5 p-12 text-center text-white/50">
              Selecciona una requisición para ver el detalle
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-white/5 p-5 shadow-lg backdrop-blur">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold">{selectedReq.folio}</h2>
                    <p className="text-white/60">{selectedReq.cost_center_name}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white/50">Fecha requerida</div>
                    <div className="font-medium text-amber-400">
                      {new Date(selectedReq.required_date).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}
                    </div>
                  </div>
                </div>

                {selectedReq.instructions && (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 mb-4 text-sm">
                    <strong>Instrucciones:</strong> {selectedReq.instructions}
                  </div>
                )}

                <div className="flex gap-2 mb-4">
                  <button onClick={() => setMode("view")} className={`px-3 py-1 rounded-lg text-sm ${mode === "view" ? "bg-blue-500" : "bg-white/10"}`}>Ver</button>
                  <button onClick={() => setMode("manual")} className={`px-3 py-1 rounded-lg text-sm ${mode === "manual" ? "bg-blue-500" : "bg-white/10"}`}>
                    <DollarSign className="h-4 w-4 inline mr-1" />Capturar Costos
                  </button>
                  <button onClick={() => setMode("upload")} className={`px-3 py-1 rounded-lg text-sm ${mode === "upload" ? "bg-blue-500" : "bg-white/10"}`}>
                    <Upload className="h-4 w-4 inline mr-1" />Subir Cotización
                  </button>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
                  <div className={`grid ${mode === "manual" ? "grid-cols-[2fr_70px_60px_90px_90px]" : "grid-cols-[2fr_80px_60px_1fr]"} gap-2 border-b border-white/10 bg-white/5 px-3 py-2 text-xs uppercase text-white/50`}>
                    <div>Material</div><div>Unidad</div><div>Cant.</div>
                    {mode === "manual" ? <><div>P.Unit</div><div>Total</div></> : <div>Obs.</div>}
                  </div>
                  {items.map((item) => (
                    <div key={item.id} className={`grid ${mode === "manual" ? "grid-cols-[2fr_70px_60px_90px_90px]" : "grid-cols-[2fr_80px_60px_1fr]"} gap-2 px-3 py-2 text-sm border-b border-white/5`}>
                      <div>{item.product_name}</div>
                      <div className="text-white/60">{item.unit}</div>
                      <div className="font-medium">{item.quantity}</div>
                      {mode === "manual" ? (
                        <>
                          <input type="number" className="w-full rounded bg-black/40 px-2 py-1 text-right" placeholder="0.00"
                            value={item.unit_cost || ""} onChange={e => updateItemCost(item.id, Number(e.target.value))} />
                          <div className="text-right text-emerald-400">${(item.total_cost || 0).toLocaleString()}</div>
                        </>
                      ) : (
                        <div className="text-white/50 text-xs">{item.observations || "-"}</div>
                      )}
                    </div>
                  ))}
                  {mode === "manual" && (
                    <div className="grid grid-cols-[2fr_70px_60px_90px_90px] gap-2 px-3 py-3 bg-white/5 font-bold">
                      <div className="col-span-4 text-right">TOTAL:</div>
                      <div className="text-right text-emerald-400">${getTotal().toLocaleString()}</div>
                    </div>
                  )}
                </div>
              </div>

              {mode === "upload" && (
                <div className="rounded-2xl bg-white/5 p-5 shadow-lg backdrop-blur text-center">
                  <Upload className="h-12 w-12 mx-auto mb-3 text-white/30" />
                  <p className="text-white/50 mb-4">Arrastra tu cotización PDF o imagen aquí</p>
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" id="file-upload" />
                  <label htmlFor="file-upload" className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-sm font-medium cursor-pointer hover:bg-blue-400">
                    <Upload className="h-4 w-4" /> Seleccionar archivo
                  </label>
                  <p className="text-xs text-white/40 mt-3">La IA analizará la cotización automáticamente</p>
                </div>
              )}

              {mode === "manual" && (
                <div className="rounded-2xl bg-white/5 p-5 shadow-lg backdrop-blur">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-emerald-400" />
                    Seleccionar Proveedor
                  </h3>
                  <div className="grid md:grid-cols-3 gap-3 mb-4">
                    {suppliers.map((s) => (
                      <button key={s.id} onClick={() => setSelectedSupplier(s.id)}
                        className={`rounded-xl p-3 border text-left transition ${selectedSupplier === s.id ? "border-emerald-500 bg-emerald-500/20" : "border-white/10 bg-black/20 hover:bg-white/5"}`}>
                        <div className="font-medium text-sm">{s.name}</div>
                        <div className="text-xs text-white/50 mt-1">{s.contact_name}</div>
                        <div className="mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${s.payment_method === "credito" ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"}`}>
                            {s.payment_method === "credito" ? `Crédito ${s.credit_days}d` : s.payment_method}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <button onClick={sendToAuthorization} disabled={!selectedSupplier || getTotal() === 0 || sending}
                      className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold ${!selectedSupplier || getTotal() === 0 ? "bg-gray-600 text-gray-400 cursor-not-allowed" : "bg-emerald-500 text-slate-900 hover:bg-emerald-400"}`}>
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
