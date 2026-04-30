"use client";

import { useState, useMemo } from "react";

interface ItemDetail {
  product_name: string;
  quantity: number;
  unit: string;
  id?: string;
}

interface QuoteWithItems {
  supplier: string;
  subtotal: number;
  iva: number;
  total: number;
  tax_rate: number;
  advance_percentage: number;
  advance_amount: number;
  forma_pago?: string;
  entrega?: string | number;
  dias_credito?: number;
  rebaja_iva?: boolean;
  notas?: string;
  items_prices?: Record<string, number>;
  observaciones?: string;
}

interface Props {
  token: string;
  folio: string;
  obra: string;
  solicitante: string;
  urgency?: string | null;
  items_detail: ItemDetail[];
  quotes: QuoteWithItems[];
}

type Modo = "elegir" | "volver" | "rechazar";

export default function AutorizarForm({
  token, folio, obra, solicitante, urgency, items_detail, quotes,
}: Props) {
  // Inicializar selecciones: mejor precio por item por default
  const [selecciones, setSelecciones] = useState<Record<string, string>>(() => {
    const def: Record<string, string> = {};
    items_detail.forEach((it) => {
      let bestSupplier = "";
      let bestPrice = Infinity;
      quotes.forEach((q) => {
        const p = q.items_prices?.[it.product_name];
        if (p !== undefined && p > 0 && p < bestPrice) {
          bestPrice = p;
          bestSupplier = q.supplier;
        }
      });
      if (bestSupplier) def[it.product_name] = bestSupplier;
    });
    return def;
  });

  const [modo, setModo] = useState<Modo>("elegir");
  const [motivo, setMotivo] = useState<string>("");
  const [sugerencia, setSugerencia] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Totales por proveedor segun selecciones
  const totales = useMemo(() => {
    const t: Record<string, { subtotal: number; iva: number; total: number; itemCount: number }> = {};
    quotes.forEach((q) => {
      t[q.supplier] = { subtotal: 0, iva: 0, total: 0, itemCount: 0 };
    });
    items_detail.forEach((it) => {
      const supplier = selecciones[it.product_name];
      if (!supplier) return;
      const q = quotes.find((qu) => qu.supplier === supplier);
      if (!q) return;
      const price = q.items_prices?.[it.product_name] || 0;
      const qty = it.quantity || 1;
      const sub = price * qty;
      const iva = sub * ((q.tax_rate ?? 16) / 100);
      t[supplier].subtotal += sub;
      t[supplier].iva += iva;
      t[supplier].total += sub + iva;
      t[supplier].itemCount++;
    });
    return t;
  }, [selecciones, items_detail, quotes]);

  const fmt = (n: number) =>
    "$" + (n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const proveedoresElegidos = useMemo(() => {
    const set = new Set<string>();
    Object.values(selecciones).forEach((s) => s && set.add(s));
    return Array.from(set);
  }, [selecciones]);

  const totalGlobal = useMemo(() => {
    return Object.values(totales).reduce((s, t) => s + t.total, 0);
  }, [totales]);

  const itemsAsignados = useMemo(() => {
    return Object.values(selecciones).filter(Boolean).length;
  }, [selecciones]);

  // Mejor precio por item (para badge)
  const mejorPorItem = useMemo(() => {
    const m: Record<string, string> = {};
    items_detail.forEach((it) => {
      let best = "";
      let bestP = Infinity;
      quotes.forEach((q) => {
        const p = q.items_prices?.[it.product_name];
        if (p !== undefined && p > 0 && p < bestP) {
          bestP = p;
          best = q.supplier;
        }
      });
      if (best) m[it.product_name] = best;
    });
    return m;
  }, [items_detail, quotes]);

  const submit = async (action: "AUTORIZADA" | "VOLVER_COTIZAR" | "RECHAZADA") => {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { token, action };
      if (action === "AUTORIZADA") {
        body.selecciones = selecciones;
      }
      if (action === "VOLVER_COTIZAR") {
        if (motivo) body.motivo = motivo;
        if (sugerencia) body.sugerencia = sugerencia;
      }
      if (action === "RECHAZADA" && motivo) body.motivo = motivo;

      const resp = await fetch("/api/requisicion/approve-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (resp.ok) {
        const html = await resp.text();
        document.open();
        document.write(html);
        document.close();
      } else {
        alert("Error procesando: " + resp.status);
      }
    } catch (e) {
      alert("Error de red: " + (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // ===========================================================
  // RENDER
  // ===========================================================
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header card */}
      <div style={{ background: "linear-gradient(135deg,#0F1A2E 0%,#091525 100%)", border: "1px solid rgba(124,148,180,0.20)", borderRadius: 14, padding: 16 }}>
        <div style={{ color: "#86efac", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
          Comparativa por item
        </div>
        <div style={{ color: "#F4F8FF", fontSize: 18, fontWeight: 700 }}>
          {folio} · {obra}
        </div>
        <div style={{ color: "rgba(214,228,255,0.55)", fontSize: 12, marginTop: 4 }}>
          {items_detail.length} productos · {quotes.length} proveedores · solicitante: {solicitante}
        </div>
        <div style={{ marginTop: 10, padding: 10, background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.30)", borderRadius: 8, color: "#bbf7d0", fontSize: 12, lineHeight: 1.4 }}>
          📋 <b>Como funciona:</b> Por cada producto elige el proveedor que prefieras. Se generara una OC por cada proveedor seleccionado. Por default ya esta marcado el mejor precio por item.
        </div>
      </div>

      {/* MATRIZ Excel-style — scrollable horizontal en mobile */}
      <div style={{ background: "linear-gradient(135deg,#0F1A2E 0%,#091525 100%)", border: "1px solid rgba(124,148,180,0.20)", borderRadius: 14, padding: 12, overflow: "auto", maxHeight: "60vh" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 0, fontSize: 12, color: "#F4F8FF", minWidth: 600 }}>
          <thead>
            <tr>
              <th style={{ position: "sticky", left: 0, top: 0, background: "#091525", padding: "8px 10px", textAlign: "left", borderBottom: "2px solid rgba(124,148,180,0.30)", borderRight: "2px solid rgba(124,148,180,0.30)", fontSize: 10, color: "rgba(214,228,255,0.70)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, zIndex: 3, minWidth: 180 }}>Producto</th>
              <th style={{ position: "sticky", top: 0, background: "#091525", padding: "8px 6px", textAlign: "center", borderBottom: "2px solid rgba(124,148,180,0.30)", fontSize: 10, color: "rgba(214,228,255,0.70)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, zIndex: 2, minWidth: 50 }}>Cant</th>
              <th style={{ position: "sticky", top: 0, background: "#091525", padding: "8px 6px", textAlign: "center", borderBottom: "2px solid rgba(124,148,180,0.30)", fontSize: 10, color: "rgba(214,228,255,0.70)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, zIndex: 2, minWidth: 60 }}>Unidad</th>
              {quotes.map((q, idx) => (
                <th key={idx} style={{ position: "sticky", top: 0, background: "#091525", padding: "8px 10px", textAlign: "center", borderBottom: "2px solid rgba(124,148,180,0.30)", fontSize: 11, color: "#F4F8FF", fontWeight: 700, zIndex: 2, minWidth: 130 }}>
                  {q.supplier}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items_detail.map((it, ridx) => (
              <tr key={ridx} style={{ borderBottom: "1px solid rgba(124,148,180,0.10)" }}>
                <td style={{ position: "sticky", left: 0, background: "#0F1A2E", padding: "10px", borderRight: "2px solid rgba(124,148,180,0.20)", fontSize: 12, color: "rgba(214,228,255,0.95)", fontWeight: 500 }}>
                  {it.product_name}
                </td>
                <td style={{ padding: "10px 6px", textAlign: "center", color: "rgba(214,228,255,0.85)", fontSize: 11 }}>
                  {it.quantity}
                </td>
                <td style={{ padding: "10px 6px", textAlign: "center", color: "rgba(214,228,255,0.65)", fontSize: 11 }}>
                  {it.unit || "PZA"}
                </td>
                {quotes.map((q, cidx) => {
                  const price = q.items_prices?.[it.product_name];
                  const isMejor = mejorPorItem[it.product_name] === q.supplier;
                  const isSeleccionado = selecciones[it.product_name] === q.supplier;
                  if (price === undefined || price === null) {
                    return <td key={cidx} style={{ padding: "10px 6px", textAlign: "center", color: "rgba(214,228,255,0.30)", fontSize: 11 }}>—</td>;
                  }
                  return (
                    <td key={cidx} style={{ padding: 4, textAlign: "center", verticalAlign: "middle" }}>
                      <button
                        onClick={() => setSelecciones((s) => ({ ...s, [it.product_name]: q.supplier }))}
                        style={{
                          width: "100%",
                          padding: "8px 6px",
                          borderRadius: 8,
                          border: isSeleccionado ? "2px solid #22c55e" : "1px solid rgba(124,148,180,0.20)",
                          background: isSeleccionado ? "rgba(34,197,94,0.18)" : (isMejor ? "rgba(34,197,94,0.06)" : "rgba(0,0,0,0.20)"),
                          color: isSeleccionado ? "#bbf7d0" : (isMejor ? "#86efac" : "rgba(214,228,255,0.85)"),
                          fontSize: 11,
                          fontWeight: isSeleccionado ? 700 : 500,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          minWidth: 100,
                        }}
                      >
                        {fmt(price)}
                        {isMejor && !isSeleccionado && <div style={{ fontSize: 9, color: "#86efac", marginTop: 2 }}>★ mejor</div>}
                        {isSeleccionado && <div style={{ fontSize: 9, marginTop: 2 }}>✓ elegido</div>}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Filas resumen */}
            <tr style={{ borderTop: "2px solid rgba(124,148,180,0.30)" }}>
              <td colSpan={3} style={{ position: "sticky", left: 0, background: "#091525", padding: "10px", fontSize: 11, color: "rgba(214,228,255,0.65)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, borderRight: "2px solid rgba(124,148,180,0.30)" }}>SUBTOTAL elegido</td>
              {quotes.map((q, idx) => {
                const t = totales[q.supplier];
                const showVal = t && t.itemCount > 0;
                return (
                  <td key={idx} style={{ padding: "10px", textAlign: "right", color: showVal ? "#F4F8FF" : "rgba(214,228,255,0.30)", fontSize: 12, fontWeight: 600 }}>
                    {showVal ? fmt(t.subtotal) : "—"}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td colSpan={3} style={{ position: "sticky", left: 0, background: "#091525", padding: "8px 10px", fontSize: 11, color: "rgba(214,228,255,0.55)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, borderRight: "2px solid rgba(124,148,180,0.30)" }}>IVA elegido</td>
              {quotes.map((q, idx) => {
                const t = totales[q.supplier];
                const showVal = t && t.itemCount > 0;
                return (
                  <td key={idx} style={{ padding: "8px 10px", textAlign: "right", color: showVal ? "rgba(214,228,255,0.85)" : "rgba(214,228,255,0.30)", fontSize: 11 }}>
                    {showVal ? fmt(t.iva) : "—"}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td colSpan={3} style={{ position: "sticky", left: 0, background: "#091525", padding: "10px", fontSize: 11, color: "#86efac", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800, borderRight: "2px solid rgba(124,148,180,0.30)" }}>TOTAL c/IVA</td>
              {quotes.map((q, idx) => {
                const t = totales[q.supplier];
                const showVal = t && t.itemCount > 0;
                return (
                  <td key={idx} style={{ padding: "10px", textAlign: "right", color: showVal ? "#bbf7d0" : "rgba(214,228,255,0.30)", fontSize: 13, fontWeight: 800, background: showVal ? "rgba(34,197,94,0.10)" : "transparent" }}>
                    {showVal ? fmt(t.total) : "—"}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td colSpan={3} style={{ position: "sticky", left: 0, background: "#091525", padding: "8px 10px", fontSize: 10, color: "rgba(214,228,255,0.55)", textTransform: "uppercase", borderRight: "2px solid rgba(124,148,180,0.30)" }}>Items elegidos</td>
              {quotes.map((q, idx) => {
                const t = totales[q.supplier];
                return (
                  <td key={idx} style={{ padding: "8px 10px", textAlign: "center", color: t && t.itemCount > 0 ? "#86efac" : "rgba(214,228,255,0.30)", fontSize: 11, fontWeight: 600 }}>
                    {t ? `${t.itemCount}/${items_detail.length}` : "0"}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td colSpan={3} style={{ position: "sticky", left: 0, background: "#091525", padding: "8px 10px", fontSize: 10, color: "rgba(214,228,255,0.55)", textTransform: "uppercase", borderRight: "2px solid rgba(124,148,180,0.30)" }}>Entrega · pago · credito</td>
              {quotes.map((q, idx) => (
                <td key={idx} style={{ padding: "8px 10px", textAlign: "center", color: "rgba(214,228,255,0.65)", fontSize: 10, lineHeight: 1.3 }}>
                  {q.entrega ? `${q.entrega}d` : "—"}<br/>
                  {q.forma_pago || "—"}<br/>
                  {q.dias_credito ? `${q.dias_credito}d cred` : "contado"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Resumen de OCs que se generaran */}
      {modo === "elegir" && proveedoresElegidos.length > 0 && (
        <div style={{ background: "linear-gradient(135deg,#0F4C3A 0%,#16704D 100%)", border: "1px solid rgba(34,197,94,0.40)", borderRadius: 12, padding: 14 }}>
          <div style={{ color: "#bbf7d0", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
            Se generaran {proveedoresElegidos.length} orden{proveedoresElegidos.length === 1 ? "" : "es"} de compra
          </div>
          {proveedoresElegidos.map((sup) => {
            const t = totales[sup];
            return (
              <div key={sup} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", fontSize: 12, borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
                <span style={{ color: "#F4F8FF", fontWeight: 600 }}>{sup}</span>
                <span style={{ color: "rgba(214,228,255,0.85)", fontSize: 11 }}>{t.itemCount} items</span>
                <span style={{ color: "#bbf7d0", fontWeight: 800, fontSize: 13 }}>{fmt(t.total)}</span>
              </div>
            );
          })}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, marginTop: 6, borderTop: "2px solid rgba(255,255,255,0.20)" }}>
            <span style={{ color: "#F4F8FF", fontSize: 13, fontWeight: 700 }}>TOTAL GENERAL</span>
            <span style={{ color: "#F4F8FF", fontSize: 16, fontWeight: 800 }}>{fmt(totalGlobal)}</span>
          </div>
        </div>
      )}

      {modo === "elegir" && itemsAsignados < items_detail.length && (
        <div style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.30)", borderRadius: 8, padding: 10, color: "#FCD34D", fontSize: 12 }}>
          ⚠️ Faltan {items_detail.length - itemsAsignados} producto(s) sin asignar proveedor
        </div>
      )}

      {modo === "volver" && (
        <div style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.40)", borderRadius: 12, padding: 14 }}>
          <div style={{ color: "#FCD34D", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Volver a cotizar</div>
          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo: pedir descuento, cambiar proveedor, etc." rows={2} style={{ width: "100%", padding: 10, borderRadius: 8, background: "rgba(0,0,0,0.30)", border: "1px solid rgba(245,158,11,0.30)", color: "#F4F8FF", fontSize: 12, fontFamily: "inherit", resize: "vertical", outline: "none", marginBottom: 10 }} />
          <textarea value={sugerencia} onChange={(e) => setSugerencia(e.target.value)} placeholder="Sugerencia: probar con XYZ proveedor, etc. (opcional)" rows={2} style={{ width: "100%", padding: 10, borderRadius: 8, background: "rgba(0,0,0,0.30)", border: "1px solid rgba(245,158,11,0.30)", color: "#F4F8FF", fontSize: 12, fontFamily: "inherit", resize: "vertical", outline: "none" }} />
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button onClick={() => submit("VOLVER_COTIZAR")} disabled={submitting} style={{ flex: 1, padding: "12px", borderRadius: 999, background: "linear-gradient(135deg,#F59E0B 0%,#D97706 100%)", color: "#1A1206", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}>{submitting ? "Enviando..." : "Enviar a Compras"}</button>
            <button onClick={() => setModo("elegir")} disabled={submitting} style={{ padding: "12px 18px", borderRadius: 999, background: "transparent", color: "rgba(214,228,255,0.70)", fontWeight: 600, fontSize: 13, border: "1px solid rgba(124,148,180,0.30)", cursor: "pointer" }}>Cancelar</button>
          </div>
        </div>
      )}

      {modo === "rechazar" && (
        <div style={{ background: "rgba(220,38,38,0.10)", border: "1px solid rgba(220,38,38,0.40)", borderRadius: 12, padding: 14 }}>
          <div style={{ color: "#FCA5A5", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Rechazar requisicion</div>
          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo del rechazo" rows={3} style={{ width: "100%", padding: 10, borderRadius: 8, background: "rgba(0,0,0,0.30)", border: "1px solid rgba(220,38,38,0.30)", color: "#F4F8FF", fontSize: 12, fontFamily: "inherit", resize: "vertical", outline: "none" }} />
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button onClick={() => submit("RECHAZADA")} disabled={submitting} style={{ flex: 1, padding: "12px", borderRadius: 999, background: "linear-gradient(135deg,#DC2626 0%,#A21D1D 100%)", color: "#F4F8FF", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}>{submitting ? "Enviando..." : "Confirmar rechazo"}</button>
            <button onClick={() => setModo("elegir")} disabled={submitting} style={{ padding: "12px 18px", borderRadius: 999, background: "transparent", color: "rgba(214,228,255,0.70)", fontWeight: 600, fontSize: 13, border: "1px solid rgba(124,148,180,0.30)", cursor: "pointer" }}>Cancelar</button>
          </div>
        </div>
      )}

      {modo === "elegir" && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => submit("AUTORIZADA")}
            disabled={submitting || itemsAsignados === 0}
            style={{
              flex: "1 1 240px",
              padding: "16px 20px",
              borderRadius: 999,
              background: (submitting || itemsAsignados === 0) ? "rgba(124,148,180,0.20)" : "linear-gradient(135deg,#1F8A60 0%,#16704D 100%)",
              color: "#F4F8FF",
              fontWeight: 800,
              fontSize: 14,
              border: "none",
              cursor: submitting ? "not-allowed" : "pointer",
              boxShadow: (submitting || itemsAsignados === 0) ? "none" : "0 6px 18px rgba(22,112,77,0.40)",
              letterSpacing: "0.02em",
            }}
          >
            {submitting ? "Procesando..." : `Autorizar y generar ${proveedoresElegidos.length} OC${proveedoresElegidos.length === 1 ? "" : "s"}`}
          </button>
          <button onClick={() => setModo("volver")} disabled={submitting} style={{ flex: "1 1 180px", padding: "14px", borderRadius: 999, background: "rgba(245,158,11,0.18)", color: "#FCD34D", fontWeight: 700, fontSize: 13, border: "1px solid rgba(245,158,11,0.35)", cursor: "pointer" }}>Volver a cotizar</button>
          <button onClick={() => setModo("rechazar")} disabled={submitting} style={{ flex: "1 1 140px", padding: "14px", borderRadius: 999, background: "transparent", color: "#FCA5A5", fontWeight: 700, fontSize: 13, border: "1px solid rgba(220,38,38,0.35)", cursor: "pointer" }}>Rechazar</button>
        </div>
      )}

      <div style={{ color: "rgba(214,228,255,0.40)", fontSize: 10, textAlign: "center", letterSpacing: "0.04em" }}>
        Folio {folio} · {obra} · solicitante {solicitante}
        {urgency && urgency !== "normal" ? ` · ${urgency.toUpperCase()}` : ""}
      </div>
    </div>
  );
}
