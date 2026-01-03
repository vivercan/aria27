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
  Package,
  X,
  DollarSign,
  Send,
  Loader2,
  Phone,
  Mail,
  CreditCard,
  ChevronDown,
  Users
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
  authorization_comments: string;
};

type Supplier = {
  id: number;
  name: string;
  razon_social: string;
  phone: string;
  email: string;
  payment_method: string;
  credit_days: number;
};

type RequisitionItem = {
  id: number;
  product_name: string;
  unit: string;
  quantity: number;
  comments: string;
  category: string;
  selected_price?: number;
  selected_supplier?: string;
};

type ItemWithSuppliers = RequisitionItem & {
  suppliers: Supplier[];
};

export default function PurchasingPage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
  const [items, setItems] = useState<ItemWithSuppliers[]>([]);
  const [showItems, setShowItems] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [sending, setSending] = useState(false);
  const [prices, setPrices] = useState<Record<string, { price: number; supplier: string; supplierId: number | null }>>({});

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

  // Mapeo de categorías de productos a categorías de proveedores
  const getCategoryMapping = (productCategory: string): string[] => {
    const mappings: Record<string, string[]> = {
      "Acero y productos metalicos": ["ACEROS", "acero"],
      "Combustibles y lubricantes": ["COMBUSTIBLES"],
      "Concretos asfaltos y estabilizantes": ["CONCRETOS"],
      "Agregados y materiales de banco": ["AGREGADOS", "agregados"],
      "Material electrico": ["ELECTRICO"],
      "EPP y seguridad": ["EPP"],
      "Ferreteria y fijacion": ["FERRETERIA", "ferreteria"],
      "Tuberias y conexiones": ["TUBERIAS"],
      "Papelería y oficina": ["PAPELERIA"],
      "Equipo de cómputo": ["COMPUTO"],
      "Limpieza": ["EPP", "PAPELERIA"],
      "Alimentos y bebidas": ["ALIMENTOS"],
      "Herramienta y equipo": ["MAQUINARIA", "FERRETERIA"],
      "Materiales de construccion": ["AGREGADOS", "CONCRETOS", "FERRETERIA"],
      "Servicios y rentas": ["MAQUINARIA"],
    };
    return mappings[productCategory] || [];
  };

  const loadItems = async (reqId: number) => {
    setLoadingItems(true);
    
    // 1. Cargar items de la requisición
    const { data: itemsData } = await supabase
      .from("requisition_items")
      .select("*")
      .eq("requisition_id", reqId);
    
    const rawItems = (itemsData || []) as RequisitionItem[];
    
    // 2. Para cada item, buscar proveedores por categoría
    const itemsWithSuppliers: ItemWithSuppliers[] = await Promise.all(
      rawItems.map(async (item) => {
        const categoryKeys = getCategoryMapping(item.category);
        
        let suppliers: Supplier[] = [];
        
        if (categoryKeys.length > 0) {
          // Buscar proveedores que tengan alguna de estas categorías
          const { data: suppliersData } = await supabase
            .from("suppliers")
            .select("id, name, razon_social, phone, email, payment_method, credit_days")
            .or(categoryKeys.map(cat => `categories.cs.{"${cat}"}`).join(","))
            .eq("status", "ACTIVO")
            .order("name");
          
          suppliers = (suppliersData || []) as Supplier[];
        }
        
        // Si no encontró por categoría, buscar todos los activos
        if (suppliers.length === 0) {
          const { data: allSuppliers } = await supabase
            .from("suppliers")
            .select("id, name, razon_social, phone, email, payment_method, credit_days")
            .eq("status", "ACTIVO")
            .order("name")
            .limit(10);
          suppliers = (allSuppliers || []) as Supplier[];
        }
        
        return { ...item, suppliers };
      })
    );
    
    setItems(itemsWithSuppliers);
    
    // 3. Inicializar precios
    const initialPrices: Record<string, { price: number; supplier: string; supplierId: number | null }> = {};
    itemsWithSuppliers.forEach(item => {
      initialPrices[item.id] = {
        price: item.selected_price || 0,
        supplier: item.selected_supplier || "",
        supplierId: null
      };
    });
    setPrices(initialPrices);
    setShowItems(true);
    setLoadingItems(false);
  };

  const updatePrice = (itemId: string, field: "price" | "supplier" | "supplierId", value: string | number | null) => {
    setPrices(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: field === "price" ? parseFloat(value as string) || 0 : value
      }
    }));
  };

  const selectSupplier = (itemId: string, supplier: Supplier) => {
    setPrices(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        supplier: supplier.name,
        supplierId: supplier.id
      }
    }));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const price = prices[item.id]?.price || 0;
      return sum + (price * item.quantity);
    }, 0);
  };

  const allItemsHavePrices = () => {
    return items.every(item => prices[item.id]?.price > 0 && prices[item.id]?.supplier);
  };

  const saveAndSendToAuthorization = async () => {
    if (!selectedReq || !allItemsHavePrices()) return;

    setSending(true);
    try {
      for (const item of items) {
        await supabase
          .from("requisition_items")
          .update({
            selected_price: prices[item.id]?.price || 0,
            selected_supplier: prices[item.id]?.supplier || ""
          })
          .eq("id", item.id);
      }

      await supabase
        .from("requisitions")
        .update({ purchase_status: "COTIZADO" })
        .eq("id", selectedReq.id);

      const daysUntil = Math.ceil((new Date(selectedReq.required_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      const response = await fetch("/api/requisicion/authorize-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requisition: selectedReq,
          items: items.map(item => ({
            ...item,
            selected_price: prices[item.id]?.price,
            selected_supplier: prices[item.id]?.supplier
          })),
          total: calculateTotal(),
          token: selectedReq.authorization_comments,
          daysUntil
        })
      });

      if (response.ok) {
        alert("✅ Enviado a autorización");
        setShowItems(false);
        setSelectedReq(null);
        loadData();
      } else {
        throw new Error("Error al enviar");
      }
    } catch (error) {
      console.error(error);
      alert("Error al enviar a autorización");
    } finally {
      setSending(false);
    }
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

  const getSelectedSupplierInfo = (itemId: string, suppliers: Supplier[]) => {
    const supplierId = prices[itemId]?.supplierId;
    if (!supplierId) return null;
    return suppliers.find(s => s.id === supplierId);
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
            <p className="text-sm text-white/50">Cotizar y enviar a autorización</p>
          </div>
        </div>
      </div>

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

          <div className="flex flex-col gap-3">
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
                      group w-full text-left rounded-2xl border transition-all duration-200
                      ${isSelected
                        ? "border-[#38BDF8]/50 bg-[#38BDF8]/10"
                        : "border-white/[0.06] hover:border-white/[0.12] bg-[rgba(2,16,36,0.85)]"
                      }
                      backdrop-blur-xl p-4
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <span className="text-[15px] font-semibold text-white truncate block">{req.folio}</span>
                        <div className="flex items-center gap-2 text-white/50 text-[13px] mt-1">
                          <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{req.cost_center_name}</span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-gradient-to-r ${urgency.color} text-white`}>
                        {urgency.text}
                      </span>
                      <ChevronRight className={`w-4 h-4 ${isSelected ? "text-[#38BDF8]" : "text-white/30"}`} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="rounded-2xl border border-white/[0.06] bg-[rgba(2,16,36,0.85)] backdrop-blur-xl min-h-[400px]">
          {selectedReq ? (
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">{selectedReq.folio}</h2>
                  <p className="text-sm text-white/50">{selectedReq.cost_center_name}</p>
                </div>
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r ${getUrgencyBadge(selectedReq.required_date).color} text-white`}>
                  <Clock className="w-3 h-3 mr-1.5" />
                  {getUrgencyBadge(selectedReq.required_date).text}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-xs text-white/40 mb-1">Fecha requerida</p>
                  <p className="text-sm text-white font-medium">
                    {new Date(selectedReq.required_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-xs text-white/40 mb-1">Solicitado por</p>
                  <p className="text-sm text-white font-medium truncate">{selectedReq.user_email || selectedReq.created_by || "—"}</p>
                </div>
              </div>

              {!showItems ? (
                <button
                  onClick={() => loadItems(selectedReq.id)}
                  disabled={loadingItems}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#003DA5] text-white font-medium text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {loadingItems ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                  {loadingItems ? "Cargando artículos y proveedores..." : "Cargar Artículos para Cotizar"}
                </button>
              ) : (
                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                      <Package className="w-4 h-4 text-[#38BDF8]" />
                      Cotización ({items.length} artículos)
                    </h3>
                    <button onClick={() => setShowItems(false)} className="p-1 rounded hover:bg-white/10">
                      <X className="w-4 h-4 text-white/40" />
                    </button>
                  </div>

                  <div className="space-y-4 max-h-[450px] overflow-auto mb-4 pr-2">
                    {items.map((item, idx) => {
                      const selectedSupplier = getSelectedSupplierInfo(String(item.id), item.suppliers);
                      
                      return (
                        <div key={item.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                          {/* Producto */}
                          <div className="flex items-start gap-3 mb-3">
                            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[#38BDF8]/20 text-[#38BDF8] text-xs font-bold flex-shrink-0">
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white font-medium">{item.product_name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-white/40">{item.quantity} {item.unit}</span>
                                <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/60">{item.category}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Proveedores sugeridos */}
                          <div className="mb-3">
                            <label className="text-[11px] text-white/40 flex items-center gap-1 mb-2">
                              <Users className="w-3 h-3" />
                              Proveedores sugeridos ({item.suppliers.length})
                            </label>
                            
                            {item.suppliers.length > 0 ? (
                              <div className="grid grid-cols-2 gap-2">
                                {item.suppliers.slice(0, 6).map((supplier) => (
                                  <button
                                    key={supplier.id}
                                    onClick={() => selectSupplier(String(item.id), supplier)}
                                    className={`text-left p-2 rounded-lg border transition-all ${
                                      prices[item.id]?.supplierId === supplier.id
                                        ? "border-[#38BDF8] bg-[#38BDF8]/20"
                                        : "border-white/10 bg-black/20 hover:border-white/30"
                                    }`}
                                  >
                                    <p className="text-xs font-medium text-white truncate">{supplier.name}</p>
                                    <p className="text-[10px] text-white/40">
                                      {supplier.credit_days > 0 ? `${supplier.credit_days}d crédito` : "Contado"}
                                    </p>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-white/30 italic">Sin proveedores vinculados</p>
                            )}
                          </div>

                          {/* Info del proveedor seleccionado */}
                          {selectedSupplier && (
                            <div className="mb-3 p-2 rounded-lg bg-[#38BDF8]/10 border border-[#38BDF8]/30">
                              <p className="text-xs font-medium text-[#38BDF8] mb-1">{selectedSupplier.name}</p>
                              <div className="flex flex-wrap gap-3 text-[10px] text-white/60">
                                {selectedSupplier.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> {selectedSupplier.phone}
                                  </span>
                                )}
                                {selectedSupplier.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" /> {selectedSupplier.email}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <CreditCard className="w-3 h-3" /> 
                                  {selectedSupplier.credit_days > 0 ? `${selectedSupplier.credit_days} días crédito` : "Contado"}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Precio */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <label className="text-[10px] text-white/40 block mb-1">Precio unitario</label>
                              <div className="relative">
                                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
                                <input
                                  type="number"
                                  placeholder="0.00"
                                  value={prices[item.id]?.price || ""}
                                  onChange={(e) => updatePrice(String(item.id), "price", e.target.value)}
                                  className="w-full pl-6 pr-2 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white placeholder-white/30 focus:border-[#38BDF8]/50 outline-none"
                                />
                              </div>
                            </div>
                            {prices[item.id]?.price > 0 && (
                              <div className="text-right pt-4">
                                <span className="text-sm text-emerald-400 font-bold">
                                  ${(prices[item.id].price * item.quantity).toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total y Enviar */}
                  <div className="border-t border-white/10 pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-white/60 text-sm">Total estimado:</span>
                      <span className="text-2xl font-bold text-emerald-400">${calculateTotal().toLocaleString()}</span>
                    </div>
                    <button
                      onClick={saveAndSendToAuthorization}
                      disabled={!allItemsHavePrices() || sending}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {sending ? "Enviando..." : "Enviar a Autorización"}
                    </button>
                    {!allItemsHavePrices() && (
                      <p className="text-xs text-amber-400 text-center mt-2">Selecciona proveedor y agrega precio a todos los artículos</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center p-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-white/20" />
                </div>
                <p className="text-white/40 text-sm">Selecciona una requisición</p>
                <p className="text-white/25 text-xs mt-1">para cotizar y enviar a autorización</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
