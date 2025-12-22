import { NextResponse } from "next/server";
import { sendTextMessageRaw, sendTemplateRaw } from "../../../../lib/whatsapp";

export const runtime = "nodejs";

function requireEnv(name: string, value?: string) {
  if (!value || !value.trim()) throw new Error(`Falta variable de entorno: ${name}`);
}

export async function POST(req: Request) {
  try {
    // ✅ Protección
    const secret = process.env.WHATSAPP_TEST_SECRET;
    requireEnv("WHATSAPP_TEST_SECRET", secret);

    const headerSecret = req.headers.get("x-aria-secret") || "";
    if (headerSecret !== secret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const phone = body.phone;
    const mode = body.mode || "text";

    if (!phone) {
      return NextResponse.json({ ok: false, error: "Falta body.phone" }, { status: 400 });
    }

    // 1) Texto simple
    if (mode === "text") {
      const message = body.message || "Prueba ARIA WhatsApp ✅";
      const res = await sendTextMessageRaw(phone, message);
      return NextResponse.json(res, { status: res.ok ? 200 : 500 });
    }

    // 2) Plantilla
    const templateName = body.templateName;
    const parameters = body.parameters || [];
    const buttonType = body.buttonType || "url";
    const buttonPayloads = body.buttonPayloads || [];

    if (!templateName) {
      return NextResponse.json({ ok: false, error: "Falta body.templateName" }, { status: 400 });
    }

    const res = await sendTemplateRaw({
      phone,
      templateName,
      parameters,
      hasButtons: buttonPayloads.length > 0,
      buttonType,
      buttonPayloads,
    });

    return NextResponse.json(res, { status: res.ok ? 200 : 500 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error interno" },
      { status: 500 }
    );
  }
}
