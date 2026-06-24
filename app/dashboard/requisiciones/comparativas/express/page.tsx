"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Send, Loader2, Zap } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";

interface Item { name: string; qty: number; unit: string }
interface Cot { supplier_name: string; precios: Record<string, number> }
interface Centro { id: string; nombre: string }
interface Proveedor { id: number; name: string }

export default function ComparativaExpressPage() {
  const router = useRouter();
  const { msg, flash } = useFlashMessage();
  const [centros, setCentros] = useState<Centro[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [obra, setObra] = useState("");
  const [motivo, setMotivo] = useState("");
  const [items, setItems] = useState<Item[]>([{ name: "", qty: 1, unit: "PZA" }]);
  const [cotizaciones, setCotizaciones] = useState<Cot[]>([
    { supplier_name: "", precios: {} },
    { supplier_name: "", precios: {} },
    { supplier_name: "", precios: {} },
  ]);
  const [enviando, setEnviando] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setUserEmail(localStorage.getItem("userEmail") || "");
    (async () => {
      const { data: c } = await supabase.from("centros_trabajo").select("id, nombre").order("nombre");
      setCentros((c as Centro[]) || []);
      const { data: p } = await supabase.from("suppliers").select("id, name").eq("active", true).order("name").limit(500);
      setProveedores((p as Proveedor[]) || []);
    })();
  }, []);

  const addItem = () => setItems(prev => [...prev, { name: "", qty: 1, unit: "PZA" }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, key: keyof Item, val: string | number) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [key]: val } : it));
  };

  const addCot = () => setCotizaciones(prev => [...prev, { supplier_name: "", precios: {} }]);
  const removeCot = (i: number) => setCotizaciones(prev => prev.filter((_, idx) => idx !== i));
  const updateCotSupplier = (i: number, name: string) => {
    setCotizaciones(prev => prev.map((c, idx) => idx === i ? { ...c, supplier_name: name } : c));
  };
  const updateCotPrecio = (i: number, itemName: string, precio: number) => {
    setCotizaciones(prev => prev.map((c, idx) => idx === i ? { ...c, precios: { ...c.precios, [itemName]: precio } } : c));
  };

  const totales = cotizaciones.map(c =>
    items.reduce((s, it) => s + ((Number(c.precios?.[it.name]) || 0) * (Number(it.qty) || 1)), 0)
  );
  const mejor = totales.length > 0 ? Math.min(...totales.filter(t => t > 0)) : 0;

  const enviar = async () => {
    if (!obra) { flash("err", "Selecciona la obra"); return; }
    if (!motivo.trim()) { flash("err", "Captura el motivo"); return; }
    const validItems = items.filter(it => it.name.trim() && (Number(it.qty) || 0) > 0);
    if (validItems.length === 0) { flash("err", "Agrega al menos 1 item con nombre y cantidad"); return; }
    const validCots = cotizaciones.filter(c => c.supplier_name.trim());
    if (validCots.length < 3) { flash("err", "Captura al menos 3 proveedores"); return; }
    setEnviando(true);
    try {
      const r = await fetch("/api/requisicion/express", {
        credentials: "include", method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify({
          obra_nombre: obra,
          motivo: motivo.trim(),
          items: validItems,
          cotizaciones: validCots,
          actor: userEmail,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) { flash("err", "Error: " + (j.error || "desconocido")); setEnviando(false); return; }
      flash("ok", "Comparativa Express enviada: " + j.folio + ". Direccion notificada.");
      setTimeout(() => router.push("/dashboard/requisiciones/comparativas/historial"), 2000);
    } catch (e) {
      flash("err", "Error de red: " + (e as Error).message);
      setEnviando(false);
    }
  };

  return (
    <div className="aria-page-canon h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <AriaBackButton href="/dashboard/requisiciones/compras" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-7 h-7 text-aria-accent" /> Comparativa Express
          </h1>
          <p className="text-xs text-[#7f93b0]">Captura cotizaciones obtenidas afuera del sistema y enviala directo a Direccion. Crea requi + comparativa en 1 paso.</p>
        </div>
      </div>

      <FlashBanner msg={msg} className="mb-3" />

      <div className="flex-1 overflow-y-auto space-y-5 pr-2">
        {/* SECCION 1: datos */}
        <section className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4 space-y-3">
          <h2 className="text-sm font-bold text-aria-accent uppercase tracking-wider">1. Datos de la requisicion</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#7f93b0] mb-1">Obra / Centro *</label>
              <select value={obra} onChange={e => setObra(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-aria-primary">
                <option value="">— Seleccionar —</option>
                {centros.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#7f93b0] mb-1">Motivo *</label>
              <input type="text" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: compra urgente, negociado afuera del sistema" className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-aria-primary" />
            </div>
          </div>
        </section>

        {/* SECCION 2: items */}
        <section className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-aria-accent uppercase tracking-wider">2. Items / Materiales</h2>
            <button onClick={addItem} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-aria-primary/20 text-aria-accent hover:bg-aria-primary/40 text-xs">
              <Plus className="w-3 h-3" /> Agregar
            </button>
          </div>
          <div className="space-y-2 max-h-72 overflow-auto">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_90px_30px] gap-2 items-center bg-black/20 rounded-lg p-2">
                <input type="text" placeholder="Descripcion del item" value={it.name} onChange={e => updateItem(i, "name", e.target.value)} className="bg-transparent text-sm outline-none border-b border-white/[0.08] pb-1 text-white" />
                <input type="number" min="0.01" step="0.01" placeholder="Cant" value={it.qty || ""} onChange={e => updateItem(i, "qty", Number(e.target.value))} className="bg-black/40 rounded px-2 py-1 text-center text-sm text-white" />
                <select value={it.unit} onChange={e => updateItem(i, "unit", e.target.value)} className="bg-black/40 rounded px-2 py-1 text-center text-sm text-white">
                  {["PZA","METRO","M2","M3","ML","SERVICIO","HORA","DIA","MES","KG","TON","LOTE","JGO","CAJA","SACO","BOLSA"].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <button onClick={() => removeItem(i)} disabled={items.length <= 1} className="rounded-full bg-red-500/40 hover:bg-red-500/70 p-1 disabled:opacity-30">
                  <Trash2 className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* SECCION 3: cotizaciones */}
        <section className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-aria-accent uppercase tracking-wider">3. Cotizaciones (minimo 3)</h2>
            <button onClick={addCot} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-aria-primary/20 text-aria-accent hover:bg-aria-primary/40 text-xs">
              <Plus className="w-3 h-3" /> Proveedor
            </button>
          </div>
          <div className="space-y-3">
            {cotizaciones.map((c, i) => (
              <div key={i} className={`rounded-lg p-3 border ${totales[i] > 0 && totales[i] === mejor ? "bg-emerald-500/10 border-emerald-500/40" : "bg-black/20 border-white/[0.08]"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-[#7f93b0]">Proveedor {i + 1}</span>
                  <input type="text" list={`prov-${i}`} placeholder="Nombre del proveedor" value={c.supplier_name} onChange={e => updateCotSupplier(i, e.target.value)} className="flex-1 bg-black/40 rounded px-2 py-1 text-sm text-white" />
                  <datalist id={`prov-${i}`}>{proveedores.map(p => <option key={p.id} value={p.name} />)}</datalist>
                  <button onClick={() => removeCot(i)} disabled={cotizaciones.length <= 3} className="rounded-full bg-red-500/40 hover:bg-red-500/70 p-1 disabled:opacity-30">
                    <Trash2 className="h-3 w-3 text-white" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {items.filter(it => it.name.trim()).map(it => (
                    <div key={it.name} className="flex items-center gap-2">
                      <span className="text-xs text-[#7f93b0] w-32 truncate">{it.name}</span>
                      <input type="number" min="0" step="0.01" placeholder="$ unit" value={c.precios?.[it.name] || ""} onChange={e => updateCotPrecio(i, it.name, Number(e.target.value))} className="flex-1 bg-black/40 rounded px-2 py-1 text-right text-sm text-white" />
                    </div>
                  ))}
                </div>
                {totales[i] > 0 && (
                  <div className="mt-2 text-right text-xs">
                    <span className="text-[#7f93b0]">Subtotal: </span>
                    <span className={`font-bold ${totales[i] === mejor ? "text-emerald-400" : "text-white"}`}>${totales[i].toLocaleString("es-MX",{minimumFractionDigits:2})}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Footer fijo */}
      <div className="flex-shrink-0 mt-4 flex items-center justify-between p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
        <div>
          {mejor > 0 && <p className="text-sm text-[#7f93b0]">Mejor precio total (sin IVA): <span className="text-emerald-400 font-bold">${mejor.toLocaleString("es-MX",{minimumFractionDigits:2})}</span></p>}
          <p className="text-xs text-[#4a6080] mt-1">Al enviar: se crea la requisicion + items + comparativa, y Direccion recibe email + WA con prefijo [EXPRESS].</p>
        </div>
        <button onClick={enviar} disabled={enviando} className="flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 font-medium">
          {enviando ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : <><Send className="w-4 h-4" /> Enviar Comparativa Express</>}
        </button>
      </div>
    </div>
  );
}
