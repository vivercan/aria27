import { NextResponse, NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { RESEND_FROM } from "@/lib/email-config";
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
      .select("full_name, phone, email")
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
    if (empleado.phone) {
      const mensaje = `*📋 Nueva tarea asignada — ARIA27*\n\nHola *${empleado.full_name}*, se te asignó una tarea:\n\n*${titulo}*${descripcion ? `\n${descripcion}` : ""}\n\n📅 Fecha compromiso: ${fechaFmt}${obraStr}\n✍️ Asignado por: ${asignado_por || "Administrador"}\n\n_Revisa el sistema para marcar tu avance._`;
      const waResult = await sendWhatsAppText(
        empleado.phone,
        mensaje,
        { origen: "tarea-asignada", enviadoPor: asignado_por || "sistema" }
      );
      if (waResult.success) {
        notificaciones.push(`WA OK: ${empleado.phone}`);
        log.info(`[TAREAS-NOTIFICAR] WA enviado a ${empleado.full_name} (${empleado.phone})`);
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
          html: `
            <div style="font-family:Arial;max-width:600px;margin:0 auto;background:#0f172a;color:white;padding:30px;border-radius:8px;">
              <div style="text-align:center;margin-bottom:20px;">
                <div style="font-size:28px;font-weight:900;letter-spacing:2px;color:#22d3ee">ARIA</div>
                <div style="font-size:10px;text-transform:uppercase;color:#94a3b8;letter-spacing:3px">Operations OS</div>
              </div>
              <div style="background:#1e3a5f;padding:15px;border-radius:8px;text-align:center;margin-bottom:20px;">
                <p style="margin:0;font-size:18px;font-weight:bold;color:#a78bfa">📋 Nueva Tarea Asignada</p>
              </div>
              <p style="color:#c9d8ed">Hola <strong style="color:white">${empleado.full_name}</strong>,</p>
              <p style="color:#94a3b8">Se te asignó la siguiente tarea en ARIA27:</p>
              <div style="background:#1e293b;padding:20px;border-radius:8px;margin:15px 0;border-left:4px solid #a78bfa">
                <p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:white">${titulo}</p>
                ${descripcion ? `<p style="margin:0 0 12px;color:#94a3b8;font-size:14px">${descripcion}</p>` : ""}
                <table style="width:100%;font-size:13px">
                  <tr><td style="color:#64748b;padding:3px 0">📅 Fecha compromiso:</td><td style="color:white;font-weight:bold">${fechaFmt}</td></tr>
                  ${obra ? `<tr><td style="color:#64748b;padding:3px 0">🏗️ Obra:</td><td style="color:white">${obra}</td></tr>` : ""}
                  <tr><td style="color:#64748b;padding:3px 0">✍️ Asignado por:</td><td style="color:white">${asignado_por || "Administrador"}</td></tr>
                </table>
              </div>
              <p style="color:#94a3b8;font-size:13px;text-align:center;margin-top:20px">Ingresa a ARIA27 para actualizar tu avance.</p>
              <div style="text-align:center;margin-top:15px;padding-top:15px;border-top:1px solid #334155">
                <span style="color:#475569;font-size:11px">ARIA27 ERP — Grupo Constructor Urbano Avante</span>
              </div>
            </div>
          `
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
