/**
 * POST /api/requisicion/extraer
 * Claude-powered extraction of requisition data from text or WhatsApp image URL.
 * Also runs duplicate detection against last 48h.
 *
 * Body: { texto?: string, imageUrl?: string, mimeType?: string }
 * Returns: { extracted: ExtractedRequisicion, duplicado: {...} | null, ok: true }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import {
  extractRequisicionFromText,
  extractRequisicionFromImage,
} from "@/lib/req-extractor";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("REQ-EXTRAER");
const db = getSupabaseAdmin();

// ─── Duplicate detection ────────────────────────────────────────────────────
// Detects if a similar requisition was created in the last 48h for the same obra.
// Similarity = same obra + at least one material name prefix match (first 5 chars).

interface DuplicateInfo {
  folio: string;
  status: string;
  created_at: string;
  obra: string;
  material_coincidente: string;
}

async function checkDuplicates(
  obra: string,
  primerMaterial: string
): Promise<DuplicateInfo | null> {
  try {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: recent } = await db
      .from("requisitions")
      .select("id, folio, cost_center_name, created_at, status")
      .ilike("cost_center_name", `%${obra.substring(0, 8)}%`)
      .gte("created_at", cutoff)
      .not("status", "in", '("RECHAZADA","RECHAZADA_DIRECCION")')
      .order("created_at", { ascending: false })
      .limit(15);

    if (!recent?.length) return null;

    const matPrefix = primerMaterial.trim().toLowerCase().substring(0, 5);

    for (const req of recent) {
      const { data: items } = await db
        .from("requisition_items")
        .select("product_name")
        .eq("requisition_id", req.id)
        .ilike("product_name", `%${matPrefix}%`)
        .limit(1);

      if (items?.length) {
        return {
          folio: req.folio,
          status: req.status,
          created_at: req.created_at,
          obra: req.cost_center_name,
          material_coincidente: items[0].product_name,
        };
      }
    }
    return null;
  } catch (e: unknown) {
    log.warn("checkDuplicates failed silently", (e as Error).message);
    return null;
  }
}

// ─── Handler ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(getClientIdentifier(req), {
    key: "req:extraer",
    ...RATE_LIMITS.EXPENSIVE,
  });
  if (!rl.allowed) return rateLimitResponse(rl);

  // FIX 541.1: identidad via cookie session
  const __auth = await requireUser(req);
  const email = __auth.ok ? __auth.email : null;
  if (!email)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const { texto, imageUrl, mimeType } = body as {
      texto?: string;
      imageUrl?: string;
      mimeType?: string;
    };

    if (!texto && !imageUrl) {
      return NextResponse.json(
        { error: "Proporciona texto o imageUrl" },
        { status: 400 }
      );
    }

    let extracted = null;

    if (imageUrl && mimeType) {
      const token = process.env.WHATSAPP_ACCESS_TOKEN || "";
      extracted = await extractRequisicionFromImage(
        imageUrl,
        mimeType,
        token,
        texto
      );
    } else if (texto) {
      extracted = await extractRequisicionFromText(texto);
    }

    if (!extracted) {
      return NextResponse.json(
        {
          error:
            "No se pudo extraer información. Sé más específico sobre los materiales y la obra.",
        },
        { status: 422 }
      );
    }

    // Duplicate check
    let duplicado: DuplicateInfo | null = null;
    if (extracted.obra && extracted.materiales?.length > 0) {
      duplicado = await checkDuplicates(
        extracted.obra,
        extracted.materiales[0].name
      );
    }

    return NextResponse.json({ extracted, duplicado, ok: true });
  } catch (e: unknown) {
    log.error("Error en extraer:", (e as Error).message);
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
