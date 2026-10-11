/** Cron 19:00 Aguascalientes · avisa al responsable de cada obra que su bitácora del día está lista (solo notificación del teléfono) · 11-Oct-2026 */
import { NextRequest, NextResponse } from "next/server";
import { cronAutorizado } from "@/lib/cron-auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { armarBitacora, hayAlgo } from "@/lib/bitacora-dia";
import { pushAEmail } from "@/lib/push";
import { hoyMX } from "@/lib/plantillas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  if (!cronAutorizado(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getSupabaseAdmin(); const fecha = hoyMX();
  const { data: obras } = await db.from("centros_trabajo").select("id, nombre, responsable_email").eq("activo", true);
  const out: string[] = [];
  for (const o of (obras || []) as { id: string; nombre: string; responsable_email: string | null }[]) {
    const b = await armarBitacora(db, o.id, fecha); if (!b || !hayAlgo(b)) continue;
    const resumen = [b.terminadas.length && `${b.terminadas.length} terminadas`, b.avances.length && `${b.avances.length} avances`, b.fotos.length && `${b.fotos.length} fotos`, b.entregas.length && `${b.entregas.length} entregas`].filter(Boolean).join(", ");
    for (const em of [o.responsable_email, "direccion@gcuavante.com"].filter(Boolean) as string[]) {
      try { await pushAEmail(em, { title: `📒 Bitácora de hoy · ${o.nombre}`, body: resumen || "Ya está lista", url: `/dashboard/domenica/obras/${o.id}/bitacora?fecha=${fecha}`, tag: `bit-${o.id}` }); } catch { /* */ }
    }
    out.push(`${o.nombre}: ${resumen}`);
  }
  return NextResponse.json({ ok: true, fecha, obras: out });
}
