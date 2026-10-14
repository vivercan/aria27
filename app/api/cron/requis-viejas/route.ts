/**
 * Cron diario 9:00 (Aguascalientes), lunes a sábado · "¿Ya llegó?" (14-Oct-2026 · JJ)
 * A quien pidió solicitudes que llevan 15+ días sin moverse le llega UN WhatsApp (y notificación en la app) con
 * hasta 6 de ellas, de la más vieja a la más nueva. Contesta "SI 757", "NO 757" o "SI TODAS" (las de ese mensaje),
 * o las confirma en Doménica › Solicitudes › ¿Ya llegó?. Cada solicitud se pregunta máximo 3 veces, una cada 7 días.
 * Los perfiles de prueba nunca reciben ni provocan avisos a gente real.
 */
import { cronAutorizado } from "@/lib/cron-auth";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { avisarWA, personaPorEmail } from "@/lib/actividades-server";
import { esCorreoPrueba } from "@/lib/modo-prueba";
import { ABIERTAS, COLS_SEG, diasSinMover, esViejaSinCerrar, numeroFolio, queEs, tocaPreguntarHoy, type RequiSeg } from "@/lib/requi-seguimiento";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const POR_MENSAJE = 6;

export async function GET(req: NextRequest) {
  if (!cronAutorizado(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("requisitions").select(COLS_SEG).in("status", ABIERTAS).order("created_at").limit(3000);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const hoy = new Date();
  const porPersona = new Map<string, RequiSeg[]>();
  const pendientesPorPersona = new Map<string, number>();
  for (const r of (data || []) as RequiSeg[]) {
    const k = String(r.user_email || "").toLowerCase(); if (!k.includes("@") || esCorreoPrueba(k)) continue;
    if (esViejaSinCerrar(r, hoy)) pendientesPorPersona.set(k, (pendientesPorPersona.get(k) || 0) + 1);
    if (tocaPreguntarHoy(r, hoy)) porPersona.set(k, [...(porPersona.get(k) || []), r]);
  }
  const enviados: string[] = [];
  for (const [email, todas] of porPersona) {
    const lista = todas.sort((a, b) => diasSinMover(b, hoy) - diasSinMover(a, hoy)).slice(0, POR_MENSAJE);
    const total = pendientesPorPersona.get(email) || lista.length;
    const p = await personaPorEmail(db, email);
    const partes = lista.map((r, i) => `${i + 1}) #${numeroFolio(r.folio)} ${queEs(r)} · ${String(r.cost_center_name || "").slice(0, 30)} (${diasSinMover(r, hoy)} días)`);
    const ej = numeroFolio(lista[0].folio);
    const msg = `Tienes ${total} solicitud${total === 1 ? "" : "es"} de hace más de 15 días sin cerrar. ¿Ya llegaron? ${partes.join(" | ")}${total > lista.length ? ` y ${total - lista.length} más en la app` : ""}. Contesta SI ${ej} si ya llegó, NO ${ej} si sigue pendiente, o SI TODAS si ya llegaron las de este mensaje. También en Doménica › Solicitudes › ¿Ya llegó?`;
    if (dry) { enviados.push(`DRY ${email} -> ${msg}`); continue; }
    await avisarWA(p, msg, "requis-viejas", "cron", { title: `📦 ¿Ya llegaron? ${total} solicitud${total === 1 ? "" : "es"} sin cerrar`, url: "/dashboard/requisiciones/requisiciones/ya-llego", tag: "ya-llego" });
    const ahora = new Date().toISOString();
    for (const r of lista) await db.from("requisitions").update({ seg_preguntado_at: ahora, seg_preguntas: (Number(r.seg_preguntas) || 0) + 1 }).eq("id", r.id);
    enviados.push(`${email}:${lista.length}/${total}`);
  }
  return NextResponse.json({ ok: true, personas: porPersona.size, enviados });
}
