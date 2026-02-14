"use client";
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
        }),
      });
      const data = await res.json();
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
        await supabase.from("requisition_items").update({
          selected_price: prices[item.id]?.price || 0,
          selected_supplier: prices[item.id]?.supplier || ""
        }).eq("id", item.id);
      }
      await supabase.from("Requisiciones").update({ purchase_status: "COTIZADO" }).eq("id", selectedReq.id);

      await fetch("/api/requisicion/authorize-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requisition: selectedReq,
          items: items.map(item => ({ ...item, selected_price: prices[item.id]?.price, selected_supplier: prices[item.id]?.supplier })),
          total: calculateTotal(),
          token: selectedReq.authorization_comments
        })
      });

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
        <div className="text-center py-10"><Loader2 className="w-8 h-8 mx-auto animate-spin text-cyan-400" /></div>
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
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-medium flex items-center gap-1.5">
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

          {/* Tabla con 5 cotizaciones por material */}
          <div className="space-y-3">
            {items.map((item, idx) => {
              const filled = getFilledQuotes(item.id).length;
              const quotes = itemQuotes[item.id] || Array.from({length: 5}, () => ({supplier: "", price: 0, entrega: "", forma_pago: "transferencia", factura: true, pdf_url: ""}));
              const pricesArr = quotes.filter(q => q.price > 0).map(q => q.price);
              const bestPrice = pricesArr.length > 0 ? Math.min(...pricesArr) : 0;
              return (
                <div key={item.id} className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-white/[0.03]">
                    <div className="flex items-center gap-3">
                      <span className="text-cyan-400 font-bold text-sm">{idx + 1}</span>
                      <div>
                        <p className="text-white text-sm font-medium">{item.product_name}</p>
                        <p className="text-slate-500 text-[10px]">{item.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white text-sm">{item.quantity} {item.unit}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${filled >= 5 ? "bg-emerald-500/20 text-emerald-400" : filled >= 3 ? "bg-blue-500/20 text-blue-400" : "bg-amber-500/20 text-amber-400"}`}>
                        {filled}/5 cotizaciones
                      </span>
                    </div>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-slate-500 text-[10px] bg-white/[0.02]">
                        <th className="px-3 py-1.5 w-8">#</th>
                        <th className="px-3 py-1.5">Proveedor</th>
                        <th className="px-3 py-1.5 w-32 text-right">Precio Unit.</th>
                        <th className="px-3 py-1.5 w-28 text-right">Subtotal</th>
                        <th className="px-3 py-1.5 w-16 text-center">Mejor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotes.map((q, qIdx) => (
                        <tr key={qIdx} className="border-t border-white/5">
                          <td className="px-3 py-1.5 text-slate-500 text-xs">{qIdx + 1}</td>
                          <td className="px-3 py-1.5">
                            <select value={q.supplier} onChange={(e) => updateQuote(item.id, qIdx, "supplier", e.target.value)}
                              className="w-full px-2 py-1 rounded bg-black/30 border border-white/10 text-white text-xs">
                              <option value="">Seleccionar proveedor...</option>
                              <optgroup label="Todos los proveedores">
                                {allSuppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                              </optgroup>
                              {proveedoresIA.length > 0 && (
                                <optgroup label="ARIA">
                                  {proveedoresIA.map((p, i) => <option key={`ia-${i}`} value={p.nombre}>{p.nombre}</option>)}
                                </optgroup>
                              )}
                            </select>
                          </td>
                          <td className="px-3 py-1.5">
                            <input type="number" placeholder="$0" value={q.price || ""}
                              onChange={(e) => updateQuote(item.id, qIdx, "price", parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 rounded bg-black/30 border border-white/10 text-white text-xs text-right" />
                          </td>
                          <td className="px-3 py-1.5 text-right text-slate-300 text-xs">
                            {q.price > 0 ? `$${(q.price * item.quantity).toLocaleString()}` : ""}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            {q.price > 0 && bestPrice > 0 && q.price === bestPrice && (
                              <span className="text-emerald-400 text-xs">★</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

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
                await fetch("/api/requisicion/enviar-comparativa", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    requisition_id: selectedReq.id,
                    folio: selectedReq.folio,
                    obra: selectedReq.cost_center_name,
                    items: items.map(i => i.product_name),
                    quotes: items.flatMap(item => getFilledQuotes(item.id).map(q => ({
                      supplier: q.supplier,
                      total: q.price * item.quantity,
                      credito: 0,
                      entrega: 0
                    })))
                  })
                });
                alert("Comparativa enviada a Direccion");
                setSelectedReq(null); setItems([]); loadData();
              } catch { alert("Error al enviar"); }
              finally { setSending(false); }
            }} disabled={!allItemsHaveMinQuotes() || sending}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium flex items-center gap-2 disabled:opacity-50">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar Comparativa a Direccion
            </button>
          </div>
        </>
      )}
    </div>
  );
}

