import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Misma función que usa nómina: Jueves a Miércoles
function getWeekRange(date: Date): { inicio: string; fin: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToThursday = day >= 4 ? day - 4 : day + 3;
  const jueves = new Date(d);
  jueves.setDate(d.getDate() - diffToThursday);
  const miercoles = new Date(jueves);
  miercoles.setDate(jueves.getDate() + 6);
  return {
    inicio: jueves.toISOString().split("T")[0],
    fin: miercoles.toISOString().split("T")[0]
  };
}

// GET: Obtener asistencias incompletas Y días sin registro
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fechaRef = searchParams.get("fecha");
    const fecha = fechaRef ? new Date(fechaRef) : new Date();
    const { inicio, fin } = getWeekRange(fecha);
    
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);
    
    // 1. Obtener asistencias sin hora de salida
    const { data: incompletas, error: errInc } = await supabase
      .from("asistencias")
      .select("*, employee:employee_id(full_name, employee_number)")
      .is("hora_salida", null)
      .gte("fecha", inicio)
      .lte("fecha", fin)
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
      .gte("fecha", inicio)
      .lte("fecha", fin);
    
    if (errTodas) throw errTodas;
    
    // 4. Generar lista de días laborables (Lunes a Sábado) dentro del rango
    const diasLaborables: string[] = [];
    const fechaActual = new Date(inicio);
    const fechaFinDate = new Date(fin);
    while (fechaActual <= fechaFinDate) {
      const diaSem = fechaActual.getDay();
      // Solo Lunes(1) a Sábado(6), y que ya hayan pasado
      if (diaSem >= 1 && diaSem <= 6 && fechaActual <= hoy) {
        diasLaborables.push(fechaActual.toISOString().split("T")[0]);
      }
      fechaActual.setDate(fechaActual.getDate() + 1);
    }
    
    // 5. Detectar días sin registro por empleado
    const sinRegistro: any[] = [];
    for (const emp of empleados || []) {
      const asistenciasEmp = todasAsistencias?.filter(a => a.employee_id === emp.id) || [];
      const diasConRegistro = asistenciasEmp.map(a => a.fecha);
      
      for (const dia of diasLaborables) {
        if (!diasConRegistro.includes(dia)) {
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
      periodo: { inicio, fin },
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
        dentro_geocerca_salida: true,
        correccion_manual: true,
        fecha_correccion: new Date().toISOString()
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
        dentro_geocerca_entrada: true,
        dentro_geocerca_salida: true,
        correccion_manual: true,
        fecha_correccion: new Date().toISOString()
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
