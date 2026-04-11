"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Printer, Loader2 } from "lucide-react";

const fmt = (n: number) => `$${(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Datos {
  presupuestoCat: Record<string, number>;
  presupuesto: number;
  gastoOC: number;
  gastoNomina: number;
  gastoTotal: number;
  cobrado: number;
  porCobrar: number;
  margen: number;
  avance: number;
  saldo: number;
  pctFisico: number | null;
  semanaFisico: string | null;
  deltaFisFin: number | null;
  topOCs: Array<{ folio: string; supplier: string; total: number; status: string }>;
  topCobros: Array<{ cliente: string; monto: number; saldo: number; estatus: string }>;
  totalNominaRecs: number;
}

const CATS = ["MATERIALES", "MANO_OBRA", "HERRAMIENTA", "SUBCONTRATO", "INDIRECTOS", "OTROS"];

function ReporteContent() {
  const sp = useSearchParams();
  const obra = sp.get("obra") || "";
  const [loading, setLoading] = useState(true);
  const [datos, setDatos] = useState<Datos | null>(null);

  useEffect(() => {
    if (!obra) { setLoading(false); return; }
    cargar();
  }, [obra]);

  async function cargar() {
    setLoading(true);
    try {
      // Partidas presupuesto
      const { data: pp } = await supabase
        .from("presupuestos_partidas")
        .select("categoria,importe")
        .eq("obra_nombre", obra);
      const presupuestoCat: Record<string, number> = {};
      CATS.forEach(c => presupuestoCat[c] = 0);
      (pp || []).forEach((p: any) => {
        const c = p.categoria || "OTROS";
        presupuestoCat[c] = (presupuestoCat[c] || 0) + (p.importe || 0);
      });
      const presupuesto = Object.values(presupuestoCat).reduce((s, v) => s + v, 0);

      // Reqs de la obra
      const { data: rqData } = await supabase
        .from("requisitions")
        .select("id,folio")
        .eq("cost_center_name", obra);
      const reqIds = (rqData || []).map((r: any) => r.id);

      // OCs ligadas
      let topOCs: Datos["topOCs"] = [];
      let gastoOC = 0;
      if (reqIds.length > 0) {
        const { data: pos } = await supabase
          .from("purchase_orders")
          .select("folio,supplier_name,total,status,requisition_id")
          .in("requisition_id", reqIds)
          .neq("status", "CANCELADA")
          .order("total", { ascending: false });
        gastoOC = (pos || []).reduce((s: number, p: any) => s + (p.total || 0), 0);
        topOCs = (pos || []).slice(0, 5).map((p: any) => ({
          folio: p.folio || "—",
          supplier: p.supplier_name || "—",
          total: p.total || 0,
          status: p.status || "—",
        }));
      }

      // Nómina
      const { data: nom } = await supabase
        .from("nomina_historico")
        .select("sueldo_neto")
        .eq("obra", obra)
        .eq("status", "CONFIRMADA");
      const gastoNomina = (nom || []).reduce((s: number, n: any) => s + (n.sueldo_neto || 0), 0);
      const totalNominaRecs = (nom || []).length;

      // Cobros
      const { data: cobros } = await supabase
        .from("cobros_manuales")
        .select("cliente_nombre,monto,saldo,estatus")
        .eq("obra_nombre", obra)
        .neq("estatus", "CANCELADO")
        .order("monto", { ascending: false });
      const cobrado = (cobros || []).reduce((s: number, c: any) => s + ((Number(c.monto) || 0) - (Number(c.saldo) || 0)), 0);
      const porCobrar = (cobros || []).reduce((s: number, c: any) => s + (Number(c.saldo) || 0), 0);
      const topCobros = (cobros || []).slice(0, 5).map((c: any) => ({
        cliente: c.cliente_nombre || "—",
        monto: Number(c.monto) || 0,
        saldo: Number(c.saldo) || 0,
        estatus: c.estatus || "—",
      }));

      // Avance físico (último)
      const { data: av } = await supabase
        .from("obra_avances")
        .select("semana_iso,pct_fisico")
        .eq("obra_nombre", obra)
        .order("semana_iso", { ascending: false })
        .limit(1);
      const pctFisico = av && av[0] ? Number(av[0].pct_fisico) || 0 : null;
      const semanaFisico = av && av[0] ? av[0].semana_iso : null;

      const gastoTotal = gastoOC + gastoNomina;
      const margen = cobrado - gastoTotal;
      const avance = presupuesto > 0 ? (gastoTotal / presupuesto) * 100 : 0;
      const saldo = presupuesto - gastoTotal;
      const deltaFisFin = pctFisico !== null && presupuesto > 0 ? (pctFisico - avance) : null;

      setDatos({
        presupuestoCat, presupuesto, gastoOC, gastoNomina, gastoTotal,
        cobrado, porCobrar, margen, avance, saldo,
        pctFisico, semanaFisico, deltaFisFin,
        topOCs, topCobros, totalNominaRecs,
      });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  if (!obra) {
    return <div className="p-8 text-center text-slate-400">Falta parámetro <code>?obra=NOMBRE</code></div>;
  }
  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-aria-accent" /></div>;
  }
  if (!datos) {
    return <div className="p-8 text-center text-slate-400">Sin datos para {obra}</div>;
  }

  const semaforoBg = datos.avance > 100 ? "#dc2626"
    : datos.avance >= 90 ? "#ef4444"
    : datos.avance >= 70 ? "#f59e0b"
    : datos.presupuesto > 0 ? "#10b981" : "#64748b";
  const semaforoLabel = datos.avance > 100 ? "REBASADO"
    : datos.avance >= 90 ? "ROJO"
    : datos.avance >= 70 ? "AMARILLO"
    : datos.presupuesto > 0 ? "VERDE" : "S/PPTO";

  const fechaGen = new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <>
      {/* Toolbar (oculta en print) */}
      <div className="no-print sticky top-0 z-20 bg-slate-950/90 backdrop-blur border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="text-white text-sm">Reporte ejecutivo · <b>{obra}</b></div>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-aria-primary hover:bg-aria-primary-hover text-white text-sm">
          <Printer className="w-4 h-4" /> Imprimir / Guardar PDF
        </button>
      </div>

      <div className="report-page mx-auto bg-white text-slate-900" style={{ maxWidth: "850px", padding: "32px", fontFamily: "Arial, sans-serif" }}>
        {/* Header */}
        <div style={{ borderBottom: "3px solid #0f172a", paddingBottom: "16px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: "#0f172a", letterSpacing: "1px" }}>ARIA27 ERP</div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>Grupo Constructor Urbano Avante</div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1e3a5f", margin: "12px 0 4px 0" }}>Reporte Ejecutivo de Obra</h1>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>{obra}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "inline-block", padding: "8px 16px", background: semaforoBg, color: "white", borderRadius: "6px", fontWeight: 700, fontSize: "14px" }}>
              {semaforoLabel}
            </div>
            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "8px" }}>Generado: {fechaGen}</div>
          </div>
        </div>

        {/* KPIs principales */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "20px" }}>
          <KPI label="Presupuesto" value={fmt(datos.presupuesto)} color="#0891b2" />
          <KPI label="Gasto OC" value={fmt(datos.gastoOC)} color="#ea580c" />
          <KPI label="Gasto Nómina" value={fmt(datos.gastoNomina)} color="#7c3aed" />
          <KPI label="Gasto Total" value={fmt(datos.gastoTotal)} color="#dc2626" />
          <KPI label="Cobrado" value={fmt(datos.cobrado)} color="#059669" />
          <KPI label="Por Cobrar" value={fmt(datos.porCobrar)} color="#f59e0b" />
          <KPI label="Margen Real" value={fmt(datos.margen)} color={datos.margen >= 0 ? "#059669" : "#dc2626"} />
          <KPI label="Saldo Ppto" value={fmt(datos.saldo)} color={datos.saldo >= 0 ? "#059669" : "#dc2626"} />
          <KPI label="Avance Financiero" value={`${datos.avance.toFixed(1)}%`} color="#1e3a5f" />
        </div>

        {/* Avance físico vs financiero */}
        {datos.pctFisico !== null && (
          <div style={{ marginBottom: "20px", padding: "14px", background: "#f1f5f9", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", marginBottom: "8px", fontWeight: 700 }}>Avance Físico vs Financiero</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "10px", color: "#64748b" }}>Avance físico (sem {datos.semanaFisico})</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a" }}>{datos.pctFisico.toFixed(1)}%</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "#64748b" }}>Avance financiero</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a" }}>{datos.avance.toFixed(1)}%</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "#64748b" }}>Δ Físico − Financiero</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: (datos.deltaFisFin || 0) >= 0 ? "#059669" : "#dc2626" }}>
                  {(datos.deltaFisFin || 0) >= 0 ? "+" : ""}{(datos.deltaFisFin || 0).toFixed(1)}%
                </div>
              </div>
            </div>
            {(datos.deltaFisFin || 0) < -10 && (
              <div style={{ marginTop: "8px", padding: "8px", background: "#fee2e2", color: "#991b1b", fontSize: "11px", borderRadius: "4px", fontWeight: 600 }}>
                ⚠ Alerta: avance físico significativamente atrasado vs gasto. Posible sobrecosto encubierto.
              </div>
            )}
          </div>
        )}

        {/* Presupuesto por categoría */}
        <Section title="Presupuesto por categoría">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead>
              <tr style={{ background: "#1e3a5f", color: "white" }}>
                <th style={{ padding: "8px", textAlign: "left" }}>Categoría</th>
                <th style={{ padding: "8px", textAlign: "right" }}>Importe</th>
                <th style={{ padding: "8px", textAlign: "right" }}>%</th>
              </tr>
            </thead>
            <tbody>
              {CATS.map(c => {
                const v = datos.presupuestoCat[c] || 0;
                const pct = datos.presupuesto > 0 ? (v / datos.presupuesto) * 100 : 0;
                return (
                  <tr key={c} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "6px 8px" }}>{c.replace("_", " ")}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmt(v)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: "#64748b" }}>{pct.toFixed(1)}%</td>
                  </tr>
                );
              })}
              <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                <td style={{ padding: "8px" }}>TOTAL</td>
                <td style={{ padding: "8px", textAlign: "right" }}>{fmt(datos.presupuesto)}</td>
                <td style={{ padding: "8px", textAlign: "right" }}>100%</td>
              </tr>
            </tbody>
          </table>
        </Section>

        {/* Top OCs */}
        {datos.topOCs.length > 0 && (
          <Section title="Top 5 Órdenes de Compra (por monto)">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr style={{ background: "#1e3a5f", color: "white" }}>
                  <th style={{ padding: "8px", textAlign: "left" }}>Folio</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Proveedor</th>
                  <th style={{ padding: "8px", textAlign: "right" }}>Total</th>
                  <th style={{ padding: "8px", textAlign: "center" }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {datos.topOCs.map((o, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "6px 8px", fontFamily: "monospace" }}>{o.folio}</td>
                    <td style={{ padding: "6px 8px" }}>{o.supplier}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmt(o.total)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "center", fontSize: "10px" }}>{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Top cobros */}
        {datos.topCobros.length > 0 && (
          <Section title="Top 5 Cobros del periodo">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr style={{ background: "#1e3a5f", color: "white" }}>
                  <th style={{ padding: "8px", textAlign: "left" }}>Cliente</th>
                  <th style={{ padding: "8px", textAlign: "right" }}>Monto</th>
                  <th style={{ padding: "8px", textAlign: "right" }}>Saldo</th>
                  <th style={{ padding: "8px", textAlign: "center" }}>Estatus</th>
                </tr>
              </thead>
              <tbody>
                {datos.topCobros.map((c, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "6px 8px" }}>{c.cliente}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmt(c.monto)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: c.saldo > 0 ? "#dc2626" : "#059669" }}>{fmt(c.saldo)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "center", fontSize: "10px" }}>{c.estatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Resumen nómina */}
        <Section title="Nómina">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px" }}>
            <div><b>Total registros confirmados:</b> {datos.totalNominaRecs}</div>
            <div><b>Suma sueldo neto:</b> {fmt(datos.gastoNomina)}</div>
          </div>
        </Section>

        {/* Footer */}
        <div style={{ marginTop: "30px", paddingTop: "12px", borderTop: "1px solid #cbd5e1", textAlign: "center", fontSize: "9px", color: "#64748b" }}>
          ARIA27 ERP · Grupo Constructor Urbano Avante · Aguascalientes, México<br />
          Reporte generado automáticamente · Fuente: Centro de Control de Obras · {fechaGen}
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
      <div style={{ fontSize: "9px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
      <div style={{ fontSize: "14px", fontWeight: 700, color, marginTop: "2px" }}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "18px" }}>
      <div style={{ fontSize: "11px", color: "#1e3a5f", textTransform: "uppercase", fontWeight: 700, marginBottom: "6px", letterSpacing: "0.5px" }}>{title}</div>
      {children}
    </div>
  );
}

export default function ReporteObraPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-aria-accent" /></div>}>
      <ReporteContent />
    </Suspense>
  );
}
