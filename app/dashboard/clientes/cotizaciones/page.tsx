"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Search, Loader2, X, FileText, CheckCircle2, Clock, AlertTriangle, Trash2, Printer } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";
import ConfirmModal from "@/components/ConfirmModal";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/lib/use-flash-message";

interface Cliente { id: string; nombre: string; estatus: string; }
interface Obra    { id: string; nombre: string; activo: boolean; }
interface Item    { id?: string; concepto: string; unidad: string; cantidad: number; precio_unitario: number; importe: number; orden: number; }
interface Cotizacion {
  id: string;
  folio: string | null;
  cliente_id: string | null;
  cliente_nombre: string;
  obra_id: string | null;
  obra_nombre: string | null;
  fecha: string;
  vigencia_dias: number;
  moneda: string;
  subtotal: number;
  iva: number;
  total: number;
  estatus: string;
  notas: string | null;
  created_at: string;
}

const ESTATUS = ["BORRADOR", "ENVIADA", "APROBADA", "RECHAZADA", "CANCELADA", "VENCIDA"] as const;

const FORM_INIT = {
  folio: "",
  cliente_id: "",
  obra_id: "",
  fecha: new Date().toISOString().split("T")[0],
  vigencia_dias: 30,
  moneda: "MXN",
  estatus: "BORRADOR" as (typeof ESTATUS)[number],
  notas: "",
  iva_pct: 16,
};

const ITEM_INIT: Item = { concepto: "", unidad: "PZA", cantidad: 1, precio_unitario: 0, importe: 0, orden: 0 };

export default function CotizacionesClientesPage() {
  const { msg, flash, clear } = useFlashMessage();
  const [confirmState, setConfirmState] = useState<{ open: boolean; msg: string; onOk: () => void }>({ open: false, msg: "", onOk: () => {} });
  const [cots, setCots] = useState<Cotizacion[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("TODOS");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...FORM_INIT });
  const [items, setItems] = useState<Item[]>([{ ...ITEM_INIT }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const [c, cli, ob] = await Promise.all([
        supabase.from("cotizaciones_clientes").select("*").order("fecha", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("clientes").select("id, nombre, estatus").order("nombre"),
        supabase.from("centros_trabajo").select("id, nombre, activo").order("nombre"),
      ]);
      if (c.error?.code === "42P01" || c.error?.code === "PGRST205") {
        flash("err", "Falta crear tabla cotizaciones_clientes en Supabase.");
      }
      // Auto VENCIDA en lectura: si hoy > fecha + vigencia_dias y estatus es BORRADOR/ENVIADA, mostrar como VENCIDA
      const hoy = new Date().toISOString().split("T")[0];
      const cotsConVencidas = ((c.data as Cotizacion[]) || []).map(co => {
        if (["BORRADOR", "ENVIADA"].includes(co.estatus)) {
          const limite = new Date(co.fecha);
          limite.setDate(limite.getDate() + (co.vigencia_dias || 30));
          if (limite.toISOString().split("T")[0] < hoy) return { ...co, estatus: "VENCIDA" };
        }
        return co;
      });
      setCots(cotsConVencidas);
      setClientes((cli.data as Cliente[]) || []);
      setObras((ob.data as Obra[]) || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function abrirNuevo() {
    setEditId(null);
    setForm({ ...FORM_INIT });
    setItems([{ ...ITEM_INIT }]);
    setShowForm(true);
  }

  async function abrirEdicion(c: Cotizacion) {
    setEditId(c.id);
    setForm({
      folio: c.folio || "",
      cliente_id: c.cliente_id || "",
      obra_id: c.obra_id || "",
      fecha: c.fecha,
      vigencia_dias: c.vigencia_dias || 30,
      moneda: c.moneda || "MXN",
      estatus: (c.estatus as any) || "BORRADOR",
      notas: c.notas || "",
      iva_pct: c.subtotal > 0 ? Math.round((Number(c.iva) / Number(c.subtotal)) * 100) : 16,
    });
    const { data: rows } = await supabase.from("cotizaciones_clientes_items")
      .select("*").eq("cotizacion_id", c.id).order("orden", { ascending: true });
    setItems(((rows as any[]) || []).map(r => ({
      id: r.id, concepto: r.concepto, unidad: r.unidad || "", cantidad: Number(r.cantidad), precio_unitario: Number(r.precio_unitario), importe: Number(r.importe), orden: r.orden ?? 0,
    })));
    if (!rows || rows.length === 0) setItems([{ ...ITEM_INIT }]);
    setShowForm(true);
  }

  function actualizarItem(idx: number, patch: Partial<Item>) {
    setItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      next[idx].importe = +(Number(next[idx].cantidad || 0) * Number(next[idx].precio_unitario || 0)).toFixed(2);
      return next;
    });
  }
  function agregarItem() { setItems(prev => [...prev, { ...ITEM_INIT, orden: prev.length }]); }
  function quitarItem(idx: number) { setItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev); }

  const subtotal = items.reduce((s, i) => s + Number(i.importe || 0), 0);
  const iva = +(subtotal * (form.iva_pct / 100)).toFixed(2);
  const total = +(subtotal + iva).toFixed(2);

  async function guardar() {
    if (!form.cliente_id) { flash("err", "Selecciona un cliente"); return; }
    if (!form.fecha) { flash("err", "Fecha es requerida"); return; }
    if (isNaN(form.vigencia_dias) || form.vigencia_dias <= 0) { flash("err", "Vigencia debe ser mayor a 0"); return; }
    if (isNaN(form.iva_pct) || form.iva_pct < 0 || form.iva_pct > 100) { flash("err", "% IVA debe estar entre 0 y 100"); return; }

    const cli = clientes.find(c => c.id === form.cliente_id);
    if (!cli) { flash("err", "Cliente no encontrado"); return; }
    if (cli.estatus !== "ACTIVO") {
      flash("err", `El cliente "${cli.nombre}" está INACTIVO. No se permite registrar nueva cotización.`);
      return;
    }
    const itemsValidos = items.filter(i => i.concepto.trim() && Number(i.cantidad) > 0 && Number(i.precio_unitario) >= 0);
    if (itemsValidos.length === 0) { flash("err", "Agrega al menos un concepto válido con cantidad y precio"); return; }

    const obra = form.obra_id ? obras.find(o => o.id === form.obra_id) : null;

    // Folio: si no se dio, derivado YYYY-#### (incrementado por count)
    let folio = form.folio.trim();
    if (!folio) {
      const yr = new Date().getFullYear();
      const { count } = await supabase.from("cotizaciones_clientes").select("id", { count: "exact", head: true });
      folio = `COT-${yr}-${String((count || 0) + 1).padStart(4, "0")}`;
    }

    const payload: any = {
      folio,
      cliente_id: form.cliente_id,
      cliente_nombre: cli.nombre,
      obra_id: form.obra_id || null,
      obra_nombre: obra?.nombre || null,
      fecha: form.fecha,
      vigencia_dias: form.vigencia_dias,
      moneda: form.moneda,
      subtotal,
      iva,
      total,
      estatus: form.estatus,
      notas: form.notas || null,
    };
    if (!editId) {
      payload.created_by = (typeof window !== "undefined" && localStorage.getItem("userEmail")) || null;
    }

    setSaving(true);
    try {
      let cotId = editId;
      if (editId) {
        const { error } = await supabase.from("cotizaciones_clientes").update(payload).eq("id", editId);
        if (error) throw error;
        // Reescribir items: borrar todos y re-insertar (simple y consistente)
        await supabase.from("cotizaciones_clientes_items").delete().eq("cotizacion_id", editId);
      } else {
        const { data, error } = await supabase.from("cotizaciones_clientes").insert(payload).select("id").single();
        if (error) throw error;
        cotId = (data as any).id;
      }
      const itemsPayload = itemsValidos.map((i, idx) => ({
        cotizacion_id: cotId,
        orden: idx,
        concepto: i.concepto,
        unidad: i.unidad || null,
        cantidad: Number(i.cantidad),
        precio_unitario: Number(i.precio_unitario),
        importe: +(Number(i.cantidad) * Number(i.precio_unitario)).toFixed(2),
      }));
      const { error: ie } = await supabase.from("cotizaciones_clientes_items").insert(itemsPayload);
      if (ie) throw ie;

      setShowForm(false);
      setEditId(null);
      setForm({ ...FORM_INIT });
      setItems([{ ...ITEM_INIT }]);
      await cargar();
    } catch (e: unknown) {
      flash("err", "Error: " + (e?.message || "desconocido"));
    } finally {
      setSaving(false);
    }
  }

  async function imprimirCotizacion(c: Cotizacion) {
    // Cargar items + datos del cliente (para contacto)
    const [itemsRes, cliRes] = await Promise.all([
      supabase.from("cotizaciones_clientes_items").select("*").eq("cotizacion_id", c.id).order("orden", { ascending: true }),
      c.cliente_id ? supabase.from("clientes").select("contacto, telefono, email").eq("id", c.cliente_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const its = (itemsRes.data as any[]) || [];
    const cliExtra = (cliRes as any).data || {};

    const fmt = (n: number) => `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
    const fechaLimite = new Date(c.fecha);
    fechaLimite.setDate(fechaLimite.getDate() + (c.vigencia_dias || 30));
    const vence = fechaLimite.toISOString().split("T")[0];
    const logoUrl = `${window.location.origin}/logo-cuavante.png`;

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${c.folio || "Cotización"}</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; color: #1a1a1a; padding: 32px; max-width: 800px; margin: 0 auto; font-size: 12px; position: relative; }
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 110px; color: rgba(220,38,38,0.08); font-weight: 900; pointer-events: none; z-index: 0; white-space: nowrap; }
  .header { display: flex; justify-content: space-between; border-bottom: 3px solid #1e40af; padding-bottom: 16px; margin-bottom: 24px; position: relative; z-index: 1; }
  .empresa { display: flex; gap: 14px; align-items: center; }
  .empresa img { height: 56px; width: auto; }
  .empresa h1 { margin: 0; color: #1e40af; font-size: 20px; }
  .sellos { margin-top: 28px; display: flex; gap: 12px; justify-content: flex-end; }
  .sello { border: 2px dashed #dc2626; color: #dc2626; padding: 8px 14px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
  .empresa p { margin: 2px 0; font-size: 11px; color: #555; }
  .doc-meta { text-align: right; }
  .doc-meta .folio { font-size: 18px; font-weight: bold; color: #1e40af; }
  .doc-meta p { margin: 2px 0; font-size: 11px; }
  .cliente-box { background: #f3f4f6; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; }
  .cliente-box .label { font-size: 10px; color: #6b7280; text-transform: uppercase; }
  .cliente-box .nombre { font-size: 14px; font-weight: 600; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th { background: #1e40af; color: white; text-align: left; padding: 8px; font-size: 11px; text-transform: uppercase; }
  td { border-bottom: 1px solid #e5e7eb; padding: 8px; font-size: 11px; }
  .totales { margin-top: 16px; margin-left: auto; width: 280px; }
  .totales .row { display: flex; justify-content: space-between; padding: 4px 0; }
  .totales .total { border-top: 2px solid #1e40af; padding-top: 8px; margin-top: 8px; font-size: 14px; font-weight: bold; color: #1e40af; }
  .notas { margin-top: 24px; padding: 12px; background: #fef3c7; border-left: 3px solid #f59e0b; font-size: 11px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #6b7280; text-align: center; }
  .estatus { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; background: #1e40af; color: white; }
  @media print { body { padding: 16px; } }
</style></head><body>
<div class="watermark">SIN VALOR FISCAL</div>
<div class="header">
  <div class="empresa">
    <img src="${logoUrl}" alt="Logo" onerror="this.style.display='none'" />
    <div>
      <h1>Grupo Constructor Urbano Avante</h1>
      <p>Aguascalientes, México</p>
      <p>aria.jjcrm27.com</p>
    </div>
  </div>
  <div class="doc-meta">
    <div class="folio">${c.folio || "COTIZACIÓN"}</div>
    <p><strong>Fecha:</strong> ${c.fecha}</p>
    <p><strong>Vigencia:</strong> ${c.vigencia_dias} días (vence ${vence})</p>
    <p><span class="estatus">${c.estatus}</span></p>
  </div>
</div>
<div class="cliente-box">
  <div class="label">Cliente</div>
  <div class="nombre">${c.cliente_nombre}</div>
  ${c.obra_nombre ? `<div class="label" style="margin-top:8px">Obra</div><div>${c.obra_nombre}</div>` : ""}
  ${cliExtra.contacto ? `<div class="label" style="margin-top:8px">Contacto</div><div>${cliExtra.contacto}${cliExtra.telefono ? ` — ${cliExtra.telefono}` : ""}</div>` : ""}
</div>
<table>
  <thead><tr><th>#</th><th>Concepto</th><th>Unidad</th><th style="text-align:right">Cantidad</th><th style="text-align:right">P. Unitario</th><th style="text-align:right">Importe</th></tr></thead>
  <tbody>
    ${its.map((it, idx) => `<tr>
      <td>${idx + 1}</td>
      <td>${(it.concepto || "").replace(/</g, "&lt;")}</td>
      <td>${it.unidad || ""}</td>
      <td style="text-align:right">${Number(it.cantidad).toLocaleString("es-MX")}</td>
      <td style="text-align:right">${fmt(it.precio_unitario)}</td>
      <td style="text-align:right">${fmt(it.importe)}</td>
    </tr>`).join("")}
  </tbody>
</table>
<div class="totales">
  <div class="row"><span>Subtotal:</span><span>${fmt(c.subtotal)}</span></div>
  <div class="row"><span>IVA:</span><span>${fmt(c.iva)}</span></div>
  <div class="row total"><span>TOTAL ${c.moneda}:</span><span>${fmt(c.total)}</span></div>
</div>
${c.notas ? `<div class="notas"><strong>Notas:</strong> ${c.notas.replace(/</g, "&lt;")}</div>` : ""}
<div class="sellos">
  <div class="sello">Sin valor fiscal</div>
  <div class="sello">Vigencia ${c.vigencia_dias} días</div>
</div>
<div class="footer">Documento generado el ${new Date().toLocaleString("es-MX")} — ARIA27</div>
<script>window.onload = function() { setTimeout(function(){ window.print(); }, 300); }</script>
</body></html>`;

    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { flash("err", "Pop-up bloqueado. Permite ventanas emergentes para esta página."); return; }
    w.document.write(html);
    w.document.close();
  }

  async function cambiarEstatus(c: Cotizacion, nuevo: string) {
    if (c.estatus === nuevo) return;
    if (nuevo === "CANCELADA") {
      setConfirmState({
        open: true,
        msg: `Cancelar cotización ${c.folio}?`,
        onOk: async () => {
          const { error } = await supabase.from("cotizaciones_clientes").update({ estatus: nuevo }).eq("id", c.id);
          if (error) { flash("err", "Error: " + error.message); return; }
          await cargar();
        }
      });
      return;
    }
    const { error } = await supabase.from("cotizaciones_clientes").update({ estatus: nuevo }).eq("id", c.id);
    if (error) { flash("err", "Error: " + error.message); return; }

    // Bloque 12: al APROBAR, generar cobro_manual auto vinculado a esta cotizacion (idempotente)
    if (nuevo === "APROBADA") {
      try {
        const { data: existente } = await supabase
          .from("cobros_manuales")
          .select("id")
          .eq("cotizacion_id", c.id)
          .maybeSingle();
        if (!existente) {
          const monto = Number(c.total) || 0;
          if (monto > 0 && c.cliente_id) {
            const payload: any = {
              cliente_id: c.cliente_id,
              cliente_nombre: c.cliente_nombre,
              obra_id: c.obra_id || null,
              obra_nombre: c.obra_nombre || null,
              monto,
              saldo: monto,
              estatus: "PENDIENTE",
              referencia: `COT ${c.folio || c.id.slice(0, 8)}`,
              metodo: null,
              fecha: new Date().toISOString().split("T")[0],
              observaciones: `Generado automaticamente desde cotizacion ${c.folio || c.id.slice(0, 8)} al APROBAR.`,
              cotizacion_id: c.id,
              created_by: (typeof window !== "undefined" && localStorage.getItem("userEmail")) || null,
            };
            const { error: ce } = await supabase.from("cobros_manuales").insert(payload);
            if (ce) console.warn("[Bloque12] No se pudo generar cobro auto:", ce.message);
          }
        }
      } catch (e: unknown) {
        console.warn("[Bloque12] Error generando cobro auto:", e?.message);
      }
    }

    cargar();
  }

  const clientesActivos = clientes.filter(c => c.estatus === "ACTIVO");
  const obrasActivas = obras.filter(o => o.activo !== false);

  const filtered = cots.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.cliente_nombre?.toLowerCase().includes(q) || c.folio?.toLowerCase().includes(q) || c.obra_nombre?.toLowerCase().includes(q);
    const matchFilter = filter === "TODOS" || c.estatus === filter;
    return matchSearch && matchFilter;
  });

  const totTotal = cots.filter(c => !["CANCELADA", "RECHAZADA"].includes(c.estatus)).reduce((s, c) => s + Number(c.total || 0), 0);
  const totAprobado = cots.filter(c => c.estatus === "APROBADA").reduce((s, c) => s + Number(c.total || 0), 0);
  const totEnviado = cots.filter(c => c.estatus === "ENVIADA").reduce((s, c) => s + Number(c.total || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <FlashBanner msg={msg} className="mx-6 mt-3" />
      <AriaBackButton href="/dashboard/clientes" />

      <div className="sticky top-0 z-10 bg-gradient-to-b from-slate-950 via-slate-950/95 to-transparent pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cotizaciones a Cliente</h1>
          <p className="text-slate-400 text-sm">Cotizaciones formales a clientes — bloqueadas para clientes INACTIVOS</p>
        </div>
        <button onClick={abrirNuevo} className="px-4 py-2 bg-aria-primary-light text-aria-accent rounded-xl text-sm font-medium hover:bg-aria-primary-hover/30 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva Cotización
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Vigente", value: `$${totTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, icon: FileText, color: "text-aria-accent", bg: "bg-aria-primary/10" },
          { label: "Aprobadas", value: `$${totAprobado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Enviadas", value: `$${totEnviado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Registros", value: cots.length, icon: AlertTriangle, color: "text-violet-400", bg: "bg-violet-500/10" },
        ].map((s, i) => (
          <div key={i} className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-2`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
            <p className="text-xl font-bold text-white">{loading ? "..." : s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar folio, cliente, obra..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:border-aria-primary/50 focus:outline-none" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["TODOS", ...ESTATUS] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${filter === f ? "bg-aria-primary-light text-aria-accent border border-aria-primary/30" : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <tr className="text-slate-400 text-xs uppercase">
                <th className="text-left p-3">Folio</th>
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Obra</th>
                <th className="text-right p-3">Total</th>
                <th className="text-center p-3">Estatus</th>
                <th className="text-center p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-aria-accent mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">Sin cotizaciones</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3 text-white font-medium">{c.folio || c.id.slice(0, 8)}</td>
                  <td className="p-3 text-slate-300">{c.fecha}</td>
                  <td className="p-3 text-white">{c.cliente_nombre}</td>
                  <td className="p-3 text-slate-300">{c.obra_nombre || "-"}</td>
                  <td className="p-3 text-right text-white">${Number(c.total || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 text-center">
                    <select value={c.estatus} onChange={e => cambiarEstatus(c, e.target.value)}
                      className="px-2 py-1 rounded text-xs bg-white/5 border border-white/10 text-white focus:outline-none">
                      {ESTATUS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => imprimirCotizacion(c)} title="Imprimir / PDF"
                        className="p-1.5 bg-violet-500/20 text-violet-400 rounded hover:bg-violet-500/30">
                        <Printer className="w-3 h-3" />
                      </button>
                      <button onClick={() => abrirEdicion(c)} disabled={["CANCELADA"].includes(c.estatus)}
                        className="px-2 py-1 bg-aria-primary-light text-aria-accent rounded text-xs hover:bg-aria-primary-hover/30 disabled:opacity-30">
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-auto py-8">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-4xl mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">{editId ? "Editar Cotización" : "Nueva Cotización a Cliente"}</h3>
              <button onClick={() => { setShowForm(false); setEditId(null); }} className="p-1 rounded-lg hover:bg-white/10"><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Folio (opcional)</label>
                <input value={form.folio} onChange={e => setForm({ ...form, folio: e.target.value })} placeholder="Auto: COT-2026-0001"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Fecha *</label>
                <input type="date" required value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Vigencia (días) *</label>
                <input type="number" required min="1" value={form.vigencia_dias} onChange={e => setForm({ ...form, vigencia_dias: parseInt(e.target.value) || 30 })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Cliente *</label>
                <select value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm">
                  <option value="">— Selecciona cliente ACTIVO —</option>
                  {clientesActivos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                {clientes.length > clientesActivos.length && (
                  <p className="text-[11px] text-slate-500 mt-1">{clientes.length - clientesActivos.length} cliente(s) INACTIVO(s) ocultos.</p>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Obra (opcional)</label>
                <select value={form.obra_id} onChange={e => setForm({ ...form, obra_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm">
                  <option value="">— Sin vínculo —</option>
                  {obrasActivas.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
              </div>
            </div>

            {/* Items */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-slate-400">Conceptos</label>
                <button onClick={agregarItem} className="px-2 py-1 bg-aria-primary-light text-aria-accent rounded text-xs hover:bg-aria-primary-hover/30 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Agregar línea
                </button>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 text-[10px] uppercase">
                      <th className="text-left p-2">Concepto</th>
                      <th className="text-left p-2 w-20">Unidad</th>
                      <th className="text-right p-2 w-20">Cant.</th>
                      <th className="text-right p-2 w-28">P. Unit.</th>
                      <th className="text-right p-2 w-28">Importe</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx} className="border-t border-white/5">
                        <td className="p-1"><input required value={it.concepto} onChange={e => actualizarItem(idx, { concepto: e.target.value })} placeholder="Descripción"
                          className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs" /></td>
                        <td className="p-1"><input value={it.unidad} onChange={e => actualizarItem(idx, { unidad: e.target.value })}
                          className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs" /></td>
                        <td className="p-1"><input type="number" required step="0.01" min="0.01" value={it.cantidad} onChange={e => actualizarItem(idx, { cantidad: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs text-right" /></td>
                        <td className="p-1"><input type="number" required step="0.01" min="0" value={it.precio_unitario} onChange={e => actualizarItem(idx, { precio_unitario: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs text-right" /></td>
                        <td className="p-1 text-right text-emerald-400 font-medium">${it.importe.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                        <td className="p-1 text-center">
                          {items.length > 1 && (
                            <button onClick={() => quitarItem(idx)} className="p-1 text-red-400 hover:bg-red-500/20 rounded">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Estatus</label>
                <select value={form.estatus} onChange={e => setForm({ ...form, estatus: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm">
                  {ESTATUS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">% IVA *</label>
                <input type="number" required min="0" max="100" step="0.01" value={form.iva_pct} onChange={e => setForm({ ...form, iva_pct: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Moneda</label>
                <select value={form.moneda} onChange={e => setForm({ ...form, moneda: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm">
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="text-xs text-slate-400 mb-1 block">Notas</label>
                <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
              </div>
            </div>

            <div className="flex justify-end gap-6 mb-4 text-sm">
              <div className="text-slate-400">Subtotal: <span className="text-white font-medium">${subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span></div>
              <div className="text-slate-400">IVA ({form.iva_pct}%): <span className="text-white font-medium">${iva.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span></div>
              <div className="text-slate-300 text-base">Total: <span className="text-emerald-400 font-bold">${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span></div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowForm(false); setEditId(null); }}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-sm font-medium hover:bg-white/10">
                Cancelar
              </button>
              <button onClick={guardar} disabled={saving}
                className="flex-1 py-2.5 bg-aria-primary rounded-xl text-white text-sm font-medium hover:bg-aria-primary-hover disabled:opacity-50">
                {saving ? "Guardando..." : (editId ? "Actualizar" : "Crear Cotización")}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmState.open}
        message={confirmState.msg}
        onConfirm={() => {
          confirmState.onOk();
          setConfirmState(p => ({...p, open: false}));
        }}
        onCancel={() => setConfirmState(p => ({...p, open: false}))}
      />
    </div>
  );
}
