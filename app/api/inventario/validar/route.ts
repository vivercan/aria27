import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const log = logger("MATERIAL_VALIDAR");

interface ProductMatch {
  id: number;
  name: string;
  unit: string;
  category: string;
  similarity?: number;
}

// ============================================================
// API: POST /api/inventario/validar
// Valida un nombre de material con IA antes de darlo de alta.
// 1. Aplica Title Case
// 2. Busca fuzzy match en catálogo existente
// 3. Valida con Claude Haiku que es material de construcción real
// ============================================================

function toTitleCase(str: string): string {
  const exceptions = ["de", "del", "la", "las", "los", "el", "en", "a", "y", "o", "por", "para", "con"];
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word, i) => {
      // Preservar medidas y números: 3/8, #220, 4", 19L
      if (/^\d|^#/.test(word)) return word;
      // Primera palabra siempre en mayúscula, excepciones en minúscula
      if (i === 0 || !exceptions.includes(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(" ");
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = a[i - 1] === b[j - 1]
        ? d[i - 1][j - 1]
        : 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]);
    }
  }
  return d[m][n];
}

export async function POST(req: Request) {
  try {
    const nextReq = new NextRequest(req);
    const rl = checkRateLimit(getClientIdentifier(nextReq), { key: "inv:validar", ...RATE_LIMITS.EXPENSIVE });
    if (!rl.allowed) return rateLimitResponse(rl);

    // FIX 541.1: identidad via cookie session
    const __auth = await requireUser(nextReq);
    const email = __auth.ok ? __auth.email : null;
    if (!email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { nombre, obraId } = await req.json().catch(() => ({}));
    if (!nombre || typeof nombre !== "string" || nombre.trim().length < 2) {
      return NextResponse.json({ error: "Nombre de material requerido (mín 2 caracteres)" }, { status: 400 });
    }

    const nombreLimpio = nombre.trim().replace(/\s+/g, " ");
    const nombreTitleCase = toTitleCase(nombreLimpio);
    const nombreLower = nombreLimpio.toLowerCase();

    const supabase = getSupabaseAdmin();

    // 1. Buscar coincidencias exactas o fuzzy en catálogo de productos
    const { data: productos } = await supabase
      .from("products")
      .select("id, name, unit, category")
      .limit(500);

    let matchExacto: ProductMatch | null = null;
    let sugerencias: ProductMatch[] = [];

    if (productos && productos.length > 0) {
      for (const p of productos) {
        const pLower = p.name.toLowerCase();
        if (pLower === nombreLower) {
          matchExacto = p;
          break;
        }
        const dist = levenshtein(nombreLower, pLower);
        const maxLen = Math.max(nombreLower.length, pLower.length);
        const similarity = 1 - dist / maxLen;
        if (similarity >= 0.6 || pLower.includes(nombreLower) || nombreLower.includes(pLower)) {
          sugerencias.push({ ...p, similarity: Math.round(similarity * 100) });
        }
      }
      sugerencias.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));
      sugerencias = sugerencias.slice(0, 5);
    }

    // 2. Buscar si ya existe en inventario de esta obra
    let existeEnObra = false;
    if (obraId) {
      const { data: inv } = await supabase
        .from("inventario_obra")
        .select("id, producto_nombre")
        .eq("obra_id", obraId)
        .ilike("producto_nombre", nombreLimpio)
        .limit(1);
      existeEnObra = (inv && inv.length > 0) || false;
    }

    // 3. Validar con Haiku que es un material de construcción real
    let esValido = true;
    let nombreCorregido = nombreTitleCase;
    let razon = "";

    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    if (ANTHROPIC_KEY) {
      try {
        const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 300,
            messages: [{
              role: "user",
              content: `Eres un validador de nombres de materiales de construcción para un ERP de una constructora en México.

El usuario quiere dar de alta este material: "${nombreLimpio}"

Responde SOLO con un JSON:
{
  "esValido": true/false,
  "nombreCorregido": "Nombre corregido en Title Case con ortografía correcta",
  "razon": "si no es válido, por qué (ej: no es material de construcción, es texto basura, etc)"
}

REGLAS:
- Es válido si es un material, herramienta, insumo o equipo usado en construcción (cemento, arena, varilla, pintura, tubería, etc)
- Title Case: cada palabra inicia con mayúscula excepto preposiciones (de, del, la, para, etc). Primera palabra siempre mayúscula.
- Corrige errores ortográficos: "cemeto" → "Cemento", "barilla" → "Varilla"
- NO es válido: texto sin sentido, nombres propios de personas, cosas que no son de construcción
- Preserva números y medidas: "3/8", "#220", "4 pulgadas"
- Si dice "saco 25kg" o similar, incluirlo: "Cemento Portland Saco 25kg"`
            }]
          })
        });
        const aiData = await aiRes.json().catch(() => ({}));
        const text = aiData.content?.[0]?.text || "{}";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          esValido = parsed.esValido !== false;
          if (parsed.nombreCorregido) nombreCorregido = parsed.nombreCorregido;
          if (parsed.razon) razon = parsed.razon;
        }
      } catch (aiErr: unknown) {
        // Si falla IA, usar Title Case manual sin bloquear
        log.error("AI validation error", { error: aiErr instanceof Error ? aiErr.message : String(aiErr) });
      }
    }

    return NextResponse.json({
      esValido,
      nombreOriginal: nombreLimpio,
      nombreCorregido,
      matchExacto: matchExacto ? { id: matchExacto.id, name: matchExacto.name, unit: matchExacto.unit } : null,
      sugerencias: sugerencias.map(s => ({ id: s.id, name: s.name, unit: s.unit, similarity: s.similarity })),
      existeEnObra,
      razon,
    });
  } catch (error: unknown) {
    log.error("Error validar material", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
