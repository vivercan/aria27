import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE_NAME = "zoho_creds";
const MAX_AGE = 60 * 60 * 8; // 8 horas (jornada laboral)

/**
 * POST — guardar credenciales Zoho en cookie httpOnly
 * Body: { email, password }
 *
 * DELETE — cerrar sesión de correo (borrar cookie)
 */
export async function POST(req: NextRequest) {
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
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

export async function DELETE() {
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
