import { NextResponse } from "next/server";

export async function GET() {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    if (!token || !phoneId) return NextResponse.json({ error: "missing creds" }, { status: 500 });
    const r = await fetch(`https://graph.facebook.com/v22.0/${phoneId}?fields=display_phone_number,verified_name,quality_rating,name_status,code_verification_status`, {
          headers: { Authorization: `Bearer ${token}` },
    });
    const data = await r.json();
    return NextResponse.json(data);
}
