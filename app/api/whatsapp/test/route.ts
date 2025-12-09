import { NextResponse } from "next/server";

const WHATSAPP_API_URL = "https://graph.facebook.com/v22.0";
const PHONE_NUMBER_ID = "869940452874474";

export async function GET(request: Request) {
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!ACCESS_TOKEN) {
    return NextResponse.json({ error: "WHATSAPP_ACCESS_TOKEN no configurado" }, { status: 500 });
  }

  const testPhone = "5218112392266";

  try {
    const response = await fetch(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: testPhone,
        type: "template",
        template: {
          name: "hello_world",
          language: { code: "en_US" }
        }
      })
    });

    const data = await response.json();

    return NextResponse.json({
      success: !data.error,
      phone: testPhone,
      response: data,
      tokenPresent: !!ACCESS_TOKEN,
      tokenLength: ACCESS_TOKEN.length
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      tokenPresent: !!ACCESS_TOKEN
    }, { status: 500 });
  }
}
