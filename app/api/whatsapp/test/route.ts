import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppLogged } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { template, params, phone } = body || {};

    if (!template || !phone || !Array.isArray(params)) {
      return NextResponse.json(
        { success: false, error: "Faltan campos: template, params[], phone" },
        { status: 400 }
      );
    }

    const enviadoPor = req.headers.get("x-user-email") || "test";
    const result = await sendWhatsAppLogged(template, params, phone, {
      origen: "test",
      enviadoPor,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: (e as {message?: string})?.message || "Error desconocido" },
      { status: 500 }
    );
  }
}
