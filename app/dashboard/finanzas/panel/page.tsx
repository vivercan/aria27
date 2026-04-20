"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Wallet, AlertTriangle, TrendingUp, Loader2 } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";
import { fmtMoney } from "@/lib/formatters";

const fmt = (n: number) => fmtMoney(n, { noDecimals: true });

interface CobroRow {
  cliente_nombre: string | null;
  obra_nombre: string | null;
  monto: number | null;
  saldo: number | null;
  created_at: string;
  estatus: string;
}

interface PurchaseOrderRow {
  supplier_name: string | null;
  total: number | null;
  monto_pagado: number | null;
  status: string;
  created_at: string;
}

interface KPIState {
  cobrado30: number;
  porCobrar: number;
  vencido30: number;
  ocPendPay: number;
  ocPagadas30: number;
  saldosObras: Array<{ obra: string; saldo: number }>;
  topDeudores: Array<{ cliente: string; saldo: number }>;
  topProveedores: Array<{ proveedor: string; saldo: number }>;
}

export default function PanelFinanzas() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIState>({
    cobrado30: 0, porCobrar: 0, vencido30: 0,
    ocPendPay: 0, ocPagadas30: 0,
    saldosObras: [],
    topDeudores: [],
    topProveedores: [],
  });

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const hoy = new Date();
    const d30 = new Date(hoy); d30.setDate(d30.getDate() - 30);

    // Cobros
    const { data: cobs } = await supabase.from("cobros_manuales").select("cliente_nombre,obra_nombre,monto,saldo,created_at,estatus").neq("estatus", "CANCELADO");
    const cobsRows = (cobs || []) as CobroRow[];
    const cobrado30 = cobsRows.filter((c) => new Date(c.created_at) >= d30).reduce((s: number, c) => s + ((Number(c.monto) || 0) - (Number(c.saldo) || 0)), 0);
    const porCobrar = cobsRows.reduce((s: number, c) => s + (Number(c.saldo) || 0), 0);
    const vencido30 = cobsRows.filter((c) => (Number(c.saldo) || 0) > 0 && new Date(c.created_at) < d30).reduce((s: number, c) => s + (Number(c.saldo) || 0), 0);

    // OCs
    const { data: pos } = await supabase.from("purchase_orders").select("supplier_name,total,monto_pagado,status,created_at").neq("status", "CANCELADA");
    const posRows = (pos || []) as PurchaseOrderRow[];
    const ocPendPay = posRows.reduce((s: number, p) => s + ((Number(p.total) || 0) - (Number(p.monto_pagado) || 0)), 0);
    const ocPagadas30 = posRows.filter((p) => new Date(p.created_at) >= d30).reduce((s: number, p) => s + (Number(p.monto_pagado) || 0), 0);

    // Top deudores
    const deudoresMap: Record<string, number> = {};
    cobsRows.forEach((c) => {
      const k = c.cliente_nombre || "—";
      deudoresMap[k] = (deudoresMap[k] || 0) + (Number(c.saldo) || 0);
    });
    const topDeudores = Object.entries(deudoresMap).map(([cliente, saldo]) => ({ cliente, saldo })).filter(d => d.saldo > 0).sort((a, b) => b.saldo - a.saldo).slice(0, 5);

    // Top proveedores con saldo
    const provMap: Record<string, number> = {};
    posRows.forEach((p) => {
      const k = p.supplier_name || "—";
      const saldo = (Number(p.total) || 0) - (Number(p.monto_pagado) || 0);
      if (saldo > 0) provMap[k] = (provMap[k] || 0) + saldo;
    });
    const topProveedores = Object.entries(provMap).map(([proveedor, saldo]) => ({ proveedor, saldo })).sort((a, b) => b.saldo - a.saldo).slice(0, 5);

    // Saldos por obra
    const obraMap: Record<string, number> = {};
    cobsRows.forEach((c) => {
      const k = c.obra_nombre || "—";
      obraMap[k] = (obraMap[k] || 0) + (Number(c.saldo) || 0);
    });
    const saldosObras = Object.entries(obraMap).map(([obra, saldo]) => ({ obra, saldo })).filter(o => o.saldo > 0).sort((a, b) => b.saldo - a.saldo).slice(0, 8);

    setKpis({ cobrado30, porCobrar, vencido30, ocPendPay, ocPagadas30, saldosObras, topDeudores, topProveedores });
    setLoading(false);
  }

  return (
    <div className="h-full flex flex-col overflow-hidden p-6">
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <AriaBackButton href="/dashboard/finanzas" />
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Wallet className="w-6 h-6 text-emerald-400" /> Panel Finanzas</h1>
          <p className="text-sm text-[#7f93b0]">Vista director financiero · cobranza, cuentas por pagar y saldos</p>
        </div>
      </div>

      {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-aria-accent" /></div> : (
      <div className="flex-1 overflow-y-auto space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <KPI label="Cobrado 30d" value={fmt(kpis.cobrado30)} color="emerald" />
          <KPI label="Por cobrar" value={fmt(kpis.porCobrar)} color="amber" />
          <KPI label="Vencido >30d" value={fmt(kpis.vencido30)} color="red" />
          <KPI label="OC por pagar" value={fmt(kpis.ocPendPay)} color="orange" />
          <KPI label="Pagado 30d" value={fmt(kpis.ocPagadas30)} color="violet" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Section title="Top deudores" icon={AlertTriangle}>
            {kpis.topDeudores.map((d, i) => (
              <Row key={i} label={d.cliente} value={fmt(d.saldo)} color="red" />
            ))}
            {kpis.topDeudores.length === 0 && <div className="text-xs text-[#4a6080]">Sin saldos</div>}
          </Section>
          <Section title="Top proveedores con saldo" icon={Wallet}>
            {kpis.topProveedores.map((p, i) => (
              <Row key={i} label={p.proveedor} value={fmt(p.saldo)} color="orange" />
            ))}
            {kpis.topProveedores.length === 0 && <div className="text-xs text-[#4a6080]">Sin saldos</div>}
          </Section>
          <Section title="Saldos por obra" icon={TrendingUp}>
            {kpis.saldosObras.map((o, i) => (
              <Row key={i} label={o.obra} value={fmt(o.saldo)} color="amber" />
            ))}
            {kpis.saldosObras.length === 0 && <div className="text-xs text-[#4a6080]">Sin saldos</div>}
          </Section>
        </div>
      </div>
      )}
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`p-3 rounded-lg bg-${color}-500/10 border border-${color}-500/20`}>
      <p className="text-xs text-[#7f93b0]">{label}</p>
      <p className={`text-lg font-bold text-${color}-300`}>{value}</p>
    </div>
  );
}
function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className: string }>; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-4">
      <div className="flex items-center gap-2 mb-3"><Icon className="w-4 h-4 text-[#7f93b0]" /><h3 className="text-sm font-semibold text-white">{title}</h3></div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-[#c9d8ed] truncate flex-1">{label}</span>
      <span className={`font-semibold text-${color}-300 flex-shrink-0`}>{value}</span>
    </div>
  );
}
