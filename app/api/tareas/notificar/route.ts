import { NextResponse, NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { RESEND_FROM } from "@/lib/email-config";
import { ariaEmailHeader, ariaEmailFooter, ariaEmailWrapper } from "@/lib/email-templates";
import { logger } from "@/lib/logger";

const log = logger("TAREAS-NOTIFICAR");

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  try {
    const body = await req.json().catch(() => ({}));
    const { asignado_id, titulo, descripcion, fecha_compromiso, asignado_por, obra } = body;

    if (!asignado_id || !titulo) {
      return NextResponse.json({ error: "asignado_id y titulo son requeridos" }, { status: 400 });
    }

    // Buscar datos del empleado asignado
    const { data: empleado } = await supabase
      .from("employees")
      .select("full_name, whatsapp, email")
      .eq("id", asignado_id)
      .single();

    if (!empleado) {
      return NextResponse.json({ notified: false, reason: "empleado no encontrado" });
    }

    const fechaFmt = fecha_compromiso
      ? new Date(fecha_compromiso + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
      : "—";
    const obraStr = obra ? ` | Obra: ${obra}` : "";

    const notificaciones: string[] = [];

    // ── WhatsApp (texto libre — best effort) ─────────────────────────────
    if (empleado.whatsapp) {
      const mensaje = `*📋 Nueva tarea asignada — ARIA27*\n\nHola *${empleado.full_name}*, se te asignó una tarea:\n\n*${titulo}*${descripcion ? `\n${descripcion}` : ""}\n\n📅 Fecha compromiso: ${fechaFmt}${obraStr}\n✍️ Asignado por: ${asignado_por || "Administrador"}\n\n_Revisa el sistema para marcar tu avance._`;
      const waResult = await sendWhatsAppText(
        empleado.whatsapp,
        mensaje,
        { origen: "tarea-asignada", enviadoPor: asignado_por || "sistema" }
      );
      if (waResult.success) {
        notificaciones.push(`WA OK: ${empleado.whatsapp}`);
        log.info(`[TAREAS-NOTIFICAR] WA enviado a ${empleado.full_name} (${empleado.whatsapp})`);
      } else {
        log.warn(`[TAREAS-NOTIFICAR] WA error para ${empleado.full_name}: ${waResult.error}`);
      }
    }

    // ── Email ─────────────────────────────────────────────────────────────
    if (empleado.email) {
      try {
        const { getResend } = await import("@/lib/resend");
        const resend = getResend();
        const emailResult = await resend.emails.send({
          from: RESEND_FROM,
          to: empleado.email,
          subject: `Nueva tarea: ${titulo}`,
          html: ariaEmailWrapper(ariaEmailHeader("Nueva tarea asignada") + `<div style="padding:25px;font-size:13px;color:#1e293b;line-height:1.55"><p>Hola <strong>${empleado.full_name}</strong>,</p><p style="color:#475569">Se te asigno la siguiente tarea en ARIA27:</p><div style="background:#f8fafc;border-radius:8px;padding:18px;margin:18px 0;border-left:4px solid #1E3E7A"><p style="margin:0 0 8px;font-size:16px;font-weight:bold;color:#0f172a">${titulo}</p>${descripcion ? `<p style="margin:0 0 12px;color:#475569;font-size:13px">${descripcion}</p>` : ""}<table style="width:100%;font-size:12px;color:#334155"><tr><td style="color:#64748b;padding:3px 0">Fecha compromiso:</td><td style="font-weight:bold">${fechaFmt}</td></tr>${obra ? `<tr><td style="color:#64748b;padding:3px 0">Obra:</td><td>${obra}</td></tr>` : ""}<tr><td style="color:#64748b;padding:3px 0">Asignado por:</td><td>${asignado_por || "Administrador"}</td></tr></table></div><p style="color:#475569;font-size:12px;margin-top:18px">Ingresa a ARIA27 para actualizar tu avance.</p></div>` + ariaEmailFooter())
        });
        if ((emailResult as Record<string, unknown>)?.error) {
          log.error("[TAREAS-NOTIFICAR] Email error", emailResult);
        } else {
          notificaciones.push(`Email OK: ${empleado.email}`);
          log.info(`[TAREAS-NOTIFICAR] Email enviado a ${empleado.full_name} (${empleado.email})`);
        }
      } catch (emailErr: unknown) {
        log.error("[TAREAS-NOTIFICAR] Email exception", (emailErr as Error).message);
      }
    }

    return NextResponse.json({
      notified: notificaciones.length > 0,
      notificaciones,
      empleado: empleado.full_name,
    });
  } catch (error: unknown) {
    log.error("[TAREAS-NOTIFICAR]", error);
    return NextResponse.json({ error: (error as Error)?.message || "Error interno" }, { status: 500 });
  }
}
