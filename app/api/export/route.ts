import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
const log = logger("EXPORT");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PAGE_SIZE = 1000;

/** Fetches ALL rows from a table, paginating in chunks of PAGE_SIZE to bypass Supabase default limit */
async function fetchAllRows(
  client: SupabaseClient,
  table: string,
  orderCol: string,
  ascending: boolean,
  filterFn?: (q: ReturnType<SupabaseClient["from"]>) => ReturnType<SupabaseClient["from"]>
): Promise<{ data: Record<string, unknown>[]; error: string | null }> {
  const allRows: Record<string, unknown>[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = client
      .from(table)
      .select("*")
      .order(orderCol, { ascending })
      .range(offset, offset + PAGE_SIZE - 1);

    if (filterFn) {
      query = filterFn(query) as typeof query;
    }

    const { data, error } = await query;
    if (error) return { data: [], error: error.message };
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allRows.push(...data);
      offset += PAGE_SIZE;
      if (data.length < PAGE_SIZE) hasMore = false;
    }
  }
  return { data: allRows, error: null };
}

export async function POST(req: NextRequest) {
  try {
  // AUTH CHECK - agregado 22-Feb-2026
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

    const { tipo, filtros } = await req.json();
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ARIA27 - Grupo Constructor Avante";
    workbook.created = new Date();

    if (tipo === "gastos") {
      const sheet = workbook.addWorksheet("Gastos de Obra");
      
      const { data, error: gastosErr } = await fetchAllRows(supabase, "gastos", "fecha", false, (q) => {
        let fq = q;
        if (filtros?.obra) fq = fq.eq("obra", filtros.obra);
        if (filtros?.semana && filtros.semana !== "") fq = fq.eq("semana", parseInt(filtros.semana));
        if (filtros?.fechaInicio) fq = fq.gte("fecha", filtros.fechaInicio);
        if (filtros?.fechaFin) fq = fq.lte("fecha", filtros.fechaFin);
        return fq;
      });

      if (gastosErr) {
        return NextResponse.json({ error: gastosErr }, { status: 500 });
      }

      // Header
      sheet.mergeCells("A1:G1");
      sheet.getCell("A1").value = "REPORTE DE GASTOS DE OBRA";
      sheet.getCell("A1").font = { name: "Calibri", size: 18, bold: true, color: { argb: "FFFFFF" } };
      sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0F172A" } };
      sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
      sheet.getRow(1).height = 35;

      sheet.mergeCells("A2:G2");
      sheet.getCell("A2").value = `Generado: ${new Date().toLocaleDateString("es-MX")} | Total: ${data?.length || 0} registros`;
      sheet.getCell("A2").font = { name: "Calibri", size: 11, italic: true };
      sheet.getCell("A2").alignment = { horizontal: "center" };

      const headers = ["Fecha", "Semana", "Obra", "Solicitante", "Descripción", "Proveedor", "Monto"];
      const headerRow = sheet.getRow(4);
      headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true, color: { argb: "FFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "10B981" } };
        cell.alignment = { horizontal: "center" };
      });

      let total = 0;
      (data || []).forEach((g, idx) => {
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
        
        const bg = idx % 2 === 0 ? "F8FAFC" : "FFFFFF";
        for (let i = 1; i <= 7; i++) {
          row.getCell(i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        }
      });

      // Total
      const totalRow = sheet.getRow(5 + (data?.length || 0));
      totalRow.getCell(6).value = "TOTAL:";
      totalRow.getCell(6).font = { bold: true };
      totalRow.getCell(7).value = total;
      totalRow.getCell(7).numFmt = '"$"#,##0.00';
      totalRow.getCell(7).font = { bold: true, color: { argb: "059669" } };

      [12, 10, 25, 25, 40, 25, 15].forEach((w, i) => sheet.getColumn(i + 1).width = w);
      sheet.autoFilter = { from: "A4", to: "G4" };

    } else if (tipo === "nomina") {
      // Obtener TODOS los datos de nomina_historico (paginado para superar límite de 1000 filas)
      const { data: allData, error: nominaErr } = await fetchAllRows(supabase, "nomina_historico", "semana", false);

      if (nominaErr) {
        return NextResponse.json({ error: nominaErr }, { status: 500 });
      }

      // Aplicar filtros si existen
      let filteredData = allData || [];
      if (filtros?.semana && filtros.semana !== "") {
        const semNum = parseInt(filtros.semana);
        filteredData = filteredData.filter(r => r.semana === semNum);
      }
      if (filtros?.empleado && filtros.empleado !== "") {
        filteredData = filteredData.filter(r => r.nombre === filtros.empleado);
      }

      // Obtener semanas y empleados SOLO de los datos existentes
      const semanasUnicas = [...new Set((allData || []).map(r => r.semana))].sort((a, b) => b - a);
      const empleadosUnicos = [...new Set((allData || []).map(r => r.nombre))].sort();

      // ═══════════════════════════════════════════════════════════
      // PESTAÑA 1: RESUMEN EJECUTIVO
      // ═══════════════════════════════════════════════════════════
      const sheetResumen = workbook.addWorksheet("Resumen Ejecutivo");
      
      sheetResumen.mergeCells("A1:D1");
      sheetResumen.getCell("A1").value = "RESUMEN EJECUTIVO DE NÓMINA";
      sheetResumen.getCell("A1").font = { name: "Calibri", size: 18, bold: true, color: { argb: "FFFFFF" } };
      sheetResumen.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0F172A" } };
      sheetResumen.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
      sheetResumen.getRow(1).height = 35;

      sheetResumen.mergeCells("A2:D2");
      sheetResumen.getCell("A2").value = `Grupo Constructor Avante | ${new Date().toLocaleDateString("es-MX")}`;
      sheetResumen.getCell("A2").font = { italic: true };
      sheetResumen.getCell("A2").alignment = { horizontal: "center" };

      // Métricas
      const totalGeneral = (allData || []).reduce((s, r) => s + (r.sueldo_total || 0), 0);
      
      sheetResumen.getCell("A4").value = "MÉTRICAS";
      sheetResumen.getCell("A4").font = { size: 14, bold: true, color: { argb: "8B5CF6" } };

      const metricas = [
        ["Total Registros", allData?.length || 0],
        ["Empleados Únicos", empleadosUnicos.length],
        ["Semanas", semanasUnicas.length],
        ["Nómina Total", totalGeneral],
      ];
      metricas.forEach((m, idx) => {
        sheetResumen.getCell(`A${5 + idx}`).value = m[0];
        sheetResumen.getCell(`B${5 + idx}`).value = m[1];
        if (idx === 3) sheetResumen.getCell(`B${5 + idx}`).numFmt = '"$"#,##0.00';
      });

      // Resumen por semana
      sheetResumen.getCell("A11").value = "POR SEMANA";
      sheetResumen.getCell("A11").font = { size: 14, bold: true, color: { argb: "8B5CF6" } };

      const headerRes = sheetResumen.getRow(12);
      ["Semana", "Empleados", "Total", "Promedio"].forEach((h, i) => {
        headerRes.getCell(i + 1).value = h;
        headerRes.getCell(i + 1).font = { bold: true, color: { argb: "FFFFFF" } };
        headerRes.getCell(i + 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "8B5CF6" } };
      });

      semanasUnicas.forEach((sem, idx) => {
        const regs = (allData || []).filter(r => r.semana === sem);
        const total = regs.reduce((s, r) => s + (r.sueldo_total || 0), 0);
        const row = sheetResumen.getRow(13 + idx);
        row.getCell(1).value = sem;
        row.getCell(2).value = regs.length;
        row.getCell(3).value = total;
        row.getCell(3).numFmt = '"$"#,##0.00';
        row.getCell(4).value = regs.length > 0 ? total / regs.length : 0;
        row.getCell(4).numFmt = '"$"#,##0.00';
      });

      [15, 15, 18, 18].forEach((w, i) => sheetResumen.getColumn(i + 1).width = w);

      // ═══════════════════════════════════════════════════════════
      // PESTAÑA 2: DETALLE COMPLETO
      // ═══════════════════════════════════════════════════════════
      const sheetDetalle = workbook.addWorksheet("Detalle");
      
      const tituloDetalle = "DETALLE DE NÓMINA" + 
        (filtros?.semana ? ` - SEM ${filtros.semana}` : "") + 
        (filtros?.empleado ? ` - ${filtros.empleado}` : "");
      
      sheetDetalle.mergeCells("A1:F1");
      sheetDetalle.getCell("A1").value = tituloDetalle;
      sheetDetalle.getCell("A1").font = { size: 16, bold: true, color: { argb: "FFFFFF" } };
      sheetDetalle.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "3B82F6" } };
      sheetDetalle.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
      sheetDetalle.getRow(1).height = 32;

      sheetDetalle.mergeCells("A2:F2");
      const totalFiltrado = filteredData.reduce((s, r) => s + (r.sueldo_total || 0), 0);
      sheetDetalle.getCell("A2").value = `${filteredData.length} registros | Total: $${totalFiltrado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
      sheetDetalle.getCell("A2").alignment = { horizontal: "center" };

      const headersDetalle = ["Sem", "Nombre", "Puesto", "Sal.Mensual", "Sal.Semanal", "Sueldo Total"];
      const headerRowD = sheetDetalle.getRow(4);
      headersDetalle.forEach((h, i) => {
        headerRowD.getCell(i + 1).value = h;
        headerRowD.getCell(i + 1).font = { bold: true, color: { argb: "FFFFFF" } };
        headerRowD.getCell(i + 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "3B82F6" } };
      });

      filteredData.forEach((r, idx) => {
        const row = sheetDetalle.getRow(5 + idx);
        row.getCell(1).value = r.semana;
        row.getCell(2).value = r.nombre || "";
        row.getCell(3).value = r.puesto || "";
        row.getCell(4).value = r.salario_mensual || 0;
        row.getCell(4).numFmt = '"$"#,##0.00';
        row.getCell(5).value = r.salario_semanal || 0;
        row.getCell(5).numFmt = '"$"#,##0.00';
        row.getCell(6).value = r.sueldo_total || 0;
        row.getCell(6).numFmt = '"$"#,##0.00';
        
        const bg = idx % 2 === 0 ? "F8FAFC" : "FFFFFF";
        for (let i = 1; i <= 6; i++) {
          row.getCell(i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        }
      });

      // Total
      const totalRowD = sheetDetalle.getRow(5 + filteredData.length);
      totalRowD.getCell(5).value = "TOTAL:";
      totalRowD.getCell(5).font = { bold: true };
      totalRowD.getCell(6).value = totalFiltrado;
      totalRowD.getCell(6).numFmt = '"$"#,##0.00';
      totalRowD.getCell(6).font = { bold: true, color: { argb: "059669" } };

      [8, 32, 18, 15, 15, 15].forEach((w, i) => sheetDetalle.getColumn(i + 1).width = w);
      sheetDetalle.autoFilter = { from: "A4", to: "F4" };

      // ═══════════════════════════════════════════════════════════
      // PESTAÑA 3: POR EMPLEADO (solo empleados que existen en datos)
      // ═══════════════════════════════════════════════════════════
      const sheetEmp = workbook.addWorksheet("Por Empleado");
      
      sheetEmp.mergeCells("A1:E1");
      sheetEmp.getCell("A1").value = "ACUMULADO POR EMPLEADO";
      sheetEmp.getCell("A1").font = { size: 16, bold: true, color: { argb: "FFFFFF" } };
      sheetEmp.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F59E0B" } };
      sheetEmp.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
      sheetEmp.getRow(1).height = 32;

      const headersEmp = ["Empleado", "Puesto", "Semanas", "Total", "Promedio"];
      const headerRowE = sheetEmp.getRow(3);
      headersEmp.forEach((h, i) => {
        headerRowE.getCell(i + 1).value = h;
        headerRowE.getCell(i + 1).font = { bold: true, color: { argb: "FFFFFF" } };
        headerRowE.getCell(i + 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F59E0B" } };
      });

      // Agrupar por empleado SOLO con los datos existentes
      const empData = empleadosUnicos.map(emp => {
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
      empData.forEach((e, idx) => {
        const row = sheetEmp.getRow(4 + idx);
        row.getCell(1).value = e.nombre;
        row.getCell(2).value = e.puesto;
        row.getCell(3).value = e.semanas;
        row.getCell(4).value = e.total;
        row.getCell(4).numFmt = '"$"#,##0.00';
        row.getCell(5).value = e.promedio;
        row.getCell(5).numFmt = '"$"#,##0.00';
        granTotal += e.total;
        
        const bg = idx % 2 === 0 ? "F8FAFC" : "FFFFFF";
        for (let i = 1; i <= 5; i++) {
          row.getCell(i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        }
      });

      const totalRowE = sheetEmp.getRow(4 + empData.length);
      totalRowE.getCell(3).value = "TOTAL:";
      totalRowE.getCell(3).font = { bold: true };
      totalRowE.getCell(4).value = granTotal;
      totalRowE.getCell(4).numFmt = '"$"#,##0.00';
      totalRowE.getCell(4).font = { bold: true, color: { argb: "059669" } };

      [32, 18, 12, 18, 18].forEach((w, i) => sheetEmp.getColumn(i + 1).width = w);
      sheetEmp.autoFilter = { from: "A3", to: "E3" };

      // ═══════════════════════════════════════════════════════════
      // PESTAÑAS POR SEMANA (solo las que existen)
      // ═══════════════════════════════════════════════════════════
      semanasUnicas.forEach(sem => {
        const sheetSem = workbook.addWorksheet(`Sem ${sem}`);
        const datosSem = (allData || []).filter(r => r.semana === sem).sort((a, b) => (b.sueldo_total || 0) - (a.sueldo_total || 0));
        
        const totalSem = datosSem.reduce((s, r) => s + (r.sueldo_total || 0), 0);
        
        sheetSem.mergeCells("A1:D1");
        sheetSem.getCell("A1").value = `SEMANA ${sem} - ${datosSem.length} empleados - Total: $${totalSem.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
        sheetSem.getCell("A1").font = { size: 14, bold: true, color: { argb: "FFFFFF" } };
        sheetSem.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "EC4899" } };
        sheetSem.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
        sheetSem.getRow(1).height = 30;

        const headersSem = ["Nombre", "Puesto", "Sal.Semanal", "Sueldo Total"];
        const headerRowS = sheetSem.getRow(3);
        headersSem.forEach((h, i) => {
          headerRowS.getCell(i + 1).value = h;
          headerRowS.getCell(i + 1).font = { bold: true, color: { argb: "FFFFFF" } };
          headerRowS.getCell(i + 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "EC4899" } };
        });

        datosSem.forEach((r, idx) => {
          const row = sheetSem.getRow(4 + idx);
          row.getCell(1).value = r.nombre || "";
          row.getCell(2).value = r.puesto || "";
          row.getCell(3).value = r.salario_semanal || 0;
          row.getCell(3).numFmt = '"$"#,##0.00';
          row.getCell(4).value = r.sueldo_total || 0;
          row.getCell(4).numFmt = '"$"#,##0.00';
          
          const bg = idx % 2 === 0 ? "F8FAFC" : "FFFFFF";
          for (let i = 1; i <= 4; i++) {
            row.getCell(i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
          }
        });

        // Total de la semana
        const totalRowS = sheetSem.getRow(4 + datosSem.length);
        totalRowS.getCell(3).value = "TOTAL:";
        totalRowS.getCell(3).font = { bold: true };
        totalRowS.getCell(4).value = totalSem;
        totalRowS.getCell(4).numFmt = '"$"#,##0.00';
        totalRowS.getCell(4).font = { bold: true, color: { argb: "EC4899" } };

        [32, 18, 15, 15].forEach((w, i) => sheetSem.getColumn(i + 1).width = w);
      });

      // ═══════════════════════════════════════════════════════════
      // PESTAÑAS POR EMPLEADO (recibos individuales)
      // ═══════════════════════════════════════════════════════════
      empleadosUnicos.slice(0, 20).forEach(emp => {
        const nombreCorto = emp.split(" ").slice(0, 2).join(" ").substring(0, 25);
        const sheetEmpInd = workbook.addWorksheet(nombreCorto, { properties: { tabColor: { argb: "06B6D4" } } });
        const datosEmp = (allData || []).filter(r => r.nombre === emp).sort((a, b) => b.semana - a.semana);
        
        const totalEmp = datosEmp.reduce((s, r) => s + (r.sueldo_total || 0), 0);
        const puesto = datosEmp[0]?.puesto || "";
        
        // Header con nombre completo
        sheetEmpInd.mergeCells("A1:E1");
        sheetEmpInd.getCell("A1").value = emp.toUpperCase();
        sheetEmpInd.getCell("A1").font = { size: 16, bold: true, color: { argb: "FFFFFF" } };
        sheetEmpInd.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0F172A" } };
        sheetEmpInd.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
        sheetEmpInd.getRow(1).height = 32;
        
        // Info del empleado
        sheetEmpInd.mergeCells("A2:E2");
        sheetEmpInd.getCell("A2").value = `${puesto} | ${datosEmp.length} semanas trabajadas | Total acumulado: ${totalEmp.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
        sheetEmpInd.getCell("A2").font = { italic: true };
        sheetEmpInd.getCell("A2").alignment = { horizontal: "center" };
        
        // Headers
        const headersEmpInd = ["Semana", "Puesto", "Sal. Mensual", "Sal. Semanal", "Sueldo Total"];
        const headerRowEI = sheetEmpInd.getRow(4);
        headersEmpInd.forEach((h, i) => {
          headerRowEI.getCell(i + 1).value = h;
          headerRowEI.getCell(i + 1).font = { bold: true, color: { argb: "FFFFFF" } };
          headerRowEI.getCell(i + 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "06B6D4" } };
        });
        
        datosEmp.forEach((r, idx) => {
          const row = sheetEmpInd.getRow(5 + idx);
          row.getCell(1).value = r.semana;
          row.getCell(2).value = r.puesto || "";
          row.getCell(3).value = r.salario_mensual || 0;
          row.getCell(3).numFmt = '"$"#,##0.00';
          row.getCell(4).value = r.salario_semanal || 0;
          row.getCell(4).numFmt = '"$"#,##0.00';
          row.getCell(5).value = r.sueldo_total || 0;
          row.getCell(5).numFmt = '"$"#,##0.00';
          
          const bg = idx % 2 === 0 ? "F0FDFA" : "FFFFFF";
          for (let i = 1; i <= 5; i++) {
            row.getCell(i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
          }
        });
        
        // Total del empleado
        const totalRowEI = sheetEmpInd.getRow(5 + datosEmp.length);
        totalRowEI.getCell(4).value = "TOTAL ACUMULADO:";
        totalRowEI.getCell(4).font = { bold: true };
        totalRowEI.getCell(4).alignment = { horizontal: "right" };
        totalRowEI.getCell(5).value = totalEmp;
        totalRowEI.getCell(5).numFmt = '"$"#,##0.00';
        totalRowEI.getCell(5).font = { bold: true, color: { argb: "059669" } };
        totalRowEI.getCell(5).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "CCFBF1" } };
        
        // Promedio
        const avgRow = sheetEmpInd.getRow(6 + datosEmp.length);
        avgRow.getCell(4).value = "PROMEDIO SEMANAL:";
        avgRow.getCell(4).font = { bold: true };
        avgRow.getCell(4).alignment = { horizontal: "right" };
        avgRow.getCell(5).value = datosEmp.length > 0 ? totalEmp / datosEmp.length : 0;
        avgRow.getCell(5).numFmt = '"$"#,##0.00';
        avgRow.getCell(5).font = { bold: true, color: { argb: "0891B2" } };
        
        [12, 18, 15, 15, 15].forEach((w, i) => sheetEmpInd.getColumn(i + 1).width = w);
      });

    } else if (tipo === "requisiciones") {
      const sheet = workbook.addWorksheet("Requisiciones");
      
      const { data, error: reqErr } = await fetchAllRows(supabase, "requisiciones_historico", "fecha", false, (q) => {
        let fq = q;
        if (filtros?.obra) fq = fq.eq("obra", filtros.obra);
        if (filtros?.status) fq = fq.eq("status", filtros.status);
        if (filtros?.solicitante) fq = fq.eq("solicitante", filtros.solicitante);
        if (filtros?.fechaInicio) fq = fq.gte("fecha", filtros.fechaInicio);
        if (filtros?.fechaFin) fq = fq.lte("fecha", filtros.fechaFin);
        return fq;
      });

      if (reqErr) {
        return NextResponse.json({ error: reqErr }, { status: 500 });
      }

      sheet.mergeCells("A1:H1");
      sheet.getCell("A1").value = "REPORTE DE REQUISICIONES";
      sheet.getCell("A1").font = { size: 18, bold: true, color: { argb: "FFFFFF" } };
      sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0F172A" } };
      sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
      sheet.getRow(1).height = 35;

      sheet.mergeCells("A2:H2");
      sheet.getCell("A2").value = `Generado: ${new Date().toLocaleDateString("es-MX")} | Total: ${data?.length || 0} registros`;
      sheet.getCell("A2").font = { italic: true };
      sheet.getCell("A2").alignment = { horizontal: "center" };

      const headers = ["Folio", "Fecha", "Solicitante", "Obra", "Descripción", "Proveedor", "Monto", "Estatus"];
      const headerRow = sheet.getRow(4);
      headers.forEach((h, i) => {
        headerRow.getCell(i + 1).value = h;
        headerRow.getCell(i + 1).font = { bold: true, color: { argb: "FFFFFF" } };
        headerRow.getCell(i + 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F59E0B" } };
      });

      let total = 0;
      (data || []).forEach((r, idx) => {
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
        
        const bg = idx % 2 === 0 ? "F8FAFC" : "FFFFFF";
        for (let i = 1; i <= 8; i++) {
          row.getCell(i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        }
      });

      const totalRow = sheet.getRow(5 + (data?.length || 0));
      totalRow.getCell(6).value = "TOTAL:";
      totalRow.getCell(6).font = { bold: true };
      totalRow.getCell(7).value = total;
      totalRow.getCell(7).numFmt = '"$"#,##0.00';
      totalRow.getCell(7).font = { bold: true, color: { argb: "059669" } };

      [8, 12, 25, 25, 45, 25, 15, 20].forEach((w, i) => sheet.getColumn(i + 1).width = w);
      sheet.autoFilter = { from: "A4", to: "H4" };

    } else {
      return NextResponse.json({ error: "Tipo no válido" }, { status: 400 });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${tipo}_ARIA_${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error("[EXPORT]", { error: String(msg) });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


