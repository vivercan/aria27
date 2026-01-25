"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ShoppingCart, Clock, Building2, AlertCircle, FileText, ChevronRight, Package, X, DollarSign,
  Send, Loader2, Phone, Mail, CreditCard, Users, ArrowLeft, Sparkles, Globe, MapPin, ExternalLink, ChevronDown
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

type ItemWithProveedores = RequisitionItem & {
  Proveedores: Supplier[];
  proveedoresIA?: any[];
};

type ProveedorIA = {
  nombre: string;
  direccion: string;
  telefono: string;
  sitio_web: string;
  productos_relacionados: string;
  fuente: string;
};

export default function ComprasTramitePage() {
  const [requisiciones, setRequisiciones] = useState<Requisition[]>([]);
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
  const [items, setItems] = useState<ItemWithProveedores[]>([]);
  const [showItems, setShowItems] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [sending, setSending] = useState(false);
  const [prices, setPrices] = useState<Record<string, { price: number; supplier: string; supplierId: number | null; isIA?: boolean }>>({});
  
  // IA States
  const [buscandoIA, setBuscandoIA] = useState(false);
  const [proveedoresIA, setProveedoresIA] = useState<ProveedorIA[]>([]);
  const [analisisIA, setAnalisisIA] = useState("");
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: reqs } = await supabase
      .from("requisitions")
      .select("*")
      .eq("status", "APROBADA")
      .order("required_date", { ascending: true });
    setRequisiciones((reqs || []) as Requisition[]);
    setLoading(false);
  };

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
    const { data: itemsData } = await supabase
      .from("requisition_items")
      .select("*")
      .eq("requisition_id", reqId);

    const rawItems = (itemsData || []) as RequisitionItem[];

    const itemsWithProveedores: ItemWithProveedores[] = await Promise.all(
      rawItems.map(async (item) => {
        const categoryKeys = getCategoryMapping(item.category);
        let proveedores: Supplier[] = [];

        if (categoryKeys.length > 0) {
          const { data } = await supabase
            .from("suppliers")
            .select("id, name, razon_social, phone, email, payment_method, credit_days")
            .or(categoryKeys.map(cat => `categories.cs.{"${cat}"}`).join(","))
            .eq("status", "ACTIVO")
            .order("name")
            .limit(5);
          proveedores = (data || []) as Supplier[];
        }

        if (proveedores.length === 0) {
          const { data } = await supabase
            .from("suppliers")
            .select("id, name, razon_social, phone, email, payment_method, credit_days")
            .eq("status", "ACTIVO")
            .order("name")
            .limit(5);
          proveedores = (data || []) as Supplier[];
        }

        return { ...item, Proveedores: proveedores };
      })
    );

    setItems(itemsWithProveedores);

    const initialPrices: Record<string, { price: number; supplier: string; supplierId: number | null }> = {};
    itemsWithProveedores.forEach(item => {
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

  // Búsqueda con IA
  const buscarConIA = async () => {
    if (!selectedReq || items.length === 0) return;
    setBuscandoIA(true);
    setProveedoresIA([]);
    setAnalisisIA("");

    try {
      const res = await fetch("/api/proveedores/buscar-inteligente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productos: items.map(i => ({
            nombre: i.product_name,
            cantidad: i.quantity,
            unidad: i.unit,
            categoria: i.category
          })),
          requisicion_id: selectedReq.id
        })
      });

      const data = await res.json();
      if (data.success) {
        setProveedoresIA(data.proveedores_web || []);
        setAnalisisIA(data.analisis || "");
      }
    } catch (e) {
      console.error("Error IA:", e);
    } finally {
      setBuscandoIA(false);
    }
  };

  const updatePrice = (itemId: string, field: "price" | "supplier" | "supplierId", value: string | number | null) => {
    setPrices(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: field === "price" ? parseFloat(value as string) || 0 : value }
    }));
  };

  const selectSupplier = (itemId: string, supplier: Supplier) => {
    setPrices(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], supplier: supplier.name, supplierId: supplier.id, isIA: false }
    }));
  };

  const selectSupplierIA = (itemId: string, proveedor: ProveedorIA) => {
    setPrices(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], supplier: proveedor.nombre, supplierId: null, isIA: true }
    }));
  };

  const calculateTotal = () => items.reduce((sum, item) => sum + ((prices[item.id]?.price || 0) * item.quantity), 0);
  const allItemsHavePrices = () => items.every(item => prices[item.id]?.price > 0 && prices[item.id]?.supplier);

  const saveAndSendToAuthorization = async () => {
    if (!selectedReq || !allItemsHavePrices()) return;
    setSending(true);
    try {
      for (const item of items) {
        await supabase.from("requisition_items").update({
          selected_price: prices[item.id]?.price || 0,
          selected_supplier: prices[item.id]?.supplier || ""
        }).eq("id", item.id);
      }

      await supabase.from("requisitions").update({ purchase_status: "COTIZADO" }).eq("id", selectedReq.id);

      const response = await fetch("/api/requisicion/autorizar-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requisition: selectedReq,
          items: items.map(item => ({ ...item, selected_price: prices[item.id]?.price, selected_supplier: prices[item.id]?.supplier })),
          total: calculateTotal(),
          token: selectedReq.authorization_comments
        })
      });

      if (response.ok) {
        alert("✅ Enviado a autorización");
        volverALista();
        loadData();
      } else {
        throw new Error("Error al enviar");
      }
    } catch (error) {
      alert("Error al enviar a autorización");
    } finally {
      setSending(false);
    }
  };

  const volverALista = () => {
    setSelectedReq(null);
    setShowItems(false);
    setItems([]);
    setProveedoresIA([]);
    setAnalisisIA("");
  };

  const getDaysUntil = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  const getUrgencyBadge = (date: string) => {
    const days = getDaysUntil(date);
    if (days <= 0) return { text: "HOY", color: "bg-red-500" };
    if (days <= 2) return { text: `${days}d`, color: "bg-orange-500" };
    if (days <= 5) return { text: `${days}d`, color: "bg-amber-500" };
    return { text: `${days}d`, color: "bg-slate-500" };
  };

  // === VISTA: LISTA DE REQUISICIONES ===
  if (!selectedReq) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/requisiciones/requisiciones" className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-cyan-400" />
              Compras - Por Cotizar
            </h1>
            <p className="text-slate-400 text-sm">Selecciona una requisición para cotizar</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400">Cargando...</div>
        ) : requisiciones.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-2xl">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-500" />
            <p className="text-slate-400">No hay requisiciones pendientes de cotizar</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {requisiciones.map(req => {
              const urgency = getUrgencyBadge(req.required_date);
              return (
                <button
                  key={req.id}
                  onClick={() => setSelectedReq(req)}
                  className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500/30 transition-all text-left group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="font-mono text-cyan-400 font-semibold">{req.folio}</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold text-white ${urgency.color}`}>{urgency.text}</span>
                  </div>
                  <p className="text-white font-medium mb-1">{req.cost_center_name}</p>
                  <p className="text-slate-500 text-sm">{req.user_email}</p>
                  <div className="mt-3 flex items-center text-cyan-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Cotizar</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // === VISTA: DETALLE DE REQUISICIÓN (PANTALLA COMPLETA) ===
  const urgency = getUrgencyBadge(selectedReq.required_date);

  return (
    <div className="space-y-6">
      {/* Header con botón volver */}
      <div className="flex items-center gap-4">
        <button onClick={volverALista} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{selectedReq.folio}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${urgency.color}`}>{urgency.text}</span>
          </div>
          <p className="text-slate-400">{selectedReq.cost_center_name}</p>
        </div>
      </div>

      {/* Info de la requisición */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white/5">
          <p className="text-xs text-slate-500 mb-1">Fecha requerida</p>
          <p className="text-white font-medium">{new Date(selectedReq.required_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5">
          <p className="text-xs text-slate-500 mb-1">Solicitado por</p>
          <p className="text-white font-medium truncate">{selectedReq.user_email || selectedReq.created_by}</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5">
          <p className="text-xs text-slate-500 mb-1">Artículos</p>
          <p className="text-white font-medium">{items.length || "—"}</p>
        </div>
        <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
          <p className="text-xs text-emerald-400 mb-1">Total estimado</p>
          <p className="text-emerald-400 font-bold text-xl">${calculateTotal().toLocaleString()}</p>
        </div>
      </div>

      {/* Cargar artículos o mostrar cotización */}
      {!showItems ? (
        <button
          onClick={() => loadItems(selectedReq.id)}
          disabled={loadingItems}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium flex items-center justify-center gap-2"
        >
          {loadingItems ? <Loader2 className="w-5 h-5 animate-spin" /> : <Package className="w-5 h-5" />}
          {loadingItems ? "Cargando artículos..." : "Cargar Artículos para Cotizar"}
        </button>
      ) : (
        <>
          {/* Botón buscar con IA */}
          <div className="flex items-center gap-4">
            <button
              onClick={buscarConIA}
              disabled={buscandoIA}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium flex items-center gap-2"
            >
              {buscandoIA ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {buscandoIA ? "Buscando proveedores..." : "Buscar Proveedores con IA"}
            </button>
            {analisisIA && (
              <div className="flex-1 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <p className="text-amber-400 text-sm"><Sparkles className="w-4 h-4 inline mr-1" />{analisisIA}</p>
              </div>
            )}
          </div>

          {/* Proveedores encontrados por IA */}
          {proveedoresIA.length > 0 && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30">
              <h3 className="text-amber-400 font-medium mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Proveedores encontrados en Aguascalientes ({proveedoresIA.length})
              </h3>
              <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-3">
                {proveedoresIA.slice(0, 5).map((p, i) => (
                  <div key={i} className="p-3 rounded-lg bg-black/30 border border-white/10">
                    <p className="text-white font-medium text-sm truncate">{p.nombre}</p>
                    {p.telefono && <p className="text-slate-400 text-xs flex items-center gap-1 mt-1"><Phone className="w-3 h-3" />{p.telefono}</p>}
                    {p.sitio_web && (
                      <a href={p.sitio_web} target="_blank" rel="noopener noreferrer" className="text-cyan-400 text-xs flex items-center gap-1 mt-1 hover:underline">
                        <ExternalLink className="w-3 h-3" />Web
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de artículos */}
          <div className="space-y-4">
            {items.map((item, idx) => {
              const isExpanded = expandedItem === item.id;
              const selectedSupplier = item.Proveedores.find(s => s.id === prices[item.id]?.supplierId);
              
              return (
                <div key={item.id} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                  {/* Header del artículo */}
                  <div 
                    className="p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5"
                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                  >
                    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-sm">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium">{item.product_name}</p>
                      <p className="text-slate-400 text-sm">{item.quantity} {item.unit} · {item.category}</p>
                    </div>
                    
                    {/* Proveedor seleccionado mini */}
                    {prices[item.id]?.supplier && (
                      <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                        <span className="text-emerald-400 text-xs font-medium">{prices[item.id].supplier}</span>
                      </div>
                    )}
                    
                    {/* Precio */}
                    <div className="text-right min-w-[100px]">
                      <input
                        type="number"
                        placeholder="$0.00"
                        value={prices[item.id]?.price || ""}
                        onChange={(e) => { e.stopPropagation(); updatePrice(String(item.id), "price", e.target.value); }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-24 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-right text-sm focus:border-cyan-500 outline-none"
                      />
                    </div>
                    
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>

                  {/* Contenido expandido */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-white/10 pt-4">
                      <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Selecciona proveedor (máx 5 sugeridos)
                      </p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {/* Proveedores de BD */}
                        {item.Proveedores.slice(0, 5).map(supplier => (
                          <button
                            key={supplier.id}
                            onClick={() => selectSupplier(String(item.id), supplier)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              prices[item.id]?.supplierId === supplier.id
                                ? "border-cyan-500 bg-cyan-500/20"
                                : "border-white/10 bg-black/20 hover:border-white/30"
                            }`}
                          >
                            <p className="text-white font-medium text-sm truncate">{supplier.name}</p>
                            <p className="text-slate-500 text-xs mt-1">
                              {supplier.credit_days > 0 ? `${supplier.credit_days}d crédito` : "Contado"}
                            </p>
                            {supplier.phone && <p className="text-slate-500 text-xs">{supplier.phone}</p>}
                          </button>
                        ))}

                        {/* Proveedores de IA */}
                        {proveedoresIA.slice(0, 5 - item.Proveedores.length).map((p, i) => (
                          <button
                            key={`ia-${i}`}
                            onClick={() => selectSupplierIA(String(item.id), p)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              prices[item.id]?.supplier === p.nombre && prices[item.id]?.isIA
                                ? "border-amber-500 bg-amber-500/20"
                                : "border-amber-500/30 bg-amber-500/10 hover:border-amber-500/50"
                            }`}
                          >
                            <p className="text-amber-400 font-medium text-sm truncate flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />{p.nombre}
                            </p>
                            <p className="text-slate-500 text-xs mt-1">Encontrado por IA</p>
                            {p.telefono && <p className="text-slate-500 text-xs">{p.telefono}</p>}
                          </button>
                        ))}

                        {item.Proveedores.length === 0 && proveedoresIA.length === 0 && (
                          <p className="col-span-5 text-slate-500 text-sm italic">Sin proveedores. Usa "Buscar con IA" arriba.</p>
                        )}
                      </div>

                      {/* Info detallada del proveedor seleccionado */}
                      {selectedSupplier && (
                        <div className="mt-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                          <p className="text-cyan-400 font-medium text-sm mb-2">{selectedSupplier.name}</p>
                          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                            {selectedSupplier.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selectedSupplier.phone}</span>}
                            {selectedSupplier.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{selectedSupplier.email}</span>}
                            <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" />{selectedSupplier.credit_days > 0 ? `${selectedSupplier.credit_days} días` : "Contado"}</span>
                          </div>
                        </div>
                      )}

                      {/* Subtotal del item */}
                      {prices[item.id]?.price > 0 && (
                        <div className="mt-3 text-right">
                          <span className="text-slate-400 text-sm">Subtotal: </span>
                          <span className="text-emerald-400 font-bold">${(prices[item.id].price * item.quantity).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Botón enviar */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
            <div>
              <p className="text-slate-400 text-sm">Total estimado</p>
              <p className="text-3xl font-bold text-emerald-400">${calculateTotal().toLocaleString()}</p>
            </div>
            <button
              onClick={saveAndSendToAuthorization}
              disabled={!allItemsHavePrices() || sending}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {sending ? "Enviando..." : "Enviar a Autorización"}
            </button>
          </div>

          {!allItemsHavePrices() && (
            <p className="text-center text-amber-400 text-sm">⚠️ Selecciona proveedor y agrega precio a todos los artículos</p>
          )}
        </>
      )}
    </div>
  );
}
