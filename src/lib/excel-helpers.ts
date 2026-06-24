import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface Partida {
  categoria?: string;
  concepto?: string;
  cantidad?: number;
  precio_unitario?: number;
  monto: number;
}

export interface Requisition {
  id?: string;
  folio?: string;
  status?: string;
  created_at?: string;
}

export interface PurchaseOrder {
  po_number?: string;
  supplier_name?: string;
  total: number;
  status?: string;
  created_at?: string;
}

export interface NominaRecord {
  empleado_nombre?: string;
  semana?: number;
  anio?: number;
  neto_pagar: number;
  status?: string;
}

export interface CobroRecord {
  folio?: string;
  fecha?: string;
  monto: number;
  cliente_nombre?: string;
  estatus?: string;
}

export interface AvanceRecord {
  semana_iso?: string;
  porcentaje_avance: number;
}

export interface BitacoraRecord {
  fecha?: string;
  clima?: string;
  personal_en_obra?: string;
  actividades?: string;
  incidentes?: string;
}

export interface ObraData {
  partidas: Partida[];
  requisitions: Requisition[];
  ocs: PurchaseOrder[];
  nomina: NominaRecord[];
  cobros: CobroRecord[];
  avances: AvanceRecord[];
  bitacora: BitacoraRecord[];
}

export interface ObraKPIs {
  totalPpto: number;
  totalOC: number;
  totalNomina: number;
  totalCobrado: number;
  gastoTotal: number;
  margen: number;
  saldoPpto: number;
  ultAvance: number;
}

/**
 * Authenticates request using cookie session (__Host-aria_session) or Bearer token.
 * FIX 541.1: x-user-email fallback ELIMINADO — era vector de suplantacion.
 * Returns userEmail or null if unauthorized
 */
export async function authenticateRequest(
  req: NextRequest,
  supabase: SupabaseClient
): Promise<string | null> {
  let userEmail: string | null = null;

  // Try Bearer token
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user } } = await supabaseAuth.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (user?.email) userEmail = user.email;
  }

  // FIX 541.1: cookie __Host-aria_session (NO header x-user-email)
  if (!userEmail) {
    try {
      const { verifySession, getSessionTokenFromCookies } = await import("@/lib/session");
      const token = getSessionTokenFromCookies(req.headers.get("cookie"));
      const session = await verifySession(token);
      if (session?.email) userEmail = session.email;
    } catch { /* silencioso: si session.ts no disponible (build) sigue sin auth */ }
  }

  return userEmail;
}

/**
 * Fetches all obra data in parallel from 7 tables
 */
export async function fetchObraData(
  supabase: SupabaseClient,
  obra: string
): Promise<ObraData> {
  const [presPart, reqs, ocs, nomina, cobros, avances, bitacora] =
    await Promise.all([
      supabase
        .from("presupuestos_partidas")
        .select("*")
        .eq("obra_nombre", obra),
      supabase
        .from("requisitions")
        .select("id, folio, status, created_at")
        .eq("cost_center_name", obra),
      supabase
        .from("purchase_orders")
        .select("po_number, supplier_name, total, status, created_at")
        .eq("obra_nombre", obra)
        .neq("status", "CANCELADA")
        .order("created_at", { ascending: false }),
      supabase
        .from("nomina_historico")
        .select("empleado_nombre, semana, anio, neto_pagar, status")
        .eq("obra", obra)
        .eq("status", "CONFIRMADA")
        .order("anio", { ascending: false })
        .order("semana", { ascending: false })
        .limit(500),
      supabase
        .from("cobros_manuales")
        .select("folio, fecha, monto, cliente_nombre, estatus")
        .eq("obra_nombre", obra)
        .neq("estatus", "CANCELADO")
        .order("fecha", { ascending: false }),
      supabase
        .from("obra_avances")
        .select("semana_iso, porcentaje_avance")
        .eq("obra_nombre", obra)
        .order("semana_iso", { ascending: false })
        .limit(20),
      supabase
        .from("bitacora_obra")
        .select("fecha, clima, personal_en_obra, actividades, incidentes")
        .eq("obra_nombre", obra)
        .order("fecha", { ascending: false })
        .limit(100),
    ]);

  return {
    partidas: (presPart.data as Partida[]) || [],
    requisitions: (reqs.data as Requisition[]) || [],
    ocs: (ocs.data as PurchaseOrder[]) || [],
    nomina: (nomina.data as NominaRecord[]) || [],
    cobros: (cobros.data as CobroRecord[]) || [],
    avances: (avances.data as AvanceRecord[]) || [],
    bitacora: (bitacora.data as BitacoraRecord[]) || [],
  };
}
/**
 * Calculates KPIs from obra data
 */
export function calculateObraKPIs(data: ObraData): ObraKPIs {
  const sumNum = (arr: Record<string, unknown>[], key: string) =>
    arr.reduce((s, r) => s + Number(r[key] || 0), 0);

  const totalPpto = sumNum(data.partidas as unknown as Record<string, unknown>[], "monto");
  const totalOC = sumNum(data.ocs as unknown as Record<string, unknown>[], "total");
  const totalNomina = sumNum(data.nomina as unknown as Record<string, unknown>[], "neto_pagar");
  const totalCobrado = sumNum(data.cobros as unknown as Record<string, unknown>[], "monto");
  const gastoTotal = totalOC + totalNomina;
  const margen = totalCobrado - gastoTotal;
  const saldoPpto = totalPpto - gastoTotal;
  const ultAvance = data.avances[0]?.porcentaje_avance || 0;

  return {
    totalPpto,
    totalOC,
    totalNomina,
    totalCobrado,
    gastoTotal,
    margen,
    saldoPpto,
    ultAvance,
  };
}

/**
 * Adds the Resumen sheet (Sheet 1) with KPIs
 */
export function addResumenSheet(
  wb: ExcelJS.Workbook,
  obra: string,
  userEmail: string,
  kpis: ObraKPIs
): void {
  const s1 = wb.addWorksheet("Resumen");
  s1.columns = [{ width: 30 }, { width: 20 }];

  s1.addRow(["Reporte ejecutivo de obra", obra]);
  s1.getCell("A1").font = { bold: true, size: 14 };

  s1.addRow([]);
  s1.addRow(["Generado", new Date().toLocaleString("es-MX")]);
  s1.addRow(["Generado por", userEmail]);
  s1.addRow([]);

  const kpisData: [string, number, string][] = [
    ["Presupuesto total", kpis.totalPpto, "$#,##0.00"],
    ["Gasto OC", kpis.totalOC, "$#,##0.00"],
    ["Gasto N\u00f3mina", kpis.totalNomina, "$#,##0.00"],
    ["Gasto Total", kpis.gastoTotal, "$#,##0.00"],
    ["Cobrado", kpis.totalCobrado, "$#,##0.00"],
    ["Margen Real", kpis.margen, "$#,##0.00"],
    ["Saldo Presupuesto", kpis.saldoPpto, "$#,##0.00"],
    ["Avance F\u00edsico %", kpis.ultAvance, "0.00%"],
  ];

  kpisData.forEach(([label, val, fmt]) => {
    const r = s1.addRow([label, val]);
    r.getCell(2).numFmt = fmt;
    if (label === "Avance F\u00edsico %") r.getCell(2).value = Number(val) / 100;
    r.getCell(1).font = { bold: true };
  });
}
/**
 * Adds data sheets (Sheets 2-7) for presupuesto, OCs, n\u00f3mina, cobros, avance, bit\u00e1cora
 */
export function addDataSheets(wb: ExcelJS.Workbook, data: ObraData): void {
  // SHEET 2 \u2014 Presupuesto
  const s2 = wb.addWorksheet("Presupuesto");
  s2.columns = [
    { header: "Categor\u00eda", key: "categoria", width: 20 },
    { header: "Concepto", key: "concepto", width: 40 },
    { header: "Cantidad", key: "cantidad", width: 12 },
    { header: "P.U.", key: "precio_unitario", width: 14 },
    { header: "Monto", key: "monto", width: 16 },
  ];
  s2.getRow(1).font = { bold: true };
  data.partidas.forEach((p) => s2.addRow(p));
  s2.getColumn("precio_unitario").numFmt = "$#,##0.00";
  s2.getColumn("monto").numFmt = "$#,##0.00";
  if (data.partidas.length > 0) {
    const totalRow = s2.addRow([
      "",
      "TOTAL",
      "",
      "",
      { formula: `SUM(E2:E${data.partidas.length + 1})` },
    ]);
    totalRow.font = { bold: true };
  }

  // SHEET 3 \u2014 OCs
  const s3 = wb.addWorksheet("\u00d3rdenes de Compra");
  s3.columns = [
    { header: "PO", key: "po_number", width: 18 },
    { header: "Proveedor", key: "supplier_name", width: 30 },
    { header: "Status", key: "status", width: 14 },
    { header: "Total", key: "total", width: 16 },
    { header: "Fecha", key: "created_at", width: 18 },
  ];
  s3.getRow(1).font = { bold: true };
  data.ocs.forEach((o) =>
    s3.addRow({
      ...o,
      created_at: o.created_at
        ? new Date(o.created_at).toLocaleDateString("es-MX")
        : "",
    })
  );
  s3.getColumn("total").numFmt = "$#,##0.00";
  if (data.ocs.length > 0) {
    const tr = s3.addRow([
      "",
      "TOTAL",
      "",
      { formula: `SUM(D2:D${data.ocs.length + 1})` },
      "",
    ]);
    tr.font = { bold: true };
  }

  // SHEET 4 \u2014 N\u00f3mina
  const s4 = wb.addWorksheet("N\u00f3mina");
  s4.columns = [
    { header: "Empleado", key: "empleado_nombre", width: 30 },
    { header: "A\u00f1o", key: "anio", width: 8 },
    { header: "Semana", key: "semana", width: 10 },
    { header: "Neto", key: "neto_pagar", width: 14 },
    { header: "Status", key: "status", width: 14 },
  ];
  s4.getRow(1).font = { bold: true };
  data.nomina.forEach((n) => s4.addRow(n));
  s4.getColumn("neto_pagar").numFmt = "$#,##0.00";
  if (data.nomina.length > 0) {
    const tr = s4.addRow([
      "TOTAL",
      "",
      "",
      { formula: `SUM(D2:D${data.nomina.length + 1})` },
      "",
    ]);
    tr.font = { bold: true };
  }

  // SHEET 5 \u2014 Cobros
  const s5 = wb.addWorksheet("Cobros");
  s5.columns = [
    { header: "Folio", key: "folio", width: 18 },
    { header: "Fecha", key: "fecha", width: 14 },
    { header: "Cliente", key: "cliente_nombre", width: 30 },
    { header: "Monto", key: "monto", width: 16 },
    { header: "Estatus", key: "estatus", width: 14 },
  ];
  s5.getRow(1).font = { bold: true };
  data.cobros.forEach((c) => s5.addRow(c));
  s5.getColumn("monto").numFmt = "$#,##0.00";
  if (data.cobros.length > 0) {
    const tr = s5.addRow([
      "",
      "",
      "TOTAL",
      { formula: `SUM(D2:D${data.cobros.length + 1})` },
      "",
    ]);
    tr.font = { bold: true };
  }

  // SHEET 6 \u2014 Avance F\u00edsico
  const s6 = wb.addWorksheet("Avance F\u00edsico");
  s6.columns = [
    { header: "Semana ISO", key: "semana_iso", width: 16 },
    { header: "% Avance", key: "porcentaje_avance", width: 14 },
  ];
  s6.getRow(1).font = { bold: true };
  data.avances.forEach((a) => s6.addRow(a));

  // SHEET 7 \u2014 Bit\u00e1cora
  const s7 = wb.addWorksheet("Bit\u00e1cora");
  s7.columns = [
    { header: "Fecha", key: "fecha", width: 14 },
    { header: "Clima", key: "clima", width: 14 },
    { header: "Personal", key: "personal_en_obra", width: 12 },
    { header: "Actividades", key: "actividades", width: 50 },
    { header: "Incidentes", key: "incidentes", width: 40 },
  ];
  s7.getRow(1).font = { bold: true };
  data.bitacora.forEach((b) => s7.addRow(b));
}

/**
 * Generates and returns Excel response with proper headers
 */
export async function generateExcelResponse(
  wb: ExcelJS.Workbook,
  obra: string
): Promise<NextResponse> {
  const buf = await wb.xlsx.writeBuffer();
  const filename = `reporte-${obra.replace(/\s+/g, "_")}-${new Date()
    .toISOString()
    .slice(0, 10)}.xlsx`;

  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
