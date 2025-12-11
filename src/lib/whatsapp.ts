const WHATSAPP_API_URL = "https://graph.facebook.com/v22.0";
const PHONE_NUMBER_ID = "869940452874474";

export async function sendWhatsAppTemplate(templateName: string, variables: string[], toPhone: string) {
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!ACCESS_TOKEN) {
    console.error("No hay WHATSAPP_ACCESS_TOKEN");
    return null;
  }

  let phone = toPhone.replace(/\D/g, "");
  if (phone.length === 10) phone = "52" + phone;

  const components = variables.length > 0 ? [{
    type: "body",
    parameters: variables.map(v => ({ type: "text", text: String(v) }))
  }] : [];

  try {
    const response = await fetch(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
          name: templateName,
          language: { code: "es_MX" },
          components
        }
      })
    });
    const result = await response.json();
    console.log(`WhatsApp [${templateName}] -> ${phone}:`, JSON.stringify(result));
    return result;
  } catch (e) {
    console.error("WhatsApp error:", e);
    return null;
  }
}

export async function sendWhatsAppText(message: string, toPhone: string) {
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!ACCESS_TOKEN) return null;

  let phone = toPhone.replace(/\D/g, "");
  if (phone.length === 10) phone = "52" + phone;

  try {
    const response = await fetch(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { preview_url: true, body: message }
      })
    });
    return await response.json();
  } catch (e) {
    console.error("WhatsApp text error:", e);
    return null;
  }
}
