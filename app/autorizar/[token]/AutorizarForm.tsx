"use client";

import { useState } from "react";

interface Quote {
  supplier: string;
  total: number;
  factura?: boolean | string;
  entrega?: string;
  delivery?: string;
  forma_pago?: string;
  payment?: string;
  credito?: string;
  credit?: string;
  dias_credito?: number;
  observaciones?: string;
  rebaja_iva?: boolean;
  advance_percentage?: number;
  [key: string]: unknown;
}

interface Props {
  token: string;
  folio: string;
  obra: string;
  solicitante: string;
  urgency?: string | null;
  items: string[];
  quotes: Quote[];
  bestSupplier: string | null;
}

type Modo = "elegir" | "volver" | "rechazar";

export default function AutorizarForm({
  token, folio, obra, solicitante, urgency, items, quotes, bestSupplier,
}: Props) {
  const [selected, setSelected] = useState<string>(bestSupplier || quotes[0]?.supplier || "");
  const [modo, setModo] = useState<Modo>("elegir");
  const [motivo, setMotivo] = useState<string>("");
  const [sugerencia, setSugerencia] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (action: "AUTORIZADA" | "VOLVER_COTIZAR" | "RECHAZADA") => {
    setSubmitting(true);
    const params = new URLSearchParams({ token, action });
    if (action === "AUTORIZADA" && selected) params.set("proveedor", selected);
    if (action === "VOLVER_COTIZAR") {
      if (motivo) params.set("motivo", motivo);
      if (sugerencia) params.set("sugerencia", sugerencia);
    }
    if (action === "RECHAZADA" && motivo) params.set("motivo", motivo);
    window.location.href = `/api/requisicion/approve-purchase?${params.toString()}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ background: "linear-gradient(135deg,#0F1A2E 0%,#091525 100%)", border: "1px solid rgba(124,148,180,0.18)", borderRadius: 16, padding: 22 }}>
        <div style={{ color: "rgba(214,228,255,0.55)", fontSize: 11, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 10 }}>
          Elige el proveedor a autorizar
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {quotes.map((q) => {
            const isSelected = selected === q.supplier;
            const isBest = q.supplier === bestSupplier;
            return (
              <label key={q.supplier} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 12, cursor: "pointer", background: isSelected ? "linear-gradient(135deg,#1F8A60 0%,#16704D 100%)" : "rgba(255,255,255,0.04)", border: isSelected ? "1px solid rgba(34,197,94,0.55)" : "1px solid rgba(124,148,180,0.20)", transition: "all 0.18s ease" }}>
                <input type="radio" name="prov" value={q.supplier} checked={isSelected} onChange={() => setSelected(q.supplier)} style={{ accentColor: "#16a34a", width: 18, height: 18, cursor: "pointer" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: isSelected ? "#F4F8FF" : "#D6E4FF", fontWeight: 700, fontSize: 15, letterSpacing: "-0.005em", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ flex: "0 1 auto", overflow: "hidden", textOverflow: "ellipsis" }}>{q.supplier}</span>
                    {isBest && (<span style={{ background: isSelected ? "rgba(255,255,255,0.22)" : "rgba(34,197,94,0.18)", color: isSelected ? "#F4F8FF" : "#86efac", padding: "2px 9px", borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" }}>MEJOR</span>)}
                  </div>
                  <div style={{ color: isSelected ? "rgba(255,255,255,0.78)" : "rgba(214,228,255,0.55)", fontSize: 11, marginTop: 2 }}>
                    {q.forma_pago || q.payment || "-"}
                    {q.dias_credito ? ` - ${q.dias_credito} dias credito` : ""}
                    {(q.entrega || q.delivery) ? ` - entrega ${q.entrega || q.delivery}` : ""}
                  </div>
                </div>
                <div style={{ color: isSelected ? "#F4F8FF" : "#D6E4FF", fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                  ${typeof q.total === "number" ? q.total.toLocaleString("es-MX") : q.total}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {modo === "volver" && (
        <div style={{ background: "linear-gradient(135deg,#3A2A0E 0%,#2A1F0A 100%)", border: "1px solid rgba(245,158,11,0.45)", borderRadius: 14, padding: 18 }}>
          <div style={{ color: "#FCD34D", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
            Volver a cotizar - explica por que
          </div>
          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. ninguno me convence en precio / quiero opciones de mayor calidad..." rows={2} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "rgba(0,0,0,0.30)", border: "1px solid rgba(245,158,11,0.30)", color: "#F4F8FF", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none" }} />
          <div style={{ marginTop: 10 }}>
            <input value={sugerencia} onChange={(e) => setSugerencia(e.target.value)} placeholder="Sugerencia de proveedor a contactar (opcional)" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "rgba(0,0,0,0.30)", border: "1px solid rgba(245,158,11,0.30)", color: "#F4F8FF", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={() => submit("VOLVER_COTIZAR")} disabled={submitting} style={{ flex: 1, padding: "12px 18px", borderRadius: 999, background: "linear-gradient(135deg,#F59E0B 0%,#D97706 100%)", color: "#1A1206", fontWeight: 700, fontSize: 14, border: "none", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1 }}>
              {submitting ? "Enviando..." : "Enviar a Compras para volver a cotizar"}
            </button>
            <button onClick={() => setModo("elegir")} disabled={submitting} style={{ padding: "12px 18px", borderRadius: 999, background: "transparent", color: "rgba(214,228,255,0.70)", fontWeight: 600, fontSize: 13, border: "1px solid rgba(124,148,180,0.30)", cursor: "pointer" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {modo === "rechazar" && (
        <div style={{ background: "linear-gradient(135deg,#3A1517 0%,#2B0E10 100%)", border: "1px solid rgba(220,38,38,0.45)", borderRadius: 14, padding: 18 }}>
          <div style={{ color: "#FCA5A5", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
            Rechazar requisicion - motivo
          </div>
          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. fuera de presupuesto / no procede esta compra..." rows={2} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "rgba(0,0,0,0.30)", border: "1px solid rgba(220,38,38,0.30)", color: "#F4F8FF", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none" }} />
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={() => submit("RECHAZADA")} disabled={submitting} style={{ flex: 1, padding: "12px 18px", borderRadius: 999, background: "linear-gradient(135deg,#DC2626 0%,#A21D1D 100%)", color: "#F4F8FF", fontWeight: 700, fontSize: 14, border: "none", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1 }}>
              {submitting ? "Enviando..." : "Confirmar rechazo"}
            </button>
            <button onClick={() => setModo("elegir")} disabled={submitting} style={{ padding: "12px 18px", borderRadius: 999, background: "transparent", color: "rgba(214,228,255,0.70)", fontWeight: 600, fontSize: 13, border: "1px solid rgba(124,148,180,0.30)", cursor: "pointer" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {modo === "elegir" && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => submit("AUTORIZADA")} disabled={submitting || !selected} style={{ flex: "1 1 220px", padding: "14px 24px", borderRadius: 999, background: (submitting || !selected) ? "rgba(124,148,180,0.20)" : "linear-gradient(135deg,#1F8A60 0%,#16704D 100%)", color: "#F4F8FF", fontWeight: 700, fontSize: 14, border: "none", cursor: submitting ? "not-allowed" : "pointer", boxShadow: (submitting || !selected) ? "none" : "0 6px 16px rgba(22,112,77,0.40)", letterSpacing: "0.02em" }}>
            {submitting ? "Procesando..." : `Autorizar con ${selected || "-"}`}
          </button>
          <button onClick={() => setModo("volver")} disabled={submitting} style={{ flex: "1 1 200px", padding: "14px 18px", borderRadius: 999, background: "linear-gradient(135deg,rgba(245,158,11,0.18) 0%,rgba(217,119,6,0.18) 100%)", color: "#FCD34D", fontWeight: 700, fontSize: 13, border: "1px solid rgba(245,158,11,0.35)", cursor: "pointer" }}>
            Volver a cotizar
          </button>
          <button onClick={() => setModo("rechazar")} disabled={submitting} style={{ flex: "1 1 160px", padding: "14px 18px", borderRadius: 999, background: "transparent", color: "#FCA5A5", fontWeight: 700, fontSize: 13, border: "1px solid rgba(220,38,38,0.35)", cursor: "pointer" }}>
            Rechazar
          </button>
        </div>
      )}

      <div style={{ color: "rgba(214,228,255,0.40)", fontSize: 11, textAlign: "center", letterSpacing: "0.04em" }}>
        Folio {folio} - {obra} - solicitante {solicitante}
        {urgency && urgency !== "normal" ? ` - ${urgency.toUpperCase()}` : ""}
        {items?.length ? ` - ${items.length} item(s)` : ""}
      </div>
    </div>
  );
}
