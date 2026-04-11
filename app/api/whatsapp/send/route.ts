import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;

// POST /api/whatsapp/send — enviar mensaje de texto libre por WhatsApp
export async function POST(req: NextRequest) {
  const clientId = getClientIdentifier(req);
  const rl = checkRateLimit(clientId, { key: "whatsapp:send", ...RATE_LIMITS.EXPENSIVE });
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const email = req.headers.get("x-user-email");
    if (!email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { phone, message } = await req.json();
    if (!phone || !message) {
      return NextResponse.json({ error: "Faltan campos: phone, message" }, { status: 400 });
    }

    const res = await fetch(`https://graph.facebook.com/v22.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: message }
      })
    });

    const data = await res.json();
    if (data.error) {
      return NextResponse.json({ success: false, error: data.error.message }, { status: 500 });
    }

    // Log en wa_log
    const { getSupabaseAdmin } = await import("@/lib/supabase-server");
    const supabase = getSupabaseAdmin();
    await supabase.from("wa_log").insert({
      direction: "OUT",
      phone,
      message_type: "text",
      body: message.slice(0, 500),
      status: "sent",
      origin: "manual",
      sent_by: email,
    });

    return NextResponse.json({ success: true, messageId: data.messages?.[0]?.id });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: ((e as Error)?.message) }, { status: 500 });
  }
}
