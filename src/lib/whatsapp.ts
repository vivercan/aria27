import { createHmac, timingSafeEqual } from "crypto";
import { logger } from "@/lib/logger";
import { overridePhoneIfTest } from "@/lib/e2e-test-override";

const log = logger("WHATSAPP");
const WHATSAPP_API_URL = "https://graph.facebook.com/v22.0";

interface WhatsAppComponent {
  type: "body" | "button";
  sub_type?: string;
  index?: string;
  parameters: Array<{ type: string; text?: string }>;
}

// ============================================
// HMAC SIGNATURE VERIFICATION (Meta Webhooks)
// Fail-closed: si falta META_APP_SECRET o la firma no coincide, retorna false.
// El handler puede usar verifyWebhookUrlToken() como fallback autenticado vía ?token=.
// ============================================
export function verifyWebhookSignature(rawBody: string | Buffer, signature: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret) {
    // FAIL-CLOSED: sin secret no se puede verificar. Loguea ERROR (no warning) y rechaza.
    // El handler caerá a verifyWebhookUrlToken() si está configurado.
    log.error("META_APP_SECRET ausente — HMAC no verificable (fail-closed)");
    return false;
  }
  if (!signature) {
    // Firma ausente — puede ser proxy que strip headers; el handler intentará URL token.
    return false;
  }
  const expectedSig = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  // Comparación timing-safe (evita timing-attack leak del secret)
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length) {
    log.warn("HMAC longitud inválida", { receivedLen: sigBuf.length, expectedLen: expBuf.length });
    return false;
  }
  let matches = false;
  try {
    matches = timingSafeEqual(sigBuf, expBuf);
  } catch {
    matches = false;
  }
  if (!matches) {
    log.warn("HMAC no coincide", {
      received: signature.slice(0, 20) + "...",
      expected: expectedSig.slice(0, 20) + "...",
    });
  }
  return matches;
}

/**
 * Fallback de autenticación cuando el proxy (Supabase router) elimina x-hub-signature-256.
 * Verifica que ?token= en la URL coincida con WEBHOOK_URL_TOKEN en env vars.
 */
export function verifyWebhookUrlToken(urlToken: string | null): boolean {
  const expected = process.env.WEBHOOK_URL_TOKEN;
  if (!expected) return false;
  if (!urlToken) return false;
  // Comparación en tiempo constante para evitar timing attacks
  const a = Buffer.from(urlToken.padEnd(64));
  const b = Buffer.from(expected.padEnd(64));
  return a.length === b.length && timingSafeEqual(a, b);
}

// ============================================
// SEND FREE-TEXT MESSAGE (con logging a wa_log)
// ============================================
export async function sendWhatsAppText(
  phone: string,
  message: string,
  opts: { origen?: string; enviadoPor?: string } = {}
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return { success: false, error: "WhatsApp credentials missing" };

  try {
    const res = await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { body: message } }),
    });
    const data = await res.json();
    const success = !data.error;

    // Log a wa_log
    try {
      const { getSupabaseAdmin } = await import("./supabase-server");
      const supa = getSupabaseAdmin();
      await supa.from("wa_log").insert({
        template: "_text",
        phone,
        params: [message.slice(0, 200)],
        success,
        message_id: data.messages?.[0]?.id || null,
        error: data.error?.message || null,
        origen: opts.origen || "webhook",
        enviado_por: opts.enviadoPor || "system",
      });
    } catch { /* silent — no bloquear flujo por logging */ }

    return success ? { success: true } : { success: false, error: data.error?.message };
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message };
  }
}

// ============================================
// CONFIGURACIÓN DE PLANTILLAS APROBADAS EN META
// WABA: 842930185269415 | Phone: 963627606824867 (JJCRM27)
// ============================================
const TEMPLATE_CONFIG: Record<string, { 
  language: string; 
  hasButton?: boolean; 
  buttonCount?: number; 
  paramCount: number;
  description: string;
}> = {
  requisicion_creada: { 
    language: "es_MX", 
    paramCount: 4,
    description: "Confirmar creación al usuario"
    // {{1}}=Folio, {{2}}=Solicitante, {{3}}=Obra, {{4}}=Fecha
  },
  requisicion_validar: { 
    language: "en", 
    hasButton: true, 
    buttonCount: 2, 
    paramCount: 5,
    description: "Solicitar validación"
    // {{1}}=Folio, {{2}}=Solicitante, {{3}}=Obra, {{4}}=Urgencia, {{5}}=Token
    // Botones: Aprobar, Rechazar
  },
  requisicion_compras: {
    language: "en",
    paramCount: 4,
    description: "Notificar a compras"
    // {{1}}=Folio, {{2}}=Obra, {{3}}=Urgencia, {{4}}=Materiales
  },
  compra_autorizar: {
    language: "es_MX",
    hasButton: true,
    buttonCount: 1,
    paramCount: 6,
    description: "Solicitar autorización de dirección"
    // {{1}}=Folio, {{2}}=Obra, {{3}}=Solicitante, {{4}}=Urgencia, {{5}}=Materiales, {{6}}=Total
    // Botón: Ver Cotizaciones (URL con token)
  },
  oc_generada: {
    language: "es_MX",
    paramCount: 6,
    description: "Notificar OC generada"
    // {{1}}=Requisición, {{2}}=OC, {{3}}=Obra, {{4}}=Proveedor, {{5}}=Total, {{6}}=Forma de pago
  },
  requisicion_rechazada: { 
    language: "es_MX", 
    paramCount: 4,
    description: "Notificar rechazo al creador"
    // {{1}}=Folio, {{2}}=Obra, {{3}}=Estado, {{4}}=Motivo
  },
  entrega_material: {
    language: "es_MX",
    paramCount: 4,
    description: "Notificar material recibido al solicitante"
    // {{1}}=OC, {{2}}=Obra, {{3}}=Proveedor, {{4}}=Folio entrega
  },
  comparativa_enviar: {
    language: "es_MX",
    hasButton: true,
    buttonCount: 1,
    paramCount: 4,
    description: "Enviar comparativa a direccion"
    // {{1}}=Folio, {{2}}=Obra, {{3}}=Mejor precio, {{4}}=Num proveedores
  },
  solicitar_cotizacion: {
    language: "es_MX",
    paramCount: 3,
    description: "Solicitar cotizacion a proveedor"
    // {{1}}=Folio, {{2}}=Obra, {{3}}=Urgencia
  },
};

/**
 * Enviar mensaje de WhatsApp usando plantilla aprobada
 */
export async function sendWhatsAppTemplate(
  templateName: string,
  params: string[],
  phone: string,
  buttonToken?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  // 21-Abr-2026: E2E override - si activo, redirige WhatsApp a JJ.
  // Ver src/lib/e2e-test-override.ts.
  phone = overridePhoneIfTest(phone);

  if (!token || !phoneId) {
    log.error("Credenciales faltantes", { token: !!token, phoneId: !!phoneId });
    return { success: false, error: "WhatsApp credentials missing" };
  }

  // Validar plantilla existe
  const config = TEMPLATE_CONFIG[templateName];
  if (!config) {
    log.error("Plantilla no configurada", { templateName });
    return { success: false, error: `Plantilla '${templateName}' no existe` };
  }

  // Formatear teléfono mexicano (10 dígitos -> 52 + 10)
  let formattedPhone = phone.replace(/\D/g, "");
  if (formattedPhone.length === 10) {
    formattedPhone = "52" + formattedPhone;
  } else if (formattedPhone.startsWith("521") && formattedPhone.length === 13) {
    formattedPhone = "52" + formattedPhone.slice(3);
  }

  // Construir componentes del mensaje
  const components: WhatsAppComponent[] = [];

  // Body parameters
  if (params.length > 0) {
    components.push({
      type: "body",
      parameters: params.map((text) => ({ type: "text", text: String(text) })),
    });
  }

  // Button parameters (si la plantilla tiene botones)
  if (config.hasButton && buttonToken) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: buttonToken }],
    });

    if (config.buttonCount === 2) {
      components.push({
        type: "button",
        sub_type: "url",
        index: "1",
        parameters: [{ type: "text", text: `${buttonToken}&action=RECHAZADA` }],
      });
    }
  }

  const body = {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: config.language },
      components,
    },
  };

  log.info("Enviando template", { template: templateName, phone: formattedPhone });

  try {
    const response = await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      log.error("API error", { error: data.error?.message || `HTTP ${response.status}`, template: templateName, phone: formattedPhone });
      return { 
        success: false, 
        error: data.error?.message || `HTTP ${response.status}` 
      };
    }

    const messageId = data.messages?.[0]?.id;
    log.info("Enviado OK", { messageId, template: templateName, phone: formattedPhone });
    return { success: true, messageId };

  } catch (error: unknown) {
    log.error("Exception", { error: (error as Error).message, template: templateName, phone: formattedPhone });
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Wrapper que envía con sendWhatsAppTemplate y SIEMPRE escribe a wa_log (auditoría).
 * Bloque 16 — auditoría obligatoria de todos los envíos WhatsApp.
 */
export async function sendWhatsAppLogged(
  templateName: string,
  params: string[],
  phone: string,
  opts: { origen?: string; enviadoPor?: string; buttonToken?: string } = {}
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const result = await sendWhatsAppTemplate(templateName, params, phone, opts.buttonToken);
  try {
    const { getSupabaseAdmin } = await import("./supabase-server");
    const supa = getSupabaseAdmin();
    await supa.from("wa_log").insert({
      template: templateName,
      phone,
      params,
      success: result.success,
      message_id: result.messageId || null,
      error: result.error || null,
      origen: opts.origen || null,
      enviado_por: opts.enviadoPor || null,
    });
  } catch (e: unknown) {
    log.error("No se pudo escribir wa_log", { error: (e as Error).message });
  }
  return result;
}

/**
 * Envía usando plantilla. Si Meta la rechaza (en revisión/no aprobada),
 * cae automáticamente a texto libre para que el usuario SIEMPRE reciba algo.
 * Registra ambos intentos en wa_log.
 */
export async function sendWhatsAppFallback(
  templateName: string,
  params: string[],
  phone: string,
  fallbackText: string,
  opts: { origen?: string; enviadoPor?: string; buttonToken?: string } = {}
): Promise<{ success: boolean; usedFallback?: boolean; messageId?: string; error?: string }> {
  const result = await sendWhatsAppLogged(templateName, params, phone, opts);

  if (result.success) {
    return result;
  }

  // Template falló (en revisión, no aprobada, etc.) → texto libre de respaldo
  log.warn("Template falló → usando fallback texto", {
    template: templateName,
    error: result.error,
    phone,
  });

  const fallbackResult = await sendWhatsAppText(phone, fallbackText, {
    origen: opts.origen ? `${opts.origen}:fallback` : "fallback",
    enviadoPor: opts.enviadoPor || "system",
  });

  return {
    success: fallbackResult.success,
    usedFallback: true,
    error: fallbackResult.success ? undefined : fallbackResult.error,
  };
}

/**
 * Enviar a múltiples destinatarios (con audit trail via wa_log)
 */
export async function sendWhatsAppToMultiple(
  templateName: string,
  params: string[],
  phones: string[],
  opts: { origen?: string; enviadoPor?: string; buttonToken?: string } = {}
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = { sent: 0, failed: 0, errors: [] as string[] };

  for (const phone of phones) {
    if (!phone) continue;

    const result = await sendWhatsAppLogged(
      templateName,
      params,
      phone,
      { origen: opts.origen || "batch", enviadoPor: opts.enviadoPor || "system", buttonToken: opts.buttonToken }
    );

    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      results.errors.push(`${phone}: ${result.error}`);
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

 
