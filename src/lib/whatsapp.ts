// src/lib/whatsapp.ts
// USANDO PLANTILLAS APROBADAS EN META WHATSAPP BUSINESS
import "server-only";

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || "v22.0";
const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID || "963627606824867";

type ButtonType = "url" | "quick_reply";

function requireEnv(name: string, value?: string) {
  if (!value || !value.trim()) throw new Error(`[WA] Falta variable de entorno: ${name}`);
}

function formatPhone(phone: string): string {
  let p = (phone || "").replace(/\D/g, "");

  // Caso típico MX: +521XXXXXXXXXX  -> 52XXXXXXXXXX
  if (p.startsWith("521") && p.length === 13) {
    p = "52" + p.slice(3);
  }

  // Si viene solo con 10 dígitos, asumimos MX y agregamos 52
  if (p.length === 10) p = "52" + p;

  return p;
}

export type WhatsAppSendResult = {
  ok: boolean;
  status: number;
  to: string;
  requestBody: any;
  responseBody: any;
};

async function postWhatsApp(body: any): Promise<WhatsAppSendResult> {
  requireEnv("WHATSAPP_ACCESS_TOKEN", WHATSAPP_TOKEN);
  requireEnv("WHATSAPP_PHONE_ID", PHONE_ID);

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_ID}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({ parse_error: true }));

  return {
    ok: response.ok,
    status: response.status,
    to: body?.to,
    requestBody: body,
    responseBody: data,
  };
}

// ============================================
// ENVIAR PLANTILLA DE WHATSAPP (RAW para debug)
// ============================================
export async function sendTemplateRaw(opts: {
  phone: string;
  templateName: string;
  parameters: string[];
  languageCode?: string; // default es_MX
  hasButtons?: boolean;
  buttonType?: ButtonType; // url | quick_reply
  buttonPayloads?: string[]; // uno por botón
}): Promise<WhatsAppSendResult> {
  const {
    phone,
    templateName,
    parameters,
    languageCode = "es_MX",
    hasButtons = false,
    buttonType = "url",
    buttonPayloads = [],
  } = opts;

  const components: any[] = [];

  // Parámetros del body
  if (parameters?.length) {
    components.push({
      type: "body",
      parameters: parameters.map((p) => ({ type: "text", text: String(p ?? "") })),
    });
  }

  // Botones (si la plantilla tiene)
  if (hasButtons && buttonPayloads?.length) {
    buttonPayloads.forEach((payload, index) => {
      const isQuick = buttonType === "quick_reply";

      components.push({
        type: "button",
        sub_type: buttonType,
        index: String(index), // IMPORTANTE: string en muchas implementaciones
        parameters: [
          isQuick
            ? { type: "payload", payload: String(payload ?? "") }
            : { type: "text", text: String(payload ?? "") },
        ],
      });
    });
  }

  const body: any = {
    messaging_product: "whatsapp",
    to: formatPhone(phone),
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  };

  return postWhatsApp(body);
}

// Wrapper boolean (tu app lo puede seguir usando igual)
async function sendTemplate(
  phone: string,
  templateName: string,
  parameters: string[],
  hasButtons: boolean = false,
  buttonPayloads?: string[],
  buttonType: ButtonType = "url"
): Promise<boolean> {
  try {
    const res = await sendTemplateRaw({
      phone,
      templateName,
      parameters,
      hasButtons,
      buttonPayloads: buttonPayloads || [],
      buttonType,
    });

    if (!res.ok) {
      console.error(`[WA] Error enviando plantilla ${templateName}:`, res.responseBody);
      return false;
    }

    console.log(`[WA] ✓ Plantilla ${templateName} enviada`);
    return true;
  } catch (err) {
    console.error(`[WA] Exception en ${templateName}:`, err);
    return false;
  }
}

// ============================================
// FUNCIONES ESPECÍFICAS POR PLANTILLA
// ============================================

// 1. REQUISICIÓN CREADA
export async function sendRequisicionCreada(
  phone: string,
  folio: string,
  solicitante: string,
  obra: string,
  fecha: string
): Promise<boolean> {
  return sendTemplate(phone, "requisicion_creada", [folio, solicitante, obra, fecha]);
}

// 2. REQUISICIÓN VALIDAR (CON BOTONES)
export async function sendRequisicionValidar(
  phone: string,
  folio: string,
  solicitante: string,
  obra: string,
  urgencia: string,
  tokenValidar: string,
  tokenRechazar?: string,
  buttonType: ButtonType = "url"
): Promise<boolean> {
  return sendTemplate(
    phone,
    "requisicion_validar",
    [folio, solicitante, obra, urgencia],
    true,
    [tokenValidar, tokenRechazar ?? tokenValidar],
    buttonType
  );
}

// 3. REQUISICIÓN COMPRAS
export async function sendRequisicionCompras(
  phone: string,
  folio: string,
  obra: string,
  urgencia: string
): Promise<boolean> {
  return sendTemplate(phone, "requisicion_compras", [folio, obra, urgencia]);
}

// 4. COMPRA AUTORIZAR (CON BOTONES)
export async function sendCompraAutorizar(
  phone: string,
  folio: string,
  obra: string,
  total: string,
  urgencia: string,
  tokenAutorizar: string,
  tokenRechazar?: string,
  buttonType: ButtonType = "url"
): Promise<boolean> {
  return sendTemplate(
    phone,
    "compra_autorizar",
    [folio, obra, total, urgencia],
    true,
    [tokenAutorizar, tokenRechazar ?? tokenAutorizar],
    buttonType
  );
}

// 5. OC GENERADA
export async function sendOCGenerada(
  phone: string,
  requisicion: string,
  oc: string,
  obra: string,
  total: string,
  urgencia: string
): Promise<boolean> {
  return sendTemplate(phone, "oc_generada", [requisicion, oc, obra, total, urgencia]);
}

// ============================================
// FUNCIÓN LEGACY (compatibilidad)
// ============================================
export async function sendWhatsAppTemplate(
  templateName: string,
  parameters: string[],
  phone: string
): Promise<boolean> {
  switch (templateName) {
    case "requisicion_creada":
      return sendRequisicionCreada(phone, parameters[0], parameters[1], parameters[2], parameters[3]);

    case "requisicion_validar":
      // parameters: folio, solicitante, obra, urgencia, tokenValidar, (opcional) tokenRechazar, (opcional) buttonType
      return sendRequisicionValidar(
        phone,
        parameters[0],
        parameters[1],
        parameters[2],
        parameters[3],
        parameters[4],
        parameters[5],
        (parameters[6] as any) || "url"
      );

    case "requisicion_compras":
      return sendRequisicionCompras(phone, parameters[0], parameters[1], parameters[2]);

    case "compra_autorizar":
      // parameters: folio, obra, total, urgencia, tokenAutorizar, (opcional) tokenRechazar, (opcional) buttonType
      return sendCompraAutorizar(
        phone,
        parameters[0],
        parameters[1],
        parameters[2],
        parameters[3],
        parameters[4],
        parameters[5],
        (parameters[6] as any) || "url"
      );

    case "oc_generada":
      return sendOCGenerada(phone, parameters[0], parameters[1], parameters[2], parameters[3], parameters[4]);

    default:
      console.error(`[WA] Plantilla desconocida: ${templateName}`);
      return false;
  }
}

// ============================================
// MENSAJE DE TEXTO SIMPLE (RAW para debug)
// ============================================
export async function sendTextMessageRaw(phone: string, message: string): Promise<WhatsAppSendResult> {
  const body = {
    messaging_product: "whatsapp",
    to: formatPhone(phone),
    type: "text",
    text: { body: message },
  };

  return postWhatsApp(body);
}

// Wrapper boolean (compat)
export async function sendTextMessage(phone: string, message: string): Promise<boolean> {
  try {
    const res = await sendTextMessageRaw(phone, message);
    if (!res.ok) {
      console.error("[WA] Error texto:", res.responseBody);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[WA] Exception texto:", err);
    return false;
  }
}
