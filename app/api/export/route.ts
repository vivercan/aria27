import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { tipo, filtros } = await req.json();
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ARIA27 - Grupo Constructor Avante";
    workbook.created = new Date();
    
    const headerStyle = (color: string) => ({
      font: { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFF" } },
      fill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: color } },
      alignment: { horizontal: "center" as const, vertical: "middle" as const },
      border: { top: { style: "thin" as const }, bottom: { style: "thin" as const }, left: { style: "thin" as const }, right: { style: "thin" as const } }
    });
    
    const applyRowStyle = (row: ExcelJS.Row, idx: number, cols: number) => {
      const bgColor = idx % 2 === 0 ? "F8FAFC" : "FFFFFF";
      for (let i = 1; i <= cols; i++) {
        const cell = row.getCell(i);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
        cell.border = { bottom: { style: "thin", color: { argb: "E2E8F0" } } };
        cell.font = { name: "Calibri", size: 10 };
      }
    };

    if (tipo === "gastos") {
      const sheet = workbook.addWorksheet("Gastos de Obra", { properties: { tabColor: { argb: "10B981" } } });
      
      let query = supabase.from("gastos").select("*").order("fecha", { ascending: false });
      if (filtros?.obra) query = query.eq("obra", filtros.obra);
      if (filtros?.semana) query = query.eq("semana", parseInt(filtros.semana));
      if (filtros?.fechaInicio) query = query.gte("fecha", filtros.fechaInicio);
      if (filtros?.fechaFin) query = query.lte("fecha", filtros.fechaFin);
      const { data } = await query;
      
      // Header
      sheet.mergeCells("A1:G1");
      sheet.getCell("A1").value = "REPORTE DE GASTOS DE OBRA";
      sheet.getCell("A1").font = { name: "Calibri", size: 18, bold: true, color: { argb: "FFFFFF" } };
      sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0F172A" } };
      sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
      sheet.getRow(1).height = 35;
      
      sheet.mergeCells("A2:G2");
      sheet.getCell("A2").value = `Generado: ${new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} | Total: ${data?.length || 0} registros`;
      sheet.getCell("A2").font = { name: "Calibri", size: 11, italic: true, color: { argb: "64748B" } };
      sheet.getCell("A2").alignment = { horizontal: "center" };
      sheet.getRow(3).height = 10;
      
      const headers = ["Fecha", "Semana", "Obra", "Solicitante", "Descripción", "Proveedor", "Monto"];
      const headerRow = sheet.getRow(4);
      headers.forEach((h, i) => { const cell = headerRow.getCell(i + 1); cell.value = h; Object.assign(cell, headerStyle("10B981")); });
      headerRow.height = 25;
      
      let total = 0;
      data?.forEach((g, idx) => {
        const row = sheet.getRow(5 + idx);
        row.getCell(1).value = g.fecha || "";
        row.getCell(2).value = g.semana || "";
        row.getCell(3).value = g.obra || "";
        row.getCell(4).value = g.solicitante || "";
        row.getCell(5).value = g.descripcion || "";
        row.getCell(6).value = g.proveedor || "";
        row.getCell(7).value = g.monto || 0;
        row.getCell(7).numFmt = '"$"#,##0.00';
        total += g.monto || 0;
        applyRowStyle(row, idx, 7);
        row.getCell(7).font = { name: "Calibri", size: 10, bold: true, color: { argb: "059669" } };
      });
      
      const totalRow = sheet.getRow(5 + (data?.length || 0));
      totalRow.getCell(6).value = "TOTAL:";
      totalRow.getCell(6).font = { name: "Calibri", size: 12, bold: true };
      totalRow.getCell(6).alignment = { horizontal: "right" };
      totalRow.getCell(7).value = total;
      totalRow.getCell(7).numFmt = '"$"#,##0.00';
      totalRow.getCell(7).font = { name: "Calibri", size: 12, bold: true, color: { argb: "059669" } };
      totalRow.getCell(7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D1FAE5" } };
      
      [12, 10, 25, 25, 40, 25, 15].forEach((w, i) => sheet.getColumn(i + 1).width = w);
      sheet.autoFilter = { from: "A4", to: "G4" };

    } else if (tipo === "nomina") {
      // Obtener TODOS los datos sin filtro para el Excel completo
      const { data: allData } = await supabase.from("nomina_historico").select("*").order("semana", { ascending: false });
      
      // Datos filtrados para la pestaña principal
      let filteredData = allData || [];
      if (filtros?.semana) filteredData = filteredData.filter(r => r.semana === parseInt(filtros.semana));
      if (filtros?.empleado) filteredData = filteredData.filter(r => r.nombre === filtros.empleado);
      
      // ═══════════════════════════════════════════════════════════
      // PESTAÑA 1: RESUMEN EJECUTIVO
      // ═══════════════════════════════════════════════════════════
      const sheetResumen = workbook.addWorksheet("Resumen Ejecutivo", { properties: { tabColor: { argb: "8B5CF6" } } });
      
      sheetResumen.mergeCells("A1:E1");
      sheetResumen.getCell("A1").value = "RESUMEN EJECUTIVO DE NÓMINA";
      sheetResumen.getCell("A1").font = { name: "Calibri", size: 20, bold: true, color: { argb: "FFFFFF" } };
      sheetResumen.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0F172A" } };
      sheetResumen.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
      sheetResumen.getRow(1).height = 40;
      
      sheetResumen.mergeCells("A2:E2");
      sheetResumen.getCell("A2").value = `Grupo Constructor Avante | Generado: ${new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;
      sheetResumen.getCell("A2").font = { name: "Calibri", size: 11, italic: true, color: { argb: "64748B" } };
      sheetResumen.getCell("A2").alignment = { horizontal: "center" };
      
      // Métricas generales
      const semanas = [...new Set((allData || []).map(r => r.semana))];
      const empleados = [...new Set((allData || []).map(r => r.nombre))];
      const totalGeneral = (allData || []).reduce((s, r) => s + (r.sueldo_total || 0), 0);
      
      sheetResumen.getRow(4).height = 25;
      sheetResumen.getCell("A4").value = "MÉTRICAS GENERALES";
      sheetResumen.getCell("A4").font = { name: "Calibri", size: 14, bold: true, color: { argb: "8B5CF6" } };
      
      const metricas = [
        ["Total Registros", allData?.length || 0],
        ["Total Empleados", empleados.length],
        ["Total Semanas", semanas.length],
        ["Nómina Total Acumulada", totalGeneral],
        ["Promedio por Semana", semanas.length > 0 ? totalGeneral / semanas.length : 0],
        ["Promedio por Empleado", empleados.length > 0 ? totalGeneral / empleados.length : 0]
      ];
      
      metricas.forEach((m, idx) => {
        const row = sheetResumen.getRow(5 + idx);
        row.getCell(1).value = m[0];
        row.getCell(1).font = { name: "Calibri", size: 11 };
        row.getCell(2).value = m[1];
        row.getCell(2).numFmt = typeof m[1] === "number" && m[0].toString().includes("$") || m[0].toString().includes("Total") && idx > 2 ? '"$"#,##0.00' : '#,##0';
        if (idx > 2) row.getCell(2).numFmt = '"$"#,##0.00';
        row.getCell(2).font = { name: "Calibri", size: 11, bold: true, color: { argb: "059669" } };
      });
      
      // Resumen por semana
      sheetResumen.getRow(13).height = 25;
      sheetResumen.getCell("A13").value = "RESUMEN POR SEMANA";
      sheetResumen.getCell("A13").font = { name: "Calibri", size: 14, bold: true, color: { argb: "8B5CF6" } };
      
      const headerRowResumen = sheetResumen.getRow(14);
      ["Semana", "Empleados", "Total Nómina", "Promedio/Emp"].forEach((h, i) => {
        const cell = headerRowResumen.getCell(i + 1);
        cell.value = h;
        Object.assign(cell, headerStyle("8B5CF6"));
      });
      
      semanas.sort((a, b) => b - a).forEach((sem, idx) => {
        const regs = (allData || []).filter(r => r.semana === sem);
        const total = regs.reduce((s, r) => s + (r.sueldo_total || 0), 0);
        const row = sheetResumen.getRow(15 + idx);
        row.getCell(1).value = sem;
        row.getCell(2).value = regs.length;
        row.getCell(3).value = total;
        row.getCell(3).numFmt = '"$"#,##0.00';
        row.getCell(4).value = regs.length > 0 ? total / regs.length : 0;
        row.getCell(4).numFmt = '"$"#,##0.00';
        applyRowStyle(row, idx, 4);
      });
      
      [20, 15, 20, 20, 20].forEach((w, i) => sheetResumen.getColumn(i + 1).width = w);
      
      // ═══════════════════════════════════════════════════════════
      // PESTAÑA 2: DETALLE COMPLETO
      // ═══════════════════════════════════════════════════════════
      const sheetDetalle = workbook.addWorksheet("Detalle Completo", { properties: { tabColor: { argb: "3B82F6" } } });
      
      sheetDetalle.mergeCells("A1:F1");
      sheetDetalle.getCell("A1").value = "DETALLE DE NÓMINA" + (filtros?.semana ? ` - SEMANA ${filtros.semana}` : "") + (filtros?.empleado ? ` - ${filtros.empleado}` : "");
      sheetDetalle.getCell("A1").font = { name: "Calibri", size: 18, bold: true, color: { argb: "FFFFFF" } };
      sheetDetalle.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0F172A" } };
      sheetDetalle.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
      sheetDetalle.getRow(1).height = 35;
      
      sheetDetalle.mergeCells("A2:F2");
      sheetDetalle.getCell("A2").value = `Total: ${filteredData.length} registros | Monto: $${filteredData.reduce((s, r) => s + (r.sueldo_total || 0), 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
      sheetDetalle.getCell("A2").font = { name: "Calibri", size: 11, italic: true, color: { argb: "64748B" } };
      sheetDetalle.getCell("A2").alignment = { horizontal: "center" };
      
      const headersDetalle = ["Semana", "Nombre", "Puesto", "Sal. Mensual", "Sal. Semanal", "Sueldo Total"];
      const headerRowDetalle = sheetDetalle.getRow(4);
      headersDetalle.forEach((h, i) => { const cell = headerRowDetalle.getCell(i + 1); cell.value = h; Object.assign(cell, headerStyle("3B82F6")); });
      headerRowDetalle.height = 25;
      
      let totalDetalle = 0;
      filteredData.forEach((n, idx) => {
        const row = sheetDetalle.getRow(5 + idx);
        row.getCell(1).value = n.semana || "";
        row.getCell(2).value = n.nombre || "";
        row.getCell(3).value = n.puesto || "";
        row.getCell(4).value = n.salario_mensual || 0;
        row.getCell(4).numFmt = '"$"#,##0.00';
        row.getCell(5).value = n.salario_semanal || 0;
        row.getCell(5).numFmt = '"$"#,##0.00';
        row.getCell(6).value = n.sueldo_total || 0;
        row.getCell(6).numFmt = '"$"#,##0.00';
        totalDetalle += n.sueldo_total || 0;
        applyRowStyle(row, idx, 6);
        row.getCell(6).font = { name: "Calibri", size: 10, bold: true, color: { argb: "7C3AED" } };
      });
      
      const totalRowDetalle = sheetDetalle.getRow(5 + filteredData.length);
      totalRowDetalle.getCell(5).value = "TOTAL:";
      totalRowDetalle.getCell(5).font = { name: "Calibri", size: 12, bold: true };
      totalRowDetalle.getCell(5).alignment = { horizontal: "right" };
      totalRowDetalle.getCell(6).value = totalDetalle;
      totalRowDetalle.getCell(6).numFmt = '"$"#,##0.00';
      totalRowDetalle.getCell(6).font = { name: "Calibri", size: 12, bold: true, color: { argb: "7C3AED" } };
      totalRowDetalle.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "EDE9FE" } };
      
      [10, 35, 20, 18, 18, 18].forEach((w, i) => sheetDetalle.getColumn(i + 1).width = w);
      sheetDetalle.autoFilter = { from: "A4", to: "F4" };
      
      // ═══════════════════════════════════════════════════════════
      // PESTAÑA 3: POR EMPLEADO (una fila por empleado con totales)
      // ═══════════════════════════════════════════════════════════
      const sheetEmpleados = workbook.addWorksheet("Por Empleado", { properties: { tabColor: { argb: "F59E0B" } } });
      
      sheetEmpleados.mergeCells("A1:E1");
      sheetEmpleados.getCell("A1").value = "NÓMINA ACUMULADA POR EMPLEADO";
      sheetEmpleados.getCell("A1").font = { name: "Calibri", size: 18, bold: true, color: { argb: "FFFFFF" } };
      sheetEmpleados.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0F172A" } };
      sheetEmpleados.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
      sheetEmpleados.getRow(1).height = 35;
      
      const headersEmp = ["Empleado", "Puesto", "Semanas Trabajadas", "Total Acumulado", "Promedio Semanal"];
      const headerRowEmp = sheetEmpleados.getRow(3);
      headersEmp.forEach((h, i) => { const cell = headerRowEmp.getCell(i + 1); cell.value = h; Object.assign(cell, headerStyle("F59E0B")); });
      
      const empleadosData = empleados.map(emp => {
        const regs = (allData || []).filter(r => r.nombre === emp);
        const total = regs.reduce((s, r) => s + (r.sueldo_total || 0), 0);
        return {
          nombre: emp,
          puesto: regs[0]?.puesto || "",
          semanas: regs.length,
          total,
          promedio: regs.length > 0 ? total / regs.length : 0
        };
      }).sort((a, b) => b.total - a.total);
      
      let granTotal = 0;
      empleadosData.forEach((e, idx) => {
        const row = sheetEmpleados.getRow(4 + idx);
        row.getCell(1).value = e.nombre;
        row.getCell(2).value = e.puesto;
        row.getCell(3).value = e.semanas;
        row.getCell(4).value = e.total;
        row.getCell(4).numFmt = '"$"#,##0.00';
        row.getCell(5).value = e.promedio;
        row.getCell(5).numFmt = '"$"#,##0.00';
        granTotal += e.total;
        applyRowStyle(row, idx, 5);
        row.getCell(4).font = { name: "Calibri", size: 10, bold: true, color: { argb: "059669" } };
      });
      
      const totalRowEmp = sheetEmpleados.getRow(4 + empleadosData.length);
      totalRowEmp.getCell(3).value = "GRAN TOTAL:";
      totalRowEmp.getCell(3).font = { name: "Calibri", size: 12, bold: true };
      totalRowEmp.getCell(3).alignment = { horizontal: "right" };
      totalRowEmp.getCell(4).value = granTotal;
      totalRowEmp.getCell(4).numFmt = '"$"#,##0.00';
      totalRowEmp.getCell(4).font = { name: "Calibri", size: 12, bold: true, color: { argb: "059669" } };
      totalRowEmp.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FEF3C7" } };
      
      [35, 20, 20, 20, 20].forEach((w, i) => sheetEmpleados.getColumn(i + 1).width = w);
      sheetEmpleados.autoFilter = { from: "A3", to: "E3" };
      
      // ═══════════════════════════════════════════════════════════
      // PESTAÑAS POR CADA SEMANA
      // ═══════════════════════════════════════════════════════════
      semanas.sort((a, b) => b - a).slice(0, 10).forEach(sem => {
        const sheetSem = workbook.addWorksheet(`Sem ${sem}`, { properties: { tabColor: { argb: "EC4899" } } });
        const datosSem = (allData || []).filter(r => r.semana === sem);
        
        sheetSem.mergeCells("A1:D1");
        sheetSem.getCell("A1").value = `NÓMINA SEMANA ${sem}`;
        sheetSem.getCell("A1").font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFF" } };
        sheetSem.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "EC4899" } };
        sheetSem.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
        sheetSem.getRow(1).height = 30;
        
        const headersSem = ["Nombre", "Puesto", "Sal. Semanal", "Sueldo Total"];
        const headerRowSem = sheetSem.getRow(3);
        headersSem.forEach((h, i) => { const cell = headerRowSem.getCell(i + 1); cell.value = h; Object.assign(cell, headerStyle("EC4899")); });
        
        let totalSem = 0;
        datosSem.sort((a, b) => (b.sueldo_total || 0) - (a.sueldo_total || 0)).forEach((n, idx) => {
          const row = sheetSem.getRow(4 + idx);
          row.getCell(1).value = n.nombre || "";
          row.getCell(2).value = n.puesto || "";
          row.getCell(3).value = n.salario_semanal || 0;
          row.getCell(3).numFmt = '"$"#,##0.00';
          row.getCell(4).value = n.sueldo_total || 0;
          row.getCell(4).numFmt = '"$"#,##0.00';
          totalSem += n.sueldo_total || 0;
          applyRowStyle(row, idx, 4);
          row.getCell(4).font = { name: "Calibri", size: 10, bold: true, color: { argb: "059669" } };
        });
        
        const totalRowSem = sheetSem.getRow(4 + datosSem.length);
        totalRowSem.getCell(3).value = "TOTAL:";
        totalRowSem.getCell(3).font = { name: "Calibri", size: 11, bold: true };
        totalRowSem.getCell(3).alignment = { horizontal: "right" };
        totalRowSem.getCell(4).value = totalSem;
        totalRowSem.getCell(4).numFmt = '"$"#,##0.00';
        totalRowSem.getCell(4).font = { name: "Calibri", size: 11, bold: true, color: { argb: "EC4899" } };
        totalRowSem.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FCE7F3" } };
        
        [35, 20, 18, 18].forEach((w, i) => sheetSem.getColumn(i + 1).width = w);
      });

    } else if (tipo === "requisiciones") {
      const sheet = workbook.addWorksheet("Requisiciones", { properties: { tabColor: { argb: "F59E0B" } } });
      
      let query = supabase.from("requisiciones_historico").select("*").order("fecha", { ascending: false });
      if (filtros?.obra) query = query.eq("obra", filtros.obra);
      if (filtros?.status) query = query.eq("status", filtros.status);
      if (filtros?.solicitante) query = query.eq("solicitante", filtros.solicitante);
      if (filtros?.fechaInicio) query = query.gte("fecha", filtros.fechaInicio);
      if (filtros?.fechaFin) query = query.lte("fecha", filtros.fechaFin);
      const { data } = await query;
      
      sheet.mergeCells("A1:H1");
      sheet.getCell("A1").value = "REPORTE DE REQUISICIONES";
      sheet.getCell("A1").font = { name: "Calibri", size: 18, bold: true, color: { argb: "FFFFFF" } };
      sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0F172A" } };
      sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
      sheet.getRow(1).height = 35;
      
      sheet.mergeCells("A2:H2");
      sheet.getCell("A2").value = `Generado: ${new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} | Total: ${data?.length || 0} registros`;
      sheet.getCell("A2").font = { name: "Calibri", size: 11, italic: true, color: { argb: "64748B" } };
      sheet.getCell("A2").alignment = { horizontal: "center" };
      
      const headers = ["Folio", "Fecha", "Solicitante", "Obra", "Descripción", "Proveedor", "Monto", "Estatus"];
      const headerRow = sheet.getRow(4);
      headers.forEach((h, i) => { const cell = headerRow.getCell(i + 1); cell.value = h; Object.assign(cell, headerStyle("F59E0B")); });
      headerRow.height = 25;
      
      let total = 0;
      data?.forEach((r, idx) => {
        const row = sheet.getRow(5 + idx);
        row.getCell(1).value = r.folio_excel || "";
        row.getCell(2).value = r.fecha || "";
        row.getCell(3).value = r.solicitante || "";
        row.getCell(4).value = r.obra || "";
        row.getCell(5).value = (r.descripcion || "").substring(0, 80);
        row.getCell(6).value = r.proveedor || "";
        row.getCell(7).value = r.monto || 0;
        row.getCell(7).numFmt = '"$"#,##0.00';
        row.getCell(8).value = r.status || "";
        total += r.monto || 0;
        applyRowStyle(row, idx, 8);
        row.getCell(7).font = { name: "Calibri", size: 10, bold: true, color: { argb: "059669" } };
      });
      
      const totalRow = sheet.getRow(5 + (data?.length || 0));
      totalRow.getCell(6).value = "TOTAL:";
      totalRow.getCell(6).font = { name: "Calibri", size: 12, bold: true };
      totalRow.getCell(6).alignment = { horizontal: "right" };
      totalRow.getCell(7).value = total;
      totalRow.getCell(7).numFmt = '"$"#,##0.00';
      totalRow.getCell(7).font = { name: "Calibri", size: 12, bold: true, color: { argb: "059669" } };
      totalRow.getCell(7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FEF3C7" } };
      
      [8, 12, 25, 25, 45, 25, 15, 20].forEach((w, i) => sheet.getColumn(i + 1).width = w);
      sheet.autoFilter = { from: "A4", to: "H4" };
      
    } else {
      return NextResponse.json({ error: "Tipo no válido" }, { status: 400 });
    }
    
    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${tipo}_${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error generando Excel:", error);
    return NextResponse.json({ error: "Error generando Excel" }, { status: 500 });
  }
}
