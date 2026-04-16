import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getSupabaseAdmin } from "@/lib/supabase-server";
const supabase = getSupabaseAdmin();
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { getZohoCreds } from "../_zoho-creds";
const log = logger("MAIL-SEND");

export async function POST(req: NextRequest) {
  try {
    const { to, subject, body, user_email } = await req.json().catch(() => ({}));
    const creds = await getZohoCreds();
    if (!creds) {
      return NextResponse.json({ error: "Sesión de correo no activa" }, { status: 401 });
    }
    const { email, password } = creds;
    if (!to || !subject) {
      return NextResponse.json({ error: "Campos requeridos faltantes (to, subject)" }, { status: 400 });
    }

    // AUTH: Verificar que el email del remitente pertenece a un usuario del sistema
    const senderEmail = user_email || email;
    const { data: senderUser } = await supabase
      .from("Users")
      .select("email, role")
      .eq("email", senderEmail)
      .single();

    if (!senderUser) {
      return NextResponse.json(
        { error: "No autorizado â el remitente no es un usuario registrado del sistema" },
        { status: 403 }
      );
    }

    // Validar que el email SMTP coincide con el usuario autenticado
    // (previene uso como relay con credenciales ajenas)
    if (email !== senderUser.email && senderUser.role !== "admin") {
      return NextResponse.json(
        { error: "No autorizado â solo puedes enviar desde tu propio email" },
        { status: 403 }
      );
    }

    // RATE LIMIT: 10 correos por minuto por remitente autenticado (anti-spam)
    const clientId = getClientIdentifier(req, senderUser.email);
    const rl = checkRateLimit(clientId, { key: "mail:send", ...RATE_LIMITS.EMAIL });
    if (!rl.allowed) {
      log.warn("Rate limit excedido", { clientId, retryAfter: rl.retryAfter });
      return rateLimitResponse(rl);
    }

    const transporter = nodemailer.createTransport({
      host: "smtppro.zoho.com",
      port: 465,
      secure: true,
      auth: { user: email, pass: password },
    });

    await transporter.sendMail({
      from: email,
      to: to,
      subject: subject,
      text: body,
      html: body.replace(/\n/g, "<br>"),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    log.error("SMTP Error:", error);
    return NextResponse.json(
      { error: (error as {message?: string})?.message || "Unknown error" || "Error al enviar" },
      { status: 500 }
    );
  }
}
