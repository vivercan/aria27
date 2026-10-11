/**
 * Cron diario 7:00 (Aguascalientes) · Resumen de la mañana (actividades + solicitudes que te tocan) · 10/11-Oct-2026
 * - A cada persona: lista de lo que vence hoy, manana y lo atrasado (una sola notificacion por persona).
 * - A quien asigno: resumen de sus actividades atrasadas (1 mensaje).
 * Plantilla aprobada aria_tarea_status (funciona fuera de la ventana de 24 h).
 */
import { cronAutorizado } from "@/lib/cron-auth";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { avisarWA, personaPorEmail, personaPorEmpleado } from "@/lib/actividades-server";
import { columnaDe, diasAtraso, fechaCorta, type Actividad } from "@/lib/actividades";
import { meToca, accionPara, ACCION_TXT } from "@/lib/requi-stepper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hoyMx(): Date {
  const s = new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" });
  return new Date(s);
}
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export async function GET(req: NextRequest) {
  if (!cronAutorizado(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("tareas_asignadas").select("*").not("estatus", "in", "(COMPLETADA,CANCELADA)");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const hoy = hoyMx(); const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);
  const H = ymd(hoy), M = ymd(manana);

  const porPersona = new Map<string, Actividad[]>();
  const atrasadasPorAsignador = new Map<string, Actividad[]>();
  for (const a of (data || []) as Actividad[]) {
    if (columnaDe(a) === "TERMINADA") continue;
    const f = (a.fecha_compromiso || "").slice(0, 10);
    const atraso = diasAtraso(a, hoy);
    if (f === H || f === M || atraso > 0) {
      const k = a.asignado_id || a.asignado_email || "";
      if (k) porPersona.set(k, [...(porPersona.get(k) || []), a]);
    }
    if (atraso > 0) {
      const k = (a.asignado_por_email || a.asignado_por || "").toLowerCase();
      if (k && k !== (a.asignado_email || "").toLowerCase()) atrasadasPorAsignador.set(k, [...(atrasadasPorAsignador.get(k) || []), a]);
    }
  }

  // 11-Oct-2026 · Resumen de la mañana: además de actividades, las solicitudes que a cada quien le toca mover
  const reqPorEmail = new Map<string, { n: number; que: Record<string, number> }>();
  try {
    const [{ data: us }, { data: rq }] = await Promise.all([
      db.from("users").select("email, role, active"),
      db.from("requisitions").select("id, status, purchase_status, user_email, responsable_email, tipo_solicitud").in("status", ["PENDIENTE_RESPONSABLE", "PENDIENTE", "EN_COTIZACION", "EN_AUTORIZACION", "APROBADA"]).limit(3000),
    ]);
    for (const u of (us || []) as { email: string; role: string; active: boolean | null }[]) {
      if (u.active === false || !u.email) continue;
      const em = u.email.toLowerCase(); const role = String(u.role || "").toLowerCase();
      const que: Record<string, number> = {}; let n = 0;
      for (const q of (rq || []) as Parameters<typeof meToca>[0][]) { if (!meToca(q, role, em)) continue; const a = accionPara(q, role, em) || ""; que[a] = (que[a] || 0) + 1; n++; }
      if (n) reqPorEmail.set(em, { n, que });
    }
  } catch { /* si falla, sigue solo con actividades */ }
  const textoReq = (x: { n: number; que: Record<string, number> }) => Object.entries(x.que).map(([a, k]) => `${k} por ${(ACCION_TXT[a] || "atender").toLowerCase()}`).join(", ");

  const enviados: string[] = [];
  for (const [k, list] of porPersona) {
    const p = list[0].asignado_id ? await personaPorEmpleado(db, list[0].asignado_id) : await personaPorEmail(db, k);
    const partes = list.slice(0, 6).map((a, i) => {
      const f = (a.fecha_compromiso || "").slice(0, 10); const d = diasAtraso(a, hoy);
      return `${i + 1}) ${a.titulo.slice(0, 60)} - ${d > 0 ? `atrasada ${d} día${d === 1 ? "" : "s"}` : f === H ? "vence HOY" : "vence mañana"}`;
    });
    const rq = p?.email ? reqPorEmail.get(p.email) : undefined; if (p?.email) reqPorEmail.delete(p.email);
    const msg = `Buenos días. Tus actividades: ${partes.join(" | ")}${list.length > 6 ? ` y ${list.length - 6} más` : ""}.${rq ? ` Solicitudes: ${textoReq(rq)}.` : ""} Contesta 1 LISTO o 1 AVANCE 50 para actualizar.`;
    if (!dry && await avisarWA(p, msg, "actividades-recordatorio", "cron", { title: "⏰ Tus actividades de hoy", url: "/dashboard/actividades?vista=mi", tag: "recordatorio" })) enviados.push(`persona:${p?.nombre}`);
    else if (dry) enviados.push(`DRY persona:${p?.nombre} -> ${msg}`);
  }
  // Quien solo tiene solicitudes pendientes (sin actividades): un solo aviso
  for (const [email, x] of reqPorEmail) {
    const p = await personaPorEmail(db, email);
    const msg = `Buenos días. Tienes ${x.n} solicitud${x.n === 1 ? "" : "es"} esperando: ${textoReq(x)}. Ábrelas en Doménica 27 › Solicitudes › Me toca.`;
    if (!dry && await avisarWA(p, msg, "resumen-solicitudes", "cron", { title: `📋 ${x.n} solicitud${x.n === 1 ? "" : "es"} te esperan`, url: "/dashboard/requisiciones/requisiciones/estatus?tab=toca", tag: "resumen-req" })) enviados.push(`solicitudes:${p?.nombre}`);
    else if (dry) enviados.push(`DRY solicitudes:${p?.nombre} -> ${msg}`);
  }
  for (const [email, list] of atrasadasPorAsignador) {
    const p = await personaPorEmail(db, email);
    const partes = list.slice(0, 6).map(a => `${a.titulo.slice(0, 50)} (${(a.asignado_nombre || "").split(" ")[0]}, ${diasAtraso(a, hoy)}d, entrega ${fechaCorta(a.fecha_compromiso)})`);
    const msg = `${list.length} actividad${list.length === 1 ? "" : "es"} que asignaste va${list.length === 1 ? "" : "n"} atrasada${list.length === 1 ? "" : "s"}: ${partes.join(" | ")}. Revisa el tablero en ARIA27 › Actividades.`;
    if (!dry && await avisarWA(p, msg, "actividades-atrasadas-asignador", "cron", { title: "🔴 Actividades atrasadas", url: "/dashboard/actividades?vista=mi&ambito=asigne", tag: "atrasadas" })) enviados.push(`asignador:${p?.nombre}`);
    else if (dry) enviados.push(`DRY asignador:${p?.nombre} -> ${msg}`);
  }
  return NextResponse.json({ ok: true, hoy: H, personas: porPersona.size, asignadores: atrasadasPorAsignador.size, enviados });
}
