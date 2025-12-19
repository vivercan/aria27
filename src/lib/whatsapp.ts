// src/lib/whatsapp.ts
// TEMPORAL: Usa requisicion_creada mientras se aprueba requisicion_validar

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID || "869940452874474";

function formatPhone(phone: string): string {
  let p = phone.replace(/\D/g, "");
  if (p.length === 10) p = "52" + p;
  return p;
}

// 1. REQUISICIÓN CREADA (sin botones) - APPROVED
export async function sendRequisicionCreada(
  phone: string, folio: string, solicitante: string, obra: string, fecha: string
): Promise<boolean> {
  try {
    const response = await fetch(`https://graph.facebook.com/v22.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formatPhone(phone),
        type: "template",
        template: {
          name: "requisicion_creada",
          language: { code: "es_MX" },
          components: [{
            type: "body",
            parameters: [
              { type: "text", text: folio },
              { type: "text", text: solicitante },
              { type: "text", text: obra },
              { type: "text", text: fecha }
            ]
          }]
        }
      }),
    });
    const data = await response.json();
    if (!response.ok) { console.error("WA requisicion_creada ERROR:", data); return false; }
    return true;
  } catch (e) { console.error("WA Exception:", e); return false; }
}

// 2. REQUISICIÓN VALIDAR - TEMPORAL usa requisicion_creada hasta que se apruebe
export async function sendRequisicionValidar(
  phone: string, folio: string, solicitante: string, obra: string, urgencia: string, token: string
): Promise<boolean> {
  // TEMPORAL: Usar requisicion_creada mientras requisicion_validar está PENDING
  // TODO: Cambiar a requisicion_validar cuando Meta la apruebe
  try {
    const response = await fetch(`https://graph.facebook.com/v22.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formatPhone(phone),
        type: "template",
        template: {
          name: "requisicion_creada",
          language: { code: "es_MX" },
          components: [{
            type: "body",
            parameters: [
              { type: "text", text: folio },
              { type: "text", text: solicitante },
              { type: "text", text: obra },
              { type: "text", text: urgencia }
            ]
          }]
        }
      }),
    });
    const data = await response.json();
    if (!response.ok) { console.error("WA requisicion_validar ERROR:", data); return false; }
    return true;
  } catch (e) { console.error("WA Exception:", e); return false; }
}

// 3. REQUISICIÓN COMPRAS - APPROVED
export async function sendRequisicionCompras(
  phone: string, folio: string, obra: string, urgencia: string
): Promise<boolean> {
  try {
    const response = await fetch(`https://graph.facebook.com/v22.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formatPhone(phone),
        type: "template",
        template: {
          name: "requisicion_compras",
          language: { code: "es_MX" },
          components: [{
            type: "body",
            parameters: [
              { type: "text", text: folio },
              { type: "text", text: obra },
              { type: "text", text: urgencia }
            ]
          }]
        }
      }),
    });
    const data = await response.json();
    if (!response.ok) { console.error("WA requisicion_compras ERROR:", data); return false; }
    return true;
  } catch (e) { console.error("WA Exception:", e); return false; }
}

// 4. COMPRA AUTORIZAR - APPROVED
export async function sendCompraAutorizar(
  phone: string, folio: string, obra: string, total: string, urgencia: string, token: string
): Promise<boolean> {
  try {
    const response = await fetch(`https://graph.facebook.com/v22.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formatPhone(phone),
        type: "template",
        template: {
          name: "compra_autorizar",
          language: { code: "es_MX" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: folio },
                { type: "text", text: obra },
                { type: "text", text: total },
                { type: "text", text: urgencia },
                { type: "text", text: token }
              ]
            },
            { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: token }] },
            { type: "button", sub_type: "url", index: "1", parameters: [{ type: "text", text: token }] }
          ]
        }
      }),
    });
    const data = await response.json();
    if (!response.ok) { console.error("WA compra_autorizar ERROR:", data); return false; }
    return true;
  } catch (e) { console.error("WA Exception:", e); return false; }
}

// 5. OC GENERADA - APPROVED
export async function sendOCGenerada(
  phone: string, requisicion: string, oc: string, obra: string, total: string, urgencia: string
): Promise<boolean> {
  try {
    const response = await fetch(`https://graph.facebook.com/v22.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formatPhone(phone),
        type: "template",
        template: {
          name: "oc_generada",
          language: { code: "es_MX" },
          components: [{
            type: "body",
            parameters: [
              { type: "text", text: requisicion },
              { type: "text", text: oc },
              { type: "text", text: obra },
              { type: "text", text: total },
              { type: "text", text: urgencia }
            ]
          }]
        }
      }),
    });
    const data = await response.json();
    if (!response.ok) { console.error("WA oc_generada ERROR:", data); return false; }
    return true;
  } catch (e) { console.error("WA Exception:", e); return false; }
}

// LEGACY
export async function sendWhatsAppTemplate(
  templateName: string, parameters: string[], phone: string
): Promise<boolean> {
  if (templateName === "requisicion_creada") {
    return sendRequisicionCreada(phone, parameters[0], parameters[1], parameters[2], parameters[3]);
  }
  if (templateName === "requisicion_validar") {
    return sendRequisicionValidar(phone, parameters[0], parameters[1], parameters[2], parameters[3], parameters[4]);
  }
  if (templateName === "requisicion_compras") {
    return sendRequisicionCompras(phone, parameters[0], parameters[1], parameters[2]);
  }
  if (templateName === "compra_autorizar") {
    return sendCompraAutorizar(phone, parameters[0], parameters[1], parameters[2], parameters[3], parameters[4]);
  }
  if (templateName === "oc_generada") {
    return sendOCGenerada(phone, parameters[0], parameters[1], parameters[2], parameters[3], parameters[4]);
  }
  return false;
}
