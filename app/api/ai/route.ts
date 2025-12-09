import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { prompt, context } = await request.json();
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Eres un asistente experto en compras y adquisiciones para una empresa constructora. Ayudas a encontrar los mejores proveedores, analizar cotizaciones y optimizar compras. Responde en español y sé conciso." },
          { role: "user", content: context ? `Contexto: ${context}\n\n${prompt}` : prompt }
        ],
        max_tokens: 1000
      })
    });

    const data = await response.json();
    return NextResponse.json({ 
      response: data.choices?.[0]?.message?.content || "Sin respuesta",
      success: true 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, success: false }, { status: 500 });
  }
}
