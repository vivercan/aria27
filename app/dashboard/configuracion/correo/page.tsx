"use client";
import { useState } from "react";
import { Mail, Send, CheckCircle2, Settings, FileText, ShoppingCart, ClipboardCheck, Truck, AlertTriangle, Zap, TestTube } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";

const emailTemplates = [
  {
    id: "req-creada",
    name: "Requisición Creada",
    trigger: "Al crear una requisición nueva",
    recipients: "Creador + Compras + Dirección (según flujo)",
    icon: FileText,
    color: "text-aria-accent",
    bg: "bg-aria-primary/10",
    description: "Notifica al creador, solicita cotización a Compras o autorización a Dirección según la subcategoría del producto.",
  },
  {
    id: "solicitar-cotizacion",
    name: "Solicitud de Cotización",
    trigger: "Al solicitar cotización a proveedores",
    recipients: "Proveedores seleccionados",
    icon: ShoppingCart,
    color: "text-aria-accent",
    bg: "bg-aria-primary/10",
    description: "Envía solicitud formal de cotización a los proveedores seleccionados con detalle de productos requeridos.",
  },
  {
    id: "enviar-comparativa",
    name: "Comparativa de Precios",
    trigger: "Al enviar comparativa a Dirección",
    recipients: "Director General",
    icon: ClipboardCheck,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    description: "Tabla comparativa de proveedores con precios, tiempos de entrega y recomendación para autorización.",
  },
  {
    id: "autorizacion",
    name: "Autorización de Compra",
    trigger: "Al autorizar o rechazar una OC",
    recipients: "Compras + Solicitante",
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    description: "Notifica aprobación o rechazo de orden de compra. Incluye botones de un clic para autorizar/rechazar.",
  },
  {
    id: "validacion",
    name: "Validación de Requisición",
    trigger: "Al validar una requisición",
    recipients: "Compras (aprobación) o Solicitante (rechazo)",
    icon: Zap,
    color: "text-aria-accent",
    bg: "bg-aria-accent-bg",
    description: "Confirma validación de requisición o notifica rechazo con motivo al solicitante original.",
  },
  {
    id: "entrega",
    name: "Confirmación de Entrega",
    trigger: "Al registrar entrega de materiales",
    recipients: "Solicitante original",
    icon: Truck,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    description: "Confirma recepción de materiales con detalle de cantidades recibidas y actualiza inventario de obra.",
  },
];

export default function CorreoPage() {
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function sendTestEmail() {
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/mail/test", { method: "POST" });
      if (res.ok) {
        setTestResult({ ok: true, msg: "Email de prueba enviado correctamente" });
      } else {
        const data = await res.json().catch(() => ({}));
        setTestResult({ ok: false, msg: data?.error || "Error al enviar email de prueba" });
      }
    } catch {
      setTestResult({ ok: false, msg: "No se pudo conectar con el servidor" });
    }
    setTestSending(false);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <AriaBackButton href="/dashboard/configuracion" />

      <div className="sticky top-0 z-10 bg-gradient-to-b from-slate-950 via-slate-950/95 to-transparent pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Configuración de Correo</h1>
          <p className="text-[#7f93b0] text-sm">Servicio de email transaccional via Resend</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm text-emerald-400 font-medium">Resend Activo</span>
        </div>
      </div>

      {/* Configuración actual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-4 h-4 text-[#7f93b0]" />
            <span className="text-xs text-[#7f93b0]">Servicio</span>
          </div>
          <p className="text-white font-medium">Resend v6</p>
          <p className="text-xs text-[#4a6080] mt-1">API transaccional</p>
        </div>
        <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4 text-[#7f93b0]" />
            <span className="text-xs text-[#7f93b0]">Remitente</span>
          </div>
          <p className="text-white font-medium">noreply@mail.jjcrm27.com</p>
          <p className="text-xs text-[#4a6080] mt-1">ARIA27 &lt;noreply@mail.jjcrm27.com&gt;</p>
        </div>
        <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Send className="w-4 h-4 text-[#7f93b0]" />
            <span className="text-xs text-[#7f93b0]">Dominio</span>
          </div>
          <p className="text-white font-medium">mail.jjcrm27.com</p>
          <p className="text-xs text-[#4a6080] mt-1">DNS verificado en Resend</p>
        </div>
      </div>

      {/* Test email */}
      <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TestTube className="w-5 h-5 text-aria-accent" />
          <div>
            <p className="text-sm text-white font-medium">Enviar email de prueba</p>
            <p className="text-xs text-[#7f93b0]">Verifica que la configuración de Resend funcione correctamente</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {testResult && (
            <span className={`text-xs ${testResult.ok ? "text-emerald-400" : "text-red-400"}`}>{testResult.msg}</span>
          )}
          <button
            onClick={sendTestEmail}
            disabled={testSending}
            className="px-4 py-2 bg-aria-primary-light text-aria-accent rounded-lg text-sm font-medium hover:bg-aria-primary-hover/30 transition-colors disabled:opacity-50"
          >
            {testSending ? "Enviando..." : "Enviar Prueba"}
          </button>
        </div>
      </div>

      {/* Plantillas de email */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Plantillas de Email Activas</h2>
        <p className="text-sm text-[#7f93b0] mb-4">
          Todos los emails se envían automáticamente como parte del flujo de requisiciones.
          Las plantillas son HTML inline con colores de urgencia y botones de acción.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {emailTemplates.map((t) => (
            <div key={t.id} className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:border-white/[0.12] transition-colors">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${t.bg} flex-shrink-0`}>
                  <t.icon className={`w-5 h-5 ${t.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{t.name}</p>
                  <p className="text-xs text-[#7f93b0] mt-1">{t.description}</p>
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#4a6080] uppercase tracking-wide w-16">Trigger</span>
                      <span className="text-xs text-[#c9d8ed]">{t.trigger}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#4a6080] uppercase tracking-wide w-16">Para</span>
                      <span className="text-xs text-[#c9d8ed]">{t.recipients}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nota sobre Zoho */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-amber-300 font-medium">Nota sobre correo corporativo</p>
          <p className="text-xs text-amber-400/70">
            El correo corporativo (@gcuavante.com) se gestiona directamente en Zoho Mail.
            ARIA utiliza Resend exclusivamente para notificaciones transaccionales del sistema — no es un cliente de correo.
          </p>
        </div>
      </div>
    </div>
  );
}
