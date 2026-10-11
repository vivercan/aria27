/**
 * POST /api/obras/[id]/bitacora/resumen — la IA redacta el resumen del día para el cliente o Dirección (Doménica 27 · 11-Oct-2026)
 * Solo usa lo que está en la bitácora (no inventa); se guarda para compartirlo.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { armarBitacora, hayAlgo } from "@/lib/bitacora-dia";
import { hoyMX } from "@/lib/plantillas";

export const maxDuration = 60;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const rl = checkRateLimit(`u:${auth.email}`, { key: "bitacora-ia", max: 20, windowMs: 10 * 60_000 }); if (!rl.allowed) return rateLimitResponse(rl);
  const { id } = await ctx.params; const b = await req.json().catch(() => ({})) as { fecha?: string };
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(b.fecha || "")) ? String(b.fecha) : hoyMX();
  const db = getSupabaseAdmin();
  const bit = await armarBitacora(db, id, fecha);
  if (!bit) return NextResponse.json({ error: "Obra no encontrada" }, { status: 404 });
  if (!hayAlgo(bit)) return NextResponse.json({ error: "Todavía no hay nada registrado ese día" }, { status: 400 });
  const datos = { obra: bit.obra.nombre, fecha, clima: bit.registro?.clima, personal: bit.registro?.personal_en_obra, maquinaria: bit.registro?.maquinaria, incidentes: bit.registro?.incidentes, notas: bit.registro?.observaciones,
    terminadas: bit.terminadas.map(t => t.titulo), avances: bit.avances.map(a => `${a.titulo}: ${a.texto || ""}`), fotos: bit.fotos.length, entregas: bit.entregas.map(e => e.proveedor), solicitudes: bit.solicitudes.map(s => s.folio) };
  const prompt = `Eres residente de obra de una constructora mexicana. Redacta el resumen del día para el cliente en español claro y profesional, 4 a 7 renglones, sin viñetas ni encabezados, sin inventar nada que no esté en los datos. Menciona lo terminado, el avance, entregas recibidas, clima/personal si hay, e incidentes si los hubo con tono sereno. No menciones folios internos ni montos.
Datos: ${JSON.stringify(datos)}`;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 500, messages: [{ role: "user", content: prompt }] }) });
    const j = await r.json(); const texto = String(j?.content?.[0]?.text || "").trim();
    if (!texto) return NextResponse.json({ error: "No se pudo redactar" }, { status: 502 });
    const { data: prev } = await db.from("bitacora_obra").select("id").eq("obra_id", id).eq("fecha", fecha).limit(1).maybeSingle();
    if (prev) await db.from("bitacora_obra").update({ actividades: texto }).eq("id", (prev as { id: string }).id);
    else await db.from("bitacora_obra").insert({ obra_id: id, obra_nombre: bit.obra.nombre, fecha, actividades: texto, recibido_por_whatsapp: false });
    return NextResponse.json({ ok: true, texto });
  } catch { return NextResponse.json({ error: "No se pudo redactar" }, { status: 502 }); }
}
