import { NextRequest, NextResponse } from "next/server";
import { revokeSession, getSessionTokenFromCookies, buildClearCookieHeader } from "@/lib/session";

export async function POST(req: NextRequest) {
  const token = getSessionTokenFromCookies(req.headers.get("cookie"));
  await revokeSession(token, "logout");
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", buildClearCookieHeader());
  return res;
}
