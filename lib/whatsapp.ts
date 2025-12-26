const WHATSAPP_API_URL = "https://graph.facebook.com/v22.0";

const TEMPLATE_CONFIG: Record<string, { language: string; hasButton?: boolean }> = {
  requisicion_creada: { language: "es_MX" },
  requisicion_validar: { language: "en", hasButton: true },
  requisicion_compras: { language: "en" },
  compra_autorizar: { language: "es_MX", hasButton: true },
  oc_generada: { language: "es_MX" },
  hello_world: { language: "en_US" },
};

export async function sendWhatsAppTemplate(
  templateName: string,
  params: string[],
  phone: string,
  buttonToken?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    console.error("WhatsApp credentials missing");
    return { success: false, error: "WhatsApp credentials missing" };
  }

  // Formatear telefono
  let formattedPhone = phone.replace(/\D/g, "");
  if (formattedPhone.length === 10) {
    formattedPhone = "52" + formattedPhone;
  } else if (formattedPhone.startsWith("52") && formattedPhone.length === 12) {
    // ya esta bien
  } else if (formattedPhone.startsWith("521") && formattedPhone.length === 13) {
    formattedPhone = "52" + formattedPhone.slice(3);
  }

  const config = TEMPLATE_CONFIG[templateName] || { language: "es_MX" };
  
  const components: any[] = [
    {
      type: "body",
      parameters: params.map((text) => ({ type: "text", text })),
    },
  ];

  // Agregar boton si la plantilla lo requiere
  if (config.hasButton && buttonToken) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: `${buttonToken}&action=APROBADA` }],
    });
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

  console.log(`[WhatsApp] Enviando ${templateName} a ${formattedPhone}`, JSON.stringify(body, null, 2));

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
      console.error(`[WhatsApp] Error:`, data);
      return { success: false, error: data.error?.message || "Error desconocido" };
    }

    console.log(`[WhatsApp] Exito: ${data.messages?.[0]?.id}`);
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error: any) {
    console.error(`[WhatsApp] Exception:`, error);
    return { success: false, error: error.message };
  }
}
