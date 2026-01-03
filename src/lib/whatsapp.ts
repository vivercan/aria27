const WHATSAPP_API_URL = "https://graph.facebook.com/v22.0";

const TEMPLATE_Configuración: Record<string, { language: string; hasButton?: boolean; paramCount: number }> = {
  requisicion_creada: { language: "es_MX", paramCount: 4 },
  requisicion_validar: { language: "en", hasButton: true, paramCount: 5 },
  requisicion_compras: { language: "en", paramCount: 4 },
  compra_autorizar: { language: "es_MX", paramCount: 6 },
  oc_generada: { language: "es_MX", paramCount: 5 },
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

  let formattedPhone = phone.replace(/\D/g, "");
  if (formattedPhone.length === 10) {
    formattedPhone = "52" + formattedPhone;
  } else if (formattedPhone.startsWith("521") && formattedPhone.length === 13) {
    formattedPhone = "52" + formattedPhone.slice(3);
  }

  const Configuración = TEMPLATE_Configuración[templateName] || { language: "es_MX", paramCount: params.length };
  
  const components: any[] = [
    {
      type: "body",
      parameters: params.map((text) => ({ type: "text", text })),
    },
  ];

  if (Configuración.hasButton && buttonToken) {
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
      language: { code: Configuración.language },
      components,
    },
  };

  console.log("[WhatsApp] Enviando", templateName, "a", formattedPhone, "params:", params.length);

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
      console.error("[WhatsApp] Error:", JSON.stringify(data));
      return { success: false, error: data.error?.message || "Error desconocido" };
    }

    console.log("[WhatsApp] Exito:", data.messages?.[0]?.id);
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error: any) {
    console.error("[WhatsApp] Exception:", error);
    return { success: false, error: error.message };
  }
}
