import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { requireAdmin } from "@/lib/auth-api";

function normalizePhone(raw: string): string {
    let p = (raw || "").replace(/\D/g, "");
    if (p.length === 10) p = "521" + p;
    else if (p.length === 12 && p.startsWith("52")) p = "521" + p.slice(2);
    else if (p.length === 13 && p.startsWith("521")) {}
    return p;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;
    const sb = getSupabaseAdmin();
    const message = `\u{1F680} *Bienvenido a ARIA27 — Grupo Constructor Urbano Avante*\n\nSoy el sistema operativo de la empresa. Desde aqui:\n\n✅ Checas entrada y salida con foto + ubicacion\n✅ Recibes tareas asignadas con fecha de compromiso\n✅ Reportas avance respondiendo: OK / 50 / LISTO / BLOQUEADO\n✅ Reciben notificaciones de requisiciones, OCs, pagos y comparativas en tiempo real\n\n\u{1F4CD} Para checar: manda foto + ubicacion al chat.\n\u{1F4DD} Para tareas: responde con palabra clave o numero de avance.\n\u{1F514} Notificaciones del sistema llegan instantaneo.\n\nSi recibes este mensaje, *responde RECIBIDO* para confirmar y abrir tu ventana de mensajes.\n\n— ARIA27 · 6-May-2026 11:33 AM CST`;

  // Lista de destinatarios: empleados activos + Users direccion + rh
  const { data: emps } = await sb.from("employees").select("full_name, whatsapp").eq("status", "ACTIVO");
    const { data: users } = await sb.from("Users").select("name, phone, role").in("role", ["direccion", "rh", "admin"]);

  type Recipient = { nombre: string; phone: string; tipo: string };
    const recipients: Recipient[] = [];
    for (const e of (emps || [])) {
          const phone = normalizePhone((e as { whatsapp?: string }).whatsapp || "");
          if (phone.length >= 12) recipients.push({ nombre: (e as { full_name: string }).full_name, phone, tipo: "empleado" });
    }
    for (const u of (users || [])) {
          const phone = normalizePhone((u as { phone?: string }).phone || "");
          if (phone.length >= 12) recipients.push({ nombre: (u as { name: string }).name, phone, tipo: `user:${(u as { role: string }).role}` });
    }

  // Dedupe por phone
  const seen = new Set<string>();
    const unique = recipients.filter(r => { if (seen.has(r.phone)) return false; seen.add(r.phone); return true; });

  const results = [];
    for (const r of unique) {
          const res = await sendWhatsAppText(r.phone, message, { origen: "bienvenida-broadcast", enviadoPor: "juanviverosv@gmail.com" });
          results.push({
                  nombre: r.nombre,
                  phone_last4: r.phone.slice(-4),
                  tipo: r.tipo,
                  success: res.success,
                  error: res.error || null,
          });
    }

  return NextResponse.json({
        total: results.length,
        enviados_ok: results.filter(r => r.success).length,
        fallidos: results.filter(r => !r.success).length,
        detalle: results,
  });
}
