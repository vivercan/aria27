import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/auth-api";

const log = logger("WA-BIENV-TEMPLATE");

// Endpoint multimodo:
//   GET /api/admin/wa-bienvenida-template?mode=list -> lista templates APPROVED
//   GET /api/admin/wa-bienvenida-template?phones=A,B&template=NAME&lang=es_MX
//        -> manda el template (sin variables) a los telefonos dados

function normalizePhone(raw: string): string {
  let p = (raw || "").replace(/\D/g, "");
  if (p.length === 10) p = "521" + p;
  else if (p.length === 12 && p.startsWith("52")) p = "521" + p.slice(2);
  return p;
}

async function listApprovedTemplates(token: string, wabaId: string) {
  const r = await fetch(
    `https://graph.facebook.com/v22.0/${wabaId}/message_templates?fields=name,status,language,category,components&limit=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await r.json();
  if (!r.ok) return { error: data?.error?.message || JSON.stringify(data) };
  type Tpl = { name: string; status: string; language: string; category: string; components?: Array<{ type: string; text?: string; example?: { body_text?: string[][] } }> };
  const all = (data?.data || []) as Tpl[];
  const approved = all.filter(t => t.status === "APPROVED");
  return { all_count: all.length, approved_count: approved.length, approved };
}

async function sendTemplate(phone: string, template: string, lang: string, token: string, phoneId: string, params: string[] = []) {
  const components: Array<Record<string, unknown>> = [];
  if (params.length > 0) {
    components.push({
      type: "body",
      parameters: params.map(p => ({ type: "text", text: String(p) })),
    });
  }
  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: {
      name: template,
      language: { code: lang },
      ...(components.length > 0 ? { components } : {}),
    },
  };
  try {
    const r = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) return { success: false, error: data?.error?.message || JSON.stringify(data), httpStatus: r.status };
    const wamid = data?.messages?.[0]?.id;
    return { success: true, wamid };
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message };
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode");
  const phonesParam = url.searchParams.get("phones") || "";
  const templateName = url.searchParams.get("template") || "hello_world";
  const lang = url.searchParams.get("lang") || "es_MX";
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || process.env.WHATSAPP_WABA_ID || "842930185269415";

  if (!token || !phoneId) return NextResponse.json({ error: "missing token/phoneId" }, { status: 500 });

  if (mode === "list") {
    const r = await listApprovedTemplates(token, wabaId);
    return NextResponse.json(r);
  }

  if (!phonesParam) return NextResponse.json({ error: "phones param requerido" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const paramsRaw = url.searchParams.get("params") || "";
  const params = paramsRaw ? paramsRaw.split("|") : [];

  const phones = phonesParam.split(",").map(p => ({
    phone: normalizePhone(p.trim()),
    last4: normalizePhone(p.trim()).slice(-4),
  })).filter(p => p.phone.length >= 12);

  const results = [];
  for (const p of phones) {
    const r = await sendTemplate(p.phone, templateName, lang, token, phoneId, params);
    results.push({
      phone_last4: p.last4,
      template: templateName,
      lang,
      success: r.success,
      wamid: r.wamid || null,
      error: r.error || null,
      httpStatus: (r as { httpStatus?: number }).httpStatus || 200,
    });
    try {
      await sb.from("wa_log").insert({
        template: templateName,
        phone: p.phone,
        params: {},
        success: r.success,
        message_id: r.wamid || null,
        error: r.error || null,
        origen: "wa-bienvenida-template",
        enviado_por: "admin-test",
      });
    } catch (e) {
      log.warn("wa_log insert fallo", { e: (e as Error).message });
    }
  }

  return NextResponse.json({
    total: results.length,
    enviados_ok: results.filter(r => r.success).length,
    fallidos: results.filter(r => !r.success).length,
    detalle: results,
  });
}
