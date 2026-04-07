"use client";
import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ShoppingCart, Building2, AlertCircle, Send, Loader2, Phone, ArrowLeft, Sparkles, ExternalLink
} from "lucide-react";

type Requisition = {
  id: number;
  folio: string;
  cost_center_name: string;
  required_date: string;
  user_email: string;
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
  telefono?: string;
  sitio_web?: string;
  especialidad?: string;
};

export default function ComprasTramitePage() {
  const router = useRouter();
  const [requisiciones, setRequisiciones] = useState<Requisition[]>([]);
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
  const [items, setItems] = useState<RequisitionItem[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [sending, setSending] = useState(false);
  const [prices, setPrices] = useState<Record<number, { price: number; supplier: string }>>({});
  
  const [buscandoIA, setBuscandoIA] = useState(false);
  const [solicitando, setSolicitando] = useState(false);
  const [resultadoSolicitud, setResultadoSolicitud] = useState<any>(null);
  const [proveedoresIA, setProveedoresIA] = useState<ProveedorIA[]>([]);

  // COTIZACIONES POR MATERIAL (hasta 5 por item)
  const [itemQuotes, setItemQuotes] = useState<Record<number, Array<{supplier: string; price: number; entrega: string; forma_pago: string; factura: boolean; pdf_url: string}>>>({});

  // META por columna de proveedor
  const [columnMeta, setColumnMeta] = useState<Array<{rebaja_iva: boolean; observaciones: string}>>(
    Array.from({length: 5}, () => ({rebaja_iva: false, observaciones: ""}))
  );
  const updateColumnMeta = (colIdx: number, field: "rebaja_iva" | "observaciones", value: boolean | string) => {
    setColumnMeta(prev => {
      const updated = [...prev];
      updated[colIdx] = {...updated[colIdx], [field]: value};
      return updated;
    });
  };

  const initQuotes = (itemsList: any[]) => {
    const q: Record<number, Array<{supplier: string; price: number; entrega: string; forma_pago: string; factura: boolean; pdf_url: string}>> = {};
    itemsList.forEach((item: any) => {
      q[item.id] = Array.from({length: 5}, () => ({supplier: "", price: 0, entrega: "", forma_pago: "transferencia", factura: true, pdf_url: ""}));
    });
    setItemQuotes(q);
  };

  const updateQuote = (itemId: number, idx: number, field: "supplier" | "price" | "entrega" | "forma_pago" | "factura" | "pdf_url", value: string | number | boolean) => {
    setItemQuotes(prev => {
      const updated = {...prev};
      if (!updated[itemId]) updated[itemId] = Array.from({length: 5}, () => ({supplier: "", price: 0, entrega: "", forma_pago: "transferencia", factura: true, pdf_url: ""}));
      updated[itemId] = [...updated[itemId]];
      updated[itemId][idx] = {...updated[itemId][idx], [field]: value};
      return updated;
    });
  };

  const getFilledQuotes = (itemId: number) => (itemQuotes[itemId] || []).filter(q => q.supplier && q.price > 0);
  const allItemsHaveMinQuotes = () => items.length > 0 && items.every(item => getFilledQuotes(item.id).length >= 3);
  const totalQuotesCount = () => items.length > 0 ? items.reduce((min, item) => Math.min(min, getFilledQuotes(item.id).length), 99) : 0;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: reqs } = await supabase
      .from("Requisiciones")
      .select("*")
      .in("status", ["PENDIENTE", "APROBADA", "EN_COTIZACION"])
      .order("required_date", { ascending: true });
    setRequisiciones((reqs || []) as Requisition[]);
    
    const { data: suppliers } = await supabase
      .from("Proveedores")
      .select("id, name, phone, email, categories, credit_days, website")
      .eq("status", "ACTIVO")
      .order("name");
    setAllSuppliers((suppliers || []) as Supplier[]);
    
    setLoading(false);
  };

  const loadItems = async (reqId: number) => {
    setLoadingItems(true);
    setProveedoresIA([]);
    const { data } = await supabase
      .from("requisition_items")
      .select("*")
      .eq("requisition_id", reqId);
    const itemsData = (data || []) as RequisitionItem[];
    setItems(itemsData);
    initQuotes(data || []);
    
    const init: Record<number, { price: number; supplier: string }> = {};
    (data || []).forEach((item: any) => {
      init[item.id] = { price: item.selected_price || 0, supplier: item.selected_supplier || "" };
    });
    setPrices(init);
    setLoadingItems(false);
  };

  // MAPEO INTELIGENTE DE CATEGORÍAS
  const getCategoriesFromProduct = (productName: string, category: string): string[] => {
    const name = productName.toLowerCase();
    const cat = category?.toLowerCase() || "";
    const matches: string[] = [];

    // Eléctrico
    if (name.includes("centro carga") || name.includes("interruptor") || name.includes("cable") || 
        name.includes("foco") || name.includes("lamp") || name.includes("electric") || 
        name.includes("contacto") || name.includes("apagador") || cat.includes("electric")) {
      matches.push("ELECTRICO");
    }
    // Combustibles y lubricantes
    if (name.includes("diesel") || name.includes("gasolina") || name.includes("aceite") || 
        name.includes("lubricante") || name.includes("15w") || name.includes("filtro") ||
        cat.includes("combustible") || cat.includes("lubricante")) {
      matches.push("COMBUSTIBLES");
    }
    // Acero
    if (name.includes("acero") || name.includes("varilla") || name.includes("perfil") || 
        name.includes("angulo") || name.includes("ptf") || name.includes("solera") ||
        cat.includes("acero") || cat.includes("metal")) {
      matches.push("ACEROS");
    }
    // Concreto
    if (name.includes("cemento") || name.includes("concreto") || name.includes("block") || 
        name.includes("tabique") || cat.includes("concreto")) {
      matches.push("CONCRETOS");
    }
    // Agregados
    if (name.includes("grava") || name.includes("arena") || name.includes("tepetate") || 
        cat.includes("agregado")) {
      matches.push("AGREGADOS");
    }
    // Tuberías
    if (name.includes("tubo") || name.includes("tuberia") || name.includes("pvc") || 
        name.includes("codo") || name.includes("valvula") || cat.includes("tuberi") || cat.includes("plomer")) {
      matches.push("TUBERIAS");
    }
    // Ferretería
    if (name.includes("tornillo") || name.includes("clavo") || name.includes("herramienta") || 
        name.includes("broca") || name.includes("disco") || cat.includes("ferreter")) {
      matches.push("FERRETERIA");
    }
    // EPP
    if (name.includes("casco") || name.includes("guante") || name.includes("lente") || 
        name.includes("chaleco") || name.includes("bota") || cat.includes("epp") || cat.includes("seguridad")) {
      matches.push("EPP");
    }

    return matches;
  };

  // OBTENER PROVEEDORES RELEVANTES POR PRODUCTO
  const getRelevantSuppliers = (): Supplier[] => {
    const allCategories = new Set<string>();
    
    items.forEach(item => {
      const cats = getCategoriesFromProduct(item.product_name, item.category);
      cats.forEach(c => allCategories.add(c));
    });

    if (allCategories.size === 0) {
      return allSuppliers.slice(0, 10);
    }

    // Filtrar proveedores que tengan alguna categoría relevante
    const relevant = allSuppliers.filter(s => 
      s.categories?.some(c => allCategories.has(c.toUpperCase()))
    );

    if (relevant.length >= 5) {
      return relevant.slice(0, 10);
    }

    // Si hay pocos, agregar otros
    const others = allSuppliers.filter(s => !relevant.includes(s)).slice(0, 10 - relevant.length);
    return [...relevant, ...others].slice(0, 10);
  };

  // BÚSQUEDA ARIA RÁPIDA (sin web_search)
  const buscarConARIA = async () => {
    if (!selectedReq || items.length === 0) return;
    setBuscandoIA(true);
    setProveedoresIA([]);

    try {
      const productosTexto = items.map(i => `${i.product_name} (${i.quantity} ${i.unit})`).join(", ");
      const proveedoresExistentes = allSuppliers.map(s => s.name).join(", ");

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Soy una constructora en Aguascalientes, México. Necesito comprar: ${productosTexto}.

Ya tengo estos proveedores: ${proveedoresExistentes}

Dame 5 proveedores ADICIONALES en Aguascalientes que vendan estos productos. NO repitas los que ya tengo.
Responde SOLO con JSON así:
[{"nombre":"Nombre","telefono":"(449) XXX-XXXX","especialidad":"qué venden"}]`
        })
      });

      const data = await res.json();
      if (data.response) {
        try {
          const match = data.response.match(/\[[\s\S]*\]/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            setProveedoresIA(parsed.slice(0, 5));
          }
        } catch (e) {
          console.error("Error parsing:", e);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBuscandoIA(false);
    }
  };

  const solicitarCotizacion = async () => {
    if (!selectedReq || items.length === 0) return;
    setSolicitando(true);
    setResultadoSolicitud(null);
    try {
      const provs = getRelevantSuppliers().map(s => ({ name: s.name, email: s.email, phone: s.phone }));
      const res = await fetch("/api/requisicion/solicitar-cotizacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folio: selectedReq.folio,
          obra: selectedReq.cost_center_name,
          fecha_requerida: selectedReq.required_date,
          items: items.map(i => ({ product_name: i.product_name, unit: i.unit, quantity: i.quantity })),
          proveedores: provs,
          user_email: localStorage.getItem("userEmail") || "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert("Error solicitar-cotizacion (" + res.status + "): " + (data?.error || "").slice(0, 200));
        setSolicitando(false);
        return;
      }
      setResultadoSolicitud(data);
    } catch (e) {
      setResultadoSolicitud({ error: "Error de conexion" });
    } finally {
      setSolicitando(false);
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
        const { error: itErr } = await supabase.from("requisition_items").update({
          selected_price: prices[item.id]?.price || 0,
          selected_supplier: prices[item.id]?.supplier || ""
        }).eq("id", item.id);
        if (itErr) { alert("Error al guardar item: " + itErr.message); setSending(false); return; }
      }
      const { error: reqErr } = await supabase.from("requisitions").update({ purchase_status: "COTIZADO" }).eq("id", selectedReq.id);
      if (reqErr) { alert("Error al marcar COTIZADO: " + reqErr.message); setSending(false); return; }

      const apRes = await fetch("/api/requisicion/authorize-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requisition: selectedReq,
          items: items.map(item => ({ ...item, selected_price: prices[item.id]?.price, selected_supplier: prices[item.id]?.supplier })),
          total: calculateTotal(),
          token: selectedReq.authorization_comments
        })
      });
      if (!apRes.ok) {
        const errTxt = await apRes.text().catch(() => "");
        alert("Error al enviar a autorizacion (" + apRes.status + "): " + errTxt.slice(0, 200));
        setSending(false);
        return;
      }

      alert("✅ Enviado a autorización");
      setSelectedReq(null);
      setItems([]);
      setProveedoresIA([]);
      loadData();
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

  // === LISTA ===
  if (!selectedReq) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/requisiciones/requisiciones" className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Compras - Cotizar</h1>
            <p className="text-slate-500 text-sm">{requisiciones.length} pendientes</p>
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
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/50 text-left">
                <div className="flex justify-between mb-2">
                  <span className="font-mono text-cyan-400 text-sm">{req.folio}</span>
                  <span className={`px-2 py-0.5 rounded text-xs text-white ${getUrgencyBadge(req.required_date).color}`}>{getUrgencyBadge(req.required_date).text}</span>
                </div>
                <p className="text-white font-medium text-sm">{req.cost_center_name}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // === DETALLE ===
  const relevantSuppliers = getRelevantSuppliers();
  const urgency = getUrgencyBadge(selectedReq.required_date);

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-3">
        <button onClick={() => { setSelectedReq(null); setItems([]); setProveedoresIA([]); }} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
          <ArrowLeft className="w-4 h-4 text-slate-400" />
        </button>
        <span className="text-lg font-bold text-white">{selectedReq.folio}</span>
        <span className={`px-2 py-0.5 rounded text-xs text-white ${urgency.color}`}>{urgency.text}</span>
        <span className="text-slate-400 flex-1">{selectedReq.cost_center_name}</span>
        <span className="text-emerald-400 font-bold text-lg">${calculateTotal().toLocaleString()}</span>
      </div>

      {loadingItems ? (
        <div className="text-center py-10"><Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-400" /></div>
      ) : (
        <>
          {/* Proveedores */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                Proveedores Relevantes ({relevantSuppliers.length})
              </h3>
              <button onClick={buscarConARIA} disabled={buscandoIA}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-medium flex items-center gap-1.5">
                {buscandoIA ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {buscandoIA ? "..." : "Buscar + con ARIA"}
              </button>
              <Link href={`/dashboard/requisiciones/requisiciones/tramite/capturar?req=${selectedReq.id}`}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-medium flex items-center gap-1.5">
                <ShoppingCart className="w-3 h-3" />
                Capturar Cotizaciones
              </Link>
              <button onClick={solicitarCotizacion} disabled={solicitando || items.length === 0}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-50">
                {solicitando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                {solicitando ? "Enviando..." : "Solicitar Cotizacion"}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2">
              {relevantSuppliers.map(s => (
                <div key={s.id} className="p-2 rounded-lg bg-black/30 border border-white/10">
                  <p className="text-white font-medium text-xs truncate" title={s.name}>{s.name}</p>
                  <p className="text-slate-500 text-[10px]">{s.categories?.[0] || "General"}</p>
                  {s.phone && <p className="text-slate-400 text-[10px]">{s.phone}</p>}
                  <p className="text-cyan-400 text-[10px]">{s.credit_days ? `${s.credit_days}d` : "Contado"}</p>
                </div>
              ))}
            </div>

            {proveedoresIA.length > 0 && (
              <>
                <div className="flex items-center gap-2 my-2">
                  <div className="flex-1 h-px bg-cyan-500/30"></div>
                  <span className="text-cyan-400 text-[10px]"><Sparkles className="w-3 h-3 inline" /> ARIA ({proveedoresIA.length})</span>
                  <div className="flex-1 h-px bg-cyan-500/30"></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {proveedoresIA.map((p, i) => (
                    <div key={i} className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                      <p className="text-cyan-400 font-medium text-xs truncate">{p.nombre}</p>
                      {p.telefono && <p className="text-slate-400 text-[10px]">{p.telefono}</p>}
                      {p.especialidad && <p className="text-slate-500 text-[10px]">{p.especialidad}</p>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Resultado solicitud */}
          {resultadoSolicitud && (
            <div className={"p-3 rounded-xl border " + (resultadoSolicitud.error ? "bg-red-500/10 border-red-500/30" : "bg-emerald-500/10 border-emerald-500/30")}>
              {resultadoSolicitud.error ? (
                <p className="text-red-400 text-xs">{resultadoSolicitud.error}</p>
              ) : (
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-emerald-400 font-medium">Solicitud enviada</span>
                  <span className="text-white">Emails: {resultadoSolicitud.emailsSent}</span>
                  <span className="text-white">WhatsApp: {resultadoSolicitud.whatsappSent}</span>
                  <span className="text-slate-400">de {resultadoSolicitud.totalProveedores} proveedores</span>
                  {resultadoSolicitud.errors && <span className="text-amber-400">{resultadoSolicitud.errors.length} errores</span>}
                </div>
              )}
            </div>
          )}

          {/* === COMPARATIVA UNIFICADA === */}
          {(() => {
            // Obtener proveedores unicos ya capturados
            const capturedSuppliers: string[] = [];
            items.forEach(item => {
              (itemQuotes[item.id] || []).forEach(q => {
                if (q.supplier && !capturedSuppliers.includes(q.supplier)) {
                  capturedSuppliers.push(q.supplier);
                }
              });
            });
            // Rellenar hasta 5 columnas
            while (capturedSuppliers.length < 5) capturedSuppliers.push("");

            // Helper: set proveedor en columna para TODOS los productos
            const setColumnSupplier = (colIdx: number, supplierName: string) => {
              items.forEach(item => {
                updateQuote(item.id, colIdx, "supplier", supplierName);
              });
            };

            // Helper: set condicion en columna para TODOS los productos
            const setColumnField = (colIdx: number, field: "entrega" | "forma_pago" | "pdf_url" | "factura", value: string | boolean) => {
              items.forEach(item => {
                updateQuote(item.id, colIdx, field as any, value as any);
              });
            };

            // Calcular totales por columna
            const colTotals = capturedSuppliers.map((sup, colIdx) => {
              if (!sup) return 0;
              return items.reduce((sum, item) => {
                const q = (itemQuotes[item.id] || [])[colIdx];
                return sum + ((q && q.price > 0) ? q.price * item.quantity : 0);
              }, 0);
            });

            // Cobertura por columna
            const colCoverage = capturedSuppliers.map((sup, colIdx) => {
              if (!sup) return { filled: 0, total: items.length };
              const filled = items.filter(item => {
                const q = (itemQuotes[item.id] || [])[colIdx];
                return q && q.price > 0;
              }).length;
              return { filled, total: items.length };
            });

            const activeTotals = colTotals.filter(t => t > 0);
            const bestTotal = activeTotals.length > 0 ? Math.min(...activeTotals) : 0;

            // Obtener condiciones de la primera fila para cada columna (para mostrar en header)
            const getColCondition = (colIdx: number, field: string) => {
              if (items.length === 0) return "";
              const q = (itemQuotes[items[0].id] || [])[colIdx];
              if (!q) return "";
              return (q as any)[field] || "";
            };

            return (
              <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                {/* HEADER: Proveedores + condiciones */}
                <div className="grid gap-0" style={{gridTemplateColumns: `200px 70px repeat(${capturedSuppliers.length}, minmax(140px, 1fr))`}}>
                  {/* Esquina */}
                  <div className="p-2 bg-white/[0.03] border-b border-r border-white/10">
                    <span className="text-slate-500 text-[10px] uppercase font-semibold">Producto</span>
                  </div>
                  <div className="p-2 bg-white/[0.03] border-b border-r border-white/10 text-center">
                    <span className="text-slate-500 text-[10px] uppercase font-semibold">Cant.</span>
                  </div>
                  {/* Columnas proveedor */}
                  {capturedSuppliers.map((sup, colIdx) => {
                    const isActive = !!sup;
                    const isBest = isActive && colTotals[colIdx] === bestTotal && bestTotal > 0;
                    return (
                      <div key={colIdx} className={`p-2 border-b border-r border-white/10 space-y-1.5 ${isBest ? "bg-emerald-500/10" : "bg-white/[0.02]"}`}>
                        <select value={sup}
                          onChange={(e) => setColumnSupplier(colIdx, e.target.value)}
                          className={`w-full px-2 py-1.5 rounded text-[11px] font-semibold border ${isActive ? "bg-black/40 border-white/20 text-white" : "bg-black/20 border-white/10 text-slate-500"}`}>
                          <option value="">Proveedor {colIdx + 1}...</option>
                          {allSuppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                          {proveedoresIA.length > 0 && proveedoresIA.map((p, i) => <option key={`ia-${i}`} value={p.nombre}>{p.nombre}</option>)}
                        </select>
                        {isActive && (
                          <>
                            <div className="grid grid-cols-2 gap-1">
                              <select value={getColCondition(colIdx, "forma_pago") || "transferencia"}
                                onChange={(e) => setColumnField(colIdx, "forma_pago", e.target.value)}
                                className="px-1.5 py-1 rounded bg-black/40 border border-white/10 text-white text-[9px]">
                                <option value="transferencia">Transferencia</option>
                                <option value="efectivo">Efectivo</option>
                                <option value="cheque">Cheque</option>
                              </select>
                              <select value={getColCondition(colIdx, "pdf_url") || "contado"}
                                onChange={(e) => setColumnField(colIdx, "pdf_url", e.target.value)}
                                className="px-1.5 py-1 rounded bg-black/40 border border-white/10 text-white text-[9px]">
                                <option value="contado">Contado</option>
                                <option value="15 dias credito">15d credito</option>
                                <option value="30 dias credito">30d credito</option>
                                <option value="45 dias credito">45d credito</option>
                                <option value="60 dias credito">60d credito</option>
                                <option value="90 dias credito">90d credito</option>
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                              <select value={getColCondition(colIdx, "entrega") || ""}
                                onChange={(e) => setColumnField(colIdx, "entrega", e.target.value)}
                                className="px-1.5 py-1 rounded bg-black/40 border border-white/10 text-white text-[9px]">
                                <option value="">Entrega...</option>
                                <option value="Inmediata">Inmediata</option>
                                <option value="1-3 dias">1-3 dias</option>
                                <option value="4-7 dias">4-7 dias</option>
                                <option value="8-15 dias">8-15 dias</option>
                                <option value="+15 dias">+15 dias</option>
                              </select>
                              <label className="flex items-center gap-1 px-1.5 py-1 rounded bg-black/40 border border-white/10 text-[9px] text-slate-400 cursor-pointer">
                                <input type="checkbox" checked={getColCondition(colIdx, "factura") !== false}
                                  onChange={(e) => setColumnField(colIdx, "factura", e.target.checked)}
                                  className="w-3 h-3 rounded" />
                                <span className="text-white">Factura</span>
                              </label>
                            </div>
                            {isBest && <div className="text-center"><span className="text-emerald-400 text-[9px] font-bold">MEJOR PRECIO</span></div>}
                            <label className="flex items-center gap-1 px-1.5 py-1 rounded bg-black/40 border border-white/10 text-[9px] cursor-pointer">
                              <input type="checkbox" checked={columnMeta[colIdx]?.rebaja_iva || false}
                                onChange={(e) => updateColumnMeta(colIdx, "rebaja_iva", e.target.checked)}
                                className="w-3 h-3 rounded" />
                              <span className="text-amber-400">Rebaja IVA</span>
                            </label>
                            <input type="text" placeholder="Observaciones..."
                              value={columnMeta[colIdx]?.observaciones || ""}
                              onChange={(e) => updateColumnMeta(colIdx, "observaciones", e.target.value)}
                              className="w-full px-1.5 py-1 rounded bg-black/40 border border-white/10 text-white text-[9px] placeholder:text-slate-600" />
                          </>
                        )}
                      </div>
                    );
                  })}

                  {/* FILAS DE PRODUCTOS */}
                  {items.map((item, idx) => {
                    const itemPricesArr = capturedSuppliers.map((sup, colIdx) => {
                      const q = (itemQuotes[item.id] || [])[colIdx];
                      return (q && q.price > 0) ? q.price : 0;
                    }).filter(p => p > 0);
                    const bestItemPrice = itemPricesArr.length > 0 ? Math.min(...itemPricesArr) : 0;

                    return (
                      <React.Fragment key={item.id}>
                        <div className="px-3 py-2 border-b border-r border-white/5 flex items-center gap-2">
                          <span className="text-cyan-400 font-bold text-xs">{idx + 1}</span>
                          <div>
                            <p className="text-white text-xs font-medium leading-tight">{item.product_name}</p>
                            <p className="text-slate-600 text-[9px]">{item.category}</p>
                          </div>
                        </div>
                        <div className="px-2 py-2 border-b border-r border-white/5 flex items-center justify-center">
                          <span className="text-slate-400 text-xs">{item.quantity} {item.unit}</span>
                        </div>
                        {capturedSuppliers.map((sup, colIdx) => {
                          const q = (itemQuotes[item.id] || [])[colIdx];
                          const price = q ? q.price : 0;
                          const isCellBest = price > 0 && price === bestItemPrice;
                          const isColBest = colTotals[colIdx] === bestTotal && bestTotal > 0;
                          return (
                            <div key={colIdx} className={`px-2 py-1.5 border-b border-r border-white/5 flex items-center ${isColBest ? "bg-emerald-500/5" : ""}`}>
                              {sup ? (
                                <div className="w-full flex items-center gap-1">
                                  <span className="text-slate-500 text-[9px]">$</span>
                                  <input type="number" placeholder="0"
                                    value={price || ""}
                                    onChange={(e) => updateQuote(item.id, colIdx, "price", parseFloat(e.target.value) || 0)}
                                    className={`w-full px-1.5 py-1 rounded text-xs text-right border ${isCellBest ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold" : "bg-black/30 border-white/10 text-white"}`} />
                                </div>
                              ) : (
                                <span className="text-slate-700 text-xs w-full text-center">-</span>
                              )}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}

                  {/* FILA TOTAL */}
                  <div className="px-3 py-2.5 border-r border-white/10 bg-white/[0.03]">
                    <span className="text-white text-xs font-bold">TOTAL</span>
                  </div>
                  <div className="px-2 py-2.5 border-r border-white/10 bg-white/[0.03]"></div>
                  {capturedSuppliers.map((sup, colIdx) => {
                    const isBest = colTotals[colIdx] === bestTotal && bestTotal > 0 && sup;
                    const cov = colCoverage[colIdx];
                    return (
                      <div key={colIdx} className={`px-2 py-2 border-r border-white/10 text-center ${isBest ? "bg-emerald-500/10" : "bg-white/[0.03]"}`}>
                        {sup ? (
                          <div>
                            <span className={`text-sm font-bold ${isBest ? "text-emerald-400" : "text-white"}`}>
                              ${colTotals[colIdx].toLocaleString()}
                            </span>
                            <p className={`text-[9px] mt-0.5 ${cov.filled === cov.total ? "text-emerald-500" : "text-amber-500"}`}>
                              {cov.filled}/{cov.total} productos
                            </p>
                          </div>
                        ) : <span className="text-slate-700 text-xs">-</span>}
                      </div>
                    );
                  })}
                </div>

                {/* RANKING */}
                {activeTotals.length > 0 && (
                  <div className="p-3 border-t border-white/10 bg-white/[0.02]">
                    <div className="flex flex-wrap gap-3">
                      {capturedSuppliers
                        .map((sup, idx) => ({ sup, total: colTotals[idx], cov: colCoverage[idx], idx }))
                        .filter(x => x.sup && x.total > 0)
                        .sort((a, b) => a.total - b.total)
                        .map((x, rank) => (
                          <div key={x.idx} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${rank === 0 ? "bg-emerald-500/15 border border-emerald-500/30" : "bg-white/5 border border-white/10"}`}>
                            <span className={rank === 0 ? "text-emerald-400 font-bold" : "text-slate-400"}>
                              {rank === 0 ? "1ro" : rank === 1 ? "2do" : rank === 2 ? "3ro" : `${rank+1}to`}
                            </span>
                            <span className="text-white font-medium">{x.sup}</span>
                            <span className={rank === 0 ? "text-emerald-400 font-bold" : "text-slate-300"}>${x.total.toLocaleString()}</span>
                            <span className={`text-[9px] ${x.cov.filled === x.cov.total ? "text-emerald-500" : "text-amber-500"}`}>
                              {x.cov.filled}/{x.cov.total}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Footer */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <span className={`text-xs ${allItemsHaveMinQuotes() ? "text-emerald-400" : "text-amber-400"}`}>
              {allItemsHaveMinQuotes()
                ? `Minimo 3 cotizaciones por material (${totalQuotesCount()}/5)`
                : "Falta: minimo 3 cotizaciones por cada material"}
            </span>
            <div className="flex-1"></div>
            <button onClick={async () => {
              if (!selectedReq || !allItemsHaveMinQuotes()) return;
              setSending(true);
              try {
                const comparativa = items.map(item => ({
                  product_name: item.product_name,
                  quantity: item.quantity,
                  unit: item.unit,
                  quotes: getFilledQuotes(item.id)
                }));
                const ecRes = await fetch("/api/requisicion/enviar-comparativa", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                    requisition_id: selectedReq.id,
                    folio: selectedReq.folio,
                    obra: selectedReq.cost_center_name,
                    items_detail: items.map(item => ({
                      product_name: item.product_name,
                      quantity: item.quantity,
                      unit: item.unit
                    })),
                    suppliers: (() => {
                      const supMap: Record<string, {supplier: string; entrega: string; forma_pago: string; credito: string; factura: boolean; rebaja_iva: boolean; observaciones: string; items_prices: Record<string, number>}> = {};
                      items.forEach(item => {
                        (itemQuotes[item.id] || []).forEach((q, colIdx) => {
                          if (q.supplier && q.price > 0) {
                            if (!supMap[q.supplier]) {
                              supMap[q.supplier] = {
                                supplier: q.supplier,
                                entrega: q.entrega || "",
                                forma_pago: q.forma_pago || "transferencia",
                                credito: q.pdf_url || "contado",
                                factura: q.factura !== false,
                                rebaja_iva: columnMeta[colIdx]?.rebaja_iva || false,
                                observaciones: columnMeta[colIdx]?.observaciones || "",
                                items_prices: {}
                              };
                            }
                            supMap[q.supplier].items_prices[item.product_name] = q.price;
                          }
                        });
                      });
                      return Object.values(supMap);
                    })(),
                    items: items.map(i => i.product_name),
                    quotes: items.flatMap(item => getFilledQuotes(item.id).map(q => ({
                      supplier: q.supplier,
                      total: q.price * item.quantity,
                      credito: q.pdf_url || "contado",
                      entrega: q.entrega || "",
                      forma_pago: q.forma_pago || "transferencia",
                      factura: q.factura
                    }))),
                    user_email: localStorage.getItem("userEmail") || ""
                  })
                });
                if (!ecRes.ok) {
                  const errTxt = await ecRes.text().catch(() => "");
                  alert("Error enviando comparativa (" + ecRes.status + "): " + errTxt.slice(0, 250));
                  setSending(false);
                  return;
                }
                const ecJson = await ecRes.json().catch(() => ({}));
                alert("Comparativa enviada a Direccion (" + (ecJson.enviado_a || "ok") + ")");
                setSelectedReq(null); setItems([]); loadData();
              } catch { alert("Error al enviar"); }
              finally { setSending(false); }
            }} disabled={!allItemsHaveMinQuotes() || sending}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium flex items-center gap-2 disabled:opacity-50">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar Comparativa a Direccion
            </button>
          </div>
        </>
      )}
    </div>
  );
}
