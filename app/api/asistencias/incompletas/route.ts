import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET: Obtener asistencias incompletas
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const inicio = searchParams.get("inicio");
    const fin = searchParams.get("fin");

    let query = supabase
      .from("asistencias")
      .select("*, employee:employee_id(full_name, employee_number)")
      .is("hora_salida", null)
      .order("fecha", { ascending: false });

    if (inicio) query = query.gte("fecha", inicio);
    if (fin) query = query.lte("fecha", fin);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      total: data?.length || 0,
      incompletas: data?.map(a => ({
        id: a.id,
        employee_id: a.employee_id,
        empleado: a.employee?.full_name || "Desconocido",
        numero: a.employee?.employee_number || "",
        fecha: a.fecha,
        hora_entrada: a.hora_entrada,
        ubicacion: a.notas || "Sin ubicación"
      })) || []
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Completar salida manualmente
export async function POST(req: NextRequest) {
  try {
    const { asistencia_id, hora_salida, notas } = await req.json();

    if (!asistencia_id || !hora_salida) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("asistencias")
      .update({
        hora_salida,
        notas: notas || "Salida registrada manualmente",
        dentro_geocerca_salida: true // Asumimos válida si es manual
      })
      .eq("id", asistencia_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      mensaje: "Salida registrada correctamente",
      asistencia: data
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Eliminar asistencia incompleta (opcional)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const { error } = await supabase
      .from("asistencias")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, mensaje: "Asistencia eliminada" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
