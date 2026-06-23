// 23-Jun-2026 — Combustibles 2.0 helpers WA Meta
// Wrapper sobre WhatsApp Cloud API para enviar templates de combustibles.
// Reutiliza WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_ID del env.

const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";
const PHONE_ID = process.env.WHATSAPP_PHONE_ID || "";

interface SendTemplateInput {
  to: string;          // E.164 sin + (ej. 5214494136333)
  template: string;    // nombre de plantilla en Meta
  bodyParams: string[]; // values para {{1}}, {{2}}, ...
  language?: string;   // default es_MX
}

interface SendTemplateResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  raw?: unknown;
}

export async function sendCombTemplate(input: SendTemplateInput): Promise<SendTemplateResult> {
  if (!TOKEN || !PHONE_ID) {
    return { ok: false, error: "WhatsApp env missing" };
  }
  const to = String(input.to).replace(/\D/g, "");
  const wa = to.length === 10 ? `521${to}` : to.startsWith("521") ? to : to.length === 12 && to.startsWith("52") ? `521${to.slice(2)}` : to;

  const body = {
    messaging_product: "whatsapp",
    to: wa,
    type: "template",
    template: {
      name: input.template,
      language: { code: input.language || "es_MX" },
      components: input.bodyParams.length > 0
        ? [{
            type: "body",
            parameters: input.bodyParams.map((v) => ({ type: "text", text: String(v).slice(0, 1024) })),
          }]
        : [],
    },
  };

  try {
    const r = await fetch(`https://graph.facebook.com/v22.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) {
      const messageId = ((data as { messages?: Array<{ id?: string }> }).messages?.[0]?.id) || undefined;
      return { ok: true, messageId, raw: data };
    }
    return { ok: false, error: JSON.stringify(data).slice(0, 500), raw: data };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// Wrappers convenience por plantilla concreta
export const sendCombSolicitudRecibida = (to: string, folio: string, tipo: string, litros: string, unidad: string, obra: string) =>
  sendCombTemplate({ to, template: "aria_comb_solicitud_recibida", bodyParams: [folio, tipo, litros, unidad, obra] });

export const sendCombConsolidadoJessica = (to: string, totalSolic: string, gasolinaL: string, dieselL: string, estimado: string) =>
  sendCombTemplate({ to, template: "aria_comb_consolidado_jessica", bodyParams: [totalSolic, gasolinaL, dieselL, estimado] });

export const sendCombParaAutorizar = (to: string, folioCons: string, totalSolic: string, totalL: string, estimado: string) =>
  sendCombTemplate({ to, template: "aria_comb_para_autorizar", bodyParams: [folioCons, totalSolic, totalL, estimado] });

export const sendCombTransferirCompras = (to: string, folioCons: string, monto: string) =>
  sendCombTemplate({ to, template: "aria_comb_transferir_a_compras", bodyParams: [folioCons, monto] });

export const sendCombSubirFactura = (to: string, nombreOp: string, folio: string) =>
  sendCombTemplate({ to, template: "aria_comb_subir_factura", bodyParams: [nombreOp, folio] });
