import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const AUTHORIZED_ROLES = ["admin", "rh", "compras", "almacen"];

interface CheckAuthBody {
  user_email?: unknown;
  [key: string]: unknown;
}

interface SinRegistroRecord {
  employee_id: number;
  empleado: string;
  numero: string;
  fecha: string;
  tipo: string;
}

// AUTH helper
async function checkAuth(req: NextRequest, body?: CheckAuthBody): Promise<{ authorized: boolean; role?: string; error?: string }> {
  const email = body?.user_email || req.nextUrl.searchParams.get("user_email");
  if (!email) return { authorized: false, error: "user_email requerido" };

  const { data: user } = await supabase
    .from("Users")
    .select("role")
    .eq("email", email)
    .single();

  if (!user || !AUTHORIZED_ROLES.includes(user.role)) {
    return { authorized: false, error: "No autorizado para gestionar asistencias" };
  }

  return { authorized: true, role: user.role };
}

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
    fin: miercoles.toISOString().split("T")[0],
  };
}

// GET: Obtener asistencias incompletas Y días sin registro
export async function GET(req: NextRequest) {
  try {
    // AUTH CHECK
    const auth = await checkAuth(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 403 });
    }

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
      .select("id, full_name, employee_number")
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
      if (diaSem >= 1 && diaSem <= 6 && fechaActual <= hoy) {
        diasLaborables.push(fechaActual.toISOString().split("T")[0]);
      }
      fechaActual.setDate(fechaActual.getDate() + 1);
    }

    // 5. Detectar días sin registro por empleado
    const sinRegistro: SinRegistroRecord[] = [];
    for (const emp of empleados || []) {
      const asistenciasEmp =
        todasAsistencias?.filter((a) => a.employee_id === emp.id) || [];
      const diasConRegistro = asistenciasEmp.map((a) => a.fecha);
      for (const dia of diasLaborables) {
        if (!diasConRegistro.includes(dia)) {
          sinRegistro.push({
            employee_id: emp.id,
            empleado: emp.full_name,
            numero: emp.employee_number,
            fecha: dia,
            tipo: "SIN_REGISTRO",
          });
        }
      }
    }

    return NextResponse.json({
      periodo: { inicio, fin },
      incompletas:
        incompletas?.map((a) => ({
          id: a.id,
          employee_id: a.employee_id,
          empleado: a.employee?.full_name || "Desconocido",
          numero: a.employee?.employee_number || "",
          fecha: a.fecha,
          hora_entrada: a.hora_entrada,
          ubicacion: a.notas || "Sin ubicación",
          tipo: "SIN_SALIDA",
        })) || [],
      sinRegistro,
      resumen: {
        sinSalida: incompletas?.length || 0,
        sinRegistro: sinRegistro.length,
        total: (incompletas?.length || 0) + sinRegistro.length,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as {message?: string})?.message || "Unknown error" }, { status: 500 });
  }
}

// POST: Completar salida manualmente
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // AUTH CHECK
    const auth = await checkAuth(req, body);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 403 });
    }

    const { asistencia_id, hora_salida, notas } = body;

    if (!asistencia_id || !hora_salida) {
      return NextResponse.json(
        { error: "Faltan datos requeridos" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("asistencias")
      .update({
        hora_salida,
        notas: notas || "Salida registrada manualmente",
        dentro_geocerca_salida: false, // FIX: No falsificar verificación de ubicación
        correccion_manual: true,
        fecha_correccion: new Date().toISOString(),
      })
      .eq("id", asistencia_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      mensaje: "Salida registrada correctamente",
      asistencia: data,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as {message?: string})?.message || "Unknown error" }, { status: 500 });
  }
}

// PUT: Crear asistencia completa para día faltante
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    // AUTH CHECK
    const auth = await checkAuth(req, body);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 403 });
    }

    const { employee_id, fecha, hora_entrada, hora_salida } = body;

    if (!employee_id || !fecha) {
      return NextResponse.json(
        { error: "Faltan datos requeridos" },
        { status: 400 }
      );
    }

    // FIX: Obtener horarios reales del empleado en vez de hardcodear 08:00/18:00
    let entradaReal = hora_entrada || "08:00:00";
    let salidaReal = hora_salida || "18:00:00";

    if (!hora_entrada || !hora_salida) {
      const { data: emp } = await supabase
        .from("Personal")
        .select("hora_entrada, hora_salida")
        .eq("id", employee_id)
        .single();

      if (emp) {
        entradaReal = hora_entrada || emp.hora_entrada || "08:00:00";
        salidaReal = hora_salida || emp.hora_salida || "18:00:00";
      }
    }

    const { data, error } = await supabase
      .from("asistencias")
      .insert({
        employee_id,
        fecha,
        hora_entrada: entradaReal,
        hora_salida: salidaReal,
        tipo_registro: "MANUAL",
        notas: "Asistencia creada manualmente - día sin registro",
        dentro_geocerca_entrada: false, // FIX: No falsificar ubicación
        dentro_geocerca_salida: false,   // FIX: No falsificar ubicación
        correccion_manual: true,
        fecha_correccion: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      mensaje: "Asistencia creada correctamente",
      asistencia: data,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as {message?: string})?.message || "Unknown error" }, { status: 500 });
  }
}

// DELETE: Eliminar asistencia
export async function DELETE(req: NextRequest) {
  try {
    // AUTH CHECK - solo admin y rh pueden eliminar
    const auth = await checkAuth(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 403 });
    }

    // Solo admin y rh pueden eliminar registros de asistencia
    if (auth.role !== "admin" && auth.role !== "rh") {
      return NextResponse.json(
        { error: "Solo admin y RH pueden eliminar asistencias" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const { error } = await supabase.from("asistencias").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, mensaje: "Asistencia eliminada" });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as {message?: string})?.message || "Unknown error" }, { status: 500 });
  }
}
