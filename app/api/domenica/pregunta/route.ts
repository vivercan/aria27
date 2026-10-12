/**
 * POST /api/domenica/pregunta — "Pregúntale a Doménica" · 11-Oct-2026
 * { pregunta, historial?: [{q,a}] } → { respuesta, acciones: [{label, href}] }
 *
 * Solo LEE: junta lo que este usuario puede ver (actividades abiertas, solicitudes de los últimos 120 días,
 * obras, lo que le toca autorizar) y Claude contesta en español sencillo con hasta 3 botones.
 * Los botones se validan contra los ids que se mandaron (no puede inventar pantallas ni registros).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { accionesSeguras, limpiarRespuesta } from "@/lib/asistente";
import { queSigue } from "@/lib/requi-stepper";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;
const log = logger("PREGUNTA");
const VEN_TODO = ["admin", "direccion", "rh", "validador", "compras"];

type A = { id: string; titulo: string; obra: string | null; obra_id: string | null; asignado_nombre: string | null; asignado_email: string | null; asignado_por_email: string | null; fecha_compromiso: string | null; fecha_inicio: string | null; estatus: string | null; avance: number | null; prioridad: string | null; motivo_bloqueo: string | null; depende_de: string | null };
type R = { id: string; folio: string; cost_center_name: string | null; status: string; purchase_status: string | null; total: number | null; monto: number | null; solicitante_nombre_completo: string | null; created_by: string | null; user_email: string | null; responsable_email: string | null; created_at: string; required_date: string | null; motivo_solicitud: string | null; proveedor_nombre: string | null; proveedor: string | null };

export async function POST(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const rl = checkRateLimit(`u:${auth.email}`, { key: "pregunta", max: 30, windowMs: 10 * 60_000 }); if (!rl.allowed) return rateLimitResponse(rl);
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "El asistente no está configurado" }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const pregunta = String(body.pregunta || "").trim().slice(0, 500);
  if (pregunta.length < 3) return NextResponse.json({ error: "Escribe tu pregunta" }, { status: 400 });
  const historial = (Array.isArray(body.historial) ? body.historial : []).slice(-4).map((h: { q?: unknown; a?: unknown }) => ({ q: String(h?.q || "").slice(0, 300), a: String(h?.a || "").slice(0, 600) }));

  const me = auth.email.toLowerCase(); const role = (auth.role || "").toLowerCase(); const todo = VEN_TODO.includes(role);
  const db = getSupabaseAdmin();
  const desde = new Date(Date.now() - 120 * 864e5).toISOString();
  try {
    const [{ data: u }, { data: emp }, { data: obras }] = await Promise.all([
      db.from("Users").select("name, display_name").eq("email", me).maybeSingle(),
      db.from("employees").select("id").or(`usuario_email.eq.${me},email.eq.${me}`).limit(1).maybeSingle(),
      db.from("centros_trabajo").select("id, nombre, responsable_email").eq("activo", true),
    ]);
    const empId = (emp as { id?: string } | null)?.id || null;
    let aq = db.from("tareas_asignadas").select("id, titulo, obra, obra_id, asignado_nombre, asignado_email, asignado_por_email, fecha_compromiso, fecha_inicio, estatus, avance, prioridad, motivo_bloqueo, depende_de").not("estatus", "in", "(COMPLETADA,CANCELADA)").limit(400);
    if (!todo) aq = aq.or([`asignado_email.eq.${me}`, `asignado_por_email.eq.${me}`, empId ? `asignado_id.eq.${empId}` : ""].filter(Boolean).join(","));
    let rq = db.from("requisitions").select("id, folio, cost_center_name, status, purchase_status, total, monto, solicitante_nombre_completo, created_by, user_email, responsable_email, created_at, required_date, motivo_solicitud, proveedor_nombre, proveedor").gte("created_at", desde).order("created_at", { ascending: false }).limit(500);
    if (!todo) rq = rq.or(`user_email.eq.${me},responsable_email.eq.${me}`);
    const [{ data: acts }, { data: reqs }] = await Promise.all([aq, rq]);
    const A_ = (acts || []) as A[]; const R_ = (reqs || []) as R[]; const O_ = (obras || []) as { id: string; nombre: string; responsable_email: string | null }[];

    const hoy = new Date(Date.now() - 6 * 3600e3).toISOString().slice(0, 10);
    const atraso = (f: string | null) => f ? Math.floor((Date.parse(hoy) - Date.parse(f.slice(0, 10))) / 864e5) : 0;
    const datos = {
      hoy, yo: { nombre: (u as { display_name?: string; name?: string } | null)?.display_name || (u as { name?: string } | null)?.name || me, rol: role, ve_todo: todo },
      obras: O_.map(o => ({ id: o.id, nombre: o.nombre })),
      actividades: A_.map(a => ({ id: a.id, t: a.titulo, obra: a.obra, quien: a.asignado_nombre, mia: (a.asignado_email || "").toLowerCase() === me, entrega: a.fecha_compromiso?.slice(0, 10) || null, dias_tarde: Math.max(0, atraso(a.fecha_compromiso)), estado: a.motivo_bloqueo ? `ATORADA: ${a.motivo_bloqueo}` : a.estatus, avance: a.avance || 0, prioridad: a.prioridad, espera_a: a.depende_de || undefined })),
      solicitudes: R_.map(r => ({ id: r.id, folio: r.folio, obra: r.cost_center_name, estado: queSigue(r.status), pidio: r.solicitante_nombre_completo || r.created_by, mia: (r.user_email || "").toLowerCase() === me, total: Number(r.total) || Number(r.monto) || 0, fecha: r.created_at.slice(0, 10), dias: Math.floor((Date.now() - Date.parse(r.created_at)) / 864e5), para: r.required_date?.slice(0, 10) || null, que: (r.motivo_solicitud || "").slice(0, 80), proveedor: r.proveedor_nombre || r.proveedor || undefined, efectivo: r.purchase_status === "GASTO_EFECTIVO_PENDIENTE" || undefined })),
      // Gasto pedido por obra y mes (suma de solicitudes no rechazadas/canceladas, últimos 120 días) para contestar "¿cuánto se ha gastado…?"
      gasto_por_obra_mes: (() => { const m: Record<string, Record<string, number>> = {}; for (const r of R_) { if (/RECHAZ|CANCEL/.test(r.status)) continue; const o = r.cost_center_name || "Sin obra"; const mes = r.created_at.slice(0, 7); (m[o] ||= {})[mes] = Math.round(((m[o] || {})[mes] || 0) + (Number(r.total) || Number(r.monto) || 0)); } return m; })(),
      por_autorizar: R_.filter(r => (r.status === "EN_AUTORIZACION" && (role === "direccion" || role === "admin")) || (r.status === "PENDIENTE_RESPONSABLE" && (role === "direccion" || role === "admin" || role === "validador" || (r.responsable_email || "").toLowerCase() === me))).length,
    };

    const sistema = `Eres Doménica, la asistente de la constructora Grupo Constructor Urbano Avante (México). Contestas a ${datos.yo.nombre} (${role}) sobre SUS datos de obra.
Reglas:
- Español de México, sencillo, cálido y MUY breve: 1 a 4 renglones, como un mensaje de WhatsApp. Sin markdown, sin asteriscos, sin títulos.
- Usa SOLO los datos de abajo. Si no está en los datos, dilo ("no lo tengo registrado"). Nunca inventes números, nombres ni fechas.
- Si mencionan una obra, busca el nombre parecido en "obras". Cantidades en pesos con formato $12,345.
- "solicitudes" son pedidos de material/gastos; "actividades" son tareas. "dias_tarde" > 0 es atrasada. "estado" de solicitudes ya está en palabras.
- Solo lees: si te piden crear o cambiar algo, explica que lo haga con el botón + o con el botón que le propones.
- Para dinero usa "gasto_por_obra_mes" (lo PEDIDO en solicitudes por mes "AAAA-MM"; aclara que es lo pedido, no lo pagado). Nunca menciones pantallas, reportes o botones que no estén en tus acciones.
- Si preguntan CÓMO SE HACE algo en la app, explícalo en 2-3 pasos con estas reglas (y propone el botón):
  · Pedir material o servicio: botón azul "+ Nuevo" › Pedir material › qué, dónde/cuándo, tu lista › Enviar. Destajo (anticipo, pago semanal, finiquito): Pedir material › Destajo. Ruta "pedir".
  · Encargar algo a alguien: "+ Nuevo" › Encargar algo › persona, fecha y hora › Crear y avisar (le llega por WhatsApp). Ruta "actividades".
  · Registrar lo que llegó: "+ Nuevo" › Registrar una entrega › foto y quién recibió. Ruta "entregas".
  · Autorizar: Inicio › Autorizar, o Más › Autorizar; un toque en Autorizar o Rechazar. Ruta "autorizar".
  · Anotar pendientes propios: "Habla con Doménica" y di "anota…"; se acomodan en el Calendario. Ruta "calendario".
  · Terminar una actividad: Actividades › toca el círculo. Quien no usa la app contesta por WhatsApp "ya quedó", "ya mero" o "no hay material".
  · Letra grande o colores: Más › Ajustes. Guía: botón "Ayuda" de arriba.
Responde SOLO JSON: {"respuesta":"texto","acciones":[{"label":"máx 4 palabras","tipo":"actividad|solicitud|obra|autorizar|pantalla","id":"id exacto si aplica","ruta":"actividades|solicitudes|autorizar|obras|calendario|entregas|pedir (solo si tipo=pantalla)"}]} con 0 a 3 acciones útiles.`;
    const mensajes = [
      ...historial.flatMap((h: { q: string; a: string }) => [{ role: "user", content: h.q }, { role: "assistant", content: JSON.stringify({ respuesta: h.a, acciones: [] }) }]),
      { role: "user", content: `DATOS (${hoy}): ${JSON.stringify(datos)}\n\nPREGUNTA: ${pregunta}` },
    ];
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 700, system: sistema, messages: mensajes }) });
    const j = await r.json(); const raw = String(j?.content?.[0]?.text || "");
    const m = raw.match(/\{[\s\S]*\}/);
    let respuesta = ""; let acciones: { label: string; href: string }[] = [];
    if (m) {
      try {
        const o = JSON.parse(m[0]) as { respuesta?: string; acciones?: unknown };
        respuesta = limpiarRespuesta(String(o.respuesta || ""));
        acciones = accionesSeguras(o.acciones, { actividades: new Set(A_.map(a => a.id)), solicitudes: new Set(R_.map(x => x.id)), obras: new Set(O_.map(o => o.id)) });
      } catch { respuesta = limpiarRespuesta(raw); }
    } else respuesta = limpiarRespuesta(raw);
    if (!respuesta) return NextResponse.json({ error: "No pude contestar. Intenta de otra forma." }, { status: 502 });
    return NextResponse.json({ respuesta, acciones });
  } catch (e) {
    log.error("pregunta", { error: (e as Error).message });
    return NextResponse.json({ error: "No pude contestar ahorita. Intenta de nuevo." }, { status: 502 });
  }
}
