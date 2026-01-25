import { NextRequest, NextResponse } from "next/server";
import Imap from "imap";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json({ valid: false, error: "Credenciales requeridas" }, { status: 400 });
    }

    // Validar dominio primero
    const validDomains = ["gcuavante.com", "jjcrm27.com"];
    const domain = email.split("@")[1]?.toLowerCase();
    
    if (!validDomains.includes(domain)) {
      return NextResponse.json({ valid: false, error: "Dominio no autorizado" }, { status: 401 });
    }

    // Validar credenciales REALES contra Zoho IMAP
    const isValid = await new Promise<boolean>((resolve) => {
      const imap = new Imap({
        user: email,
        password: password,
        host: "imappro.zoho.com",
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 10000,
        authTimeout: 10000,
      });

      imap.once("ready", () => {
        imap.end();
        resolve(true);
      });

      imap.once("error", (err: any) => {
        console.log("IMAP validation error:", err.message);
        imap.end();
        resolve(false);
      });

      imap.connect();
    });

    if (!isValid) {
      return NextResponse.json({ valid: false, error: "Credenciales inválidas" }, { status: 401 });
    }

    // Credenciales válidas
    const response = NextResponse.json({ valid: true });
    response.cookies.set("mailAuth", Buffer.from(JSON.stringify({ email, password })).toString("base64"), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 8
    });
    
    return response;
  } catch (error: any) {
    console.error("Validate error:", error);
    return NextResponse.json({ valid: false, error: error.message }, { status: 500 });
  }
}
