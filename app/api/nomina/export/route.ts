import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
const log = logger("NOMINA-EXPORT");

const supabase = getSupabaseAdmin();

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(getClientIdentifier(req), { key: "nomina:export", ...RATE_LIMITS.WRITE });
    if (!rl.allowed) return rateLimitResponse(rl);

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

    const { semana, anio } = await req.json();

    // Obtener datos de nómina
    const { data: nominas, error } = await supabase
      .from("nomina_historico")
      .select("*")
      .eq("semana", semana)
      .eq("anio", anio)
      .order("nombre");

    if (error) throw error;
    if (!nominas || nominas.length === 0) {
      return NextResponse.json({ error: "No hay datos para esta semana" }, { status: 404 });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ARIA27 - Grupo Constructor Urbano Avante";
    workbook.created = new Date();

    // ============================================
    // PESTAÑA 1: CONCENTRADO
    // ============================================
    const concentrado = workbook.addWorksheet("Concentrado");
    
    // Header empresa
    concentrado.mergeCells("A1:I1");
    concentrado.getCell("A1").value = "GRUPO CUAVANTE - CONSTRUCTORA";
    concentrado.getCell("A1").font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFF" } };
    concentrado.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0F172A" } };
    concentrado.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
    concentrado.getRow(1).height = 30;

    concentrado.mergeCells("A2:I2");
    concentrado.getCell("A2").value = `NÓMINA SEMANA ${semana} - ${anio} | ${nominas[0]?.fecha_inicio || ""} al ${nominas[0]?.fecha_fin || ""}`;
    concentrado.getCell("A2").font = { name: "Arial", size: 12, bold: true };
    concentrado.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1E3A5A" } };
    concentrado.getCell("A2").font = { color: { argb: "FFFFFF" } };
    concentrado.getCell("A2").alignment = { horizontal: "center" };

    // Headers de columnas
    const headers = ["#", "Empleado", "Puesto", "Días", "Salario Base", "Deducciones", "Neto", "Transferencia", "Efectivo"];
    const headerRow = concentrado.getRow(4);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "334155" } };
      cell.alignment = { horizontal: i >= 4 ? "right" : "left", vertical: "middle" };
      cell.border = { bottom: { style: "thin", color: { argb: "64748B" } } };
    });
    headerRow.height = 25;

    // Datos
    let totalBruto = 0, totalDeducciones = 0, totalNeto = 0, totalTarjeta = 0, totalEfectivo = 0;
    nominas.forEach((n, idx) => {
      const row = concentrado.getRow(5 + idx);
      row.getCell(1).value = idx + 1;
      row.getCell(2).value = n.nombre;
      row.getCell(3).value = n.puesto;
      row.getCell(4).value = n.dias_trabajados;
      row.getCell(5).value = n.salario_base;
      row.getCell(6).value = n.total_deducciones;
      row.getCell(7).value = n.sueldo_neto;
      row.getCell(8).value = n.pago_tarjeta;
      row.getCell(9).value = n.pago_efectivo;

      // Formato moneda
      [5, 6, 7, 8, 9].forEach(col => {
        row.getCell(col).numFmt = '"$"#,##0.00';
        row.getCell(col).alignment = { horizontal: "right" };
      });

      // Alternating row color
      if (idx % 2 === 0) {
        for (let c = 1; c <= 9; c++) {
          row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };
        }
      }

      totalBruto += n.salario_base || 0;
      totalDeducciones += n.total_deducciones || 0;
      totalNeto += n.sueldo_neto || 0;
      totalTarjeta += n.pago_tarjeta || 0;
      totalEfectivo += n.pago_efectivo || 0;
    });

    // Fila de totales
    const totalRow = concentrado.getRow(5 + nominas.length + 1);
    totalRow.getCell(1).value = "";
    totalRow.getCell(2).value = "TOTALES";
    totalRow.getCell(2).font = { bold: true };
    totalRow.getCell(4).value = nominas.reduce((s, n) => s + (n.dias_trabajados || 0), 0);
    totalRow.getCell(5).value = totalBruto;
    totalRow.getCell(6).value = totalDeducciones;
    totalRow.getCell(7).value = totalNeto;
    totalRow.getCell(8).value = totalTarjeta;
    totalRow.getCell(9).value = totalEfectivo;
    [5, 6, 7, 8, 9].forEach(col => {
      totalRow.getCell(col).numFmt = '"$"#,##0.00';
      totalRow.getCell(col).font = { bold: true };
      totalRow.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "DCFCE7" } };
    });

    // Ancho de columnas
    concentrado.columns = [
      { width: 5 }, { width: 35 }, { width: 20 }, { width: 8 },
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }
    ];

    // ============================================
    // PESTAÑAS INDIVIDUALES: RECIBOS
    // ============================================
    for (const n of nominas) {
      const nombre = (n.nombre || "Empleado").substring(0, 25).replace(/[\\\/\*\?\[\]:]/g, "");
      const recibo = workbook.addWorksheet(nombre);

      // Header
      recibo.mergeCells("A1:D1");
      recibo.getCell("A1").value = "GRUPO CUAVANTE";
      recibo.getCell("A1").font = { name: "Arial", size: 14, bold: true };
      recibo.getCell("A1").alignment = { horizontal: "center" };

      recibo.mergeCells("A2:D2");
      recibo.getCell("A2").value = "RECIBO DE NÓMINA";
      recibo.getCell("A2").font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFFFF" } };
      recibo.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0F172A" } };
      recibo.getCell("A2").alignment = { horizontal: "center" };

      // Info empleado
      recibo.getCell("A4").value = "Empleado:";
      recibo.getCell("B4").value = n.nombre;
      recibo.getCell("B4").font = { bold: true };
      
      recibo.getCell("A5").value = "Puesto:";
      recibo.getCell("B5").value = n.puesto;
      
      recibo.getCell("A6").value = "Obra:";
      recibo.getCell("B6").value = n.obra || "Sin asignar";

      recibo.getCell("C4").value = "Semana:";
      recibo.getCell("D4").value = n.semana;
      recibo.getCell("D4").font = { bold: true };

      recibo.getCell("C5").value = "Período:";
      recibo.getCell("D5").value = `${n.fecha_inicio} - ${n.fecha_fin}`;

      recibo.getCell("C6").value = "Días:";
      recibo.getCell("D6").value = n.dias_trabajados;

      // Separador
      recibo.mergeCells("A8:D8");
      recibo.getCell("A8").value = "PERCEPCIONES";
      recibo.getCell("A8").font = { bold: true, color: { argb: "FFFFFF" } };
      recibo.getCell("A8").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "059669" } };
      recibo.getCell("A8").alignment = { horizontal: "center" };

      recibo.getCell("A9").value = "Salario Base";
      recibo.getCell("D9").value = n.salario_base;
      recibo.getCell("D9").numFmt = '"$"#,##0.00';

      recibo.getCell("A10").value = "Horas Extra";
      recibo.getCell("D10").value = n.pago_horas_extra || 0;
      recibo.getCell("D10").numFmt = '"$"#,##0.00';

      recibo.getCell("A11").value = "Bonos";
      recibo.getCell("D11").value = n.bonos || 0;
      recibo.getCell("D11").numFmt = '"$"#,##0.00';

      recibo.getCell("A12").value = "TOTAL PERCEPCIONES";
      recibo.getCell("A12").font = { bold: true };
      recibo.getCell("D12").value = n.total_percepciones;
      recibo.getCell("D12").numFmt = '"$"#,##0.00';
      recibo.getCell("D12").font = { bold: true };
      recibo.getCell("D12").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "DCFCE7" } };

      // Deducciones
      recibo.mergeCells("A14:D14");
      recibo.getCell("A14").value = "DEDUCCIONES";
      recibo.getCell("A14").font = { bold: true, color: { argb: "FFFFFF" } };
      recibo.getCell("A14").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "DC2626" } };
      recibo.getCell("A14").alignment = { horizontal: "center" };

      recibo.getCell("A15").value = "Préstamos";
      recibo.getCell("D15").value = n.prestamo_descuento || 0;
      recibo.getCell("D15").numFmt = '"$"#,##0.00';

      recibo.getCell("A16").value = "Otras Deducciones";
      recibo.getCell("D16").value = n.otras_deducciones || 0;
      recibo.getCell("D16").numFmt = '"$"#,##0.00';

      recibo.getCell("A17").value = "TOTAL DEDUCCIONES";
      recibo.getCell("A17").font = { bold: true };
      recibo.getCell("D17").value = n.total_deducciones;
      recibo.getCell("D17").numFmt = '"$"#,##0.00';
      recibo.getCell("D17").font = { bold: true };
      recibo.getCell("D17").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FEE2E2" } };

      // Neto
      recibo.mergeCells("A19:D19");
      recibo.getCell("A19").value = "NETO A PAGAR";
      recibo.getCell("A19").font = { bold: true, color: { argb: "FFFFFF" } };
      recibo.getCell("A19").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "7C3AED" } };
      recibo.getCell("A19").alignment = { horizontal: "center" };

      recibo.getCell("A20").value = "Transferencia Bancaria";
      recibo.getCell("D20").value = n.pago_tarjeta;
      recibo.getCell("D20").numFmt = '"$"#,##0.00';

      recibo.getCell("A21").value = "Efectivo";
      recibo.getCell("D21").value = n.pago_efectivo;
      recibo.getCell("D21").numFmt = '"$"#,##0.00';

      recibo.mergeCells("A23:C23");
      recibo.getCell("A23").value = "TOTAL NETO:";
      recibo.getCell("A23").font = { size: 14, bold: true };
      recibo.getCell("A23").alignment = { horizontal: "right" };
      recibo.getCell("D23").value = n.sueldo_neto;
      recibo.getCell("D23").numFmt = '"$"#,##0.00';
      recibo.getCell("D23").font = { size: 14, bold: true };
      recibo.getCell("D23").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "DDD6FE" } };

      // Firma
      recibo.getCell("A26").value = "________________________";
      recibo.getCell("A27").value = "Firma del empleado";
      recibo.getCell("A27").font = { size: 9, italic: true };

      recibo.getCell("C26").value = "________________________";
      recibo.getCell("C27").value = "Firma RH";
      recibo.getCell("C27").font = { size: 9, italic: true };

      // Ancho columnas
      recibo.columns = [{ width: 25 }, { width: 20 }, { width: 15 }, { width: 18 }];
    }

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=Nomina_Sem${semana}_${anio}.xlsx`
      }
    });

  } catch (error: unknown) {
    log.error("Error exportando nómina:", error);
    return NextResponse.json({ error: (error as {message?: string})?.message || "Unknown error" }, { status: 500 });
  }
}

