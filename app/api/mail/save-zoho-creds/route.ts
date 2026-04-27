import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const log = logger("SAVE-ZOHO-CREDS");

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(getClientIdentifier(req), { key: "mail:save-creds", ...RATE_LIMITS.WRITE });
    if (!rl.allowed) return rateLimitResponse(rl);

    const userEmail = (req.headers.get("x-user-email") || "").toLowerCase().trim();
    if (!userEmail) return NextResponse.json({ error: "x-user-email requerido" }, { status: 401 });

    const { zoho_email, zoho_password } = await req.json().catch(() => ({}));
    if (!zoho_email || !zoho_password) return NextResponse.json({ error: "zoho_email y zoho_password requeridos" }, { status: 400 });

    const cryptoKey = process.env.PORTALES_CRYPTO_KEY;
    if (!cryptoKey) {
      log.error("PORTALES_CRYPTO_KEY env var ausente");
      return NextResponse.json({ error: "Configuracion del servidor incompleta" }, { status: 500 });
    }

    const sb = getSupabaseAdmin();
    const { data, error } = await sb.rpc("set_user_zoho_creds", {
      p_email: userEmail,
      p_zoho_email: zoho_email,
      p_zoho_password: zoho_password,
      p_key: cryptoKey,
    });

    if (error) {
      log.error("RPC set_user_zoho_creds fallo", { err: error.message, user: userEmail });
      return NextResponse.json({ error: "Error al guardar: " + error.message }, { status: 500 });
    }
    if (!data) {
      log.warn("Usuario no encontrado en public.users", { user: userEmail });
      return NextResponse.json({ error: "Usuario no registrado en el sistema" }, { status: 404 });
    }

    log.info("Credenciales Zoho guardadas", { user: userEmail, zoho: zoho_email });
    return NextResponse.json({ ok: true, zoho_email });
  } catch (e: unknown) {
    log.error("Excepcion en save-zoho-creds", { err: (e as Error).message });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const userEmail = (req.headers.get("x-user-email") || "").toLowerCase().trim();
  if (!userEmail) return NextResponse.json({ error: "x-user-email requerido" }, { status: 401 });
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from("users").select("zoho_email, zoho_password_encrypted, zoho_creds_updated_at").ilike("email", userEmail).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    configured: !!data?.zoho_password_encrypted,
    zoho_email: data?.zoho_email || null,
    updated_at: data?.zoho_creds_updated_at || null,
  });
}
