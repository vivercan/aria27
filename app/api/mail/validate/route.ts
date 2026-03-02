import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {

  let email = "";
  let password = "";
  
  try {
    const body = await req.json();
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

      return NextResponse.json({ valid: true });
    } else {

      return NextResponse.json({ valid: false, error: "Contraseña incorrecta" }, { status: 401 });
    }
  } catch (err: any) {

    return NextResponse.json({ valid: false, error: "Error de conexión" }, { status: 500 });
  }
}
