// src/lib/whatsapp.ts
// USANDO PLANTILLAS APROBADAS EN META WHATSAPP BUSINESS

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID || "869940452874474";

function formatPhone(phone: string): string {
  let p = phone.replace(/\D/g, "");
  if (p.length === 10) p = "52" + p;
  return p;
}

// ============================================
// ENVIAR PLANTILLA DE WHATSAPP
// ============================================
async function sendTemplate(
  phone: string,
  templateName: string,
  parameters: string[],
  hasButtons: boolean = false,
  buttonPayloads?: string[]
): Promise<boolean> {
  try {
    const components: any[] = [];

    // Parámetros del body
    if (parameters.length > 0) {
      components.push({
        type: "body",
        parameters: parameters.map(p => ({ type: "text", text: p }))
      });
    }

    // Botones (si la plantilla tiene)
    if (hasButtons && buttonPayloads && buttonPayloads.length > 0) {
      buttonPayloads.forEach((payload, index) => {
        components.push({
          type: "button",
          sub_type: "url",
          index: index,
          parameters: [{ type: "text", text: payload }]
        });
      });
    }

    const body: any = {
      messaging_product: "whatsapp",
      to: formatPhone(phone),
      type: "template",
      template: {
        name: templateName,
        language: { code: "es_MX" },
        components: components
      }
    };

    console.log(`[WA] Enviando plantilla ${templateName} a ${phone}`);

    const response = await fetch(`https://graph.facebook.com/v22.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[WA] Error enviando ${templateName}:`, data);
      return false;
    }

    console.log(`[WA] ✓ Plantilla ${templateName} enviada exitosamente`);
    return true;

  } catch (error) {
    console.error(`[WA] Exception en ${templateName}:`, error);
    return false;
  }
}

// ============================================
// FUNCIONES ESPECÍFICAS POR PLANTILLA
// ============================================

// 1. REQUISICIÓN CREADA
// Plantilla: requisicion_creada
// Variables: {{1}}=Folio, {{2}}=Solicitante, {{3}}=Obra, {{4}}=Fecha
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
// Plantilla: requisicion_validar
// Variables: {{1}}=Folio, {{2}}=Solicitante, {{3}}=Obra, {{4}}=Urgencia
// Botones: Validar (token), Rechazar (token)
export async function sendRequisicionValidar(
  phone: string,
  folio: string,
  solicitante: string,
  obra: string,
  urgencia: string,
  token: string
): Promise<boolean> {
  return sendTemplate(
    phone,
    "requisicion_validar",
    [folio, solicitante, obra, urgencia],
    true,
    [token, token] // Token para ambos botones
  );
}

// 3. REQUISICIÓN COMPRAS
// Plantilla: requisicion_compras
// Variables: {{1}}=Folio, {{2}}=Obra, {{3}}=Urgencia
export async function sendRequisicionCompras(
  phone: string,
  folio: string,
  obra: string,
  urgencia: string
): Promise<boolean> {
  return sendTemplate(phone, "requisicion_compras", [folio, obra, urgencia]);
}

// 4. COMPRA AUTORIZAR (CON BOTONES)
// Plantilla: compra_autorizar
// Variables: {{1}}=Folio, {{2}}=Obra, {{3}}=Total, {{4}}=Urgencia
// Botones: Autorizar (token), Rechazar (token)
export async function sendCompraAutorizar(
  phone: string,
  folio: string,
  obra: string,
  total: string,
  urgencia: string,
  token: string
): Promise<boolean> {
  return sendTemplate(
    phone,
    "compra_autorizar",
    [folio, obra, total, urgencia],
    true,
    [token, token]
  );
}

// 5. OC GENERADA
// Plantilla: oc_generada
// Variables: {{1}}=Requisición, {{2}}=OC, {{3}}=Obra, {{4}}=Total, {{5}}=Urgencia
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
      return sendRequisicionValidar(phone, parameters[0], parameters[1], parameters[2], parameters[3], parameters[4]);
    case "requisicion_compras":
      return sendRequisicionCompras(phone, parameters[0], parameters[1], parameters[2]);
    case "compra_autorizar":
      return sendCompraAutorizar(phone, parameters[0], parameters[1], parameters[2], parameters[3], parameters[4]);
    case "oc_generada":
      return sendOCGenerada(phone, parameters[0], parameters[1], parameters[2], parameters[3], parameters[4]);
    default:
      console.error(`[WA] Plantilla desconocida: ${templateName}`);
      return false;
  }
}

// ============================================
// MENSAJE DE TEXTO SIMPLE (para asistencias)
// ============================================
export async function sendTextMessage(phone: string, message: string): Promise<boolean> {
  try {
    const response = await fetch(`https://graph.facebook.com/v22.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formatPhone(phone),
        type: "text",
        text: { body: message }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("[WA] Error texto:", data);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[WA] Exception texto:", error);
    return false;
  }
}
