/**
 * POST /api/requisicion/cotizacion-link — crea un link para que un proveedor mande su cotización sin usuario (11-Oct-2026)
 * GET  ?requisition_id= — links y cotizaciones recibidas de una requisición
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { ROLES_LINK, generarToken, hashToken, urlCotizar } from "@/lib/cotizacion-link";

export async function POST(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  if (!ROLES_LINK.includes(String(auth.role).toLowerCase())) return NextResponse.json({ error: "Solo Compras, Superintendencia, Dirección, RH o admin pueden pedir cotizaciones por link" }, { status: 403 });
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const reqId = String(b.requisition_id || "");
  const proveedor = String(b.supplier_name || "").trim().slice(0, 160);
  if (!reqId) return NextResponse.json({ error: "Falta la requisición" }, { status: 400 });
  if (!proveedor) return NextResponse.json({ error: "Escribe el nombre del proveedor" }, { status: 400 });
  const dias = Math.max(1, Math.min(30, Math.round(Number(b.dias) || 7)));
  const db = getSupabaseAdmin();
  const { data: r } = await db.from("requisitions").select("id, folio").eq("id", reqId).maybeSingle();
  if (!r) return NextResponse.json({ error: "Requisición no encontrada" }, { status: 404 });
  const token = generarToken();
  const expira = new Date(Date.now() + dias * 864e5).toISOString();
  const { error } = await db.from("enlaces_cotizacion").insert({ token_hash: hashToken(token), requisition_id: reqId, supplier_id: b.supplier_id ? Number(b.supplier_id) || null : null, supplier_name: proveedor, expira, creado_por: auth.email.toLowerCase() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const url = urlCotizar(token);
  const folio = (r as { folio: string }).folio;
  const mensaje = `Hola, ${proveedor}. Grupo Constructor Urbano Avante le pide cotizar la solicitud ${folio}. Aquí ve el material y sube su cotización (PDF o foto), sin crear cuenta: ${url} — vence en ${dias} días.`;
  return NextResponse.json({ ok: true, url, expira, mensaje });
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const reqId = new URL(req.url).searchParams.get("requisition_id") || "";
  if (!reqId) return NextResponse.json({ error: "Falta la requisición" }, { status: 400 });
  const db = getSupabaseAdmin();
  const [{ data: links }, { data: cots }] = await Promise.all([
    db.from("enlaces_cotizacion").select("id, supplier_name, expira, activo, usado_veces, ultimo_uso, created_at, creado_por").eq("requisition_id", reqId).order("created_at", { ascending: false }),
    db.from("quotations").select("id, supplier_name, total, file_url, file_name, notes, dias_entrega, forma_pago, emite_factura, estado, created_at").eq("requisition_id", reqId).order("created_at", { ascending: false }),
  ]);
  return NextResponse.json({ links: links || [], cotizaciones: cots || [] });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  if (!ROLES_LINK.includes(String(auth.role).toLowerCase())) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id") || "";
  const { error } = await getSupabaseAdmin().from("enlaces_cotizacion").update({ activo: false }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
