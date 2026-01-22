import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

export async function POST(req: NextRequest) {
  try {
    const { fechaReferencia, forzar } = await req.json();
    const fecha = fechaReferencia ? new Date(fechaReferencia) : new Date();
    const semana = getWeekNumber(fecha);
    const anio = fecha.getFullYear();
    const { inicio, fin } = getWeekRange(fecha);

    // Si forzar=true, eliminar nómina existente para regenerar
    if (forzar) {
      await supabase
        .from("nomina_historico")
        .delete()
        .eq("semana", semana)
        .eq("anio", anio);
    } else {
      // Verificar si ya existe
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

    // Obtener empleados activos
    const { data: empleados, error: empError } = await supabase
      .from("Personal")
      .select("*")
      .eq("status", "ACTIVO");

    if (empError) throw empError;

    // Obtener TODAS las asistencias del periodo para detectar incompletas
    const { data: todasAsistencias } = await supabase
      .from("asistencias")
      .select("*, employee:employee_id(full_name)")
      .gte("fecha", inicio)
      .lte("fecha", fin);

    // Separar completas e incompletas
    const asistenciasIncompletas = todasAsistencias?.filter(a => !a.hora_salida) || [];
    const asistenciasCompletas = todasAsistencias?.filter(a => a.hora_entrada && a.hora_salida) || [];

    // Obtener configuración
    const { data: config } = await supabase.from("configuracion_nomina").select("*");
    const getConfig = (clave: string, def: number) => {
      const c = config?.find(x => x.clave === clave);
      return c ? parseFloat(c.valor) : def;
    };
    const factorDoble = getConfig("factor_hora_extra_doble", 2);
    const minimoTarjeta = getConfig("minimo_tarjeta_default", 1096);

    const nominasGeneradas = [];

    for (const emp of empleados || []) {
      // Solo contar asistencias COMPLETAS (con entrada Y salida)
      const asistenciasEmp = asistenciasCompletas.filter(a => a.employee_id === emp.id);

      // Obtener préstamos activos
      const { data: prestamos } = await supabase
        .from("prestamos")
        .select("descuento_semanal")
        .eq("employee_id", emp.id)
        .eq("status", "ACTIVO");

      const diasTrabajados = asistenciasEmp.length; // Solo días COMPLETOS
      const horasExtra = asistenciasEmp.reduce((sum, a) => sum + (a.horas_extra || 0), 0);
      const salarioDiario = emp.salario_diario || 0;
      const salarioBase = salarioDiario * diasTrabajados;
      const pagoHorasExtra = horasExtra * (salarioDiario / 8) * factorDoble;
      const totalPercepciones = salarioBase + pagoHorasExtra;
      const prestamoDescuento = prestamos?.reduce((sum, p) => sum + (p.descuento_semanal || 0), 0) || 0;
      const totalDeducciones = prestamoDescuento;
      const sueldoNeto = totalPercepciones - totalDeducciones;
      const pagoTarjetaEmp = emp.minimo_tarjeta || minimoTarjeta;
      const pagoTarjeta = Math.min(sueldoNeto, pagoTarjetaEmp);
      const pagoEfectivo = Math.max(0, sueldoNeto - pagoTarjeta);

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
        horas_extra: horasExtra,
        salario_diario: salarioDiario,
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
        status: "GENERADA"
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
      totales,
      registros: nominasGeneradas.length,
      advertencia: asistenciasIncompletas.length > 0 ? {
        mensaje: `Hay ${asistenciasIncompletas.length} asistencia(s) sin salida que NO se contaron`,
        incompletas: asistenciasIncompletas.map(a => ({
          empleado: a.employee?.full_name || "Desconocido",
          fecha: a.fecha,
          entrada: a.hora_entrada
        }))
      } : null
    });

  } catch (error: any) {
    console.error("Error generando nómina:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
