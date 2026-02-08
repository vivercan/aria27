"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Search, Sparkles, Building2, Phone, Globe, MapPin, ExternalLink, Loader2, Package, CheckCircle2 } from "lucide-react";

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
  proveedores_bd: any[];
}

export default function CotizacionesIAPage() {
  const router = useRouter();
  const [requisiciones, setRequisiciones] = useState<Requisicion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<Requisicion | null>(null);
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
          requisicion_id: req.id
        })
      });

      const data = await res.json();

      if (data.success) {
        setResultado(data);
      } else {
        setError(data.error || "Error en la búsqueda");
      }
    } catch (e: any) {
      setError(e.message || "Error de conexión");
    } finally {
      setBuscando(false);
    }
  };

  const getUrgencyColor = (u: string) => {
    if (u === "critico") return "bg-red-500";
    if (u === "urgente") return "bg-amber-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-400" />
            Búsqueda Inteligente de Proveedores
          </h1>
          <p className="text-slate-400 text-sm">IA analiza productos y encuentra proveedores en Aguascalientes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de Requisiciones */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Requisiciones Pendientes de Cotizar</h2>

          {loading ? (
            <div className="text-center py-10 text-slate-400">Cargando...</div>
          ) : requisiciones.length === 0 ? (
            <div className="text-center py-10 text-slate-400 bg-white/5 rounded-xl">
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
                      ? "bg-blue-500/20 border-blue-500"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-mono text-sm text-blue-400">{req.folio}</span>
                      <p className="text-white font-medium">{req.cost_center_name}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs text-white ${getUrgencyColor(req.urgency)}`}>
                      {req.urgency?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
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
            <div className="text-center py-20 text-slate-400 bg-white/5 rounded-xl border border-dashed border-white/20">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Selecciona una requisición para buscar proveedores</p>
            </div>
          ) : buscando ? (
            <div className="text-center py-20 bg-white/5 rounded-xl">
              <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin text-amber-400" />
              <p className="text-white font-medium">Analizando productos...</p>
              <p className="text-slate-400 text-sm">Buscando proveedores en Aguascalientes</p>
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
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                <h3 className="text-amber-400 font-medium mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Análisis IA
                </h3>
                <p className="text-white text-sm">{resultado.analisis}</p>
                <p className="text-slate-400 text-xs mt-2">Categoría: {resultado.categoria_principal}</p>
              </div>

              {/* Recomendación */}
              {resultado.recomendacion && (
                <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30">
                  <p className="text-green-400 text-sm">💡 {resultado.recomendacion}</p>
                </div>
              )}

              {/* Proveedores Internos */}
              {resultado.proveedores_internos?.length > 0 && (
                <div>
                  <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    Proveedores Registrados
                  </h3>
                  <div className="space-y-2">
                    {resultado.proveedores_internos.map((p, i) => (
                      <div key={i} className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">{p.nombre}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            p.compatibilidad === "alta" ? "bg-green-500 text-white" :
                            p.compatibilidad === "media" ? "bg-amber-500 text-white" :
                            "bg-slate-500 text-white"
                          }`}>
                            {p.compatibilidad}
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs mt-1">{p.razon}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Proveedores Web */}
              {resultado.proveedores_web?.length > 0 && (
                <div>
                  <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-400" />
                    Encontrados en Internet (Aguascalientes)
                  </h3>
                  <div className="space-y-3">
                    {resultado.proveedores_web.map((p, i) => (
                      <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="text-white font-medium flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-blue-400" />
                          {p.nombre}
                        </h4>
                        <div className="mt-2 space-y-1 text-sm">
                          {p.direccion && (
                            <div className="flex items-center gap-2 text-slate-400">
                              <MapPin className="w-3 h-3" />
                              <span>{p.direccion}</span>
                            </div>
                          )}
                          {p.telefono && (
                            <div className="flex items-center gap-2 text-slate-400">
                              <Phone className="w-3 h-3" />
                              <a href={`tel:${p.telefono}`} className="hover:text-white">{p.telefono}</a>
                            </div>
                          )}
                          {p.sitio_web && (
                            <div className="flex items-center gap-2 text-blue-400">
                              <ExternalLink className="w-3 h-3" />
                              <a href={p.sitio_web} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                                {p.sitio_web}
                              </a>
                            </div>
                          )}
                        </div>
                        {p.productos_relacionados && (
                          <p className="mt-2 text-xs text-slate-500">
                            Productos: {p.productos_relacionados}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista de productos de la requisición */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h3 className="text-slate-400 text-sm mb-2">Productos solicitados:</h3>
                <ul className="text-xs text-slate-500 space-y-1">
                  {selectedReq.items?.map((m, i) => (
                    <li key={i}>• {m.product_name} ({m.quantity} {m.unit})</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
