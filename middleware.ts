import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Capturar /d{uuid} sin slash - viene de WhatsApp Meta
  if (path.startsWith("/d") && path.length > 3 && !path.startsWith("/dashboard")) {
    const token = path.substring(2);
    const cleanToken = token.replace(/^\//, "");
    return NextResponse.redirect(new URL("/api/requisicion/approve-purchase?token=" + cleanToken, request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/d:path*"],
};
