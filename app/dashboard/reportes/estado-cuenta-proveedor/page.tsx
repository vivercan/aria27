"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Printer, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

const fmt = (n: number) => `$${(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface OC {
  folio: string;
  fecha: string;
  obra: string;
  total: number;
  pagado: number;
  saldo: number;
  status: string;
}

function Content() {
  const sp = useSearchParams();
  const proveedor = sp.get("proveedor") || "";

  const [loading, setLoading] = useState(true);
  const [proveedores, setProveedores] = useState<string[]>([]);
  const [ocs, setOcs] = useState<OC[]>([]);

  useEffect(() => { cargarProveedores(); }, []);
  useEffect(() => { if (proveedor) cargar(); else setLoading(false); }, [proveedor]);

  async function cargarProveedores() {
    const { data } = await supabase.from("suppliers").select("name").order("name", { ascending: true });
    setProveedores((data || []).map((p: any) => p.name).filter(Boolean));
  }

  async function cargar() {
    setLoading(true);
    const { data: pos } = await supabase
      .from("purchase_orders")
      .select("po_number,created_at,obra_nombre,total,monto_pagado,status,supplier_name")
      .eq("supplier_name", proveedor)
      .neq("status", "CANCELADA")
      .order("created_at", { ascending: false });
    setOcs((pos || []).map((p: any) => {
      const total = Number(p.total) || 0;
      const pagado = Number(p.monto_pagado) || 0;
      return {
        folio: p.po_number || "—",
        fecha: (p.created_at || "").slice(0, 10),
        obra: p.obra_nombre || "—",
        total,
        pagado,
        saldo: total - pagado,
        status: p.status || "—",
      };
    }));
    setLoading(false);
  }

  const totOC = ocs.reduce((s, o) => s + o.total, 0);
  const totPagado = ocs.reduce((s, o) => s + o.pagado, 0);
  const totPendiente = ocs.reduce((s, o) => s + o.saldo, 0);

  const fechaGen = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

  if (!proveedor) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Link href="/dashboard/reportes" className="inline-flex items-center gap-2 text-aria-accent mb-4"><ArrowLeft className="w-4 h-4" /> Volver</Link>
        <h1 className="text-2xl font-bold text-white mb-4">Estado de cuenta por proveedor</h1>
        <p className="text-slate-400 mb-4">Selecciona un proveedor:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[500px] overflow-y-auto">
          {proveedores.map(p => (
            <Link key={p} href={`/dashboard/reportes/estado-cuenta-proveedor?proveedor=${encodeURIComponent(p)}`} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm border border-white/10">{p}</Link>
          ))}
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-aria-accent" /></div>;

  return (
    <>
      <div className="no-print sticky top-0 z-20 bg-slate-950/90 backdrop-blur border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/reportes/estado-cuenta-proveedor" className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft className="w-4 h-4 text-white" /></Link>
          <div className="text-white text-sm">Estado de cuenta · <b>{proveedor}</b></div>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-aria-primary hover:bg-aria-primary-hover text-white text-sm"><Printer className="w-4 h-4" /> Imprimir / PDF</button>
      </div>

      <div className="report-page mx-auto bg-white text-slate-900" style={{ maxWidth: "850px", padding: "32px", fontFamily: "Arial, sans-serif" }}>
        <div style={{ borderBottom: "3px solid #0f172a", paddingBottom: "16px", marginBottom: "20px", display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: "#0f172a" }}>ARIA27 ERP</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>Grupo Constructor Urbano Avante</div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1e3a5f", margin: "12px 0 4px 0" }}>Estado de Cuenta — Proveedor</h1>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>{proveedor}</div>
          </div>
          <div style={{ textAlign: "right", fontSize: "10px", color: "#64748b" }}>Generado: {fechaGen}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "20px" }}>
          <KPI label="OCs Total" value={fmt(totOC)} color="#0891b2" />
          <KPI label="Pagado" value={fmt(totPagado)} color="#059669" />
          <KPI label="Pendiente" value={fmt(totPendiente)} color="#dc2626" />
        </div>

        <Section title={`Órdenes de Compra (${ocs.length})`}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead><tr style={{ background: "#1e3a5f", color: "white" }}>
              <th style={{ padding: "8px", textAlign: "left" }}>Folio</th>
              <th style={{ padding: "8px", textAlign: "left" }}>Fecha</th>
              <th style={{ padding: "8px", textAlign: "left" }}>Obra</th>
              <th style={{ padding: "8px", textAlign: "right" }}>Total</th>
              <th style={{ padding: "8px", textAlign: "right" }}>Pagado</th>
              <th style={{ padding: "8px", textAlign: "right" }}>Saldo</th>
              <th style={{ padding: "8px", textAlign: "center" }}>Estado</th>
            </tr></thead>
            <tbody>
              {ocs.map((o, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "6px 8px", fontFamily: "monospace" }}>{o.folio}</td>
                  <td style={{ padding: "6px 8px" }}>{o.fecha}</td>
                  <td style={{ padding: "6px 8px" }}>{o.obra}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmt(o.total)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", color: "#059669" }}>{fmt(o.pagado)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", color: o.saldo > 0 ? "#dc2626" : "#64748b" }}>{fmt(o.saldo)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "center", fontSize: "10px" }}>{o.status}</td>
                </tr>
              ))}
              <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                <td colSpan={3} style={{ padding: "8px" }}>TOTAL</td>
                <td style={{ padding: "8px", textAlign: "right" }}>{fmt(totOC)}</td>
                <td style={{ padding: "8px", textAlign: "right" }}>{fmt(totPagado)}</td>
                <td style={{ padding: "8px", textAlign: "right" }}>{fmt(totPendiente)}</td>
                <td></td>
              </tr>
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
