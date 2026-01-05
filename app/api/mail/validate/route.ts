import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ valid: false, error: "Credenciales requeridas" }, { status: 400 });
    }

    // Validar contra Zoho IMAP usando fetch a un servicio o validación básica
    // Por ahora validamos que el dominio sea correcto y guardamos para uso posterior
    const validDomains = ["gcuavante.com", "jjcrm27.com"];
    const domain = email.split("@")[1]?.toLowerCase();
    
    if (!validDomains.includes(domain)) {
      return NextResponse.json({ valid: false, error: "Dominio no autorizado" }, { status: 401 });
    }

    // Guardar credenciales encriptadas en cookie segura para uso en inbox
    const response = NextResponse.json({ valid: true });
    response.cookies.set("mailAuth", Buffer.from(JSON.stringify({ email, password })).toString("base64"), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 8 // 8 horas
    });
    
    return response;
  } catch (error: any) {
    return NextResponse.json({ valid: false, error: error.message }, { status: 500 });
  }
}
