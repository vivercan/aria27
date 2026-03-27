const WHATSAPP_API_URL = "https://graph.facebook.com/v22.0";

// ============================================
// CONFIGURACIÓN DE PLANTILLAS APROBADAS EN META
// WABA: 842930185269415 | Phone: 963627606824867 (JJCRM27)
// ============================================
const TEMPLATE_CONFIG: Record<string, { 
  language: string; 
  hasButton?: boolean; 
  buttonCount?: number; 
  paramCount: number;
  description: string;
}> = {
  requisicion_creada: { 
    language: "es_MX", 
    paramCount: 4,
    description: "Confirmar creación al usuario"
    // {{1}}=Folio, {{2}}=Solicitante, {{3}}=Obra, {{4}}=Fecha
  },
  requisicion_validar: { 
    language: "en", 
    hasButton: true, 
    buttonCount: 2, 
    paramCount: 5,
    description: "Solicitar validación"
    // {{1}}=Folio, {{2}}=Solicitante, {{3}}=Obra, {{4}}=Urgencia, {{5}}=Token
    // Botones: Aprobar, Rechazar
  },
  requisicion_compras: {
    language: "en",
    paramCount: 4,
    description: "Notificar a compras"
    // {{1}}=Folio, {{2}}=Obra, {{3}}=Urgencia, {{4}}=Materiales
  },
  compra_autorizar: {
    language: "es_MX",
    hasButton: true,
    buttonCount: 1,
    paramCount: 6,
    description: "Solicitar autorización de dirección"
    // {{1}}=Folio, {{2}}=Obra, {{3}}=Solicitante, {{4}}=Urgencia, {{5}}=Materiales, {{6}}=Total
    // Botón: Ver Cotizaciones (URL con token)
  },
  oc_generada: {
    language: "es_MX",
    paramCount: 6,
    description: "Notificar OC generada"
    // {{1}}=Requisición, {{2}}=OC, {{3}}=Obra, {{4}}=Proveedor, {{5}}=Total, {{6}}=Forma de pago
  },
  requisicion_rechazada: { 
    language: "es_MX", 
    paramCount: 4,
    description: "Notificar rechazo al creador"
    // {{1}}=Folio, {{2}}=Obra, {{3}}=Estado, {{4}}=Motivo
  },
  entrega_material: {
    language: "es_MX",
    paramCount: 4,
    description: "Notificar material recibido al solicitante"
    // {{1}}=OC, {{2}}=Obra, {{3}}=Proveedor, {{4}}=Folio entrega
  },
  comparativa_enviar: {
    language: "es_MX",
    hasButton: true,
    buttonCount: 1,
    paramCount: 4,
    description: "Enviar comparativa a direccion"
    // {{1}}=Folio, {{2}}=Obra, {{3}}=Mejor precio, {{4}}=Num proveedores
  },
  solicitar_cotizacion: {
    language: "es_MX",
    paramCount: 3,
    description: "Solicitar cotizacion a proveedor"
    // {{1}}=Folio, {{2}}=Obra, {{3}}=Urgencia
  },
};

/**
 * Enviar mensaje de WhatsApp usando plantilla aprobada
 */
export async function sendWhatsAppTemplate(
  templateName: string,
  params: string[],
  phone: string,
  buttonToken?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    console.error("[WhatsApp] [ERROR] Credenciales faltantes - TOKEN:", !!token, "PHONE_ID:", !!phoneId);
    return { success: false, error: "WhatsApp credentials missing" };
  }

  // Validar plantilla existe
  const config = TEMPLATE_CONFIG[templateName];
  if (!config) {
    console.error("[WhatsApp] [ERROR] Plantilla no configurada:", templateName);
    return { success: false, error: `Plantilla '${templateName}' no existe` };
  }

  // Formatear teléfono mexicano (10 dígitos -> 52 + 10)
  let formattedPhone = phone.replace(/\D/g, "");
  if (formattedPhone.length === 10) {
    formattedPhone = "52" + formattedPhone;
  } else if (formattedPhone.startsWith("521") && formattedPhone.length === 13) {
    formattedPhone = "52" + formattedPhone.slice(3);
  }

  // Construir componentes del mensaje
  const components: any[] = [];

  // Body parameters
  if (params.length > 0) {
    components.push({
      type: "body",
      parameters: params.map((text) => ({ type: "text", text: String(text) })),
    });
  }

  // Button parameters (si la plantilla tiene botones)
  if (config.hasButton && buttonToken) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: buttonToken }],
    });
    
    if (config.buttonCount === 2) {
      components.push({
        type: "button",
        sub_type: "url",
        index: "1",
        parameters: [{ type: "text", text: `${buttonToken}&action=RECHAZADA` }],
      });
    }
  }

  const body = {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: config.language },
      components,
    },
  };

  console.log("[WhatsApp] [SEND] Enviando:", templateName, "->", formattedPhone);

  try {
    const response = await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[WhatsApp] [ERROR] Error:", data.error?.message || response.status);
      return { 
        success: false, 
        error: data.error?.message || `HTTP ${response.status}` 
      };
    }

    const messageId = data.messages?.[0]?.id;
    console.log("[WhatsApp] [OK] Enviado:", messageId);
    return { success: true, messageId };

  } catch (error: any) {
    console.error("[WhatsApp] [ERROR] Exception:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Enviar a múltiples destinatarios
 */
export async function sendWhatsAppToMultiple(
  templateName: string,
  params: string[],
  phones: string[],
  buttonToken?: string
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = { sent: 0, failed: 0, errors: [] as string[] };

  for (const phone of phones) {
    if (!phone) continue;
    
    const result = await sendWhatsAppTemplate(templateName, params, phone, buttonToken);
    
    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      results.errors.push(`${phone}: ${result.error}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log("[WhatsApp] [STATS] Batch:", results.sent, "enviados,", results.failed, "fallidos");
  return results;
}

 
