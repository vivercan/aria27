import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const COOKIE_NAME = "zoho_creds";
const MAX_AGE = 60 * 60 * 8; // 8 horas (jornada laboral)

/**
 * POST — guardar credenciales Zoho en cookie httpOnly
 * Body: { email, password }
 *
 * DELETE — cerrar sesión de correo (borrar cookie)
 */
export async function POST(req: NextRequest) {
  const clientId = getClientIdentifier(req);
  const rl = checkRateLimit(clientId, { key: "mail:auth", ...RATE_LIMITS.EMAIL });
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email y password requeridos" }, { status: 400 });
    }

    // Codificar en base64 para evitar problemas con caracteres especiales
    const value = Buffer.from(JSON.stringify({ email, password })).toString("base64");

    const res = NextResponse.json({ ok: true, email });
    res.cookies.set(COOKIE_NAME, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: MAX_AGE,
    });
    return res;
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error)?.message || "Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const clientId = getClientIdentifier(req);
  const rl = checkRateLimit(clientId, { key: "mail:auth", ...RATE_LIMITS.EMAIL });
  if (!rl.allowed) return rateLimitResponse(rl);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return res;
}
