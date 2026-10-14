/**
 * /api/requisicion/seguimiento — "¿Ya llegó?" (14-Oct-2026)
 * GET  → las solicitudes viejas sin cerrar de la persona (?todas=1 para Compras / Superintendencia / admin: las de todos)
 * POST { ids: string[], accion: "si" | "no" | "cancelar" } → contesta una o varias
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { ABIERTAS, COLS_SEG, conResumen, diasSinMover, esViejaSinCerrar, puedeContestar, responderSeguimiento, type RequiSeg } from "@/lib/requi-seguimiento";

export const dynamic = "force-dynamic";
const VEN_TODAS = ["admin", "administrador", "compras", "validador", "direccion"];

export async function GET(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const me = auth.email.toLowerCase(); const role = String(auth.role || "").toLowerCase();
  const todas = new URL(req.url).searchParams.get("todas") === "1" && VEN_TODAS.includes(role);
  const db = getSupabaseAdmin();
  let q = db.from("requisitions").select(COLS_SEG).in("status", ABIERTAS).order("created_at").limit(1000);
  if (!todas) q = q.ilike("user_email", me);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const hoy = new Date();
  const lista = (await conResumen(db, ((data || []) as RequiSeg[]).filter(r => esViejaSinCerrar(r, hoy)))).map(r => ({ ...r, dias: diasSinMover(r, hoy) }));
  return NextResponse.json({ ok: true, todas, puedeVerTodas: VEN_TODAS.includes(role), lista });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const b = await req.json().catch(() => ({})) as { ids?: unknown; accion?: string };
  const ids = (Array.isArray(b.ids) ? b.ids : []).map(String).filter(Boolean).slice(0, 200);
  const accion = b.accion === "si" || b.accion === "no" || b.accion === "cancelar" ? b.accion : null;
  if (!ids.length || !accion) return NextResponse.json({ error: "Elige la solicitud y la respuesta" }, { status: 400 });
  const db = getSupabaseAdmin();
  const { data } = await db.from("requisitions").select(COLS_SEG).in("id", ids);
  const me = auth.email.toLowerCase(); const role = String(auth.role || "");
  let hechas = 0; const errores: string[] = [];
  for (const r of (data || []) as RequiSeg[]) {
    if (!puedeContestar(r, me, role)) { errores.push(`${r.folio}: solo quien la pidió, Compras o Superintendencia`); continue; }
    const x = await responderSeguimiento(db, r, accion, me, "app");
    if (x.ok) hechas++; else errores.push(x.error || `${r.folio}: no se pudo`);
  }
  if (!hechas && errores.length) return NextResponse.json({ error: errores[0], errores }, { status: 400 });
  return NextResponse.json({ ok: true, hechas, errores });
}
