/**
 * /api/administracion/fiel — Bóveda de e.firma (FIEL) de las empresas y sus representantes (20-Oct-2026 · pidió Deyanira)
 *
 * GET                       → lista (sin contraseñas ni archivos): empresa, RFC, representante, vigencia, archivos que tiene.
 * GET ?id=X&archivo=Y       → descarga un archivo (.cer/.key/.pdf/.ren/.req). Queda en fiel_accesos_log.
 * GET ?id=X&password=1      → contraseña descifrada para copiar. Queda en fiel_accesos_log.
 * POST { registro, archivos[], password? } → alta o renovación (archivos en base64).
 * DELETE ?id=X              → baja lógica (activo=false).
 *
 * Los archivos viven en la base (bytea) con RLS, NO en el bucket público de expedientes. La contraseña va cifrada
 * (pgp_sym_encrypt con PORTALES_CRYPTO_KEY, igual que los portales de facturación). Solo admin, Dirección y RH.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
const log = logger("FIEL");
const ROLES = new Set(["admin", "administrador", "direccion", "rh"]);
const EXT_OK = new Set(["cer", "key", "pdf", "ren", "req", "txt", "zip"]);
const MIME: Record<string, string> = { cer: "application/pkix-cert", key: "application/octet-stream", pdf: "application/pdf", ren: "application/octet-stream", req: "application/octet-stream", txt: "text/plain", zip: "application/zip" };

async function acceso(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth;
  if (!ROLES.has(String(auth.role || "").toLowerCase())) return { ok: false as const, res: NextResponse.json({ error: "Solo administración, Dirección y RH" }, { status: 403 }) };
  return { ok: true as const, email: auth.email.toLowerCase() };
}
async function bitacora(req: NextRequest, email: string, accion: string, fielId: string | null, archivo?: string) {
  try { await getSupabaseAdmin().from("fiel_accesos_log").insert({ fiel_id: fielId, user_email: email, accion, archivo: archivo || null, ip: req.headers.get("x-forwarded-for"), user_agent: req.headers.get("user-agent") }); }
  catch (e) { log.warn("bitácora FIEL", { err: (e as Error).message }); }
}
const ext = (n: string) => (n.split(".").pop() || "").toLowerCase();

export async function GET(req: NextRequest) {
  const a = await acceso(req); if (!a.ok) return a.res;
  const db = getSupabaseAdmin();
  const sp = new URL(req.url).searchParams;
  const id = sp.get("id");
  if (id && sp.get("password") === "1") {
    const key = process.env.PORTALES_CRYPTO_KEY || "";
    if (!key) return NextResponse.json({ error: "Falta la llave de cifrado en el servidor" }, { status: 500 });
    const { data } = await db.rpc("fiel_get_password", { p_id: id, p_key: key });
    await bitacora(req, a.email, "VER_PASSWORD", id);
    return NextResponse.json({ ok: true, password: typeof data === "string" ? data : null });
  }
  if (id && sp.get("archivo")) {
    const nombre = String(sp.get("archivo"));
    const { data } = await db.from("fiel_archivos").select("nombre, tipo, contenido").eq("fiel_id", id).eq("nombre", nombre).maybeSingle();
    const f = data as { nombre: string; tipo: string; contenido: string | Uint8Array } | null;
    if (!f) return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    await bitacora(req, a.email, "DESCARGA", id, nombre);
    const raw = typeof f.contenido === "string" ? Buffer.from(f.contenido.replace(/^\\x/, ""), "hex") : Buffer.from(f.contenido);
    return new NextResponse(new Uint8Array(raw), { headers: { "Content-Type": MIME[ext(f.nombre)] || "application/octet-stream", "Content-Disposition": `attachment; filename="${encodeURIComponent(f.nombre)}"`, "Cache-Control": "no-store" } });
  }
  const { data: regs, error } = await db.from("fiel_registros").select("id, tipo, nombre, rfc, empresa, representante, vigencia_desde, vigencia_hasta, serie, correo_sat, notas, created_by, created_at, updated_at, password_enc").eq("activo", true).order("tipo").order("nombre");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: arcs } = await db.from("fiel_archivos").select("fiel_id, nombre, tipo, tamano");
  const porReg = new Map<string, { nombre: string; tipo: string; tamano: number }[]>();
  for (const x of (arcs || []) as { fiel_id: string; nombre: string; tipo: string; tamano: number }[]) porReg.set(x.fiel_id, [...(porReg.get(x.fiel_id) || []), { nombre: x.nombre, tipo: x.tipo, tamano: x.tamano }]);
  const lista = ((regs || []) as Record<string, unknown>[]).map(r => ({ ...r, password_enc: undefined, tiene_password: !!r.password_enc, archivos: porReg.get(String(r.id)) || [] }));
  await bitacora(req, a.email, "LISTA", null);
  return NextResponse.json({ ok: true, lista });
}

type Registro = { tipo: "EMPRESA" | "REPRESENTANTE"; nombre: string; rfc: string; empresa?: string | null; representante?: string | null; vigencia_desde?: string | null; vigencia_hasta?: string | null; serie?: string | null; correo_sat?: string | null; notas?: string | null };
export async function POST(req: NextRequest) {
  const a = await acceso(req); if (!a.ok) return a.res;
  const b = await req.json().catch(() => ({})) as { registro?: Registro; archivos?: { nombre: string; base64: string }[]; password?: string; reemplazar_id?: string };
  const r = b.registro;
  if (!r?.nombre || !r?.rfc || !["EMPRESA", "REPRESENTANTE"].includes(String(r.tipo))) return NextResponse.json({ error: "Faltan tipo, nombre o RFC" }, { status: 400 });
  const archivos = (b.archivos || []).filter(f => f?.nombre && f?.base64 && EXT_OK.has(ext(f.nombre))).slice(0, 12);
  const db = getSupabaseAdmin();
  let id = b.reemplazar_id || null;
  const fila = { tipo: r.tipo, nombre: r.nombre.trim().slice(0, 160), rfc: r.rfc.trim().toUpperCase().slice(0, 13), empresa: r.empresa?.trim() || null, representante: r.representante?.trim() || null, vigencia_desde: r.vigencia_desde || null, vigencia_hasta: r.vigencia_hasta || null, serie: r.serie || null, correo_sat: r.correo_sat || null, notas: r.notas?.slice(0, 1000) || null, updated_at: new Date().toISOString() };
  if (id) {
    const { error } = await db.from("fiel_registros").update(fila).eq("id", id); if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (archivos.length) await db.from("fiel_archivos").delete().eq("fiel_id", id);
  } else {
    const { data, error } = await db.from("fiel_registros").insert({ ...fila, created_by: a.email }).select("id").single();
    if (error || !data) return NextResponse.json({ error: error?.message || "No se pudo guardar" }, { status: 500 });
    id = (data as { id: string }).id;
  }
  for (const f of archivos) {
    const buf = Buffer.from(f.base64, "base64");
    if (buf.length > 5 * 1024 * 1024) continue;
    await db.from("fiel_archivos").insert({ fiel_id: id, nombre: f.nombre.slice(0, 200), tipo: ext(f.nombre), tamano: buf.length, contenido: "\\x" + buf.toString("hex") });
  }
  if (b.password) {
    const key = process.env.PORTALES_CRYPTO_KEY || "";
    if (!key) return NextResponse.json({ error: "Guardado sin contraseña: falta la llave de cifrado en el servidor", id }, { status: 500 });
    await db.rpc("fiel_set_password", { p_id: id, p_pwd: String(b.password), p_key: key });
  }
  await bitacora(req, a.email, b.reemplazar_id ? "RENOVACION" : "ALTA", id);
  return NextResponse.json({ ok: true, id, archivos: archivos.length });
}

export async function DELETE(req: NextRequest) {
  const a = await acceso(req); if (!a.ok) return a.res;
  const id = new URL(req.url).searchParams.get("id"); if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  await getSupabaseAdmin().from("fiel_registros").update({ activo: false, updated_at: new Date().toISOString() }).eq("id", id);
  await bitacora(req, a.email, "BAJA", id);
  return NextResponse.json({ ok: true });
}
