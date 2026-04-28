"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AriaBackButton from "@/components/AriaBackButton";
import { History, Search, Eye, Loader2, Building2, Calendar, DollarSign } from "lucide-react";

interface ComparativaHist {
  id: string;
  folio: string;
  cost_center_name: string;
  status: string;
  proveedor: string | null;
  monto: number | null;
  created_at: string;
  authorized_at: string | null;
  cotizacion_data: { quotes?: Array<{ supplier?: string; subtotal?: number; iva?: number; tax_rate?: number; total?: number }>, items?: string[] } | null;
}

export default function HistorialComparativasPage() {
  const [items, setItems] = useState<ComparativaHist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroEstatus, setFiltroEstatus] = useState("TODAS");
  const [detalle, setDetalle] = useState<ComparativaHist | null>(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const { data, error } = await supabase
      .from("requisitions")
      .select("id, folio, cost_center_name, status, proveedor, monto, created_at, authorized_at, cotizacion_data")
      .not("cotizacion_data", "is", null)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) console.error(error);
    setItems((data || []).filter((r: ComparativaHist) => r.cotizacion_data?.quotes?.length));
    setLoading(false);
  }

  const filtrados = items.filter(it => {
    const s = search.toLowerCase();
    const matchSearch = !s || it.folio.toLowerCase().includes(s) || (it.cost_center_name || "").toLowerCase().includes(s) || (it.proveedor || "").toLowerCase().includes(s);
    const matchStatus = filtroEstatus === "TODAS" || it.status === filtroEstatus;
    return matchSearch && matchStatus;
  });

  const fmtMoney = (n: number | null) => n != null ? `$ ${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "-";
  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "-";

  return (
    <div className="aria-bg-canon h-full overflow-y-auto p-6 pb-12 space-y-5">
      <div className="flex items-center gap-3">
        <AriaBackButton href="/dashboard/requisiciones/compras" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="w-7 h-7 text-aria-accent" /> Historial de Comparativas
          </h1>
          <p className="text-xs text-[#7f93b0]">Resguardo historico de comparativas enviadas a Direccion para autorizar.</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7f93b0]" />
          <input type="text" placeholder="Buscar por folio, obra o proveedor..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0c1d38]/50 border border-white/[0.08] rounded-lg text-white placeholder-[#4a6080] focus:outline-none focus:border-aria-primary" />
        </div>
        <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}
          className="px-4 py-2 bg-[#0c1d38]/50 border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-aria-primary">
          <option value="TODAS">Todos los estatus</option>
          <option value="EN_AUTORIZACION">En Autorizacion</option>
          <option value="EN_COTIZACION">En Cotizacion (volvio)</option>
          <option value="OC_GENERADA">OC Generada</option>
          <option value="RECHAZADA">Rechazada</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Stat label="Total" value={items.length} accent="text-white" />
        <Stat label="OC Generadas" value={items.filter(i => i.status === "OC_GENERADA").length} accent="text-emerald-300" />
        <Stat label="En Autorizacion" value={items.filter(i => i.status === "EN_AUTORIZACION").length} accent="text-amber-300" />
        <Stat label="Rechazadas" value={items.filter(i => i.status === "RECHAZADA" || i.status === "RECHAZADA_DIRECCION").length} accent="text-rose-300" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-aria-accent" /></div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-12 text-[#7f93b0]">No hay comparativas que mostrar.</div>
      ) : (
        <div className="rounded-xl bg-[#0c1d38]/50 border border-white/[0.05] overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-[rgba(4,8,16,0.98)]">
              <tr>
                <th className="px-3 py-3 text-left text-[#c9d8ed]">Folio</th>
                <th className="px-3 py-3 text-left text-[#c9d8ed]">Obra</th>
                <th className="px-3 py-3 text-center text-[#c9d8ed]">Cotizaciones</th>
                <th className="px-3 py-3 text-left text-[#c9d8ed]">Mejor / Elegido</th>
                <th className="px-3 py-3 text-right text-[#c9d8ed]">Monto</th>
                <th className="px-3 py-3 text-left text-[#c9d8ed]">Fecha</th>
                <th className="px-3 py-3 text-center text-[#c9d8ed]">Estatus</th>
                <th className="px-3 py-3 text-center text-[#c9d8ed]">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtrados.map(it => {
                const quotes = it.cotizacion_data?.quotes || [];
                const mejor = quotes.length ? quotes.reduce((m, q) => (q.total ?? Infinity) < (m.total ?? Infinity) ? q : m, quotes[0]) : null;
                return (
                  <tr key={it.id} className="hover:bg-white/[0.04]">
                    <td className="px-3 py-2 text-white font-mono">{it.folio}</td>
                    <td className="px-3 py-2 text-[#c9d8ed]">{it.cost_center_name}</td>
                    <td className="px-3 py-2 text-center text-white">{quotes.length}</td>
                    <td className="px-3 py-2 text-[#c9d8ed]">{it.proveedor || mejor?.supplier || "-"}</td>
                    <td className="px-3 py-2 text-right text-aria-accent font-medium">{fmtMoney(it.monto || mejor?.total || null)}</td>
                    <td className="px-3 py-2 text-[#7f93b0]">{fmtDate(it.created_at)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        it.status === "OC_GENERADA" ? "bg-emerald-500/20 text-aria-accent" :
                        it.status === "EN_AUTORIZACION" ? "bg-amber-500/20 text-amber-300" :
                        it.status?.startsWith("RECHAZADA") ? "bg-rose-500/20 text-rose-300" :
                        "bg-slate-500/20 text-[#c9d8ed]"
                      }`}>{(it.status || "").replace("_", " ")}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => setDetalle(it)} className="p-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-aria-accent rounded">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* DETALLE MODAL */}
      {detalle && (
        <div onClick={() => setDetalle(null)} className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6 cursor-zoom-out">
          <div onClick={e => e.stopPropagation()} className="bg-[#0c1d38] border border-white/[0.08] rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto cursor-default">
            <h2 className="text-xl font-bold text-white mb-4">Detalle {detalle.folio}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm mb-5">
              <div><span className="text-[#7f93b0]">Obra:</span> <span className="text-white">{detalle.cost_center_name}</span></div>
              <div><span className="text-[#7f93b0]">Estatus:</span> <span className="text-white">{detalle.status}</span></div>
              <div><span className="text-[#7f93b0]">Proveedor elegido:</span> <span className="text-white">{detalle.proveedor || "-"}</span></div>
              <div><span className="text-[#7f93b0]">Monto:</span> <span className="text-aria-accent font-bold">{fmtMoney(detalle.monto)}</span></div>
              <div><span className="text-[#7f93b0]">Generada:</span> <span className="text-white">{fmtDate(detalle.created_at)}</span></div>
              <div><span className="text-[#7f93b0]">Autorizada:</span> <span className="text-white">{fmtDate(detalle.authorized_at)}</span></div>
            </div>
            <h3 className="text-sm font-semibold text-aria-accent mb-2">Items cotizados</h3>
            <ul className="text-xs text-[#c9d8ed] space-y-1 mb-4">
              {(detalle.cotizacion_data?.items || []).map((it: string, i: number) => (
                <li key={i} className="px-3 py-2 bg-black/30 rounded">{it}</li>
              ))}
            </ul>
            <h3 className="text-sm font-semibold text-aria-accent mb-2">Cotizaciones recibidas</h3>
            <table className="w-full text-xs mb-4">
              <thead className="bg-black/30">
                <tr>
                  <th className="px-2 py-1 text-left text-[#7f93b0]">Proveedor</th>
                  <th className="px-2 py-1 text-right text-[#7f93b0]">Subt s/IVA</th>
                  <th className="px-2 py-1 text-center text-[#7f93b0]">IVA %</th>
                  <th className="px-2 py-1 text-right text-[#7f93b0]">IVA $</th>
                  <th className="px-2 py-1 text-right text-[#7f93b0]">Total c/IVA</th>
                  <th className="px-2 py-1 text-center text-[#7f93b0]">Marca</th>
                </tr>
              </thead>
              <tbody>
                {(detalle.cotizacion_data?.quotes || []).map((q, i: number) => {
                  const mejorTotal = Math.min(...(detalle.cotizacion_data?.quotes || []).map(x => x.total ?? Infinity));
                  const isMejor = (q.total ?? Infinity) === mejorTotal;
                  const isElegido = q.supplier === detalle.proveedor;
                  const tasa = Number(q.tax_rate ?? 16);
                  const tasaLabel = tasa === 0 ? "0% (Nota)" : tasa === 8 ? "8% Frontera" : `${tasa}%`;
                  return (
                    <tr key={i} className="border-t border-white/[0.05]">
                      <td className="px-2 py-1 text-white">{q.supplier}</td>
                      <td className="px-2 py-1 text-right text-[#c9d8ed]">{fmtMoney(q.subtotal ?? null)}</td>
                      <td className="px-2 py-1 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${tasa === 0 ? "bg-slate-500/30 text-slate-300" : tasa === 8 ? "bg-sky-500/30 text-sky-300" : "bg-aria-primary-light text-aria-accent"}`}>{tasaLabel}</span>
                      </td>
                      <td className="px-2 py-1 text-right text-[#c9d8ed]">{fmtMoney(q.iva ?? null)}</td>
                      <td className="px-2 py-1 text-right text-aria-accent font-medium">{fmtMoney(q.total ?? null)}</td>
                      <td className="px-2 py-1 text-center">
                        {isElegido && <span className="px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 text-[10px]">ELEGIDO</span>}
                        {!isElegido && isMejor && <span className="px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 text-[10px]">MEJOR</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button onClick={() => setDetalle(null)} className="w-full px-4 py-2 bg-aria-primary-light hover:bg-aria-primary-hover/30 text-aria-accent rounded-lg">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl bg-[#0c1d38]/50 border border-white/[0.05] p-4">
      <div className="text-xs text-[#7f93b0] uppercase">{label}</div>
      <div className={`text-2xl font-bold ${accent}`}>{value}</div>
    </div>
  );
}
