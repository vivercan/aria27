"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Printer, Loader2 } from "lucide-react";
import Link from "next/link";
import AriaBackButton from "@/components/AriaBackButton";
import { fmtMoney as fmt } from "@/lib/formatters";

function weekOfYear(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dn = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dn);
  const ys = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil((((t.getTime() - ys.getTime()) / 86400000) + 1) / 7);
}

interface Row {
  nombre: string;
  puesto: string;
  obra: string;
  dias: number;
  percepciones: number;
  deducciones: number;
  sueldo_neto: number;
  fecha_inicio: string;
  fecha_fin: string;
}

function Content() {
  const sp = useSearchParams();
  const now = new Date();
  const anio = Number(sp.get("anio") || now.getFullYear());
  const semana = Number(sp.get("semana") || weekOfYear(now));

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => { cargar(); }, [anio, semana]);

  async function cargar() {
    setLoading(true);
    const { data } = await supabase
      .from("nomina_historico")
      .select("nombre,puesto,obra,dias_trabajados,total_percepciones,total_deducciones,sueldo_neto,fecha_inicio,fecha_fin")
      .eq("anio", anio)
      .eq("semana", semana)
      .order("nombre", { ascending: true });
    setRows((data || []).map((n: Record<string, unknown>) => ({
      nombre: (n.nombre as string) || "—",
      puesto: (n.puesto as string) || "—",
      obra: (n.obra as string) || "—",
      dias: Number(n.dias_trabajados) || 0,
      percepciones: Number(n.total_percepciones) || 0,
      deducciones: Number(n.total_deducciones) || 0,
      sueldo_neto: Number(n.sueldo_neto) || 0,
      fecha_inicio: ((n.fecha_inicio as string) || "").slice(0, 10),
      fecha_fin: ((n.fecha_fin as string) || "").slice(0, 10),
    })) as Row[]);
    setLoading(false);
  }

  const totPerc = rows.reduce((s, r) => s + r.percepciones, 0);
  const totDed = rows.reduce((s, r) => s + r.deducciones, 0);
  const totNeto = rows.reduce((s, r) => s + r.sueldo_neto, 0);

  const porObra: Record<string, number> = {};
  rows.forEach(r => { porObra[r.obra] = (porObra[r.obra] || 0) + r.sueldo_neto; });

  const periodo = rows[0] ? `${rows[0].fecha_inicio} → ${rows[0].fecha_fin}` : "";
  const fechaGen = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-aria-accent" /></div>;

  return (
    <>
      <div className="no-print sticky top-0 z-20 bg-[#040810]/90 backdrop-blur border-b border-white/[0.08] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AriaBackButton href="/dashboard/reportes" />
          <div className="text-white text-sm">Nómina semanal · <b>Sem {semana} / {anio}</b></div>
        </div>
        <div className="flex items-center gap-2">
          <input type="number"  defaultValue={semana} min={1} max={53} onBlur={e => { const u = new URL(window.location.href); u.searchParams.set("semana", e.target.value); window.location.href = u.toString(); }} className="px-2 py-1 rounded bg-[#0c1d38] text-white text-xs border border-white/[0.08] w-16" />
          <input type="number"  defaultValue={anio} min={2024} max={2030} onBlur={e => { const u = new URL(window.location.href); u.searchParams.set("anio", e.target.value); window.location.href = u.toString(); }} className="px-2 py-1 rounded bg-[#0c1d38] text-white text-xs border border-white/[0.08] w-20" />
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-aria-primary hover:bg-aria-primary-hover text-white text-sm"><Printer className="w-4 h-4" /> Imprimir / PDF</button>
        </div>
      </div>

      <div className="report-page mx-auto bg-white text-slate-900" style={{ maxWidth: "850px", padding: "32px", fontFamily: "Arial, sans-serif" }}>
        <div style={{ borderBottom: "3px solid #0f172a", paddingBottom: "16px", marginBottom: "20px", display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: "#0f172a" }}>ARIA27 ERP</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>Grupo Constructor Urbano Avante</div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1e3a5f", margin: "12px 0 4px 0" }}>Reporte de Nómina Semanal</h1>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>Semana {semana} / {anio}</div>
            {periodo && <div style={{ fontSize: "11px", color: "#64748b" }}>{periodo}</div>}
          </div>
          <div style={{ textAlign: "right", fontSize: "10px", color: "#64748b" }}>Generado: {fechaGen}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "16px" }}>
          <KPI label="Empleados" value={String(rows.length)} color="#0891b2" />
          <KPI label="Percepciones" value={fmt(totPerc)} color="#059669" />
          <KPI label="Deducciones" value={fmt(totDed)} color="#dc2626" />
        </div>

        <div style={{ padding: "14px", background: "#1e3a5f", color: "white", borderRadius: "8px", marginBottom: "20px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", opacity: 0.8, textTransform: "uppercase" }}>Total Nómina Neta</div>
          <div style={{ fontSize: "28px", fontWeight: 900 }}>{fmt(totNeto)}</div>
        </div>

        <Section title="Distribución por obra">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead><tr style={{ background: "#1e3a5f", color: "white" }}>
              <th style={{ padding: "8px", textAlign: "left" }}>Obra</th>
              <th style={{ padding: "8px", textAlign: "right" }}>Sueldo Neto</th>
              <th style={{ padding: "8px", textAlign: "right" }}>%</th>
            </tr></thead>
            <tbody>
              {Object.entries(porObra).map(([obra, v]) => (
                <tr key={obra} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "6px 8px" }}>{obra}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmt(v)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", color: "#64748b" }}>{totNeto > 0 ? ((v/totNeto)*100).toFixed(1) : "0"}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Detalle por empleado">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
            <thead><tr style={{ background: "#1e3a5f", color: "white" }}>
              <th style={{ padding: "6px", textAlign: "left" }}>Empleado</th>
              <th style={{ padding: "6px", textAlign: "left" }}>Puesto</th>
              <th style={{ padding: "6px", textAlign: "left" }}>Obra</th>
              <th style={{ padding: "6px", textAlign: "center" }}>Días</th>
              <th style={{ padding: "6px", textAlign: "right" }}>Percep.</th>
              <th style={{ padding: "6px", textAlign: "right" }}>Deduc.</th>
              <th style={{ padding: "6px", textAlign: "right" }}>Neto</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "5px 6px" }}>{r.nombre}</td>
                  <td style={{ padding: "5px 6px" }}>{r.puesto}</td>
                  <td style={{ padding: "5px 6px" }}>{r.obra}</td>
                  <td style={{ padding: "5px 6px", textAlign: "center" }}>{r.dias}</td>
                  <td style={{ padding: "5px 6px", textAlign: "right", color: "#059669" }}>{fmt(r.percepciones)}</td>
                  <td style={{ padding: "5px 6px", textAlign: "right", color: "#dc2626" }}>{fmt(r.deducciones)}</td>
                  <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 700 }}>{fmt(r.sueldo_neto)}</td>
                </tr>
              ))}
              <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                <td colSpan={4} style={{ padding: "8px" }}>TOTAL</td>
                <td style={{ padding: "8px", textAlign: "right" }}>{fmt(totPerc)}</td>
                <td style={{ padding: "8px", textAlign: "right" }}>{fmt(totDed)}</td>
                <td style={{ padding: "8px", textAlign: "right" }}>{fmt(totNeto)}</td>
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
      <div style={{ fontSize: "14px", fontWeight: 700, color, marginTop: "2px" }}>{value}</div>
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
