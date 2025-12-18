// src/lib/whatsapp.ts
// ACTUALIZADO: Usa plantillas aprobadas en Meta + números temporales para pruebas

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID || "869940452874474";

// ============================================
// NÚMEROS DE CONTACTO - TEMPORALES PARA PRUEBAS
// ============================================
// Originales (guardar para después):
// - Validador: 4951198249 (Deysi)
// - Compras: 4495880244 (Jessica)
// ============================================

export const CONTACTS = {
  ADMIN: "528112392266",      // JJ - Dirección (sin cambio)
  RH: "524492788797",         // Deya - RH (sin cambio)
  VALIDADOR: "528116069329",  // TEMPORAL: Era Deysi 4951198249
  COMPRAS: "528112425452",    // TEMPORAL: Era Jessica 4495880244
};

// ============================================
// FUNCIÓN PRINCIPAL EXPORTADA
// Firma: sendWhatsAppTemplate(templateName, parameters, phone)
// ============================================
export async function sendWhatsAppTemplate(
  templateName: string,
  parameters: string[],
  phone: string
): Promise<boolean> {
  try {
    // Formatear número: asegurar que tenga 52 al inicio
    let formattedPhone = phone.replace(/\D/g, "");
    if (formattedPhone.length === 10) {
      formattedPhone = "52" + formattedPhone;
    }

    const components = parameters.length > 0 ? [
      {
        type: "body",
        parameters: parameters.map(text => ({ type: "text", text }))
      }
    ] : [];

    console.log(`📱 Enviando WhatsApp [${templateName}] -> ${formattedPhone}`);
    console.log(`   Parámetros: ${JSON.stringify(parameters)}`);

    const response = await fetch(
      `https://graph.facebook.com/v22.0/${PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formattedPhone,
          type: "template",
          template: {
            name: templateName,
            language: { code: "es_MX" },
            components: components
          }
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ WhatsApp Error [${templateName}]:`, JSON.stringify(data));
      return false;
    }

    console.log(`✅ WhatsApp OK [${templateName}] -> ${formattedPhone}`);
    return true;
  } catch (error) {
    console.error("❌ WhatsApp Exception:", error);
    return false;
  }
}

// ============================================
// FUNCIÓN LEGACY (texto plano) - BACKUP
// ============================================
export async function sendWhatsAppMessage(to: string, message: string): Promise<boolean> {
  try {
    let formattedPhone = to.replace(/\D/g, "");
    if (formattedPhone.length === 10) {
      formattedPhone = "52" + formattedPhone;
    }

    const response = await fetch(
      `https://graph.facebook.com/v22.0/${PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formattedPhone,
          type: "text",
          text: { body: message }
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error("WhatsApp Text Error:", data);
      return false;
    }
    return true;
  } catch (error) {
    console.error("WhatsApp Text Exception:", error);
    return false;
  }
}
