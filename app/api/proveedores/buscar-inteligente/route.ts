import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
const log = logger("BUSCAR-INTELIGENTE");

const supabase = getSupabaseAdmin();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface ProductoItem {
  nombre?: string;
  product_name?: string;
  cantidad?: number;
  quantity?: number;
  unidad?: string;
  unit?: string;
  categoria?: string;
  category?: string;
}

interface ProveedorWeb {
  nombre: string;
  direccion: string;
  telefono: string;
  sitio_web: string | null;
  productos_relacionados: string;
  fuente: string;
}

export async function POST(req: NextRequest) {
  try {
    const { productos, requisicion_id, user_email } = await req.json();

    // Auth check: verificar usuario y rol
    if (!user_email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { data: callerUser } = await supabase.from("Users").select("role").eq("email", user_email).single();
    if (!callerUser || !["admin", "compras", "direccion"].includes(callerUser.role)) {
      return NextResponse.json({ error: "No autorizado para esta acción" }, { status: 403 });
    }

    if (!productos || productos.length === 0) {
      return NextResponse.json({ error: "No hay productos para analizar" }, { status: 400 });
    }

    // 1. Obtener proveedores existentes de la base de datos
    const { data: proveedoresDB } = await supabase
      .from("Proveedores")
      .select("*")
      .eq("status", "ACTIVO");

    // 2. Preparar lista de productos para el análisis
    const listaProductos = productos.map((p: ProductoItem) =>
      `- ${p.nombre || p.product_name} (${p.cantidad || p.quantity} ${p.unidad || p.unit || 'pzas'}) - Categoría: ${p.categoria || p.category || 'General'}`
    ).join("\n");

    // 3. Lista de nombres de proveedores existentes para excluir
    const nombresExistentes = proveedoresDB?.map(p => p.name?.toLowerCase()).filter(Boolean) || [];

    // 4. Llamar a Claude con web search mejorado
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 10
        }
      ],
      messages: [
        {
          role: "user",
          content: `Eres un experto en compras para construcción en Aguascalientes, México. Tu trabajo es encontrar los MEJORES proveedores locales.

PRODUCTOS QUE NECESITO COMPRAR:
${listaProductos}

PROVEEDORES QUE YA TENGO (NO los incluyas en tu respuesta):
${nombresExistentes.join(", ") || "Ninguno"}

INSTRUCCIONES IMPORTANTES:
1. Busca en internet EXACTAMENTE 10 proveedores en Aguascalientes, México que vendan estos materiales
2. Busca en: Google Maps, Páginas Amarillas México, Directorio de empresas Aguascalientes, sitios de proveedores industriales
3. Para CADA proveedor DEBES encontrar:
   - Nombre comercial completo
   - Dirección física en Aguascalientes
   - Teléfono (busca en su página web, Google Maps, o directorios)
   - Sitio web si tiene
4. NO incluyas proveedores que ya tengo en mi lista
5. Prioriza: ferreterías industriales, distribuidores de combustibles, refaccionarias CAT, distribuidores de lubricantes
6. Si un proveedor no tiene teléfono visible, busca más a fondo o busca otro proveedor

BÚSQUEDAS SUGERIDAS:
- "distribuidores diesel Aguascalientes teléfono"
- "lubricantes 15W-40 Aguascalientes distribuidores"
- "refacciones Caterpillar Aguascalientes"
- "ferreterías industriales Aguascalientes directorio"
- "proveedores materiales construcción Aguascalientes"

RESPONDE ÚNICAMENTE CON ESTE JSON (sin texto adicional):
{
  "analisis": "Descripción breve de qué tipo de materiales son y para qué se usan",
  "categoria_principal": "combustibles|lubricantes|refacciones|ferretería|construcción|otro",
  "proveedores_web": [
    {
      "nombre": "NOMBRE COMPLETO DEL NEGOCIO",
      "direccion": "Dirección completa en Aguascalientes",
      "telefono": "Teléfono con lada (449) XXX-XXXX",
      "sitio_web": "https://ejemplo.com o null si no tiene",
      "productos_relacionados": "Qué productos de mi lista podrían tener",
      "fuente": "URL donde encontraste la información"
    }
  ],
  "recomendacion": "A cuáles contactar primero y por qué"
}

IMPORTANTE: Necesito EXACTAMENTE 10 proveedores con información COMPLETA. Si no encuentras teléfono de uno, busca otro proveedor. No me des proveedores incompletos.`
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
      const jsonMatch = resultadoTexto.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        resultado = JSON.parse(jsonMatch[0]);
      } else {
        resultado = { 
          analisis: resultadoTexto,
          proveedores_web: [],
          error: "No se pudo parsear respuesta estructurada"
        };
      }
    } catch (e: unknown) {
      resultado = { 
        analisis: resultadoTexto,
        proveedores_web: [],
        error: "Error parseando JSON"
      };
    }

    // 7. Filtrar proveedores duplicados con los existentes
    if (resultado.proveedores_web && Array.isArray(resultado.proveedores_web)) {
      resultado.proveedores_web = resultado.proveedores_web.filter((p: ProveedorWeb) => {
        const nombreIA = p.nombre?.toLowerCase().trim() || "";
        return !nombresExistentes.some(existente =>
          existente.includes(nombreIA) ||
          nombreIA.includes(existente) ||
          existente === nombreIA
        );
      });
    }

    return NextResponse.json({
      success: true,
      ...resultado,
      total_encontrados: resultado.proveedores_web?.length || 0
    });

  } catch (error: unknown) {
    log.error("Error en búsqueda inteligente:", error);
    return NextResponse.json({ 
      error: (error as {message?: string})?.message || "Unknown error" || "Error en búsqueda",
      success: false 
    }, { status: 500 });
  }
}
