/**
 * POST /api/voz — nota de voz → actividad o pedido de material (Doménica 27 · 11-Oct-2026)
 * 1) Whisper transcribe (español)  2) Claude entiende qué es y llena los campos  3) el usuario confirma en la pantalla normal.
 * No crea nada por sí sola: siempre se revisa antes de enviar.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { extractRequisicionFromText } from "@/lib/req-extractor";
import { suenaAMaterial, type VozResultado } from "@/lib/voz";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;
const log = logger("VOZ");

async function transcribir(audio: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", audio, audio.name || "nota.webm"); fd.append("model", "whisper-1"); fd.append("language", "es");
  fd.append("prompt", "Obra de construcción en México: cimbra, colado, varilla, block, cemento, residente, destajista, requisición.");
  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: { message?: string } }).error?.message || `Whisper ${r.status}`);
  return String((j as { text?: string }).text || "").trim();
}

async function entenderActividad(texto: string, hoy: string, obras: string[], personas: string[]) {
  const prompt = `Eres asistente de una constructora mexicana. Del dictado, arma UNA actividad. Hoy es ${hoy} (zona México).
Obras: ${obras.slice(0, 80).join(" | ")}
Personas: ${personas.slice(0, 120).join(" | ")}
Responde SOLO JSON: {"titulo":"verbo + qué, máximo 80 caracteres","descripcion":"detalle útil o null","persona":"nombre EXACTO de la lista de Personas o null","obra":"nombre EXACTO de la lista de Obras o null","fecha":"YYYY-MM-DD de entrega o null (mañana, viernes, etc. calculados desde hoy)","prioridad":"URGENTE|ALTA|MEDIA|BAJA","pasos":["pasos cortos si los dijo"]}
Dictado: """${texto}"""`;
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 600, messages: [{ role: "user", content: prompt }] }) });
  const j = await r.json(); const raw = String(j?.content?.[0]?.text || ""); const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  const o = JSON.parse(m[0]) as Record<string, unknown>;
  return { titulo: String(o.titulo || texto).slice(0, 200), descripcion: o.descripcion ? String(o.descripcion).slice(0, 1000) : null, persona: o.persona ? String(o.persona) : null, obra: o.obra ? String(o.obra) : null,
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(String(o.fecha || "")) ? String(o.fecha) : null, prioridad: ["URGENTE", "ALTA", "MEDIA", "BAJA"].includes(String(o.prioridad)) ? String(o.prioridad) : "MEDIA",
    pasos: Array.isArray(o.pasos) ? (o.pasos as unknown[]).map(String).filter(Boolean).slice(0, 10) : [] };
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const rl = checkRateLimit(`u:${auth.email}`, { key: "voz", max: 20, windowMs: 10 * 60_000 }); if (!rl.allowed) return rateLimitResponse(rl);
  if (!process.env.OPENAI_API_KEY || !process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "La voz no está configurada" }, { status: 503 });
  const fd = await req.formData().catch(() => null);
  const audio = fd?.get("audio");
  if (!(audio instanceof File) || audio.size < 1000) return NextResponse.json({ error: "No se escuchó nada. Mantén presionado y habla." }, { status: 400 });
  if (audio.size > 12 * 1024 * 1024) return NextResponse.json({ error: "La nota es muy larga (máximo 2 minutos)" }, { status: 400 });
  const forzar = String(fd?.get("tipo") || "");
  try {
    const texto = await transcribir(audio);
    if (!texto) return NextResponse.json({ error: "No se entendió. Intenta de nuevo con menos ruido." }, { status: 422 });
    const hoy = new Date(Date.now() - 6 * 3600 * 1000).toISOString().slice(0, 10);
    const esMaterial = forzar ? forzar === "material" : suenaAMaterial(texto);
    if (esMaterial) {
      const m = await extractRequisicionFromText(`${texto}\n(Hoy es ${hoy})`);
      if (m && m.materiales?.length) {
        const out: VozResultado = { texto, tipo: "material", material: { obra: m.obra, fecha_requerida: m.fecha_requerida, prioridad: m.prioridad, comentarios: m.comentarios || texto, materiales: m.materiales } };
        return NextResponse.json(out);
      }
    }
    const db = getSupabaseAdmin();
    const [{ data: o }, { data: e }] = await Promise.all([
      db.from("centros_trabajo").select("nombre").eq("activo", true),
      db.from("employees").select("full_name").eq("status", "ACTIVO"),
    ]);
    const act = await entenderActividad(texto, hoy, ((o || []) as { nombre: string }[]).map(x => x.nombre), ((e || []) as { full_name: string }[]).map(x => x.full_name));
    const out: VozResultado = { texto, tipo: "actividad", actividad: act || { titulo: texto.slice(0, 200) } };
    return NextResponse.json(out);
  } catch (err) {
    log.error("voz", { error: (err as Error).message });
    return NextResponse.json({ error: "No se pudo procesar la nota. Intenta de nuevo." }, { status: 502 });
  }
}
