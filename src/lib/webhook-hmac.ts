/**
 * Validación HMAC SHA256 para webhooks de Meta (WhatsApp).
 *
 * Meta firma cada POST con X-Hub-Signature-256 usando el App Secret.
 * Ref: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 *
 * Env vars requeridas:
 *   META_APP_SECRET          — App Secret de Meta (para HMAC)
 *   WEBHOOK_VERIFY_TOKEN     — Token de verificación para el GET de suscripción
 */

import { createHmac } from "crypto";
import { logger } from "@/lib/logger";

const log = logger("WEBHOOK-HMAC");

/**
 * Valida la firma HMAC SHA256 del body de un webhook de Meta.
 * Retorna true si la firma es válida, false si no.
 */
export function validateMetaSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null
): boolean {
  const appSecret = process.env.META_APP_SECRET;

  if (!appSecret) {
    log.error("META_APP_SECRET no configurado — webhook inseguro");
    // FAIL CLOSED: si no hay secret, rechazar
    return false;
  }

  if (!signatureHeader) {
    log.warn("Request sin X-Hub-Signature-256 header");
    return false;
  }

  // Meta envía: sha256=<hex>
  const parts = signatureHeader.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") {
    log.warn("Formato de firma inválido", { header: signatureHeader.substring(0, 30) });
    return false;
  }

  const receivedSig = parts[1];
  const expectedSig = createHmac("sha256", appSecret)
    .update(typeof rawBody === "string" ? rawBody : rawBody)
    .digest("hex");

  // Comparación timing-safe
  if (receivedSig.length !== expectedSig.length) return false;

  const a = Buffer.from(receivedSig, "hex");
  const b = Buffer.from(expectedSig, "hex");

  try {
    const { timingSafeEqual } = require("crypto");
    return timingSafeEqual(a, b);
  } catch {
    // Fallback si timingSafeEqual falla por alguna razón
    return receivedSig === expectedSig;
  }
}

/**
 * Obtiene el verify token para la suscripción GET del webhook.
 * Lee de env var WEBHOOK_VERIFY_TOKEN en lugar de hardcoded.
 */
export function getWebhookVerifyToken(): string {
  return process.env.WEBHOOK_VERIFY_TOKEN || "";
}
