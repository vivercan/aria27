import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

const log = logger("EXPEDIENTES-ANALIZAR");
const supabase = getSupabaseAdmin();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export const runtime = "nodejs";
export const maxDuration = 60;

type Archivo = {
  id: string;
  nombre: string;
  tipo: string | null;
  url: string;
  tamano_bytes: number | null;
};

const PROMPT = `Analiza este documento y responde EXCLUSIVAMENTE con un JSON válido (sin markdown, sin texto extra) con esta forma exacta:
{"paginas": <number|null>, "resumen": "<string de máximo 3 líneas describiendo qué es el documento y sobre qué trata>"}

Reglas:
- Si no puedes contar páginas con certeza, usa null.
- El resumen debe ser en español, conciso, no más de 3 líneas (~240 caracteres).
- No inventes contenido que no esté en el documento.`;

function parseJsonResponse(text: string): { paginas: number | null; resumen: string } {
  // Claude a veces rodea con ```json ... ```
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const obj = JSON.parse(cleaned);
  return {
    paginas: typeof obj.paginas === "number" ? obj.paginas : null,
    resumen: String(obj.resumen || "").slice(0, 500),
  };
}

export async function POST(req: NextRequest) {
  try {
    const { archivoId } = await req.json();
    if (!archivoId) {
      return NextResponse.json({ error: "archivoId requerido" }, { status: 400 });
    }

    // 1. Leer row del archivo
    const { data: archivo, error: errRead } = await supabase
      .from("expedientes_archivos")
      .select("id, nombre, tipo, url, tamano_bytes")
      .eq("id", archivoId)
      .maybeSingle();

    if (errRead || !archivo) {
      log.error("archivo no encontrado", { archivoId, err: errRead?.message });
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    const a = archivo as Archivo;
    const tipo = (a.tipo || "").toLowerCase();
    const nombre = a.nombre || "";
    const ext = nombre.split(".").pop()?.toLowerCase() || "";

    const isPdf = tipo.includes("pdf") || ext === "pdf";
    const isImage = tipo.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].includes(ext);
    const isText = tipo.startsWith("text/") || ["txt", "md", "csv"].includes(ext);

    // Marcar que estamos analizando (evita polling duplicado)
    await supabase
      .from("expedientes_archivos")
      .update({ analizado_at: new Date().toISOString() })
      .eq("id", a.id);

    let resumen: string | null = null;
    let paginas: number | null = null;

    if (isPdf) {
      // Descargar PDF y enviarlo como base64
      const pdfRes = await fetch(a.url);
      if (!pdfRes.ok) {
        await supabase.from("expedientes_archivos").update({
          resumen: "(No se pudo descargar el archivo para análisis)",
        }).eq("id", a.id);
        return NextResponse.json({ ok: false, reason: "download-failed" });
      }
      const buf = Buffer.from(await pdfRes.arrayBuffer());
      const b64 = buf.toString("base64");

      const msg = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
            { type: "text", text: PROMPT },
          ],
        }],
      });
      const textBlock = msg.content.find((c: any) => c.type === "text") as any;
      const parsed = parseJsonResponse(textBlock?.text || "{}");
      resumen = parsed.resumen;
      paginas = parsed.paginas;
    } else if (isImage) {
      const imgRes = await fetch(a.url);
      if (!imgRes.ok) {
        await supabase.from("expedientes_archivos").update({
          resumen: "(No se pudo descargar la imagen para análisis)",
        }).eq("id", a.id);
        return NextResponse.json({ ok: false, reason: "download-failed" });
      }
      const buf = Buffer.from(await imgRes.arrayBuffer());
      const b64 = buf.toString("base64");
      const mediaType = tipo.startsWith("image/") ? tipo : `image/${ext === "jpg" ? "jpeg" : ext}`;

      const msg = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType as any, data: b64 } },
            { type: "text", text: PROMPT },
          ],
        }],
      });
      const textBlock = msg.content.find((c: any) => c.type === "text") as any;
      const parsed = parseJsonResponse(textBlock?.text || "{}");
      resumen = parsed.resumen;
      paginas = 1;
    } else if (isText) {
      const txtRes = await fetch(a.url);
      const texto = (await txtRes.text()).slice(0, 50000);

      const msg = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [{
          role: "user",
          content: [{ type: "text", text: `${PROMPT}\n\nContenido del archivo (${nombre}):\n\n${texto}` }],
        }],
      });
      const textBlock = msg.content.find((c: any) => c.type === "text") as any;
      const parsed = parseJsonResponse(textBlock?.text || "{}");
      resumen = parsed.resumen;
      paginas = Math.max(1, Math.ceil(texto.length / 3000));
    } else {
      // Tipo no soportado
      resumen = `Archivo ${ext.toUpperCase() || "desconocido"} — análisis automático no disponible para este formato.`;
      paginas = null;
    }

    // UPDATE con resultados
    const { error: errUpd } = await supabase
      .from("expedientes_archivos")
      .update({
        resumen,
        paginas,
        analizado_at: new Date().toISOString(),
      })
      .eq("id", a.id);

    if (errUpd) {
      log.error("update failed", { err: errUpd.message });
      return NextResponse.json({ error: errUpd.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, resumen, paginas });
  } catch (e: any) {
    log.error("analizar error", { err: e?.message, stack: e?.stack?.slice(0, 300) });
    // Intentar marcar el archivo con error leve
    try {
      const { archivoId } = await req.json().catch(() => ({}));
      if (archivoId) {
        await supabase
          .from("expedientes_archivos")
          .update({ resumen: "(Error al analizar — reintenta después)", analizado_at: new Date().toISOString() })
          .eq("id", archivoId);
      }
    } catch {}
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}
