/**
 * Público (sin usuario) · el proveedor ve qué se cotiza y sube su cotización · 11-Oct-2026
 * Seguridad: token aleatorio de 192 bits (solo guardamos su hash), vence, se puede desactivar, límite de intentos por IP,
 * archivo revisado por contenido (PDF/JPG/PNG/WEBP, máx 10 MB) y solo se muestra lo necesario (sin precios ni correos internos).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from "@/lib/rate-limit";
import { hashToken, tokenValido, tipoArchivo, MAX_ARCHIVO } from "@/lib/cotizacion-link";
import { avisarWA, personaPorEmail } from "@/lib/actividades-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function enlace(token: string) {
  if (!tokenValido(token)) return null;
  const db = getSupabaseAdmin();
  const { data } = await db.from("enlaces_cotizacion").select("*").eq("token_hash", hashToken(token)).eq("tipo", "COTIZACION").maybeSingle();
  const e = data as { id: string; requisition_id: string; supplier_id: number | null; supplier_name: string; expira: string; activo: boolean; usado_veces: number; creado_por: string } | null;
  if (!e) return null;
  return { db, e, vencido: !e.activo || new Date(e.expira).getTime() < Date.now() };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const rl = checkRateLimit(getClientIdentifier(req), { key: "publico:cotizar:get", max: 30, windowMs: 60_000 }); if (!rl.allowed) return rateLimitResponse(rl);
  const { token } = await ctx.params; const x = await enlace(token);
  if (!x) return NextResponse.json({ error: "Este link no existe. Pide uno nuevo a quien te lo mandó." }, { status: 404 });
  if (x.vencido) return NextResponse.json({ error: "Este link ya venció. Pide uno nuevo a quien te lo mandó." }, { status: 410 });
  const [{ data: r }, { data: items }] = await Promise.all([
    x.db.from("requisitions").select("folio, cost_center_name, required_date").eq("id", x.e.requisition_id).maybeSingle(),
    x.db.from("requisition_items").select("product_name, unit, quantity, comments").eq("requisition_id", x.e.requisition_id).limit(200),
  ]);
  const rr = r as { folio: string; cost_center_name: string | null; required_date: string | null } | null;
  return NextResponse.json({ proveedor: x.e.supplier_name, folio: rr?.folio, obra: rr?.cost_center_name, para: rr?.required_date, vence: x.e.expira, enviadas: x.e.usado_veces, partidas: items || [] });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const rl = checkRateLimit(getClientIdentifier(req), { key: "publico:cotizar:post", max: 6, windowMs: 10 * 60_000 }); if (!rl.allowed) return rateLimitResponse(rl);
  const { token } = await ctx.params; const x = await enlace(token);
  if (!x) return NextResponse.json({ error: "Este link no existe." }, { status: 404 });
  if (x.vencido) return NextResponse.json({ error: "Este link ya venció." }, { status: 410 });
  if (x.e.usado_veces >= 5) return NextResponse.json({ error: "Ya se enviaron 5 cotizaciones con este link. Pide uno nuevo si necesitas corregir." }, { status: 429 });
  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });
  const total = Number(String(fd.get("total") || "").replace(/[$,\s]/g, ""));
  if (!isFinite(total) || total <= 0 || total > 100_000_000) return NextResponse.json({ error: "Escribe el total de tu cotización" }, { status: 400 });
  const archivo = fd.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return NextResponse.json({ error: "Sube tu cotización en PDF o foto" }, { status: 400 });
  if (archivo.size > MAX_ARCHIVO) return NextResponse.json({ error: "El archivo pesa más de 10 MB" }, { status: 400 });
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const t = tipoArchivo(bytes);
  if (!t) return NextResponse.json({ error: "Solo se aceptan PDF, JPG, PNG o WEBP" }, { status: 400 });
  const path = `cotizaciones/${x.e.requisition_id}/${Date.now()}-${x.e.id.slice(0, 8)}.${t.ext}`;
  const { error: upErr } = await x.db.storage.from("expedientes").upload(path, bytes, { contentType: t.tipo, upsert: false });
  if (upErr) return NextResponse.json({ error: "No se pudo guardar el archivo, intenta de nuevo" }, { status: 500 });
  const fileUrl = x.db.storage.from("expedientes").getPublicUrl(path).data.publicUrl;
  const dias = Math.max(0, Math.min(365, Math.round(Number(fd.get("dias_entrega")) || 0)));
  const notas = String(fd.get("notas") || "").slice(0, 1000);
  const forma = String(fd.get("forma_pago") || "").slice(0, 40) || null;
  const factura = String(fd.get("factura") || "") === "si";
  const { error } = await x.db.from("quotations").insert({
    requisition_id: x.e.requisition_id, supplier_id: x.e.supplier_id, supplier_name: x.e.supplier_name, file_url: fileUrl, file_name: (archivo.name || `cotizacion.${t.ext}`).slice(0, 120),
    total, notes: notas || null, dias_entrega: dias || null, forma_pago: forma, emite_factura: factura, estado: "RECIBIDA_PROVEEDOR", created_by: `proveedor-link:${x.e.id}`, fecha: new Date().toISOString().slice(0, 10), enlace_id: x.e.id,
  });
  if (error) return NextResponse.json({ error: "No se pudo registrar, intenta de nuevo" }, { status: 500 });
  await x.db.from("enlaces_cotizacion").update({ usado_veces: x.e.usado_veces + 1, ultimo_uso: new Date().toISOString() }).eq("id", x.e.id);

  // Avisar a quien pidió la cotización y a Compras (los links de prueba "QA …" no avisan a nadie)
  if (!/^QA\b/i.test(x.e.supplier_name)) try {
    const { data: r } = await x.db.from("requisitions").select("folio, cost_center_name").eq("id", x.e.requisition_id).maybeSingle();
    const folio = (r as { folio?: string } | null)?.folio || "";
    const { data: compras } = await x.db.from("users").select("email").eq("role", "compras").eq("active", true);
    const correos = [...new Set([x.e.creado_por, ...((compras || []) as { email: string }[]).map(c => c.email)].map(e => String(e || "").toLowerCase()).filter(Boolean))];
    const monto = total.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
    for (const em of correos) {
      const p = await personaPorEmail(x.db, em);
      await avisarWA(p, `${x.e.supplier_name} mandó su cotización de ${folio} por ${monto}${dias ? `, entrega en ${dias} días` : ""}. Revísala en ARIA27 › Solicitudes.`, "cotizacion-proveedor", "proveedor-link", { title: `💰 Cotización de ${x.e.supplier_name}`, url: `/dashboard/requisiciones/requisiciones/estatus?open=${x.e.requisition_id}`, tag: `cot-${x.e.requisition_id}` });
    }
  } catch { /* aviso best effort */ }
  return NextResponse.json({ ok: true });
}
