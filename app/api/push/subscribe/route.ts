/** POST /api/push/subscribe — guarda la suscripcion del telefono; DELETE la quita · 10-Oct-2026 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const b = await req.json().catch(() => ({})) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!b.endpoint || !/^https:\/\//.test(b.endpoint) || !b.keys?.p256dh || !b.keys?.auth) return NextResponse.json({ error: "Suscripcion invalida" }, { status: 400 });
  const { error } = await getSupabaseAdmin().from("push_subscriptions").upsert({ user_email: auth.email.toLowerCase(), endpoint: b.endpoint, p256dh: b.keys.p256dh, auth: b.keys.auth, user_agent: (req.headers.get("user-agent") || "").slice(0, 200), fallos: 0 }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const b = await req.json().catch(() => ({})) as { endpoint?: string };
  if (b.endpoint) await getSupabaseAdmin().from("push_subscriptions").delete().eq("endpoint", b.endpoint).ilike("user_email", auth.email);
  return NextResponse.json({ ok: true });
}
