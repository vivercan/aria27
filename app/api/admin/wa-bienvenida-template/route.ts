import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

const log = logger("WA-BIENV-TEMPLATE");

// Endpoint que manda el template universal "hello_world" (aprobado por default
// en TODA cuenta WhatsApp Business) a una lista de telefonos forzados, para
// abrir el window de 24h de Meta y permitir text libre posterior.
//
// Uso:
//   GET  /api/admin/wa-bienvenida-template?phones=4492788797,4951198249
//   GET  /api/admin/wa-bienvenida-template?phones=ALL_RH  (Users role rh+direccion+admin)
//
// Devuelve el resultado por destinatario (success, wamid, error real de Meta).
// Persiste cada envio en wa_log.

function normalizePhone(raw: string): string {
  let p = (raw || "").replace(/\D/g, "");
  if (p.length === 10) p = "521" + p;
  else if (p.length === 12 && p.startsWith("52")) p = "521" + p.slice(2);
  return p;
}

async function sendHelloWorld(phone: string, token: string, phoneId: string) {
  const body = {
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: { name: "hello_world", language: { code: "en_US" } },
  };
  try {
    const r = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) {
      return { success: false, error: data?.error?.message || JSON.stringify(data), httpStatus: r.status };
    }
    const wamid = data?.messages?.[0]?.id;
    return { success: true, wamid, raw: data };
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message };
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const phonesParam = url.searchParams.get("phones") || "ALL_RH";
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return NextResponse.json({ error: "missing creds" }, { status: 500 });

  const sb = getSupabaseAdmin();

  let phones: { nombre: string; phone: string; tipo: string }[] = [];

  if (phonesParam === "ALL_RH") {
    // Deya, Fernando, JJ
    const { data: users } = await sb
      .from("Users")
      .select("name, phone, role")
      .in("role", ["direccion", "rh", "admin"]);
    for (const u of (users || [])) {
      const p = normalizePhone((u as { phone?: string }).phone || "");
      if (p.length >= 12) phones.push({ nombre: (u as { name: string }).name, phone: p, tipo: `user:${(u as { role: string }).role}` });
    }
    // Daisy (employees, COMPRAS)
    const { data: emps } = await sb
      .from("employees")
      .select("full_name, whatsapp")
      .in("position", ["COMPRAS", "COORDINADORA"])
      .eq("status", "ACTIVO");
    for (const e of (emps || [])) {
      const p = normalizePhone((e as { whatsapp?: string }).whatsapp || "");
      if (p.length >= 12) phones.push({ nombre: (e as { full_name: string }).full_name, phone: p, tipo: "employee:compras" });
    }
  } else {
    phones = phonesParam.split(",").map(p => ({
      nombre: p.trim().slice(-4),
      phone: normalizePhone(p.trim()),
      tipo: "manual",
    })).filter(p => p.phone.length >= 12);
  }

  // Dedupe
  const seen = new Set<string>();
  phones = phones.filter(p => { if (seen.has(p.phone)) return false; seen.add(p.phone); return true; });

  const results = [];
  for (const p of phones) {
    const r = await sendHelloWorld(p.phone, token, phoneId);
    results.push({
      nombre: p.nombre,
      phone_last4: p.phone.slice(-4),
      tipo: p.tipo,
      success: r.success,
      wamid: r.wamid || null,
      error: r.error || null,
      httpStatus: (r as { httpStatus?: number }).httpStatus || 200,
    });
    // Log a wa_log
    try {
      await sb.from("wa_log").insert({
        template: "hello_world",
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
    nota: "Si todos success=true: numeros tienen WhatsApp. Si error 131026/131047: numero invalido o sin WA.",
  });
}
