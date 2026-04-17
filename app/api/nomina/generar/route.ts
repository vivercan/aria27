import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
const log = logger("NOMINA-GENERAR");

const supabase = getSupabaseAdmin();

interface IncidenciaRecord {
  empleado: string;
  diasTrabajados: number;
  diasIncompletos: number;
  diasFalta: number;
  detalle: Array<{ fecha: string; entrada: string | null; salida: string | null }>;
}

function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeekRange(date: Date): { inicio: string; fin: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToFriday = day >= 5 ? day - 5 : day + 2;
  const viernes = new Date(d);
  viernes.setDate(d.getDate() - diffToFriday);
  const jueves = new Date(viernes);
  jueves.setDate(viernes.getDate() + 6);
  return {
    inicio: viernes.toISOString().split("T")[0],
    fin: jueves.toISOString().split("T")[0]
  };
}

export async function POST(req: NextRequest) {
  try {
  // AUTH CHECK - acepta Bearer (legacy) o x-user-email validado contra public.users
  let userEmail: string | null = null;
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user } } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));
    if (user?.email) userEmail = user.email;
  }
  if (!userEmail) {
    const hdrEmail = req.headers.get("x-user-email");
    if (hdrEmail) {
      const { data: u } = await supabase.from("users").select("email,active").eq("email", hdrEmail).maybeSingle();
      if (u && u.active !== false) userEmail = u.email;
    }
  }
  if (!userEmail) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // RATE LIMIT: operacion costosa (genera nomina completa) — 20 por 5 min por usuario
  const clientId = getClientIdentifier(req, userEmail);
  const rl = checkRateLimit(clientId, { key: "nomina:generar", ...RATE_LIMITS.EXPENSIVE });
  if (!rl.allowed) {
    log.warn("Rate limit excedido", { clientId, retryAfter: rl.retryAfter });
    return rateLimitResponse(rl);
  }

    const { fechaReferencia, forzar } = await req.json().catch(() => ({}));
    const fecha = fechaReferencia ? new Date(fechaReferencia) : new Date();
    const semana = getWeekNumber(fecha);
    const anio = fecha.getFullYear();
    const { inicio, fin } = getWeekRange(fecha);

    // Obtener modo de nómina
    const { data: configModo } = await supabase
      .from("configuracion_nomina")
      .select("valor")
      .eq("clave", "modo_nomina")
      .single();
    
    const modoNomina = configModo?.valor || "ONBOARDING";

    // Si forzar=true, eliminar nómina existente para regenerar
    if (forzar) {
      await supabase
        .from("nomina_historico")
        .delete()
        .eq("semana", semana)
        .eq("anio", anio);
    } else {
      const { data: existente } = await supabase
        .from("nomina_historico")
        .select("id")
        .eq("semana", semana)
        .eq("anio", anio)
        .limit(1);

      if (existente && existente.length > 0) {
        return NextResponse.json({
          error: `Ya existe nómina para semana ${semana} del ${anio}. Use forzar=true para regenerar.`,
          semana, anio, inicio, fin
        }, { status: 400 });
      }
    }

    // Obtener empleados activos de Personal (sincronizado con employees)
    const { data: empleados, error: empError } = await supabase
      .from("Personal")
      .select("*")
      .eq("status", "ACTIVO");

    if (empError) throw empError;

    // Obtener TODAS las asistencias del periodo
    const { data: todasAsistencias } = await supabase
      .from("asistencias")
      .select("*, employee:employee_id(full_name)")
      .gte("fecha", inicio)
      .lte("fecha", fin);

    // Separar completas e incompletas
    const asistenciasIncompletas = todasAsistencias?.filter(a => !a.hora_salida || !a.hora_entrada) || [];
    const asistenciasCompletas = todasAsistencias?.filter(a => a.hora_entrada && a.hora_salida) || [];

    // Obtener configuración
    const { data: config } = await supabase.from("configuracion_nomina").select("*");
    const getConfig = (clave: string, def: number) => {
      const c = config?.find(x => x.clave === clave);
      return c ? parseFloat(c.valor) : def;
    };
    const factorDoble = getConfig("factor_hora_extra_doble", 2);
    const minimoTarjeta = getConfig("minimo_tarjeta_default", 1096);
    const diasLaborables = 6; // Lunes a Sábado

    const nominasGeneradas = [];
    const incidenciasPorEmpleado: IncidenciaRecord[] = [];

    for (const emp of empleados || []) {
      const asistenciasEmp = asistenciasCompletas.filter(a => a.employee_id === emp.id);
      const incompletasEmp = asistenciasIncompletas.filter(a => a.employee_id === emp.id);
      
      // Obtener préstamos activos
      const { data: prestamos } = await supabase
        .from("prestamos")
        .select("descuento_semanal")
        .eq("employee_id", emp.id)
        .eq("status", "ACTIVO");

      const diasTrabajados = asistenciasEmp.length;
      const diasIncompletos = incompletasEmp.length;
      const horasExtra = asistenciasEmp.reduce((sum, a) => sum + (a.horas_extra || 0), 0);
      const salarioDiario = emp.salario_diario || 0;
      const salarioSemanal = emp.salario_semanal || (salarioDiario * 7);
      
      // LÓGICA DE PAGO SEGÚN MODO
      let salarioBase: number;
      let diasFalta = 0;
      
      if (modoNomina === "ONBOARDING") {
        // ONBOARDING: Paga salario semanal completo sin importar faltas
        salarioBase = salarioSemanal;
      } else {
        // ESTRICTO: Descuenta faltas
        diasFalta = Math.max(0, diasLaborables - diasTrabajados);
        salarioBase = salarioSemanal - (salarioDiario * diasFalta);
      }

      const pagoHorasExtra = horasExtra * (salarioDiario / 8) * factorDoble;
      const totalPercepciones = salarioBase + pagoHorasExtra;
      const prestamoDescuento = prestamos?.reduce((sum, p) => sum + (p.descuento_semanal || 0), 0) || 0;
      const totalDeducciones = prestamoDescuento;
      const sueldoNeto = totalPercepciones - totalDeducciones;
      const pagoTarjetaEmp = emp.minimo_tarjeta || minimoTarjeta;
      const pagoTarjeta = Math.min(sueldoNeto, pagoTarjetaEmp);
      const pagoEfectivo = Math.max(0, sueldoNeto - pagoTarjeta);

      // Registrar incidencias
      if (diasIncompletos > 0 || diasTrabajados < diasLaborables) {
        incidenciasPorEmpleado.push({
          empleado: emp.full_name,
          diasTrabajados,
          diasIncompletos,
          diasFalta: diasLaborables - diasTrabajados - diasIncompletos,
          detalle: incompletasEmp.map(a => ({ fecha: a.fecha, entrada: a.hora_entrada, salida: a.hora_salida }))
        });
      }

      const nomina = {
        employee_id: emp.id,
        semana,
        anio,
        fecha_inicio: inicio,
        fecha_fin: fin,
        nombre: emp.full_name,
        puesto: emp.position,
        obra: emp.project_site || emp.work_center?.name || "Sin asignar",
        dias_trabajados: diasTrabajados,
        dias_incompletos: diasIncompletos,
        dias_falta: diasFalta,
        horas_extra: horasExtra,
        salario_diario: salarioDiario,
        salario_semanal: salarioSemanal,
        salario_base: salarioBase,
        pago_horas_extra: pagoHorasExtra,
        bonos: 0,
        total_percepciones: totalPercepciones,
        prestamo_descuento: prestamoDescuento,
        otras_deducciones: 0,
        total_deducciones: totalDeducciones,
        sueldo_neto: sueldoNeto,
        pago_tarjeta: pagoTarjeta,
        pago_efectivo: pagoEfectivo,
        status: "GENERADA",
        modo_calculo: modoNomina
      };

      nominasGeneradas.push(nomina);
    }

    // Insertar en nomina_historico
    const { error: insertError } = await supabase
      .from("nomina_historico")
      .insert(nominasGeneradas);

    if (insertError) throw insertError;

    const totales = {
      empleados: nominasGeneradas.length,
      bruto: nominasGeneradas.reduce((s, n) => s + n.total_percepciones, 0),
      deducciones: nominasGeneradas.reduce((s, n) => s + n.total_deducciones, 0),
      neto: nominasGeneradas.reduce((s, n) => s + n.sueldo_neto, 0),
      tarjeta: nominasGeneradas.reduce((s, n) => s + n.pago_tarjeta, 0),
      efectivo: nominasGeneradas.reduce((s, n) => s + n.pago_efectivo, 0)
    };

    return NextResponse.json({
      success: true,
      semana,
      anio,
      periodo: `${inicio} al ${fin}`,
      modoNomina,
      totales,
      registros: nominasGeneradas.length,
      incidencias: incidenciasPorEmpleado.length > 0 ? {
        total: incidenciasPorEmpleado.length,
        detalle: incidenciasPorEmpleado
      } : null
    });

  } catch (error: unknown) {
    log.error("Error generando nómina:", error);
    return NextResponse.json({ error: (error as {message?: string})?.message || "Unknown error" }, { status: 500 });
  }
}

// GET para consultar incidencias sin generar
export async function GET(req: NextRequest) {
  try {
  // AUTH CHECK - acepta Bearer (legacy) o x-user-email validado contra public.users
  let userEmail: string | null = null;
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user } } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));
    if (user?.email) userEmail = user.email;
  }
  if (!userEmail) {
    const hdrEmail = req.headers.get("x-user-email");
    if (hdrEmail) {
      const { data: u } = await supabase.from("users").select("email,active").eq("email", hdrEmail).maybeSingle();
      if (u && u.active !== false) userEmail = u.email;
    }
  }
  if (!userEmail) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

    const { searchParams } = new URL(req.url);
    const fechaRef = searchParams.get("fecha");
    const fecha = fechaRef ? new Date(fechaRef) : new Date();
    const semana = getWeekNumber(fecha);
    const anio = fecha.getFullYear();
    const { inicio, fin } = getWeekRange(fecha);

    // Obtener modo
    const { data: configModo } = await supabase
      .from("configuracion_nomina")
      .select("valor")
      .eq("clave", "modo_nomina")
      .single();

    // Obtener empleados
    const { data: empleados } = await supabase
      .from("Personal")
      .select("id, full_name")
      .eq("status", "ACTIVO");

    // Obtener asistencias
    const { data: asistencias } = await supabase
      .from("asistencias")
      .select("employee_id, fecha, hora_entrada, hora_salida")
      .gte("fecha", inicio)
      .lte("fecha", fin);

    const diasLaborables = 6;
    const incidencias: IncidenciaRecord[] = [];

    for (const emp of empleados || []) {
      const asistEmp = asistencias?.filter(a => a.employee_id === emp.id) || [];
      const completas = asistEmp.filter(a => a.hora_entrada && a.hora_salida);
      const incompletas = asistEmp.filter(a => !a.hora_entrada || !a.hora_salida);

      if (incompletas.length > 0 || completas.length < diasLaborables) {
        incidencias.push({
          empleado: emp.full_name,
          diasTrabajados: completas.length,
          diasIncompletos: incompletas.length,
          diasFalta: diasLaborables - completas.length - incompletas.length,
          detalle: incompletas.map(a => ({
            fecha: a.fecha,
            entrada: a.hora_entrada || "SIN ENTRADA",
            salida: a.hora_salida || "SIN SALIDA"
          }))
        });
      }
    }

    return NextResponse.json({
      semana,
      anio,
      periodo: `${inicio} al ${fin}`,
      modoNomina: configModo?.valor || "ONBOARDING",
      totalEmpleados: empleados?.length || 0,
      empleadosConIncidencias: incidencias.length,
      incidencias
    });

  } catch (error: unknown) {
    return NextResponse.json({ error: (error as {message?: string})?.message || "Unknown error" }, { status: 500 });
  }
}

