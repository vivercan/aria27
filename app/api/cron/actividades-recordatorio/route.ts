/**
 * Cron diario 8:00 (Aguascalientes) · Actividades tipo Monday · 10-Oct-2026
 * - A cada persona: lista de lo que vence hoy, manana y lo atrasado (una sola notificacion por persona).
 * - A quien asigno: resumen de sus actividades atrasadas (1 mensaje).
 * Plantilla aprobada aria_tarea_status (funciona fuera de la ventana de 24 h).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { avisarWA, personaPorEmail, personaPorEmpleado } from "@/lib/actividades-server";
import { columnaDe, diasAtraso, fechaCorta, type Actividad } from "@/lib/actividades";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hoyMx(): Date {
  const s = new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" });
  return new Date(s);
}
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const expected = process.env.CRON_SECRET || "";
  const isVercelCron = req.headers.get("x-vercel-cron") === "1" || req.headers.get("user-agent")?.startsWith("vercel-cron") === true;
  if (!isVercelCron && (!expected || auth !== `Bearer ${expected}`)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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

  const enviados: string[] = [];
  for (const [k, list] of porPersona) {
    const p = list[0].asignado_id ? await personaPorEmpleado(db, list[0].asignado_id) : await personaPorEmail(db, k);
    const partes = list.slice(0, 6).map((a, i) => {
      const f = (a.fecha_compromiso || "").slice(0, 10); const d = diasAtraso(a, hoy);
      return `${i + 1}) ${a.titulo.slice(0, 60)} - ${d > 0 ? `atrasada ${d} día${d === 1 ? "" : "s"}` : f === H ? "vence HOY" : "vence mañana"}`;
    });
    const msg = `Tus actividades: ${partes.join(" | ")}${list.length > 6 ? ` y ${list.length - 6} más` : ""}. Contesta 1 LISTO o 1 AVANCE 50 para actualizar.`;
    if (!dry && await avisarWA(p, msg, "actividades-recordatorio", "cron")) enviados.push(`persona:${p?.nombre}`);
    else if (dry) enviados.push(`DRY persona:${p?.nombre} -> ${msg}`);
  }
  for (const [email, list] of atrasadasPorAsignador) {
    const p = await personaPorEmail(db, email);
    const partes = list.slice(0, 6).map(a => `${a.titulo.slice(0, 50)} (${(a.asignado_nombre || "").split(" ")[0]}, ${diasAtraso(a, hoy)}d, entrega ${fechaCorta(a.fecha_compromiso)})`);
    const msg = `${list.length} actividad${list.length === 1 ? "" : "es"} que asignaste va${list.length === 1 ? "" : "n"} atrasada${list.length === 1 ? "" : "s"}: ${partes.join(" | ")}. Revisa el tablero en ARIA27 › Actividades.`;
    if (!dry && await avisarWA(p, msg, "actividades-atrasadas-asignador", "cron")) enviados.push(`asignador:${p?.nombre}`);
    else if (dry) enviados.push(`DRY asignador:${p?.nombre} -> ${msg}`);
  }
  return NextResponse.json({ ok: true, hoy: H, personas: porPersona.size, asignadores: atrasadasPorAsignador.size, enviados });
}
