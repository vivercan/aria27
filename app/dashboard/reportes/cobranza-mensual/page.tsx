"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Printer, Loader2 } from "lucide-react";
import Link from "next/link";
import AriaBackButton from "@/components/AriaBackButton";

const fmt = (n: number) => `$${(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

interface Row {
  cliente: string;
  obra: string;
  monto: number;
  saldo: number;
  cobrado: number;
  estatus: string;
  fecha: string;
}

function Content() {
  const sp = useSearchParams();
  const now = new Date();
  const mes = Number(sp.get("mes") || (now.getMonth() + 1));
  const anio = Number(sp.get("anio") || now.getFullYear());

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => { cargar(); }, [mes, anio]);

  async function cargar() {
    setLoading(true);
    const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
    const hastaDate = new Date(anio, mes, 0);
    const hasta = `${anio}-${String(mes).padStart(2, "0")}-${String(hastaDate.getDate()).padStart(2, "0")}`;
    const { data } = await supabase
      .from("cobros_manuales")
      .select("cliente_nombre,obra_nombre,monto,saldo,estatus,created_at")
      .gte("created_at", desde)
      .lte("created_at", hasta + "T23:59:59")
      .neq("estatus", "CANCELADO")
      .order("created_at", { ascending: true });
    setRows((data || []).map((c: Record<string, unknown>) => ({
      cliente: (c.cliente_nombre as string) || "—",
      obra: (c.obra_nombre as string) || "—",
      monto: Number(c.monto) || 0,
      saldo: Number(c.saldo) || 0,
      cobrado: (Number(c.monto) || 0) - (Number(c.saldo) || 0),
      estatus: (c.estatus as string) || "—",
      fecha: ((c.created_at as string) || "").slice(0, 10),
    })));
    setLoading(false);
  }

  const totMonto = rows.reduce((s, r) => s + r.monto, 0);
  const totCobrado = rows.reduce((s, r) => s + r.cobrado, 0);
  const totSaldo = rows.reduce((s, r) => s + r.saldo, 0);
  const porObra: Record<string, { monto: number; cobrado: number; saldo: number }> = {};
  rows.forEach(r => {
    if (!porObra[r.obra]) porObra[r.obra] = { monto: 0, cobrado: 0, saldo: 0 };
    porObra[r.obra].monto += r.monto;
    porObra[r.obra].cobrado += r.cobrado;
    porObra[r.obra].saldo += r.saldo;
  });

  const fechaGen = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-aria-accent" /></div>;

  return (
    <>
      <div className="no-print sticky top-0 z-20 bg-[#040810]/90 backdrop-blur border-b border-white/[0.08] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AriaBackButton href="/dashboard/reportes" />
          <div className="text-white text-sm">Cobranza mensual · <b>{MESES[mes-1]} {anio}</b></div>
        </div>
        <div className="flex items-center gap-2">
          <select value={mes} onChange={e => { const u = new URL(window.location.href); u.searchParams.set("mes", e.target.value); window.location.href = u.toString(); }} className="px-2 py-1 rounded bg-[#0c1d38] text-white text-xs border border-white/[0.08]">
            {MESES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={anio} onChange={e => { const u = new URL(window.location.href); u.searchParams.set("anio", e.target.value); window.location.href = u.toString(); }} className="px-2 py-1 rounded bg-[#0c1d38] text-white text-xs border border-white/[0.08]">
            {[2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-aria-primary hover:bg-aria-primary-hover text-white text-sm"><Printer className="w-4 h-4" /> Imprimir / PDF</button>
        </div>
      </div>

      <div className="report-page mx-auto bg-white text-slate-900" style={{ maxWidth: "850px", padding: "32px", fontFamily: "Arial, sans-serif" }}>
        <div style={{ borderBottom: "3px solid #0f172a", paddingBottom: "16px", marginBottom: "20px", display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: "#0f172a" }}>ARIA27 ERP</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>Grupo Constructor Urbano Avante</div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1e3a5f", margin: "12px 0 4px 0" }}>Reporte de Cobranza Mensual</h1>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>{MESES[mes-1]} {anio}</div>
          </div>
          <div style={{ textAlign: "right", fontSize: "10px", color: "#64748b" }}>Generado: {fechaGen}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "20px" }}>
          <KPI label="Facturado" value={fmt(totMonto)} color="#0891b2" />
          <KPI label="Cobrado" value={fmt(totCobrado)} color="#059669" />
          <KPI label="Por Cobrar" value={fmt(totSaldo)} color="#f59e0b" />
        </div>

        <Section title="Resumen por obra">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead><tr style={{ background: "#1e3a5f", color: "white" }}>
              <th style={{ padding: "8px", textAlign: "left" }}>Obra</th>
              <th style={{ padding: "8px", textAlign: "right" }}>Facturado</th>
              <th style={{ padding: "8px", textAlign: "right" }}>Cobrado</th>
              <th style={{ padding: "8px", textAlign: "right" }}>Por Cobrar</th>
            </tr></thead>
            <tbody>
              {Object.entries(porObra).map(([obra, v]) => (
                <tr key={obra} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "6px 8px" }}>{obra}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmt(v.monto)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", color: "#059669" }}>{fmt(v.cobrado)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", color: v.saldo > 0 ? "#dc2626" : "#64748b" }}>{fmt(v.saldo)}</td>
                </tr>
              ))}
              <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                <td style={{ padding: "8px" }}>TOTAL</td>
                <td style={{ padding: "8px", textAlign: "right" }}>{fmt(totMonto)}</td>
                <td style={{ padding: "8px", textAlign: "right" }}>{fmt(totCobrado)}</td>
                <td style={{ padding: "8px", textAlign: "right" }}>{fmt(totSaldo)}</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section title={`Detalle de cobros (${rows.length})`}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
            <thead><tr style={{ background: "#1e3a5f", color: "white" }}>
              <th style={{ padding: "6px", textAlign: "left" }}>Fecha</th>
              <th style={{ padding: "6px", textAlign: "left" }}>Cliente</th>
              <th style={{ padding: "6px", textAlign: "left" }}>Obra</th>
              <th style={{ padding: "6px", textAlign: "right" }}>Monto</th>
              <th style={{ padding: "6px", textAlign: "right" }}>Cobrado</th>
              <th style={{ padding: "6px", textAlign: "right" }}>Saldo</th>
              <th style={{ padding: "6px", textAlign: "center" }}>Estatus</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "5px 6px" }}>{r.fecha}</td>
                  <td style={{ padding: "5px 6px" }}>{r.cliente}</td>
                  <td style={{ padding: "5px 6px" }}>{r.obra}</td>
                  <td style={{ padding: "5px 6px", textAlign: "right" }}>{fmt(r.monto)}</td>
                  <td style={{ padding: "5px 6px", textAlign: "right", color: "#059669" }}>{fmt(r.cobrado)}</td>
                  <td style={{ padding: "5px 6px", textAlign: "right", color: r.saldo > 0 ? "#dc2626" : "#64748b" }}>{fmt(r.saldo)}</td>
                  <td style={{ padding: "5px 6px", textAlign: "center" }}>{r.estatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <div style={{ marginTop: "30px", paddingTop: "12px", borderTop: "1px solid #cbd5e1", textAlign: "center", fontSize: "9px", color: "#64748b" }}>
          ARIA27 ERP · Grupo Constructor Urbano Avante · {fechaGen}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .report-page { box-shadow: none !important; padding: 16px !important; max-width: 100% !important; }
          @page { size: letter; margin: 12mm; }
        }
        .report-page { box-shadow: 0 4px 24px rgba(0,0,0,0.4); margin-top: 20px; margin-bottom: 40px; }
      `}</style>
    </>
  );
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: "10px 12px", background: "#f8fafc", borderLeft: `4px solid ${color}`, borderRadius: "4px" }}>
      <div style={{ fontSize: "9px", color: "#64748b", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: "16px", fontWeight: 700, color, marginTop: "2px" }}>{value}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "18px" }}>
      <div style={{ fontSize: "11px", color: "#1e3a5f", textTransform: "uppercase", fontWeight: 700, marginBottom: "6px" }}>{title}</div>
      {children}
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-aria-accent" /></div>}><Content /></Suspense>;
}
