import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import {
  authenticateRequest,
  fetchObraData,
  calculateObraKPIs,
  addResumenSheet,
  addDataSheets,
  generateExcelResponse,
} from "@/lib/excel-helpers";

const log = logger("OBRAS-EXPORT-EXCEL");
const supabase = getSupabaseAdmin();

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const userEmail = await authenticateRequest(req, supabase);
    if (!userEmail) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Get obra parameter
    const { searchParams } = new URL(req.url);
    const obra = searchParams.get("obra");
    if (!obra) {
      return NextResponse.json(
        { error: "Falta par\u00e1metro 'obra'" },
        { status: 400 }
      );
    }

    log.info("export start", { obra, userEmail });

    // Fetch all obra data in parallel
    const data = await fetchObraData(supabase, obra);

    // Calculate KPIs
    const kpis = calculateObraKPIs(data);

    // Create workbook
    const wb = new ExcelJS.Workbook();
    wb.creator = "ARIA27";
    wb.created = new Date();

    // Add sheets
    addResumenSheet(wb, obra, userEmail, kpis);
    addDataSheets(wb, data);

    // Generate and return response
    const response = await generateExcelResponse(wb, obra);

    log.info("export done", { obra, sheets: 7, bytes: (await wb.xlsx.writeBuffer() as any).byteLength });

    return response;
  } catch (e: any) {
    log.error("export fail", { err: e?.message });
    return NextResponse.json(
      { error: e?.message || "Error interno" },
      { status: 500 }
    );
  }
}
