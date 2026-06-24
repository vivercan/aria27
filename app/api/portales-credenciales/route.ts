/**
 * /api/portales-credenciales
 *
 * GET ?portal=blikon              -> Lista de empresas (sin password) para el portal.
 * GET ?portal=blikon&empresa=X    -> Devuelve password + PIN para copiar. Registra accion en audit.
 * POST (body: { credencial_id, accion })  -> Registra acceso (COPY_PASSWORD) en audit.
 *
 * Acceso: solo roles admin, compras, direccion.
 * Hader requerido: x-user-email.
 *
 * 24-Abr-2026 PR feat/portales-facturacion.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireUser, validateApiUser } from "@/lib/auth-api";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const log = logger("PORTALES-CRED");
const ROLES_PERMITIDOS = new Set(["admin", "Administrador", "compras", "direccion"]);

async function assertAccess(req: NextRequest): Promise<{ ok: true; email: string } | { ok: false; res: NextResponse }> {
  // FIX 541.1: identidad SOLO via cookie session opaca. x-user-email YA NO autoriza.
  const auth = await requireUser(req);
  if (!auth.ok) return auth;
  if (!ROLES_PERMITIDOS.has(auth.role)) {
    return { ok: false, res: NextResponse.json({ error: "Forbidden: rol insuficiente" }, { status: 403 }) };
  }
  return { ok: true, email: auth.email };
}

async function logAcceso(params: {
  credencialId: string | null;
  portalKey: string;
  empresa: string | null;
  userEmail: string;
  accion: "VIEW_LIST" | "VIEW_PASSWORD" | "COPY_PASSWORD";
  ip: string | null;
  ua: string | null;
}) {
  try {
    const supa = getSupabaseAdmin();
    await supa.from("portales_accesos_log").insert({
      credencial_id: params.credencialId,
      portal_key: params.portalKey,
      empresa: params.empresa,
      user_email: params.userEmail,
      accion: params.accion,
      ip: params.ip,
      user_agent: params.ua,
    });
  } catch (e: unknown) {
    log.error("No se pudo registrar acceso en portales_accesos_log", { err: (e as Error).message });
  }
}

export async function GET(req: NextRequest) {
  const auth = await assertAccess(req);
  if (!auth.ok) return auth.res;

  const clientId = getClientIdentifier(req, auth.email);
  const rl = checkRateLimit(clientId, { key: "portales-cred:get", ...RATE_LIMITS.READ });
  if (!rl.allowed) return rateLimitResponse(rl);

  const { searchParams } = new URL(req.url);
  const portal = (searchParams.get("portal") || "").toLowerCase().trim();
  const empresa = (searchParams.get("empresa") || "").toUpperCase().trim();
  if (!portal) return NextResponse.json({ error: "portal requerido" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for") || null;
  const ua = req.headers.get("user-agent") || null;
  const supa = getSupabaseAdmin();

  if (empresa) {
    // P-15 (25-Abr-2026): leer password descifrada via RPC pgp_sym_decrypt.
    // La RPC vive en Supabase y usa la KEY de session settings o pasada como param.
    // Si la KEY de env esta presente, descifrar; si no, fallback a password texto plano (transitorio).
    const cryptoKey = process.env.PORTALES_CRYPTO_KEY || "";
    const useCipher = !!cryptoKey;
    const selectCols = useCipher
      ? "id, portal_key, portal_nombre, portal_url, empresa, rfc, usuario, pin, notas, activo, password, password_enc"
      : "id, portal_key, portal_nombre, portal_url, empresa, rfc, usuario, password, pin, notas, activo";
    const { data, error } = await supa
      .from("portales_credenciales")
      .select(selectCols)
      .eq("portal_key", portal)
      .eq("empresa", empresa)
      .eq("activo", true)
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: "Credencial no encontrada" }, { status: 404 });
    }
    const credRow = data as unknown as Record<string, unknown>;
    // Descifrar password si existe password_enc + KEY (P-15 25-Abr-2026)
    if (useCipher && credRow.password_enc) {
      try {
        const { data: dec, error: decErr } = await supa.rpc("decrypt_portal_password", {
          p_id: credRow.id as string,
          p_key: cryptoKey,
        });
        if (!decErr && typeof dec === "string" && dec.length > 0) {
          credRow.password = dec;
        }
      } catch (e: unknown) {
        log.error("Error descifrando password", { err: (e as Error).message });
      }
    }
    // Limpiar campos internos antes de devolver
    delete credRow.password_enc;

    await logAcceso({
      credencialId: credRow.id as string,
      portalKey: portal,
      empresa: credRow.empresa as string,
      userEmail: auth.email,
      accion: "VIEW_PASSWORD",
      ip, ua,
    });
    return NextResponse.json({ ok: true, credencial: credRow });
  }

  // Lista sin password
  const { data, error } = await supa
    .from("portales_credenciales")
    .select("id, portal_key, portal_nombre, portal_url, empresa, rfc, usuario, pin, notas, activo")
    .eq("portal_key", portal)
    .eq("activo", true)
    .order("empresa", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAcceso({
    credencialId: null,
    portalKey: portal,
    empresa: null,
    userEmail: auth.email,
    accion: "VIEW_LIST",
    ip, ua,
  });
  return NextResponse.json({ ok: true, portal, credenciales: data || [] });
}

export async function POST(req: NextRequest) {
  const auth = await assertAccess(req);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => ({}));
  const credencialId = typeof body?.credencial_id === "string" ? body.credencial_id : null;
  const portalKey = typeof body?.portal_key === "string" ? body.portal_key : "unknown";
  const empresa = typeof body?.empresa === "string" ? body.empresa : null;
  const accionRaw = String(body?.accion || "").toUpperCase();
  const accion: "COPY_PASSWORD" | "VIEW_PASSWORD" | "VIEW_LIST" =
    accionRaw === "COPY_PASSWORD" ? "COPY_PASSWORD" :
    accionRaw === "VIEW_PASSWORD" ? "VIEW_PASSWORD" : "VIEW_LIST";

  const ip = req.headers.get("x-forwarded-for") || null;
  const ua = req.headers.get("user-agent") || null;
  await logAcceso({ credencialId, portalKey, empresa, userEmail: auth.email, accion, ip, ua });
  return NextResponse.json({ ok: true });
}
