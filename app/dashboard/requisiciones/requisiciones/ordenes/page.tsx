"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { handlePrintOC, handleDownloadPDFOC } from "@/components/OCPrint";
import {
  ArrowLeft, Loader2, Package, Search, Filter,
  CheckCircle2, Truck, CreditCard,
  FileText, ChevronRight, Printer, FileDown,
  PackageCheck, Banknote
} from "lucide-react";

type PO = {
  id: number;
  folio: string;
  requisition_id: number;
  supplier_name: string;
  total: number;
  status: string;
  payment_method: string;
  credit_days: number;
  created_at: string;
  authorized_at: string;
  received_at: string | null;
};

type ReqItem = {
  id: number;
  product_name: string;
  quantity: number;
  unit: string;
  selected_supplier_name: string;
  selected_price: number;
};

type Requisicion = {
  id: number;
  folio: string;
  cost_center_id: number;
  cost_center_name: string;
  urgency: string;
  user_email: string;
};

export default function OrdenesCompraPage() {
  const [orders, setOrders] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("TODOS");
  const [filterProveedor, setFilterProveedor] = useState<string>("TODOS");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PO | null>(null);
  const [poItems, setPOItems] = useState<ReqItem[]>([]);
  const [poReq, setPOReq] = useState<Requisicion | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    setLoading(true);
    const { data } = await supabase.from("purchase_orders").select("*").order("created_at", { ascending: false });
    setOrders((data || []) as PO[]);
    setLoading(false);
  };

  const openDetail = async (po: PO) => {
    setSelectedPO(po);
    setLoadingDetail(true);
    const { data: items } = await supabase.from("requisition_items").select("*")
      .eq("requisition_id", po.requisition_id).eq("selected_supplier_name", po.supplier_name);
    setPOItems((items || []) as ReqItem[]);
    const { data: req } = await supabase.from("Requisiciones").select("id, folio, cost_center_id, cost_center_name, urgency, user_email")
      .eq("id", po.requisition_id).single();
    setPOReq(req as Requisicion);
    setLoadingDetail(false);
  };

  const closeDetail = () => { setSelectedPO(null); setPOItems([]); setPOReq(null); };

  const updateStatus = async (newStatus: string) => {
    if (!selectedPO || !poReq) return;
    setUpdatingStatus(true);
    
    const updates: any = { status: newStatus };
    if (newStatus === "RECIBIDA") {
      updates.received_at = new Date().toISOString();
      
      // Obtener teléfono del solicitante
      const { data: userData } = await supabase.from("users").select("phone").eq("email", poReq.user_email).single();
      
      // Crear entrega y notificar
      try {
        await fetch("/api/requisicion/registrar-entrega", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            purchase_order_id: selectedPO.id,
            purchase_order_folio: selectedPO.folio,
            supplier_name: selectedPO.supplier_name,
            obra_id: poReq.cost_center_id,
              obra_nombre: poReq.cost_center_name,
            materiales: poItems.map(i => ({ product_name: i.product_name, quantity: i.quantity, unit: i.unit })),
            requisition_id: poReq.id,
            solicitante_email: poReq.user_email,
            solicitante_phone: userData?.phone || null,
          }),
        });
      } catch (e) { console.error("Error creando entrega:", e); }
    }
    
    await supabase.from("purchase_orders").update(updates).eq("id", selectedPO.id);
    setSelectedPO({ ...selectedPO, ...updates });
    setOrders(prev => prev.map(o => o.id === selectedPO.id ? { ...o, ...updates } : o));
    setUpdatingStatus(false);
  };

  const printOC = () => {
    if (!selectedPO || !poReq) return;
    handlePrintOC({ folio: selectedPO.folio, fechaAutorizacion: selectedPO.authorized_at || selectedPO.created_at, proveedor: selectedPO.supplier_name, obraNombre: poReq.cost_center_name, formaPago: selectedPO.payment_method, diasCredito: selectedPO.credit_days, total: selectedPO.total, materiales: poItems, requisicionFolio: poReq.folio });
  };

  const downloadOC = () => {
    if (!selectedPO || !poReq) return;
    handleDownloadPDFOC({ folio: selectedPO.folio, fechaAutorizacion: selectedPO.authorized_at || selectedPO.created_at, proveedor: selectedPO.supplier_name, obraNombre: poReq.cost_center_name, formaPago: selectedPO.payment_method, diasCredito: selectedPO.credit_days, total: selectedPO.total, materiales: poItems, requisicionFolio: poReq.folio });
  };

  const proveedores = [...new Set(orders.map(o => o.supplier_name))].sort();
  const filtered = orders.filter(o => {
    if (filterStatus !== "TODOS" && o.status !== filterStatus) return false;
    if (filterProveedor !== "TODOS" && o.supplier_name !== filterProveedor) return false;
    if (search && !o.folio.toLowerCase().includes(search.toLowerCase()) && !o.supplier_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: orders.length,
    generadas: orders.filter(o => o.status === "GENERADA").length,
    enTransito: orders.filter(o => o.status === "EN_TRANSITO").length,
    recibidas: orders.filter(o => o.status === "RECIBIDA").length,
    montoPendiente: orders.filter(o => o.status !== "RECIBIDA" && o.status !== "PAGADA").reduce((s, o) => s + (o.total || 0), 0),
  };

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    GENERADA: { label: "Generada", color: "text-blue-400", bg: "bg-blue-500/20", icon: FileText },
    EN_TRANSITO: { label: "En Tránsito", color: "text-amber-400", bg: "bg-amber-500/20", icon: Truck },
    RECIBIDA: { label: "Recibida", color: "text-emerald-400", bg: "bg-emerald-500/20", icon: PackageCheck },
    PAGADA: { label: "Pagada", color: "text-green-400", bg: "bg-green-500/20", icon: CheckCircle2 },
  };
  const getStatus = (s: string) => statusConfig[s] || statusConfig.GENERADA;

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>;

  if (selectedPO) {
    const st = getStatus(selectedPO.status);
    const StatusIcon = st.icon;
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <button onClick={closeDetail} className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft className="w-5 h-5 text-slate-400" /></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white">{selectedPO.folio}</h1>
            <p className="text-slate-400 text-sm truncate">{selectedPO.supplier_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={printOC} className="p-2 rounded-lg bg-white/5 hover:bg-white/10" title="Imprimir"><Printer className="w-5 h-5 text-slate-400" /></button>
            <button onClick={downloadOC} className="p-2 rounded-lg bg-white/5 hover:bg-white/10" title="Descargar PDF"><FileDown className="w-5 h-5 text-slate-400" /></button>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${st.bg} ${st.color}`}><StatusIcon className="w-3.5 h-3.5" />{st.label}</span>
        </div>
        {loadingDetail ? <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div> : (
          <div className="flex-1 overflow-y-auto space-y-4 pb-32">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Requisición</p>
                <p className="text-white font-semibold text-sm">{poReq?.folio || "-"}</p>
                <p className="text-slate-400 text-xs">{poReq?.cost_center_name}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Total</p>
                <p className="text-emerald-400 font-bold text-xl">${(selectedPO.total || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Forma de Pago</p>
                <p className="text-white font-medium text-sm flex items-center gap-1.5"><Banknote className="w-4 h-4 text-slate-400" />{selectedPO.payment_method || "Transferencia"}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Crédito</p>
                <p className="text-white font-medium text-sm flex items-center gap-1.5"><CreditCard className="w-4 h-4 text-slate-400" />{selectedPO.credit_days > 0 ? `${selectedPO.credit_days} días` : "Contado"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Materiales ({poItems.length})</h3>
              {poItems.map(item => (
                <div key={item.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0"><p className="text-white text-sm font-medium">{item.product_name}</p><p className="text-slate-500 text-xs">{item.quantity} {item.unit}</p></div>
                    <div className="text-right shrink-0"><p className="text-emerald-400 font-bold text-sm">${((item.selected_price || 0) * item.quantity).toLocaleString()}</p><p className="text-slate-500 text-[10px]">${(item.selected_price || 0).toLocaleString()} c/u</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="shrink-0 border-t border-white/[0.08] bg-[#0a1628]/95 backdrop-blur-lg -mx-4 px-4 pt-3 pb-4 sm:-mx-6 sm:px-6">
          <p className="text-slate-500 text-xs mb-2">Cambiar estado:</p>
          <div className="flex gap-2">
            {selectedPO.status === "GENERADA" && (
              <button onClick={() => updateStatus("EN_TRANSITO")} disabled={updatingStatus} className="flex-1 py-3 rounded-xl bg-amber-500/20 text-amber-400 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-amber-500/30 transition-colors disabled:opacity-50">
                {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}Marcar En Tránsito
              </button>
            )}
            {selectedPO.status === "EN_TRANSITO" && (
              <button onClick={() => updateStatus("RECIBIDA")} disabled={updatingStatus} className="flex-1 py-3 rounded-xl bg-emerald-500/20 text-emerald-400 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-emerald-500/30 transition-colors disabled:opacity-50">
                {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}Marcar Recibida
              </button>
            )}
            {selectedPO.status === "RECIBIDA" && (
              <button onClick={() => updateStatus("PAGADA")} disabled={updatingStatus} className="flex-1 py-3 rounded-xl bg-green-500/20 text-green-400 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-green-500/30 transition-colors disabled:opacity-50">
                {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}Marcar Pagada
              </button>
            )}
            {selectedPO.status === "PAGADA" && (
              <div className="flex-1 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 font-semibold text-sm flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" />Orden Completada</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <Link href="/dashboard/requisiciones/requisiciones" className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft className="w-5 h-5 text-slate-400" /></Link>
        <div className="flex-1"><h1 className="text-xl font-bold text-white">Órdenes de Compra</h1><p className="text-slate-400 text-sm">{orders.length} órdenes generadas</p></div>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-4 shrink-0">
        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center"><p className="text-blue-400 font-bold text-lg">{stats.generadas}</p><p className="text-slate-500 text-[9px]">Generadas</p></div>
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center"><p className="text-amber-400 font-bold text-lg">{stats.enTransito}</p><p className="text-slate-500 text-[9px]">En Tránsito</p></div>
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center"><p className="text-emerald-400 font-bold text-lg">{stats.recibidas}</p><p className="text-slate-500 text-[9px]">Recibidas</p></div>
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center"><p className="text-white font-bold text-sm">${(stats.montoPendiente/1000).toFixed(0)}k</p><p className="text-slate-500 text-[9px]">Pendiente</p></div>
      </div>
      <div className="flex gap-2 mb-3 shrink-0">
        <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar OC o proveedor..." className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:border-cyan-500 outline-none" /></div>
        <button onClick={() => setShowFilters(!showFilters)} className={`px-3 rounded-xl border flex items-center gap-1.5 text-sm transition-colors ${showFilters ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400" : "bg-white/5 border-white/10 text-slate-400"}`}><Filter className="w-4 h-4" /></button>
      </div>
      {showFilters && (
        <div className="flex gap-2 mb-3 shrink-0">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500 outline-none"><option value="TODOS">Todos los estados</option><option value="GENERADA">Generadas</option><option value="EN_TRANSITO">En Tránsito</option><option value="RECIBIDA">Recibidas</option><option value="PAGADA">Pagadas</option></select>
          <select value={filterProveedor} onChange={(e) => setFilterProveedor(e.target.value)} className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500 outline-none"><option value="TODOS">Todos los proveedores</option>{proveedores.map(p => <option key={p} value={p}>{p}</option>)}</select>
        </div>
      )}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filtered.length === 0 ? <div className="text-center py-20"><Package className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">No hay órdenes de compra</p></div> : filtered.map(po => {
          const st = getStatus(po.status); const StatusIcon = st.icon;
          return (<button key={po.id} onClick={() => openDetail(po)} className="w-full p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all text-left group">
            <div className="flex items-center justify-between mb-2"><span className="text-white font-bold">{po.folio}</span><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${st.bg} ${st.color}`}><StatusIcon className="w-3 h-3" />{st.label}</span></div>
            <p className="text-slate-400 text-sm">{po.supplier_name}</p>
            <div className="flex items-center justify-between mt-2"><span className="text-emerald-400 font-bold">${(po.total || 0).toLocaleString()}</span><div className="flex items-center gap-2"><span className="text-slate-500 text-xs">{new Date(po.created_at).toLocaleDateString("es-MX")}</span><ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" /></div></div>
          </button>);
        })}
      </div>
    </div>
  );
}

