import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { email, password, to, subject, body } = await req.json();

    if (!email || !password || !to || !subject) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
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
    console.error("SMTP Error:", error);
    return NextResponse.json({ error: error.message || "Error al enviar" }, { status: 500 });
  }
}
