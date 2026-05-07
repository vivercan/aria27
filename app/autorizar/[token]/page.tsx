import { supabase } from "@/lib/supabase";
import AutorizarForm from "./AutorizarForm";

export default async function AutorizarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const { data: req } = await supabase
    .from("Requisiciones")
    .select("*")
    .eq("authorization_comments", token)
    .single();

  // === Estado: token invalido ===
  if (!req) {
    return (
      <html lang="es">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet" />
        </head>
        <body style={{ margin: 0 }}>
          <div style={{ fontFamily: "Outfit, sans-serif", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: 24, background: "linear-gradient(135deg,#040810 0%,#091525 100%)" }}>
            <div style={{ textAlign: "center", background: "linear-gradient(135deg,#0F1A2E 0%,#091525 100%)", border: "1px solid rgba(220,38,38,0.30)", padding: "48px 36px", borderRadius: 18, maxWidth: 460, color: "#F4F8FF" }}>
              <div style={{ width: 64, height: 64, borderRadius: 999, background: "linear-gradient(135deg,#DC2626 0%,#A21D1D 100%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", color: "#F4F8FF", fontSize: 30, fontWeight: 800 }}>!</div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Enlace invalido</h1>
              <p style={{ color: "rgba(214,228,255,0.65)", fontSize: 13, margin: 0 }}>Este enlace ya fue procesado o ha expirado.</p>
            </div>
          </div>
        </body>
      </html>
    );
  }

  // === Estado: ya procesada ===
  if (req.status !== "EN_AUTORIZACION") {
    return (
      <html lang="es">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet" />
        </head>
        <body style={{ margin: 0 }}>
          <div style={{ fontFamily: "Outfit, sans-serif", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: 24, background: "linear-gradient(135deg,#040810 0%,#091525 100%)" }}>
            <div style={{ textAlign: "center", background: "linear-gradient(135deg,#0F1A2E 0%,#091525 100%)", border: "1px solid rgba(245,158,11,0.30)", padding: "48px 36px", borderRadius: 18, maxWidth: 460, color: "#F4F8FF" }}>
              <div style={{ width: 64, height: 64, borderRadius: 999, background: "linear-gradient(135deg,#F59E0B 0%,#D97706 100%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", color: "#1A1206", fontSize: 28, fontWeight: 800 }}>i</div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Requisicion procesada</h1>
              <p style={{ color: "rgba(214,228,255,0.65)", fontSize: 13, margin: 0 }}>{req.folio} - estado: <span style={{ color: "#F4F8FF", fontWeight: 600 }}>{req.status}</span></p>
            </div>
          </div>
        </body>
      </html>
    );
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
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0 }}>
        <div style={{ fontFamily: "Outfit, sans-serif", minHeight: "100vh", background: "linear-gradient(180deg,#040810 0%,#0A1830 60%,#040810 100%)", color: "#F4F8FF", padding: "28px 16px 48px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ background: "linear-gradient(135deg,#123E92 0%,#0F2D6E 100%)", padding: "26px 24px", borderRadius: "18px 18px 0 0", textAlign: "center" }}>
              <span style={{ color: "rgba(214,228,255,0.65)", fontSize: 11, fontWeight: 600, letterSpacing: "0.18em" }}>ARIA27 - GRUPO AVANTE</span>
              <h1 style={{ fontSize: 26, fontWeight: 800, margin: "8px 0 0", color: "#F4F8FF", letterSpacing: "-0.02em" }}>Autorizacion de compra</h1>
              <div style={{ color: "rgba(214,228,255,0.70)", fontSize: 13, marginTop: 6 }}>
                {req.folio} - {req.cost_center_name}
              </div>
            </div>

            <div style={{ background: "linear-gradient(135deg,#0F1A2E 0%,#091525 100%)", borderRadius: "0 0 18px 18px", padding: 22, marginBottom: 16, border: "1px solid rgba(124,148,180,0.18)", borderTop: "1px solid rgba(124,148,180,0.10)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 14, marginBottom: 0 }}>
                <div>
                  <p style={{ color: "rgba(214,228,255,0.50)", fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", margin: "0 0 4px", textTransform: "uppercase" }}>Folio</p>
                  <p style={{ color: "#F4F8FF", fontWeight: 700, fontSize: 17, margin: 0 }}>{req.folio}</p>
                </div>
                <div>
                  <p style={{ color: "rgba(214,228,255,0.50)", fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", margin: "0 0 4px", textTransform: "uppercase" }}>Obra</p>
                  <p style={{ color: "#F4F8FF", fontWeight: 600, fontSize: 14, margin: 0 }}>{req.cost_center_name}</p>
                </div>
                <div>
                  <p style={{ color: "rgba(214,228,255,0.50)", fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", margin: "0 0 4px", textTransform: "uppercase" }}>Solicitante</p>
                  <p style={{ color: "#F4F8FF", fontSize: 13, fontWeight: 500, margin: 0 }}>{solicitante}</p>
                </div>
                {req.urgency && req.urgency !== "normal" && (
                  <div style={{ display: "flex", alignItems: "flex-end" }}>
                    <span style={{ background: req.urgency === "critico" ? "linear-gradient(135deg,#DC2626 0%,#A21D1D 100%)" : "linear-gradient(135deg,#F59E0B 0%,#D97706 100%)", color: req.urgency === "critico" ? "#F4F8FF" : "#1A1206", padding: "5px 12px", borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em" }}>{String(req.urgency).toUpperCase()}</span>
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
              <span style={{ color: "rgba(124,148,180,0.40)", fontSize: 10, letterSpacing: "0.12em" }}>ARIA27 - GRUPO CONSTRUCTOR URBANO AVANTE</span>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
