import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
const log = logger("MAIL-SEND");

export async function POST(req: NextRequest) {
  try {
    const { email, password, to, subject, body, user_email } = await req.json();

    if (!email || !password || !to || !subject) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
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
        { error: "No autorizado â el remitente no es un usuario registrado del sistema" },
        { status: 403 }
      );
    }

    // Validar que el email SMTP coincide con el usuario autenticado
    // (previene uso como relay con credenciales ajenas)
    if (email !== senderUser.email && senderUser.role !== "admin") {
      return NextResponse.json(
        { error: "No autorizado â solo puedes enviar desde tu propio email" },
        { status: 403 }
      );
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
  } catch (error: any) {
    log.error("SMTP Error:", error);
    return NextResponse.json(
      { error: error?.message || "Error al enviar" },
      { status: 500 }
    );
  }
}
