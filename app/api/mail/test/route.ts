import { NextResponse } from "next/server";
import { Resend } from "resend";
import { logger } from "@/lib/logger";
const log = logger("MAIL-TEST");

export async function POST() {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>",
      to: ["juanviverosv@gmail.com"],
      subject: "✅ ARIA27 — Email de prueba",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f172a;border-radius:12px;color:#e2e8f0;">
          <div style="text-align:center;margin-bottom:20px;">
            <h1 style="color:#60a5fa;margin:0;font-size:20px;">ARIA27</h1>
            <p style="color:#94a3b8;font-size:12px;margin:4px 0 0;">Sistema ERP — Grupo Constructor Urbano Avante</p>
          </div>
          <div style="background:#1e293b;border-radius:8px;padding:16px;text-align:center;">
            <p style="color:#34d399;font-size:16px;font-weight:bold;margin:0 0 8px;">✅ Conexión exitosa</p>
            <p style="color:#94a3b8;font-size:13px;margin:0;">El servicio de correo Resend está funcionando correctamente.</p>
          </div>
          <p style="color:#64748b;font-size:11px;text-align:center;margin-top:16px;">
            Enviado desde aria.jjcrm27.com el ${new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" })}
          </p>
        </div>
      `,
    });

    if (error) {
      log.error("Error enviando test email", { error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    log.info("Test email enviado", { id: data?.id });
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e: any) {
    log.error("Exception en test email", { error: e?.message });
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}
