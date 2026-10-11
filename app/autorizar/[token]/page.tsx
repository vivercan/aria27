import { supabase } from "@/lib/supabase";
import AutorizarForm from "./AutorizarForm";
import AutorizarDirecta from "./AutorizarDirecta";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { tieneComparativa } from "@/lib/autorizar-direccion";

export default async function AutorizarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const { data: req } = await supabase
    .from("Requisiciones")
    .select("*")
    .eq("authorization_comments", token)
    .single();

  // === Estado: token invalido ===
  if (!req) return <Aviso tono="#d0304a" signo="!" titulo="Este enlace ya no sirve" texto="Ya se autorizó o expiró. Si necesitas algo, abre Doménica 27 desde tu celular." />;

  // === Estado: ya procesada ===
  if (req.status !== "EN_AUTORIZACION") return <Aviso tono="#0073ea" signo="i" titulo="Esta solicitud ya se atendió" texto={`${req.folio || ""} · ${String(req.status || "").replace(/_/g, " ").toLowerCase()}`} />;

  // 11-Oct-2026: sin comparativa de Compras → autorización directa (antes mostraba $0.00 y no dejaba aprobar)
  if (!tieneComparativa((req as Record<string, unknown>).cotizacion_data)) {
    const r = req as Record<string, unknown>;
    const { data: its } = await getSupabaseAdmin().from("requisition_items").select("product_name, quantity, unit, precio_total, selected_price, precio_unitario").eq("requisition_id", String(r.id));
    const partidas = ((its || []) as { product_name: string | null; quantity: number | null; unit: string | null; precio_total: number | null; selected_price: number | null; precio_unitario: number | null }[])
      .map(x => ({ n: x.product_name || "", c: x.quantity, u: x.unit, p: Number(x.precio_total) || (Number(x.selected_price || x.precio_unitario) || 0) * (Number(x.quantity) || 0) || null }));
    const total = Number(r.total) || Number(r.monto) || partidas.reduce((s, x) => s + (x.p || 0), 0);
    return <AutorizarDirecta d={{
      token, folio: String(r.folio), obra: (r.cost_center_name as string) || null, quien: (r.solicitante_nombre_completo as string) || (r.created_by as string) || null,
      creada: String(r.created_at), para: (r.required_date as string) || null, motivo: (r.motivo_solicitud as string) || (r.descripcion_corta as string) || null,
      tipo: (r.tipo_solicitud as string) || null, efectivo: r.purchase_status === "GASTO_EFECTIVO_PENDIENTE" || /EFECTIVO|CAJA/i.test(String(r.forma_pago || "")),
      proveedor: (r.proveedor_nombre as string) || (r.proveedor as string) || null, banco: (r.banco as string) || null, total, partidas,
    }} />;
  }

  interface Quote {
    supplier: string;
    total: number;
    subtotal?: number;
    iva?: number;
    tax_rate?: number;
    advance_percentage?: number;
    advance_amount?: number;
    factura?: boolean | string;
    entrega?: string | number;
    delivery?: string;
    forma_pago?: string;
    payment?: string;
    credito?: string;
    credit?: string;
    dias_credito?: number;
    rebaja_iva?: boolean;
    notas?: string;
    items_prices?: Record<string, number>;
    observaciones?: string;
    [key: string]: unknown;
  }

  const cotData = (req as Record<string, unknown>).cotizacion_data as Record<string, unknown> || {};
  const quotes: Quote[] = ((cotData as Record<string, unknown>).quotes as Quote[]) || [];
  // 6-May-2026: BUGFIX precios "—". cotData.quotes a menudo trae items_prices vacio,
  // pero cotData.suppliers SI los trae completos (set por enviar-comparativa). Mergear.
  const suppliersList = ((cotData as Record<string, unknown>).suppliers as Array<{ supplier?: string; items_prices?: Record<string, number> }>) || [];
  const supplierPricesMap: Record<string, Record<string, number>> = {};
  for (const s of suppliersList) {
    if (s && s.supplier && s.items_prices) {
      supplierPricesMap[s.supplier] = s.items_prices;
    }
  }
  const items: string[] = ((cotData as Record<string, unknown>).items as string[]) || [];
  const itemsDetailRaw = ((cotData as Record<string, unknown>).items_detail as Array<{product_name: string; quantity: number; unit: string}>) || [];
  // Si no viene items_detail, construirlo desde items con qty=1
  const itemsDetail = itemsDetailRaw.length > 0 ? itemsDetailRaw : items.map((p) => ({ product_name: String(p), quantity: 1, unit: "PZA" }));
  const solicitante = req.created_by || "N/A";

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <div style={{ fontFamily: "var(--font-dom), ui-sans-serif, system-ui, sans-serif", minHeight: "100vh", background: "#f6f7fa", color: "#0f172a", padding: "28px 16px 48px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ background: "#0060c7", padding: "26px 24px", borderRadius: "18px 18px 0 0", textAlign: "center" }}>
              <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: 600, letterSpacing: "0.18em" }}>ARIA27 - GRUPO AVANTE</span>
              <h1 style={{ fontSize: 26, fontWeight: 800, margin: "8px 0 0", color: "#ffffff", letterSpacing: "-0.02em" }}>Autorizacion de compra</h1>
              <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 6 }}>
                {req.folio} - {req.cost_center_name}
              </div>
            </div>

            <div style={{ background: "#ffffff", borderRadius: "0 0 18px 18px", padding: 22, marginBottom: 16, border: "1px solid rgba(15,23,42,0.08)", borderTop: "1px solid rgba(15,23,42,0.06)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 14, marginBottom: 0 }}>
                <div>
                  <p style={{ color: "#55657c", fontSize: 11, fontWeight: 700, letterSpacing: "0.10em", margin: "0 0 4px", textTransform: "uppercase" }}>Folio</p>
                  <p style={{ color: "#0f172a", fontWeight: 700, fontSize: 17, margin: 0 }}>{req.folio}</p>
                </div>
                <div>
                  <p style={{ color: "#55657c", fontSize: 11, fontWeight: 700, letterSpacing: "0.10em", margin: "0 0 4px", textTransform: "uppercase" }}>Obra</p>
                  <p style={{ color: "#0f172a", fontWeight: 600, fontSize: 14, margin: 0 }}>{req.cost_center_name}</p>
                </div>
                <div>
                  <p style={{ color: "#55657c", fontSize: 11, fontWeight: 700, letterSpacing: "0.10em", margin: "0 0 4px", textTransform: "uppercase" }}>Solicitante</p>
                  <p style={{ color: "#0f172a", fontSize: 13, fontWeight: 500, margin: 0 }}>{solicitante}</p>
                </div>
                {req.urgency && req.urgency !== "normal" && (
                  <div style={{ display: "flex", alignItems: "flex-end" }}>
                    <span style={{ background: req.urgency === "critico" ? "#d0304a" : "#b85507", color: "#ffffff", padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}>{String(req.urgency).toUpperCase()}</span>
                  </div>
                )}
              </div>

            </div>

            <AutorizarForm
              token={token}
              folio={req.folio}
              obra={req.cost_center_name || "-"}
              solicitante={solicitante}
              urgency={req.urgency}
              items_detail={itemsDetail}
              quotes={quotes.map((q) => ({
                supplier: q.supplier || "",
                subtotal: Number(q.subtotal ?? q.total ?? 0),
                iva: Number(q.iva ?? 0),
                total: Number(q.total ?? 0),
                tax_rate: Number(q.tax_rate ?? 16),
                advance_percentage: Number(q.advance_percentage ?? 0),
                advance_amount: Number(q.advance_amount ?? 0),
                forma_pago: q.forma_pago || q.payment || "",
                entrega: q.entrega ?? q.delivery ?? "",
                dias_credito: Number(q.dias_credito ?? 0),
                rebaja_iva: Boolean(q.rebaja_iva),
                notas: typeof q.notas === "string" ? q.notas : "",
                items_prices: (q.items_prices && Object.keys(q.items_prices).length > 0) ? (q.items_prices as Record<string, number>) : (supplierPricesMap[q.supplier || ""] || {}),
                observaciones: typeof q.observaciones === "string" ? q.observaciones : "",
              }))}
            />

            <div style={{ textAlign: "center", marginTop: 28 }}>
              <span style={{ color: "#8a97ab", fontSize: 11, letterSpacing: "0.12em" }}>ARIA27 - GRUPO CONSTRUCTOR URBANO AVANTE</span>
            </div>
          </div>
        </div>
    </>
  );
}

/** Aviso claro (Doménica 27) para enlaces viejos o ya atendidos · 11-Oct-2026 */
function Aviso({ tono, signo, titulo, texto }: { tono: string; signo: string; titulo: string; texto: string }) {
  return (
    <div style={{ fontFamily: "var(--font-dom), ui-sans-serif, system-ui, sans-serif", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100dvh", padding: 24, background: "#f6f7fa" }}>
      <div style={{ textAlign: "center", background: "#ffffff", border: "1px solid rgba(15,23,42,.08)", padding: "40px 28px", borderRadius: 24, maxWidth: 420, width: "100%", color: "#0f172a", boxShadow: "0 1px 2px rgba(15,23,42,.06)" }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: tono, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", color: "#fff", fontSize: 30, fontWeight: 800 }}>{signo}</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>{titulo}</h1>
        <p style={{ color: "#55657c", fontSize: 15, margin: 0, lineHeight: 1.45 }}>{texto}</p>
      </div>
    </div>
  );
}
