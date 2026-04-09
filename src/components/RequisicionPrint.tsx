"use client";
import { Printer, FileDown, Loader2 } from "lucide-react";

interface Material {
  name: string;
  unit: string;
  quantity: number;
  precio_unitario?: number;
  precio_total?: number;
  comments?: string;
}

interface ProveedorInfo {
  nombre?: string;
  banco?: string;
  numero_cuenta?: string;
  clabe?: string;
  nombre_cuenta?: string;
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
  categoria?: string;
  subcategoria?: string;
  proveedor?: ProveedorInfo;
  forma_pago?: string;
  tipo_pago?: string;
  fecha_pago?: string;
  forma_entrega?: string;
  fecha_entrega?: string;
  uso?: string;
  notas?: string;
  subtotal?: number;
  iva_porcentaje?: number;
  iva_monto?: number;
  total?: number;
}

function formatCurrency(value?: number): string {
  if (!value && value !== 0) return "";
  return "$" + value.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date?: string): string {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function generateHTML(props: RequisicionPrintProps): string {
  const { 
    folio, fechaCreacion, fechaRequerida, solicitante, obra, materiales, comentarios, status,
    categoria, subcategoria, proveedor, forma_pago, tipo_pago, fecha_pago, forma_entrega, 
    fecha_entrega, uso, notas, subtotal, iva_porcentaje, iva_monto, total
  } = props;
  
  const calcSubtotal = subtotal || materiales.reduce((sum, m) => sum + (m.precio_total || 0), 0);
  const calcIvaPct = iva_porcentaje ?? 0;
  const calcIvaMonto = iva_monto || (calcSubtotal * calcIvaPct / 100);
  const calcTotal = total || (calcSubtotal + calcIvaMonto);

  const materialesRows = materiales.map((m) => `
    <tr>
      <td class="cell-center">${m.quantity}</td>
      <td class="cell-center">${m.unit}</td>
      <td class="cell-left">${m.name}${m.comments ? '<br><span style="font-size:9px;color:#666">' + m.comments + '</span>' : ''}</td>
      <td class="cell-right">${formatCurrency(m.precio_unitario)}</td>
      <td class="cell-right">${formatCurrency(m.precio_total)}</td>
    </tr>
  `).join("");

  const filasVacias = Math.max(0, 15 - materiales.length);
  const filasVaciasHtml = Array(filasVacias).fill('').map(() => `
    <tr>
      <td class="cell-center">&nbsp;</td>
      <td class="cell-center">&nbsp;</td>
      <td class="cell-left">&nbsp;</td>
      <td class="cell-right">&nbsp;</td>
      <td class="cell-right">&nbsp;</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Requisición ${folio}</title>
  <style>
    @page { size: letter; margin: 0.8cm; }
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: Arial, sans-serif; }
    body { font-size: 10px; color: #000; background: #fff; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
    
    .container { padding: 10px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .header-left { width: 45%; }
    .header-right { width: 45%; text-align: right; }
    
    .logo-section { display: flex; align-items: flex-start; gap: 5px; margin-bottom: 5px; }
    .logo { height: 40px; }
    .company-name { font-size: 9px; font-weight: bold; font-style: italic; }
    
    .title { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 10px; }
    
    .field-row { display: flex; margin-bottom: 2px; font-size: 9px; }
    .field-label { font-weight: bold; min-width: 100px; }
    .field-value { border-bottom: 1px solid #000; flex: 1; padding-left: 3px; }
    
    .field-row-right { display: flex; margin-bottom: 2px; font-size: 9px; justify-content: flex-end; }
    .field-label-right { font-weight: bold; text-align: right; min-width: 120px; }
    .field-value-right { border-bottom: 1px solid #000; min-width: 180px; padding-left: 3px; text-align: left; }
    
    .folio-box { border: 2px solid #000; padding: 3px 15px; font-weight: bold; font-size: 11px; display: inline-block; }
    
    .uso-row { display: flex; margin: 8px 0; font-size: 9px; }
    .uso-label { font-weight: bold; min-width: 30px; }
    .uso-value { border-bottom: 1px solid #000; flex: 1; }
    
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th { background: #e0e0e0; border: 1px solid #000; padding: 5px 3px; font-size: 9px; font-weight: bold; }
    td { border: 1px solid #000; padding: 4px 3px; font-size: 9px; height: 18px; }
    .cell-center { text-align: center; }
    .cell-left { text-align: left; }
    .cell-right { text-align: right; }
    
    .footer-section { display: flex; justify-content: space-between; margin-top: 5px; }
    .notas-box { width: 55%; }
    .notas-label { font-weight: bold; font-size: 9px; margin-bottom: 3px; }
    .notas-content { border: 1px solid #000; min-height: 50px; padding: 5px; font-size: 9px; }
    
    .totales-box { width: 40%; }
    .totales-table { width: 100%; border-collapse: collapse; }
    .totales-table td { border: 1px solid #000; padding: 4px 8px; font-size: 10px; }
    .totales-label { font-weight: bold; background: #f5f5f5; }
    .totales-value { text-align: right; }
    .totales-final { font-weight: bold; font-size: 11px; }
    
    .firmas-section { margin-top: 25px; }
    .firmas-row { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .firma-box { text-align: center; width: 45%; }
    .firma-box-third { text-align: center; width: 30%; }
    .firma-line { border-top: 1px solid #000; margin-top: 35px; padding-top: 3px; }
    .firma-name { font-weight: bold; font-size: 8px; }
    .firma-title { font-size: 7px; color: #333; }
    .firma-code { font-size: 6px; color: #666; margin-top: 2px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="title">REQUISICIÓN DE GASTOS</div>
    
    <div class="header">
      <div class="header-left">
        <div class="logo-section">
          <img src="/logo-cuavante.png" alt="Logo" class="logo" onerror="this.outerHTML='<div style=\\'font-size:20px;font-weight:bold;font-style:italic\\'>AVANTE</div>'">
        </div>
        <div class="company-name">GRUPO CONSTRUCTOR URBANO</div>
        
        <div class="field-row"><span class="field-label">CATEGORÍA:</span><span class="field-value">${categoria || obra || ''}</span></div>
        <div class="field-row"><span class="field-label">SOLICITANTE:</span><span class="field-value">${solicitante || ''}</span></div>
        <div class="field-row"><span class="field-label">SUBCATEGORÍA:</span><span class="field-value">${subcategoria || ''}</span></div>
        <div class="field-row"><span class="field-label">FORMA DE PAGO:</span><span class="field-value">${forma_pago || 'EFECTIVO (REBAJAN IVA)'}</span></div>
        <div class="field-row"><span class="field-label">FECHA DE PAGO:</span><span class="field-value">${formatDate(fecha_pago)}</span></div>
        <div class="field-row"><span class="field-label">FORMA ENTREGA:</span><span class="field-value">${forma_entrega || 'UNA EXHIBICIÓN'}</span></div>
        <div class="field-row"><span class="field-label">FECHA ENTREGA:</span><span class="field-value">${formatDate(fecha_entrega || fechaRequerida)}</span></div>
      </div>
      
      <div class="header-right">
        <div class="field-row-right" style="margin-bottom: 8px;"><span class="field-label-right">ID REQUISICIÓN:</span><span class="folio-box">${folio}</span></div>
        <div class="field-row-right"><span class="field-label-right">FECHA SOLICITUD:</span><span class="field-value-right">${formatDate(fechaCreacion)}</span></div>
        <div class="field-row-right"><span class="field-label-right">PROVEEDOR:</span><span class="field-value-right">${proveedor?.nombre || ''}</span></div>
        <div class="field-row-right"><span class="field-label-right">NOMBRE DE CUENTA:</span><span class="field-value-right">${proveedor?.nombre_cuenta || proveedor?.nombre || ''}</span></div>
        <div class="field-row-right"><span class="field-label-right">BANCO:</span><span class="field-value-right">${proveedor?.banco || ''}</span></div>
        <div class="field-row-right"><span class="field-label-right">NUMERO DE CUENTA:</span><span class="field-value-right">${proveedor?.numero_cuenta || ''}</span></div>
        <div class="field-row-right"><span class="field-label-right">CLABE INTERBANCARIA:</span><span class="field-value-right">${proveedor?.clabe || ''}</span></div>
        <div class="field-row-right"><span class="field-label-right">TIPO DE PAGO:</span><span class="field-value-right">${tipo_pago || 'ANTICIPADO'}</span></div>
        <div class="field-row-right"><span class="field-label-right">STATUS:</span><span class="field-value-right">${status || '0'}</span></div>
      </div>
    </div>
    
    <div class="uso-row"><span class="uso-label">USO:</span><span class="uso-value">${uso || ''}</span></div>
    
    <table>
      <thead>
        <tr>
          <th style="width: 60px">CANTIDAD</th>
          <th style="width: 70px">UNIDAD</th>
          <th>DESCRIPCIÓN</th>
          <th style="width: 90px">PRECIO UNITARIO</th>
          <th style="width: 90px">PRECIO COMPRA</th>
        </tr>
      </thead>
      <tbody>${materialesRows}${filasVaciasHtml}</tbody>
    </table>
    
    <div class="footer-section">
      <div class="notas-box">
        <div class="notas-label">NOTAS IMPORTANTES:</div>
        <div class="notas-content">${notas || comentarios || ''}</div>
      </div>
      <div class="totales-box">
        <table class="totales-table">
          <tr><td class="totales-label">SUBTOTAL</td><td class="totales-value">${formatCurrency(calcSubtotal)}</td></tr>
          <tr><td class="totales-label">IVA ${calcIvaPct.toFixed(2)}%</td><td class="totales-value">${formatCurrency(calcIvaMonto)}</td></tr>
          <tr><td class="totales-label totales-final">TOTAL</td><td class="totales-value totales-final">${formatCurrency(calcTotal)}</td></tr>
        </table>
      </div>
    </div>
    
    <div class="firmas-section">
      <div class="firmas-row">
        <div class="firma-box"><div class="firma-line"><div class="firma-name">${proveedor?.nombre || 'RECEPCIÓN DE MATERIALES'}</div><div class="firma-title">RECEPCIÓN DE MATERIALES</div></div></div>
        <div class="firma-box"><div class="firma-line"><div class="firma-name">ING. LUIS FERNANDO LÓPEZ MARTÍNEZ</div><div class="firma-title">DIRECTOR GENERAL</div></div></div>
      </div>
      <div class="firmas-row" style="justify-content: space-around;">
        <div class="firma-box-third"><div class="firma-line"><div class="firma-name">ARQ. DAISY SANCHEZ CALVILLO</div><div class="firma-title">REVISIÓN DE MATERIALES</div><div class="firma-code">ELABORADO:RR.HH.ADMC</div></div></div>
        <div class="firma-box-third"><div class="firma-line"><div class="firma-name">LIC. JESSICA MONTSERRAT GALLARDO ACOSTA</div><div class="firma-title">COMPRAS</div></div></div>
        <div class="firma-box-third"><div class="firma-line"><div class="firma-name">LIC. DEYANIRA MONTALVO CORONEL</div><div class="firma-title">VALIDACIÓN DE INFORMACIÓN</div><div class="firma-code">${folio.replace('REQ-', 'REQPD-AX-').replace(/-(\d{5})$/, '-$1/' + new Date().getFullYear())}</div></div></div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function handlePrint(props: RequisicionPrintProps) {
  const html = generateHTML(props);
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }
}

export function handleDownloadPDF(props: RequisicionPrintProps) {
  const html = generateHTML(props);
  const pdfWindow = window.open("", "_blank", "width=900,height=700");
  if (pdfWindow) {
    pdfWindow.document.write(html);
    pdfWindow.document.close();
    setTimeout(() => pdfWindow.print(), 500);
  }
}

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
