"use client";
import { Printer, FileDown, Loader2 } from "lucide-react";

interface Material {
  name: string;
  unit: string;
  quantity: number;
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

// Generar el HTML del documento
function generateHTML(props: RequisicionPrintProps): string {
  const { folio, fechaCreacion, fechaRequerida, solicitante, obra, materiales, comentarios, status } = props;
  
  const fechaCreacionFmt = new Date(fechaCreacion).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
  const fechaRequeridaFmt = new Date(fechaRequerida).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
  const fechaImpresion = new Date().toLocaleString("es-MX");
  
  const statusColor = status?.includes("FINALIZADA") ? "#10b981" : status?.includes("APROBADA") ? "#3b82f6" : status?.includes("PENDIENTE") ? "#f59e0b" : status?.includes("CANCELADA") ? "#ef4444" : "#64748b";
  
  const materialesRows = materiales.map((m, i) => `
    <tr style="background: ${i % 2 === 0 ? '#f8fafc' : '#ffffff'}">
      <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center; width: 40px">${i + 1}</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0">${m.name}</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center; width: 80px">${m.unit}</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center; width: 80px; font-weight: bold">${m.quantity}</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 11px; color: #64748b">${m.comments || "-"}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Requisición ${folio}</title>
  <style>
    @page { size: letter; margin: 1.5cm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; line-height: 1.4; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body style="padding: 20px">
  <!-- ENCABEZADO -->
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1e3a5f; padding-bottom: 15px; margin-bottom: 20px">
    <div style="display: flex; align-items: center; gap: 15px">
      <img src="/logo-cuavante.png" alt="Grupo Cuavante" style="height: 50px" onerror="this.style.display='none'">
      <div>
        <div style="font-size: 20px; font-weight: bold; color: #1e3a5f">GRUPO CUAVANTE</div>
        <div style="font-size: 10px; color: #64748b">Construcción e Infraestructura</div>
      </div>
    </div>
    <div style="text-align: right">
      <div style="font-size: 16px; font-weight: bold; color: #1e3a5f">REQUISICIÓN DE MATERIALES</div>
      <div style="font-size: 18px; font-weight: bold; color: #0891b2; margin-top: 5px">${folio}</div>
    </div>
  </div>

  <!-- INFO GRID -->
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px">
    <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; border-left: 4px solid #64748b">
      <div style="font-size: 10px; color: #64748b; text-transform: uppercase">Fecha de Solicitud</div>
      <div style="font-size: 14px; font-weight: bold; margin-top: 3px">${fechaCreacionFmt}</div>
    </div>
    <div style="background: #fef3c7; padding: 12px; border-radius: 8px; border-left: 4px solid #f59e0b">
      <div style="font-size: 10px; color: #92400e; text-transform: uppercase">Fecha Requerida</div>
      <div style="font-size: 14px; font-weight: bold; color: #92400e; margin-top: 3px">${fechaRequeridaFmt}</div>
    </div>
    <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; border-left: 4px solid #64748b">
      <div style="font-size: 10px; color: #64748b; text-transform: uppercase">Solicitante</div>
      <div style="font-size: 14px; font-weight: bold; margin-top: 3px">${solicitante}</div>
    </div>
    <div style="background: #e0f2fe; padding: 12px; border-radius: 8px; border-left: 4px solid #0891b2">
      <div style="font-size: 10px; color: #0369a1; text-transform: uppercase">Obra / Centro de Costo</div>
      <div style="font-size: 14px; font-weight: bold; color: #0369a1; margin-top: 3px">${obra}</div>
    </div>
  </div>

  <!-- ESTADO -->
  <div style="margin-bottom: 20px">
    <span style="display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; color: white; background: ${statusColor}">${status || "PENDIENTE"}</span>
  </div>

  <!-- TABLA DE MATERIALES -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px">
    <thead>
      <tr style="background: #1e3a5f; color: white">
        <th style="padding: 12px; border: 1px solid #1e3a5f; text-align: center; width: 40px">#</th>
        <th style="padding: 12px; border: 1px solid #1e3a5f; text-align: left">Descripción del Material</th>
        <th style="padding: 12px; border: 1px solid #1e3a5f; text-align: center; width: 80px">Unidad</th>
        <th style="padding: 12px; border: 1px solid #1e3a5f; text-align: center; width: 80px">Cantidad</th>
        <th style="padding: 12px; border: 1px solid #1e3a5f; text-align: left">Observaciones</th>
      </tr>
    </thead>
    <tbody>${materialesRows}</tbody>
  </table>

  ${comentarios ? `
  <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px">
    <div style="font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 5px">Observaciones Generales</div>
    <div style="font-size: 12px">${comentarios}</div>
  </div>
  ` : ""}

  <!-- FIRMAS -->
  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-top: 50px">
    <div style="text-align: center">
      <div style="border-top: 1px solid #1e293b; padding-top: 8px; margin-top: 60px">
        <div style="font-weight: bold">Solicitó</div>
        <div style="font-size: 10px; color: #64748b">${solicitante}</div>
      </div>
    </div>
    <div style="text-align: center">
      <div style="border-top: 1px solid #1e293b; padding-top: 8px; margin-top: 60px">
        <div style="font-weight: bold">Autorizó</div>
        <div style="font-size: 10px; color: #64748b">Nombre y Firma</div>
      </div>
    </div>
    <div style="text-align: center">
      <div style="border-top: 1px solid #1e293b; padding-top: 8px; margin-top: 60px">
        <div style="font-weight: bold">Recibió</div>
        <div style="font-size: 10px; color: #64748b">Nombre y Firma</div>
      </div>
    </div>
  </div>

  <!-- PIE -->
  <div style="margin-top: 40px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8">
    Documento generado por ARIA - Grupo Cuavante | Impreso: ${fechaImpresion}
  </div>
</body>
</html>`;
}

// Función para imprimir
export function handlePrint(props: RequisicionPrintProps) {
  const html = generateHTML(props);
  const printWindow = window.open("", "_blank", "width=800,height=600");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}

// Función para descargar PDF (usando print to PDF del navegador)
export function handleDownloadPDF(props: RequisicionPrintProps) {
  const html = generateHTML(props);
  const pdfWindow = window.open("", "_blank", "width=800,height=600");
  if (pdfWindow) {
    pdfWindow.document.write(html);
    pdfWindow.document.close();
    // Instrucción para el usuario
    setTimeout(() => {
      alert("Para guardar como PDF:\n1. Presiona Ctrl+P\n2. En 'Destino' selecciona 'Guardar como PDF'\n3. Clic en Guardar");
      pdfWindow.print();
    }, 500);
  }
}

// Componente de botones
interface PrintButtonsProps extends RequisicionPrintProps {
  loading?: boolean;
}

export default function RequisicionPrintButtons({ loading, ...props }: PrintButtonsProps) {
  if (loading) {
    return <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />;
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handlePrint(props)}
        className="p-2 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 transition-all"
        title="Imprimir"
      >
        <Printer className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleDownloadPDF(props)}
        className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-all"
        title="Descargar PDF"
      >
        <FileDown className="w-4 h-4" />
      </button>
    </div>
  );
}
