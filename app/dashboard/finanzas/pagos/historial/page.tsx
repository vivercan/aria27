"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import AriaBackButton from "@/components/AriaBackButton";
import { Loader2, FileSpreadsheet, Filter } from "lucide-react";

interface PagoHist {
  id: string;
  oc_id: string;
  fecha: string;
  monto: number;
  metodo: string | null;
  referencia: string | null;
  comprobante_url: string | null;
  notas: string | null;
  monto_pagado_acumulado: number | null;
  status_post: string | null;
  created_by: string | null;
  oc_folio?: string | null;
  proveedor?: string | null;
}

export default function PagosHistorialPage() {
  const [items, setItems] = useState<PagoHist[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMetodo, setFilterMetodo] = useState<string>("");
  const [filterMes, setFilterMes] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: pagos, error } = await supabase
        .from("pagos_oc")
        .select("*")
        .order("fecha", { ascending: false })
        .limit(500);
      if (error) {
        console.error("Error pagos_oc", error);
        setLoading(false);
        return;
      }
      const ocIds = Array.from(new Set((pagos || []).map((p) => p.oc_id)));
      let ocMap: Record<string, { folio: string; proveedor: string }> = {};
      if (ocIds.length > 0) {
        const { data: ocs } = await supabase
          .from("purchase_orders")
          .select("id, folio, supplier_name")
          .in("id", ocIds);
        ocMap = Object.fromEntries(
          (ocs || []).map((o: { id: string; folio: string; supplier_name: string }) => [
            o.id,
            { folio: o.folio, proveedor: o.supplier_name },
          ])
        );
      }
      setItems(
        (pagos || []).map((p: PagoHist) => ({
          ...p,
          oc_folio: ocMap[p.oc_id]?.folio || null,
          proveedor: ocMap[p.oc_id]?.proveedor || null,
        }))
      );
      setLoading(false);
    };
    load();
  }, []);

  const filtered = items.filter((p) => {
    if (filterMetodo && (p.metodo || "") !== filterMetodo) return false;
    if (filterMes && !p.fecha.startsWith(filterMes)) return false;
    return true;
  });
  const totalMonto = filtered.reduce((s, p) => s + Number(p.monto || 0), 0);

  return (
    <div className="aria-page-canon">
      <div
        className="flex-shrink-0 rounded-xl px-5 py-3 flex items-center justify-between gap-4"
        style={{
          marginBottom: "20px",
          background: "linear-gradient(180deg, #123E92 0%, #103A86 100%)",
          borderBottom: "1px solid rgba(150,180,230,0.10)",
          boxShadow: "inset 0 1px 0 rgba(220,235,255,0.06), 0 4px 14px rgba(0,0,0,0.30)",
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <AriaBackButton href="/dashboard/finanzas" />
          <div className="min-w-0">
            <h1 style={{ fontSize: "26px", fontWeight: 800, letterSpacing: "-0.03em", color: "#F4F8FF", lineHeight: 1.1 }}>
              Historial de Pagos
            </h1>
            <p style={{ fontSize: "12px", fontWeight: 500, color: "rgba(214,228,255,0.72)", marginTop: 2 }}>
              Registro inmutable de cada pago aplicado a OCs
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0" style={{ marginBottom: "12px" }}>
        <select
          value={filterMetodo}
          onChange={(e) => setFilterMetodo(e.target.value)}
          className="aria-input-canon"
          style={{ padding: "8px 12px", fontSize: "13px" }}
        >
          <option value="">Todos los metodos</option>
          <option value="Transferencia">Transferencia</option>
          <option value="Cheque">Cheque</option>
          <option value="Efectivo">Efectivo</option>
        </select>
        <input
          type="month"
          value={filterMes}
          onChange={(e) => setFilterMes(e.target.value)}
          className="aria-input-canon"
          style={{ padding: "8px 12px", fontSize: "13px" }}
        />
        <div className="ml-auto flex items-center gap-3">
          <span style={{ fontSize: "12px", color: "rgba(180,200,228,0.78)" }}>
            {filtered.length} pagos
          </span>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#10B981" }}>
            ${totalMonto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="aria-card-steel overflow-hidden" style={{ flex: 1, minHeight: 0 }}>
        <div style={{ height: "100%", overflowY: "auto" }}>
          <table className="aria-table-canon" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>OC</th>
                <th>Proveedor</th>
                <th style={{ textAlign: "right" }}>Monto</th>
                <th>Metodo</th>
                <th>Referencia</th>
                <th>Comprobante</th>
                <th>Status</th>
                <th>Por</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 40 }}>
                    <Loader2 className="w-6 h-6 animate-spin inline-block text-aria-accent" />
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 40, color: "#7f93b0" }}>
                    Sin pagos registrados {filterMetodo || filterMes ? "con esos filtros" : ""}
                  </td>
                </tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid rgba(140,178,228,0.08)" }}>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "#C9D8ED", whiteSpace: "nowrap" }}>
                    {new Date(p.fecha).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "#7BB6FF", fontFamily: "monospace" }}>{p.oc_folio || "-"}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "#EAF2FF" }}>{p.proveedor || "-"}</td>
                  <td style={{ padding: "10px 12px", fontSize: 13, color: "#10B981", fontWeight: 700, textAlign: "right" }}>
                    ${Number(p.monto || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "#C9D8ED" }}>{p.metodo || "-"}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "#7f93b0" }}>{p.referencia || "-"}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12 }}>
                    {p.comprobante_url ? (
                      <a href={p.comprobante_url} target="_blank" rel="noopener noreferrer" style={{ color: "#7BB6FF", textDecoration: "underline" }}>
                        Ver
                      </a>
                    ) : (
                      <span style={{ color: "#4a6080" }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 11 }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: p.status_post === "PAGADA" ? "#10B98122" : "#F59E0B22",
                        color: p.status_post === "PAGADA" ? "#10B981" : "#F59E0B",
                        fontWeight: 600,
                      }}
                    >
                      {p.status_post || "?"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 11, color: "#7f93b0" }}>{p.created_by || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
