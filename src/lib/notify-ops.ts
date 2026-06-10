// src/lib/notify-ops.ts
// 30-Abr-2026 — Helper central de notificaciones operativas a Direccion + RH.
//
// Cada vez que se ejecuta una accion del ERP (requisicion creada, OC generada,
// pago avisado, tarea creada, alta empleado, etc.) llamamos a notifyOps() que:
//   1. Lee de Users los emails y telefonos de quien tenga rol 'direccion' o 'rh'
//   2. Manda WA texto libre a cada telefono encontrado (con audit en wa_log)
//   3. Manda email con sendEmailLogged a cada email encontrado
//   4. Persiste el evento en la tabla event_log para feed de auditoria
//
// El helper NUNCA tira la operacion principal — si la notif falla, log y sigue.

import { getSupabaseAdmin } from "@/lib/supabase-server";
import { sendWhatsAppLogged } from "@/lib/whatsapp";
import { sendEmailLogged } from "@/lib/email-log";
import { ariaEmailHeader, ariaEmailFooter, ariaEmailWrapper } from "@/lib/email-templates";
import { logger } from "@/lib/logger";

const log = logger("NOTIFY-OPS");

export type EventoOps =
  | "REQUISICION_CREADA"
  | "REQUISICION_APROBADA"
  | "REQUISICION_RECHAZADA"
  | "OC_GENERADA"
  | "PAGO_AVISADO"
  | "PAGO_CONFIRMADO"
  | "TAREA_CREADA"
  | "TAREA_COMPLETADA"
  | "EMPLEADO_ALTA"
  | "EMPLEADO_BAJA"
  | "DOCUMENTO_SUBIDO"
  | "ASISTENCIA_ENTRADA"
  | "ASISTENCIA_SALIDA"
  | "FALTA_DETECTADA"
  | "COTIZACION_ENVIADA"
  | "COBRO_REGISTRADO";

export interface NotifyOpsInput {
  evento: EventoOps;
  /** Resumen 1 linea para WA + subject email. Ej: "REQ-2026-00012 OFICINA $4,500 — Jessica" */
  resumen: string;
  /** Detalle multilinea para body WA + email. Markdown WA con *negritas*. */
  detalle?: string;
  /** Quien disparo la accion (email o nombre). */
  actor?: string;
  /** Datos estructurados para event_log (folio, monto, obra, etc). */
  metadata?: Record<string, unknown>;
}

interface DestinatarioOps {
  email: string;
  phone: string | null;
  nombre: string | null;
  role: string;
}

/**
 * Lee Users con rol direccion o rh activos.
 * Tolerante: si no hay tabla `Users` con esos roles, retorna [].
 */
async function loadDestinatarios(): Promise<DestinatarioOps[]> {
  const supabase = getSupabaseAdmin();
  // Leer Users — los nombres de columna varian segun proyecto, intentamos lo mas comun
  const { data, error } = await supabase
    .from("Users")
    .select("email, phone, name, display_name, role, active")
    .in("role", ["direccion", "rh"]);
  if (error) {
    log.warn("[NOTIFY-OPS] Users query fallo", { err: error.message });
    return [];
  }
  type UserRow = {
    email?: string | null;
    phone?: string | null;
    name?: string | null;
    display_name?: string | null;
    role?: string | null;
    active?: boolean | null;
  };
  const rows = (data || []) as UserRow[];
  return rows
    .filter(u => u.email && (u.active === undefined || u.active === null || u.active === true))
    .map(u => ({
      email: u.email as string,
      phone: u.phone || null,
      nombre: u.name || u.display_name || null,
      role: (u.role as string) || "",
    }));
}

/**
 * Icono por evento para WA + email subject.
 */
function iconoEvento(e: EventoOps): string {
  switch (e) {
    case "REQUISICION_CREADA":   return "📦";
    case "REQUISICION_APROBADA": return "✅";
    case "REQUISICION_RECHAZADA":return "❌";
    case "OC_GENERADA":          return "🛒";
    case "PAGO_AVISADO":         return "💰";
    case "PAGO_CONFIRMADO":      return "✔️";
    case "TAREA_CREADA":         return "📋";
    case "TAREA_COMPLETADA":     return "✅";
    case "EMPLEADO_ALTA":        return "👤";
    case "EMPLEADO_BAJA":        return "👋";
    case "DOCUMENTO_SUBIDO":     return "📁";
    case "ASISTENCIA_ENTRADA":   return "📍";
    case "ASISTENCIA_SALIDA":    return "🏁";
    case "FALTA_DETECTADA":      return "⚠️";
    case "COTIZACION_ENVIADA":   return "📤";
    case "COBRO_REGISTRADO":     return "💵";
    default:                     return "🔔";
  }
}

function tituloEvento(e: EventoOps): string {
  return e.replace(/_/g, " ");
}

/**
 * notifyOps — manda WA + email a Direccion + RH y persiste en event_log.
 * NUNCA tira excepciones — best effort.
 */
export async function notifyOps(input: NotifyOpsInput): Promise<void> {
  const { evento, resumen, detalle, actor, metadata } = input;
  const supabase = getSupabaseAdmin();
  const icono = iconoEvento(evento);
  const titulo = tituloEvento(evento);

  // 1. Cargar destinatarios
  let destinatarios: DestinatarioOps[] = [];
  try {
    destinatarios = await loadDestinatarios();
  } catch (e: unknown) {
    log.error("[NOTIFY-OPS] loadDestinatarios fallo", { err: (e as Error)?.message });
  }

  const notifWa: string[] = [];
  const notifEmail: string[] = [];

  // 2. Mandar WA + email a cada destinatario
  for (const d of destinatarios) {
    // -- WhatsApp via TEMPLATE aprobado (aria_tarea_status) --
    // 6-May-2026: migrado de sendWhatsAppText a sendWhatsAppLogged con template
    // aprobado para garantizar entrega FUERA del window de 24h. Templates
    // approved por Meta SIEMPRE entregan a numero con WA activo, no requieren
    // que el receptor haya iniciado conversacion en las ultimas 24h.
    if (d.phone) {
      const nombre = (d.nombre || "Equipo").slice(0, 60);
      const cantidad = "0";
      const mensajeBody = `${icono} ${titulo}: ${resumen}${detalle ? " - " + detalle : ""}${actor ? " (por " + actor + ")" : ""}`
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 700);
      try {
        const waRes = await sendWhatsAppLogged("aria_tarea_status", [nombre, cantidad, mensajeBody], d.phone, {
          origen: `notify-ops:${evento}`,
          enviadoPor: actor || "sistema",
        });
        if (waRes.success) notifWa.push(`${d.role}:${d.phone}`);
        else log.warn("[NOTIFY-OPS] WA fallo", { role: d.role, phone: d.phone, err: waRes.error });
      } catch (e: unknown) {
        log.error("[NOTIFY-OPS] WA throw", { err: (e as Error)?.message });
      }
    }
    // -- Email --
    if (d.email) {
      try {
        const subject = `[${titulo}] ${resumen}`;
        // Si es combustible, agregar grilla de cargas con thumbnails de horometros
        const esCombustible = (metadata as { es_combustible?: boolean })?.es_combustible === true;
        type Carga = { maquina: string; tipo: string; litros: number; horometro?: number; horometro_foto?: string };
        const cargas = (metadata as { cargas?: Carga[] })?.cargas || [];
        let bloqueCombustible = "";
        if (esCombustible && cargas.length > 0) {
          const rows = cargas.map((c) => `
            <tr>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600">${c.maquina}</td>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center"><span style="background:#fef3c7;padding:2px 8px;border-radius:4px;font-size:11px">${c.tipo}</span></td>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${c.litros} L</td>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;font-family:monospace">${c.horometro ?? "—"}</td>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">${c.horometro_foto ? `<a href="${c.horometro_foto}" target="_blank"><img src="${c.horometro_foto}" style="max-width:80px;max-height:60px;border-radius:4px;border:1px solid #d4d4d8" alt="horometro"/></a>` : "<span style='color:#9ca3af;font-size:11px'>sin foto</span>"}</td>
            </tr>
          `).join("");
          const proveedor = (metadata as { proveedor?: string })?.proveedor;
          bloqueCombustible = `
            <div style="margin:14px 0;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px">
              <div style="font-weight:bold;color:#92400e;margin-bottom:8px">⛽ Cargas de combustible</div>
              ${proveedor ? `<div style="font-size:12px;color:#78350f;margin-bottom:8px">Gasolinera: <strong>${proveedor}</strong></div>` : ""}
              <table style="width:100%;border-collapse:collapse;font-size:12px;color:#374151">
                <thead>
                  <tr style="background:#fef3c7">
                    <th style="padding:8px;text-align:left">Maquina</th>
                    <th style="padding:8px;text-align:center">Tipo</th>
                    <th style="padding:8px;text-align:right">Litros</th>
                    <th style="padding:8px;text-align:center">Horometro</th>
                    <th style="padding:8px;text-align:center">Foto</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          `;
        }

        const html = ariaEmailWrapper(
          ariaEmailHeader(`${icono} ${titulo}`) +
          `<div style="padding:25px;font-size:13px;color:#1e293b;line-height:1.6">` +
          `<p style="margin:0 0 12px"><strong>${resumen}</strong></p>` +
          (detalle ? `<div style="background:#f8fafc;border-left:4px solid #1E3E7A;padding:14px;margin:14px 0;font-size:12px;color:#334155;white-space:pre-wrap">${detalle}</div>` : "") +
          bloqueCombustible +
          (actor ? `<p style="margin:14px 0 0;color:#64748b;font-size:11px"><em>Disparado por: ${actor}</em></p>` : "") +
          `</div>` +
          ariaEmailFooter()
        );
        const emRes = await sendEmailLogged({
          template: `notify_ops_${evento.toLowerCase()}`,
          to: d.email,
          subject,
          html,
          origen: `notify-ops:${evento}`,
          enviadoPor: actor || "sistema",
        });
        if (emRes.success) notifEmail.push(`${d.role}:${d.email}`);
        else log.warn("[NOTIFY-OPS] Email fallo", { role: d.role, email: d.email, err: emRes.error });
      } catch (e: unknown) {
        log.error("[NOTIFY-OPS] Email throw", { err: (e as Error)?.message });
      }
    }
  }

  // 3. Persistir en event_log
  try {
    await supabase.from("event_log").insert({
      tipo: evento,
      resumen,
      detalle: detalle || null,
      actor: actor || null,
      metadata: metadata || {},
      notificados_wa: notifWa,
      notificados_email: notifEmail,
    });
  } catch (e: unknown) {
    log.warn("[NOTIFY-OPS] event_log insert fallo (quiza tabla no existe aun)", { err: (e as Error)?.message });
  }

  log.info(`[NOTIFY-OPS] ${evento}`, {
    resumen,
    actor,
    destinatarios: destinatarios.length,
    wa_ok: notifWa.length,
    email_ok: notifEmail.length,
  });
}
