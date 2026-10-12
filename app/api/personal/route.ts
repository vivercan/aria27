/**
 * /api/personal — datos completos del personal (NSS, CURP, RFC, cuentas, salarios) SOLO por servidor · 12-Oct-2026 · JJ
 * Antes las pantallas los leían directo de la base con la llave pública: cualquiera con conocimientos técnicos podía sacarlos.
 * Ahora la llave pública solo ve datos de directorio (nombre, puesto, obra) y lo sensible pasa por aquí, con sesión y permiso de Talento.
 *
 * GET  ?campos=id,full_name,...&status=ACTIVO&ids=a,b&orden=full_name&asc=1
 * POST { accion: "insertar" | "actualizar", id?, datos }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { canAccessModule, canAccessSub, type UserPermissions } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const COLUMNAS = ["id", "employee_number", "full_name", "position", "project_site", "department", "salary_monthly", "email", "status", "expediente_status", "whatsapp",
  "salario_diario", "tipo_nomina", "hora_entrada", "hora_salida", "dias_laborales", "centro_trabajo_id", "banco", "clabe", "numero_cuenta", "fecha_ingreso", "fecha_baja",
  "nss", "curp", "rfc", "empresa_id", "motivo_baja", "salario_semanal", "minimo_tarjeta", "geocerca_libre", "usuario_email", "tipo_contrato"];
const ESCRIBIBLES = COLUMNAS.filter(c => c !== "id");

async function permisos(email: string): Promise<{ role: string; perms: UserPermissions } | null> {
  const { data } = await getSupabaseAdmin().from("users").select("role, permissions, active").eq("email", email.toLowerCase()).maybeSingle();
  const u = data as { role?: string; permissions?: UserPermissions | null; active?: boolean | null } | null;
  if (!u || u.active === false) return null;
  return { role: String(u.role || ""), perms: (u.permissions || {}) as UserPermissions };
}
// Solo quien tiene pantallas de Talento con datos sensibles (no basta con Asistencias)
const SUBS_SENSIBLES = ["personal", "nomina", "finiquitos", "legales", "prestaciones", "matriz"];
const puedeLeer = (p: { role: string; perms: UserPermissions }) =>
  ["admin", "Administrador", "rh"].includes(p.role) || (canAccessModule(p.role, p.perms, "talento") && SUBS_SENSIBLES.some(s => canAccessSub(p.role, p.perms, "talento", s)));
const puedeEscribir = (p: { role: string; perms: UserPermissions }) =>
  ["admin", "Administrador", "rh"].includes(p.role) || ["personal", "finiquitos", "legales"].some(s => canAccessSub(p.role, p.perms, "talento", s));

export async function GET(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const p = await permisos(auth.email); if (!p || !puedeLeer(p)) return NextResponse.json({ error: "Sin permiso para ver datos del personal" }, { status: 403 });
  const sp = req.nextUrl.searchParams;
  const pedidas = (sp.get("campos") || "*").split(",").map(s => s.trim()).filter(Boolean);
  const campos = pedidas.includes("*") ? COLUMNAS : pedidas.filter(c => COLUMNAS.includes(c));
  if (!campos.length) return NextResponse.json({ error: "Campos no válidos" }, { status: 400 });
  let q = getSupabaseAdmin().from("employees").select(campos.join(","));
  const st = sp.get("status"); if (st) q = q.eq("status", st);
  const ids = (sp.get("ids") || "").split(",").filter(x => /^[0-9a-f-]{36}$/i.test(x)); if (ids.length) q = q.in("id", ids.slice(0, 1000));
  const orden = sp.get("orden"); if (orden && COLUMNAS.includes(orden)) q = q.order(orden, { ascending: sp.get("asc") !== "0" });
  const { data, error } = await q.limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const p = await permisos(auth.email); if (!p || !puedeEscribir(p)) return NextResponse.json({ error: "Sin permiso para modificar el personal" }, { status: 403 });
  let b: { accion?: string; id?: string; datos?: Record<string, unknown> };
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos" }, { status: 400 }); }
  const datos: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(b.datos || {})) if (ESCRIBIBLES.includes(k)) datos[k] = v;
  if (!Object.keys(datos).length) return NextResponse.json({ error: "Sin datos para guardar" }, { status: 400 });
  const db = getSupabaseAdmin();
  if (b.accion === "insertar") {
    const { data, error } = await db.from("employees").insert(datos).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, id: (data as { id: string }).id });
  }
  if (b.accion === "actualizar" && b.id && /^[0-9a-f-]{36}$/i.test(b.id)) {
    const { error } = await db.from("employees").update(datos).eq("id", b.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}
