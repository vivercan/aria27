/** Activar "entrar con huella o rostro" en este teléfono (requiere sesión) · 11-Oct-2026 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { opcionesRegistro, verificarRegistro } from "@/lib/passkeys";
import { getSupabaseAdmin } from "@/lib/supabase-server";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const b = await req.json().catch(() => ({})) as { paso?: string; retoId?: string; respuesta?: unknown; dispositivo?: string };
  try {
    if (b.paso === "opciones") {
      const { data: u } = await getSupabaseAdmin().from("users").select("name").eq("email", auth.email.toLowerCase()).maybeSingle();
      return NextResponse.json(await opcionesRegistro(req, auth.email, (u as { name?: string } | null)?.name || auth.email));
    }
    if (b.paso === "verificar") {
      const r = await verificarRegistro(req, auth.email, String(b.retoId || ""), b.respuesta as never, String(b.dispositivo || ""));
      return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: 400 });
    }
    return NextResponse.json({ error: "Paso inválido" }, { status: 400 });
  } catch (e) { return NextResponse.json({ error: (e as Error).message || "Error" }, { status: 400 }); }
}
