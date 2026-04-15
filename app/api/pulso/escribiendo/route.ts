import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
const db = getSupabaseAdmin();
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
const log = logger("PULSO-ESCRIBIENDO");

// AUTH helper: verificar que el email existe en Users
async function verifyUser(email: string | null): Promise<boolean> {
  if (!email) return false;
  const { data } = await db
    .from("Users")
    .select("email")
    .eq("email", email)
    .single();
  return !!data;
}

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(getClientIdentifier(req), { key: "pulso:escribiendo", ...RATE_LIMITS.CHAT });
    if (!rl.allowed) return rateLimitResponse(rl);

    const { conversacion_id, user_email, escribiendo } = await req.json();

    // AUTH: Verificar que el user_email es un usuario real del sistema
    if (!user_email || !(await verifyUser(user_email))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (escribiendo) {
      const { error: err1 } = await db.from("pulso_escribiendo").upsert({
        conversacion_id,
        user_email,
        updated_at: new Date().toISOString()
      }, { onConflict: "conversacion_id,user_email" });
      if (err1) log.error("upsert pulso_escribiendo failed", { error: err1.message });
    } else {
      const { error: err2 } = await db.from("pulso_escribiendo")
        .delete()
        .eq("conversacion_id", conversacion_id)
        .eq("user_email", user_email);
      if (err2) log.error("delete pulso_escribiendo failed", { error: err2.message });
    }
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    log.error("[PULSO-ESCRIBIENDO]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(getClientIdentifier(req), { key: "pulso:escribiendo", ...RATE_LIMITS.CHAT });
    if (!rl.allowed) return rateLimitResponse(rl);

    const convId = req.nextUrl.searchParams.get("conversacion_id");
    const email = req.nextUrl.searchParams.get("email");

    // AUTH: Verificar que quien consulta es un usuario del sistema
    if (!email || !(await verifyUser(email))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (!convId) return NextResponse.json({ escribiendo: [] });

    // Limpiar escribiendo viejo (mas de 5 segundos)
    const hace5seg = new Date(Date.now() - 5000).toISOString();
    const { error: errClean } = await db.from("pulso_escribiendo").delete().lt("updated_at", hace5seg);
    if (errClean) log.error("delete stale pulso_escribiendo failed", { error: errClean.message });

    const { data } = await db
      .from("pulso_escribiendo")
      .select("user_email")
      .eq("conversacion_id", convId)
      .neq("user_email", email || "");

    return NextResponse.json({ escribiendo: data?.map(d => d.user_email) || [] });
  } catch (error: unknown) {
    log.error("[PULSO-ESCRIBIENDO]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
