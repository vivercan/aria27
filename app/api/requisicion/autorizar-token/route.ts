/**
 * POST /api/requisicion/autorizar-token — link de Dirección (WhatsApp/correo) para solicitudes SIN comparativa · 11-Oct-2026
 * { token, action: "AUTORIZAR" | "RECHAZAR", comentario? }
 * El token (uuid secreto en authorization_comments) es la llave, igual que approve-purchase. Solo actúa si sigue EN_AUTORIZACION
 * y no trae comparativa (las de comparativa siguen en la pantalla de elegir proveedor).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { resolverDireccion, tieneComparativa } from "@/lib/autorizar-direccion";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(getClientIdentifier(req), { key: "req:auth-token", ...RATE_LIMITS.WRITE });
  if (!rl.allowed) return rateLimitResponse(rl);
  const body = await req.json().catch(() => ({}));
  const token = String(body.token || "").trim();
  const action = String(body.action || "").toUpperCase();
  const comentario = String(body.comentario || "").trim().slice(0, 500);
  if (!/^[0-9a-f-]{32,40}$/i.test(token) || (action !== "AUTORIZAR" && action !== "RECHAZAR")) return NextResponse.json({ error: "Link inválido" }, { status: 400 });
  if (action === "RECHAZAR" && comentario.length < 3) return NextResponse.json({ error: "Escribe el motivo del rechazo" }, { status: 400 });
  const db = getSupabaseAdmin();
  const { data: r } = await db.from("requisitions").select("id, status, cotizacion_data").eq("authorization_comments", token).maybeSingle();
  if (!r) return NextResponse.json({ error: "Este link ya no es válido" }, { status: 404 });
  if (r.status !== "EN_AUTORIZACION") return NextResponse.json({ error: "Esta solicitud ya fue atendida" }, { status: 409 });
  if (tieneComparativa(r.cotizacion_data)) return NextResponse.json({ error: "Esta solicitud trae comparativa: elige proveedor" }, { status: 409 });
  const { data: dir } = await db.from("Users").select("email").eq("role", "direccion").is("usuario_prueba", null).eq("active", true).limit(1).maybeSingle();
  const actor = `${(dir as { email?: string } | null)?.email || "direccion"} (link)`;
  const res = await resolverDireccion(db, [r.id as string], action, comentario, actor);
  if (res.error) return NextResponse.json({ error: res.error }, { status: 500 });
  if (!res.hechas.length) return NextResponse.json({ error: res.saltadas[0]?.motivo || "No se pudo" }, { status: 409 });
  return NextResponse.json({ ok: true, status: action === "AUTORIZAR" ? "APROBADA" : "RECHAZADA_DIRECCION" });
}
