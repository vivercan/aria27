import { NextRequest, NextResponse } from "next/server";
import { verifySession, getSessionTokenFromCookies } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = getSessionTokenFromCookies(req.headers.get("cookie"));
  const session = await verifySession(token);
  if (!session) return NextResponse.json({ error: "no-session" }, { status: 401 });
  const db = getSupabaseAdmin();
  const { data: user } = await db
    .from("users")
    .select("email, role, name, display_name, active, permissions")
    .eq("email", session.email)
    .maybeSingle();
  if (!user || user.active === false) {
    return NextResponse.json({ error: "user-inactive" }, { status: 403 });
  }
  return NextResponse.json({
    email: user.email,
    role: user.role,
    name: (user as { name?: string; display_name?: string }).display_name || (user as { name?: string }).name || user.email,
    permissions: user.permissions ?? {},
  });
}
