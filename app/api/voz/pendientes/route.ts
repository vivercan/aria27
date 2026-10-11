/**
 * POST /api/voz/pendientes — "Anota mis pendientes" por voz (Doménica 27 · 11-Oct-2026)
 * { accion: "entender", texto } → { pendientes: [{ titulo, fecha, hora, obra_id, obra, prioridad }] }  (la IA separa y pone fechas)
 * { accion: "guardar", pendientes: [...] } → crea cada uno como actividad TUYA (sin WhatsApp) → aparecen en tu agenda.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { crearActividad } from "@/lib/actividades-server";
import { partirPendientes } from "@/lib/comandos-voz";
import { parecido } from "@/lib/voz";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;
const log = logger("VOZ-PENDIENTES");
type P = { titulo: string; fecha: string; hora: string | null; obra_id: string | null; obra: string | null; prioridad: string };
const ymd = (d: Date) => d.toISOString().slice(0, 10);

export async function POST(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const rl = checkRateLimit(`u:${auth.email}`, { key: "voz-pend", max: 30, windowMs: 10 * 60_000 }); if (!rl.allowed) return rateLimitResponse(rl);
  const body = await req.json().catch(() => ({}));
  const db = getSupabaseAdmin(); const me = auth.email.toLowerCase();
  const hoy = ymd(new Date(Date.now() - 6 * 3600e3));
  const { data: obrasData } = await db.from("centros_trabajo").select("id, nombre").eq("activo", true);
  const obras = ((obrasData || []) as { id: string; nombre: string }[]);

  if (body.accion === "guardar") {
    const lista = (Array.isArray(body.pendientes) ? body.pendientes : []).slice(0, 20) as Partial<P>[];
    if (!lista.length) return NextResponse.json({ error: "No hay pendientes que guardar" }, { status: 400 });
    const { data: emp } = await db.from("employees").select("id").or(`usuario_email.eq.${me},email.eq.${me}`).eq("status", "ACTIVO").limit(1).maybeSingle();
    const empId = (emp as { id?: string } | null)?.id;
    if (!empId) return NextResponse.json({ error: "No estás dado de alta en Personal. Pide a RH que te den de alta para guardar pendientes." }, { status: 400 });
    const ids: string[] = []; const errores: string[] = [];
    for (const p of lista) {
      const titulo = `${p.hora ? `${p.hora} · ` : ""}${String(p.titulo || "").trim()}`.slice(0, 200);
      const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(p.fecha || "")) ? String(p.fecha) : hoy;
      const r = await crearActividad(db, { titulo, asignado_id: empId, fecha_compromiso: fecha, obra_id: p.obra_id || null, prioridad: p.prioridad || "MEDIA", origen: "voz-pendientes" }, me, "nada");
      if (r.ok) ids.push(r.id); else errores.push(r.error);
    }
    return NextResponse.json({ ok: true, creados: ids.length, ids, errores });
  }

  const texto = String(body.texto || "").trim().slice(0, 2000);
  if (texto.length < 3) return NextResponse.json({ error: "No se escuchó nada" }, { status: 400 });
  const respaldo = (): P[] => partirPendientes(texto).map(t => ({ titulo: t.charAt(0).toUpperCase() + t.slice(1), fecha: hoy, hora: null, obra_id: parecido(t, obras)?.id || null, obra: parecido(t, obras)?.nombre || null, prioridad: "MEDIA" }));
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ pendientes: respaldo(), sinIA: true });
  try {
    const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    const dHoy = new Date(hoy + "T12:00:00");
    const prompt = `Hoy es ${dias[dHoy.getDay()]} ${hoy} (México). Separa el dictado en pendientes PERSONALES sueltos (uno por cosa que hacer).
Obras: ${obras.map(o => o.nombre).slice(0, 80).join(" | ")}
Responde SOLO JSON: {"pendientes":[{"titulo":"verbo + qué, corto, en español","fecha":"YYYY-MM-DD (hoy si no dice; mañana, el viernes, etc. calculado desde hoy)","hora":"HH:MM o null","obra":"nombre EXACTO de Obras o null","prioridad":"URGENTE|ALTA|MEDIA|BAJA"}]}
Dictado: """${texto}"""`;
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 900, messages: [{ role: "user", content: prompt }] }) });
    const j = await r.json(); const raw = String(j?.content?.[0]?.text || ""); const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return NextResponse.json({ pendientes: respaldo() });
    const o = JSON.parse(m[0]) as { pendientes?: Record<string, unknown>[] };
    const out: P[] = (o.pendientes || []).slice(0, 15).map(x => {
      const ob = x.obra ? obras.find(z => z.nombre === String(x.obra)) || parecido(String(x.obra), obras) : null;
      return { titulo: String(x.titulo || "").slice(0, 180), fecha: /^\d{4}-\d{2}-\d{2}$/.test(String(x.fecha || "")) ? String(x.fecha) : hoy, hora: /^\d{1,2}:\d{2}$/.test(String(x.hora || "")) ? String(x.hora) : null,
        obra_id: ob?.id || null, obra: ob?.nombre || null, prioridad: ["URGENTE", "ALTA", "MEDIA", "BAJA"].includes(String(x.prioridad)) ? String(x.prioridad) : "MEDIA" };
    }).filter(x => x.titulo.length >= 3);
    return NextResponse.json({ pendientes: out.length ? out : respaldo() });
  } catch (e) { log.error("entender", { error: (e as Error).message }); return NextResponse.json({ pendientes: respaldo() }); }
}
