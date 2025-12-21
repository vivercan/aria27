import { NextRequest, NextResponse } from "next/server";
import {
  sendRequisicionCreada,
  sendRequisicionValidar,
  sendRequisicionCompras,
  sendCompraAutorizar,
  sendOCGenerada
} from "@/lib/whatsapp";

// GET - Prueba rápida con plantilla requisicion_creada
export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get("phone") || "8112392266";
  
  try {
    const result = await sendRequisicionCreada(
      phone,
      "REQ-TEST-001",
      "JJ Prueba",
      "Oficina Matriz",
      new Date().toLocaleDateString("es-MX")
    );
    
    return NextResponse.json({
      success: result,
      message: result ? "Mensaje enviado - revisa tu WhatsApp" : "Error al enviar",
      phone: phone,
      template: "requisicion_creada"
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// POST - Prueba con cualquier plantilla
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, template, params } = body;
    
    if (!phone || !template) {
      return NextResponse.json({
        error: "Falta phone o template"
      }, { status: 400 });
    }
    
    let result = false;
    
    switch (template) {
      case "requisicion_creada":
        result = await sendRequisicionCreada(phone, params[0], params[1], params[2], params[3]);
        break;
      case "requisicion_validar":
        result = await sendRequisicionValidar(phone, params[0], params[1], params[2], params[3], params[4] || "TOKEN123");
        break;
      case "requisicion_compras":
        result = await sendRequisicionCompras(phone, params[0], params[1], params[2]);
        break;
      case "compra_autorizar":
        result = await sendCompraAutorizar(phone, params[0], params[1], params[2], params[3], params[4] || "TOKEN123");
        break;
      case "oc_generada":
        result = await sendOCGenerada(phone, params[0], params[1], params[2], params[3], params[4]);
        break;
      default:
        return NextResponse.json({ error: "Plantilla no válida" }, { status: 400 });
    }
    
    return NextResponse.json({
      success: result,
      message: result ? "Mensaje enviado" : "Error al enviar",
      phone,
      template
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
