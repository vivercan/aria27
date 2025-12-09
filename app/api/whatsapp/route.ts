import { NextResponse } from "next/server";

const WHATSAPP_API_URL = "https://graph.facebook.com/v22.0";
const PHONE_NUMBER_ID = "869940452874474";

export async function POST(request: Request) {
  try {
    const { to, message, template } = await request.json();
    const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!ACCESS_TOKEN) {
      return NextResponse.json({ error: "WhatsApp token no configurado" }, { status: 500 });
    }

    let body;
    if (template) {
      // Enviar plantilla
      body = {
        messaging_product: "whatsapp",
        to: to.replace(/\D/g, ""),
        type: "template",
        template: {
          name: template,
          language: { code: "en_US" }
        }
      };
    } else {
      // Enviar texto (solo funciona si el usuario inició conversación en las últimas 24h)
      body = {
        messaging_product: "whatsapp",
        to: to.replace(/\D/g, ""),
        type: "text",
        text: { body: message }
      };
    }

    const response = await fetch(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    if (data.error) {
      return NextResponse.json({ error: data.error.message, details: data.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
