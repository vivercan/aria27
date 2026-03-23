"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, DollarSign, Clock, CheckCircle2, AlertCircle, Search, Filter, CreditCard, Building2, Calendar, Hash } from "lucide-react";

interface PurchaseOrder {
  id: string;
  folio: string;
  requisition_folio: string;
  supplier_name: string;
  total: number;
  status: string;
  created_at: string;
  obra_nombre: string;
  pagado: number;
  saldo: number;
}

export default function PagosPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("TODOS");
  const [stats, setStats] = useState({ total: 0, pagado: 0, pendiente: 0, ordenes: 0 });
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [pagoOcId, setPagoOcId] = useState<string | null>(null);
  const [pagoMonto, setPagoMonto] = useState("");
  const [pagoMetodo, setPagoMetodo] = useState("Transferencia");
  const [pagoReferencia, setPagoReferencia] = useState("");
  const [pagoLoading, setPagoLoading] = useState(false);
  const [pagoSuccess, setPagoSuccess] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: ocs, error } = await supabase
        .from("purchase_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const processed = (ocs || []).map((oc: any) => {
        const pagado = oc.monto_pagado || 0;
        const total = oc.total || 0;
        return {
          ...oc,
          pagado,
          saldo: total - pagado,
        };
      });

      setOrders(processed);

      const totalSum = processed.reduce((s: number, o: any) => s + (o.total || 0), 0);
      const pagadoSum = processed.reduce((s: number, o: any) => s + (o.pagado || 0), 0);
      setStats({
        total: totalSum,
        pagado: pagadoSum,
        pendiente: totalSum - pagadoSum,
        ordenes: processed.length,
      });
    } catch (e) {
      console.error("Error cargando pagos:", e);
    } finally {
      setLoading(false);
    }
  }

  function abrirPagoModal(ocId: string) {
    setPagoOcId(ocId);
    setPagoMonto("");
    setPagoMetodo("Transferencia");
    setPagoReferencia("");
    setPagoSuccess("");
    setShowPagoModal(true);
  }

  async function registrarPago() {
    if (!pagoOcId) return;
    const monto = parseFloat(pagoMonto);
    if (isNaN(monto) || monto <= 0) return;

    setPagoLoading(true);
    const oc = orders.find(o => o.id === pagoOcId);
    if (!oc) { setPagoLoading(false); return; }

    const nuevoPagado = (oc.pagado || 0) + monto;
    const nuevoStatus = nuevoPagado >= oc.total ? "PAGADA" : "PAGO_PARCIAL";

    const { error } = await supabase
      .from("purchase_orders")
      .update({
        monto_pagado: nuevoPagado,
        status: nuevoStatus,
        ultimo_pago_fecha: new Date().toISOString(),
        ultimo_pago_metodo: pagoMetodo,
        ultimo_pago_referencia: pagoReferencia,
      })
      .eq("id", pagoOcId);

    setPagoLoading(false);
    if (error) {
      setPagoSuccess("Error: " + error.message);
    } else {
      setPagoSuccess(`Pago de $${monto.toLocaleString()} registrado`);
      loadData();
      setTimeout(() => { setShowPagoModal(false); setPagoSuccess(""); }, 1500);
    }
  }

  const filtered = orders.filter(o => {
    const matchSearch = !search || 
      o.folio?.toLowerCase().includes(search.toLowerCase()) ||
      o.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.obra_nombre?.toLowerCase().includes(search.toLowerCase());
    
    const matchStatus = filterStatus === "TODOS" || 
      (filterStatus === "PENDIENTE" && (!o.pagado || o.pagado === 0)) ||
      (filterStatus === "PARCIAL" && o.pagado > 0 && o.pagado < o.total) ||
      (filterStatus === "PAGADA" && o.pagado >= o.total);
    
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (oc: PurchaseOrder) => {
    if (oc.pagado >= oc.total && oc.total > 0) return { label: "PAGADA", color: "bg-emerald-500/20 text-emerald-400" };
    if (oc.pagado > 0) return { label: "PARCIAL", color: "bg-amber-500/20 text-amber-400" };
    return { label: "PENDIENTE", color: "bg-red-500/20 text-red-400" };
  };

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
        <div className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></div>
        <span className="text-sm font-medium">Regresar</span>
      </button>

      <div>
        <h1 className="text-2xl font-bold text-white">Control de Pagos</h1>
        <p className="text-slate-400 text-sm">Seguimiento de pagos a proveedores por órdenes de compra</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total OCs", value: `$${stats.total.toLocaleString()}`, icon: DollarSign, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Pagado", value: `$${stats.pagado.toLocaleString()}`, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Pendiente", value: `$${stats.pendiente.toLocaleString()}`, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Órdenes", value: stats.ordenes, icon: Hash, color: "text-violet-400", bg: "bg-violet-500/10" },
        ].map((s, i) => (
          <div key={i} className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-2`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
            <p className="text-xl font-bold text-white">{loading ? "..." : s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por folio, proveedor u obra..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none" />
        </div>
        <div className="flex gap-2">
          {["TODOS", "PENDIENTE", "PARCIAL", "PAGADA"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === s ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <tr className="text-slate-400 text-xs uppercase">
                <th className="text-left p-3">OC</th>
                <th className="text-left p-3">Proveedor</th>
                <th className="text-left p-3">Obra</th>
                <th className="text-right p-3">Total</th>
                <th className="text-right p-3">Pagado</th>
                <th className="text-right p-3">Saldo</th>
                <th className="text-center p-3">Estado</th>
                <th className="text-center p-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">No hay órdenes de compra</td></tr>
              ) : filtered.map(oc => {
                const badge = getStatusBadge(oc);
                return (
                  <tr key={oc.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 text-white font-mono text-xs">{oc.folio}</td>
                    <td className="p-3 text-white">{oc.supplier_name}</td>
                    <td className="p-3 text-slate-300">{oc.obra_nombre}</td>
                    <td className="p-3 text-right text-white font-medium">{(oc.total || 0).toLocaleString()}</td>
                    <td className="p-3 text-right text-emerald-400">{(oc.pagado || 0).toLocaleString()}</td>
                    <td className="p-3 text-right text-amber-400 font-medium">{(oc.saldo || 0).toLocaleString()}</td>
                    <td className="p-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>{badge.label}</span></td>
                    <td className="p-3 text-center">
                      {badge.label !== "PAGADA" && (
                        <button onClick={() => abrirPagoModal(oc.id)}
                          className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition-colors">
                          <CreditCard className="w-3 h-3 inline mr-1" />Pagar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {/* Modal de Pago */}
      {showPagoModal && (() => {
        const oc = orders.find(o => o.id === pagoOcId);
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowPagoModal(false)}>
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-1">Registrar Pago</h3>
              {oc && <p className="text-sm text-slate-400 mb-4">{oc.folio} — {oc.supplier_name} — Saldo: <span className="text-amber-400 font-medium">{(oc.saldo || 0).toLocaleString()}</span></p>}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Monto del pago *</label>
                  <input type="number" step="0.01" min="0.01" value={pagoMonto} onChange={e => setPagoMonto(e.target.value)}
                    placeholder="0.00" autoFocus
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Método de pago</label>
                  <select value={pagoMetodo} onChange={e => setPagoMetodo(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-blue-500/50 focus:outline-none">
                    <option value="Transferencia">Transferencia</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Efectivo">Efectivo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Referencia bancaria (opcional)</label>
                  <input type="text" value={pagoReferencia} onChange={e => setPagoReferencia(e.target.value)}
                    placeholder="No. referencia, folio cheque, etc."
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none" />
                </div>
              </div>

              {pagoSuccess && (
                <div className={`mt-3 p-2 rounded-lg text-sm text-center ${pagoSuccess.startsWith("Error") ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                  {pagoSuccess}
                </div>
              )}

              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowPagoModal(false)} className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-sm hover:bg-white/10 transition-colors">
                  Cancelar
                </button>
                <button onClick={registrarPago} disabled={pagoLoading || !pagoMonto || parseFloat(pagoMonto) <= 0}
                  className="flex-1 px-4 py-2.5 bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {pagoLoading ? "Registrando..." : "Registrar Pago"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
      }"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, DollarSign, Clock, CheckCircle2, AlertCircle, Search, Filter, CreditCard, Building2, Calendar, Hash } from "lucide-react";

interface PurchaseOrder {
  id: string;
  folio: string;
  requisition_folio: string;
  supplier_name: string;
  total: number;
  status: string;
  created_at: string;
  obra_nombre: string;
  pagado: number;
  saldo: number;
}

export default function PagosPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("TODOS");
  const [stats, setStats] = useState({ total: 0, pagado: 0, pendiente: 0, ordenes: 0 });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: ocs, error } = await supabase
        .from("purchase_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const processed = (ocs || []).map((oc: any) => {
        const pagado = oc.monto_pagado || 0;
        const total = oc.total || 0;
        return {
          ...oc,
          pagado,
          saldo: total - pagado,
        };
      });

      setOrders(processed);

      const totalSum = processed.reduce((s: number, o: any) => s + (o.total || 0), 0);
      const pagadoSum = processed.reduce((s: number, o: any) => s + (o.pagado || 0), 0);
      setStats({
        total: totalSum,
        pagado: pagadoSum,
        pendiente: totalSum - pagadoSum,
        ordenes: processed.length,
      });
    } catch (e) {
      console.error("Error cargando pagos:", e);
    } finally {
      setLoading(false);
    }
  }

  async function registrarPago(ocId: string) {
    const montoStr = prompt("Monto del pago:");
    if (!montoStr) return;
    const monto = parseFloat(montoStr);
    if (isNaN(monto) || monto <= 0) { alert("Monto inválido"); return; }

    const metodo = prompt("Método de pago (Transferencia / Cheque / Efectivo):", "Transferencia");
    const referencia = prompt("Referencia bancaria (opcional):", "");

    const oc = orders.find(o => o.id === ocId);
    if (!oc) return;

    const nuevoPagado = (oc.pagado || 0) + monto;
    const nuevoStatus = nuevoPagado >= oc.total ? "PAGADA" : "PAGO_PARCIAL";

    const { error } = await supabase
      .from("purchase_orders")
      .update({
        monto_pagado: nuevoPagado,
        status: nuevoStatus,
        ultimo_pago_fecha: new Date().toISOString(),
        ultimo_pago_metodo: metodo,
        ultimo_pago_referencia: referencia,
      })
      .eq("id", ocId);

    if (error) {
      alert("Error: " + error.message);
    } else {
      alert(`✅ Pago de $${monto.toLocaleString()} registrado`);
      loadData();
    }
  }

  const filtered = orders.filter(o => {
    const matchSearch = !search || 
      o.folio?.toLowerCase().includes(search.toLowerCase()) ||
      o.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.obra_nombre?.toLowerCase().includes(search.toLowerCase());
    
    const matchStatus = filterStatus === "TODOS" || 
      (filterStatus === "PENDIENTE" && (!o.pagado || o.pagado === 0)) ||
      (filterStatus === "PARCIAL" && o.pagado > 0 && o.pagado < o.total) ||
      (filterStatus === "PAGADA" && o.pagado >= o.total);
    
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (oc: PurchaseOrder) => {
    if (oc.pagado >= oc.total && oc.total > 0) return { label: "PAGADA", color: "bg-emerald-500/20 text-emerald-400" };
    if (oc.pagado > 0) return { label: "PARCIAL", color: "bg-amber-500/20 text-amber-400" };
    return { label: "PENDIENTE", color: "bg-red-500/20 text-red-400" };
  };

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
        <div className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></div>
        <span className="text-sm font-medium">Regresar</span>
      </button>

      <div>
        <h1 className="text-2xl font-bold text-white">Control de Pagos</h1>
        <p className="text-slate-400 text-sm">Seguimiento de pagos a proveedores por órdenes de compra</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total OCs", value: `$${stats.total.toLocaleString()}`, icon: DollarSign, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Pagado", value: `$${stats.pagado.toLocaleString()}`, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Pendiente", value: `$${stats.pendiente.toLocaleString()}`, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Órdenes", value: stats.ordenes, icon: Hash, color: "text-violet-400", bg: "bg-violet-500/10" },
        ].map((s, i) => (
          <div key={i} className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-2`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
            <p className="text-xl font-bold text-white">{loading ? "..." : s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por folio, proveedor u obra..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none" />
        </div>
        <div className="flex gap-2">
          {["TODOS", "PENDIENTE", "PARCIAL", "PAGADA"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === s ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <tr className="text-slate-400 text-xs uppercase">
                <th className="text-left p-3">OC</th>
                <th className="text-left p-3">Proveedor</th>
                <th className="text-left p-3">Obra</th>
                <th className="text-right p-3">Total</th>
                <th className="text-right p-3">Pagado</th>
                <th className="text-right p-3">Saldo</th>
                <th className="text-center p-3">Estado</th>
                <th className="text-center p-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">No hay órdenes de compra</td></tr>
              ) : filtered.map(oc => {
                const badge = getStatusBadge(oc);
                return (
                  <tr key={oc.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 text-white font-mono text-xs">{oc.folio}</td>
                    <td className="p-3 text-white">{oc.supplier_name}</td>
                    <td className="p-3 text-slate-300">{oc.obra_nombre}</td>
                    <td className="p-3 text-right text-white font-medium">${(oc.total || 0).toLocaleString()}</td>
                    <td className="p-3 text-right text-emerald-400">${(oc.pagado || 0).toLocaleString()}</td>
                    <td className="p-3 text-right text-amber-400 font-medium">${(oc.saldo || 0).toLocaleString()}</td>
                    <td className="p-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>{badge.label}</span></td>
                    <td className="p-3 text-center">
                      {badge.label !== "PAGADA" && (
                        <button onClick={() => registrarPago(oc.id)}
                          className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition-colors">
                          <CreditCard className="w-3 h-3 inline mr-1" />Pagar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
