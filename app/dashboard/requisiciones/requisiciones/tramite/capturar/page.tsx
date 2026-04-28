"use client";
import { clientLogger } from "@/lib/client-logger";
import DeleteModal from "@/components/DeleteModal";
import { useDeletePermission } from "@/lib/use-delete-permission";
import { backupAndDelete } from "@/lib/backup-delete";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Plus, Save, Send, Trash2, Loader2,
  Package, Clock, CreditCard, FileText, X,
  Banknote, Receipt, Truck
} from "lucide-react";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import AriaBackButton from "@/components/AriaBackButton";

type ReqItem = {
  id: number;
  product_name: string;
  unit: string;
  quantity: number;
  category: string;
};

type QuoteRow = {
  id: number;
  supplier_name: string;
  dias_credito: number;
  dias_entrega: number;
  forma_pago: string;
  tipo_credito: string;
  emite_factura: boolean;
  notes: string;
  total: number;
  subtotal: number | null;
  tax_rate: number | null;
  iva: number | null;
  advance_percentage: number | null;
  advance_amount: number | null;
  created_at: string;
};

function CapturarContent() {
  const log = clientLogger("CAPTURAR");
  const { msg, flash, clear } = useFlashMessage();
  const searchParams = useSearchParams();
  const reqId = searchParams.get("req");

  // FIX P0-03: Manejar caso sin parametro req
  if (!reqId) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
        <p style={{ fontSize: 18, marginBottom: 16 }}>No se especifico una requisicion.</p>
        <a href="/dashboard/requisiciones/requisiciones" style={{ color: '#10b981', textDecoration: 'underline' }}>
          Volver a Requisiciones
        </a>
      </div>
    );
  }

  const [requisition, setRequisition] = useState<any>(null);
  const { userEmail, canDelete } = useDeletePermission();
  const [deleteModal, setDeleteModal] = useState<{open:boolean;id:string;name:string}>
    ({open:false,id:"",name:""});
  const [items, setItems] = useState<ReqItem[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Form fields
  const [supplierName, setSupplierName] = useState("");
  const [diasCredito, setDiasCredito] = useState(0);
  const [diasEntrega, setDiasEntrega] = useState(0);
  const [formaPago, setFormaPago] = useState("TRANSFERENCIA");
  const [tipoCredito, setTipoCredito] = useState("CONTADO");
  const [emiteFactura, setEmiteFactura] = useState(true);
  const [notas, setNotas] = useState("");
  // Precios SIN IVA por item (canónico)
  const [itemPrices, setItemPrices] = useState<Record<number, number>>({});
  // IVA y anticipo a nivel cotización
  const [taxRate, setTaxRate] = useState<number>(16);
  const [advancePct, setAdvancePct] = useState<number>(0);

  useEffect(() => { if (reqId) loadAll(); else setLoading(false); }, [reqId]);

  // 27-Abr-2026: auto-recarga suppliers al volver el foco a la pestana
  useEffect(() => {
    const reloadSuppliers = async () => {
      const { data: sups } = await supabase.from("suppliers").select("id, name").eq("active", true).order("name");
      setSuppliers(sups || []);
    };
    const onVisibility = () => { if (document.visibilityState === "visible") reloadSuppliers(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", reloadSuppliers);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", reloadSuppliers);
    };
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const { data: req } = await supabase.from("Requisiciones").select("*").eq("id", reqId).single();
    setRequisition(req);

    const { data: its } = await supabase.from("requisition_items").select("*").eq("requisition_id", reqId);
    setItems((its || []) as ReqItem[]);

    const { data: qs } = await supabase.from("quotations").select("*").eq("requisition_id", reqId).order("total", { ascending: true });
    setQuotes((qs || []) as QuoteRow[]);

    // 27-Abr-2026: leer tabla base suppliers + filtro active=true (consistente con alta)
    const { data: sups } = await supabase.from("suppliers").select("id, name").eq("active", true).order("name");
    setSuppliers(sups || []);

    setLoading(false);
  };

  // Subtotal SIN IVA
  const formSubtotal = () => items.reduce((s, i) => s + ((itemPrices[i.id] || 0) * i.quantity), 0);
  const formIva = () => +(formSubtotal() * (taxRate / 100)).toFixed(2);
  const formTotal = () => +(formSubtotal() + formIva()).toFixed(2);
  const formAdvance = () => +((formTotal() * (advancePct / 100))).toFixed(2);
  // Helpers de sincronía SIN IVA <-> CON IVA por unidad
  const unitWithTax = (id: number) => +(((itemPrices[id] || 0) * (1 + taxRate / 100))).toFixed(4);
  const setUnitWithoutTax = (id: number, v: number) => setItemPrices(p => ({ ...p, [id]: v }));
  const setUnitWithTax = (id: number, v: number) => setItemPrices(p => ({ ...p, [id]: +(v / (1 + taxRate / 100)).toFixed(4) }));

  const resetForm = () => {
    setSupplierName("");
    setDiasCredito(0);
    setDiasEntrega(0);
    setFormaPago("TRANSFERENCIA");
    setTipoCredito("CONTADO");
    setEmiteFactura(true);
    setNotas("");
    setItemPrices({});
    setTaxRate(16);
    setAdvancePct(0);
    setShowForm(false);
  };

  const validar = (): boolean => {
    const errors: Record<string, string> = {};
    if (!supplierName?.trim()) errors.supplierName = "El nombre del proveedor es obligatorio";
    if (formSubtotal() <= 0) errors.prices = "Agregue precios válidos a los artículos";
    if (taxRate < 0 || taxRate > 100) errors.taxRate = "Tasa de IVA debe estar entre 0-100";
    if (![0, 30, 50, 100].includes(advancePct)) errors.advancePct = "Anticipo debe ser 0, 30, 50 o 100%";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const guardarCotizacion = async () => {
    if (!validar()) return;
    setSaving(true);
    try {
      const subtotal = formSubtotal();
      const iva = formIva();
      const total = formTotal();
      const advance_amount = formAdvance();
      const effectiveTaxRate = emiteFactura ? taxRate : 0;
      const effectiveIva = emiteFactura ? iva : 0;
      const effectiveTotal = emiteFactura ? total : subtotal;
      const effectiveAdvance = +(effectiveTotal * (advancePct / 100)).toFixed(2);

      const { data: quote, error: qErr } = await supabase.from("quotations").insert({
        requisition_id: reqId,
        supplier_name: supplierName.trim(),
        dias_credito: tipoCredito === "CREDITO" ? diasCredito : 0,
        dias_entrega: diasEntrega,
        forma_pago: formaPago,
        tipo_credito: tipoCredito,
        emite_factura: emiteFactura,
        notes: notas,
        subtotal: subtotal,
        tax_rate: effectiveTaxRate,
        iva: effectiveIva,
        total: effectiveTotal,
        advance_percentage: advancePct,
        advance_amount: effectiveAdvance,
        created_by: "compras"
      }).select().single();

      if (qErr) throw qErr;

      for (const item of items) {
        if (itemPrices[item.id] && itemPrices[item.id] > 0) {
          const pwt = itemPrices[item.id];
          const pct = +(pwt * (1 + effectiveTaxRate / 100)).toFixed(4);
          const { error: iqErr } = await supabase.from("requisition_item_quotes").insert({
            requisition_item_id: item.id,
            supplier_name: supplierName.trim(),
            unit_price: pwt,
            total_price: pwt * item.quantity,
            dias_entrega: diasEntrega,
            price_without_tax: pwt,
            price_with_tax: pct,
            tax_rate: effectiveTaxRate,
          });
          if (iqErr) throw iqErr;
        }
      }

      const { error: stErr } = await supabase.from("requisitions").update({ status: "EN_COTIZACION" }).eq("id", reqId);
      if (stErr) throw stErr;
      resetForm();
      await loadAll();
    } catch (e: unknown) {
      log.error("[capturar] guardarCotizacion error:", { data: e });
      const err = e as {message?: string; error_description?: string} | null;
      const msg = err?.message || err?.error_description || JSON.stringify(e);
      flash("err", "Error al guardar cotizacion: " + msg);
    } finally {
      setSaving(false);
    }
  };

  const eliminarCotizacion = async (quoteId: number, sName: string) => {
    if (!canDelete) return; // Protected: only RH/admin
    const { error: delQErr } = await supabase.from("quotations").delete().eq("id", quoteId);
    if (delQErr) { flash("err", "Error al eliminar cotización: " + delQErr.message); return; }
    for (const item of items) {
      const { error: delIqErr } = await supabase.from("requisition_item_quotes").delete()
        .eq("requisition_item_id", item.id)
        .eq("supplier_name", sName);
      if (delIqErr) { flash("err", "Error al eliminar item cotizado: " + delIqErr.message); return; }
    }
    await loadAll();
  };

  const enviarComparativa = async () => {
    if (quotes.length < 2) return;
    setEnviando(true);
    try {
      const res = await fetch("/api/requisicion/enviar-comparativa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requisition_id: reqId,
          folio: requisition.folio,
          obra: requisition.cost_center_name,
          quotes: quotes.map(q => ({
            supplier: q.supplier_name,
            subtotal: q.subtotal ?? q.total,
            iva: q.iva ?? 0,
            tax_rate: q.tax_rate ?? 16,
            total: q.total,
            advance_percentage: q.advance_percentage ?? 0,
            advance_amount: q.advance_amount ?? 0,
            credito: q.dias_credito,
            entrega: q.dias_entrega,
            forma_pago: q.forma_pago,
            tipo_credito: q.tipo_credito,
            emite_factura: q.emite_factura,
            notas: q.notes
          })),
          items: items.map(i => i.product_name),
          user_email: localStorage.getItem("userEmail") || ""
        })
      });
      if (!res.ok) {
        const errTxt = await res.text().catch(() => "");
        flash("err", "Error enviar-comparativa (" + res.status + "): " + errTxt.slice(0, 250));
        setEnviando(false);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        // No sobrescribir el status: enviar-comparativa ya lo dejo en EN_AUTORIZACION
        // (requerido por /autorizar/[token] y approve-purchase). Override anterior rompia autorizacion.
        flash("ok", "Comparativa enviada a Direccion");
        await loadAll();
      } else {
        flash("err", "Error: " + (data.error || "desconocido"));
      }
    } catch (e: unknown) {
      flash("err", "Error de conexion");
    } finally {
      setEnviando(false);
    }
  };

  const bestPrice = quotes.length > 0 ? Math.min(...quotes.map(q => q.total)) : 0;

  const pagoLabel = (fp: string) => fp === "TRANSFERENCIA" ? "Transf." : fp === "EFECTIVO" ? "Efectivo" : "Cheque";
  const creditoLabel = (tc: string, dc: number) => tc === "CONTADO" ? "Contado" : `${dc}d crédito`;

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-aria-accent" /></div>;
  if (!reqId) return (
    <div className="text-center py-20 text-[#7f93b0]">
      <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="mb-2">Selecciona una requisición desde Trámite</p>
      <Link href="/dashboard/requisiciones/requisiciones/tramite" className="text-aria-accent hover:underline text-sm">
        ← Ir a Trámite
      </Link>
    </div>
  );

  if (!requisition) return (
    <div className="text-center py-20 text-[#7f93b0]">
      <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="mb-2">No se encontr\u00f3 la requisici\u00f3n</p>
      <Link href="/dashboard/requisiciones/requisiciones/tramite" className="text-aria-accent hover:underline text-sm">
        \u2190 Ver requisiciones activas
      </Link>
    </div>
  );

  return (
    <div className="aria-page-canon">
      <FlashBanner msg={msg} className="mx-0 mb-2" />
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <AriaBackButton href="/dashboard/requisiciones/requisiciones/tramite" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Capturar Cotizaciones</h1>
          <p className="text-[#7f93b0] text-sm">{requisition.folio} &middot; {requisition.cost_center_name}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">{quotes.length}</p>
          <p className="text-[#4a6080] text-xs">cotizaciones</p>
        </div>
      </div>

      {/* ITEMS DE LA REQUISICION */}
      <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
        <h3 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
          <Package className="w-4 h-4 text-aria-accent" /> Materiales solicitados ({items.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {items.map(i => (
            <div key={i.id} className="px-3 py-2 rounded-lg bg-black/30 text-xs">
              <span className="text-white">{i.product_name}</span>
              <span className="text-[#4a6080] ml-2">{i.quantity} {i.unit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* COTIZACIONES CAPTURADAS */}
      {quotes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-white font-medium text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-aria-accent" /> Cotizaciones recibidas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {quotes.map(q => (
              <div key={q.id} className={`p-4 rounded-xl border transition-all ${q.total === bestPrice ? "bg-emerald-500/10 border-emerald-500/40" : "bg-white/[0.04] border-white/[0.08]"}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-semibold text-sm">{q.supplier_name}</p>
                    {q.total === bestPrice && <span className="text-aria-accent text-[10px] font-medium">MEJOR PRECIO</span>}
                  </div>
                  {canDelete && (<button onClick={() => eliminarCotizacion(q.id, q.supplier_name)} className="p-1 rounded hover:bg-red-500/20">
                    <Trash2 className="w-3.5 h-3.5 text-[#4a6080] hover:text-red-400" />
                  </button>)}
                </div>
                <p className={`text-xl font-bold ${q.total === bestPrice ? "text-aria-accent" : "text-white"}`}>
                  ${q.total.toLocaleString()} <span className="text-[10px] text-[#7f93b0] font-normal">{(q.tax_rate ?? 0) > 0 ? "c/IVA" : "s/IVA"}</span>
                </p>
                {(q.subtotal ?? null) !== null && (
                  <p className="text-[10px] text-[#4a6080] mt-0.5">
                    Subt ${Number(q.subtotal).toLocaleString()} · IVA {Number(q.tax_rate ?? 0)}% ${Number(q.iva ?? 0).toLocaleString()}
                  </p>
                )}
                {(q.advance_percentage ?? 0) > 0 && (
                  <p className="text-[10px] text-amber-400 mt-0.5">
                    Anticipo {q.advance_percentage}% = ${Number(q.advance_amount ?? 0).toLocaleString()}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px]">
                  <span className="text-[#7f93b0] flex items-center gap-1">
                    <Truck className="w-3 h-3" /> {q.dias_entrega}d entrega
                  </span>
                  <span className="text-[#7f93b0] flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> {creditoLabel(q.tipo_credito, q.dias_credito)}
                  </span>
                  <span className="text-[#7f93b0] flex items-center gap-1">
                    <Banknote className="w-3 h-3" /> {pagoLabel(q.forma_pago)}
                  </span>
                  <span className={`flex items-center gap-1 ${q.emite_factura ? "text-aria-accent" : "text-amber-400"}`}>
                    <Receipt className="w-3 h-3" /> {q.emite_factura ? "Factura" : "Nota"}
                  </span>
                </div>
                {q.notes && <p className="text-[#4a6080] text-[10px] mt-1 truncate">{q.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BOTON AGREGAR */}
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="w-full p-4 rounded-xl border-2 border-dashed border-white/[0.12] hover:border-aria-accent/50 text-[#7f93b0] hover:text-aria-accent transition-all flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" />
          <span className="font-medium">Agregar cotizacion de proveedor</span>
        </button>
      )}

      {/* FORMULARIO NUEVA COTIZACION */}
      {showForm && (
        <div className="p-4 rounded-xl bg-aria-accent-bg border border-aria-accent/30 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-aria-accent font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nueva cotizacion
            </h3>
            <button onClick={resetForm} className="p-1 rounded hover:bg-white/[0.06]">
              <X className="w-4 h-4 text-[#7f93b0]" />
            </button>
          </div>

          {/* Proveedor */}
          <div>
            <label className="text-[#7f93b0] text-xs block mb-1">Proveedor *</label>
            <input
              list="suppliers-list"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Nombre del proveedor..."
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/[0.08] text-white text-sm focus:border-aria-accent outline-none"
            />
            <datalist id="suppliers-list">
              {suppliers.map(s => <option key={s.id} value={s.name} />)}
            </datalist>
          </div>

          {/* ===== NUEVOS CAMPOS ===== */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Forma de Pago */}
            <div>
              <label className="text-[#7f93b0] text-xs block mb-1">Forma de pago</label>
              <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/[0.08] text-white text-sm focus:border-aria-accent outline-none">
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>

            {/* Tipo Credito */}
            <div>
              <label className="text-[#7f93b0] text-xs block mb-1">Condiciones</label>
              <div className="flex gap-1">
                <button type="button" onClick={() => { setTipoCredito("CONTADO"); setDiasCredito(0); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${tipoCredito === "CONTADO" ? "bg-aria-accent-bg text-aria-accent border border-aria-accent/40" : "bg-black/30 text-[#7f93b0] border border-white/[0.08]"}`}>
                  Contado
                </button>
                <button type="button" onClick={() => setTipoCredito("CREDITO")}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${tipoCredito === "CREDITO" ? "bg-aria-accent-bg text-aria-accent border border-aria-accent/40" : "bg-black/30 text-[#7f93b0] border border-white/[0.08]"}`}>
                  Crédito
                </button>
              </div>
            </div>

            {/* Factura / Nota */}
            <div>
              <label className="text-[#7f93b0] text-xs block mb-1">Documento</label>
              <div className="flex gap-1">
                <button type="button" onClick={() => setEmiteFactura(true)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${emiteFactura ? "bg-emerald-500/20 text-aria-accent border border-emerald-500/40" : "bg-black/30 text-[#7f93b0] border border-white/[0.08]"}`}>
                  Factura
                </button>
                <button type="button" onClick={() => setEmiteFactura(false)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${!emiteFactura ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "bg-black/30 text-[#7f93b0] border border-white/[0.08]"}`}>
                  Nota
                </button>
              </div>
            </div>
          </div>

          {/* Dias credito y entrega */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tipoCredito === "CREDITO" && (
              <div>
                <label className="text-[#7f93b0] text-xs block mb-1">Días de crédito</label>
                <input type="number" min="0" value={diasCredito} onChange={(e) => setDiasCredito(parseInt(e.target.value) || 0)}
                  placeholder="15, 30, 60..."
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/[0.08] text-white text-sm focus:border-aria-accent outline-none" />
              </div>
            )}
            <div className={tipoCredito === "CONTADO" ? "col-span-2" : ""}>
              <label className="text-[#7f93b0] text-xs block mb-1">Días de entrega</label>
              <input type="number" min="0" value={diasEntrega} onChange={(e) => setDiasEntrega(parseInt(e.target.value) || 0)}
                placeholder="1, 3, 5..."
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/[0.08] text-white text-sm focus:border-aria-accent outline-none" />
            </div>
          </div>

          {/* IVA y Anticipo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[#7f93b0] text-xs block mb-1">IVA (%)</label>
              <select value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/[0.08] text-white text-sm focus:border-aria-accent outline-none">
                <option value={0}>0% (Sin IVA / Nota)</option>
                <option value={8}>8% (Frontera Norte)</option>
                <option value={16}>16% (General México)</option>
              </select>
              <p className="text-[10px] text-[#4a6080] mt-1">Default 16%. Si el proveedor emite Nota, selecciona 0%.</p>
            </div>
            <div>
              <label className="text-[#7f93b0] text-xs block mb-1">Anticipo</label>
              <div className="flex gap-1">
                {[0, 30, 50, 100].map(pct => (
                  <button key={pct} type="button" onClick={() => setAdvancePct(pct)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${advancePct === pct ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-black/30 text-[#7f93b0] border border-white/[0.08]"}`}>
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Precios por item — SIN IVA y CON IVA sincronizados */}
          <div>
            <label className="text-[#7f93b0] text-xs block mb-2">Precios unitarios * (capture cualquier columna; la otra se recalcula)</label>
            <div className="rounded-lg bg-black/30 border border-white/[0.08] overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/[0.04] sticky top-0 bg-[rgba(4,8,16,0.98)]  z-10">
                  <tr className="text-left text-[#4a6080] text-[10px]">
                    <th className="p-2">Producto</th>
                    <th className="p-2 w-16">Cant.</th>
                    <th className="p-2 w-28">P.U. SIN IVA</th>
                    <th className="p-2 w-28">P.U. CON IVA</th>
                    <th className="p-2 w-28 text-right">Subtotal s/IVA</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-t border-white/[0.05]">
                      <td className="p-2 text-white text-xs">{item.product_name}</td>
                      <td className="p-2 text-[#7f93b0] text-xs">{item.quantity} {item.unit}</td>
                      <td className="p-2">
                        <input type="number" min="0" placeholder="$0" step="0.0001"
                          value={itemPrices[item.id] ? Number(itemPrices[item.id].toFixed(4)) : ""}
                          onChange={(e) => setUnitWithoutTax(item.id, parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 rounded bg-black/50 border border-white/[0.08] text-white text-xs text-right focus:border-aria-accent outline-none" />
                      </td>
                      <td className="p-2">
                        <input type="number" min="0" placeholder="$0" step="0.0001"
                          value={itemPrices[item.id] ? Number(unitWithTax(item.id).toFixed(4)) : ""}
                          onChange={(e) => setUnitWithTax(item.id, parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 rounded bg-black/50 border border-white/[0.08] text-white text-xs text-right focus:border-aria-accent outline-none" />
                      </td>
                      <td className="p-2 text-right text-aria-accent text-xs font-medium">
                        {itemPrices[item.id] ? `$${(itemPrices[item.id] * item.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-[#7f93b0] text-xs block mb-1">Notas</label>
            <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones..."
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/[0.08] text-white text-sm focus:border-aria-accent outline-none" />
          </div>

          {/* Resumen */}
          <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-2">
            <div className="flex flex-wrap gap-3 text-xs text-[#7f93b0]">
              <span className="flex items-center gap-1"><Banknote className="w-3 h-3" /> {formaPago === "TRANSFERENCIA" ? "Transferencia" : formaPago === "EFECTIVO" ? "Efectivo" : "Cheque"}</span>
              <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> {tipoCredito === "CONTADO" ? "Contado" : `${diasCredito}d crédito`}</span>
              <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> {diasEntrega}d entrega</span>
              <span className={`flex items-center gap-1 ${emiteFactura ? "text-aria-accent" : "text-amber-400"}`}>
                <Receipt className="w-3 h-3" /> {emiteFactura ? `Factura (IVA ${taxRate}%)` : "Nota (sin IVA)"}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-2 border-t border-white/[0.08]">
              <div><div className="text-[#4a6080] text-[10px]">SUBTOTAL</div><div className="text-white font-medium">${formSubtotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></div>
              <div><div className="text-[#4a6080] text-[10px]">IVA {emiteFactura ? taxRate : 0}%</div><div className="text-white font-medium">${(emiteFactura ? formIva() : 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></div>
              <div><div className="text-[#4a6080] text-[10px]">TOTAL</div><div className="text-aria-accent font-bold">${(emiteFactura ? formTotal() : formSubtotal()).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></div>
              <div><div className="text-[#4a6080] text-[10px]">ANTICIPO {advancePct}%</div><div className="text-amber-300 font-medium">${(((emiteFactura ? formTotal() : formSubtotal()) * advancePct) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></div>
            </div>
          </div>

          {/* Footer formulario */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
            <span className="text-aria-accent font-bold text-lg">${(emiteFactura ? formTotal() : formSubtotal()).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <button onClick={guardarCotizacion} disabled={saving || !supplierName.trim() || formSubtotal() <= 0}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-aria-accent to-aria-primary text-white font-medium flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar cotizacion
            </button>
          </div>
        </div>
      )}

      {/* ENVIAR COMPARATIVA */}
      {quotes.length >= 5 && (
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between">
          <div>
            <p className="text-white font-semibold">Comparativa lista</p>
            <p className="text-[#7f93b0] text-xs">{quotes.length} de 5 cotizaciones &middot; Mejor: ${bestPrice.toLocaleString()}</p>
          </div>
          <button onClick={enviarComparativa} disabled={enviando}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-500/25">
            {enviando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            Enviar a Dirección
          </button>
        </div>
      )}
    </div>
  );
}

export default function CapturarCotizacionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-aria-accent" /></div>}>
      <CapturarContent />
    </Suspense>
  );
}
