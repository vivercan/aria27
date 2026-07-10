"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, Save, Loader2, Plus, Trash2 } from "lucide-react";

interface Requisition {
  id: string;
  folio: string;
  cost_center_name?: string;
  status: string;
  instructions?: string;
  motivo_solicitud?: string;
  descripcion_compra?: string;
  forma_pago?: string;
  fecha_pago?: string;
  forma_entrega?: string;
  fecha_entrega?: string;
  foto_ticket_url?: string;
  monto?: number | null;
  total?: number | null;
  proveedor?: string;
  notas?: string;
  required_date?: string;
  subcategoria?: string;
  iva_porcentaje?: number | null;
}

interface ReqItem {
  id?: number;
  product_name: string;
  unit: string;
  quantity: number;
  selected_price: number | null;
  comments?: string;
  _new?: boolean;
}

const STATUS_BLOQUEADOS = ["AUTORIZADA", "OC_GENERADA", "CANCELADA"];

export default function RequisicionEditModal({
  req, onClose, onSaved,
}: {
  req: Requisition;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Requisition>({ ...req, iva_porcentaje: req.iva_porcentaje ?? 16 });
  const [items, setItems] = useState<ReqItem[]>([]);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const isBloqueada = STATUS_BLOQUEADOS.includes(req.status);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("requisition_items")
        .select("id, product_name, unit, quantity, selected_price, comments")
        .eq("requisition_id", req.id);
      setItems(((data || []) as Array<{ id: number; product_name: string; unit: string; quantity: number; selected_price: number | null; comments: string | null }>).map(r => ({
        id: r.id,
        product_name: r.product_name || "",
        unit: r.unit || "PZA",
        quantity: r.quantity || 1,
        selected_price: r.selected_price,
        comments: r.comments || "",
      })));
      setLoading(false);
    })();
  }, [req.id]);

  const setF = <K extends keyof Requisition>(k: K, v: Requisition[K]) => setForm(prev => ({ ...prev, [k]: v }));

  const updateItem = (idx: number, patch: Partial<ReqItem>) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

  const addItem = () => {
    setItems(prev => [...prev, { product_name: "", unit: "PZA", quantity: 1, selected_price: null, comments: "", _new: true }]);
  };

  const removeItem = (idx: number) => {
    const it = items[idx];
    if (it.id) setDeletedIds(prev => [...prev, it.id as number]);
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  // FIX 545: totales vivos en tiempo real (bug Compras 25-Jun REQ-00239)
  const subtotal = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.selected_price || 0), 0);
  const ivaPorc = Number(form.iva_porcentaje ?? 0);
  const ivaMonto = subtotal * (ivaPorc / 100);
  const total = subtotal + ivaMonto;
  const itemsConNombreSinPrecio = items.filter(it => it.product_name?.trim() && (!it.selected_price || Number(it.selected_price) === 0));

  const handleSave = async () => {
    if (isBloqueada) { setError("Status bloqueado, no se puede editar."); return; }
    setSaving(true);
    setError("");
    try {
      const fields: Record<string, unknown> = {};
      const editableKeys: Array<keyof Requisition> = [
        "cost_center_name", "instructions", "motivo_solicitud", "descripcion_compra",
        "forma_pago", "fecha_pago", "forma_entrega", "fecha_entrega",
        "foto_ticket_url", "monto", "total", "proveedor", "notas",
        "required_date", "subcategoria", "iva_porcentaje",
      ];
      for (const k of editableKeys) {
        const v = form[k];
        if (v !== undefined && v !== req[k]) fields[k as string] = v;
      }

      const itemsToSend = items.map(it => ({
        id: it._new ? undefined : it.id,
        product_name: it.product_name,
        unit: it.unit,
        quantity: Number(it.quantity || 1),
        selected_price: it.selected_price != null ? Number(it.selected_price) : null,
        comments: it.comments || null,
      }));

      const actor = (typeof window !== "undefined" && (localStorage.getItem("userDisplayName") || localStorage.getItem("userEmail"))) || "sistema";

      const res = await fetch("/api/requisicion/edit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: req.id,
          fields,
          items: itemsToSend,
          deleted_item_ids: deletedIds,
          actor,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Error guardando cambios");
        setSaving(false);
        return;
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <Loader2 className="w-8 h-8 animate-spin text-aria-accent" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-aria-bg rounded-2xl border border-white/10 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Editar requisicion {form.folio}</h3>
            <p className="text-xs text-[#7f93b0]">Status: <span className="font-mono">{form.status}</span> {isBloqueada && <span className="text-red-400">- BLOQUEADA</span>}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.06] text-[#7f93b0] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-sm">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Obra (centro de costo)" value={form.cost_center_name || ""} onChange={v => setF("cost_center_name", v)} disabled={isBloqueada} />
            <Field label="Subcategoria" value={form.subcategoria || ""} onChange={v => setF("subcategoria", v)} disabled={isBloqueada} />
            <Field label="Forma de pago" value={form.forma_pago || ""} onChange={v => setF("forma_pago", v)} disabled={isBloqueada} />
            <Field label="Fecha de pago" type="date" value={form.fecha_pago || ""} onChange={v => setF("fecha_pago", v)} disabled={isBloqueada} />
            <Field label="Forma entrega" value={form.forma_entrega || ""} onChange={v => setF("forma_entrega", v)} disabled={isBloqueada} />
            <Field label="Fecha entrega" type="date" value={form.fecha_entrega || ""} onChange={v => setF("fecha_entrega", v)} disabled={isBloqueada} />
            <Field label="Proveedor" value={form.proveedor || ""} onChange={v => setF("proveedor", v)} disabled={isBloqueada} />
            <Field label="Foto ticket URL" value={form.foto_ticket_url || ""} onChange={v => setF("foto_ticket_url", v)} disabled={isBloqueada} />
          </div>

          <FieldArea label="Instrucciones" value={form.instructions || ""} onChange={v => setF("instructions", v)} disabled={isBloqueada} />
          <FieldArea label="Motivo solicitud" value={form.motivo_solicitud || ""} onChange={v => setF("motivo_solicitud", v)} disabled={isBloqueada} />
          <FieldArea label="Descripcion compra" value={form.descripcion_compra || ""} onChange={v => setF("descripcion_compra", v)} disabled={isBloqueada} />
          <FieldArea label="Notas" value={form.notas || ""} onChange={v => setF("notas", v)} disabled={isBloqueada} />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">Items / Conceptos</h4>
              <button onClick={addItem} disabled={isBloqueada} className="px-3 py-1 rounded-lg bg-aria-accent/20 hover:bg-aria-accent/30 text-aria-accent text-xs flex items-center gap-1 disabled:opacity-50"><Plus className="w-3.5 h-3.5" />Agregar</button>
            </div>
            <div className="rounded-xl bg-black/20 border border-white/10 overflow-hidden">
              <div className="grid grid-cols-[2fr_70px_60px_100px_100px_1fr_30px] gap-2 px-3 py-2 text-[10px] uppercase text-[#7f93b0] border-b border-white/5">
                <div>Producto</div><div>Unidad</div><div>Cant.</div><div className="text-right">Precio</div><div className="text-right">Subtotal</div><div>Obs.</div><div></div>
              </div>
              {items.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#7f93b0]">Sin items. Click Agregar.</div>
              ) : items.map((it, idx) => {
                const subt = Number(it.quantity || 0) * Number(it.selected_price || 0);
                return (
                  <div key={it.id ?? `new-${idx}`} className="grid grid-cols-[2fr_70px_60px_100px_100px_1fr_30px] gap-2 px-3 py-2 text-xs border-b border-white/5 items-center">
                    <input value={it.product_name} onChange={e => updateItem(idx, { product_name: e.target.value })} disabled={isBloqueada} className="bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-white" />
                    <input value={it.unit} onChange={e => updateItem(idx, { unit: e.target.value })} disabled={isBloqueada} className="bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-white text-center" />
                    <input type="number" value={it.quantity} onChange={e => updateItem(idx, { quantity: Number(e.target.value) })} disabled={isBloqueada} className="bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-white text-center" />
                    <input type="number" step="0.01" value={it.selected_price ?? ""} onChange={e => updateItem(idx, { selected_price: e.target.value === "" ? null : Number(e.target.value) })} disabled={isBloqueada} className="bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-white text-right" />
                    <div className="text-right text-aria-accent font-medium">{subt > 0 ? "$" + subt.toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-"}</div>
                    <input value={it.comments || ""} onChange={e => updateItem(idx, { comments: e.target.value })} disabled={isBloqueada} className="bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-white" />
                    <button onClick={() => removeItem(idx)} disabled={isBloqueada} className="p-1 rounded hover:bg-red-500/20 text-red-400 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                );
              })}
              {/* FIX 545: totales vivos (subtotal + IVA editable + total) + warning items sin precio */}
              {itemsConNombreSinPrecio.length > 0 && (
                <div className="mx-3 my-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                  ⚠️ {itemsConNombreSinPrecio.length} {itemsConNombreSinPrecio.length === 1 ? "concepto tiene" : "conceptos tienen"} precio en 0 — no sumarán al total ni al IVA. Captura el precio antes de guardar.
                </div>
              )}
              <div className="border-t border-white/10 bg-white/[0.02] px-3 py-3 space-y-1.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-[#7f93b0]">Subtotal:</span>
                  <span className="text-white font-medium">${subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[#7f93b0]">IVA:</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={ivaPorc}
                      onChange={(e) => setF("iva_porcentaje", Number(e.target.value))}
                      disabled={isBloqueada}
                      className="px-2 py-1 rounded bg-black/40 border border-white/15 text-white text-xs outline-none focus:border-aria-accent disabled:opacity-50"
                    >
                      <option value={0}>0%</option>
                      <option value={3}>3%</option>
                      <option value={7}>7%</option>
                      <option value={8}>8%</option>
                      <option value={10}>10%</option>
                      <option value={11}>11%</option>
                      <option value={16}>16%</option>
                    </select>
                    <span className="text-white font-medium w-24 text-right">${ivaMonto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center border-t border-white/[0.08] pt-2 mt-1">
                  <span className="text-white font-bold">TOTAL:</span>
                  <span className="text-emerald-400 font-bold text-base">${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-sm text-[#c9d8ed]">Cancelar</button>
          <button onClick={handleSave} disabled={saving || isBloqueada} className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-sm font-medium flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, disabled, type = "text" }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; type?: string }) {
  return (
    <div>
      <label className="text-[10px] uppercase text-[#7f93b0] block mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50" />
    </div>
  );
}

function FieldArea({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <label className="text-[10px] uppercase text-[#7f93b0] block mb-1">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white h-20 disabled:opacity-50" />
    </div>
  );
}
