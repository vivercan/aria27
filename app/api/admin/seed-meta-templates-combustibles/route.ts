// 23-Jun-2026 — Seed batch de 5 plantillas Meta WA para Combustibles 2.0
// POST /api/admin/seed-meta-templates-combustibles (admin only)
// Devuelve resultado por plantilla (CREATED / EXISTS / ERROR)

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-api";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const META_TOKEN = process.env.META_ACCESS_TOKEN || "";
const WABA_ID = process.env.META_WABA_ID || "842930185269415";

const TEMPLATES = [
  {
    name: "aria_comb_solicitud_recibida",
    language: "es_MX",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "Tu solicitud de combustible quedó registrada.\n\nFolio: *{{1}}*\nTipo: {{2}}\nLitros: {{3}}\nUnidad: {{4}}\nObra: {{5}}\n\nTe avisamos cuando se autorice el depósito.",
        example: { body_text: [["COMB-2026-0001", "DIESEL", "1200", "Retro JCB", "PERIODISTAS"]] },
      },
    ],
  },
  {
    name: "aria_comb_consolidado_jessica",
    language: "es_MX",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "Hola Jessica, hay *{{1}} solicitudes* de combustible pendientes hoy:\n\nGasolina: {{2}} L\nDiésel: {{3}} L\nEstimado: ${{4}} MXN\n\nAbre /dashboard/combustibles/consolidados para generar el consolidado y enviarlo a Dirección.",
        example: { body_text: [["5", "800", "3200", "100,000"]] },
      },
    ],
  },
  {
    name: "aria_comb_para_autorizar",
    language: "es_MX",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "*Consolidado {{1}}* requiere tu autorización:\n\n{{2}} solicitudes · {{3}} L total · ${{4}} MXN estimado.\n\nSi autorizas, transfiere a Caja Compras BBVA.",
        example: { body_text: [["CONS-2026-0001", "5", "4000", "100,000"]] },
      },
      {
        type: "BUTTONS",
        buttons: [
          { type: "QUICK_REPLY", text: "✅ Autorizar" },
          { type: "QUICK_REPLY", text: "❌ Rechazar" },
        ],
      },
    ],
  },
  {
    name: "aria_comb_transferir_a_compras",
    language: "es_MX",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "Confirmaste autorización del consolidado *{{1}}* por ${{2}} MXN.\n\nPor favor transfiere a:\n*Caja Compras Combustibles*\nBanco: BBVA\nCuenta: XXX-XXXX-XXXX\n\nCuando hayas transferido, responde *TRANSFERIDO {{1}}* y registramos la conciliación.",
        example: { body_text: [["CONS-2026-0001", "100,000"]] },
      },
    ],
  },
  {
    name: "aria_comb_subir_factura",
    language: "es_MX",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "Hola {{1}}, ya se depositó el combustible de tu solicitud *{{2}}*.\n\nCuando cargues, envía:\n1. Foto del odómetro/horómetro post-carga\n2. Foto del ticket/factura\n\nSolo responde con las fotos a este chat.",
        example: { body_text: [["HERIBERTO", "COMB-2026-0001"]] },
      },
    ],
  },
];

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  if (!META_TOKEN) {
    return NextResponse.json(
      { ok: false, error: "META_ACCESS_TOKEN no configurado en env" },
      { status: 500 }
    );
  }

  const results: Array<{ name: string; status: string; detail?: unknown }> = [];

  for (const tmpl of TEMPLATES) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v22.0/${WABA_ID}/message_templates`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${META_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(tmpl),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        results.push({ name: tmpl.name, status: "CREATED", detail: data });
      } else if (
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof (data as { error?: { message?: string } }).error?.message === "string" &&
        (data as { error: { message: string } }).error.message.includes("already exists")
      ) {
        results.push({ name: tmpl.name, status: "EXISTS" });
      } else {
        results.push({ name: tmpl.name, status: "ERROR", detail: data });
      }
    } catch (e) {
      results.push({ name: tmpl.name, status: "EXCEPTION", detail: String(e) });
    }
  }

  return NextResponse.json({ ok: true, results });
}
