/**
 * GET /api/admin/wa-templates-check?k=
 *   - Lista todos los templates aria_* con su status
 *   - Filtra opcionalmente por name
 *
 * POST /api/admin/wa-templates-check?k=
 *   - Crea el template aria_requisicion_combustible si no existe
 *
 * 04-Jun-2026
 */
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WABA_ID = "842930185269415";
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || "";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("k") !== "aria27-debug-2026") {
    return NextResponse.json({ error: "nope" }, { status: 403 });
  }
  if (!TOKEN) return NextResponse.json({ error: "no WHATSAPP_ACCESS_TOKEN" }, { status: 500 });

  const r = await fetch(`https://graph.facebook.com/v22.0/${WABA_ID}/message_templates?limit=100`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const d = await r.json();
  const aria = (d.data || []).filter((t: { name: string }) => t.name.startsWith("aria_"));
  return NextResponse.json({ total_aria: aria.length, templates: aria });
}

export async function POST(req: NextRequest) {
  if (req.nextUrl.searchParams.get("k") !== "aria27-debug-2026") {
    return NextResponse.json({ error: "nope" }, { status: 403 });
  }
  if (!TOKEN) return NextResponse.json({ error: "no WHATSAPP_ACCESS_TOKEN" }, { status: 500 });

  const body = {
    name: "aria_requisicion_combustible",
    language: "es_MX",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "Nueva requisicion de combustible.\n\nFolio: {{1}}\nObra: {{2}}\nMaquinas: {{3}}\nLitros totales: {{4}}\nTotal estimado: ${{5}}\n\nRevisa el detalle con fotos de horometro en /dashboard/requisiciones/requisiciones/estatus",
        example: {
          body_text: [["REQ-2026-00077", "PERIODISTAS", "Retro CAT, Camion Volteo", "120", "3,120.00"]],
        },
      },
    ],
  };

  const r = await fetch(`https://graph.facebook.com/v22.0/${WABA_ID}/message_templates`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  return NextResponse.json(d);
}
