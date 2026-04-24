"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Sparkles, Building2, Phone, Globe, MapPin, ExternalLink, Loader2, Package, CheckCircle2, Save, X, Plus, DollarSign } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";

interface ReqItem {
  id: string;
  product_name: string;
  sku: string;
  unit: string;
  quantity: number;
  category: string;
}

interface Requisicion {
  id: string;
  folio: string;
  cost_center_name: string;
  urgency: string;
  status: string;
  created_at: string;
  items: ReqItem[];
}

interface ProveedorInterno {
  id: string;
  nombre: string;
  compatibilidad: string;
  razon: string;
}

interface ProveedorWeb {
  nombre: string;
  direccion: string;
  telefono: string;
  sitio_web: string;
  productos_relacionados: string;
  fuente: string;
}

interface ResultadoBusqueda {
  success: boolean;
  analisis: string;
  categoria_principal: string;
  proveedores_internos: ProveedorInterno[];
  proveedores_web: ProveedorWeb[];
  recomendacion: string;
  proveedores_bd: Record<string, unknown>[];
}

export default function CotizacionesIAPage() {
  const { msg, flash, clear } = useFlashMessage();
  const [requisiciones, setRequisiciones] = useState<Requisicion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<Requisicion | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [savingQuote, setSavingQuote] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ requisicion_id: "", supplier_name: "", total: "", notas: "", vigencia_dias: "15" });
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoBusqueda | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadRequisiciones();
  }, []);

  const loadRequisiciones = async () => {
    const { data: reqs } = await supabase
      .from("Requisiciones")
      .select("id, folio, cost_center_name, urgency, status, created_at")
      .in("status", ["VALIDADA", "APROBADA", "EN_COTIZACION"])
      .order("created_at", { ascending: false });

    if (!reqs || reqs.length === 0) {
      setRequisiciones([]);
      setLoading(false);
      return;
    }

    const reqIds = reqs.map(r => r.id);
    const { data: allItems } = await supabase
      .from("requisition_items")
      .select("id, requisition_id, product_name, sku, unit, quantity, category")
      .in("requisition_id", reqIds);

    const mapped = reqs.map(r => ({
      ...r,
      items: (allItems || []).filter(i => i.requisition_id === r.id)
    }));

    setRequisiciones(mapped as Requisicion[]);
    setLoading(false);
  };

  const buscarProveedores = async (req: Requisicion) => {
    setSelectedReq(req);
    setBuscando(true);
    setError("");
    setResultado(null);

    try {
      const productos = req.items.map(i => ({
        product_name: i.product_name,
        quantity: i.quantity,
        unit: i.unit,
        category: i.category
      }));

      const res = await fetch("/api/proveedores/buscar-inteligente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productos,
          requisicion_id: req.id,
          user_email: localStorage.getItem("userEmail") || ""
        })
      });

      const data = await res.json().catch(() => ({}));

      if (data.success) {
        setResultado(data);
      } else {
        setError(data.error || "Error en la búsqueda");
      }
    } catch (e: unknown) {
      setError((e as {message?: string})?.message || "Error de conexión");
    } finally {
      setBuscando(false);
    }
  };


  const handleSaveQuote = async () => {
    if (!quoteForm.requisicion_id || !quoteForm.supplier_name || !quoteForm.total) return;
    setSavingQuote(true);
    const { error } = await supabase.from("quotations").insert({
      requisition_id: quoteForm.requisicion_id,
      supplier_name: quoteForm.supplier_name,
      total: parseFloat(quoteForm.total),
      notes: quoteForm.notas || null,
      vigencia_dias: parseInt(quoteForm.vigencia_dias) || 15,
      estado: "recibida",
      fecha: new Date().toISOString().split("T")[0]
    });
    setSavingQuote(false);
    if (error) { flash("err", "Error al guardar cotización: " + (error as {message?: string})?.message || "Error desconocido"); return; }
    setShowQuoteModal(false);
    setQuoteForm({ requisicion_id: "", supplier_name: "", total: "", notas: "", vigencia_dias: "15" });
    loadRequisiciones();
  };

  const getUrgencyColor = (u: string) => {
    if (u === "critico") return "bg-red-500";
    if (u === "urgente") return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <div className="aria-bg-canon max-w-7xl mx-auto space-y-6">
      <FlashBanner msg={msg} className="mx-0 mb-2" />
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-slate-950 via-slate-950/95 to-transparent pb-4 flex items-center gap-4">
        <AriaBackButton href="/dashboard/requisiciones" />
        <button onClick={() => setShowQuoteModal(true)} className="flex items-center gap-2 px-4 py-2 bg-aria-accent-bg text-aria-accent rounded-lg hover:bg-aria-accent/30 text-sm ml-auto"><Plus className="w-4 h-4" /> Registrar Cotización</button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-400" />
            Búsqueda Inteligente de Proveedores
          </h1>
          <p className="text-[#7f93b0] text-sm">IA analiza productos y encuentra proveedores en Aguascalientes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de Requisiciones */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Requisiciones Pendientes de Cotizar</h2>

          {loading ? (
            <div className="text-center py-10 text-[#7f93b0]">Cargando...</div>
          ) : requisiciones.length === 0 ? (
            <div className="text-center py-10 text-[#7f93b0] bg-white/[0.04] rounded-xl">
              No hay requisiciones pendientes
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {requisiciones.map(req => (
                <div
                  key={req.id}
                  onClick={() => buscarProveedores(req)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedReq?.id === req.id
                      ? "bg-aria-primary-light border-aria-primary"
                      : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-mono text-sm text-aria-accent">{req.folio}</span>
                      <p className="text-white font-medium">{req.cost_center_name}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs text-white ${getUrgencyColor(req.urgency)}`}>
                      {req.urgency?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#7f93b0]">
                    <Package className="w-4 h-4" />
                    {req.items?.length || 0} productos
                  </div>
                  {selectedReq?.id === req.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); buscarProveedores(req); }}
                      disabled={buscando}
                      className="mt-3 w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium flex items-center justify-center gap-2"
                    >
                      {buscando ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Buscando con IA...</>
                      ) : (
                        <><Sparkles className="w-4 h-4" /> Buscar Proveedores</>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resultados de IA */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Proveedores Sugeridos</h2>

          {!selectedReq ? (
            <div className="text-center py-20 text-[#7f93b0] bg-white/[0.04] rounded-xl border border-dashed border-white/[0.12]">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Selecciona una requisición para buscar proveedores</p>
            </div>
          ) : buscando ? (
            <div className="text-center py-20 bg-white/[0.04] rounded-xl">
              <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin text-aria-accent" />
              <p className="text-white font-medium">Analizando productos...</p>
              <p className="text-[#7f93b0] text-sm">Buscando proveedores en Aguascalientes</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-500/20 rounded-xl border border-red-500/50 text-center">
              <p className="text-red-400">{error}</p>
              <button onClick={() => buscarProveedores(selectedReq)} className="mt-3 text-sm text-white underline">
                Reintentar
              </button>
            </div>
          ) : resultado ? (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {/* Análisis */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                <h3 className="text-amber-400 font-medium mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Análisis IA
                </h3>
                <p className="text-white text-sm">{resultado.analisis}</p>
                <p className="text-[#7f93b0] text-xs mt-2">Categoría: {resultado.categoria_principal}</p>
              </div>

              {/* Recomendación */}
              {resultado.recomendacion && (
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.08]">
                  <p className="text-aria-accent text-sm">💡 {resultado.recomendacion}</p>
                </div>
              )}

              {/* Proveedores Internos */}
              {resultado.proveedores_internos?.length > 0 && (
                <div>
                  <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-aria-accent" />
                    Proveedores Registrados
                  </h3>
                  <div className="space-y-2">
                    {resultado.proveedores_internos.map((p, i) => (
                      <div key={i} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.08]">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">{p.nombre}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            p.compatibilidad === "alta" ? "bg-emerald-500 text-white" :
                            p.compatibilidad === "media" ? "bg-amber-500 text-white" :
                            "bg-slate-500 text-white"
                          }`}>
                            {p.compatibilidad}
                          </span>
                        </div>
                        <p className="text-[#7f93b0] text-xs mt-1">{p.razon}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Proveedores Web */}
              {resultado.proveedores_web?.length > 0 && (
                <div>
                  <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-aria-accent" />
                    Encontrados en Internet (Aguascalientes)
                  </h3>
                  <div className="space-y-3">
                    {resultado.proveedores_web.map((p, i) => (
                      <div key={i} className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                        <h4 className="text-white font-medium flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-aria-accent" />
                          {p.nombre}
                        </h4>
                        <div className="mt-2 space-y-1 text-sm">
                          {p.direccion && (
                            <div className="flex items-center gap-2 text-[#7f93b0]">
                              <MapPin className="w-3 h-3" />
                              <span>{p.direccion}</span>
                            </div>
                          )}
                          {p.telefono && (
                            <div className="flex items-center gap-2 text-[#7f93b0]">
                              <Phone className="w-3 h-3" />
                              <a href={`tel:${p.telefono}`} className="hover:text-white">{p.telefono}</a>
                            </div>
                          )}
                          {p.sitio_web && (
                            <div className="flex items-center gap-2 text-aria-accent">
                              <ExternalLink className="w-3 h-3" />
                              <a href={p.sitio_web} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                                {p.sitio_web}
                              </a>
                            </div>
                          )}
                        </div>
                        {p.productos_relacionados && (
                          <p className="mt-2 text-xs text-[#4a6080]">
                            Productos: {p.productos_relacionados}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista de productos de la requisición */}
              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <h3 className="text-[#7f93b0] text-sm mb-2">Productos solicitados:</h3>
                <ul className="text-xs text-[#4a6080] space-y-1">
                  {selectedReq.items?.map((m, i) => (
                    <li key={i}>• {m.product_name} ({m.quantity} {m.unit})</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {showQuoteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#0c1d38] rounded-2xl p-6 w-full max-w-md border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Registrar Cotización</h3>
              <button onClick={() => setShowQuoteModal(false)}><X className="w-5 h-5 text-[#7f93b0]" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#7f93b0]">Requisición *</label>
                <select value={quoteForm.requisicion_id} onChange={e => setQuoteForm({...quoteForm, requisicion_id: e.target.value})} className="w-full bg-[#0f2448] text-white rounded-lg px-3 py-2 text-sm border border-white/[0.08]">
                  <option value="">Seleccionar...</option>
                  {requisiciones.map(r => <option key={r.id} value={r.id}>{r.folio}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#7f93b0]">Proveedor *</label>
                <input type="text" value={quoteForm.supplier_name} onChange={e => setQuoteForm({...quoteForm, supplier_name: e.target.value})} className="w-full bg-[#0f2448] text-white rounded-lg px-3 py-2 text-sm border border-white/[0.08]" placeholder="Nombre del proveedor" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#7f93b0]">Total *</label>
                  <input type="number" min="0" value={quoteForm.total} onChange={e => setQuoteForm({...quoteForm, total: e.target.value})} className="w-full bg-[#0f2448] text-white rounded-lg px-3 py-2 text-sm border border-white/[0.08]" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-xs text-[#7f93b0]">Vigencia (días)</label>
                  <input type="number" min="0" value={quoteForm.vigencia_dias} onChange={e => setQuoteForm({...quoteForm, vigencia_dias: e.target.value})} className="w-full bg-[#0f2448] text-white rounded-lg px-3 py-2 text-sm border border-white/[0.08]" />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#7f93b0]">Notas</label>
                <textarea value={quoteForm.notas} onChange={e => setQuoteForm({...quoteForm, notas: e.target.value})} rows={2} className="w-full bg-[#0f2448] text-white rounded-lg px-3 py-2 text-sm border border-white/[0.08]" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowQuoteModal(false)} className="px-4 py-2 text-sm text-[#7f93b0] hover:text-white">Cancelar</button>
              <button onClick={handleSaveQuote} disabled={savingQuote || !quoteForm.requisicion_id || !quoteForm.supplier_name || !quoteForm.total} className="flex items-center gap-2 px-4 py-2 bg-aria-accent text-white rounded-lg text-sm hover:bg-aria-accent/80 disabled:opacity-50">
                {savingQuote ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
