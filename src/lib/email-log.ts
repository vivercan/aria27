/**
 * src/lib/email-log.ts — Helper unico para envio de correos transaccionales con auditoria.
 *
 * Analogo a sendWhatsAppLogged() de src/lib/whatsapp.ts. Envuelve resend.emails.send()
 * y persiste TODO envio en la tabla public.email_log (shape similar a wa_log).
 *
 * Reglas del canon de correos (ver Notion FASE E — Mapa Flujo Correos Requisiciones):
 *  - Usar RESEND_FROM de src/lib/email-config.ts (sin hardcodear el remitente).
 *  - Subjects con formato [VERBO] folio - contexto (ej: [CREADA] REQ-2026-00001 - MIRAVALLE).
 *  - replyTo="compras@gcuavante.com" cuando el destino es un proveedor externo.
 *  - replyTo=senderEmail cuando el destino es interno y debe contestar al usuario que dispara.
 *  - BCC="audit@gcuavante.com" opcional para emails a proveedores (auditoria externa).
 *
 * Logging:
 *  - Si el insert en email_log falla, se registra en logger pero NO se rompe el flujo.
 *  - Si Resend devuelve error en el payload o lanza excepcion, se persiste error y success=false.
 *
 * PR feat/email-flow-canon 23-Abr-2026 — Claude.
 */

import { getResend } from "@/lib/resend";
import { RESEND_FROM } from "@/lib/email-config";
import { logger } from "@/lib/logger";

const log = logger("EMAIL-LOG");

export interface SendEmailLoggedOpts {
  /** Identificador logico del template (ej: "requisicion_creada_creador"). */
  template: string;
  /** Destinatario principal. */
  to: string | string[];
  /** Subject final (ya formateado con [VERBO] folio - contexto). */
  subject: string;
  /** HTML ya renderizado. */
  html: string;
  /** From opcional; por default usa RESEND_FROM. */
  from?: string;
  /** Reply-To (compras@gcuavante.com para proveedores, senderEmail para internos). */
  replyTo?: string | string[];
  /** BCC opcional (audit@gcuavante.com para proveedores). */
  bcc?: string | string[];
  /** Contexto de origen del envio (ej: "req-creada-creador"). */
  origen?: string;
  /** Email del user que disparo el envio (para trazabilidad). */
  enviadoPor?: string;
}

export interface SendEmailLoggedResult {
  success: boolean;
  messageId: string | null;
  error: string | null;
}

type ResendSendPayload = Parameters<ReturnType<typeof getResend>["emails"]["send"]>[0];
type ResendSendResponse = { data?: { id?: string } | null; error?: { message?: string } | string | null } | null;

/**
 * Envia un correo via Resend y persiste el intento (exitoso o fallido) en email_log.
 * No lanza: cualquier error se captura, se loguea y se retorna {success:false, error}.
 */
export async function sendEmailLogged(opts: SendEmailLoggedOpts): Promise<SendEmailLoggedResult> {
  const payload: Record<string, unknown> = {
    from: opts.from || RESEND_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  };
  if (opts.replyTo) payload.replyTo = opts.replyTo;
  if (opts.bcc) payload.bcc = opts.bcc;

  let success = false;
  let messageId: string | null = null;
  let error: string | null = null;

  try {
    const resend = getResend();
    const res = (await resend.emails.send(payload as unknown as ResendSendPayload)) as ResendSendResponse;
    if (res && res.error) {
      error = typeof res.error === "string"
        ? res.error
        : (res.error as { message?: string })?.message || JSON.stringify(res.error);
    } else {
      success = true;
      messageId = res?.data?.id || null;
    }
  } catch (e: unknown) {
    error = (e as Error)?.message || String(e);
    log.error("Exception enviando email", { template: opts.template, error });
  }

  // Persistir intento (success o failure). Fallos de logging NO rompen el flujo.
  try {
    const { getSupabaseAdmin } = await import("@/lib/supabase-server");
    const supa = getSupabaseAdmin();
    const toStr = Array.isArray(opts.to) ? opts.to.join(",") : opts.to;
    const replyStr = opts.replyTo
      ? (Array.isArray(opts.replyTo) ? opts.replyTo.join(",") : opts.replyTo)
      : null;
    const bccStr = opts.bcc
      ? (Array.isArray(opts.bcc) ? opts.bcc.join(",") : opts.bcc)
      : null;

    await supa.from("email_log").insert({
      template: opts.template,
      to_email: toStr,
      subject: opts.subject,
      body_preview: (opts.html || "").slice(0, 500),
      success,
      message_id: messageId,
      error,
      origen: opts.origen || null,
      enviado_por: opts.enviadoPor || null,
      reply_to: replyStr,
      bcc: bccStr,
    });
  } catch (e: unknown) {
    log.error("No se pudo escribir email_log", { template: opts.template, error: (e as Error).message });
  }

  return { success, messageId, error };
}

/** Reply-To canonico para correos que salen a proveedores externos. */
export const REPLY_TO_COMPRAS = process.env.REPLY_TO_COMPRAS || "compras@gcuavante.com";
/** BCC opcional de auditoria externa para correos a proveedores. */
export const BCC_AUDIT = process.env.BCC_AUDIT_EMAIL || null;
