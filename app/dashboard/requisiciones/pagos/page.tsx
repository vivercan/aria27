"use client";
import { clientLogger } from "@/lib/client-logger";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { registrarPagoOC } from "@/lib/finanzas-payments";
import { uploadComprobantePago } from "@/lib/storage";
import { DollarSign, Clock, CheckCircle2, AlertCircle, Search, Filter, CreditCard, Building2, Calendar, Hash, X , Loader2, Paperclip, Download, Receipt } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { getEntityColor } from "@/lib/entity-colors";

interface PurchaseOrder {
  id: string;
  folio: string;
  requisition_folio: string;
  requisition_id?: string;
  supplier_name: string;
  total: number;
  status: string;
  created_at: string;
  obra_nombre: string;
  monto_pagado?: number;
  pagado?: number;
  saldo?: number;
  descripcion_compra?: string;
  motivo_solicitud?: string;
  factura_url?: string;
  comprobante_url?: string;
  payment_method?: string;
}

interface ProcessedOrder extends PurchaseOrder {
  pagado: number;
  saldo: number;
}

export default function PagosPage() {
  const log = clientLogger("PAGOS");
  const { msg, flash, clear } = useFlashMessage();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("TODOS");
  const [stats, setStats] = useState({ total: 0, pagado: 0, pendiente: 0, ordenes: 0 });
  const [pagoModal, setPagoModal] = useState<{ ocId: string; total: number; pagado: number; saldo: number } | null>(null);
  const [pagoMonto, setPagoMonto] = useState("");
  const [pagoMetodo, setPagoMetodo] = useState("Transferencia");
  const [pagoReferencia, setPagoReferencia] = useState("");
  const [pagoComprobante, setPagoComprobante] = useState<File | null>(null);
  const [pagoFactura, setPagoFactura] = useState<File | null>(null);
  const [pagoDescripcion, setPagoDescripcion] = useState("");
  const [pagoMotivo, setPagoMotivo] = useState("");
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [destajistas, setDestajistas] = useState<Array<{proveedor: string, monto: number, fotos: string[]}>>([]);
  const [destajistaActual, setDestajistaActual] = useState({proveedor: "", monto: 0});
  const [pagoSaving, setPagoSaving] = useState(false);

  // 21-Abr-2026: filtro opcional por metodo via query param (?metodo=EFECTIVO|TRANSFERENCIA).
  // Permite que los atajos sidebar 'Pagos Efectivo' / 'Pagos Transferencia' aterricen aqui prefiltrados.
  const [filterMetodo, setFilterMetodo] = useState<string>("TODOS");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const qs = new URLSearchParams(window.location.search);
    const m = qs.get("metodo");
    if (m) setFilterMetodo(m.toUpperCase());
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: ocs, error } = await supabase
        .from("purchase_orders")
        .select("*, descripcion_compra, motivo_solicitud, factura_url, comprobante_url, requisition_id, payment_method")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const processed = (ocs || []).map((oc: PurchaseOrder) => {
        const pagado = oc.monto_pagado || 0;
        const total = oc.total || 0;
        return {
          ...oc,
          pagado,
          saldo: total - pagado,
        } as ProcessedOrder;
      });

      setOrders(processed);

      const totalSum = processed.reduce((s: number, o: ProcessedOrder) => s + (o.total || 0), 0);
      const pagadoSum = processed.reduce((s: number, o: ProcessedOrder) => s + (o.pagado || 0), 0);
      setStats({
        total: totalSum,
        pagado: pagadoSum,
        pendiente: totalSum - pagadoSum,
        ordenes: processed.length,
      });
    } catch (e: unknown) {
      log.error("Error cargando pagos:", { data: e });
    } finally {
      setLoading(false);
    }
  }

  function abrirPagoModal(ocId: string) {
    const oc = orders.find(o => o.id === ocId);
    if (!oc) return;
    const pagado = oc.monto_pagado || oc.pagado || 0;
    const saldo = oc.total - pagado;
    setPagoModal({ ocId, total: oc.total, pagado, saldo });
    setPagoMonto(String(saldo));
    setPagoMetodo("Transferencia");
    setPagoReferencia("");
    setPagoComprobante(null);
    setPagoFactura(null);
    setPagoDescripcion("");
    setPagoMotivo("");
    setDestajistas([]);
    setDestajistaActual({proveedor: "", monto: 0});
  }

  async function exportarExcel() {
    setExportandoExcel(true);
    try {
      const XLSX = await import("xlsx");
      const filtered = orders.filter(o => filterMetodo === "TODOS" || (o.payment_method || "").toUpperCase() === filterMetodo);
      const rows = filtered.map(oc => ({
        "Folio Req": oc.requisition_folio || "",
        "Folio OC": oc.folio,
        "Proveedor": oc.supplier_name,
        "Obra": oc.obra_nombre || "",
        "Descripcion": oc.descripcion_compra || "",
        "Motivo": oc.motivo_solicitud || "",
        "Total": oc.total || 0,
        "Pagado": oc.monto_pagado || 0,
        "Saldo": (oc.total || 0) - (oc.monto_pagado || 0),
        "Metodo": oc.payment_method || "",
        "Estado": oc.status,
        "Comprobante": oc.comprobante_url ? "SI" : "NO",
        "Factura": oc.factura_url ? "SI" : "NO",
        "Fecha": oc.created_at ? new Date(oc.created_at).toLocaleDateString("es-MX") : "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Control de Pagos");
      const fname = `Control_Pagos_${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, fname);
      flash("ok", `Excel descargado: ${rows.length} filas`);
    } catch (e: unknown) {
      flash("err", "Error al exportar: " + (e as Error).message);
    } finally {
      setExportandoExcel(false);
    }
  }

  async function confirmarPago() {
    if (!pagoModal) return;
    const monto = parseFloat(pagoMonto);
    if (isNaN(monto) || monto <= 0) return;

    // 21-Abr-2026: Validacion comprobante obligatorio en Transferencia.
    if (pagoMetodo === "Transferencia" && !pagoComprobante) {
      flash("err", "Para pago por Transferencia es obligatorio adjuntar comprobante.");
      return;
    }

    setPagoSaving(true);
    try {
      let comprobanteUrl: string | undefined = undefined;
      if (pagoComprobante) {
        comprobanteUrl = await uploadComprobantePago(pagoComprobante, ["oc", pagoModal.ocId]);
      }
      let facturaUrl: string | undefined = undefined;
      if (pagoFactura) {
        facturaUrl = await uploadComprobantePago(pagoFactura, ["oc", pagoModal.ocId, "factura"]);
      }
      // Actualizar campos extra en purchase_orders
      if (facturaUrl || pagoDescripcion || pagoMotivo || destajistas.length > 0) {
        const updatePayload: Record<string, unknown> = {};
        if (facturaUrl) updatePayload.factura_url = facturaUrl;
        if (pagoDescripcion) updatePayload.descripcion_compra = pagoDescripcion;
        if (pagoMotivo) updatePayload.motivo_solicitud = pagoMotivo;
        if (destajistas.length > 0) updatePayload.destajistas = destajistas;
        await supabase.from("purchase_orders").update(updatePayload).eq("id", pagoModal.ocId);
      }

      await registrarPagoOC({
        ocId: pagoModal.ocId,
        monto,
        total: pagoModal.total,
        expectedPagado: pagoModal.pagado,
        metodo: pagoMetodo,
        referencia: pagoReferencia,
        comprobanteUrl,
      });
      setPagoModal(null);
      await loadData();
    } catch (e: unknown) {
      flash("err", (e as {message?: string})?.message || "Error desconocido al registrar pago");
    } finally {
      setPagoSaving(false);
    }
  }

  const filtered = orders.filter(o => {
    const matchSearch = !search ||
      o.folio?.toLowerCase().includes(search.toLowerCase()) ||
      o.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.obra_nombre?.toLowerCase().includes(search.toLowerCase());

    const pagado = o.monto_pagado || o.pagado || 0;
    const matchStatus = filterStatus === "TODOS" ||
      (filterStatus === "PENDIENTE" && (!pagado || pagado === 0)) ||
      (filterStatus === "PARCIAL" && pagado > 0 && pagado < o.total) ||
      (filterStatus === "PAGADA" && pagado >= o.total);

    // 21-Abr-2026: filtro por metodo del ultimo pago registrado.
    // TODOS = ignorar. EFECTIVO/TRANSFERENCIA/CHEQUE = exige match contra ultimo_pago_metodo.
    const metodoOC = (o as unknown as { ultimo_pago_metodo?: string }).ultimo_pago_metodo || "";
    const matchMetodo = filterMetodo === "TODOS" ||
      metodoOC.toUpperCase() === filterMetodo;

    return matchSearch && matchStatus && matchMetodo;
  });

  const getStatusBadge = (oc: PurchaseOrder) => {
    const pagado = oc.monto_pagado || oc.pagado || 0;
    if (pagado >= oc.total && oc.total > 0) return { label: "PAGADA", color: "bg-emerald-500/20 text-aria-accent" };
    if (pagado > 0) return { label: "PARCIAL", color: "bg-amber-500/20 text-amber-400" };
    return { label: "PENDIENTE", color: "bg-red-500/20 text-red-400" };
  };

  return (
    <div className="aria-bg-canon max-w-7xl mx-auto space-y-6">
      <FlashBanner msg={msg} className="mx-0 mb-3" />
      <AriaBackButton href="/dashboard/requisiciones" />

      <div className="sticky top-0 z-10 bg-gradient-to-b from-slate-950 via-slate-950/95 to-transparent pb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Control de Pagos</h1>
          <p className="text-[#7f93b0] text-sm">Seguimiento de pagos a proveedores por Órdenes de compra</p>
        </div>
        <button
          onClick={exportarExcel}
          disabled={exportandoExcel || orders.length === 0}
          className="px-4 py-2 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
        >
          {exportandoExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Descargar Excel
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total OCs", value: `$${stats.total.toLocaleString()}`, icon: DollarSign, color: "text-aria-accent", bg: "bg-aria-primary/10" },
          { label: "Pagado", value: `$${stats.pagado.toLocaleString()}`, icon: CheckCircle2, color: "text-aria-accent", bg: "bg-emerald-500/10" },
          { label: "Pendiente", value: `$${stats.pendiente.toLocaleString()}`, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Órdenes", value: stats.ordenes, icon: Hash, color: "text-aria-accent", bg: "bg-aria-primary/10" },
        ].map((s, i) => (
          <div key={i} className="p-4 bg-gradient-to-br from-[#1E3E7A]/15 to-[#0A2450]/25 border border-[#3A5E9A]/40 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-2`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
            <p className="text-xl font-bold text-white">{loading ? "..." : s.value}</p>
            <p className="text-xs text-[#7f93b0]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7f93b0]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por folio, proveedor u obra..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-[#4a6080] focus:border-aria-primary/50 focus:outline-none" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["TODOS", "PENDIENTE", "PARCIAL", "PAGADA"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === s ? "bg-aria-primary-light text-aria-accent border border-aria-primary/30" : "bg-white/[0.04] text-[#7f93b0] border border-white/[0.08] hover:bg-white/[0.06]"}`}>
              {s}
            </button>
          ))}
        </div>
        {/* 21-Abr-2026: filtro por metodo de pago */}
        <div className="flex gap-2 flex-wrap">
          <span className="px-2 py-2 text-xs text-[#4a6080] uppercase tracking-wider">Método:</span>
          {["TODOS", "EFECTIVO", "TRANSFERENCIA", "CHEQUE"].map(m => (
            <button key={m} onClick={() => setFilterMetodo(m)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${filterMetodo === m ? "bg-aria-primary-light text-aria-accent border border-aria-primary/30" : "bg-white/[0.04] text-[#7f93b0] border border-white/[0.08] hover:bg-white/[0.06]"}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[rgba(4,8,16,0.98)] backdrop-blur z-10">
              <tr className="text-[#7f93b0] text-xs uppercase">
                <th className="text-left p-3">Folio Req</th>
                <th className="text-left p-3">Proveedor</th>
                <th className="text-left p-3">Obra</th>
                <th className="text-left p-3">Descripcion</th>
                <th className="text-left p-3">Motivo</th>
                <th className="text-right p-3">Total</th>
                <th className="text-right p-3">Pagado</th>
                <th className="text-right p-3">Saldo</th>
                <th className="text-center p-3">Comp/Fac</th>
                <th className="text-center p-3">Estado</th>
                <th className="text-center p-3">Accion</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="p-8 text-center text-[#7f93b0]"><Loader2 className="w-6 h-6 animate-spin text-aria-accent mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} className="p-8 text-center text-[#7f93b0]">No hay Órdenes de compra</td></tr>
              ) : filtered.map(oc => {
                const badge = getStatusBadge(oc);
                return (
                  <tr key={oc.id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                    <td className="p-3 text-white font-mono text-xs">{oc.requisition_folio || oc.folio}</td>
                    <td className="p-3 text-white">{oc.supplier_name}</td>
                    <td className="p-3">{oc.obra_nombre ? <span className={`px-2 py-1 rounded-lg text-xs ${getEntityColor(oc.obra_nombre)}`}>{oc.obra_nombre}</span> : <span className="text-[#7f93b0]">—</span>}</td>
                    <td className="p-3 text-[#c9d8ed] text-xs max-w-[160px] truncate" title={oc.descripcion_compra || ""}>{oc.descripcion_compra || <span className="text-[#4a6080]">-</span>}</td>
                    <td className="p-3 text-[#c9d8ed] text-xs max-w-[160px] truncate" title={oc.motivo_solicitud || ""}>{oc.motivo_solicitud || <span className="text-[#4a6080]">-</span>}</td>
                    <td className="p-3 text-right text-white font-medium">${(oc.total || 0).toLocaleString()}</td>
                    <td className="p-3 text-right text-aria-accent">${(oc.monto_pagado || oc.pagado || 0).toLocaleString()}</td>
                    <td className="p-3 text-right text-amber-400 font-medium">${((oc.total || 0) - (oc.monto_pagado || oc.pagado || 0)).toLocaleString()}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {oc.comprobante_url && <a href={oc.comprobante_url} target="_blank" rel="noopener noreferrer" title="Comprobante transferencia" className="p-1 bg-emerald-500/20 text-aria-accent rounded text-[10px]"><Receipt className="w-3 h-3" /></a>}
                        {oc.factura_url && <a href={oc.factura_url} target="_blank" rel="noopener noreferrer" title="Factura" className="p-1 bg-aria-primary/20 text-aria-accent rounded text-[10px]"><Paperclip className="w-3 h-3" /></a>}
                        {!oc.comprobante_url && !oc.factura_url && <span className="text-[#4a6080] text-[10px]">-</span>}
                      </div>
                    </td>
                    <td className="p-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>{badge.label}</span></td>
                    <td className="p-3 text-center">
                      {badge.label !== "PAGADA" && (
                        <button onClick={() => abrirPagoModal(oc.id)}
                          className="px-3 py-1.5 bg-aria-primary-light text-aria-accent rounded-lg text-xs font-medium hover:bg-aria-primary-hover/30 transition-colors">
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

      {/* Modal Registrar Pago */}
      {pagoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 ">
          <div className="bg-[#0a1628] border border-white/[0.08] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">Registrar Pago</h3>
              <button onClick={() => setPagoModal(null)} className="p-1 rounded-lg hover:bg-white/[0.06]"><X className="w-5 h-5 text-[#7f93b0]" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#7f93b0] mb-1">Monto del pago</label>
                <input type="number" value={pagoMonto} onChange={e => setPagoMonto(e.target.value)} step="0.01" min="0" max={pagoModal.saldo}
                  className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm focus:border-aria-primary/50 focus:outline-none" />
                <p className="text-xs text-[#4a6080] mt-1">{`Saldo pendiente: $${pagoModal.saldo.toLocaleString()}`}</p>
              </div>
              <div>
                <label className="block text-xs text-[#7f93b0] mb-1">Método de pago</label>
                <select value={pagoMetodo} onChange={e => setPagoMetodo(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm focus:border-aria-primary/50 focus:outline-none">
                  <option value="Transferencia">Transferencia</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Efectivo">Efectivo</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#7f93b0] mb-1">Referencia bancaria (opcional)</label>
                <input type="text" value={pagoReferencia} onChange={e => setPagoReferencia(e.target.value)} placeholder="No. de referencia"
                  className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm focus:border-aria-primary/50 focus:outline-none" />
              </div>
              {/* 21-Abr-2026: comprobante obligatorio si metodo=Transferencia */}
              <div>
                <label className="block text-xs text-[#7f93b0] mb-1">
                  Comprobante de pago {pagoMetodo === "Transferencia" ? <span className="text-red-400">*</span> : <span className="text-[#4a6080]">(opcional)</span>}
                </label>
                <input type="file" accept="image/*,.pdf"
                  onChange={e => setPagoComprobante(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/20 file:text-aria-accent hover:file:bg-emerald-500/30" />
                {pagoComprobante && <p className="text-xs text-[#7f93b0] mt-1 flex items-center gap-1"><Paperclip className="w-3 h-3" />{pagoComprobante.name}</p>}
              </div>
              <div>
                <label className="block text-xs text-[#7f93b0] mb-1">Factura (opcional)</label>
                <input type="file" accept="image/*,.pdf,.xml"
                  onChange={e => setPagoFactura(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-aria-primary/20 file:text-aria-accent hover:file:bg-aria-primary/30" />
                {pagoFactura && <p className="text-xs text-[#7f93b0] mt-1 flex items-center gap-1"><Paperclip className="w-3 h-3" />{pagoFactura.name}</p>}
              </div>
              <div>
                <label className="block text-xs text-[#7f93b0] mb-1">Descripcion de compra</label>
                <select value={pagoDescripcion} onChange={e => setPagoDescripcion(e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm">
                  <option value="">Seleccionar...</option>
                  <option value="MATERIALES">Materiales</option>
                  <option value="GASTOS_ADMIN">Gastos Administrativos</option>
                  <option value="GASTOS_OPERATIVOS">Gastos Operativos</option>
                  <option value="DESTAJOS">Destajos</option>
                  <option value="MANO_OBRA">Mano de Obra</option>
                  <option value="PRESTAMOS">Prestamos</option>
                  <option value="SERVICIOS">Servicios</option>
                  <option value="HERRAMIENTAS">Herramientas</option>
                  <option value="COMBUSTIBLE">Combustible</option>
                  <option value="OTROS">Otros</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#7f93b0] mb-1">Motivo de la solicitud</label>
                <textarea value={pagoMotivo} onChange={e => setPagoMotivo(e.target.value)}
                  rows={2} placeholder="Razon o motivo de la compra..."
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm" />
              </div>
              {/* DESTAJISTAS: solo cuando descripcion = DESTAJOS */}
              {pagoDescripcion === "DESTAJOS" && (
                <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-amber-300 text-sm font-semibold">Destajistas (proveedor + fotos de trabajo)</h4>
                    <span className="text-[10px] text-[#7f93b0]">{destajistas.length} agregados</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_auto] gap-2 items-end">
                    <input type="text" placeholder="Nombre del destajista/proveedor" value={destajistaActual.proveedor}
                      onChange={e => setDestajistaActual(prev => ({...prev, proveedor: e.target.value}))}
                      className="px-2 py-1.5 bg-black/30 border border-white/[0.08] rounded-lg text-white text-xs" />
                    <input type="number" placeholder="Monto" value={destajistaActual.monto || ""}
                      onChange={e => setDestajistaActual(prev => ({...prev, monto: Number(e.target.value)}))}
                      className="px-2 py-1.5 bg-black/30 border border-white/[0.08] rounded-lg text-white text-xs" />
                    <button type="button" onClick={() => {
                      if (!destajistaActual.proveedor.trim() || destajistaActual.monto <= 0) return;
                      setDestajistas(prev => [...prev, { proveedor: destajistaActual.proveedor.trim(), monto: destajistaActual.monto, fotos: [] }]);
                      setDestajistaActual({proveedor: "", monto: 0});
                    }} className="px-3 py-1.5 bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-300 text-xs rounded-lg">+ Agregar</button>
                  </div>
                  {destajistas.length > 0 && (
                    <div className="space-y-1.5 max-h-40 overflow-auto">
                      {destajistas.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs bg-black/30 px-2 py-1.5 rounded border border-white/[0.05]">
                          <span className="flex-1 text-white">{d.proveedor}</span>
                          <span className="text-aria-accent tabular-nums">${d.monto.toLocaleString()}</span>
                          <label className="px-2 py-0.5 bg-aria-primary/30 text-aria-accent rounded cursor-pointer text-[10px]">
                            +Foto{d.fotos.length > 0 && ` (${d.fotos.length})`}
                            <input type="file" accept="image/*" className="hidden" multiple onChange={async (e) => {
                              const files = Array.from(e.target.files || []);
                              const urls: string[] = [];
                              for (const f of files) {
                                const path = `destajos/${Date.now()}_${i}_${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
                                const { error } = await supabase.storage.from("expedientes").upload(path, f);
                                if (!error) {
                                  const { data } = supabase.storage.from("expedientes").getPublicUrl(path);
                                  urls.push(data.publicUrl);
                                }
                              }
                              if (urls.length > 0) {
                                setDestajistas(prev => prev.map((x, idx) => idx === i ? {...x, fotos: [...x.fotos, ...urls]} : x));
                              }
                            }} />
                          </label>
                          <button type="button" onClick={() => setDestajistas(prev => prev.filter((_, idx) => idx !== i))} className="px-1.5 py-0.5 bg-rose-500/30 text-rose-300 rounded text-[10px]">x</button>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs pt-2 border-t border-white/[0.05]">
                        <span className="text-[#7f93b0]">Total destajos:</span>
                        <span className="text-amber-300 font-semibold tabular-nums">${destajistas.reduce((s, d) => s + d.monto, 0).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setPagoModal(null)} className="flex-1 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[#c9d8ed] text-sm font-medium hover:bg-white/[0.06]">Cancelar</button>
              <button onClick={confirmarPago} disabled={pagoSaving || !pagoMonto || parseFloat(pagoMonto) <= 0 || (pagoMetodo === "Transferencia" && !pagoComprobante)}
                className="flex-1 py-2.5 bg-aria-primary rounded-xl text-white text-sm font-medium hover:bg-aria-primary-hover disabled:opacity-50 disabled:cursor-not-allowed">
                {pagoSaving ? "Guardando..." : "Confirmar Pago"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
