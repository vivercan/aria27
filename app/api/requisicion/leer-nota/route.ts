/**
 * POST /api/requisicion/leer-nota — Escanear la nota de remisión (Doménica 27 · 11-Oct-2026)
 * { requisition_id, url } → { items: [{ i, recibida }], folio_nota, proveedor, leidas }
 * La foto ya está en storage (expedientes). Claude lee la nota y la cruza con las partidas pedidas.
 * No guarda nada: solo prellena las cantidades para que la persona revise y registre.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;
const log = logger("LEER-NOTA");
const okUrl = (u: string) => /^https:\/\/[a-z0-9.-]+\.supabase\.co\/storage\/v1\/object\/public\/expedientes\//i.test(u);

export async function POST(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const rl = checkRateLimit(`u:${auth.email}`, { key: "leer-nota", max: 15, windowMs: 10 * 60_000 }); if (!rl.allowed) return rateLimitResponse(rl);
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "La lectura de notas no está configurada" }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.requisition_id || ""); const url = String(body.url || "");
  if (!id || !okUrl(url)) return NextResponse.json({ error: "Falta la foto de la nota" }, { status: 400 });
  const db = getSupabaseAdmin();
  const { data: its } = await db.from("requisition_items").select("id, product_name, unit, quantity").eq("requisition_id", id).order("id");
  const items = (its || []) as { id: number; product_name: string; unit: string; quantity: number }[];
  if (!items.length) return NextResponse.json({ error: "Esta solicitud no tiene partidas" }, { status: 400 });
  try {
    const img = await fetch(url); if (!img.ok) return NextResponse.json({ error: "No se pudo abrir la foto" }, { status: 400 });
    const tipo = img.headers.get("content-type") || "image/jpeg";
    if (!/^image\/(jpeg|png|webp|gif)$/.test(tipo)) return NextResponse.json({ error: "La nota debe ser una foto" }, { status: 400 });
    const buf = Buffer.from(await img.arrayBuffer()); if (buf.length > 8 * 1024 * 1024) return NextResponse.json({ error: "La foto pesa demasiado" }, { status: 400 });
    const lista = items.map((x, i) => `${i}. ${x.product_name} — pedido ${x.quantity} ${x.unit}`).join("\n");
    const prompt = `Es la foto de una nota de remisión / ticket de entrega de material en una obra en México.
Partidas que se pidieron (índice. producto — cantidad pedida):
${lista}
Lee la nota y di cuánto LLEGÓ de cada partida pedida (busca el producto aunque el nombre venga distinto o abreviado; convierte unidades si es obvio).
Si una partida no aparece en la nota, no la incluyas. No inventes. Si la foto no es una nota legible, items vacío.
Responde SOLO JSON: {"items":[{"i":0,"recibida":10}],"folio_nota":"texto o null","proveedor":"texto o null","legible":true}`;
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 800, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: tipo, data: buf.toString("base64") } }, { type: "text", text: prompt }] }] }) });
    const j = await r.json(); const raw = String(j?.content?.[0]?.text || ""); const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return NextResponse.json({ error: "No pude leer la nota. Toma la foto más de cerca y con luz." }, { status: 422 });
    const o = JSON.parse(m[0]) as { items?: { i?: unknown; recibida?: unknown }[]; folio_nota?: unknown; proveedor?: unknown; legible?: unknown };
    const out = (Array.isArray(o.items) ? o.items : []).map(x => ({ i: Number(x.i), recibida: Number(x.recibida) }))
      .filter(x => Number.isInteger(x.i) && x.i >= 0 && x.i < items.length && Number.isFinite(x.recibida) && x.recibida >= 0 && x.recibida < 1e6);
    if (!out.length) return NextResponse.json({ error: "No encontré en la nota lo que se pidió. Revisa que sea la nota correcta o llénalo a mano." }, { status: 422 });
    return NextResponse.json({ items: out, folio_nota: o.folio_nota ? String(o.folio_nota).slice(0, 60) : null, proveedor: o.proveedor ? String(o.proveedor).slice(0, 120) : null, leidas: out.length, total: items.length });
  } catch (e) {
    log.error("leer-nota", { error: (e as Error).message });
    return NextResponse.json({ error: "No pude leer la nota. Intenta de nuevo." }, { status: 502 });
  }
}
