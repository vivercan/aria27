import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from "@/lib/rate-limit";
const log = logger("PULSO-ESCRIBIENDO");

// AUTH helper: verificar que el email existe en Users
async function verifyUser(email: string | null): Promise<boolean> {
  if (!email) return false;
  const { data } = await supabase
    .from("Users")
    .select("email")
    .eq("email", email)
    .single();
  return !!data;
}

export async function POST(req: NextRequest) {
  // RATE LIMIT: 60 requests per minute (STANDARD tier)
  const clientId = getClientIdentifier(req);
  const rl = checkRateLimit(clientId, { key: "pulso:escribiendo", max: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return rateLimitResponse(rl);
  }

  try {
    const { conversacion_id, user_email, escribiendo } = await req.json();

    // AUTH: Verificar que el user_email es un usuario real del sistema
    if (!user_email || !(await verifyUser(user_email))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (escribiendo) {
      await supabase.from("pulso_escribiendo").upsert({
        conversacion_id,
        user_email,
        updated_at: new Date().toISOString()
      }, { onConflict: "conversacion_id,user_email" });
    } else {
      await supabase.from("pulso_escribiendo")
        .delete()
        .eq("conversacion_id", conversacion_id)
        .eq("user_email", user_email);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    log.error("[PULSO-ESCRIBIENDO]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const convId = req.nextUrl.searchParams.get("conversacion_id");
    const email = req.nextUrl.searchParams.get("email");

    // AUTH: Verificar que quien consulta es un usuario del sistema
    if (!email || !(await verifyUser(email))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (!convId) return NextResponse.json({ escribiendo: [] });

    // Limpiar escribiendo viejo (mas de 5 segundos)
    const hace5seg = new Date(Date.now() - 5000).toISOString();
    await supabase.from("pulso_escribiendo").delete().lt("updated_at", hace5seg);

    const { data } = await supabase
      .from("pulso_escribiendo")
      .select("user_email")
      .eq("conversacion_id", convId)
      .neq("user_email", email || "");

    return NextResponse.json({ escribiendo: data?.map(d => d.user_email) || [] });
  } catch (error) {
    log.error("[PULSO-ESCRIBIENDO]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
