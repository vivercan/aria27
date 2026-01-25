import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  console.log(">>> VALIDATE API INICIADO");
  
  let email = "";
  let password = "";
  
  try {
    const body = await req.json();
    email = body.email || "";
    password = body.password || "";
  } catch {
    console.log(">>> ERROR: No se pudo leer body");
    return NextResponse.json({ valid: false, error: "Datos inválidos" }, { status: 400 });
  }
  
  if (!email || !password) {
    console.log(">>> ERROR: Email o password vacío");
    return NextResponse.json({ valid: false, error: "Credenciales requeridas" }, { status: 400 });
  }

  const validDomains = ["gcuavante.com", "jjcrm27.com"];
  const domain = email.split("@")[1]?.toLowerCase() || "";
  
  if (!validDomains.includes(domain)) {
    console.log(">>> ERROR: Dominio no válido:", domain);
    return NextResponse.json({ valid: false, error: "Dominio no autorizado" }, { status: 401 });
  }

  console.log(">>> Conectando a Zoho SMTP para:", email);

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
        console.log(">>> TIMEOUT - rechazando");
        resolve(false);
      }, 12000);

      transporter.verify()
        .then(() => {
          clearTimeout(timeout);
          console.log(">>> SMTP verify: EXITOSO");
          resolve(true);
        })
        .catch((err) => {
          clearTimeout(timeout);
          console.log(">>> SMTP verify FALLÓ:", err.message);
          resolve(false);
        })
        .finally(() => {
          transporter.close();
        });
    });

    if (isValid) {
      console.log(">>> RESULTADO FINAL: VÁLIDO");
      return NextResponse.json({ valid: true });
    } else {
      console.log(">>> RESULTADO FINAL: INVÁLIDO");
      return NextResponse.json({ valid: false, error: "Contraseña incorrecta" }, { status: 401 });
    }
  } catch (err: any) {
    console.log(">>> CATCH ERROR:", err.message);
    return NextResponse.json({ valid: false, error: "Error de conexión" }, { status: 500 });
  }
}
