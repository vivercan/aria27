/**
 * POST /api/voz/intencion — ¿qué quiere la persona? cuando las reglas no están seguras (Doménica 27 · 11-Oct-2026)
 * Recibe lo que dijo/escribió y responde UNA de las herramientas del catálogo, con qué tan segura está.
 * Si no está segura, devuelve 2-3 opciones para preguntar "¿Quisiste decir…?" (nunca adivina).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { INTENCIONES, intencionPorId } from "@/lib/intenciones";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 30;
const log = logger("VOZ-INTENCION");

const EXTRA = [
  { id: "material", d: "Pedir material o servicio CON detalle (qué, cuánto, para qué obra). Se arma el pedido." },
  { id: "actividad", d: "Encargarle algo CONCRETO a una persona (quién y qué). Se arma la tarea." },
  { id: "pendientes", d: "Anotar recordatorios o pendientes propios para la agenda." },
  { id: "pregunta", d: "Hace una pregunta sobre datos (qué, cuánto, cuándo, quién, cómo va)." },
];

export async function POST(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const rl = checkRateLimit(`u:${auth.email}`, { key: "voz-intencion", max: 40, windowMs: 10 * 60_000 }); if (!rl.allowed) return rateLimitResponse(rl);
  const b = await req.json().catch(() => ({})) as { texto?: string };
  const texto = String(b.texto || "").trim().slice(0, 600);
  if (!texto) return NextResponse.json({ error: "No se escuchó nada" }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ opcion: null, opciones: [] });
  const catalogo = [
    ...INTENCIONES.map(i => `- ${i.id}: ${i.nombre} — ${i.explica}. Se dice como: ${[...(i.fuertes || []), ...i.claves].slice(0, 14).map(x => x.replace(/^~/, "")).join(", ")}`),
    ...EXTRA.map(e => `- ${e.id}: ${e.d}`),
  ].join("\n");
  const prompt = `Eres Doménica, asistente de una app de trabajo (constructora mexicana). Gente de obra y de oficina te habla como habla: con errores del dictado, palabras de obra, frases incompletas.
Decide QUÉ QUIERE de esta lista:
${catalogo}

Reglas: si menciona cantidades o cosas concretas a pedir → material. Si le encarga algo a otra persona → actividad. Si es para recordárselo a sí mismo → pendientes. Si pregunta un dato → pregunta.
Si no estás muy seguro, baja "seguridad" y pon las otras opciones posibles.
Responde SOLO JSON: {"opcion":"id","seguridad":0.0-1.0,"otras":["id","id"]}
Lo que dijo: """${texto}"""`;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 120, messages: [{ role: "user", content: prompt }] }) });
    const j = await r.json(); const raw = String(j?.content?.[0]?.text || ""); const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return NextResponse.json({ opcion: null, opciones: [] });
    const o = JSON.parse(m[0]) as { opcion?: string; seguridad?: number; otras?: string[] };
    const valido = (id?: string) => !!id && (!!intencionPorId(id) || EXTRA.some(e => e.id === id));
    let opcion = valido(o.opcion) ? String(o.opcion) : null;
    // "Pedir material" con detalle (qué cosas) → se arma el pedido, no solo se abre la pantalla vacía
    if (opcion === "pedir_material" && texto.split(/\s+/).length >= 5) opcion = "material";
    const seguridad = Math.max(0, Math.min(1, Number(o.seguridad) || 0));
    const otras = (Array.isArray(o.otras) ? o.otras : []).map(String).filter(x => valido(x) && x !== opcion).slice(0, 2);
    const ficha = (id: string) => { const i = intencionPorId(id); if (i) return { id, nombre: i.nombre, explica: i.explica, href: i.href };
      const e = EXTRA.find(x => x.id === id)!; const nom = id === "material" ? "Pedir material" : id === "actividad" ? "Encargar algo" : id === "pendientes" ? "Anotar mis pendientes" : "Preguntarle a Doménica";
      return { id, nombre: nom, explica: e.d.split(".")[0], href: null as string | null }; };
    return NextResponse.json({ opcion, seguridad, opciones: [opcion, ...otras].filter(Boolean).map(x => ficha(String(x))) });
  } catch (e) {
    log.error("intencion", { error: (e as Error).message });
    return NextResponse.json({ opcion: null, opciones: [] });
  }
}
