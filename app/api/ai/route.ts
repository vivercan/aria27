import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
const supabase = getSupabaseAdmin();
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

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
        { error: "No autorizado — usuario no registrado", success: false },
        { status: 403 }
      );
    }

    // Rate limit: AI es costoso, 20 requests por 5 min por usuario
    const clientId = getClientIdentifier(request, user_email);
    const rl = checkRateLimit(clientId, { key: "ai:query", ...RATE_LIMITS.EXPENSIVE });
    if (!rl.allowed) {
      return rateLimitResponse(rl);
    }

    // AUTH: Solo roles autorizados pueden usar IA (costo $$)
    const allowedRoles = ["admin", "Administrador", "compras", "direccion"];
    if (!allowedRoles.includes(user.role || "")) {
      return NextResponse.json(
        { error: "No autorizado — rol sin acceso a IA", success: false },
        { status: 403 }
      );
    }

    const aiModel = process.env.AI_MODEL || "gpt-4o-mini";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          {
            role: "system",
            content:
              "Eres un asistente experto en compras y adquisiciones para una empresa constructora. Ayudas a encontrar los mejores proveedores, analizar cotizaciones y optimizar compras. Responde en español y sé conciso.",
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
  } catch (error: unknown) {
    const message = error instanceof Error ? (error as {message?: string})?.message || "Unknown error" : "Error desconocido";
    return NextResponse.json(
      { error: message, success: false },
      { status: 500 }
    );
  }
}
