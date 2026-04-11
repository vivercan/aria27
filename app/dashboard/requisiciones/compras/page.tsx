"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Loader2, Package, Clock, CreditCard, Banknote,
  Receipt, Truck, Check, ShoppingCart, ChevronRight, AlertCircle,
  CheckCircle2, Star, Zap, X
} from "lucide-react";
import FlashBanner from "@/components/FlashBanner";
import ConfirmModal from "@/components/ConfirmModal";
import { useFlashMessage } from "@/lib/use-flash-message";

type Req = {
  id: number; folio: string; cost_center_name: string;
  urgency: string; status: string; created_at: string;
};
type Item = { id: number; product_name: string; unit: string; quantity: number; };
type Quote = {
  id: number; requisition_id: number; supplier_name: string; total: number;
  dias_credito: number; dias_entrega: number; forma_pago: string;
  tipo_credito: string; emite_factura: boolean; notes: string;
};
type ItemQuote = {
  id: number; requisition_item_id: number; supplier_name: string;
  unit_price: number; total_price: number; dias_entrega: number;
};
type Selection = { supplier_name: string; unit_price: number; };

export default function ComprasPickingPage() {
  const { msg, flash, clear } = useFlashMessage();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [selectedReq, setSelectedReq] = useState<Req | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [quotations, setQuotations] = useState<Quote[]>([]);
  const [itemQuotes, setItemQuotes] = useState<ItemQuote[]>([]);
  const [selections, setSelections] = useState<Record<number, Selection>>({});
  const [loading, setLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [confirmState, setConfirmState] = useState<{ open: boolean; msg: string; onOk: () => void }>({ open: false, msg: "", onOk: () => {} });

  useEffect(() => { loadReqs(); }, []);

  const loadReqs = async () => {
    setLoading(true);
    const { data } = await supabase.from("Requisiciones").select("*")
      .in("status", ["COMPARATIVA_ENVIADA"]).order("created_at", { ascending: false });
    setReqs((data || []) as Req[]);
    setLoading(false);
  };

  const selectReq = async (req: Req) => {
    setSelectedReq(req);
    setLoading(true);
    setSelections({});

    const { data: its } = await supabase.from("requisition_items").select("*").eq("requisition_id", req.id);
    setItems((its || []) as Item[]);

    const { data: qs } = await supabase.from("quotations").select("*").eq("requisition_id", req.id);
    setQuotations((qs || []) as Quote[]);

    const ids = (its || []).map((i: { id: string }) => i.id);
    if (ids.length > 0) {
      const { data: iqs } = await supabase.from("requisition_item_quotes").select("*").in("requisition_item_id", ids);
      setItemQuotes((iqs || []) as ItemQuote[]);
    }
    setLoading(false);
  };

  const goBack = () => { setSelectedReq(null); setSelections({}); setShowCart(false); };

  // Supplier info map
  const supplierInfo = useMemo(() => {
    const m: Record<string, Quote> = {};
    quotations.forEach(q => { m[q.supplier_name] = q; });
    return m;
  }, [quotations]);

  const suppliers = useMemo(() => Object.keys(supplierInfo), [supplierInfo]);

  // Get quotes for a specific item
  const getQuotesForItem = (itemId: number) => itemQuotes.filter(iq => iq.requisition_item_id === itemId);

  // Best price per item
  const bestPriceForItem = (itemId: number) => {
    const qs = getQuotesForItem(itemId);
    return qs.length > 0 ? Math.min(...qs.map(q => q.unit_price)) : 0;
  };

  // Selection handlers
  const toggleSelect = (itemId: number, supplierName: string, unitPrice: number) => {
    setSelections(prev => {
      if (prev[itemId]?.supplier_name === supplierName) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: { supplier_name: supplierName, unit_price: unitPrice } };
    });
  };

  const selectAllFrom = (supplierName: string) => {
    const newSel = { ...selections };
    items.forEach(item => {
      const q = itemQuotes.find(iq => iq.requisition_item_id === item.id && iq.supplier_name === supplierName);
      if (q) newSel[item.id] = { supplier_name: supplierName, unit_price: q.unit_price };
    });
    setSelections(newSel);
  };

  const clearAll = () => setSelections({});

  // Cart
  const cart = useMemo(() => {
    const bySupplier: Record<string, { count: number; total: number }> = {};
    Object.entries(selections).forEach(([itemId, sel]) => {
      const item = items.find(i => i.id === Number(itemId));
      if (!item) return;
      if (!bySupplier[sel.supplier_name]) bySupplier[sel.supplier_name] = { count: 0, total: 0 };
      bySupplier[sel.supplier_name].count++;
      bySupplier[sel.supplier_name].total += sel.unit_price * item.quantity;
    });
    return bySupplier;
  }, [selections, items]);

  const grandTotal = useMemo(() => Object.values(cart).reduce((s, c) => s + c.total, 0), [cart]);
  const selectedCount = Object.keys(selections).length;

  // Authorize
  const authorize = async () => {
    if (selectedCount !== items.length) {
      flash("err", "Faltan " + (items.length - selectedCount) + " materiales por asignar");
      return;
    }

    const doAuthorize = async () => {
      setAuthorizing(true);
      try {
        const res = await fetch("/api/requisicion/autorizar-picking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requisition_id: selectedReq!.id,
            folio: selectedReq!.folio,
            obra: selectedReq!.cost_center_name,
            urgency: selectedReq!.urgency,
            selections: Object.entries(selections).map(([itemId, sel]) => {
              const item = items.find(i => i.id === Number(itemId))!;
              const info = supplierInfo[sel.supplier_name];
              return {
                item_id: Number(itemId),
                product_name: item.product_name,
                quantity: item.quantity,
                unit: item.unit,
                supplier_name: sel.supplier_name,
                unit_price: sel.unit_price,
                total_price: sel.unit_price * item.quantity,
                forma_pago: info?.forma_pago || "TRANSFERENCIA",
                tipo_credito: info?.tipo_credito || "CONTADO",
                dias_credito: info?.dias_credito || 0,
                emite_factura: info?.emite_factura ?? true,
              };
            })
          })
        });
        if (!res.ok) {
          const errTxt = await res.text().catch(() => "");
          flash("err", "Error autorizar-picking (" + res.status + "): " + errTxt.slice(0, 250));
          setAuthorizing(false);
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (data.success) {
          flash("ok", "Compra autorizada\n" + data.purchase_orders + " orden(es) de compra generada(s)\nNotificacion enviada a Compras");
          goBack();
          loadReqs();
        } else {
          flash("err", "Error: " + (data.error || "desconocido"));
        }
      } catch (e: unknown) {
        flash("err", "Error de conexion");
      } finally {
        setAuthorizing(false);
      }
    };

    setConfirmState({
      open: true,
      msg: "Autorizar compra por $" + grandTotal.toLocaleString() + "?\nSe generaran " + Object.keys(cart).length + " orden(es) de compra.",
      onOk: doAuthorize
    });
  };

  // Helpers
  const urgencyColor = (u: string) => u === "critico" ? "text-red-400 bg-red-500/20" : u === "urgente" ? "text-amber-400 bg-amber-500/20" : "text-slate-400 bg-white/10";
  const urgencyLabel = (u: string) => u === "critico" ? "CRÍTICO" : u === "urgente" ? "URGENTE" : "Normal";
  const pagoShort = (fp: string) => fp === "TRANSFERENCIA" ? "Transf." : fp === "EFECTIVO" ? "Efectivo" : "Cheque";
  const creditoShort = (tc: string, dc: number) => tc === "CONTADO" ? "Contado" : dc + "d crédito";

  // Supplier total for quick select
  const supplierTotal = (name: string) => {
    let total = 0;
    items.forEach(item => {
      const q = itemQuotes.find(iq => iq.requisition_item_id === item.id && iq.supplier_name === name);
      if (q) total += q.unit_price * item.quantity;
    });
    return total;
  };

  const supplierItemCount = (name: string) => {
    return items.filter(item => itemQuotes.some(iq => iq.requisition_item_id === item.id && iq.supplier_name === name)).length;
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-aria-accent" /></div>;

  // ==========================================
  // VIEW: LIST OF PENDING REQUISITIONS
  // ==========================================
  if (!selectedReq) {
    return (
      <div className="h-full flex flex-col">
        <FlashBanner msg={msg} className="mx-0 mb-3" />
        <div className="flex items-center gap-3 mb-4">
          <Link href="/dashboard/requisiciones" className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Autorizar Compras</h1>
            <p className="text-slate-400 text-sm">{reqs.length} requisiciones pendientes</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3">
          {reqs.length === 0 ? (
            <div className="text-center py-20">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-50" />
              <p className="text-slate-400">No hay comparativas pendientes</p>
            </div>
          ) : reqs.map(req => (
            <button key={req.id} onClick={() => selectReq(req)}
              className="w-full p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all text-left group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-bold">{req.folio}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${urgencyColor(req.urgency)}`}>
                  {urgencyLabel(req.urgency)}
                </span>
              </div>
              <p className="text-slate-400 text-sm">{req.cost_center_name}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-slate-500 text-xs">{new Date(req.created_at).toLocaleDateString("es-MX")}</span>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-aria-accent transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: PICKING INTERFACE
  // ==========================================
  return (
    <>
      <FlashBanner msg={msg} className="mx-0 mb-3" />
      <ConfirmModal
        open={confirmState.open}
        message={confirmState.msg}
        onConfirm={() => {
          confirmState.onOk();
          setConfirmState(p => ({...p, open: false}));
        }}
        onCancel={() => setConfirmState(p => ({...p, open: false}))}
      />
      <div className="h-full flex flex-col">
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-3 shrink-0">
        <button onClick={goBack} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-white truncate">{selectedReq.folio}</h1>
          <p className="text-slate-400 text-xs">{selectedReq.cost_center_name}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${urgencyColor(selectedReq.urgency)}`}>
          {urgencyLabel(selectedReq.urgency)}
        </span>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-32">

        {/* QUICK SELECT */}
        <div className="space-y-2">
          <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Selección rápida por proveedor</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
            {suppliers.map(name => {
              const info = supplierInfo[name];
              const total = supplierTotal(name);
              const count = supplierItemCount(name);
              const allSelected = items.every(item => {
                const q = itemQuotes.find(iq => iq.requisition_item_id === item.id && iq.supplier_name === name);
                return !q || selections[item.id]?.supplier_name === name;
              });
              const bestTotal = Math.min(...suppliers.map(s => supplierTotal(s)));
              return (
                <div key={name} className={`min-w-[170px] snap-start p-3 rounded-xl border transition-all ${allSelected ? "bg-aria-accent-bg border-aria-accent/40" : "bg-white/[0.03] border-white/[0.08]"}`}>
                  <p className="text-white font-semibold text-sm truncate">{name}</p>
                  <p className={`text-lg font-bold mt-1 ${total === bestTotal ? "text-emerald-400" : "text-white"}`}>
                    ${total.toLocaleString()}
                  </p>
                  {total === bestTotal && <span className="text-emerald-400 text-[9px] font-medium">MEJOR TOTAL</span>}
                  <div className="flex flex-wrap gap-1.5 mt-2 text-[9px] text-slate-400">
                    <span>{count}/{items.length} items</span>
                    <span>&middot;</span>
                    <span>{pagoShort(info?.forma_pago || "")}</span>
                    <span>&middot;</span>
                    <span className={info?.emite_factura ? "text-emerald-400" : "text-amber-400"}>
                      {info?.emite_factura ? "Fact." : "Nota"}
                    </span>
                  </div>
                  <button onClick={() => selectAllFrom(name)}
                    className="w-full mt-2 py-1.5 rounded-lg bg-aria-accent-bg text-aria-accent text-xs font-medium hover:bg-aria-accent/30 transition-colors flex items-center justify-center gap-1">
                    <ShoppingCart className="w-3 h-3" /> Todo de aquí
                  </button>
                </div>
              );
            })}
          </div>
          {selectedCount > 0 && (
            <button onClick={clearAll} className="text-slate-500 text-xs hover:text-red-400 transition-colors flex items-center gap-1">
              <X className="w-3 h-3" /> Limpiar selección
            </button>
          )}
        </div>

        {/* DIVIDER */}
        <div className="border-t border-white/[0.06]" />

        {/* PER-ITEM PICKING */}
        <div className="space-y-2">
          <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
            Material por material ({selectedCount}/{items.length})
          </h3>
          {items.map(item => {
            const qs = getQuotesForItem(item.id);
            const best = bestPriceForItem(item.id);
            const selected = selections[item.id];
            return (
              <div key={item.id} className={`p-3 rounded-xl border transition-all ${selected ? "bg-white/[0.04] border-white/[0.12]" : "bg-white/[0.02] border-white/[0.06]"}`}>
                {/* Item header */}
                <div className="flex items-center gap-2 mb-2">
                  {selected ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Package className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.product_name}</p>
                    <p className="text-slate-500 text-[10px]">{item.quantity} {item.unit}</p>
                  </div>
                  {selected && (
                    <span className="text-emerald-400 text-xs font-bold shrink-0">
                      ${(selected.unit_price * item.quantity).toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Supplier options */}
                <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory">
                  {qs.length === 0 ? (
                    <p className="text-slate-500 text-xs py-2">Sin cotizaciones</p>
                  ) : qs.map(q => {
                    const info = supplierInfo[q.supplier_name];
                    const isSelected = selected?.supplier_name === q.supplier_name;
                    const isBest = q.unit_price === best;
                    const fastestDelivery = Math.min(...qs.map(x => x.dias_entrega || 999));
                    const isFastest = q.dias_entrega === fastestDelivery && qs.length > 1;
                    return (
                      <button key={q.id} onClick={() => toggleSelect(item.id, q.supplier_name, q.unit_price)}
                        className={`min-w-[150px] snap-start p-2.5 rounded-lg border text-left transition-all ${
                          isSelected
                            ? "bg-emerald-500/15 border-emerald-500/50 ring-1 ring-emerald-500/30"
                            : "bg-black/20 border-white/[0.08] hover:border-white/20"
                        }`}>
                        {/* Supplier name + badges */}
                        <div className="flex items-center gap-1 mb-1">
                          {isSelected && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                          <span className={`text-xs font-semibold truncate ${isSelected ? "text-emerald-400" : "text-white"}`}>
                            {q.supplier_name}
                          </span>
                        </div>

                        {/* Badges */}
                        <div className="flex gap-1 mb-1.5">
                          {isBest && <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-emerald-500/20 text-emerald-400">💰 MEJOR</span>}
                          {isFastest && <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-aria-primary-light text-aria-accent">⚡ RÁPIDO</span>}
                        </div>

                        {/* Price */}
                        <p className={`text-base font-bold ${isSelected ? "text-emerald-400" : isBest ? "text-emerald-400" : "text-white"}`}>
                          ${q.unit_price.toLocaleString()} <span className="text-[9px] font-normal text-slate-500">/{item.unit}</span>
                        </p>
                        <p className="text-slate-500 text-[9px]">
                          Subtotal: ${(q.unit_price * item.quantity).toLocaleString()}
                        </p>

                        {/* Details */}
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5 text-[9px]">
                          <span className="text-slate-400 flex items-center gap-0.5">
                            <Truck className="w-2.5 h-2.5" />{q.dias_entrega}d
                          </span>
                          <span className="text-slate-400 flex items-center gap-0.5">
                            <CreditCard className="w-2.5 h-2.5" />{creditoShort(info?.tipo_credito || "CONTADO", info?.dias_credito || 0)}
                          </span>
                          <span className="text-slate-400 flex items-center gap-0.5">
                            <Banknote className="w-2.5 h-2.5" />{pagoShort(info?.forma_pago || "")}
                          </span>
                          <span className={`flex items-center gap-0.5 ${info?.emite_factura ? "text-emerald-400" : "text-amber-400"}`}>
                            <Receipt className="w-2.5 h-2.5" />{info?.emite_factura ? "Factura" : "Nota"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STICKY FOOTER - CART */}
      <div className="shrink-0 border-t border-white/[0.08] bg-aria-bg/95 backdrop-blur-lg -mx-4 px-4 pt-3 pb-4 sm:-mx-6 sm:px-6">
        {/* Cart summary */}
        {selectedCount > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-slate-400 text-xs font-medium">
                <ShoppingCart className="w-3.5 h-3.5 inline mr-1" />
                {selectedCount}/{items.length} materiales
              </span>
              <span className="text-white font-bold text-lg">${grandTotal.toLocaleString()}</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
              {Object.entries(cart).map(([name, data]) => (
                <span key={name} className="text-slate-400">
                  {name}: <span className="text-white font-medium">${data.total.toLocaleString()}</span>
                  <span className="text-slate-500"> ({data.count})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Authorize button */}
        <button onClick={authorize} disabled={authorizing || selectedCount !== items.length}
          className={`w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
            selectedCount === items.length
              ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
              : "bg-white/5 text-slate-500 cursor-not-allowed"
          }`}>
          {authorizing ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Autorizando...</>
          ) : selectedCount === items.length ? (
            <><CheckCircle2 className="w-5 h-5" /> Autorizar Compra &middot; ${grandTotal.toLocaleString()}</>
          ) : (
            <><AlertCircle className="w-5 h-5" /> Selecciona {items.length - selectedCount} material(es) más</>
          )}
        </button>
      </div>
    </div>
    </>
  );
}
