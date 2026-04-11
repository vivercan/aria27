import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp";

// POST /api/whatsapp/send — enviar mensaje de texto libre por WhatsApp
export async function POST(req: NextRequest) {
  try {
    const email = req.headers.get("x-user-email");
    if (!email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { phone, message } = await req.json();
    if (!phone || !message) {
      return NextResponse.json({ error: "Faltan campos: phone, message" }, { status: 400 });
    }

    const result = await sendWhatsAppText(phone, message, { origen: "manual", enviadoPor: email });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}
