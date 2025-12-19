// src/lib/whatsapp.ts
// CON LINKS DIRECTOS EN EL TEXTO

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID || "869940452874474";

function formatPhone(phone: string): string {
  let p = phone.replace(/\D/g, "");
  if (p.length === 10) p = "52" + p;
  return p;
}

// Enviar mensaje de texto simple con links
async function sendTextMessage(phone: string, message: string): Promise<boolean> {
  try {
    const response = await fetch(`https://graph.facebook.com/v22.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formatPhone(phone),
        type: "text",
        text: { body: message }
      }),
    });
    const data = await response.json();
    if (!response.ok) { console.error("WA text ERROR:", data); return false; }
    return true;
  } catch (e) { console.error("WA Exception:", e); return false; }
}

// 1. REQUISICIÓN CREADA
export async function sendRequisicionCreada(
  phone: string, folio: string, solicitante: string, obra: string, fecha: string
): Promise<boolean> {
  const msg = `*REQUISICIÓN CREADA*

*Folio:* ${folio}
*Solicitó:* ${solicitante}
*Obra:* ${obra}
*Fecha:* ${fecha}

_ARIA27 ERP - Grupo Cuavante_`;
  return sendTextMessage(phone, msg);
}

// 2. REQUISICIÓN VALIDAR - CON LINKS
export async function sendRequisicionValidar(
  phone: string, folio: string, solicitante: string, obra: string, urgencia: string, token: string
): Promise<boolean> {
  const linkValidar = `https://aria.jjcrm27.com/api/requisicion/validate?token=${token}&action=APROBADA`;
  const linkRechazar = `https://aria.jjcrm27.com/api/requisicion/validate?token=${token}&action=RECHAZADA`;
  
  const msg = `*REQUISICIÓN PENDIENTE DE VALIDAR*

*Folio:* ${folio}
*Solicitó:* ${solicitante}
*Obra:* ${obra}
*Urgencia:* ${urgencia}

✅ *VALIDAR:*
${linkValidar}

❌ *RECHAZAR:*
${linkRechazar}

_ARIA27 ERP - Grupo Cuavante_`;
  return sendTextMessage(phone, msg);
}

// 3. REQUISICIÓN COMPRAS
export async function sendRequisicionCompras(
  phone: string, folio: string, obra: string, urgencia: string
): Promise<boolean> {
  const msg = `*REQUISICIÓN PARA COMPRAS*

*Folio:* ${folio}
*Obra:* ${obra}
*Urgencia:* ${urgencia}

Se requiere cotización y gestión de compra.

_ARIA27 ERP - Grupo Cuavante_`;
  return sendTextMessage(phone, msg);
}

// 4. COMPRA AUTORIZAR - CON LINKS
export async function sendCompraAutorizar(
  phone: string, folio: string, obra: string, total: string, urgencia: string, token: string
): Promise<boolean> {
  const linkAutorizar = `https://aria.jjcrm27.com/api/requisicion/approve-purchase?token=${token}&action=AUTORIZAR`;
  const linkRechazar = `https://aria.jjcrm27.com/api/requisicion/approve-purchase?token=${token}&action=RECHAZAR`;
  
  const msg = `*COMPRA PENDIENTE DE AUTORIZAR*

*Folio:* ${folio}
*Obra:* ${obra}
*Total:* ${total}
*Urgencia:* ${urgencia}

✅ *AUTORIZAR:*
${linkAutorizar}

❌ *RECHAZAR:*
${linkRechazar}

_ARIA27 ERP - Grupo Cuavante_`;
  return sendTextMessage(phone, msg);
}

// 5. OC GENERADA
export async function sendOCGenerada(
  phone: string, requisicion: string, oc: string, obra: string, total: string, urgencia: string
): Promise<boolean> {
  const msg = `*ORDEN DE COMPRA GENERADA*

*Requisición:* ${requisicion}
*OC:* ${oc}
*Obra:* ${obra}
*Total:* ${total}
*Urgencia:* ${urgencia}

_ARIA27 ERP - Grupo Cuavante_`;
  return sendTextMessage(phone, msg);
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
