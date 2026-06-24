/**
 * GET /api/inventario/export?obra_id=X&format=excel|pdf&obra_nombre=...
 *
 * Exporta el inventario de una obra en formato Excel (XLSX) o PDF (HTML print-ready).
 * Requiere x-user-email o userEmail cookie para autenticación.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import ExcelJS from "exceljs";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

const log = logger("INVENTARIO-EXPORT");
const db = getSupabaseAdmin();

interface InventarioRow {
  id: string;
  producto_nombre: string;
  unidad: string;
  cantidad_disponible: number;
  cantidad_usada: number;
  ultimo_movimiento: string;
  obra_nombre: string;
  foto_url?: string | null;
  tipo?: string | null; // 22-Abr-2026: MATERIAL | HERRAMIENTA (default MATERIAL)
}

export async function GET(req: NextRequest) {
  // Rate limit — exportar es costoso
  const rl = checkRateLimit(getClientIdentifier(req), {
    key: "inventario:export",
    ...RATE_LIMITS.EXPENSIVE,
  });
  if (!rl.allowed) return rateLimitResponse(rl);

  const email =
    // FIX 541.1: cookie session (x-user-email LEGACY)
    (await (async () => { const a = await requireUser(req); return a.ok ? a.email : null; })()) ||
    req.cookies.get("userEmail")?.value;
  if (!email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get("obra_id");
  const obraParam = searchParams.get("obra_nombre") || "";
  const format = (searchParams.get("format") || "excel").toLowerCase();

  if (!obraId) {
    return NextResponse.json({ error: "Falta obra_id" }, { status: 400 });
  }

  try {
    // Fetch inventario rows
    const { data: rows, error } = await db
      .from("inventario_obra")
      .select("*")
      .eq("obra_id", obraId)
      .order("producto_nombre");

    if (error) {
      log.error("Error fetching inventario", { error: error.message, obraId });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const inventario: InventarioRow[] = rows || [];
    const obraNombre = inventario[0]?.obra_nombre || obraParam || obraId;
    const generadoEn = new Date().toLocaleString("es-MX", {
      timeZone: "America/Mexico_City",
      dateStyle: "long",
      timeStyle: "short",
    });

    log.info("export", { format, obraId, obraNombre, rows: inventario.length, email });

    if (format === "excel") {
      return await exportExcel(inventario, obraNombre, generadoEn, email);
    } else if (format === "pdf") {
      return exportPDFHtml(inventario, obraNombre, generadoEn, email);
    } else {
      return NextResponse.json({ error: "Formato inválido. Use 'excel' o 'pdf'" }, { status: 400 });
    }
  } catch (e: unknown) {
    log.error("export fail", { err: (e as { message?: string })?.message });
    return NextResponse.json(
      { error: (e as { message?: string })?.message || "Error interno" },
      { status: 500 }
    );
  }
}

// ─── EXCEL ───────────────────────────────────────────────────────────────────

async function exportExcel(
  inventario: InventarioRow[],
  obraNombre: string,
  generadoEn: string,
  email: string
): Promise<NextResponse> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ARIA27";
  wb.created = new Date();
  wb.subject = `Inventario ${obraNombre}`;

  // ── Hoja principal: Inventario ──
  const ws = wb.addWorksheet("Inventario", {
    pageSetup: {
      paperSize: 5, // Letter
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
    },
    headerFooter: {
      oddHeader: `&C&B Inventario - ${obraNombre}`,
      oddFooter: `&LGenerado: ${generadoEn}&R&P de &N`,
    },
  });

  // ── Título de obra (fila 1) ──
  ws.mergeCells("A1:G1");
  const titleCell = ws.getCell("A1");
  titleCell.value = `INVENTARIO DE MATERIALES — ${obraNombre.toUpperCase()}`;
  titleCell.font = { name: "Calibri", bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A3A2A" } };
  ws.getRow(1).height = 32;

  // ── Sub-título (fila 2) ──
  ws.mergeCells("A2:G2");
  const subCell = ws.getCell("A2");
  subCell.value = `Generado el ${generadoEn} por ${email}`;
  subCell.font = { name: "Calibri", italic: true, size: 10, color: { argb: "FF888888" } };
  subCell.alignment = { horizontal: "center" };
  ws.getRow(2).height = 18;

  // ── Encabezados (fila 4) ──
  const headers = [
    { header: "#", key: "num", width: 6 },
    { header: "Material / Producto", key: "nombre", width: 40 },
    { header: "Disponible", key: "disp", width: 14 },
    { header: "Usado", key: "usado", width: 12 },
    { header: "Unidad", key: "unidad", width: 14 },
    { header: "Último Movimiento", key: "fecha", width: 22 },
    { header: "Estado", key: "estado", width: 14 },
  ];

  ws.getRow(3).height = 6; // spacer

  const headerRow = ws.getRow(4);
  headers.forEach((h, i) => {
    const col = i + 1;
    ws.getColumn(col).width = h.width;
    const cell = headerRow.getCell(col);
    cell.value = h.header;
    cell.font = { name: "Calibri", bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF10B981" } };
    cell.alignment = { horizontal: col <= 2 ? "left" : "center", vertical: "middle" };
    cell.border = {
      bottom: { style: "medium", color: { argb: "FF047857" } },
    };
  });
  headerRow.height = 22;

  // ── Datos ──
  let totalDisp = 0;
  let totalUsado = 0;
  let bajoStock = 0;

  inventario.forEach((item, idx) => {
    const rowNum = idx + 5;
    const row = ws.getRow(rowNum);
    const esPar = idx % 2 === 0;
    const stockBajo = item.cantidad_disponible <= 5;
    if (stockBajo) bajoStock++;
    totalDisp += Number(item.cantidad_disponible) || 0;
    totalUsado += Number(item.cantidad_usada) || 0;

    const estado = stockBajo ? "⚠ Stock bajo" : item.cantidad_disponible === 0 ? "✗ Sin stock" : "✓ OK";
    const fecha = item.ultimo_movimiento
      ? new Date(item.ultimo_movimiento).toLocaleDateString("es-MX")
      : "—";

    const values = [idx + 1, item.producto_nombre, item.cantidad_disponible, item.cantidad_usada, item.unidad, fecha, estado];

    values.forEach((val, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = val;
      cell.font = { name: "Calibri", size: 10 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: esPar ? "FFF9FAFB" : "FFFFFFFF" },
      };
      cell.alignment = { horizontal: ci <= 1 ? "left" : "center", vertical: "middle" };

      // Color estado
      if (ci === 6) {
        if (estado.startsWith("⚠")) {
          cell.font = { name: "Calibri", size: 10, color: { argb: "FFB45309" }, bold: true };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
        } else if (estado.startsWith("✗")) {
          cell.font = { name: "Calibri", size: 10, color: { argb: "FFDC2626" }, bold: true };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
        } else {
          cell.font = { name: "Calibri", size: 10, color: { argb: "FF065F46" } };
        }
      }

      // Color disponible
      if (ci === 2 && stockBajo) {
        cell.font = { name: "Calibri", size: 10, color: { argb: "FFB45309" }, bold: true };
      }

      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });

    row.height = 18;
  });

  // ── Fila de totales ──
  const totRow = ws.getRow(inventario.length + 5);
  totRow.getCell(1).value = "";
  totRow.getCell(2).value = `TOTAL (${inventario.length} productos)`;
  totRow.getCell(3).value = totalDisp;
  totRow.getCell(4).value = totalUsado;
  totRow.getCell(5).value = "";
  totRow.getCell(6).value = "";
  totRow.getCell(7).value = `${bajoStock} con stock bajo`;

  [1, 2, 3, 4, 5, 6, 7].forEach((ci) => {
    const cell = totRow.getCell(ci);
    cell.font = { name: "Calibri", bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
    cell.alignment = { horizontal: ci <= 2 ? "left" : "center", vertical: "middle" };
    cell.border = { top: { style: "medium", color: { argb: "FF064E3B" } } };
  });
  totRow.height = 22;

  // ── Hoja Resumen KPIs ──
  const wsRes = wb.addWorksheet("Resumen");
  wsRes.getColumn(1).width = 32;
  wsRes.getColumn(2).width = 20;

  const kpiData = [
    ["Obra", obraNombre],
    ["Fecha exportación", generadoEn],
    ["Total productos", inventario.length],
    ["Total unidades disponibles", totalDisp],
    ["Total unidades usadas", totalUsado],
    ["Productos con stock bajo (≤5)", bajoStock],
    ["Porcentaje utilización", totalDisp + totalUsado > 0 ? `${Math.round((totalUsado / (totalDisp + totalUsado)) * 100)}%` : "N/A"],
  ];

  wsRes.mergeCells("A1:B1");
  const kpiTitle = wsRes.getCell("A1");
  kpiTitle.value = "RESUMEN DE INVENTARIO";
  kpiTitle.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  kpiTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF10B981" } };
  kpiTitle.alignment = { horizontal: "center" };
  wsRes.getRow(1).height = 28;

  kpiData.forEach(([label, val], i) => {
    const r = wsRes.getRow(i + 2);
    r.getCell(1).value = label;
    r.getCell(2).value = val;
    r.getCell(1).font = { bold: true, size: 11 };
    r.getCell(2).font = { size: 11 };
    r.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: i % 2 === 0 ? "FFF0FDF4" : "FFFFFFFF" } };
    r.getCell(2).fill = r.getCell(1).fill;
    r.height = 20;
  });

  // ── Generar buffer ──
  const buffer = await wb.xlsx.writeBuffer();
  const safeNombre = obraNombre.replace(/[^a-zA-Z0-9_\-áéíóúüñÁÉÍÓÚÜÑ ]/g, "").trim().replace(/ /g, "_");
  const safeUser  = email.split("@")[0].replace(/[^a-zA-Z0-9_\-]/g, "");
  const dateStr   = new Date().toISOString().slice(0, 10);
  const filename  = `ARIA27_Inventario_${safeNombre}_${dateStr}_${safeUser}.xlsx`;

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

// ─── PDF (HTML print-ready) ──────────────────────────────────────────────────

function exportPDFHtml(
  inventario: InventarioRow[],
  obraNombre: string,
  generadoEn: string,
  email: string
): NextResponse {
  let totalDisp = 0;
  let totalUsado = 0;
  let bajoStock = 0;

  const rows = inventario.map((item, idx) => {
    const stockBajo = item.cantidad_disponible <= 5;
    const sinStock = item.cantidad_disponible === 0;
    if (stockBajo) bajoStock++;
    totalDisp += Number(item.cantidad_disponible) || 0;
    totalUsado += Number(item.cantidad_usada) || 0;

    const fecha = item.ultimo_movimiento
      ? new Date(item.ultimo_movimiento).toLocaleDateString("es-MX")
      : "—";

    let estadoHtml = `<span class="badge ok">✓ OK</span>`;
    if (sinStock) estadoHtml = `<span class="badge sin-stock">✗ Sin stock</span>`;
    else if (stockBajo) estadoHtml = `<span class="badge bajo">⚠ Stock bajo</span>`;

    // 21-Abr-2026: columna Foto con thumbnail 40x40.
    // 22-Abr-2026 FIX: quitado loading="lazy" (bloqueaba la carga cuando se
    // imprime o guarda como PDF - solo cargaban las filas visibles en viewport).
    // Tambien validamos string vacio y agregamos onerror para no mostrar
    // imagen rota cuando la URL falla.
    const fotoHtml = (item.foto_url && String(item.foto_url).trim().length > 0)
      ? `<img src="${escHtml(item.foto_url)}" alt="${escHtml(item.producto_nombre)}" class="thumb" onerror="this.outerHTML='<span class=&quot;thumb-empty&quot;>&mdash;</span>'" />`
      : `<span class="thumb-empty">&mdash;</span>`;

    // 22-Abr-2026: columna Tipo (MATERIAL o HERRAMIENTA). Default MATERIAL.
    const tipo = (item as { tipo?: string }).tipo || "MATERIAL";
    const tipoHtml = tipo === "HERRAMIENTA"
      ? `<span class="badge-tipo badge-herram">Herramienta</span>`
      : `<span class="badge-tipo badge-mat">Material</span>`;

    return `
      <tr class="${idx % 2 === 0 ? "row-par" : "row-impar"}${stockBajo ? " stock-bajo" : ""}">
        <td class="text-center text-gray">${idx + 1}</td>
        <td class="text-center">${fotoHtml}</td>
        <td class="bold">${escHtml(item.producto_nombre)}</td>
        <td class="text-center">${tipoHtml}</td>
        <td class="text-center${stockBajo ? " text-warn bold" : " text-success bold"}">${item.cantidad_disponible}</td>
        <td class="text-center text-gray">${item.cantidad_usada}</td>
        <td class="text-center">${escHtml(item.unidad)}</td>
        <td class="text-center text-gray">${fecha}</td>
        <td class="text-center">${estadoHtml}</td>
      </tr>`;
  }).join("");

  const utilizacion = totalDisp + totalUsado > 0
    ? Math.round((totalUsado / (totalDisp + totalUsado)) * 100)
    : 0;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>ARIA27 — Inventario ${escHtml(obraNombre)} — ${escHtml(generadoEn)} — ${escHtml(email)}</title>
<style>
  /* ── Carta: 216×279mm ── */
  @page {
    size: letter landscape;
    margin: 15mm 12mm 15mm 12mm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 9.5pt;
    color: #1a2a1a;
    background: #fff;
  }

  /* ── ENCABEZADO ── */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 3px solid #10b981;
    padding-bottom: 8px;
    margin-bottom: 12px;
  }
  .header-brand { display: flex; align-items: center; gap: 10px; }
  .brand-box {
    background: #10b981;
    color: #fff;
    font-size: 14pt;
    font-weight: 800;
    padding: 6px 12px;
    border-radius: 6px;
    letter-spacing: 1px;
  }
  .header-title h1 {
    font-size: 14pt;
    font-weight: 700;
    color: #064e3b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .header-title p { font-size: 8.5pt; color: #6b7280; margin-top: 2px; }
  .header-meta { text-align: right; font-size: 8pt; color: #6b7280; line-height: 1.6; }
  .header-meta strong { color: #064e3b; }

  /* ── KPI CARDS ── */
  .kpi-row {
    display: flex;
    gap: 8px;
    margin-bottom: 14px;
  }
  .kpi {
    flex: 1;
    border: 1.5px solid #d1fae5;
    border-radius: 8px;
    padding: 8px 10px;
    background: #f0fdf4;
  }
  .kpi-val { font-size: 18pt; font-weight: 800; color: #047857; line-height: 1; }
  .kpi-lbl { font-size: 7.5pt; color: #6b7280; margin-top: 3px; }
  .kpi.warn { border-color: #fde68a; background: #fffbeb; }
  .kpi.warn .kpi-val { color: #b45309; }

  /* ── TABLA ── */
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  thead th {
    background: #10b981;
    color: #fff;
    font-weight: 600;
    padding: 7px 8px;
    text-align: center;
    border-bottom: 2px solid #047857;
    white-space: nowrap;
  }
  thead th:nth-child(2) { text-align: left; }
  .row-par  td { background: #f9fafb; }
  .row-impar td { background: #ffffff; }
  td {
    padding: 5px 8px;
    border-bottom: 1px solid #e5e7eb;
    vertical-align: middle;
  }
  .stock-bajo td { background: #fffbeb !important; }
  .text-center { text-align: center; }
  .text-gray   { color: #6b7280; }
  .text-success{ color: #065f46; }
  .text-warn   { color: #b45309; }
  .bold { font-weight: 600; }

  /* ── BADGES ── */
  .badge {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 9999px;
    font-size: 7.5pt;
    font-weight: 600;
    white-space: nowrap;
  }
  .badge.ok        { background: #d1fae5; color: #065f46; }
  .badge.bajo      { background: #fef3c7; color: #b45309; }
  .badge.sin-stock { background: #fee2e2; color: #dc2626; }

  /* ── THUMBNAILS (21-Abr-2026: foto en PDF inventario) ── */
  .thumb {
    width: 40px;
    height: 40px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid #d1fae5;
    display: inline-block;
    vertical-align: middle;
  }
  .thumb-empty {
    display: inline-block;
    width: 40px;
    height: 40px;
    line-height: 40px;
    color: #d1d5db;
    font-size: 14pt;
    text-align: center;
  }

  /* ── BADGES TIPO (22-Abr-2026: MATERIAL/HERRAMIENTA) ── */
  .badge-tipo {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 8pt;
    font-weight: 600;
    letter-spacing: 0.2px;
  }
  .badge-mat    { background: #dbeafe; color: #1e40af; }
  .badge-herram { background: #fef3c7; color: #92400e; }

  /* ── FILA TOTALES ── */
  .totals-row td {
    background: #047857 !important;
    color: #fff;
    font-weight: 700;
    font-size: 9.5pt;
    border-top: 2px solid #064e3b;
    border-bottom: none;
  }

  /* ── PIE DE PÁGINA ── */
  .footer {
    margin-top: 14px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-top: 1px solid #d1d5db;
    padding-top: 8px;
    font-size: 7.5pt;
    color: #9ca3af;
  }
  .footer strong { color: #064e3b; }

  /* ── PRINT OPTIMIZATION ── */
  @media print {
    .no-print { display: none !important; }
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
  }

  /* ── BOTÓN IMPRIMIR (pantalla) ── */
  .print-btn {
    display: block;
    margin: 0 auto 20px;
    padding: 10px 28px;
    background: #10b981;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 12pt;
    font-weight: 700;
    cursor: pointer;
    letter-spacing: 0.5px;
    transition: background 0.2s;
  }
  .print-btn:hover { background: #059669; }
  @media print { .print-btn { display: none !important; } }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">🖨 Imprimir / Guardar como PDF</button>

<div class="header">
  <div class="header-brand">
    <div class="brand-box">ARIA27</div>
    <div class="header-title">
      <h1>Inventario de Materiales</h1>
      <p>Grupo Constructor Urbano Avante — ERP</p>
    </div>
  </div>
  <div class="header-meta">
    <strong>Obra:</strong> ${escHtml(obraNombre)}<br/>
    <strong>Generado:</strong> ${escHtml(generadoEn)}<br/>
    <strong>Total productos:</strong> ${inventario.length}
  </div>
</div>

<div class="kpi-row">
  <div class="kpi">
    <div class="kpi-val">${inventario.length}</div>
    <div class="kpi-lbl">Productos registrados</div>
  </div>
  <div class="kpi">
    <div class="kpi-val">${totalDisp.toLocaleString("es-MX")}</div>
    <div class="kpi-lbl">Unidades disponibles</div>
  </div>
  <div class="kpi">
    <div class="kpi-val">${totalUsado.toLocaleString("es-MX")}</div>
    <div class="kpi-lbl">Unidades usadas</div>
  </div>
  <div class="kpi">
    <div class="kpi-val">${utilizacion}%</div>
    <div class="kpi-lbl">% Utilización</div>
  </div>
  <div class="kpi${bajoStock > 0 ? " warn" : ""}">
    <div class="kpi-val">${bajoStock}</div>
    <div class="kpi-lbl">Productos con stock bajo</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:4%">#</th>
      <th style="width:7%">Foto</th>
      <th style="width:22%;text-align:left">Producto</th>
      <th style="width:9%">Tipo</th>
      <th style="width:9%">Disponible</th>
      <th style="width:8%">Usado</th>
      <th style="width:9%">Unidad</th>
      <th style="width:14%">Último Movimiento</th>
      <th style="width:12%">Estado</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    <tr class="totals-row">
      <td></td>
      <td></td>
      <td>TOTAL — ${inventario.length} productos</td>
      <td></td>
      <td class="text-center">${totalDisp.toLocaleString("es-MX")}</td>
      <td class="text-center">${totalUsado.toLocaleString("es-MX")}</td>
      <td></td>
      <td></td>
      <td class="text-center">${bajoStock} con stock bajo</td>
    </tr>
  </tbody>
</table>

<div class="footer">
  <span>Generado por <strong>ARIA27 ERP</strong> — Grupo Constructor Urbano Avante &nbsp;|&nbsp; Usuario: <strong>${escHtml(email)}</strong></span>
  <span>${escHtml(generadoEn)}</span>
</div>

<script>
  // El iframe del cliente ya dispara window.print() desde fuera.
  // Este script no hace nada para evitar doble-print.
  // Si se abre standalone (URL directa), mostrar botón manual arriba.
</script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

// ─── Util ────────────────────────────────────────────────────────────────────
function escHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
