const WHATSAPP_API_URL = "https://graph.facebook.com/v22.0";
const PHONE_NUMBER_ID = "869940452874474";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

type WhatsAppRecipient = {
  phone: string;
  name: string;
};

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string = "es_MX",
  components?: any[]
) {
  const response = await fetch(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""), // Solo números
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: components || []
      }
    })
  });

  const data = await response.json();
  console.log("WhatsApp response:", data);
  return data;
}

export async function sendWhatsAppText(to: string, message: string) {
  const response = await fetch(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""),
      type: "text",
      text: { body: message }
    })
  });

  const data = await response.json();
  console.log("WhatsApp text response:", data);
  return data;
}

export async function sendWhatsAppInteractive(
  to: string,
  headerText: string,
  bodyText: string,
  buttons: { id: string; title: string }[]
) {
  const response = await fetch(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""),
      type: "interactive",
      interactive: {
        type: "button",
        header: { type: "text", text: headerText },
        body: { text: bodyText },
        action: {
          buttons: buttons.map(b => ({
            type: "reply",
            reply: { id: b.id, title: b.title }
          }))
        }
      }
    })
  });

  const data = await response.json();
  return data;
}
