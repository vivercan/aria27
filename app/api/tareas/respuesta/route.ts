/**
 * /api/tareas/respuesta
 *
 * 26-Abr-2026 (JJ): Procesa respuestas WA del personal de obra y oficina sobre sus tareas.
 *
 * Acepta POST {phone, text} - simula recepcion de WA. En fase 2 sera invocado
 * desde el webhook unificado de Meta cuando detecte que un mensaje no es de
 * checadas/OC y proviene de un empleado con tareas pendientes.
 *
 * Soporta:
 *   - Claves rapidas: OK / INICIO / MITAD / 50 / CASI / 75 / LISTO / DONE / 100 / BLOQUEADO X / AYUDA / STATUS / CANCELAR
 *   - "AVANCE 65" cualquier numero 0..100
 *   - "1 OK", "TAREA #5 LISTO" - apunta a tarea especifica por indice o folio corto
 *   - Frases libres - Claude AI fallback ("ya casi termino" -> 75%; "se rompio la varilla" -> BLOQUEADO con motivo)
 *
 * Notifica al asignador en eventos clave (inicio / completado / bloqueado / ayuda).
 * No notifica al asignador por cada %.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { sendEmailLogged } from "@/lib/email-log";
import { ariaEmailHeader, ariaEmailFooter, ariaEmailWrapper } from "@/lib/email-templates";
import { logger } from "@/lib/logger";

const log = logger("TAREAS-RESPUESTA");

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  asignado_id: string | null;
  asignado_nombre: string | null;
  asignado_por: string | null;
  asignado_por_email: string | null;
  obra: string | null;
  avance: number | null;
  fecha_compromiso: string | null;
  estatus: string;
  prioridad: string | null;
  created_at: string;
  updated_at: string | null;
}

interface ParseResult {
  intent: "INICIO" | "AVANCE" | "LISTO" | "BLOQUEADO" | "AYUDA" | "STATUS" | "CANCELAR" | "DESCONOCIDO";
  porcentaje?: number;
  motivo?: string;
  tareaIdx?: number;
}

function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function parseRapido(textRaw: string): ParseResult {
  const text = normalize(textRaw);

  // Selector de tarea: "1 OK" / "TAREA #5 LISTO"
  let tareaIdx: number | undefined;
  const idxMatch = text.match(/^(?:tarea\s*#?\s*)?(\d{1,2})\s+(.+)$/);
  let cuerpo = text;
  if (idxMatch) {
    tareaIdx = Number(idxMatch[1]);
    cuerpo = idxMatch[2];
  }

  // STATUS / MIS TAREAS
  if (/^(status|mis tareas|tareas|que tengo|que pendiente|pendientes)$/.test(cuerpo)) {
    return { intent: "STATUS", tareaIdx };
  }
  // AYUDA
  if (/^(ayuda|sos|help|necesito ayuda)$/.test(cuerpo)) {
    return { intent: "AYUDA", tareaIdx };
  }
  // CANCELAR
  if (/^(cancelar|cancelo|no puedo)$/.test(cuerpo)) {
    return { intent: "CANCELAR", tareaIdx };
  }
  // BLOQUEADO + motivo
  const blockMatch = cuerpo.match(/^(bloqueado|problema|trabado|atorado|stop)\b\s*[:\-,]?\s*(.*)$/);
  if (blockMatch) {
    return { intent: "BLOQUEADO", motivo: (blockMatch[2] || "").trim() || "sin detalle", tareaIdx };
  }
  // AVANCE N (numero 0..100)
  const avMatch = cuerpo.match(/^(?:avance|porcentaje|llevo|al)\s+(\d{1,3})(?:\s*%)?$/);
  if (avMatch) {
    const n = Math.min(100, Math.max(0, Number(avMatch[1])));
    if (n === 100) return { intent: "LISTO", porcentaje: 100, tareaIdx };
    return { intent: "AVANCE", porcentaje: n, tareaIdx };
  }
  // Solo numero "50" / "75"
  const numMatch = cuerpo.match(/^(\d{1,3})(?:\s*%)?$/);
  if (numMatch) {
    const n = Math.min(100, Math.max(0, Number(numMatch[1])));
    if (n === 100) return { intent: "LISTO", porcentaje: 100, tareaIdx };
    return { intent: "AVANCE", porcentaje: n, tareaIdx };
  }
  // INICIO
  if (/^(inicio|iniciando|empece|empiezo|empezando|arranco|arrancando|arranque|on it|ok|enterado|recibido|va)$/.test(cuerpo)) {
    return { intent: "INICIO", porcentaje: 25, tareaIdx };
  }
  // MITAD / 50
  if (/^(mitad|medio|midway|half)$/.test(cuerpo)) {
    return { intent: "AVANCE", porcentaje: 50, tareaIdx };
  }
  // CASI / 75
  if (/^(casi|casi listo|por terminar)$/.test(cuerpo)) {
    return { intent: "AVANCE", porcentaje: 75, tareaIdx };
  }
  // LISTO / DONE / 100
  if (/^(listo|terminado|termine|completado|done|finalizado|acabe|hecho)$/.test(cuerpo)) {
    return { intent: "LISTO", porcentaje: 100, tareaIdx };
  }

  return { intent: "DESCONOCIDO", tareaIdx };
}

async function parseAI(textRaw: string): Promise<ParseResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { intent: "DESCONOCIDO" };
  try {
    const prompt = `Eres un parser de respuestas de personal de construccion via WhatsApp. Devuelve SOLO JSON valido sin texto extra. Estructura:
{"intent":"INICIO|AVANCE|LISTO|BLOQUEADO|AYUDA|STATUS|CANCELAR|DESCONOCIDO","porcentaje":<0-100 opcional>,"motivo":<string opcional>}

Reglas:
- "ya casi termino" / "ya mero" -> AVANCE 75
- "ya empece" / "estoy en eso" -> INICIO 25
- "termine" / "ya esta" / "listo" -> LISTO 100
- "no puedo porque X" / "tengo problema con X" / "se rompio X" -> BLOQUEADO motivo:X
- "ayuda" / "no se como hacer" -> AYUDA
- "que tareas tengo" / "mostrar tareas" -> STATUS
- Si no puedes parsear -> DESCONOCIDO

Mensaje del empleado: "${textRaw.slice(0, 500)}"`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    const txt = data?.content?.[0]?.text || "";
    const jsonMatch = txt.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        intent: parsed.intent || "DESCONOCIDO",
        porcentaje: typeof parsed.porcentaje === "number" ? parsed.porcentaje : undefined,
        motivo: typeof parsed.motivo === "string" ? parsed.motivo : undefined,
      };
    }
  } catch (e: unknown) {
    log.warn("Claude AI parser fallo", { err: (e as Error).message });
  }
  return { intent: "DESCONOCIDO" };
}

function listarTareas(tareas: Tarea[]): string {
  return tareas
    .slice(0, 10)
    .map((t, i) => {
      const av = typeof t.avance === "number" ? `${t.avance}%` : "—";
      const fec = t.fecha_compromiso
        ? new Date(t.fecha_compromiso + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
        : "—";
      return `${i + 1}. [${av}] ${t.titulo} (${fec})`;
    })
    .join("\n");
}

async function notificarAsignador(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tarea: Tarea,
  evento: string,
  detalle: string
) {
  const asignadorEmail = tarea.asignado_por_email || tarea.asignado_por || null;
  if (!asignadorEmail || !/^[^\s@]+@[^\s@]+$/.test(asignadorEmail)) {
    // Si asignado_por es nombre, intentar resolver email via users
    if (tarea.asignado_por) {
      const { data } = await supabase.from("users").select("email,phone").ilike("name", `%${tarea.asignado_por}%`).limit(1);
      if (data?.[0]) {
        await mandarNotif(data[0].email, data[0].phone, tarea, evento, detalle);
        return;
      }
    }
    return;
  }
  const { data } = await supabase.from("users").select("phone").eq("email", asignadorEmail).single();
  await mandarNotif(asignadorEmail, data?.phone || null, tarea, evento, detalle);
}

async function mandarNotif(
  email: string | null,
  phone: string | null,
  tarea: Tarea,
  evento: string,
  detalle: string
) {
  if (email) {
    const color = evento === "BLOQUEADO" ? "#dc2626" : evento === "COMPLETADA" ? "#16a34a" : evento === "AYUDA" ? "#f59e0b" : "#3b82f6";
    await sendEmailLogged({
      template: `tarea_${evento.toLowerCase()}_asignador`,
      to: email,
      subject: `[${evento}] ${tarea.titulo} — ${tarea.asignado_nombre || "personal"}`,
      html: ariaEmailWrapper(
        ariaEmailHeader(`Tarea ${evento.toLowerCase()}`) +
        `<div style="padding:25px;font-size:13px;color:#1e293b;line-height:1.55"><div style="background:${color}1A;border-left:4px solid ${color};padding:14px;border-radius:4px;margin-bottom:14px"><p style="margin:0;color:${color};font-weight:bold">${detalle}</p></div><table style="width:100%;font-size:12px;color:#334155"><tr><td style="color:#64748b;padding:3px 0">Tarea:</td><td><strong>${tarea.titulo}</strong></td></tr>${tarea.obra ? `<tr><td style="color:#64748b;padding:3px 0">Obra:</td><td>${tarea.obra}</td></tr>` : ""}<tr><td style="color:#64748b;padding:3px 0">Persona:</td><td>${tarea.asignado_nombre || "-"}</td></tr><tr><td style="color:#64748b;padding:3px 0">Avance:</td><td>${tarea.avance ?? 0}%</td></tr></table></div>` +
        ariaEmailFooter()
      ),
      origen: `tarea-${evento.toLowerCase()}-asignador`,
      enviadoPor: "tareas-respuesta",
    });
  }
  if (phone) {
    await sendWhatsAppText(
      phone,
      `🔔 *${evento}* — ARIA27\n\n${detalle}\n\n📋 ${tarea.titulo}\n👤 ${tarea.asignado_nombre || "—"}\n${tarea.obra ? `🏗️ ${tarea.obra}\n` : ""}📊 Avance ${tarea.avance ?? 0}%`,
      { origen: `tarea-${evento.toLowerCase()}-asignador-wa`, enviadoPor: "tareas-respuesta" }
    );
  }
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  try {
    const body = await req.json().catch(() => ({}));
    const phoneRaw: string = body.phone || "";
    const text: string = body.text || "";
    const debug: boolean = body.debug === true || body.debug === "true";
    if (!phoneRaw || !text) {
      return NextResponse.json({ error: "phone y text requeridos" }, { status: 400 });
    }
    // Normalizar phone (quitar +, 521, etc.)
    const phone10 = phoneRaw.replace(/\D/g, "").slice(-10);
    log.info(`[POST] phone10=${phone10} text="${text.slice(0, 60)}" debug=${debug}`);

    // Identificar empleado por whatsapp (busca los ultimos 10 digitos)
    const { data: empleadosData, error: empErr } = await supabase
      .from("employees")
      .select("id, full_name, whatsapp, email")
      .ilike("whatsapp", `%${phone10}%`);
    if (empErr) log.error("Query employees fallo", { err: empErr.message });
    const empleados = (empleadosData || []) as Array<{ id: string; full_name: string; whatsapp: string | null; email: string | null }>;
    log.info(`[POST] employees encontrados con phone: ${empleados.length}`);
    const empleado = empleados.find((e) => (e.whatsapp || "").replace(/\D/g, "").slice(-10) === phone10);

    if (!empleado) {
      // Si no encontramos en employees, probar tabla users (para personal admin sin ficha employee)
      const { data: usersData, error: usrErr } = await supabase
        .from("users")
        .select("id, name, phone, email")
        .eq("phone", phone10);
      if (usrErr) log.error("Query users fallo", { err: usrErr.message });
      const users = (usersData || []) as Array<{ id: string; name: string; phone: string | null; email: string | null }>;
      log.info(`[POST] users encontrados con phone: ${users.length}`);
      const usr = users.find((u) => (u.phone || "").replace(/\D/g, "").slice(-10) === phone10);
      if (!usr) {
        await sendWhatsAppText(phoneRaw, "🤖 No encuentro tu numero registrado en ARIA27. Pide a RH que te de de alta.", { origen: "tarea-respuesta-no-id" });
        return NextResponse.json({
          ok: false,
          reason: "phone-no-encontrado",
          debug: debug ? {
            phone10,
            employees_query_count: empleados.length,
            employees_sample: empleados.slice(0, 3).map((e) => ({ name: e.full_name, wa: e.whatsapp })),
            users_query_count: users.length,
            users_sample: users.slice(0, 3).map((u) => ({ name: u.name, phone: u.phone })),
            employees_query_error: empErr?.message || null,
            users_query_error: usrErr?.message || null,
          } : undefined,
        });
      }
      // Buscar tareas asignadas por nombre
      const { data: tareasData, error: trErr2 } = await supabase
        .from("tareas_asignadas")
        .select("*")
        .ilike("asignado_nombre", `%${usr.name}%`)
        .not("estatus", "in", "(COMPLETADA,CANCELADA)")
        .order("fecha_compromiso", { ascending: true });
      if (trErr2) log.error("Query tareas users-fallback fallo", { err: trErr2.message });
      return await procesarRespuesta(supabase, phoneRaw, text, (tareasData as Tarea[]) || [], usr.name, usr.email, debug, {
        empleado_origen: "users",
        empleado_id: usr.id,
        empleado_nombre: usr.name,
        tareas_query_error: trErr2?.message || null,
      });
    }

    // Buscar tareas asignadas a este empleado activo (excluye COMPLETADA y CANCELADA)
    const { data: tareasData, error: trErr } = await supabase
      .from("tareas_asignadas")
      .select("*")
      .eq("asignado_id", empleado.id)
      .not("estatus", "in", "(COMPLETADA,CANCELADA)")
      .order("fecha_compromiso", { ascending: true });
    if (trErr) log.error("Query tareas_asignadas fallo", { err: trErr.message, asignado_id: empleado.id });
    log.info(`[POST] tareas pendientes para ${empleado.full_name}: ${(tareasData || []).length}`);

    return await procesarRespuesta(supabase, phoneRaw, text, (tareasData as Tarea[]) || [], empleado.full_name, empleado.email, debug, {
      empleado_origen: "employees",
      empleado_id: empleado.id,
      empleado_nombre: empleado.full_name,
      empleado_wa: empleado.whatsapp,
      tareas_query_error: trErr?.message || null,
    });
  } catch (e: unknown) {
    log.error("Excepcion procesando respuesta", { err: (e as Error).message });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

interface DebugInfo {
  empleado_origen?: string;
  empleado_id?: string;
  empleado_nombre?: string;
  empleado_wa?: string | null;
  tareas_query_error?: string | null;
}

async function procesarRespuesta(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  phone: string,
  text: string,
  tareas: Tarea[],
  nombre: string,
  emailEmpleado: string | null,
  debug: boolean = false,
  debugInfo: DebugInfo = {}
): Promise<NextResponse> {
  // 1) Parser rapido
  let parsed = parseRapido(text);
  // 2) Si DESCONOCIDO, intentar Claude AI
  if (parsed.intent === "DESCONOCIDO") {
    parsed = await parseAI(text);
  }

  // 3) STATUS / no tiene tareas
  if (parsed.intent === "STATUS") {
    if (tareas.length === 0) {
      await sendWhatsAppText(phone, `✨ ${nombre}, no tienes tareas pendientes. ¡Buen trabajo!`, { origen: "tarea-status-vacio" });
    } else {
      await sendWhatsAppText(phone, `📋 *Tus tareas pendientes (${tareas.length})*\n\n${listarTareas(tareas)}\n\nResponde con: *1 LISTO* o *AVANCE 50* para actualizar.`, { origen: "tarea-status" });
    }
    return NextResponse.json({ ok: true, action: "STATUS", count: tareas.length });
  }

  if (tareas.length === 0) {
    await sendWhatsAppText(phone, `🤔 ${nombre}, no encuentro tareas pendientes a tu nombre.\n\nResponde *STATUS* para ver tu lista (vacia hoy).`, { origen: "tarea-respuesta-sin-tareas", enviadoPor: emailEmpleado || "system" });
    return NextResponse.json({
      ok: false,
      reason: "sin-tareas",
      debug: debug ? { ...debugInfo, tareas_count: tareas.length } : undefined,
    });
  }

  // 4) Identificar tarea destino
  let tarea: Tarea;
  if (parsed.tareaIdx && tareas[parsed.tareaIdx - 1]) {
    tarea = tareas[parsed.tareaIdx - 1];
  } else if (tareas.length === 1) {
    tarea = tareas[0];
  } else if (parsed.intent === "DESCONOCIDO") {
    await sendWhatsAppText(phone, `🤔 No entendi tu mensaje. Tienes ${tareas.length} tareas pendientes:\n\n${listarTareas(tareas)}\n\nResponde con: *1 LISTO* / *2 AVANCE 60* / *BLOQUEADO motivo* / *STATUS*`, { origen: "tarea-desconocido" });
    return NextResponse.json({ ok: false, reason: "desconocido" });
  } else {
    // Aplicar a la mas reciente y avisar
    tarea = tareas[0];
  }

  // 5) Aplicar accion
  let nuevoAvance = tarea.avance ?? 0;
  let nuevoEstatus = tarea.estatus;
  let motivoBloqueo: string | null = null;
  let completadaAt: string | null = null;
  const ahora = new Date().toISOString();

  switch (parsed.intent) {
    case "INICIO":
      nuevoAvance = Math.max(nuevoAvance, parsed.porcentaje ?? 25);
      nuevoEstatus = "EN_PROGRESO";
      break;
    case "AVANCE":
      nuevoAvance = Math.min(99, parsed.porcentaje ?? nuevoAvance);
      nuevoEstatus = "EN_PROGRESO";
      break;
    case "LISTO":
      nuevoAvance = 100;
      nuevoEstatus = "COMPLETADA";
      completadaAt = ahora;
      break;
    case "BLOQUEADO":
      // El check constraint solo permite PENDIENTE/EN_PROGRESO/COMPLETADA/CANCELADA.
      // Marcamos motivo_bloqueo y mantenemos estatus EN_PROGRESO (la tarea sigue viva pero pausada).
      nuevoEstatus = "EN_PROGRESO";
      motivoBloqueo = parsed.motivo || "Sin detalle";
      break;
    case "AYUDA":
      // No cambia status pero notifica
      break;
    case "CANCELAR":
      nuevoEstatus = "CANCELADA";
      break;
    default:
      // Ya manejamos DESCONOCIDO arriba; si llega aqui, salimos
      return NextResponse.json({ ok: false, reason: "intent-fuera-de-rango" });
  }

  if (parsed.intent !== "AYUDA") {
    const { error: updErr } = await supabase
      .from("tareas_asignadas")
      .update({
        avance: nuevoAvance,
        estatus: nuevoEstatus,
        motivo_bloqueo: motivoBloqueo,
        respuesta_ultima: text.slice(0, 300),
        respuesta_ultima_at: ahora,
        completada_at: completadaAt,
        updated_at: ahora,
      })
      .eq("id", tarea.id);
    if (updErr) {
      log.error("UPDATE tareas_asignadas fallo", { err: updErr.message, tarea_id: tarea.id, intent: parsed.intent, nuevoEstatus });
      await sendWhatsAppText(phone, `\u26A0\uFE0F Recibi tu mensaje pero no pude actualizar la tarea: ${updErr.message.slice(0, 100)}`, { origen: "tarea-update-error" });
      return NextResponse.json({ ok: false, reason: "update-fallo", error: updErr.message });
    }
    log.info(`[UPDATE OK] tarea=${tarea.id} estatus=${nuevoEstatus} avance=${nuevoAvance}`);
    tarea.avance = nuevoAvance;
    tarea.estatus = nuevoEstatus;
  }

  // 6) Confirmar al empleado
  let confirmacion = "";
  switch (parsed.intent) {
    case "INICIO":
      confirmacion = `🚀 Registrado: *${tarea.titulo}* iniciada (${nuevoAvance}%). Avisame cuando lleves mas avance.`;
      break;
    case "AVANCE":
      confirmacion = `📊 Registrado: *${tarea.titulo}* en ${nuevoAvance}%. Sigues en progreso.`;
      break;
    case "LISTO":
      confirmacion = `✅ ¡Excelente! *${tarea.titulo}* COMPLETADA. Gracias ${nombre}.`;
      break;
    case "BLOQUEADO":
      confirmacion = `⚠️ Registrado bloqueo en *${tarea.titulo}*\nMotivo: ${motivoBloqueo}\n\nNotifique a tu jefe para que te apoye.`;
      break;
    case "AYUDA":
      confirmacion = `🆘 Pedido de ayuda registrado en *${tarea.titulo}*.\nNotifique a tu jefe para que te contacte.`;
      break;
    case "CANCELAR":
      confirmacion = `❌ Tarea *${tarea.titulo}* cancelada.`;
      break;
  }
  await sendWhatsAppText(phone, confirmacion, { origen: "tarea-respuesta-confirm", enviadoPor: emailEmpleado || "system" });

  // 7) Notificar al asignador en eventos clave
  if (parsed.intent === "INICIO" && (tarea.estatus === "EN_PROGRESO") && (tarea.avance ?? 0) <= 25) {
    await notificarAsignador(supabase, tarea, "INICIADA", `${nombre} comenzo la tarea.`);
  }
  if (parsed.intent === "LISTO") {
    await notificarAsignador(supabase, tarea, "COMPLETADA", `${nombre} marco la tarea como terminada.`);
  }
  if (parsed.intent === "BLOQUEADO") {
    await notificarAsignador(supabase, tarea, "BLOQUEADO", `${nombre} reporta bloqueo: ${motivoBloqueo}`);
  }
  if (parsed.intent === "AYUDA") {
    await notificarAsignador(supabase, tarea, "AYUDA", `${nombre} solicita ayuda.`);
  }

  return NextResponse.json({
    ok: true,
    intent: parsed.intent,
    tarea_id: tarea.id,
    titulo: tarea.titulo,
    avance: nuevoAvance,
    estatus: nuevoEstatus,
  });
}
