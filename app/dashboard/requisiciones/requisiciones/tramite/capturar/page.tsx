"use client";
import DeleteModal from "@/components/DeleteModal";
import { useDeletePermission } from "@/lib/use-delete-permission";
import { backupAndDelete } from "@/lib/backup-delete";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Plus, Save, Send, Trash2, Loader2,
  Package, Clock, CreditCard, FileText, X,
  Banknote, Receipt, Truck
} from "lucide-react";

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
  created_at: string;
};

function CapturarContent() {
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

  // Form fields
  const [supplierName, setSupplierName] = useState("");
  const [diasCredito, setDiasCredito] = useState(0);
  const [diasEntrega, setDiasEntrega] = useState(0);
  const [formaPago, setFormaPago] = useState("TRANSFERENCIA");
  const [tipoCredito, setTipoCredito] = useState("CONTADO");
  const [emiteFactura, setEmiteFactura] = useState(true);
  const [notas, setNotas] = useState("");
  const [itemPrices, setItemPrices] = useState<Record<number, number>>({});

  useEffect(() => { if (reqId) loadAll(); else setLoading(false); }, [reqId]);

  const loadAll = async () => {
    setLoading(true);
    const { data: req } = await supabase.from("Requisiciones").select("*").eq("id", reqId).single();
    setRequisition(req);

    const { data: its } = await supabase.from("requisition_items").select("*").eq("requisition_id", reqId);
    setItems((its || []) as ReqItem[]);

    const { data: qs } = await supabase.from("quotations").select("*").eq("requisition_id", reqId).order("total", { ascending: true });
    setQuotes((qs || []) as QuoteRow[]);

    const { data: sups } = await supabase.from("Proveedores").select("id, name").eq("status", "ACTIVO").order("name");
    setSuppliers(sups || []);

    setLoading(false);
  };

  const formTotal = () => items.reduce((s, i) => s + ((itemPrices[i.id] || 0) * i.quantity), 0);

  const resetForm = () => {
    setSupplierName("");
    setDiasCredito(0);
    setDiasEntrega(0);
    setFormaPago("TRANSFERENCIA");
    setTipoCredito("CONTADO");
    setEmiteFactura(true);
    setNotas("");
    setItemPrices({});
    setShowForm(false);
  };

  const guardarCotizacion = async () => {
    if (!supplierName.trim() || formTotal() <= 0) return;
    setSaving(true);
    try {
      const { data: quote, error: qErr } = await supabase.from("quotations").insert({
        requisition_id: reqId,
        supplier_name: supplierName.trim(),
        dias_credito: tipoCredito === "CREDITO" ? diasCredito : 0,
        dias_entrega: diasEntrega,
        forma_pago: formaPago,
        tipo_credito: tipoCredito,
        emite_factura: emiteFactura,
        notes: notas,
        total: formTotal(),
        created_by: "compras"
      }).select().single();

      if (qErr) throw qErr;

      for (const item of items) {
        if (itemPrices[item.id] && itemPrices[item.id] > 0) {
          const { error: iqErr } = await supabase.from("requisition_item_quotes").insert({
            requisition_item_id: item.id,
            supplier_name: supplierName.trim(),
            unit_price: itemPrices[item.id],
            total_price: itemPrices[item.id] * item.quantity,
            dias_entrega: diasEntrega,
          });
          if (iqErr) throw iqErr;
        }
      }

      const { error: stErr } = await supabase.from("requisitions").update({ status: "EN_COTIZACION" }).eq("id", reqId);
      if (stErr) throw stErr;
      resetForm();
      await loadAll();
    } catch (e: any) {
      console.error("[capturar] guardarCotizacion error:", e);
      const msg = e?.message || e?.error_description || JSON.stringify(e);
      alert("Error al guardar cotizacion: " + msg);
    } finally {
      setSaving(false);
    }
  };

  const eliminarCotizacion = async (quoteId: number, sName: string) => {
    if (!canDelete) return; // Protected: only RH/admin
    const { error: delQErr } = await supabase.from("quotations").delete().eq("id", quoteId);
    if (delQErr) { alert("Error al eliminar cotización: " + delQErr.message); return; }
    for (const item of items) {
      const { error: delIqErr } = await supabase.from("requisition_item_quotes").delete()
        .eq("requisition_item_id", item.id)
        .eq("supplier_name", sName);
      if (delIqErr) { alert("Error al eliminar item cotizado: " + delIqErr.message); return; }
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
            total: q.total,
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
        alert("Error enviar-comparativa (" + res.status + "): " + errTxt.slice(0, 250));
        setEnviando(false);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        const { error: cmpErr } = await supabase.from("requisitions").update({ status: "COMPARATIVA_ENVIADA" }).eq("id", reqId);
        if (cmpErr) { alert("Comparativa enviada, pero error al actualizar estatus: " + cmpErr.message); }
        alert("Comparativa enviada a Direccion");
        await loadAll();
      } else {
        alert("Error: " + (data.error || "desconocido"));
      }
    } catch (e) {
      alert("Error de conexion");
    } finally {
      setEnviando(false);
    }
  };

  const bestPrice = quotes.length > 0 ? Math.min(...quotes.map(q => q.total)) : 0;

  const pagoLabel = (fp: string) => fp === "TRANSFERENCIA" ? "Transf." : fp === "EFECTIVO" ? "Efectivo" : "Cheque";
  const creditoLabel = (tc: string, dc: number) => tc === "CONTADO" ? "Contado" : `${dc}d crédito`;

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;
  if (!reqId) return (
    <div className="text-center py-20 text-slate-400">
      <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="mb-2">Selecciona una requisición desde Trámite</p>
      <Link href="/dashboard/requisiciones/requisiciones/tramite" className="text-blue-400 hover:underline text-sm">
        ← Ir a Trámite
      </Link>
    </div>
  );

  if (!requisition) return (
    <div className="text-center py-20 text-slate-400">
      <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="mb-2">No se encontr\u00f3 la requisici\u00f3n</p>
      <Link href="/dashboard/requisiciones/requisiciones/tramite" className="text-blue-400 hover:underline text-sm">
        \u2190 Ver requisiciones activas
      </Link>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/requisiciones/requisiciones/tramite" className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Capturar Cotizaciones</h1>
          <p className="text-slate-400 text-sm">{requisition.folio} &middot; {requisition.cost_center_name}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-cyan-400">{quotes.length}</p>
          <p className="text-slate-500 text-xs">cotizaciones</p>
        </div>
      </div>

      {/* ITEMS DE LA REQUISICION */}
      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
        <h3 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
          <Package className="w-4 h-4 text-cyan-400" /> Materiales solicitados ({items.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {items.map(i => (
            <div key={i.id} className="px-3 py-2 rounded-lg bg-black/30 text-xs">
              <span className="text-white">{i.product_name}</span>
              <span className="text-slate-500 ml-2">{i.quantity} {i.unit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* COTIZACIONES CAPTURADAS */}
      {quotes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-white font-medium text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" /> Cotizaciones recibidas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {quotes.map(q => (
              <div key={q.id} className={`p-4 rounded-xl border transition-all ${q.total === bestPrice ? "bg-emerald-500/10 border-emerald-500/40" : "bg-white/5 border-white/10"}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-semibold text-sm">{q.supplier_name}</p>
                    {q.total === bestPrice && <span className="text-emerald-400 text-[10px] font-medium">MEJOR PRECIO</span>}
                  </div>
                  {canDelete && (<button onClick={() => eliminarCotizacion(q.id, q.supplier_name)} className="p-1 rounded hover:bg-red-500/20">
                    <Trash2 className="w-3.5 h-3.5 text-slate-500 hover:text-red-400" />
                  </button>)}
                </div>
                <p className={`text-xl font-bold ${q.total === bestPrice ? "text-emerald-400" : "text-white"}`}>
                  ${q.total.toLocaleString()}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Truck className="w-3 h-3" /> {q.dias_entrega}d entrega
                  </span>
                  <span className="text-slate-400 flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> {creditoLabel(q.tipo_credito, q.dias_credito)}
                  </span>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Banknote className="w-3 h-3" /> {pagoLabel(q.forma_pago)}
                  </span>
                  <span className={`flex items-center gap-1 ${q.emite_factura ? "text-emerald-400" : "text-amber-400"}`}>
                    <Receipt className="w-3 h-3" /> {q.emite_factura ? "Factura" : "Nota"}
                  </span>
                </div>
                {q.notes && <p className="text-slate-500 text-[10px] mt-1 truncate">{q.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BOTON AGREGAR */}
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="w-full p-4 rounded-xl border-2 border-dashed border-white/20 hover:border-cyan-500/50 text-slate-400 hover:text-cyan-400 transition-all flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" />
          <span className="font-medium">Agregar cotizacion de proveedor</span>
        </button>
      )}

      {/* FORMULARIO NUEVA COTIZACION */}
      {showForm && (
        <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-cyan-400 font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nueva cotizacion
            </h3>
            <button onClick={resetForm} className="p-1 rounded hover:bg-white/10">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Proveedor */}
          <div>
            <label className="text-slate-400 text-xs block mb-1">Proveedor *</label>
            <input
              list="suppliers-list"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Nombre del proveedor..."
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:border-cyan-500 outline-none"
            />
            <datalist id="suppliers-list">
              {suppliers.map(s => <option key={s.id} value={s.name} />)}
            </datalist>
          </div>

          {/* ===== NUEVOS CAMPOS ===== */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Forma de Pago */}
            <div>
              <label className="text-slate-400 text-xs block mb-1">Forma de pago</label>
              <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:border-cyan-500 outline-none">
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>

            {/* Tipo Credito */}
            <div>
              <label className="text-slate-400 text-xs block mb-1">Condiciones</label>
              <div className="flex gap-1">
                <button type="button" onClick={() => { setTipoCredito("CONTADO"); setDiasCredito(0); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${tipoCredito === "CONTADO" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "bg-black/30 text-slate-400 border border-white/10"}`}>
                  Contado
                </button>
                <button type="button" onClick={() => setTipoCredito("CREDITO")}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${tipoCredito === "CREDITO" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "bg-black/30 text-slate-400 border border-white/10"}`}>
                  Crédito
                </button>
              </div>
            </div>

            {/* Factura / Nota */}
            <div>
              <label className="text-slate-400 text-xs block mb-1">Documento</label>
              <div className="flex gap-1">
                <button type="button" onClick={() => setEmiteFactura(true)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${emiteFactura ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-black/30 text-slate-400 border border-white/10"}`}>
                  Factura
                </button>
                <button type="button" onClick={() => setEmiteFactura(false)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${!emiteFactura ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "bg-black/30 text-slate-400 border border-white/10"}`}>
                  Nota
                </button>
              </div>
            </div>
          </div>

          {/* Dias credito y entrega */}
          <div className="grid grid-cols-2 gap-4">
            {tipoCredito === "CREDITO" && (
              <div>
                <label className="text-slate-400 text-xs block mb-1">Días de crédito</label>
                <input type="number" value={diasCredito} onChange={(e) => setDiasCredito(parseInt(e.target.value) || 0)}
                  placeholder="15, 30, 60..."
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:border-cyan-500 outline-none" />
              </div>
            )}
            <div className={tipoCredito === "CONTADO" ? "col-span-2" : ""}>
              <label className="text-slate-400 text-xs block mb-1">Días de entrega</label>
              <input type="number" value={diasEntrega} onChange={(e) => setDiasEntrega(parseInt(e.target.value) || 0)}
                placeholder="1, 3, 5..."
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:border-cyan-500 outline-none" />
            </div>
          </div>

          {/* Precios por item */}
          <div>
            <label className="text-slate-400 text-xs block mb-2">Precios unitarios *</label>
            <div className="rounded-lg bg-black/30 border border-white/10 overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5 sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
                  <tr className="text-left text-slate-500 text-[10px]">
                    <th className="p-2">Producto</th>
                    <th className="p-2 w-20">Cant.</th>
                    <th className="p-2 w-28">P. Unit.</th>
                    <th className="p-2 w-28 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-t border-white/5">
                      <td className="p-2 text-white text-xs">{item.product_name}</td>
                      <td className="p-2 text-slate-400 text-xs">{item.quantity} {item.unit}</td>
                      <td className="p-2">
                        <input type="number" placeholder="$0" step="0.01"
                          value={itemPrices[item.id] || ""}
                          onChange={(e) => setItemPrices(prev => ({ ...prev, [item.id]: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-2 py-1 rounded bg-black/50 border border-white/10 text-white text-xs text-right focus:border-cyan-500 outline-none" />
                      </td>
                      <td className="p-2 text-right text-emerald-400 text-xs font-medium">
                        {itemPrices[item.id] ? `$${(itemPrices[item.id] * item.quantity).toLocaleString()}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-slate-400 text-xs block mb-1">Notas</label>
            <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones..."
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:border-cyan-500 outline-none" />
          </div>

          {/* Resumen */}
          <div className="p-3 rounded-lg bg-black/30 border border-white/10">
            <div className="flex flex-wrap gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><Banknote className="w-3 h-3" /> {formaPago === "TRANSFERENCIA" ? "Transferencia" : formaPago === "EFECTIVO" ? "Efectivo" : "Cheque"}</span>
              <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> {tipoCredito === "CONTADO" ? "Contado" : `${diasCredito}d crédito`}</span>
              <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> {diasEntrega}d entrega</span>
              <span className={`flex items-center gap-1 ${emiteFactura ? "text-emerald-400" : "text-amber-400"}`}>
                <Receipt className="w-3 h-3" /> {emiteFactura ? "Factura (IVA)" : "Nota (sin IVA)"}
              </span>
            </div>
          </div>

          {/* Footer formulario */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <span className="text-emerald-400 font-bold text-lg">${formTotal().toLocaleString()}</span>
            <button onClick={guardarCotizacion} disabled={saving || !supplierName.trim() || formTotal() <= 0}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar cotizacion
            </button>
          </div>
        </div>
      )}

      {/* ENVIAR COMPARATIVA */}
      {quotes.length >= 5 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
          <div>
            <p className="text-white font-semibold">Comparativa lista</p>
            <p className="text-slate-400 text-xs">{quotes.length} de 5 cotizaciones &middot; Mejor: ${bestPrice.toLocaleString()}</p>
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
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>}>
      <CapturarContent />
    </Suspense>
  );
}
