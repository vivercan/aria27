import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

// POST /api/whatsapp/send — enviar mensaje de texto libre por WhatsApp
export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(getClientIdentifier(req), { key: "wa:send", ...RATE_LIMITS.WRITE });
    if (!rl.allowed) return rateLimitResponse(rl);

    // FIX 541.1: identidad via cookie session
    const __auth = await requireUser(req);
    const email = __auth.ok ? __auth.email : null;
    if (!email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { phone, message } = await req.json().catch(() => ({}));
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
