import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { prompt, context, user_email } = await request.json();

    // AUTH: Verificar que el usuario existe en el sistema
    if (!user_email) {
      return NextResponse.json({ error: "user_email requerido", success: false }, { status: 403 });
    }

    const { data: user } = await supabase
      .from("Users")
      .select("email, role")
      .eq("email", user_email)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: "No autorizado â usuario no registrado", success: false },
        { status: 403 }
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Eres un asistente experto en compras y adquisiciones para una empresa constructora. Ayudas a encontrar los mejores proveedores, analizar cotizaciones y optimizar compras. Responde en espaÃ±ol y sÃ© conciso.",
          },
          {
            role: "user",
            content: context ? `Contexto: ${context}\n\n${prompt}` : prompt,
          },
        ],
        max_tokens: 1000,
      }),
    });

    const data = await response.json();

    return NextResponse.json({
      response: data.choices?.[0]?.message?.content || "Sin respuesta",
      success: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, success: false },
      { status: 500 }
    );
  }
}
