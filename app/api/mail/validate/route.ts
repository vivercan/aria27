import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { createSession, buildSessionCookieHeader } from "@/lib/session";

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(getClientIdentifier(req), { key: "mail:validate", ...RATE_LIMITS.WRITE });
  if (!rl.allowed) return rateLimitResponse(rl);

  let email = "";
  let password = "";
  
  try {
    const body = await req.json().catch(() => ({}));
    email = body.email || "";
    password = body.password || "";
  } catch {

    return NextResponse.json({ valid: false, error: "Datos inválidos" }, { status: 400 });
  }
  
  if (!email || !password) {

    return NextResponse.json({ valid: false, error: "Credenciales requeridas" }, { status: 400 });
  }

  const validDomains = ["gcuavante.com", "jjcrm27.com"];
  const domain = email.split("@")[1]?.toLowerCase() || "";
  
  if (!validDomains.includes(domain)) {

    return NextResponse.json({ valid: false, error: "Dominio no autorizado" }, { status: 401 });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtppro.zoho.com",
      port: 465,
      secure: true,
      auth: { user: email, pass: password },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    const isValid = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {

        resolve(false);
      }, 12000);

      transporter.verify()
        .then(() => {
          clearTimeout(timeout);

          resolve(true);
        })
        .catch((err) => {
          clearTimeout(timeout);

          resolve(false);
        })
        .finally(() => {
          transporter.close();
        });
    });

    if (isValid) {
      // FIX 541.1 24-Jun-2026: crear sesión opaca server-side. Cookie HttpOnly.
      const ua = req.headers.get("user-agent");
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip");
      const session = await createSession({ userEmail: email, userAgent: ua, ip });
      if (!session) {
        return NextResponse.json({ valid: false, error: "Error creando sesion" }, { status: 500 });
      }
      const res = NextResponse.json({ valid: true });
      res.headers.set("Set-Cookie", buildSessionCookieHeader(session.token));
      return res;
    } else {

      return NextResponse.json({ valid: false, error: "Contraseña incorrecta" }, { status: 401 });
    }
  } catch (err: unknown) {

    return NextResponse.json({ valid: false, error: "Error de conexión" }, { status: 500 });
  }
}
