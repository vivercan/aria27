import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";


const BASE_URL = "https://aria.jjcrm27.com";

export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  try {
    const { requisition, items, suppliers, total, token, daysUntil } = await request.json();

    // Crear tabla de items con proveedor y precio
    const itemsHtml = items.map((item: any) => {
      const supplier = suppliers?.find((s: any) => s.supplier?.id === item.selected_supplier_id)?.supplier;
      const subtotal = (item.selected_price || 0) * item.quantity;
      return `<tr>
        <td style="padding:10px;border:1px solid #e2e8f0">${item.product_name}</td>
        <td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${item.quantity} ${item.unit}</td>
        <td style="padding:10px;border:1px solid #e2e8f0">$${(item.selected_price || 0).toLocaleString()}</td>
        <td style="padding:10px;border:1px solid #e2e8f0;text-align:right;font-weight:bold">$${subtotal.toLocaleString()}</td>
        <td style="padding:10px;border:1px solid #e2e8f0">${supplier?.name || "N/A"}</td>
      </tr>`;
    }).join("");

    // Crear resumen por proveedor
    const supplierSummary = (suppliers || []).map((s: any) => `
      <div style="background:#f8fafc;border-radius:8px;padding:15px;margin:10px 0">
        <div style="font-weight:bold;color:#1e3a5f;font-size:16px">${s.supplier?.name}</div>
        <div style="color:#64748b;font-size:14px">${s.supplier?.payment_method}${s.supplier?.credit_days > 0 ? ` - ${s.supplier?.credit_days} días crédito` : ""}</div>
        ${s.supplier?.bank_name && s.supplier?.bank_name !== "PAGO EN EFECTIVO" ? `
          <div style="margin-top:8px;padding:8px;background:#e2e8f0;border-radius:4px;font-family:monospace;font-size:12px">
            <div><strong>Banco:</strong> ${s.supplier?.bank_name}</div>
            <div><strong>CLABE:</strong> ${s.supplier?.bank_clabe || "N/A"}</div>
          </div>
        ` : s.supplier?.bank_name === "PAGO EN EFECTIVO" ? `<div style="color:#f59e0b;font-weight:bold;margin-top:5px">💵 PAGO EN EFECTIVO</div>` : ""}
        <div style="text-align:right;font-size:18px;font-weight:bold;color:#10b981;margin-top:10px">$${s.total?.toLocaleString()}</div>
      </div>
    `).join("");

    // Determinar urgencia
    const urgencyColor = daysUntil <= 2 ? "#ef4444" : daysUntil <= 5 ? "#f59e0b" : "#10b981";
    const urgencyText = daysUntil <= 0 ? "¡HOY!" : daysUntil === 1 ? "¡MAÑANA!" : `${daysUntil} días`;

    const approveUrl = `${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=AUTORIZAR`;
    const rejectUrl = `${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=RECHAZAR`;

    const fechaRequerida = new Date(requisition.required_date).toLocaleDateString("es-MX", { 
      weekday: "long", year: "numeric", month: "long", day: "numeric" 
    });

    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>",
      to: "timonfx@hotmail.com",
      subject: `🛒 AUTORIZAR COMPRA: ${requisition.folio} - $${total.toLocaleString()} MXN`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;background:#ffffff">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);color:white;padding:30px;text-align:center">
            <h1 style="margin:0;font-size:28px">AUTORIZACIÓN DE COMPRA</h1>
            <p style="margin:10px 0 0;opacity:0.8">Sistema ARIA27 - Grupo Constructor Avante</p>
          </div>

          <!-- Urgencia -->
          <div style="background:${urgencyColor};color:white;padding:20px;text-align:center">
            <div style="font-size:14px;opacity:0.9">FECHA REQUERIDA</div>
            <div style="font-size:36px;font-weight:bold">${urgencyText}</div>
            <div style="font-size:14px;margin-top:5px">${fechaRequerida}</div>
          </div>

          <!-- Info requisición -->
          <div style="padding:25px">
            <table style="width:100%;margin-bottom:20px">
              <tr>
                <td style="padding:8px;background:#f1f5f9;border-radius:4px">
                  <div style="color:#64748b;font-size:12px">FOLIO</div>
                  <div style="font-weight:bold;font-size:18px;color:#1e3a5f">${requisition.folio}</div>
                </td>
                <td style="padding:8px;background:#f1f5f9;border-radius:4px">
                  <div style="color:#64748b;font-size:12px">OBRA/DESTINO</div>
                  <div style="font-weight:bold;font-size:18px;color:#1e3a5f">${requisition.cost_center_name}</div>
                </td>
              </tr>
            </table>

            ${requisition.instructions ? `
              <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin-bottom:20px;border-radius:0 8px 8px 0">
                <strong style="color:#92400e">📝 Instrucciones:</strong>
                <p style="margin:5px 0 0;color:#78350f">${requisition.instructions}</p>
              </div>
            ` : ""}

            <!-- Tabla de productos -->
            <h3 style="color:#1e3a5f;border-bottom:2px solid #e2e8f0;padding-bottom:10px">📦 Detalle de Compra</h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
              <thead>
                <tr style="background:#1e3a5f;color:white">
                  <th style="padding:12px;text-align:left">Producto</th>
                  <th style="padding:12px;text-align:center">Cantidad</th>
                  <th style="padding:12px;text-align:left">P. Unitario</th>
                  <th style="padding:12px;text-align:right">Subtotal</th>
                  <th style="padding:12px;text-align:left">Proveedor</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
              <tfoot>
                <tr style="background:#f1f5f9">
                  <td colspan="3" style="padding:15px;text-align:right;font-weight:bold;font-size:18px">TOTAL A PAGAR:</td>
                  <td colspan="2" style="padding:15px;font-weight:bold;font-size:24px;color:#10b981">$${total.toLocaleString()} MXN</td>
                </tr>
              </tfoot>
            </table>

            <!-- Resumen por proveedor -->
            <h3 style="color:#1e3a5f;border-bottom:2px solid #e2e8f0;padding-bottom:10px">🏢 Proveedores y Forma de Pago</h3>
            ${supplierSummary}

            <!-- Botones -->
            <div style="text-align:center;margin:40px 0">
              <p style="color:#64748b;margin-bottom:20px">¿Autoriza esta compra?</p>
              <a href="${approveUrl}" style="display:inline-block;background:#10b981;color:white;padding:18px 50px;text-decoration:none;border-radius:50px;font-weight:bold;font-size:18px;margin:10px">
                ✓ AUTORIZAR COMPRA
              </a>
              <br>
              <a href="${rejectUrl}" style="display:inline-block;background:#ef4444;color:white;padding:12px 40px;text-decoration:none;border-radius:50px;font-weight:bold;font-size:14px;margin:10px">
                ✗ RECHAZAR
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background:#f1f5f9;padding:20px;text-align:center;color:#64748b;font-size:12px">
            <p>Este correo fue generado automáticamente por ARIA27 ERP</p>
            <p>Grupo Constructor Avante © ${new Date().getFullYear()}</p>
          </div>
        </div>
      `
    });

    return NextResponse.json({ success: true, message: "Enviado a autorización" });
  } catch (error: any) {
    console.error("Error enviando autorización:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

