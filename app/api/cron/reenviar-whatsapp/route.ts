/**
 * Cron cada 30 min · Reintento automático de avisos de actividad que no llegaron por WhatsApp (14-Oct-2026).
 * Caso real: Meta bloqueó la cuenta por un pago rechazado (131042) y ningún aviso llegaba. Ahora, en cuanto
 * WhatsApp vuelve a entregar (hay un mensaje entregado/leído después de la falla), se reenvían solos.
 * Máximo 3 reintentos por actividad; solo actividades abiertas.
 */
import { cronAutorizado } from "@/lib/cron-auth";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { reenviarAvisoAsignacion } from "@/lib/actividades-server";
import { esCorreoPrueba } from "@/lib/modo-prueba";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX = 3;

export async function GET(req: NextRequest) {
  if (!cronAutorizado(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const db = getSupabaseAdmin();
  const { data } = await db.from("tareas_asignadas").select("id, folio, titulo, asignado_nombre, asignado_por, asignado_por_email, wa_message_id, wa_estado_at, wa_reintentos")
    .eq("wa_estado", "failed").not("estatus", "in", "(COMPLETADA,CANCELADA)").lt("wa_reintentos", MAX).order("created_at").limit(40);
  const fallidas = (data || []) as { id: string; folio?: string | null; titulo: string; asignado_nombre?: string | null; asignado_por?: string | null; asignado_por_email?: string | null; wa_message_id?: string | null; wa_estado_at?: string | null }[];
  if (!fallidas.length) return NextResponse.json({ ok: true, pendientes: 0 });
  // ¿WhatsApp ya entrega? Último mensaje entregado o leído
  const { data: ok } = await db.from("wa_log").select("estado_at").in("estado_entrega", ["delivered", "read"]).order("estado_at", { ascending: false }).limit(1);
  const ultimaEntrega = (ok?.[0] as { estado_at?: string } | undefined)?.estado_at || null;
  const resultado: string[] = [];
  for (const t of fallidas) {
    if (!ultimaEntrega || (t.wa_estado_at && new Date(ultimaEntrega) <= new Date(t.wa_estado_at))) { resultado.push(`espera:${t.folio || t.id}`); continue; }
    // Lo que hicieron los perfiles de prueba (o alguien en modo prueba) NUNCA se le manda a la persona real:
    // el reintento respeta a dónde fue el aviso original.
    if (esCorreoPrueba(t.asignado_por_email || t.asignado_por)) { resultado.push(`prueba:${t.folio || t.id}`); continue; }
    if (t.wa_message_id) {
      const { data: orig } = await db.from("wa_log").select("phone").eq("message_id", t.wa_message_id).limit(1);
      if (String((orig?.[0] as { phone?: string } | undefined)?.phone || "").startsWith("PRUEBA")) { resultado.push(`prueba:${t.folio || t.id}`); continue; }
    }
    if (dry) { resultado.push(`DRY:${t.folio || t.id} -> ${t.asignado_nombre}`); continue; }
    const r = await reenviarAvisoAsignacion(db, t.id, "sistema", "actividad-reintento");
    resultado.push(`${r.ok ? "ok" : "falló"}:${t.folio || t.id}${r.ok ? "" : ` (${r.error})`}`);
  }
  return NextResponse.json({ ok: true, pendientes: fallidas.length, ultimaEntrega, resultado });
}
