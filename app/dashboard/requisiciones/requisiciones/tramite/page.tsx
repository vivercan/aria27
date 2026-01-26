"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ShoppingCart, Clock, Building2, AlertCircle, FileText, ChevronRight, Package, X, DollarSign,
  Send, Loader2, Phone, Mail, CreditCard, Users, ArrowLeft, Sparkles, Globe, ExternalLink, Check
} from "lucide-react";

type Requisition = {
  id: number;
  folio: string;
  cost_center_name: string;
  required_date: string;
  created_at: string;
  created_by: string;
  user_email: string;
  purchase_status: string;
  status: string;
  authorization_comments: string;
};

type Supplier = {
  id: number;
  name: string;
  phone: string;
  email: string;
  categories: string[];
  credit_days: number;
  website?: string;
};

type RequisitionItem = {
  id: number;
  product_name: string;
  unit: string;
  quantity: number;
  category: string;
  selected_price?: number;
  selected_supplier?: string;
};

type ProveedorIA = {
  nombre: string;
  direccion?: string;
  telefono?: string;
  sitio_web?: string;
};

export default function ComprasTramitePage() {
  const [requisiciones, setRequisiciones] = useState<Requisition[]>([]);
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
  const [items, setItems] = useState<RequisitionItem[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [sending, setSending] = useState(false);
  const [prices, setPrices] = useState<Record<number, { price: number; supplier: string }>>({});
  
  // IA
  const [buscandoIA, setBuscandoIA] = useState(false);
  const [proveedoresIA, setProveedoresIA] = useState<ProveedorIA[]>([]);
  const [analisisIA, setAnalisisIA] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: reqs } = await supabase
      .from("requisitions")
      .select("*")
      .eq("status", "APROBADA")
      .order("required_date", { ascending: true });
    setRequisiciones((reqs || []) as Requisition[]);
    
    // Cargar TODOS los proveedores activos
    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("id, name, phone, email, categories, credit_days, website")
      .eq("status", "ACTIVO")
      .order("name");
    setAllSuppliers((suppliers || []) as Supplier[]);
    
    setLoading(false);
  };

  const loadItems = async (reqId: number) => {
    setLoadingItems(true);
    const { data } = await supabase
      .from("requisition_items")
      .select("*")
      .eq("requisition_id", reqId);
    setItems((data || []) as RequisitionItem[]);
    
    const init: Record<number, { price: number; supplier: string }> = {};
    (data || []).forEach((item: any) => {
      init[item.id] = { price: item.selected_price || 0, supplier: item.selected_supplier || "" };
    });
    setPrices(init);
    setLoadingItems(false);
  };

  // Obtener proveedores relevantes del catálogo
  const getRelevantSuppliers = (): Supplier[] => {
    const categories = new Set<string>();
    items.forEach(item => {
      const cat = item.category?.toUpperCase();
      if (cat?.includes("ACERO") || cat?.includes("METAL")) categories.add("ACEROS");
      if (cat?.includes("COMBUSTIBLE") || cat?.includes("DIESEL") || cat?.includes("LUBRICANTE")) categories.add("COMBUSTIBLES");
      if (cat?.includes("CONCRETO")) categories.add("CONCRETOS");
      if (cat?.includes("AGREGADO")) categories.add("AGREGADOS");
      if (cat?.includes("ELECTRIC")) categories.add("ELECTRICO");
      if (cat?.includes("FERRETER")) categories.add("FERRETERIA");
      if (cat?.includes("TUBERI") || cat?.includes("PLOMER")) categories.add("TUBERIAS");
    });
    
    if (categories.size === 0) return allSuppliers.slice(0, 10);
    
    const relevant = allSuppliers.filter(s => 
      s.categories?.some(c => categories.has(c))
    );
    
    if (relevant.length < 5) {
      const others = allSuppliers.filter(s => !relevant.includes(s)).slice(0, 10 - relevant.length);
      return [...relevant, ...others];
    }
    
    return relevant.slice(0, 10);
  };

  // Filtrar proveedores IA para no repetir los del catálogo
  const getProveedoresIAFiltrados = (): ProveedorIA[] => {
    const catalogNames = allSuppliers.map(s => s.name.toLowerCase().trim());
    
    return proveedoresIA.filter(p => {
      const nombreIA = p.nombre.toLowerCase().trim();
      // No incluir si el nombre coincide o es muy similar a alguno del catálogo
      return !catalogNames.some(catName => 
        catName.includes(nombreIA) || 
        nombreIA.includes(catName) ||
        catName === nombreIA
      );
    }).slice(0, 10);
  };

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
          productos: items.map(i => ({ nombre: i.product_name, cantidad: i.quantity, unidad: i.unit, categoria: i.category })),
          requisicion_id: selectedReq.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setProveedoresIA(data.proveedores_web || []);
        setAnalisisIA(data.analisis || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBuscandoIA(false);
    }
  };

  const selectSupplier = (itemId: number, supplierName: string) => {
    setPrices(prev => ({ ...prev, [itemId]: { ...prev[itemId], supplier: supplierName } }));
  };

  const updatePrice = (itemId: number, price: number) => {
    setPrices(prev => ({ ...prev, [itemId]: { ...prev[itemId], price } }));
  };

  const calculateTotal = () => items.reduce((sum, item) => sum + ((prices[item.id]?.price || 0) * item.quantity), 0);
  const allComplete = () => items.every(item => prices[item.id]?.price > 0 && prices[item.id]?.supplier);

  const saveAndSend = async () => {
    if (!selectedReq || !allComplete()) return;
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
        setSelectedReq(null);
        setItems([]);
        setProveedoresIA([]);
        loadData();
      }
    } catch (e) {
      alert("Error al enviar");
    } finally {
      setSending(false);
    }
  };

  const getDaysUntil = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const getUrgencyBadge = (date: string) => {
    const days = getDaysUntil(date);
    if (days <= 0) return { text: "HOY", color: "bg-red-500" };
    if (days <= 2) return { text: `${days}d`, color: "bg-orange-500" };
    return { text: `${days}d`, color: "bg-emerald-500" };
  };

  // === LISTA DE REQUISICIONES ===
  if (!selectedReq) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/requisiciones/requisiciones" className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Compras - Cotizar</h1>
            <p className="text-slate-500 text-sm">{requisiciones.length} requisiciones pendientes</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-400">Cargando...</div>
        ) : requisiciones.length === 0 ? (
          <div className="text-center py-10 bg-white/5 rounded-xl"><AlertCircle className="w-10 h-10 mx-auto mb-2 text-slate-500" /><p className="text-slate-400">Sin requisiciones</p></div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {requisiciones.map(req => (
              <button key={req.id} onClick={() => { setSelectedReq(req); loadItems(req.id); }}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/50 text-left group">
                <div className="flex justify-between mb-2">
                  <span className="font-mono text-cyan-400 text-sm">{req.folio}</span>
                  <span className={`px-2 py-0.5 rounded text-xs text-white ${getUrgencyBadge(req.required_date).color}`}>{getUrgencyBadge(req.required_date).text}</span>
                </div>
                <p className="text-white font-medium text-sm">{req.cost_center_name}</p>
                <p className="text-slate-500 text-xs truncate">{req.user_email}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // === DETALLE COMPACTO ===
  const relevantSuppliers = getRelevantSuppliers();
  const proveedoresIAFiltrados = getProveedoresIAFiltrados();
  const urgency = getUrgencyBadge(selectedReq.required_date);

  return (
    <div className="space-y-3 text-sm">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => { setSelectedReq(null); setItems([]); setProveedoresIA([]); }} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
          <ArrowLeft className="w-4 h-4 text-slate-400" />
        </button>
        <div className="flex-1 flex items-center gap-3">
          <span className="text-lg font-bold text-white">{selectedReq.folio}</span>
          <span className={`px-2 py-0.5 rounded text-xs text-white ${urgency.color}`}>{urgency.text}</span>
          <span className="text-slate-400">{selectedReq.cost_center_name}</span>
        </div>
        <div className="text-right">
          <span className="text-slate-500 text-xs">Total: </span>
          <span className="text-emerald-400 font-bold text-lg">${calculateTotal().toLocaleString()}</span>
        </div>
      </div>

      {loadingItems ? (
        <div className="text-center py-10"><Loader2 className="w-8 h-8 mx-auto animate-spin text-cyan-400" /></div>
      ) : (
        <>
          {/* Proveedores */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                Proveedores del Catálogo ({relevantSuppliers.length})
              </h3>
              <button onClick={buscarConIA} disabled={buscandoIA}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity">
                {buscandoIA ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {buscandoIA ? "Buscando..." : "Buscar + con ARIA"}
              </button>
            </div>

            {/* Análisis ARIA */}
            {analisisIA && (
              <p className="text-cyan-400/80 text-xs mb-3 p-2 rounded bg-cyan-500/10 border border-cyan-500/20">{analisisIA}</p>
            )}

            {/* LÍNEA 1: Proveedores del Catálogo */}
            <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2 mb-2">
              {relevantSuppliers.map(s => (
                <div key={s.id} className="p-2 rounded-lg bg-black/30 border border-white/10 hover:border-cyan-500/50">
                  <p className="text-white font-medium text-xs truncate" title={s.name}>{s.name}</p>
                  <p className="text-slate-500 text-[10px]">{s.categories?.[0] || "General"}</p>
                  {s.phone && <p className="text-slate-400 text-[10px] flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{s.phone}</p>}
                  {s.credit_days ? <p className="text-cyan-400 text-[10px]">{s.credit_days}d créd</p> : <p className="text-slate-500 text-[10px]">Contado</p>}
                </div>
              ))}
            </div>

            {/* LÍNEA 2: Proveedores encontrados por ARIA (sin repetir) */}
            {proveedoresIAFiltrados.length > 0 && (
              <>
                <div className="flex items-center gap-2 my-2">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
                  <span className="text-cyan-400 text-[10px] font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Sugeridos por ARIA ({proveedoresIAFiltrados.length})
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2">
                  {proveedoresIAFiltrados.map((p, i) => (
                    <div key={`ia-${i}`} className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 hover:border-cyan-500/50">
                      <p className="text-cyan-400 font-medium text-xs truncate flex items-center gap-1" title={p.nombre}>
                        <Sparkles className="w-2.5 h-2.5 flex-shrink-0" />{p.nombre}
                      </p>
                      {p.telefono && <p className="text-slate-400 text-[10px]">{p.telefono}</p>}
                      {p.sitio_web && <a href={p.sitio_web} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-[10px] flex items-center gap-1 hover:underline"><ExternalLink className="w-2.5 h-2.5" />Web</a>}
                      {!p.telefono && !p.sitio_web && <p className="text-slate-500 text-[10px]">Aguascalientes</p>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Artículos - Tabla compacta */}
          <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr className="text-left text-slate-400 text-xs">
                  <th className="p-2 w-8">#</th>
                  <th className="p-2">Producto</th>
                  <th className="p-2 w-24">Cant.</th>
                  <th className="p-2">Proveedor</th>
                  <th className="p-2 w-28">Precio Unit.</th>
                  <th className="p-2 w-24 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="p-2 text-cyan-400 font-bold text-xs">{idx + 1}</td>
                    <td className="p-2">
                      <p className="text-white text-xs font-medium">{item.product_name}</p>
                      <p className="text-slate-500 text-[10px]">{item.category}</p>
                    </td>
                    <td className="p-2 text-white text-xs">{item.quantity} {item.unit}</td>
                    <td className="p-2">
                      <select
                        value={prices[item.id]?.supplier || ""}
                        onChange={(e) => selectSupplier(item.id, e.target.value)}
                        className="w-full px-2 py-1.5 rounded bg-black/30 border border-white/10 text-white text-xs focus:border-cyan-500 outline-none"
                      >
                        <option value="">Seleccionar...</option>
                        <optgroup label="📦 Catálogo">
                          {relevantSuppliers.map(s => (
                            <option key={s.id} value={s.name}>{s.name}</option>
                          ))}
                        </optgroup>
                        {proveedoresIAFiltrados.length > 0 && (
                          <optgroup label="✨ Sugeridos por ARIA">
                            {proveedoresIAFiltrados.map((p, i) => (
                              <option key={`ia-${i}`} value={p.nombre}>{p.nombre}</option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        placeholder="$0.00"
                        value={prices[item.id]?.price || ""}
                        onChange={(e) => updatePrice(item.id, parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 rounded bg-black/30 border border-white/10 text-white text-xs text-right focus:border-cyan-500 outline-none"
                      />
                    </td>
                    <td className="p-2 text-right">
                      {prices[item.id]?.price > 0 && (
                        <span className="text-emerald-400 font-bold text-xs">
                          ${((prices[item.id]?.price || 0) * item.quantity).toLocaleString()}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-4">
              {!allComplete() && <span className="text-amber-400 text-xs">⚠️ Completa todos los campos</span>}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-slate-400 text-xs">Total: </span>
                <span className="text-emerald-400 font-bold text-xl">${calculateTotal().toLocaleString()}</span>
              </div>
              <button
                onClick={saveAndSend}
                disabled={!allComplete() || sending}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar a Autorización
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
