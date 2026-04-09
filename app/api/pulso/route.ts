import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
const log = logger("PULSO");

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

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");
    if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

    // AUTH: Verificar usuario del sistema
    if (!(await verifyUser(email))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }


    // Obtener conversaciones donde participa el usuario
    const { data: participaciones } = await supabase
      .from("pulso_participantes")
      .select("conversacion_id")
      .eq("user_email", email);

    if (!participaciones?.length) return NextResponse.json({ conversaciones: [] });

    const convIds = participaciones.map(p => p.conversacion_id);

    // Obtener detalles de conversaciones
    const { data: conversaciones } = await supabase
      .from("pulso_conversaciones")
      .select("*")
      .in("id", convIds)
      .order("updated_at", { ascending: false });

    // Para cada conversación, obtener participantes y último mensaje
    const resultado = await Promise.all((conversaciones || []).map(async (conv) => {
      const { data: participantes } = await supabase
        .from("pulso_participantes")
        .select("user_email")
        .eq("conversacion_id", conv.id);

      const { data: ultimoMsg } = await supabase
        .from("pulso_mensajes")
        .select("*")
        .eq("conversacion_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const { count: noLeidos } = await supabase
        .from("pulso_mensajes")
        .select("*", { count: "exact", head: true })
        .eq("conversacion_id", conv.id)
        .neq("sender_email", email)
        .eq("leido", false);

      return {
        ...conv,
        participantes: participantes?.map(p => p.user_email) || [],
        ultimoMensaje: ultimoMsg?.[0] || null,
        noLeidos: noLeidos || 0
      };
    }));

    return NextResponse.json({ conversaciones: resultado });
  } catch (error) {
    log.error("[PULSO]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { participantes, nombre, es_grupo } = await req.json();

    // AUTH: Verificar que al menos el primer participante es usuario del sistema
    const creadorEmail = participantes?.[0];
    if (!creadorEmail || !(await verifyUser(creadorEmail))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    
    if (!participantes?.length) {
      return NextResponse.json({ error: "Participantes requeridos" }, { status: 400 });
    }

    // Para chat 1:1, verificar si ya existe
    if (!es_grupo && participantes.length === 2) {
      const { data: existentes } = await supabase
        .from("pulso_participantes")
        .select("conversacion_id")
        .in("user_email", participantes);

      if (existentes) {
        const conteo: Record<string, number> = {};
        existentes.forEach(e => {
          conteo[e.conversacion_id] = (conteo[e.conversacion_id] || 0) + 1;
        });
        const convExistente = Object.entries(conteo).find(([_, count]) => count === 2);
        if (convExistente) {
          return NextResponse.json({ conversacion_id: convExistente[0], existia: true });
        }
      }
    }

    // Crear nueva conversación
    const { data: conv, error } = await supabase
      .from("pulso_conversaciones")
      .insert({ nombre: nombre || null, es_grupo: es_grupo || false })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error?.message }, { status: 500 });

    // Agregar participantes
    await supabase.from("pulso_participantes").insert(
      participantes.map((email: string) => ({
        conversacion_id: conv.id,
        user_email: email
      }))
    );

    return NextResponse.json({ conversacion_id: conv.id, existia: false });
  } catch (error) {
    log.error("[PULSO]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
