import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const { productos, requisicion_id } = await req.json();
    
    if (!productos || productos.length === 0) {
      return NextResponse.json({ error: "No hay productos para analizar" }, { status: 400 });
    }

    // 1. Obtener proveedores existentes de la base de datos
    const { data: proveedoresDB } = await supabase
      .from("proveedores")
      .select("*")
      .eq("activo", true);

    // 2. Preparar lista de productos para el análisis
    const listaProductos = productos.map((p: any) => 
      `- ${p.nombre || p.product_name} (${p.cantidad || p.quantity} ${p.unidad || p.unit || 'pzas'})`
    ).join("\n");

    // 3. Preparar info de proveedores existentes
    const proveedoresExistentes = proveedoresDB?.map(p => ({
      id: p.id,
      nombre: p.nombre || p.razon_social,
      giro: p.giro || p.categoria,
      telefono: p.telefono,
      email: p.email,
      direccion: p.direccion,
      web: p.sitio_web
    })) || [];

    const infoProveedores = proveedoresExistentes.length > 0 
      ? proveedoresExistentes.map(p => `- ${p.nombre} (${p.giro || 'General'}): Tel ${p.telefono || 'N/A'}`).join("\n")
      : "No hay proveedores registrados en el sistema.";

    // 4. Llamar a Claude con web search para buscar proveedores
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5
        }
      ],
      messages: [
        {
          role: "user",
          content: `Eres un asistente de compras para una constructora en Aguascalientes, México.

PRODUCTOS A COMPRAR:
${listaProductos}

PROVEEDORES YA REGISTRADOS EN NUESTRO SISTEMA:
${infoProveedores}

TAREA:
1. Analiza qué tipo de materiales son (construcción, ferretería, eléctricos, plomería, etc.)
2. De los proveedores registrados, indica cuáles podrían tener estos productos
3. Busca en internet 3-5 proveedores ADICIONALES en Aguascalientes que vendan estos materiales
4. Para cada proveedor encontrado en web, busca: nombre comercial, dirección, teléfono, sitio web

FORMATO DE RESPUESTA (JSON):
{
  "analisis": "Breve análisis de los materiales solicitados",
  "categoria_principal": "construcción|ferretería|eléctrico|plomería|pintura|herramientas|otro",
  "proveedores_internos": [
    {
      "id": "uuid del proveedor",
      "nombre": "nombre",
      "compatibilidad": "alta|media|baja",
      "razon": "por qué puede tener estos productos"
    }
  ],
  "proveedores_web": [
    {
      "nombre": "nombre comercial",
      "direccion": "dirección en Aguascalientes",
      "telefono": "teléfono",
      "sitio_web": "url",
      "productos_relacionados": "qué productos de la lista podrían tener",
      "fuente": "url donde encontraste la info"
    }
  ],
  "recomendacion": "sugerencia de a quién cotizar primero"
}

Responde SOLO con el JSON, sin texto adicional.`
        }
      ]
    });

    // 5. Extraer el texto de la respuesta
    let resultadoTexto = "";
    for (const block of response.content) {
      if (block.type === "text") {
        resultadoTexto += block.text;
      }
    }

    // 6. Parsear JSON de la respuesta
    let resultado;
    try {
      // Limpiar posibles caracteres extra
      const jsonMatch = resultadoTexto.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        resultado = JSON.parse(jsonMatch[0]);
      } else {
        resultado = { 
          analisis: resultadoTexto,
          proveedores_internos: [],
          proveedores_web: [],
          error: "No se pudo parsear respuesta estructurada"
        };
      }
    } catch (e) {
      resultado = { 
        analisis: resultadoTexto,
        proveedores_internos: [],
        proveedores_web: [],
        error: "Error parseando JSON"
      };
    }

    // Historial deshabilitado temporalmente

    return NextResponse.json({
      success: true,
      ...resultado,
      proveedores_bd: proveedoresExistentes
    });

  } catch (error: any) {
    console.error("Error en búsqueda inteligente:", error);
    return NextResponse.json({ 
      error: error.message || "Error en búsqueda",
      success: false 
    }, { status: 500 });
  }
}


