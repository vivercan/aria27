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
type Vista = "resumen" | "categorias" | "detalle";

// Categorizar producto por keywords
function categorizar(name: string): string {
  const n = name.toLowerCase();
  if (/cemento|arena|grava|cal\b|tepetate|mortero|concreto/.test(n)) return "Estructurales";
  if (/varilla|bloque|tabique|acero|estribo|alambr[oe]n/.test(n)) return "Estructurales";
  if (/cable|apagador|contacto|pastilla|centro de carga|foco|conduit|breaker|interruptor/.test(n)) return "Eléctrico";
  if (/pvc|codo|tee\b|tuberia|tubo|fluxometro|llave|manguera|sanitario|hidraulico/.test(n)) return "Plomería";
  if (/pintura|esmalte|lija|masking|brocha|rodillo|barniz|sellador|silicon|impermeabili/.test(n)) return "Acabados";
  if (/casco|botas?|guantes|lentes|chaleco|carretilla|pala|cinta|martillo|escalera|llanta|herramienta/.test(n)) return "Herramienta y EPP";
  if (/clavo|alambre|tornillo|tuerca|adhesivo|cinchos|amarre/.test(n)) return "Misceláneos";
  return "Otros";
}

const COLORES_CAT: Record<string, string> = {
  "Estructurales": "#1f8500",
  "Eléctrico": "#fbbf24",
  "Plomería": "#3b82f6",
  "Acabados": "#a855f7",
  "Herramienta y EPP": "#f97316",
  "Misceláneos": "#94a3b8",
  "Otros": "#94a3b8",
};

export default function AutorizarForm({
  token, folio, obra, solicitante, urgency, items_detail, quotes,
}: Props) {
  const [vista, setVista] = useState<Vista>("resumen");

  // Selecciones por defecto = mejor precio por item
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
  const [modalDesc, setModalDesc] = useState<{ item: ItemDetail; quote: QuoteWithItems; price: number } | null>(null);
  const [descSugerido, setDescSugerido] = useState<string>("");
  const [descNotas, setDescNotas] = useState<string>("");
  const [descsSolicitados, setDescsSolicitados] = useState<Record<string, { price: number; notas: string }>>({});

  // Categorización de items
  const itemsConCategoria = useMemo(() => items_detail.map((it) => ({ ...it, categoria: categorizar(it.product_name) })), [items_detail]);
  const categorias = useMemo(() => Array.from(new Set(itemsConCategoria.map((i) => i.categoria))), [itemsConCategoria]);
  const [tabActivo, setTabActivo] = useState<string>(categorias[0] || "Otros");

  // Totales por proveedor según selecciones actuales
  const totales = useMemo(() => {
    const t: Record<string, { subtotal: number; iva: number; total: number; itemCount: number }> = {};
    quotes.forEach((q) => { t[q.supplier] = { subtotal: 0, iva: 0, total: 0, itemCount: 0 }; });
    items_detail.forEach((it) => {
      const supplier = selecciones[it.product_name];
      if (!supplier) return;
      const q = quotes.find((qu) => qu.supplier === supplier);
      if (!q) return;
      const price = q.items_prices?.[it.product_name] || 0;
      const sub = price * (it.quantity || 1);
      const iva = sub * ((q.tax_rate ?? 16) / 100);
      t[supplier].subtotal += sub;
      t[supplier].iva += iva;
      t[supplier].total += sub + iva;
      t[supplier].itemCount++;
    });
    return t;
  }, [selecciones, items_detail, quotes]);

  const proveedoresElegidos = useMemo(() => Array.from(new Set(Object.values(selecciones).filter(Boolean))), [selecciones]);
  const totalGlobal = useMemo(() => Object.values(totales).reduce((s, t) => s + t.total, 0), [totales]);

  // Calcular ahorro vs comprar TODO al proveedor más caro single-supplier
  const ahorroVsPeor = useMemo(() => {
    const totalPorProv = quotes.map((q) => {
      let sum = 0;
      items_detail.forEach((it) => {
        const p = q.items_prices?.[it.product_name];
        if (p) sum += p * (it.quantity || 1) * (1 + (q.tax_rate ?? 16) / 100);
      });
      return sum;
    });
    const peor = Math.max(...totalPorProv.filter((t) => t > 0));
    return peor - totalGlobal;
  }, [quotes, items_detail, totalGlobal]);

  // Mejor precio por item
  const mejorPorItem = useMemo(() => {
    const m: Record<string, string> = {};
    items_detail.forEach((it) => {
      let best = ""; let bestP = Infinity;
      quotes.forEach((q) => {
        const p = q.items_prices?.[it.product_name];
        if (p !== undefined && p > 0 && p < bestP) { bestP = p; best = q.supplier; }
      });
      if (best) m[it.product_name] = best;
    });
    return m;
  }, [items_detail, quotes]);

  const fmt = (n: number) => "$" + (n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const itemsAsignados = Object.values(selecciones).filter(Boolean).length;

  const submit = async (action: "AUTORIZADA" | "VOLVER_COTIZAR" | "RECHAZADA") => {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { token, action };
      if (action === "AUTORIZADA") body.selecciones = selecciones;
      if (action === "VOLVER_COTIZAR") { if (motivo) body.motivo = motivo; if (sugerencia) body.sugerencia = sugerencia; }
      if (action === "RECHAZADA" && motivo) body.motivo = motivo;
      const resp = await fetch("/api/requisicion/approve-purchase", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (resp.ok) { const html = await resp.text(); document.open(); document.write(html); document.close(); }
      else alert("Error: " + resp.status);
    } catch (e) { alert("Error de red: " + (e as Error).message); }
    finally { setSubmitting(false); }
  };

  const enviarDescuento = async () => {
    if (!modalDesc) return;
    const sugerido = parseFloat(descSugerido) || 0;
    if (sugerido <= 0 || sugerido >= modalDesc.price) { alert("Precio sugerido debe ser menor al actual"); return; }
    try {
      const r = await fetch("/api/requisicion/pedir-descuento", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, item_name: modalDesc.item.product_name, supplier: modalDesc.quote.supplier, precio_actual: modalDesc.price, precio_sugerido: sugerido, notas: descNotas, quantity: modalDesc.item.quantity, unit: modalDesc.item.unit }),
      });
      if (r.ok) {
        const key = modalDesc.item.product_name + "::" + modalDesc.quote.supplier;
        setDescsSolicitados((p) => ({ ...p, [key]: { price: sugerido, notas: descNotas } }));
        setModalDesc(null); setDescSugerido(""); setDescNotas("");
        alert("Solicitud enviada a Compras");
      } else alert("Error: " + r.status);
    } catch { alert("Error de red"); }
  };

  // Helper render celda de matriz
  const renderCelda = (it: ItemDetail, q: QuoteWithItems, cidx: number) => {
    const price = q.items_prices?.[it.product_name];
    const isMejor = mejorPorItem[it.product_name] === q.supplier;
    const isSeleccionado = selecciones[it.product_name] === q.supplier;
    if (price === undefined || price === null) return <td key={cidx} style={{ padding: "10px 6px", textAlign: "center", color: "#8a97ab", fontSize: 11 }}>—</td>;
    const descKey = it.product_name + "::" + q.supplier;
    const descSolicitado = descsSolicitados[descKey];
    return (
      <td key={cidx} style={{ padding: 4, textAlign: "center", verticalAlign: "middle", position: "relative" }}>
        <button onClick={() => setSelecciones((s) => ({ ...s, [it.product_name]: q.supplier }))}
          style={{ width: "100%", padding: "8px 6px", borderRadius: 8, border: isSeleccionado ? "2px solid #1f8500" : "1px solid rgba(15,23,42,0.10)", background: isSeleccionado ? "rgba(34,197,94,0.18)" : (isMejor ? "rgba(34,197,94,0.06)" : "#f6f7fa"), color: isSeleccionado ? "#157000" : (isMejor ? "#1f8f00" : "#334155"), fontSize: 11, fontWeight: isSeleccionado ? 700 : 500, cursor: "pointer", fontFamily: "inherit", minWidth: 100 }}>
          {fmt(price)}
          {isMejor && !isSeleccionado && <div style={{ fontSize: 11, color: "#1f8f00", marginTop: 2 }}>★ mejor</div>}
          {isSeleccionado && <div style={{ fontSize: 11, marginTop: 2 }}>✓ elegido</div>}
          {descSolicitado && <div style={{ fontSize: 11, color: "#9a4a05", marginTop: 2 }}>{fmt(descSolicitado.price)}</div>}
        </button>
        <button onClick={(e) => { e.stopPropagation(); setModalDesc({ item: it, quote: q, price }); setDescSugerido(String(price * 0.9)); setDescNotas(""); }}
          title="Pedir descuento" style={{ position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: 999, border: "1px solid rgba(252,211,77,0.40)", background: descSolicitado ? "rgba(252,211,77,0.30)" : "#ffffff", color: "#9a4a05", fontSize: 11, cursor: "pointer", padding: 0, lineHeight: "1", fontFamily: "inherit" }}>💬</button>
      </td>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Tabs de vistas */}
      <div style={{ display: "flex", gap: 6, padding: 4, background: "#f1f4f9", borderRadius: 12, border: "1px solid rgba(15,23,42,0.10)" }}>
        {[{ k: "resumen", label: "Recomendación" }, { k: "categorias", label: "Por categoría" }, { k: "detalle", label: "Matriz completa" }].map((t) => (
          <button key={t.k} onClick={() => setVista(t.k as Vista)}
            style={{ flex: 1, padding: "10px 8px", borderRadius: 8, border: "none", background: vista === t.k ? "#0073ea" : "transparent", color: vista === t.k ? "#ffffff" : "#55657c", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{t.label}</button>
        ))}
      </div>

      {/* ============ VISTA: RESUMEN/RECOMENDACION ============ */}
      {vista === "resumen" && (
        <div style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.10)", borderRadius: 14, padding: 20 }}>
          <div style={{ color: "#1f8f00", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>Recomendación de Doménica</div>
          <div style={{ color: "#0f172a", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Distribución óptima para {items_detail.length} productos</div>
          <div style={{ color: "#55657c", fontSize: 12, marginBottom: 18 }}>{folio} · {obra}</div>

          {proveedoresElegidos.map((sup) => {
            const t = totales[sup];
            const q = quotes.find((qu) => qu.supplier === sup);
            return (
              <div key={sup} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", margin: "8px 0", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.20)", borderRadius: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#0f172a", fontWeight: 700, fontSize: 14 }}>{sup}</div>
                  <div style={{ color: "#55657c", fontSize: 11, marginTop: 2 }}>{t.itemCount} items · entrega {q?.entrega || "—"}d · {q?.forma_pago || "—"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#157000", fontSize: 16, fontWeight: 800 }}>{fmt(t.total)}</div>
                </div>
              </div>
            );
          })}

          <div style={{ borderTop: "2px solid rgba(15,23,42,0.14)", marginTop: 14, paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#55657c", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>TOTAL c/IVA</span>
            <span style={{ color: "#0f172a", fontSize: 24, fontWeight: 800 }}>{fmt(totalGlobal)}</span>
          </div>

          {ahorroVsPeor > 0 && (
            <div style={{ marginTop: 10, padding: "10px 14px", background: "#eafbe2", borderRadius: 10, color: "#1f6f00", fontSize: 13, fontWeight: 600, textAlign: "center" }}>
              Te ahorras <strong style={{ fontSize: 16 }}>{fmt(ahorroVsPeor)}</strong> vs comprar todo a un proveedor único
            </div>
          )}

          <div style={{ marginTop: 14, padding: 10, background: "#f6f7fa", borderRadius: 8, color: "#55657c", fontSize: 11, lineHeight: 1.5 }}>
            Si quieres ajustar: <strong style={{ color: "#0f172a" }}>"Por categoría"</strong> para revisar bloques · <strong style={{ color: "#0f172a" }}>"Matriz completa"</strong> para detalle por celda
          </div>
        </div>
      )}

      {/* ============ VISTA: TABS POR CATEGORÍA ============ */}
      {vista === "categorias" && (
        <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: 6, background: "#f1f4f9", borderRadius: 10 }}>
            {categorias.map((cat) => {
              const items = itemsConCategoria.filter((i) => i.categoria === cat);
              const color = COLORES_CAT[cat] || "#94a3b8";
              const isActive = tabActivo === cat;
              return (
                <button key={cat} onClick={() => setTabActivo(cat)}
                  style={{ padding: "8px 14px", borderRadius: 8, border: isActive ? `2px solid ${color}` : "1px solid rgba(15,23,42,0.10)", background: isActive ? `${color}20` : "transparent", color: isActive ? color : "#55657c", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  {cat} <span style={{ opacity: 0.7, fontSize: 11, marginLeft: 4 }}>({items.length})</span>
                </button>
              );
            })}
          </div>

          <div style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.10)", borderRadius: 14, padding: 12, overflow: "auto", maxHeight: "55vh" }}>
            <table style={{ borderCollapse: "separate", borderSpacing: 0, fontSize: 12, color: "#0f172a", minWidth: 600 }}>
              <thead>
                <tr>
                  <th style={{ position: "sticky", left: 0, top: 0, background: "#f1f4f9", padding: "8px 10px", textAlign: "left", borderBottom: "2px solid rgba(15,23,42,0.14)", borderRight: "2px solid rgba(15,23,42,0.14)", fontSize: 11, color: "#55657c", textTransform: "uppercase", fontWeight: 700, zIndex: 3, minWidth: 180 }}>Producto</th>
                  <th style={{ position: "sticky", top: 0, background: "#f1f4f9", padding: "8px 6px", textAlign: "center", borderBottom: "2px solid rgba(15,23,42,0.14)", fontSize: 11, color: "#55657c", fontWeight: 700, zIndex: 2, minWidth: 50 }}>Cant</th>
                  <th style={{ position: "sticky", top: 0, background: "#f1f4f9", padding: "8px 6px", textAlign: "center", borderBottom: "2px solid rgba(15,23,42,0.14)", fontSize: 11, color: "#55657c", fontWeight: 700, zIndex: 2, minWidth: 60 }}>Unidad</th>
                  {quotes.map((q, idx) => (<th key={idx} style={{ position: "sticky", top: 0, background: "#f1f4f9", padding: "8px 10px", textAlign: "center", borderBottom: "2px solid rgba(15,23,42,0.14)", fontSize: 11, color: "#0f172a", fontWeight: 700, zIndex: 2, minWidth: 130 }}>{q.supplier}</th>))}
                </tr>
              </thead>
              <tbody>
                {itemsConCategoria.filter((i) => i.categoria === tabActivo).map((it, ridx) => (
                  <tr key={ridx}>
                    <td style={{ position: "sticky", left: 0, background: "#ffffff", padding: "10px", borderRight: "2px solid rgba(15,23,42,0.10)", fontSize: 12, color: "#1e293b", fontWeight: 500 }}>{it.product_name}</td>
                    <td style={{ padding: "10px 6px", textAlign: "center", color: "#334155" }}>{it.quantity}</td>
                    <td style={{ padding: "10px 6px", textAlign: "center", color: "#55657c" }}>{it.unit || "PZA"}</td>
                    {quotes.map((q, cidx) => renderCelda(it, q, cidx))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ============ VISTA: MATRIZ COMPLETA ============ */}
      {vista === "detalle" && (
        <div style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.10)", borderRadius: 14, padding: 12, overflow: "auto", maxHeight: "60vh" }}>
          <table style={{ borderCollapse: "separate", borderSpacing: 0, fontSize: 12, color: "#0f172a", minWidth: 600 }}>
            <thead>
              <tr>
                <th style={{ position: "sticky", left: 0, top: 0, background: "#f1f4f9", padding: "8px 10px", textAlign: "left", borderBottom: "2px solid rgba(15,23,42,0.14)", borderRight: "2px solid rgba(15,23,42,0.14)", fontSize: 11, color: "#55657c", textTransform: "uppercase", fontWeight: 700, zIndex: 3, minWidth: 180 }}>Producto</th>
                <th style={{ position: "sticky", top: 0, background: "#f1f4f9", padding: "8px 6px", textAlign: "center", borderBottom: "2px solid rgba(15,23,42,0.14)", fontSize: 11, color: "#55657c", fontWeight: 700, zIndex: 2 }}>Cant</th>
                <th style={{ position: "sticky", top: 0, background: "#f1f4f9", padding: "8px 6px", textAlign: "center", borderBottom: "2px solid rgba(15,23,42,0.14)", fontSize: 11, color: "#55657c", fontWeight: 700, zIndex: 2 }}>Unidad</th>
                {quotes.map((q, idx) => (<th key={idx} style={{ position: "sticky", top: 0, background: "#f1f4f9", padding: "8px 10px", textAlign: "center", borderBottom: "2px solid rgba(15,23,42,0.14)", fontSize: 11, color: "#0f172a", fontWeight: 700, zIndex: 2, minWidth: 130 }}>{q.supplier}</th>))}
              </tr>
            </thead>
            <tbody>
              {items_detail.map((it, ridx) => (
                <tr key={ridx}>
                  <td style={{ position: "sticky", left: 0, background: "#ffffff", padding: "10px", borderRight: "2px solid rgba(15,23,42,0.10)", fontSize: 12, color: "#1e293b", fontWeight: 500 }}>{it.product_name}</td>
                  <td style={{ padding: "10px 6px", textAlign: "center", color: "#334155" }}>{it.quantity}</td>
                  <td style={{ padding: "10px 6px", textAlign: "center", color: "#55657c" }}>{it.unit || "PZA"}</td>
                  {quotes.map((q, cidx) => renderCelda(it, q, cidx))}
                </tr>
              ))}
              <tr style={{ borderTop: "2px solid rgba(15,23,42,0.14)" }}>
                <td colSpan={3} style={{ position: "sticky", left: 0, background: "#f1f4f9", padding: "10px", fontSize: 11, color: "#1f8f00", fontWeight: 800, borderRight: "2px solid rgba(15,23,42,0.14)" }}>TOTAL c/IVA</td>
                {quotes.map((q, idx) => { const t = totales[q.supplier]; return (<td key={idx} style={{ padding: "10px", textAlign: "right", color: t && t.itemCount > 0 ? "#157000" : "#8a97ab", fontSize: 13, fontWeight: 800, background: t && t.itemCount > 0 ? "rgba(34,197,94,0.10)" : "transparent" }}>{t && t.itemCount > 0 ? fmt(t.total) : "—"}</td>); })}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Resumen final + botones acción */}
      {modo === "elegir" && itemsAsignados < items_detail.length && (
        <div style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.30)", borderRadius: 8, padding: 10, color: "#9a4a05", fontSize: 12 }}>
          ⚠️ Faltan {items_detail.length - itemsAsignados} producto(s) sin asignar proveedor
        </div>
      )}

      {modo === "volver" && (
        <div style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.40)", borderRadius: 12, padding: 14 }}>
          <div style={{ color: "#9a4a05", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Volver a cotizar</div>
          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo" rows={2} style={{ width: "100%", padding: 10, borderRadius: 8, background: "#f1f4f9", border: "1px solid rgba(245,158,11,0.30)", color: "#0f172a", fontSize: 12, fontFamily: "inherit", resize: "vertical", outline: "none", marginBottom: 10 }} />
          <textarea value={sugerencia} onChange={(e) => setSugerencia(e.target.value)} placeholder="Sugerencia (opcional)" rows={2} style={{ width: "100%", padding: 10, borderRadius: 8, background: "#f1f4f9", border: "1px solid rgba(245,158,11,0.30)", color: "#0f172a", fontSize: 12, fontFamily: "inherit", resize: "vertical", outline: "none" }} />
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button onClick={() => submit("VOLVER_COTIZAR")} disabled={submitting} style={{ flex: 1, padding: "12px", borderRadius: 999, background: "#b85507", color: "#ffffff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}>{submitting ? "Enviando..." : "Enviar a Compras"}</button>
            <button onClick={() => setModo("elegir")} disabled={submitting} style={{ padding: "12px 18px", borderRadius: 999, background: "transparent", color: "#55657c", fontWeight: 600, fontSize: 13, border: "1px solid rgba(15,23,42,0.14)", cursor: "pointer" }}>Cancelar</button>
          </div>
        </div>
      )}

      {modo === "rechazar" && (
        <div style={{ background: "rgba(220,38,38,0.10)", border: "1px solid rgba(220,38,38,0.40)", borderRadius: 12, padding: 14 }}>
          <div style={{ color: "#c2182b", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Rechazar requisicion</div>
          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo del rechazo" rows={3} style={{ width: "100%", padding: 10, borderRadius: 8, background: "#f1f4f9", border: "1px solid rgba(220,38,38,0.30)", color: "#0f172a", fontSize: 12, fontFamily: "inherit", resize: "vertical", outline: "none" }} />
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button onClick={() => submit("RECHAZADA")} disabled={submitting} style={{ flex: 1, padding: "12px", borderRadius: 999, background: "#d0304a", color: "#ffffff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}>{submitting ? "Enviando..." : "Confirmar rechazo"}</button>
            <button onClick={() => setModo("elegir")} disabled={submitting} style={{ padding: "12px 18px", borderRadius: 999, background: "transparent", color: "#55657c", fontWeight: 600, fontSize: 13, border: "1px solid rgba(15,23,42,0.14)", cursor: "pointer" }}>Cancelar</button>
          </div>
        </div>
      )}

      {modo === "elegir" && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => submit("AUTORIZADA")} disabled={submitting || itemsAsignados === 0}
            style={{ flex: "1 1 240px", padding: "16px 20px", borderRadius: 999, background: (submitting || itemsAsignados === 0) ? "rgba(15,23,42,0.10)" : "#1f8500", textShadow: "0 1px 1px rgba(0,0,0,.28)", color: "#ffffff", fontWeight: 800, fontSize: 14, border: "none", cursor: submitting ? "not-allowed" : "pointer", boxShadow: (submitting || itemsAsignados === 0) ? "none" : "0 6px 18px rgba(22,112,77,0.40)" }}>
            {submitting ? "Procesando..." : `Aprobar y generar ${proveedoresElegidos.length} OC${proveedoresElegidos.length === 1 ? "" : "s"}`}
          </button>
          <button onClick={() => setModo("volver")} disabled={submitting} style={{ flex: "1 1 180px", padding: "14px", borderRadius: 999, background: "rgba(245,158,11,0.18)", color: "#9a4a05", fontWeight: 700, fontSize: 13, border: "1px solid rgba(245,158,11,0.35)", cursor: "pointer" }}>Volver a cotizar</button>
          <button onClick={() => setModo("rechazar")} disabled={submitting} style={{ flex: "1 1 140px", padding: "14px", borderRadius: 999, background: "transparent", color: "#c2182b", fontWeight: 700, fontSize: 13, border: "1px solid rgba(220,38,38,0.35)", cursor: "pointer" }}>Rechazar</button>
        </div>
      )}

      {/* Modal pedir descuento */}
      {modalDesc && (
        <div onClick={() => setModalDesc(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#ffffff", border: "1px solid rgba(252,211,77,0.40)", borderRadius: 14, padding: 20, maxWidth: 460, width: "100%" }}>
            <div style={{ color: "#9a4a05", fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 6 }}>Pedir descuento</div>
            <div style={{ color: "#0f172a", fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{modalDesc.item.product_name}</div>
            <div style={{ color: "#55657c", fontSize: 12, marginBottom: 14 }}>{modalDesc.quote.supplier} · {modalDesc.item.quantity} {modalDesc.item.unit} · actual <strong>{fmt(modalDesc.price)}</strong>/u</div>
            <label style={{ display: "block", color: "#55657c", fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>Precio sugerido ($)</label>
            <input type="number" step="0.01" value={descSugerido} onChange={(e) => setDescSugerido(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, background: "#f1f4f9", border: "1px solid rgba(252,211,77,0.30)", color: "#0f172a", fontSize: 14, fontFamily: "inherit", marginBottom: 12, outline: "none" }} />
            <label style={{ display: "block", color: "#55657c", fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>Notas</label>
            <textarea value={descNotas} onChange={(e) => setDescNotas(e.target.value)} rows={3} placeholder="Volumen, pago contado, urgencia..." style={{ width: "100%", padding: 10, borderRadius: 8, background: "#f1f4f9", border: "1px solid rgba(252,211,77,0.30)", color: "#0f172a", fontSize: 12, fontFamily: "inherit", resize: "vertical", outline: "none" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={enviarDescuento} style={{ flex: 1, padding: "12px", borderRadius: 999, background: "#b85507", color: "#ffffff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", fontFamily: "inherit" }}>Enviar a Compras</button>
              <button onClick={() => setModalDesc(null)} style={{ padding: "12px 18px", borderRadius: 999, background: "transparent", color: "#55657c", fontWeight: 600, fontSize: 13, border: "1px solid rgba(15,23,42,0.14)", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ color: "#8a97ab", fontSize: 11, textAlign: "center", letterSpacing: "0.04em" }}>
        Folio {folio} · {obra} · solicitante {solicitante}{urgency && urgency !== "normal" ? ` · ${urgency.toUpperCase()}` : ""}
      </div>
    </div>
  );
}
