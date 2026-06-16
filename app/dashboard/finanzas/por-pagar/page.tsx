"use client";
import { clientLogger } from "@/lib/client-logger";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { registrarPagoOC } from "@/lib/finanzas-payments";
import { uploadComprobantePago } from "@/lib/storage";
import { DollarSign, Clock, AlertTriangle, CheckCircle2, Search, Calendar, Loader2, X, Paperclip } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { fmtMoney } from "@/lib/formatters";
import { getEntityColor } from "@/lib/entity-colors";
import CanonPageHeader from "@/components/ui/CanonPageHeader";
import KpiCard from "@/components/ui/KpiCard";

interface CuentaPorPagar {
  id: string;
  folio: string;
  supplier_name: string;
  total: number;
  monto_pagado: number;
  saldo: number;
  created_at: string;
  obra_nombre: string;
  dias_credito: number;
  fecha_vencimiento: string;
  vencida: boolean;
}

export default function PorPagarPage() {
  const log = clientLogger("POR-PAGAR");
  const [cuentas, setCuentas] = useState<CuentaPorPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("TODOS");
  const [pagando, setPagando] = useState<string | null>(null);
  const [pagoModal, setPagoModal] = useState<{ id: string; total: number; pagado: number; saldo: number } | null>(null);
  const [pagoMonto, setPagoMonto] = useState("");
  const [pagoMetodo, setPagoMetodo] = useState("Transferencia");
  const [pagoReferencia, setPagoReferencia] = useState("");
  const [pagoComprobante, setPagoComprobante] = useState<File | null>(null);
  const [pagoSaving, setPagoSaving] = useState(false);
  const { msg, flash, clear } = useFlashMessage();

  // 21-Abr-2026: filtro por metodo via query param (?metodo=EFECTIVO|TRANSFERENCIA)
  const [filterMetodo, setFilterMetodo] = useState<string>("TODOS");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const qs = new URLSearchParams(window.location.search);
    const m = qs.get("metodo");
    if (m) setFilterMetodo(m.toUpperCase());
  }, []);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: ocs } = await supabase.from("purchase_orders").select("*").order("created_at", { ascending: false });
      const hoy = new Date();

      const processed = (ocs || []).map((oc: Record<string, unknown>) => {
        const pagado = (oc.monto_pagado as number) || 0;
        const total = (oc.total as number) || 0;
        const saldo = total - pagado;
        const diasCredito = (oc.dias_credito as number) || 30;
        const fechaCreacion = new Date(oc.created_at as string);
        const fechaVenc = new Date(fechaCreacion);
        fechaVenc.setDate(fechaVenc.getDate() + diasCredito);
        const vencida = hoy > fechaVenc && saldo > 0;

        return {
          id: (oc.id as string) || "",
          folio: (oc.po_number as string) || "",
          supplier_name: (oc.supplier_name as string) || "",
          total,
          monto_pagado: pagado,
          saldo,
          created_at: (oc.created_at as string) || "",
          obra_nombre: (oc.obra_nombre as string) || "",
          dias_credito: diasCredito,
          fecha_vencimiento: fechaVenc.toISOString(),
          vencida,
          ultimo_pago_metodo: (oc.ultimo_pago_metodo as string) || "", // FIX P1: filtro metodo pago no matcheaba
        } as CuentaPorPagar;
      }).filter((oc: CuentaPorPagar) => oc.saldo > 0);

      setCuentas(processed);
    } catch (e: unknown) { log.error("Error loading cuentas por pagar", { error: e }); }
    finally { setLoading(false); }
  }

  const totalPorPagar = cuentas.reduce((s, c) => s + c.saldo, 0);
  const vencidas = cuentas.filter(c => c.vencida);
  const porVencer = cuentas.filter(c => !c.vencida);
  const totalVencido = vencidas.reduce((s, c) => s + c.saldo, 0);

  const filtered = cuentas.filter(c => {
    const matchSearch = !search || c.folio?.toLowerCase().includes(search.toLowerCase()) || c.supplier_name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "TODOS" || (filter === "VENCIDAS" && c.vencida) || (filter === "VIGENTES" && !c.vencida);
    // 21-Abr-2026: filtro por metodo del ultimo pago registrado
    const metodoOC = (c as unknown as { ultimo_pago_metodo?: string }).ultimo_pago_metodo || "";
    const matchMetodo = filterMetodo === "TODOS" || metodoOC.toUpperCase() === filterMetodo;
    return matchSearch && matchFilter && matchMetodo;
  });

  const diasRestantes = (fecha: string) => {
    const diff = Math.ceil((new Date(fecha).getTime() - Date.now()) / (1000*60*60*24));
    return diff;
  };


  function abrirPagoModal(id: string, total: number, pagado: number) {
    const saldo = +(total - pagado).toFixed(2);
    setPagoModal({ id, total, pagado, saldo });
    setPagoMonto(String(saldo));
    setPagoMetodo("Transferencia");
    setPagoReferencia("");
    setPagoComprobante(null);
  }

  async function confirmarPago() {
    if (!pagoModal) return;
    const monto = Number(pagoMonto);
    if (isNaN(monto) || monto <= 0) return;

    // 21-Abr-2026: comprobante obligatorio en Transferencia
    if (pagoMetodo === "Transferencia" && !pagoComprobante) {
      flash("err", "Para pago por Transferencia es obligatorio adjuntar comprobante.");
      return;
    }

    setPagoSaving(true);
    try {
      let comprobanteUrl: string | undefined = undefined;
      if (pagoComprobante) {
        comprobanteUrl = await uploadComprobantePago(pagoComprobante, ["oc", pagoModal.id]);
      }

      await registrarPagoOC({
        ocId: pagoModal.id,
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

  return (
    <div className="aria-page-canon space-y-6 max-w-7xl mx-auto">
      <FlashBanner msg={msg} className="mx-6 mt-3" />
      <CanonPageHeader
        title="Cuentas por Pagar"
        subtitle="Saldos pendientes con proveedores y antiguedad"
        backHref="/dashboard/finanzas"
        icon={<DollarSign className="w-6 h-6" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Total por Pagar" value={loading ? "..." : `$${totalPorPagar.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} variant="neutral" />
        <KpiCard label="Vencido" value={loading ? "..." : `$${totalVencido.toLocaleString()}`} icon={<AlertTriangle className="w-5 h-5" />} variant="rose" />
        <KpiCard label="Cuentas Vencidas" value={loading ? "..." : vencidas.length} icon={<Clock className="w-5 h-5" />} variant="neutral" />
        <KpiCard label="Vigentes" value={loading ? "..." : porVencer.length} icon={<CheckCircle2 className="w-5 h-5" />} variant="emerald" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7f93b0]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por folio o proveedor..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-[#4a6080] focus:border-aria-primary/50 focus:outline-none" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["TODOS", "VENCIDAS", "VIGENTES"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? "bg-aria-primary-light text-aria-accent border border-aria-primary/30" : "bg-white/[0.04] text-[#7f93b0] border border-white/[0.08] hover:bg-white/[0.06]"}`}>
              {f}
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

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[rgba(4,8,16,0.98)] backdrop-blur z-10">
              <tr className="text-[#7f93b0] text-xs uppercase">
                <th className="text-left p-3">OC</th>
                <th className="text-left p-3">Proveedor</th>
                <th className="text-left p-3">Obra</th>
                <th className="text-right p-3">Total</th>
                <th className="text-right p-3">Pagado</th>
                <th className="text-right p-3">Saldo</th>
                <th className="text-center p-3">Vencimiento</th>
                <th className="text-center p-3">Estado</th>
                <th className="text-center p-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="p-8 text-center text-[#7f93b0]"><Loader2 className="w-6 h-6 animate-spin text-aria-accent mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-[#7f93b0]">Sin cuentas pendientes 🎉</td></tr>
              ) : filtered.map(c => {
                const dias = diasRestantes(c.fecha_vencimiento);
                return (
                  <tr key={c.id} className={`border-t border-white/[0.05] hover:bg-white/[0.02] ${c.vencida ? "bg-red-500/[0.03]" : ""}`}>
                    <td className="p-3 text-white font-mono text-xs">{c.folio}</td>
                    <td className="p-3 text-white">{c.supplier_name}</td>
                    <td className="p-3">{c.obra_nombre ? <span className={`px-2 py-1 rounded-lg text-xs ${getEntityColor(c.obra_nombre)}`}>{c.obra_nombre}</span> : <span className="text-[#7f93b0]">—</span>}</td>
                    <td className="p-3 text-right text-[#c9d8ed]">{fmtMoney(c.total)}</td>
                    <td className="p-3 text-right text-aria-accent">{fmtMoney(c.monto_pagado)}</td>
                    <td className="p-3 text-right text-white font-medium">{fmtMoney(c.saldo)}</td>
                    <td className="p-3 text-center text-xs text-[#7f93b0]">
                      {new Date(c.fecha_vencimiento).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                    </td>
                    <td className="p-3 text-center">
                      {c.vencida ? (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full font-medium">Vencida {Math.abs(dias)}d</span>
                      ) : dias <= 7 ? (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full font-medium">Vence en {dias}d</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-aria-accent text-xs rounded-full font-medium">Vigente {dias}d</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {c.saldo > 0 && (
                        <button
                          onClick={() => abrirPagoModal(c.id, c.total, c.monto_pagado)}
                          disabled={pagando === c.id}
                          className="px-3 py-1 bg-emerald-500/20 text-aria-accent rounded text-xs hover:bg-aria-primary/30 disabled:opacity-50"
                        >
                          {pagando === c.id ? "..." : "Pagar"}
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

      {pagoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 ">
          <div className="bg-[#0a1628] border border-white/[0.08] rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
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
                <label className="block text-xs text-[#7f93b0] mb-1">Referencia (opcional)</label>
                <input type="text" value={pagoReferencia} onChange={e => setPagoReferencia(e.target.value)} placeholder="No. de referencia"
                  className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm focus:border-aria-primary/50 focus:outline-none" />
              </div>
              {/* 21-Abr-2026: comprobante obligatorio en Transferencia */}
              <div>
                <label className="block text-xs text-[#7f93b0] mb-1">
                  Comprobante {pagoMetodo === "Transferencia" ? <span className="text-red-400">*</span> : <span className="text-[#4a6080]">(opcional)</span>}
                </label>
                <input type="file" accept="image/*,.pdf"
                  onChange={e => setPagoComprobante(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-aria-primary/20 file:text-aria-accent hover:file:bg-aria-primary/30" />
                {pagoComprobante && <p className="text-xs text-[#7f93b0] mt-1 flex items-center gap-1"><Paperclip className="w-3 h-3" />{pagoComprobante.name}</p>}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setPagoModal(null)} className="flex-1 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[#c9d8ed] text-sm font-medium hover:bg-white/[0.06]">Cancelar</button>
              <button onClick={confirmarPago} disabled={pagoSaving || !pagoMonto || Number(pagoMonto) <= 0 || (pagoMetodo === "Transferencia" && !pagoComprobante)}
                className="flex-1 py-2.5 bg-aria-primary rounded-xl text-white text-sm font-medium hover:bg-aria-primary-hover disabled:opacity-50">
                {pagoSaving ? "Guardando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
