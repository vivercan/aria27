/**
 * /api/admin/seed-wa-templates
 *
 * 26-Abr-2026 (JJ): Crea todos los templates de WhatsApp para el flujo
 * de tareas en Meta Graph API en una sola corrida. Quedan en estado
 * PENDING (Meta tarda 24-48h en aprobar).
 *
 * Auth: requiere SEED_WA_TEMPLATES_TOKEN en query (?token=X) que se
 * compara con env var del mismo nombre. Esto evita que cualquiera
 * dispare creacion masiva de templates.
 *
 * POST https://aria.jjcrm27.com/api/admin/seed-wa-templates?token=XXXX
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const log = logger("SEED-WA-TEMPLATES");

const WABA_ID = process.env.WHATSAPP_WABA_ID || "842930185269415";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";
const GRAPH_VERSION = "v22.0";

interface TemplateBody {
  type: "BODY";
  text: string;
  example?: { body_text?: string[][] };
}

interface TemplateHeader {
  type: "HEADER";
  format: "TEXT";
  text: string;
}

interface TemplateFooter {
  type: "FOOTER";
  text: string;
}

interface Template {
  name: string;
  language: "es_MX" | "es";
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
  components: Array<TemplateBody | TemplateHeader | TemplateFooter>;
}

const TEMPLATES: Template[] = [
  // 1. Tarea asignada al empleado
  {
    name: "tarea_asignada_empleado",
    language: "es_MX",
    category: "UTILITY",
    components: [
      { type: "HEADER", format: "TEXT", text: "Nueva tarea asignada" },
      {
        type: "BODY",
        text:
          "Hola {{1}}, se te asignó una nueva tarea en ARIA27.\n\n*{{2}}*\n\n📅 Compromiso: {{3}}\n🏗️ Obra: {{4}}\n\nResponde con: *OK* (iniciar), *AVANCE 50* (avance %), *LISTO* (terminar) o *BLOQUEADO motivo*.",
        example: {
          body_text: [
            ["Samuel", "Revisar avance cimentacion", "28-abr-2026", "JUAN DIEGO"],
          ],
        },
      },
      { type: "FOOTER", text: "ARIA27 — Grupo Avante" },
    ],
  },
  // 2. Confirmación al empleado: tarea iniciada
  {
    name: "tarea_iniciada_empleado",
    language: "es_MX",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text:
          "🚀 Registrado: *{{1}}* iniciada al {{2}}%.\n\nAvísame cuando lleves más avance respondiendo *AVANCE 50*, *LISTO* o *BLOQUEADO motivo*.",
        example: { body_text: [["Revisar avance cimentacion", "25"]] },
      },
      { type: "FOOTER", text: "ARIA27 — Grupo Avante" },
    ],
  },
  // 3. Confirmación al empleado: avance %
  {
    name: "tarea_avance_empleado",
    language: "es_MX",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text:
          "📊 Registrado: *{{1}}* en *{{2}}%*.\n\nSigues en progreso. Cuando termines, responde *LISTO*.",
        example: { body_text: [["Revisar avance cimentacion", "50"]] },
      },
      { type: "FOOTER", text: "ARIA27 — Grupo Avante" },
    ],
  },
  // 4. Confirmación al empleado: tarea completada
  {
    name: "tarea_completada_empleado",
    language: "es_MX",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text:
          "✅ ¡Excelente {{1}}! Tarea *{{2}}* completada al 100%.\n\nGracias por tu trabajo. Tu jefe ya fue notificado.",
        example: { body_text: [["Samuel", "Revisar avance cimentacion"]] },
      },
      { type: "FOOTER", text: "ARIA27 — Grupo Avante" },
    ],
  },
  // 5. Confirmación al empleado: tarea bloqueada
  {
    name: "tarea_bloqueada_empleado",
    language: "es_MX",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text:
          "⚠️ Registrado bloqueo en *{{1}}*.\nMotivo: {{2}}\n\nNotifiqué a tu jefe para que te apoye lo antes posible.",
        example: {
          body_text: [
            ["Revisar avance cimentacion", "se rompió la varilla"],
          ],
        },
      },
      { type: "FOOTER", text: "ARIA27 — Grupo Avante" },
    ],
  },
  // 6. Notificación al asignador: tarea iniciada
  {
    name: "tarea_iniciada_asignador",
    language: "es_MX",
    category: "UTILITY",
    components: [
      { type: "HEADER", format: "TEXT", text: "Tarea iniciada" },
      {
        type: "BODY",
        text:
          "🔔 *{{1}}* comenzó la tarea:\n\n📋 {{2}}\n🏗️ {{3}}\n📊 Avance {{4}}%",
        example: {
          body_text: [
            ["Samuel Rodarte", "Revisar avance cimentacion", "JUAN DIEGO", "25"],
          ],
        },
      },
      { type: "FOOTER", text: "ARIA27 — Grupo Avante" },
    ],
  },
  // 7. Notificación al asignador: tarea completada
  {
    name: "tarea_completada_asignador",
    language: "es_MX",
    category: "UTILITY",
    components: [
      { type: "HEADER", format: "TEXT", text: "Tarea completada" },
      {
        type: "BODY",
        text:
          "✅ *{{1}}* terminó la tarea:\n\n📋 {{2}}\n🏗️ {{3}}\n\nLa requisición/tarea ya está cerrada en el sistema.",
        example: {
          body_text: [
            ["Samuel Rodarte", "Revisar avance cimentacion", "JUAN DIEGO"],
          ],
        },
      },
      { type: "FOOTER", text: "ARIA27 — Grupo Avante" },
    ],
  },
  // 8. Notificación al asignador: tarea bloqueada
  {
    name: "tarea_bloqueada_asignador",
    language: "es_MX",
    category: "UTILITY",
    components: [
      { type: "HEADER", format: "TEXT", text: "Tarea bloqueada" },
      {
        type: "BODY",
        text:
          "⚠️ *{{1}}* reporta bloqueo:\n\n📋 {{2}}\n🏗️ {{3}}\n\n*Motivo:* {{4}}\n\nContacta al responsable para destrabar.",
        example: {
          body_text: [
            [
              "Samuel Rodarte",
              "Revisar avance cimentacion",
              "JUAN DIEGO",
              "se rompio la varilla",
            ],
          ],
        },
      },
      { type: "FOOTER", text: "ARIA27 — Grupo Avante" },
    ],
  },
  // 9. Notificación al asignador: pedido de ayuda
  {
    name: "tarea_ayuda_asignador",
    language: "es_MX",
    category: "UTILITY",
    components: [
      { type: "HEADER", format: "TEXT", text: "Pedido de ayuda" },
      {
        type: "BODY",
        text:
          "🆘 *{{1}}* solicita ayuda en la tarea:\n\n📋 {{2}}\n🏗️ {{3}}\n📊 Avance {{4}}%\n\nContáctalo lo antes posible.",
        example: {
          body_text: [
            ["Samuel Rodarte", "Revisar avance cimentacion", "JUAN DIEGO", "25"],
          ],
        },
      },
      { type: "FOOTER", text: "ARIA27 — Grupo Avante" },
    ],
  },
  // 10. Status: lista de tareas pendientes (genérico, max 5 lineas)
  {
    name: "tarea_status_empleado",
    language: "es_MX",
    category: "UTILITY",
    components: [
      { type: "HEADER", format: "TEXT", text: "Tus tareas pendientes" },
      {
        type: "BODY",
        text:
          "Hola {{1}}, tienes {{2}} tareas pendientes:\n\n{{3}}\n\nResponde con *1 LISTO* o *AVANCE 50* para actualizar.",
        example: {
          body_text: [
            [
              "Samuel",
              "2",
              "1. Revisar avance cimentacion (28-abr)\n2. Inspeccionar acero columnas (30-abr)",
            ],
          ],
        },
      },
      { type: "FOOTER", text: "ARIA27 — Grupo Avante" },
    ],
  },
];

export async function POST(req: NextRequest) {
  // Auth simple: token en query
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || "";
  const expected = process.env.SEED_WA_TEMPLATES_TOKEN || "";
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ACCESS_TOKEN) {
    return NextResponse.json({ error: "WHATSAPP_ACCESS_TOKEN missing" }, { status: 500 });
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${WABA_ID}/message_templates`;
  const results: Array<{ name: string; ok: boolean; status?: string; id?: string; error?: string }> = [];

  for (const tpl of TEMPLATES) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tpl),
      });
      const data = await res.json();
      if (res.ok) {
        results.push({ name: tpl.name, ok: true, status: data.status, id: data.id });
        log.info(`[SEED] ${tpl.name} OK status=${data.status} id=${data.id}`);
      } else {
        const errMsg = data?.error?.message || data?.error?.error_user_msg || JSON.stringify(data?.error || data);
        results.push({ name: tpl.name, ok: false, error: errMsg });
        log.warn(`[SEED] ${tpl.name} FALLO: ${errMsg}`);
      }
    } catch (e: unknown) {
      results.push({ name: tpl.name, ok: false, error: (e as Error).message });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  return NextResponse.json({
    waba_id: WABA_ID,
    total: TEMPLATES.length,
    creados: okCount,
    fallidos: TEMPLATES.length - okCount,
    results,
  });
}
