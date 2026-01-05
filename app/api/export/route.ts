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
    workbook.creator = "ARIA27 - Grupo Loma";
    workbook.created = new Date();
    
    let sheet: ExcelJS.Worksheet;
    
    if (tipo === "gastos") {
      sheet = workbook.addWorksheet("Gastos de Obra", {
        properties: { tabColor: { argb: "10B981" } }
      });
      
      // Obtener datos
      let query = supabase.from("gastos").select("*").order("fecha", { ascending: false });
      if (filtros?.obra) query = query.eq("obra", filtros.obra);
      if (filtros?.semana) query = query.eq("semana", filtros.semana);
      if (filtros?.fechaInicio) query = query.gte("fecha", filtros.fechaInicio);
      if (filtros?.fechaFin) query = query.lte("fecha", filtros.fechaFin);
      const { data } = await query;
      
      // Header principal
      sheet.mergeCells("A1:G1");
      const titleCell = sheet.getCell("A1");
      titleCell.value = "REPORTE DE GASTOS DE OBRA";
      titleCell.font = { name: "Calibri", size: 18, bold: true, color: { argb: "FFFFFF" } };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0F172A" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      sheet.getRow(1).height = 35;
      
      // Subtítulo con fecha
      sheet.mergeCells("A2:G2");
      const subtitleCell = sheet.getCell("A2");
      subtitleCell.value = `Generado: ${new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} | Total: ${data?.length || 0} registros`;
      subtitleCell.font = { name: "Calibri", size: 11, italic: true, color: { argb: "64748B" } };
      subtitleCell.alignment = { horizontal: "center" };
      sheet.getRow(2).height = 22;
      
      // Fila vacía
      sheet.getRow(3).height = 10;
      
      // Headers de columnas
      const headers = ["Fecha", "Semana", "Obra", "Solicitante", "Descripción", "Proveedor", "Monto"];
      const headerRow = sheet.getRow(4);
      headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "10B981" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin", color: { argb: "059669" } },
          bottom: { style: "thin", color: { argb: "059669" } },
          left: { style: "thin", color: { argb: "059669" } },
          right: { style: "thin", color: { argb: "059669" } }
        };
      });
      headerRow.height = 25;
      
      // Datos
      let totalMonto = 0;
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
        totalMonto += g.monto || 0;
        
        // Alternar colores de fila
        const bgColor = idx % 2 === 0 ? "F8FAFC" : "FFFFFF";
        for (let i = 1; i <= 7; i++) {
          const cell = row.getCell(i);
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
          cell.border = {
            bottom: { style: "thin", color: { argb: "E2E8F0" } }
          };
          cell.font = { name: "Calibri", size: 10 };
        }
        row.getCell(7).font = { name: "Calibri", size: 10, bold: true, color: { argb: "059669" } };
      });
      
      // Fila de total
      const totalRow = sheet.getRow(5 + (data?.length || 0));
      totalRow.getCell(6).value = "TOTAL:";
      totalRow.getCell(6).font = { name: "Calibri", size: 12, bold: true };
      totalRow.getCell(6).alignment = { horizontal: "right" };
      totalRow.getCell(7).value = totalMonto;
      totalRow.getCell(7).numFmt = '"$"#,##0.00';
      totalRow.getCell(7).font = { name: "Calibri", size: 12, bold: true, color: { argb: "059669" } };
      totalRow.getCell(7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D1FAE5" } };
      
      // Anchos de columna
      sheet.getColumn(1).width = 12;
      sheet.getColumn(2).width = 10;
      sheet.getColumn(3).width = 25;
      sheet.getColumn(4).width = 25;
      sheet.getColumn(5).width = 40;
      sheet.getColumn(6).width = 25;
      sheet.getColumn(7).width = 15;
      
      // Filtros automáticos
      sheet.autoFilter = { from: "A4", to: "G4" };
      
    } else if (tipo === "nomina") {
      sheet = workbook.addWorksheet("Nómina Histórica", {
        properties: { tabColor: { argb: "8B5CF6" } }
      });
      
      let query = supabase.from("nomina_historico").select("*").order("semana", { ascending: false });
      if (filtros?.semana) query = query.eq("semana", filtros.semana);
      if (filtros?.empleado) query = query.eq("nombre", filtros.empleado);
      const { data } = await query;
      
      // Header
      sheet.mergeCells("A1:F1");
      const titleCell = sheet.getCell("A1");
      titleCell.value = "REPORTE DE NÓMINA HISTÓRICA";
      titleCell.font = { name: "Calibri", size: 18, bold: true, color: { argb: "FFFFFF" } };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0F172A" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      sheet.getRow(1).height = 35;
      
      sheet.mergeCells("A2:F2");
      const subtitleCell = sheet.getCell("A2");
      subtitleCell.value = `Generado: ${new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} | Total: ${data?.length || 0} registros`;
      subtitleCell.font = { name: "Calibri", size: 11, italic: true, color: { argb: "64748B" } };
      subtitleCell.alignment = { horizontal: "center" };
      
      sheet.getRow(3).height = 10;
      
      const headers = ["Semana", "Nombre", "Puesto", "Salario Mensual", "Salario Semanal", "Sueldo Total"];
      const headerRow = sheet.getRow(4);
      headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "8B5CF6" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      });
      headerRow.height = 25;
      
      let totalSueldo = 0;
      data?.forEach((n, idx) => {
        const row = sheet.getRow(5 + idx);
        row.getCell(1).value = n.semana || "";
        row.getCell(2).value = n.nombre || "";
        row.getCell(3).value = n.puesto || "";
        row.getCell(4).value = n.salario_mensual || 0;
        row.getCell(4).numFmt = '"$"#,##0.00';
        row.getCell(5).value = n.salario_semanal || 0;
        row.getCell(5).numFmt = '"$"#,##0.00';
        row.getCell(6).value = n.sueldo_total || 0;
        row.getCell(6).numFmt = '"$"#,##0.00';
        totalSueldo += n.sueldo_total || 0;
        
        const bgColor = idx % 2 === 0 ? "F8FAFC" : "FFFFFF";
        for (let i = 1; i <= 6; i++) {
          const cell = row.getCell(i);
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
          cell.border = { bottom: { style: "thin", color: { argb: "E2E8F0" } } };
          cell.font = { name: "Calibri", size: 10 };
        }
        row.getCell(6).font = { name: "Calibri", size: 10, bold: true, color: { argb: "7C3AED" } };
      });
      
      const totalRow = sheet.getRow(5 + (data?.length || 0));
      totalRow.getCell(5).value = "TOTAL:";
      totalRow.getCell(5).font = { name: "Calibri", size: 12, bold: true };
      totalRow.getCell(5).alignment = { horizontal: "right" };
      totalRow.getCell(6).value = totalSueldo;
      totalRow.getCell(6).numFmt = '"$"#,##0.00';
      totalRow.getCell(6).font = { name: "Calibri", size: 12, bold: true, color: { argb: "7C3AED" } };
      totalRow.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "EDE9FE" } };
      
      sheet.getColumn(1).width = 10;
      sheet.getColumn(2).width = 35;
      sheet.getColumn(3).width = 20;
      sheet.getColumn(4).width = 18;
      sheet.getColumn(5).width = 18;
      sheet.getColumn(6).width = 18;
      
      sheet.autoFilter = { from: "A4", to: "F4" };
      
    } else if (tipo === "requisiciones") {
      sheet = workbook.addWorksheet("Requisiciones", {
        properties: { tabColor: { argb: "F59E0B" } }
      });
      
      let query = supabase.from("requisiciones_historico").select("*").order("fecha", { ascending: false });
      if (filtros?.obra) query = query.eq("obra", filtros.obra);
      if (filtros?.status) query = query.eq("status", filtros.status);
      if (filtros?.solicitante) query = query.eq("solicitante", filtros.solicitante);
      if (filtros?.fechaInicio) query = query.gte("fecha", filtros.fechaInicio);
      if (filtros?.fechaFin) query = query.lte("fecha", filtros.fechaFin);
      const { data } = await query;
      
      sheet.mergeCells("A1:H1");
      const titleCell = sheet.getCell("A1");
      titleCell.value = "REPORTE DE REQUISICIONES";
      titleCell.font = { name: "Calibri", size: 18, bold: true, color: { argb: "FFFFFF" } };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0F172A" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      sheet.getRow(1).height = 35;
      
      sheet.mergeCells("A2:H2");
      const subtitleCell = sheet.getCell("A2");
      subtitleCell.value = `Generado: ${new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} | Total: ${data?.length || 0} registros`;
      subtitleCell.font = { name: "Calibri", size: 11, italic: true, color: { argb: "64748B" } };
      subtitleCell.alignment = { horizontal: "center" };
      
      sheet.getRow(3).height = 10;
      
      const headers = ["Folio", "Fecha", "Solicitante", "Obra", "Descripción", "Proveedor", "Monto", "Estatus"];
      const headerRow = sheet.getRow(4);
      headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F59E0B" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      });
      headerRow.height = 25;
      
      let totalMonto = 0;
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
        totalMonto += r.monto || 0;
        
        const bgColor = idx % 2 === 0 ? "F8FAFC" : "FFFFFF";
        for (let i = 1; i <= 8; i++) {
          const cell = row.getCell(i);
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
          cell.border = { bottom: { style: "thin", color: { argb: "E2E8F0" } } };
          cell.font = { name: "Calibri", size: 10 };
        }
        
        // Color según estatus
        const statusCell = row.getCell(8);
        if (r.status?.includes("TERMINADO")) {
          statusCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "059669" } };
        } else if (r.status?.includes("FALTANTE")) {
          statusCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "D97706" } };
        } else if (r.status?.includes("CANCELADA")) {
          statusCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "DC2626" } };
        }
        
        row.getCell(7).font = { name: "Calibri", size: 10, bold: true, color: { argb: "059669" } };
      });
      
      const totalRow = sheet.getRow(5 + (data?.length || 0));
      totalRow.getCell(6).value = "TOTAL:";
      totalRow.getCell(6).font = { name: "Calibri", size: 12, bold: true };
      totalRow.getCell(6).alignment = { horizontal: "right" };
      totalRow.getCell(7).value = totalMonto;
      totalRow.getCell(7).numFmt = '"$"#,##0.00';
      totalRow.getCell(7).font = { name: "Calibri", size: 12, bold: true, color: { argb: "059669" } };
      totalRow.getCell(7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FEF3C7" } };
      
      sheet.getColumn(1).width = 8;
      sheet.getColumn(2).width = 12;
      sheet.getColumn(3).width = 25;
      sheet.getColumn(4).width = 25;
      sheet.getColumn(5).width = 45;
      sheet.getColumn(6).width = 25;
      sheet.getColumn(7).width = 15;
      sheet.getColumn(8).width = 20;
      
      sheet.autoFilter = { from: "A4", to: "H4" };
    } else {
      return NextResponse.json({ error: "Tipo no válido" }, { status: 400 });
    }
    
    // Generar buffer
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
