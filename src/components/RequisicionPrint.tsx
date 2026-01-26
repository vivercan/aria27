"use client";
import { useRef } from "react";
import { Printer } from "lucide-react";

interface Material {
  name: string;
  unit: string;
  qty?: number;
  quantity?: number;
  observations?: string;
  comments?: string;
}

interface RequisicionPrintProps {
  folio: string;
  fechaCreacion: string;
  fechaRequerida: string;
  solicitante: string;
  obra: string;
  materiales: Material[];
  comentarios?: string;
  status?: string;
}

export default function RequisicionPrint({
  folio,
  fechaCreacion,
  fechaRequerida,
  solicitante,
  obra,
  materiales,
  comentarios,
  status
}: RequisicionPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const fechaImpresion = new Date().toLocaleString("es-MX", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Requisición ${folio}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { size: letter; margin: 1.5cm; }
          body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
            color: #1a1a1a;
            line-height: 1.4;
          }
          .container {
            max-width: 100%;
            padding: 0;
          }
          /* Header */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #1e3a5f;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .logo { height: 60px; }
          .header-right { text-align: right; }
          .doc-title {
            font-size: 18pt;
            font-weight: bold;
            color: #1e3a5f;
            margin-bottom: 5px;
          }
          .folio {
            font-size: 14pt;
            font-weight: bold;
            color: #333;
            background: #f0f4f8;
            padding: 5px 15px;
            border-radius: 5px;
          }
          /* Info boxes */
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
          }
          .info-box {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 12px;
            background: #fafafa;
          }
          .info-label {
            font-size: 9pt;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 3px;
          }
          .info-value {
            font-size: 11pt;
            font-weight: 600;
            color: #1a1a1a;
          }
          .info-box.highlight {
            background: #e8f4f8;
            border-color: #1e3a5f;
          }
          /* Table */
          .section-title {
            font-size: 12pt;
            font-weight: bold;
            color: #1e3a5f;
            margin: 20px 0 10px 0;
            padding-bottom: 5px;
            border-bottom: 2px solid #1e3a5f;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            background: #1e3a5f;
            color: white;
            padding: 10px 8px;
            text-align: left;
            font-size: 10pt;
            font-weight: 600;
          }
          th:first-child { width: 40px; text-align: center; }
          th:nth-child(3) { width: 80px; text-align: center; }
          th:nth-child(4) { width: 80px; text-align: center; }
          td {
            padding: 10px 8px;
            border-bottom: 1px solid #ddd;
            font-size: 10pt;
          }
          td:first-child { text-align: center; font-weight: bold; color: #1e3a5f; }
          td:nth-child(3), td:nth-child(4) { text-align: center; }
          tr:nth-child(even) { background: #f9f9f9; }
          tr:hover { background: #f0f4f8; }
          /* Observaciones */
          .observaciones {
            background: #fffbeb;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 20px;
          }
          .observaciones-title {
            font-weight: bold;
            color: #92400e;
            margin-bottom: 5px;
          }
          /* Firmas */
          .firmas {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 30px;
            margin-top: 40px;
            padding-top: 20px;
          }
          .firma-box {
            text-align: center;
          }
          .firma-line {
            border-top: 2px solid #1a1a1a;
            margin-bottom: 8px;
            padding-top: 8px;
          }
          .firma-label {
            font-weight: bold;
            font-size: 10pt;
            color: #1e3a5f;
          }
          .firma-sub {
            font-size: 9pt;
            color: #666;
          }
          /* Footer */
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            display: flex;
            justify-content: space-between;
            font-size: 8pt;
            color: #888;
          }
          .status-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 9pt;
            font-weight: bold;
          }
          .status-pendiente { background: #fef3c7; color: #92400e; }
          .status-aprobada { background: #d1fae5; color: #065f46; }
          .status-rechazada { background: #fee2e2; color: #991b1b; }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <img src="/logo-cuavante.png" alt="Grupo Cuavante" class="logo" />
            <div class="header-right">
              <div class="doc-title">REQUISICIÓN DE MATERIALES</div>
              <div class="folio">${folio}</div>
            </div>
          </div>

          <!-- Info Grid -->
          <div class="info-grid">
            <div class="info-box">
              <div class="info-label">Fecha de Solicitud</div>
              <div class="info-value">${new Date(fechaCreacion).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
            </div>
            <div class="info-box highlight">
              <div class="info-label">Fecha Requerida</div>
              <div class="info-value">${new Date(fechaRequerida).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Solicitante</div>
              <div class="info-value">${solicitante}</div>
            </div>
            <div class="info-box highlight">
              <div class="info-label">Obra / Centro de Costo</div>
              <div class="info-value">${obra}</div>
            </div>
          </div>

          ${status ? `<p style="margin-bottom:15px;">Estado: <span class="status-badge status-${status.toLowerCase().includes("aprobada") ? "aprobada" : status.toLowerCase().includes("rechazada") ? "rechazada" : "pendiente"}">${status}</span></p>` : ""}

          <!-- Materiales -->
          <div class="section-title">Materiales Solicitados (${materiales.length})</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Descripción del Material</th>
                <th>Unidad</th>
                <th>Cantidad</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              ${materiales.map((m, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${m.name}</td>
                  <td>${m.unit}</td>
                  <td>${m.qty || m.quantity || 0}</td>
                  <td>${m.observations || m.comments || "-"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          ${comentarios ? `
          <div class="observaciones">
            <div class="observaciones-title">Observaciones Generales:</div>
            <div>${comentarios}</div>
          </div>
          ` : ""}

          <!-- Firmas -->
          <div class="firmas">
            <div class="firma-box">
              <div class="firma-line"></div>
              <div class="firma-label">Solicitó</div>
              <div class="firma-sub">${solicitante}</div>
            </div>
            <div class="firma-box">
              <div class="firma-line"></div>
              <div class="firma-label">Autorizó</div>
              <div class="firma-sub">Nombre y Firma</div>
            </div>
            <div class="firma-box">
              <div class="firma-line"></div>
              <div class="firma-label">Recibió</div>
              <div class="firma-sub">Nombre y Firma</div>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <span>Documento generado por ARIA - Grupo Cuavante</span>
            <span>Impreso: ${fechaImpresion}</span>
          </div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <button
      onClick={handlePrint}
      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all"
      title="Imprimir requisición"
    >
      <Printer className="w-4 h-4" />
    </button>
  );
}
