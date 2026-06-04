/**
 * src/lib/avances-parser.ts
 *
 * Parser de reportes de avance de obra (WhatsApp del Arquitecto).
 *
 * 2 capas:
 *   1. Parser determinista (rapido, gratis) - busca patrones "Actividades
 *      realizadas:", "Actividades programadas:", fechas, nombre de obra.
 *   2. Claude AI fallback - cuando el determinista no resuelve la obra o
 *      no encuentra estructura clara. Recibe el subset de obras del
 *      arquitecto y elige la mas probable.
 *
 * 03-Jun-2026 - feature avances WA -> BD.
 */

export interface ObraSugerencia {
  id: string;
  codigo: string | null;
  nombre: string;
}

export interface ParseResult {
  obra_id: string | null;
  obra_nombre: string | null;
  fecha: string | null; // YYYY-MM-DD
  realizadas: string[];
  programadas: string[];
  raw_match_confidence: number; // 0..1
}

function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function tryParseFecha(text: string): string | null {
  // Acepta formatos comunes: "01 Junio 2026", "1 jun 2026", "01/06/2026", "Lunes 01 Junio 2026"
  const meses: Record<string, number> = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
    ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6,
    jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12,
  };
  const t = normalize(text);

  // dd/mm/yyyy
  let m = t.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) {
    const d = m[1].padStart(2, "0");
    const mo = m[2].padStart(2, "0");
    return `${m[3]}-${mo}-${d}`;
  }

  // dd de mes yyyy / dd mes yyyy
  m = t.match(/(\d{1,2})\s*(?:de\s+)?([a-z]{3,12})\s+(?:de\s+)?(\d{4})/);
  if (m && meses[m[2]]) {
    return `${m[3]}-${String(meses[m[2]]).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }

  return null;
}

function extractListaSeccion(text: string, header: RegExp): string[] {
  // Busca el header y captura las viñetas/lineas siguientes hasta el siguiente header o doble salto
  const headerMatch = text.match(header);
  if (!headerMatch) return [];
  const start = headerMatch.index! + headerMatch[0].length;
  const rest = text.slice(start);

  // Termina cuando encuentra otro header conocido o doble salto
  const stopAt = rest.search(
    /(actividades\s+(?:programadas|realizadas|pendientes|previstas)|fotos?:|observaciones?:|notas?:|\n\n)/i,
  );
  const block = stopAt >= 0 ? rest.slice(0, stopAt) : rest;

  return block
    .split(/\n/)
    .map((l) => l.replace(/^[\s\-*•●]+/, "").trim())
    .filter((l) => l.length > 3 && l.length < 400);
}

function matchObra(text: string, obras: ObraSugerencia[]): ObraSugerencia | null {
  const t = normalize(text);
  let best: ObraSugerencia | null = null;
  let bestScore = 0;

  for (const obra of obras) {
    const nombreNorm = normalize(obra.nombre);
    if (!nombreNorm) continue;

    let score = 0;
    if (t.includes(nombreNorm)) {
      score = 1.0; // match exacto del nombre completo
    } else {
      // match parcial: cuenta palabras del nombre que aparecen
      const palabras = nombreNorm.split(/\s+/).filter((p) => p.length > 3);
      const hits = palabras.filter((p) => t.includes(p)).length;
      score = palabras.length > 0 ? hits / palabras.length : 0;
    }

    if (score > bestScore) {
      bestScore = score;
      best = obra;
    }
  }

  return bestScore >= 0.5 ? best : null;
}

/**
 * Parser determinista. Si confidence > 0.7 no llama a Claude AI.
 */
export function parseAvanceDeterministico(
  text: string,
  obras: ObraSugerencia[],
): ParseResult {
  const realizadas = extractListaSeccion(text, /actividades\s+realizadas?\s*:/i);
  const programadas = extractListaSeccion(text, /actividades\s+programadas?\s*:/i);
  const fecha = tryParseFecha(text);
  const obra = matchObra(text, obras);

  let confidence = 0;
  if (obra) confidence += 0.4;
  if (fecha) confidence += 0.2;
  if (realizadas.length > 0) confidence += 0.2;
  if (programadas.length > 0) confidence += 0.2;

  return {
    obra_id: obra?.id || null,
    obra_nombre: obra?.nombre || null,
    fecha,
    realizadas,
    programadas,
    raw_match_confidence: confidence,
  };
}

/**
 * Claude AI parser - llamado solo si determinista confidence < 0.6.
 * Usa fetch directo (no SDK) para minimizar dependencias.
 */
export async function parseAvanceClaudeAI(
  text: string,
  obras: ObraSugerencia[],
): Promise<ParseResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const obrasList = obras.map((o) => `- ${o.codigo || ""} ${o.nombre} (id: ${o.id})`).join("\n");
  const prompt = `Estos son los reportes de avance de obra que un Arquitecto manda por WhatsApp. Tu trabajo es extraer la estructura.

Obras que maneja este Arquitecto (elige la que mejor encaja con el texto):
${obrasList}

Texto del reporte:
"""
${text}
"""

Responde SOLO con JSON valido en este formato exacto, sin nada mas:
{
  "obra_id": "<uuid de la obra elegida, o null si no se puede determinar>",
  "fecha": "<YYYY-MM-DD o null>",
  "realizadas": ["actividad 1", "actividad 2", ...],
  "programadas": ["actividad 1", ...]
}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    const raw = data.content?.[0]?.text || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as {
      obra_id?: string | null;
      fecha?: string | null;
      realizadas?: string[];
      programadas?: string[];
    };

    const obra = obras.find((o) => o.id === parsed.obra_id) || null;
    return {
      obra_id: parsed.obra_id || null,
      obra_nombre: obra?.nombre || null,
      fecha: parsed.fecha || null,
      realizadas: Array.isArray(parsed.realizadas) ? parsed.realizadas : [],
      programadas: Array.isArray(parsed.programadas) ? parsed.programadas : [],
      raw_match_confidence: 0.85,
    };
  } catch {
    return null;
  }
}

/**
 * Parser orquestado: intenta determinista primero, fallback a Claude AI.
 */
export async function parseAvance(
  text: string,
  obras: ObraSugerencia[],
): Promise<ParseResult> {
  const det = parseAvanceDeterministico(text, obras);
  if (det.raw_match_confidence >= 0.6) return det;

  const ai = await parseAvanceClaudeAI(text, obras);
  if (ai) return ai;

  return det;
}
