import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json({ valid: false, error: "Credenciales requeridas" }, { status: 400 });
    }

    const validDomains = ["gcuavante.com", "jjcrm27.com"];
    const domain = email.split("@")[1]?.toLowerCase();
    
    if (!validDomains.includes(domain)) {
      return NextResponse.json({ valid: false, error: "Dominio no autorizado" }, { status: 401 });
    }

    // Validar contra Zoho SMTP
    const isValid = await new Promise<boolean>((resolve) => {
      const transporter = nodemailer.createTransport({
        host: "smtppro.zoho.com",
        port: 465,
        secure: true,
        auth: { user: email, pass: password },
        connectionTimeout: 10000,
      });

      transporter.verify((error) => {
        transporter.close();
        resolve(!error);
      });

      setTimeout(() => resolve(false), 15000);
    });

    if (!isValid) {
      return NextResponse.json({ valid: false, error: "Contraseña incorrecta" }, { status: 401 });
    }

    return NextResponse.json({ valid: true });
  } catch (error: any) {
    return NextResponse.json({ valid: false, error: "Error de validación" }, { status: 500 });
  }
}
