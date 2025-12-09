"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShoppingCart, Calendar, Building2, DollarSign, Send, Loader2, Trash2, Check, Brain, AlertTriangle, Clock } from "lucide-react";

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
  is_quoted: boolean;
  selected_supplier_id: number | null;
  selected_price: number | null;
};

type Supplier = {
  id: number;
  folio: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  payment_method: string;
  credit_days: number;
  bank_name: string;
  bank_clabe: string;
  products_offered: string;
  categories: string[];
};

export default function PurchasingPage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

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
    setAiSuggestion("");
    setEditingItemId(null);
    
    const { data } = await supabase.from("requisition_items").select("*").eq("requisition_id", req.id);
    setItems((data || []).map((i: any) => ({
      id: i.id,
      product_name: i.product_name,
      unit: i.unit,
      quantity: Number(i.quantity),
      comments: i.comments || "",
      is_quoted: i.is_quoted || false,
      selected_supplier_id: i.selected_supplier_id,
      selected_price: i.selected_price
    })));
  };

  const deleteReq = async (reqId: string) => {
    if (!confirm("¿Eliminar esta requisición?")) return;
    await supabase.from("requisition_items").delete().eq("requisition_id", reqId);
    await supabase.from("requisitions").delete().eq("id", reqId);
    setSelectedReq(null);
    setItems([]);
    loadData();
  };

  const updateItem = async (itemId: string, supplierId: number, price: number) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    await supabase.from("requisition_items").update({
      is_quoted: true,
      selected_supplier_id: supplierId,
      selected_price: price
    }).eq("id", itemId);

    setItems(prev => prev.map(i => i.id === itemId ? { ...i, is_quoted: true, selected_supplier_id: supplierId, selected_price: price } : i));
    setEditingItemId(null);
    setMessage(`✓ ${supplier?.name} asignado`);
    setTimeout(() => setMessage(""), 2000);
  };

  const getTotal = () => items.reduce((sum, i) => sum + ((i.selected_price || 0) * i.quantity), 0);
  const getQuotedCount = () => items.filter(i => i.is_quoted).length;
  const isComplete = () => items.length > 0 && items.every(i => i.is_quoted);

  const getDaysUntil = (date: string) => {
    if (!date) return 99;
    return Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  };

  const askAI = async (itemName: string) => {
    setAiLoading(true);
    setAiSuggestion("");
    try {
      const supplierList = suppliers.map(s => `- ${s.name}: ${s.products_offered || s.categories?.join(", ") || "General"}`).join("\n");
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Necesito comprar: "${itemName}". ¿Cuál de estos proveedores recomiendas y por qué? También sugiere 2-3 proveedores externos que podría buscar en internet.`,
          context: `Proveedores disponibles:\n${supplierList}`
        })
      });
      const data = await res.json();
      setAiSuggestion(data.response || "Sin sugerencias");
    } catch (err) {
      setAiSuggestion("Error consultando IA");
    } finally {
      setAiLoading(false);
    }
  };

  const sendToAuthorization = async () => {
    if (!selectedReq || !isComplete()) return;
    setSending(true);
    try {
      const token = crypto.randomUUID();
      
      // Agrupar por proveedor
      const supplierTotals: {[key: number]: {supplier: Supplier, items: Item[], total: number}} = {};
      items.forEach(item => {
        if (item.selected_supplier_id) {
          if (!supplierTotals[item.selected_supplier_id]) {
            const sup = suppliers.find(s => s.id === item.selected_supplier_id)!;
            supplierTotals[item.selected_supplier_id] = { supplier: sup, items: [], total: 0 };
          }
          supplierTotals[item.selected_supplier_id].items.push(item);
          supplierTotals[item.selected_supplier_id].total += (item.selected_price || 0) * item.quantity;
        }
      });

      await supabase.from("requisitions").update({ 
        purchase_status: "POR_AUTORIZAR",
        authorization_comments: token
      }).eq("id", selectedReq.id);

      // Enviar a autorización
      await fetch("/api/requisicion/authorize-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          requisition: selectedReq, 
          items, 
          suppliers: Object.values(supplierTotals),
          total: getTotal(), 
          token,
          daysUntil: getDaysUntil(selectedReq.required_date)
        })
      });

      setMessage("✓ Enviado a Dirección para autorización");
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
          Compras - Lista del Super
        </h1>
        <p className="text-white/60 text-sm">Cotiza producto por producto y envía a autorización.</p>
      </div>

      {message && <div className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-sm">{message}</div>}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Lista de requisiciones */}
        <div className="rounded-2xl bg-white/5 p-5">
          <h2 className="text-lg font-semibold mb-4">Por Atender ({requisitions.length})</h2>
          {loading ? <p className="text-white/50">Cargando...</p> : requisitions.length === 0 ? <p className="text-white/50">No hay requisiciones</p> : (
            <div className="space-y-2 max-h-[70vh] overflow-auto">
              {requisitions.map(r => {
                const days = getDaysUntil(r.required_date);
                return (
                  <div key={r.id} className={`rounded-xl p-3 border transition ${selectedReq?.id === r.id ? "border-blue-500 bg-blue-500/20" : days <= 2 ? "border-red-500 bg-red-500/10" : "border-white/10 bg-white/5"}`}>
                    <button onClick={() => selectReq(r)} className="w-full text-left">
                      <div className="flex justify-between">
                        <span className="font-mono text-xs text-blue-400">{r.folio}</span>
                        <span className={`text-xs px-2 rounded flex items-center gap-1 ${days <= 2 ? "bg-red-500 text-white" : days <= 5 ? "bg-amber-500 text-black" : "bg-white/20"}`}>
                          <Clock className="h-3 w-3" />{days <= 0 ? "HOY" : `${days}d`}
                        </span>
                      </div>
                      <div className="text-sm font-medium mt-1">{r.cost_center_name}</div>
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

        {/* Lista del super */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedReq ? (
            <div className="rounded-2xl bg-white/5 p-12 text-center text-white/50">Selecciona una requisición</div>
          ) : (
            <>
              {/* Header */}
              <div className="rounded-2xl bg-white/5 p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold">{selectedReq.folio}</h2>
                    <p className="text-white/60">{selectedReq.cost_center_name}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getDaysUntil(selectedReq.required_date) <= 2 ? "text-red-400" : "text-amber-400"}`}>
                      {getDaysUntil(selectedReq.required_date) <= 0 ? "¡HOY!" : `${getDaysUntil(selectedReq.required_date)} días`}
                    </div>
                    <div className="text-xs text-white/50">para entrega</div>
                  </div>
                </div>
                {selectedReq.instructions && (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 mt-4 text-sm flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5" />
                    <span>{selectedReq.instructions}</span>
                  </div>
                )}
                
                {/* Progress */}
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex-1 bg-white/10 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{width: `${items.length ? (getQuotedCount() / items.length) * 100 : 0}%`}} />
                  </div>
                  <span className="text-sm">{getQuotedCount()}/{items.length} cotizados</span>
                </div>
              </div>

              {/* Items - Lista del Super */}
              <div className="rounded-2xl bg-white/5 p-5">
                <h3 className="font-semibold mb-4">🛒 Lista de Compras</h3>
                <div className="space-y-3">
                  {items.map(item => (
                    <div key={item.id} className={`rounded-xl border p-4 ${item.is_quoted ? "border-emerald-500/50 bg-emerald-500/10" : "border-white/10 bg-black/20"}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${item.is_quoted ? "bg-emerald-500" : "bg-white/10"}`}>
                            {item.is_quoted ? <Check className="h-4 w-4 text-white" /> : <span className="text-xs">○</span>}
                          </div>
                          <div>
                            <div className="font-medium">{item.product_name}</div>
                            <div className="text-sm text-white/50">{item.quantity} {item.unit}</div>
                            {item.comments && <div className="text-xs text-amber-400 mt-1">{item.comments}</div>}
                          </div>
                        </div>
                        {item.is_quoted ? (
                          <div className="text-right">
                            <div className="text-emerald-400 font-bold">${((item.selected_price || 0) * item.quantity).toLocaleString()}</div>
                            <div className="text-xs text-white/50">{suppliers.find(s => s.id === item.selected_supplier_id)?.name}</div>
                            <button onClick={() => setEditingItemId(item.id)} className="text-xs text-blue-400 hover:underline mt-1">Cambiar</button>
                          </div>
                        ) : (
                          <button onClick={() => setEditingItemId(item.id)} className="px-3 py-1 rounded-lg bg-blue-500 text-sm hover:bg-blue-400">
                            <DollarSign className="h-4 w-4 inline" /> Cotizar
                          </button>
                        )}
                      </div>

                      {/* Formulario de cotización inline */}
                      {editingItemId === item.id && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <div className="flex gap-2 mb-3">
                            <button onClick={() => askAI(item.product_name)} disabled={aiLoading} className="text-xs px-3 py-1 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 flex items-center gap-1">
                              <Brain className="h-3 w-3" /> {aiLoading ? "Pensando..." : "Sugerir proveedor"}
                            </button>
                          </div>
                          
                          {aiSuggestion && (
                            <div className="mb-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-sm">
                              <div className="flex items-center gap-2 text-purple-400 font-medium mb-1"><Brain className="h-4 w-4" /> Sugerencia IA</div>
                              <p className="text-white/80 whitespace-pre-wrap text-xs">{aiSuggestion}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-white/70">Proveedor</label>
                              <select id={`supplier-${item.id}`} className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm">
                                <option value="">Seleccionar...</option>
                                {suppliers.map(s => (
                                  <option key={s.id} value={s.id}>{s.name} ({s.payment_method}{s.credit_days > 0 ? ` ${s.credit_days}d` : ""})</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-white/70">Precio Unitario</label>
                              <input id={`price-${item.id}`} type="number" className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm" placeholder="0.00" />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 mt-3">
                            <button onClick={() => setEditingItemId(null)} className="px-3 py-1 rounded-lg text-sm hover:bg-white/10">Cancelar</button>
                            <button onClick={() => {
                              const supplierId = parseInt((document.getElementById(`supplier-${item.id}`) as HTMLSelectElement).value);
                              const price = parseFloat((document.getElementById(`price-${item.id}`) as HTMLInputElement).value);
                              if (supplierId && price > 0) updateItem(item.id, supplierId, price);
                            }} className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-900 text-sm font-medium hover:bg-emerald-400">
                              Guardar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumen y envío */}
              {items.length > 0 && (
                <div className="rounded-2xl bg-white/5 p-5">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-white/50">Total estimado</div>
                      <div className="text-3xl font-bold text-emerald-400">${getTotal().toLocaleString()}</div>
                    </div>
                    <button onClick={sendToAuthorization} disabled={!isComplete() || sending}
                      className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold ${!isComplete() ? "bg-gray-600 cursor-not-allowed text-gray-400" : "bg-emerald-500 text-slate-900 hover:bg-emerald-400"}`}>
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {isComplete() ? "Enviar a Dirección" : `Faltan ${items.length - getQuotedCount()} items`}
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
