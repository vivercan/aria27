import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

const log = logger("OBRAS-EXPORT-EXCEL");
const supabase = getSupabaseAdmin();

export async function GET(req: NextRequest) {
  try {
    // AUTH (mismo patrón que /api/nomina/export)
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
    if (!userEmail) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const obra = searchParams.get("obra");
    if (!obra) return NextResponse.json({ error: "Falta parámetro 'obra'" }, { status: 400 });

    log.info("export start", { obra, userEmail });

    // Datos en paralelo
    const [presPart, reqs, ocs, nomina, cobros, avances, bitacora] = await Promise.all([
      supabase.from("presupuestos_partidas").select("*").eq("obra_nombre", obra),
      supabase.from("requisitions").select("id, folio, status, created_at").eq("cost_center_name", obra),
      supabase.from("purchase_orders").select("po_number, supplier_name, total, status, created_at").eq("obra_nombre", obra).neq("status", "CANCELADA").order("created_at", { ascending: false }),
      supabase.from("nomina_historico").select("empleado_nombre, semana, anio, neto_pagar, status").eq("obra", obra).eq("status", "CONFIRMADA").order("anio", { ascending: false }).order("semana", { ascending: false }).limit(500),
      supabase.from("cobros_manuales").select("folio, fecha, monto, cliente_nombre, estatus").eq("obra_nombre", obra).neq("estatus", "CANCELADO").order("fecha", { ascending: false }),
      supabase.from("obra_avances").select("semana_iso, porcentaje_avance").eq("obra_nombre", obra).order("semana_iso", { ascending: false }).limit(20),
      supabase.from("bitacora_obra").select("fecha, clima, personal_en_obra, actividades, incidentes").eq("obra_nombre", obra).order("fecha", { ascending: false }).limit(100),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = "ARIA27";
    wb.created = new Date();

    const sumNum = (arr: any[], key: string) => arr.reduce((s, r) => s + Number(r[key] || 0), 0);
    const partidas = (presPart.data as any[]) || [];
    const ocsArr = (ocs.data as any[]) || [];
    const nomArr = (nomina.data as any[]) || [];
    const cobrosArr = (cobros.data as any[]) || [];
    const avancesArr = (avances.data as any[]) || [];
    const bitArr = (bitacora.data as any[]) || [];

    const totalPpto = sumNum(partidas, "monto");
    const totalOC = sumNum(ocsArr, "total");
    const totalNomina = sumNum(nomArr, "neto_pagar");
    const totalCobrado = sumNum(cobrosArr, "monto");
    const gastoTotal = totalOC + totalNomina;
    const margen = totalCobrado - gastoTotal;
    const ultAvance = avancesArr[0]?.porcentaje_avance || 0;

    // SHEET 1 — RESUMEN
    const s1 = wb.addWorksheet("Resumen");
    s1.columns = [{ width: 30 }, { width: 20 }];
    s1.addRow(["Reporte ejecutivo de obra", obra]);
    s1.getCell("A1").font = { bold: true, size: 14 };
    s1.addRow([]);
    s1.addRow(["Generado", new Date().toLocaleString("es-MX")]);
    s1.addRow(["Generado por", userEmail]);
    s1.addRow([]);
    const kpis: [string, number, string][] = [
      ["Presupuesto total", totalPpto, "$#,##0.00"],
      ["Gasto OC", totalOC, "$#,##0.00"],
      ["Gasto Nómina", totalNomina, "$#,##0.00"],
      ["Gasto Total", gastoTotal, "$#,##0.00"],
      ["Cobrado", totalCobrado, "$#,##0.00"],
      ["Margen Real", margen, "$#,##0.00"],
      ["Saldo Presupuesto", totalPpto - gastoTotal, "$#,##0.00"],
      ["Avance Físico %", ultAvance, "0.00%"],
    ];
    kpis.forEach(([label, val, fmt]) => {
      const r = s1.addRow([label, val]);
      r.getCell(2).numFmt = fmt;
      if (label === "Avance Físico %") r.getCell(2).value = Number(val) / 100;
      r.getCell(1).font = { bold: true };
    });

    // SHEET 2 — Presupuesto
    const s2 = wb.addWorksheet("Presupuesto");
    s2.columns = [
      { header: "Categoría", key: "categoria", width: 20 },
      { header: "Concepto", key: "concepto", width: 40 },
      { header: "Cantidad", key: "cantidad", width: 12 },
      { header: "P.U.", key: "precio_unitario", width: 14 },
      { header: "Monto", key: "monto", width: 16 },
    ];
    s2.getRow(1).font = { bold: true };
    partidas.forEach(p => s2.addRow(p));
    s2.getColumn("precio_unitario").numFmt = "$#,##0.00";
    s2.getColumn("monto").numFmt = "$#,##0.00";
    if (partidas.length > 0) {
      const totalRow = s2.addRow(["", "TOTAL", "", "", { formula: `SUM(E2:E${partidas.length + 1})` }]);
      totalRow.font = { bold: true };
    }

    // SHEET 3 — OCs
    const s3 = wb.addWorksheet("Órdenes de Compra");
    s3.columns = [
      { header: "PO", key: "po_number", width: 18 },
      { header: "Proveedor", key: "supplier_name", width: 30 },
      { header: "Status", key: "status", width: 14 },
      { header: "Total", key: "total", width: 16 },
      { header: "Fecha", key: "created_at", width: 18 },
    ];
    s3.getRow(1).font = { bold: true };
    ocsArr.forEach(o => s3.addRow({ ...o, created_at: o.created_at ? new Date(o.created_at).toLocaleDateString("es-MX") : "" }));
    s3.getColumn("total").numFmt = "$#,##0.00";
    if (ocsArr.length > 0) {
      const tr = s3.addRow(["", "TOTAL", "", { formula: `SUM(D2:D${ocsArr.length + 1})` }, ""]);
      tr.font = { bold: true };
    }

    // SHEET 4 — Nómina
    const s4 = wb.addWorksheet("Nómina");
    s4.columns = [
      { header: "Empleado", key: "empleado_nombre", width: 30 },
      { header: "Año", key: "anio", width: 8 },
      { header: "Semana", key: "semana", width: 10 },
      { header: "Neto", key: "neto_pagar", width: 14 },
      { header: "Status", key: "status", width: 14 },
    ];
    s4.getRow(1).font = { bold: true };
    nomArr.forEach(n => s4.addRow(n));
    s4.getColumn("neto_pagar").numFmt = "$#,##0.00";
    if (nomArr.length > 0) {
      const tr = s4.addRow(["TOTAL", "", "", { formula: `SUM(D2:D${nomArr.length + 1})` }, ""]);
      tr.font = { bold: true };
    }

    // SHEET 5 — Cobros
    const s5 = wb.addWorksheet("Cobros");
    s5.columns = [
      { header: "Folio", key: "folio", width: 18 },
      { header: "Fecha", key: "fecha", width: 14 },
      { header: "Cliente", key: "cliente_nombre", width: 30 },
      { header: "Monto", key: "monto", width: 16 },
      { header: "Estatus", key: "estatus", width: 14 },
    ];
    s5.getRow(1).font = { bold: true };
    cobrosArr.forEach(c => s5.addRow(c));
    s5.getColumn("monto").numFmt = "$#,##0.00";
    if (cobrosArr.length > 0) {
      const tr = s5.addRow(["", "", "TOTAL", { formula: `SUM(D2:D${cobrosArr.length + 1})` }, ""]);
      tr.font = { bold: true };
    }

    // SHEET 6 — Avance Físico
    const s6 = wb.addWorksheet("Avance Físico");
    s6.columns = [
      { header: "Semana ISO", key: "semana_iso", width: 16 },
      { header: "% Avance", key: "porcentaje_avance", width: 14 },
    ];
    s6.getRow(1).font = { bold: true };
    avancesArr.forEach(a => s6.addRow(a));

    // SHEET 7 — Bitácora
    const s7 = wb.addWorksheet("Bitácora");
    s7.columns = [
      { header: "Fecha", key: "fecha", width: 14 },
      { header: "Clima", key: "clima", width: 14 },
      { header: "Personal", key: "personal_en_obra", width: 12 },
      { header: "Actividades", key: "actividades", width: 50 },
      { header: "Incidentes", key: "incidentes", width: 40 },
    ];
    s7.getRow(1).font = { bold: true };
    bitArr.forEach(b => s7.addRow(b));

    const buf = await wb.xlsx.writeBuffer();
    const filename = `reporte-${obra.replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    log.info("export done", { obra, sheets: 7, bytes: (buf as any).byteLength });

    return new NextResponse(buf as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e: any) {
    log.error("export fail", { err: e?.message });
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}
