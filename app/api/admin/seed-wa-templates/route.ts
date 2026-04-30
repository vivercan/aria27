import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const log = logger("SEED-WA-TEMPLATES");
const WABA_ID = process.env.WHATSAPP_WABA_ID || "842930185269415";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";
const GRAPH_VERSION = "v22.0";

interface ComponentBody { type: "BODY"; text: string; example?: { body_text: string[][] }; }
interface ComponentFooter { type: "FOOTER"; text: string; }
interface Template {
  name: string;
  language: "es_MX";
  category: "UTILITY";
  components: Array<ComponentBody | ComponentFooter>;
}

function tpl(name: string, body: string, examples: string[]): Template {
  return {
    name,
    language: "es_MX",
    category: "UTILITY",
    components: [
      { type: "BODY", text: body, example: { body_text: [examples] } },
      { type: "FOOTER", text: "ARIA27 - Grupo Avante" },
    ],
  };
}

const TEMPLATES: Template[] = [
  tpl("aria_tarea_asignada", "Hola {{1}}, se te asigno una nueva tarea en ARIA27. Tarea: {{2}}. Fecha compromiso: {{3}}. Obra: {{4}}. Responde con OK para iniciar, AVANCE 50 para porcentaje, LISTO para terminar o BLOQUEADO motivo.", ["Samuel", "Revisar avance cimentacion", "28-abr-2026", "JUAN DIEGO"]),
  tpl("aria_tarea_iniciada", "Registrado: {{1}} iniciada al {{2}} por ciento. Avisame cuando lleves mas avance respondiendo AVANCE 50, LISTO o BLOQUEADO motivo.", ["Revisar avance cimentacion", "25"]),
  tpl("aria_tarea_avance", "Registrado: {{1}} en {{2}} por ciento. Sigues en progreso. Cuando termines, responde LISTO.", ["Revisar avance cimentacion", "50"]),
  tpl("aria_tarea_completada", "Excelente {{1}}, tarea {{2}} completada al 100 por ciento. Gracias por tu trabajo. Tu jefe ya fue notificado.", ["Samuel", "Revisar avance cimentacion"]),
  tpl("aria_tarea_bloqueada", "Registrado bloqueo en {{1}}. Motivo: {{2}}. Notifique a tu jefe para que te apoye lo antes posible.", ["Revisar avance cimentacion", "se rompio la varilla"]),
  tpl("aria_aviso_iniciada", "Aviso ARIA27: {{1}} comenzo la tarea. Tarea: {{2}}. Obra: {{3}}. Avance: {{4}} por ciento.", ["Samuel Rodarte", "Revisar avance cimentacion", "JUAN DIEGO", "25"]),
  tpl("aria_aviso_completada", "Aviso ARIA27: {{1}} termino la tarea. Tarea: {{2}}. Obra: {{3}}. La tarea ya esta cerrada en el sistema.", ["Samuel Rodarte", "Revisar avance cimentacion", "JUAN DIEGO"]),
  tpl("aria_aviso_bloqueada", "Aviso ARIA27: {{1}} reporta bloqueo en una tarea. Tarea: {{2}}. Obra: {{3}}. Motivo: {{4}}. Contacta al responsable para destrabar.", ["Samuel Rodarte", "Revisar avance cimentacion", "JUAN DIEGO", "se rompio la varilla"]),
  tpl("aria_aviso_ayuda", "Aviso ARIA27: {{1}} solicita ayuda en una tarea. Tarea: {{2}}. Obra: {{3}}. Avance: {{4}} por ciento. Contactalo lo antes posible.", ["Samuel Rodarte", "Revisar avance cimentacion", "JUAN DIEGO", "25"]),
  tpl("aria_tarea_status", "Hola {{1}}, tienes {{2}} tareas pendientes. {{3}}. Responde con 1 LISTO o AVANCE 50 para actualizar.", ["Samuel", "2", "1. Revisar cimentacion 28-abr. 2. Inspeccionar acero 30-abr"]),
  tpl("aria_requisicion_gasto", "Nueva requisicion de GASTO por pagar. Folio: {{1}}. Obra: {{2}}. Tipo: {{3}}. Concepto: {{4}}. Ingresa al sistema para registrar el pago.", ["REQ-2026-00010", "OFICINA", "GASTOS ADMINISTRATIVOS", "Pago renta mensual"]),
  tpl("aria_requisicion_cotizar", "Nueva requisicion para cotizar. Folio: {{1}}. Obra: {{2}}. Urgencia: {{3}}. Materiales: {{4}}. Ingresa al sistema para cotizar.", ["REQ-2026-00010", "MIRAVALLE", "MANANA", "Cemento Portland 50kg, Varilla 3/8 (10 productos)"]),
];

export async function POST(req: NextRequest) {
  // PR 30-Abr-2026: aceptar tambien auth via x-user-email admin (mas conveniente para invocar)
  const adminEmail = (req.headers.get("x-user-email") || "").toLowerCase().trim();
  const ADMIN_LIST = (process.env.ADMIN_EMAIL || "juanviverosv@gmail.com").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
  ADMIN_LIST.push("recursos.humanos@gcuavante.com");
  const isAdmin = ADMIN_LIST.includes(adminEmail);
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || "";
  const expected = process.env.SEED_WA_TEMPLATES_TOKEN || "";
  const tokenOk = expected && token === expected;
  if (!tokenOk && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ACCESS_TOKEN) {
    return NextResponse.json({ error: "WHATSAPP_ACCESS_TOKEN missing" }, { status: 500 });
  }

  // PR 30-Abr: filtrar por nombre via ?only=name1,name2 para no timeout
  const onlyParam = searchParams.get("only") || "";
  const onlyList = onlyParam.split(",").map(s => s.trim()).filter(Boolean);

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${WABA_ID}/message_templates`;
  const results: Array<Record<string, unknown>> = [];

  const TEMPLATES_TO_RUN = onlyList.length > 0 ? TEMPLATES.filter(t => onlyList.includes(t.name)) : TEMPLATES;
  for (const t of TEMPLATES_TO_RUN) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify(t),
      });
      const data = await r.json();
      if (r.ok) {
        results.push({ name: t.name, ok: true, status: data.status, id: data.id });
        log.info(`[SEED] ${t.name} OK status=${data.status} id=${data.id}`);
      } else {
        results.push({
          name: t.name,
          ok: false,
          error: data?.error?.message,
          error_user_msg: data?.error?.error_user_msg,
          error_subcode: data?.error?.error_subcode,
        });
      }
    } catch (e: unknown) {
      results.push({ name: t.name, ok: false, error: (e as Error).message });
    }
  }

  const ok = results.filter((r) => r.ok).length;
  return NextResponse.json({ waba_id: WABA_ID, total: TEMPLATES.length, creados: ok, fallidos: TEMPLATES.length - ok, results });
}