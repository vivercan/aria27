/**
 * /api/webhook/avances
 *
 * Endpoint INBOUND publico para que el router de WhatsApp (LomaHUB o cualquier
 * otro) reenvie aqui los reportes de avance de obra que llegan al bot JJCRM27
 * desde celulares de arquitectos.
 *
 * Body esperado:
 *   {
 *     from: string,           // telefono remitente (e164 o 10 digitos MX)
 *     text: string,           // texto del mensaje
 *     media_ids?: string[],   // ids de Meta Graph API para fotos
 *     wa_message_id?: string,
 *     raw_webhook?: object    // payload original opcional
 *   }
 *
 * Forward simple a /api/obras/avances/inbox POST (misma logica de parseo +
 * persistencia). Mantener delgado este endpoint - solo verifica HMAC opcional
 * y reenvia.
 *
 * 03-Jun-2026
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const log = logger("WEBHOOK-AVANCES");

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(getClientIdentifier(req), {
    key: "wa:avances",
    ...RATE_LIMITS.WRITE,
  });
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const body = await req.json().catch(() => ({}));
    log.info("inbound avance", { from: body.from, hasText: !!body.text, mediaCount: (body.media_ids || []).length });

    // Reenvio al endpoint interno (mismo origin)
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const host = req.headers.get("host") || "aria.jjcrm27.com";
    const url = `${proto}://${host}/api/obras/avances/inbox`;

    const inboxRes = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const inboxJson = await inboxRes.json().catch(() => ({}));
    return NextResponse.json(inboxJson, { status: inboxRes.status });
  } catch (e: unknown) {
    log.error("POST error", { e });
    return NextResponse.json(
      { error: (e as { message?: string })?.message || "Error" },
      { status: 500 }
    );
  }
}

// GET = healthcheck publico
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/webhook/avances",
    status: "ready",
    expected_body: { from: "string", text: "string", media_ids: "string[]", wa_message_id: "string" },
  });
}
