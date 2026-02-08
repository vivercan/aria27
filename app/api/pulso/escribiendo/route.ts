import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { conversacion_id, user_email, escribiendo } = await req.json();
    
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
    console.error(error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const convId = req.nextUrl.searchParams.get("conversacion_id");
    const email = req.nextUrl.searchParams.get("email");
    
    if (!convId) return NextResponse.json({ escribiendo: [] });
    
    // Limpiar escribiendo viejo (más de 5 segundos)
    const hace5seg = new Date(Date.now() - 5000).toISOString();
    await supabase.from("pulso_escribiendo").delete().lt("updated_at", hace5seg);
    
    const { data } = await supabase
      .from("pulso_escribiendo")
      .select("user_email")
      .eq("conversacion_id", convId)
      .neq("user_email", email || "");
      
    return NextResponse.json({ escribiendo: data?.map(d => d.user_email) || [] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
