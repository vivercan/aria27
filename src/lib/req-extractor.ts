/**
 * src/lib/req-extractor.ts
 * Claude AI extractor for requisition data from WhatsApp text/images.
 * Used by: /api/requisicion/extraer  +  /api/webhook/attendance (PEDIR flow)
 */

import { logger } from "@/lib/logger";

const log = logger("REQ-EXTRACTOR");

const ANTHROPIC_API_KEY = () => process.env.ANTHROPIC_API_KEY || "";
const BASE_URL = () =>
  process.env.NEXT_PUBLIC_BASE_URL || "https://aria.jjcrm27.com";

export interface ExtractedMaterial {
  name: string;
  qty: number;
  unit: string;
  observations?: string;
}

export interface ExtractedRequisicion {
  obra: string | null;
  materiales: ExtractedMaterial[];
  prioridad: "CRITICO" | "URGENTE" | "NORMAL" | "PLANIFICADO";
  fecha_requerida: string | null; // YYYY-MM-DD
  comentarios: string;
  presupuesto_estimado: number | null;
  confianza: number; // 0-100
  advertencias: string[];
}

const PROMPT = `Eres asistente de compras de una constructora mexicana (Grupo Constructor Urbano Avante). Extrae información de requisición de materiales del mensaje del usuario.

Responde SOLO con JSON válido, sin markdown, sin texto extra:
{
  "obra": "nombre de la obra o proyecto (null si no se menciona)",
  "materiales": [
    {"name": "nombre técnico en español", "qty": número, "unit": "PZA|M2|M3|ML|KG|TON|LITRO|ROLLO|METRO|SACO|BOLSA|CAJA|SERVICIO|HORA|DIA|GALON|TRAMO|JGO", "observations": "nota breve o null"}
  ],
  "prioridad": "CRITICO|URGENTE|NORMAL|PLANIFICADO",
  "fecha_requerida": "YYYY-MM-DD o null",
  "comentarios": "cualquier nota adicional (vacío si nada relevante)",
  "presupuesto_estimado": número en pesos MXN o null,
  "confianza": número 0-100 (qué tan clara es la información),
  "advertencias": ["lista de campos ambiguos o faltantes"]
}

Reglas de prioridad:
- CRITICO = "urgente", "hoy", "ahorita", "YA", "emergencia", "lo necesito ya"
- URGENTE = "mañana", "lo antes posible", "pronto", "esta semana"
- NORMAL = sin indicación especial, o "cuando puedas"
- PLANIFICADO = "próxima semana", fecha > 7 días, "próximo mes"

Reglas generales:
- Normaliza nombres al español técnico de construcción (ej: "block" → "Block 15×20×40 cm", "varilla" → "Varilla corrugada 3/8\"")
- Si no se especifica unidad usa la más lógica (cemento → SACO, varilla → PZA, pintura → CUBETA, cable → METRO)
- Si hay montos/precios mencionados, suma como presupuesto_estimado
- confianza > 80 = datos claros, 50-80 = algunos campos inciertos, < 50 = muy ambiguo`;

export async function extractRequisicionFromText(
  text: string
): Promise<ExtractedRequisicion | null> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        messages: [
          { role: "user", content: `${PROMPT}\n\nMensaje del usuario:\n${text}` },
        ],
      }),
    });
    const result = await res.json();
    const raw = result.content?.[0]?.text || "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      log.warn("extractRequisicionFromText: no JSON in response", { raw: raw.slice(0, 200) });
      return null;
    }
    const extracted = JSON.parse(match[0]) as ExtractedRequisicion;
    log.info("Extracción texto OK", {
      confianza: extracted.confianza,
      materiales: extracted.materiales?.length,
    });
    return extracted;
  } catch (e: unknown) {
    log.error("extractRequisicionFromText failed", (e as Error).message);
    return null;
  }
}

export async function extractRequisicionFromImage(
  imageUrl: string,
  mimeType: string,
  token: string,
  caption?: string
): Promise<ExtractedRequisicion | null> {
  try {
    const imgRes = await fetch(imageUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const buf = await imgRes.arrayBuffer();
    const b64 = Buffer.from(buf).toString("base64");
    const captionCtx = caption ? `\nTexto adicional del usuario: "${caption}"` : "";

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mimeType, data: b64 },
              },
              {
                type: "text",
                text: `${PROMPT}${captionCtx}\n\nAnaliza la imagen. Puede ser: ticket físico, lista manuscrita de materiales, nota de pedido, remisión, o cualquier documento de compra/solicitud de construcción.`,
              },
            ],
          },
        ],
      }),
    });
    const result = await res.json();
    const raw = result.content?.[0]?.text || "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      log.warn("extractRequisicionFromImage: no JSON in response");
      return null;
    }
    const extracted = JSON.parse(match[0]) as ExtractedRequisicion;
    log.info("Extracción imagen OK", {
      confianza: extracted.confianza,
      materiales: extracted.materiales?.length,
    });
    return extracted;
  } catch (e: unknown) {
    log.error("extractRequisicionFromImage failed", (e as Error).message);
    return null;
  }
}

/**
 * Generates a deep-link URL to the new-requisition form pre-filled with extracted data.
 * The form page reads these params via useSearchParams() and pre-fills the fields.
 */
export function buildPrefilledUrl(extracted: ExtractedRequisicion): string {
  const params = new URLSearchParams();
  if (extracted.obra) params.set("obra", extracted.obra);
  if (extracted.prioridad) params.set("prioridad", extracted.prioridad);
  if (extracted.fecha_requerida) params.set("fecha", extracted.fecha_requerida);
  if (extracted.comentarios) params.set("comentarios", extracted.comentarios.slice(0, 200));
  if (extracted.materiales?.length > 0) {
    // Encode up to 10 materials to avoid URL length limits
    params.set("mats", JSON.stringify(extracted.materiales.slice(0, 10)));
  }
  return `${BASE_URL()}/dashboard/requisiciones/requisiciones/nuevo?${params.toString()}`;
}
