// Componente para imprimir y descargar PDF de Orden de Compra

interface OCPrintData {
  folio: string;
  fechaAutorizacion: string;
  proveedor: string;
  obraNombre: string;
  formaPago: string;
  diasCredito: number;
  total: number;
  materiales: {
    product_name: string;
    quantity: number;
    unit: string;
    selected_price: number;
  }[];
  requisicionFolio?: string;
}

function generarHTMLOC(data: OCPrintData): string {
  const fecha = new Date(data.fechaAutorizacion).toLocaleDateString("es-MX", {
    day: "2-digit", month: "2-digit", year: "numeric"
  });

  const materialesRows = data.materiales.map((m, i) => `
    <tr>
      <td style="border:1px solid #333;padding:8px;text-align:center">${i + 1}</td>
      <td style="border:1px solid #333;padding:8px">${m.product_name}</td>
      <td style="border:1px solid #333;padding:8px;text-align:center">${m.quantity}</td>
      <td style="border:1px solid #333;padding:8px;text-align:center">${m.unit}</td>
      <td style="border:1px solid #333;padding:8px;text-align:right">$${(m.selected_price || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
      <td style="border:1px solid #333;padding:8px;text-align:right">$${((m.selected_price || 0) * m.quantity).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join("");

  const subtotal = data.materiales.reduce((s, m) => s + (m.selected_price || 0) * m.quantity, 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Orden de Compra ${data.folio}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #333; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 3px solid #0066cc; padding-bottom: 15px; }
    .logo { font-size: 24px; font-weight: bold; color: #0066cc; }
    .logo-sub { font-size: 10px; color: #666; }
    .doc-title { text-align: right; }
    .doc-title h1 { font-size: 18px; color: #0066cc; margin-bottom: 5px; }
    .folio { font-size: 14px; font-weight: bold; background: #0066cc; color: white; padding: 5px 15px; display: inline-block; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .info-box { background: #f5f5f5; padding: 15px; border-radius: 5px; }
    .info-box h3 { font-size: 12px; color: #0066cc; margin-bottom: 10px; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
    .info-row { display: flex; margin-bottom: 5px; }
    .info-label { width: 120px; font-weight: bold; color: #666; }
    .info-value { flex: 1; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #0066cc; color: white; padding: 10px; text-align: left; font-size: 11px; }
    .totals { width: 300px; margin-left: auto; }
    .totals tr td { padding: 8px; border: 1px solid #ddd; }
    .totals tr:last-child { background: #0066cc; color: white; font-weight: bold; font-size: 14px; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; }
    .firma { width: 200px; text-align: center; }
    .firma-line { border-top: 1px solid #333; margin-top: 60px; padding-top: 5px; }
    .notes { background: #fff3cd; padding: 10px; border-radius: 5px; margin-bottom: 20px; font-size: 10px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">AVANTE</div>
      <div class="logo-sub">GRUPO CONSTRUCTOR URBANO</div>
      <div style="margin-top:10px;font-size:10px;color:#666">Aguascalientes, Mexico<br>Tel: (449) 000-0000</div>
    </div>
    <div class="doc-title">
      <h1>ORDEN DE COMPRA</h1>
      <div class="folio">${data.folio}</div>
      <div style="margin-top:10px;font-size:10px">Fecha: ${fecha}</div>
    </div>
  </div>
  <div class="info-grid">
    <div class="info-box">
      <h3>Proveedor</h3>
      <div class="info-row"><span class="info-label">Razon Social:</span><span class="info-value"><strong>${data.proveedor}</strong></span></div>
    </div>
    <div class="info-box">
      <h3>Datos de Compra</h3>
      <div class="info-row"><span class="info-label">Obra:</span><span class="info-value">${data.obraNombre}</span></div>
      <div class="info-row"><span class="info-label">Forma de Pago:</span><span class="info-value">${data.formaPago || "Transferencia"}</span></div>
      <div class="info-row"><span class="info-label">Condiciones:</span><span class="info-value">${data.diasCredito > 0 ? data.diasCredito + " dias credito" : "Contado"}</span></div>
      ${data.requisicionFolio ? `<div class="info-row"><span class="info-label">Requisicion:</span><span class="info-value">${data.requisicionFolio}</span></div>` : ""}
    </div>
  </div>
  <table>
    <thead><tr><th style="width:40px">#</th><th>Descripcion</th><th style="width:70px;text-align:center">Cantidad</th><th style="width:60px;text-align:center">Unidad</th><th style="width:100px;text-align:right">P. Unitario</th><th style="width:100px;text-align:right">Importe</th></tr></thead>
    <tbody>${materialesRows}</tbody>
  </table>
  <table class="totals">
    <tr><td style="text-align:right">Subtotal:</td><td style="text-align:right;width:120px">$${subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td></tr>
    <tr><td style="text-align:right">IVA 16%:</td><td style="text-align:right">$${iva.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td></tr>
    <tr><td style="text-align:right">TOTAL:</td><td style="text-align:right">$${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td></tr>
  </table>
  <div class="notes"><strong>NOTAS IMPORTANTES:</strong><br>- Favor de enviar factura a: administracion@gcuavante.com<br>- Entregar en obra: ${data.obraNombre}<br>- Incluir copia de esta orden con el material</div>
  <div class="footer">
    <div class="firma"><div class="firma-line">Elaboro</div><div style="font-size:9px;color:#666">Depto. Compras</div></div>
    <div class="firma"><div class="firma-line">Autorizo</div><div style="font-size:9px;color:#666">Direccion General</div></div>
    <div class="firma"><div class="firma-line">Recibio Proveedor</div><div style="font-size:9px;color:#666">Nombre y Firma</div></div>
  </div>
</body>
</html>`;
}

export function handlePrintOC(data: OCPrintData) {
  const html = generarHTMLOC(data);
  const printWindow = window.open("", "_blank", "width=800,height=600");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  }
}

export function handleDownloadPDFOC(data: OCPrintData) {
  const html = generarHTMLOC(data);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.document.title = `OC_${data.folio}.pdf`;
    setTimeout(() => printWindow.print(), 250);
  }
}
