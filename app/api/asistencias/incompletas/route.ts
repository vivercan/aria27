import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET: Obtener asistencias incompletas Y días sin registro
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const inicio = searchParams.get("inicio");
    const fin = searchParams.get("fin");
    
    // Calcular semana actual si no se especifica
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 5); // Lunes a Sábado
    
    const fechaInicio = inicio || inicioSemana.toISOString().split("T")[0];
    const fechaFin = fin || finSemana.toISOString().split("T")[0];
    
    // 1. Obtener asistencias sin hora de salida
    const { data: incompletas, error: errInc } = await supabase
      .from("asistencias")
      .select("*, employee:employee_id(full_name, employee_number)")
      .is("hora_salida", null)
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin)
      .order("fecha", { ascending: false });
    
    if (errInc) throw errInc;
    
    // 2. Obtener empleados activos
    const { data: empleados, error: errEmp } = await supabase
      .from("Personal")
      .select("id, full_name, employee_number, geocerca_libre")
      .eq("status", "ACTIVO");
    
    if (errEmp) throw errEmp;
    
    // 3. Obtener TODAS las asistencias de la semana
    const { data: todasAsistencias, error: errTodas } = await supabase
      .from("asistencias")
      .select("employee_id, fecha")
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin);
    
    if (errTodas) throw errTodas;
    
    // 4. Generar lista de días laborables (Lunes a Sábado)
    const diasLaborables: string[] = [];
    const fecha = new Date(fechaInicio);
    const fechaFinDate = new Date(fechaFin);
    while (fecha <= fechaFinDate) {
      const diaSem = fecha.getDay();
      if (diaSem >= 1 && diaSem <= 6) { // Lunes(1) a Sábado(6)
        diasLaborables.push(fecha.toISOString().split("T")[0]);
      }
      fecha.setDate(fecha.getDate() + 1);
    }
    
    // 5. Detectar días sin registro por empleado
    const sinRegistro: any[] = [];
    for (const emp of empleados || []) {
      const asistenciasEmp = todasAsistencias?.filter(a => a.employee_id === emp.id) || [];
      const diasConRegistro = asistenciasEmp.map(a => a.fecha);
      
      for (const dia of diasLaborables) {
        // Solo incluir días que ya pasaron (no futuros)
        if (new Date(dia) <= hoy && !diasConRegistro.includes(dia)) {
          sinRegistro.push({
            employee_id: emp.id,
            empleado: emp.full_name,
            numero: emp.employee_number,
            fecha: dia,
            tipo: "SIN_REGISTRO"
          });
        }
      }
    }
    
    return NextResponse.json({
      periodo: { inicio: fechaInicio, fin: fechaFin },
      incompletas: incompletas?.map(a => ({
        id: a.id,
        employee_id: a.employee_id,
        empleado: a.employee?.full_name || "Desconocido",
        numero: a.employee?.employee_number || "",
        fecha: a.fecha,
        hora_entrada: a.hora_entrada,
        ubicacion: a.notas || "Sin ubicación",
        tipo: "SIN_SALIDA"
      })) || [],
      sinRegistro,
      resumen: {
        sinSalida: incompletas?.length || 0,
        sinRegistro: sinRegistro.length,
        total: (incompletas?.length || 0) + sinRegistro.length
      }
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
        dentro_geocerca_salida: true
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

// PUT: Crear asistencia completa para día faltante
export async function PUT(req: NextRequest) {
  try {
    const { employee_id, fecha, hora_entrada, hora_salida } = await req.json();
    
    if (!employee_id || !fecha) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }
    
    const { data, error } = await supabase
      .from("asistencias")
      .insert({
        employee_id,
        fecha,
        hora_entrada: hora_entrada || "08:00:00",
        hora_salida: hora_salida || "18:00:00",
        tipo_registro: "MANUAL",
        notas: "Asistencia creada manualmente - día sin registro",
        dentro_geocerca: true,
        dentro_geocerca_salida: true
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      mensaje: "Asistencia creada correctamente",
      asistencia: data
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Eliminar asistencia
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
