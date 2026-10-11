/** POST /api/push/test — manda una notificacion de prueba a mis propios telefonos · 10-Oct-2026 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { pushAEmail } from "@/lib/push";

export async function POST(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const n = await pushAEmail(auth.email, { title: "ARIA27 ✅", body: "Las notificaciones de tu teléfono ya están activas.", url: "/dashboard/campo", tag: "prueba" });
  return NextResponse.json({ ok: n > 0, enviados: n });
}
