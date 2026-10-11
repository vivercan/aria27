/**
 * Autorización de Dirección sin comparativa (gastos, efectivo, destajos, compra directa) · 11-Oct-2026
 * Compartido por /api/requisicion/autorizar-direccion (sesión, celular) y /api/requisicion/autorizar-token (link de WhatsApp/correo).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendWhatsAppTemplateOrFallback } from "@/lib/whatsapp";
import { logger } from "@/lib/logger";
const log = logger("AUTORIZAR-DIRECCION");

type R = { id: string; folio: string; status: string; user_email: string | null; cost_center_name: string | null; created_by: string | null; purchase_status: string | null; forma_pago: string | null; cotizacion_data: unknown; motivo_solicitud: string | null; notas: string | null; total: number | null; monto: number | null };
type U = { email: string; phone: string | null; name: string | null; display_name: string | null };

const tieneCot = (c: unknown) => {
  if (!c || typeof c !== "object") return false;
  const o = c as { quotes?: unknown[]; suppliers?: unknown[] };
  return (Array.isArray(o.quotes) && o.quotes.length > 0) || (Array.isArray(o.suppliers) && o.suppliers.length > 0);
};
const esQA = (r: R) => /\bQA\b/i.test(`${r.motivo_solicitud || ""} ${r.notas || ""}`) && /NO PROCESAR/i.test(`${r.motivo_solicitud || ""} ${r.notas || ""}`);
const money = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

export const tieneComparativa = tieneCot;

export async function resolverDireccion(db: SupabaseClient, ids: string[], action: "AUTORIZAR" | "RECHAZAR", comentario: string, me: string): Promise<{ hechas: string[]; saltadas: { folio: string; motivo: string }[]; error?: string }> {
  const { data, error } = await db.from("requisitions").select("id, folio, status, user_email, cost_center_name, created_by, purchase_status, forma_pago, cotizacion_data, motivo_solicitud, notas, total, monto").in("id", ids);
  if (error) return { hechas: [], saltadas: [], error: error.message };
  const rows = (data || []) as R[];

  const hechas: R[] = []; const saltadas: { folio: string; motivo: string }[] = [];
  const ahora = new Date().toISOString();
  for (const r of rows) {
    if (r.status !== "EN_AUTORIZACION") { saltadas.push({ folio: r.folio, motivo: "ya no espera a Dirección" }); continue; }
    if (action === "AUTORIZAR" && tieneCot(r.cotizacion_data)) { saltadas.push({ folio: r.folio, motivo: "tiene comparativa: elige proveedor" }); continue; }
    const cambios = action === "AUTORIZAR"
      ? { status: "APROBADA", authorized_by: me, authorized_at: ahora }
      : { status: "RECHAZADA_DIRECCION", authorized_by: me, authorized_at: ahora, notas: `${r.notas ? r.notas + "\n" : ""}Rechazada por Dirección: ${comentario}` };
    // condición de carrera: solo si sigue EN_AUTORIZACION
    const { data: up, error: upErr } = await db.from("requisitions").update(cambios).eq("id", r.id).eq("status", "EN_AUTORIZACION").select("id");
    if (upErr || !up?.length) { saltadas.push({ folio: r.folio, motivo: upErr?.message || "cambió mientras tanto" }); continue; }
    hechas.push(r);
    await db.from("event_log").insert({ tipo: action === "AUTORIZAR" ? "REQUISICION_AUTORIZADA_DIRECCION" : "REQUISICION_RECHAZADA_DIRECCION", resumen: `${r.folio} ${r.cost_center_name || ""} ${action === "AUTORIZAR" ? "autorizada" : "rechazada"} por Dirección (celular)`, detalle: comentario || null, actor: me, metadata: { folio: r.folio, id: r.id } }).then(() => {}, () => {});
  }

  // Avisos (best effort; nunca rompen la autorización)
  try {
    const { pushAEmail } = await import("@/lib/push");
    const avisables = hechas.filter(r => !esQA(r));
    const porPersona: Record<string, R[]> = {};
    for (const r of avisables) {
      const em = (r.user_email || "").toLowerCase(); if (!em || em === me) continue;
      (porPersona[em] ||= []).push(r);
      await pushAEmail(em, action === "AUTORIZAR"
        ? { title: `✅ ${r.folio} autorizada`, body: `${r.cost_center_name || ""} · Dirección la autorizó${/EFECTIVO|CAJA/i.test(r.forma_pago || "") || r.purchase_status === "GASTO_EFECTIVO_PENDIENTE" ? "; sigue el pago" : ""}`, url: `/dashboard/requisiciones/requisiciones/estatus?open=${r.id}`, tag: `req-${r.id}` }
        : { title: `❌ ${r.folio} rechazada`, body: `${r.cost_center_name || ""}: ${comentario}`.slice(0, 200), url: `/dashboard/requisiciones/requisiciones/estatus?open=${r.id}`, tag: `req-${r.id}` }).catch(() => {});
    }
    const emails = Object.keys(porPersona);
    if (emails.length) {
      const { data: us } = await db.from("Users").select("email, phone, name, display_name").in("email", emails);
      for (const u of (us || []) as U[]) {
        const lista = porPersona[u.email.toLowerCase()] || []; if (!u.phone || !lista.length) continue;
        const nom = (u.display_name || u.name || "Equipo").slice(0, 60);
        const folios = lista.map(x => x.folio).join(", ").slice(0, 300);
        const estado = action === "AUTORIZAR" ? "autorizada por Dirección" : `rechazada por Dirección: ${comentario}`;
        await sendWhatsAppTemplateOrFallback(
          { template: "aria_solicitud_estado", params: [nom, lista.length === 1 ? lista[0].folio : `${lista.length} solicitudes`, lista.length === 1 ? (lista[0].cost_center_name || "") : folios, estado.slice(0, 200)], buttonToken: lista[0].id },
          { template: "aria_tarea_status", params: [nom, "0", `${action === "AUTORIZAR" ? "✅" : "❌"} ${folios}: ${estado}`.slice(0, 700)] },
          u.phone, { origen: action === "AUTORIZAR" ? "direccion-autoriza-cel" : "direccion-rechaza-cel", enviadoPor: me });
      }
    }
    // Gasto en efectivo autorizado → tesorería (Administración) lo paga
    const efectivo = action === "AUTORIZAR" ? avisables.filter(r => r.purchase_status === "GASTO_EFECTIVO_PENDIENTE" || /EFECTIVO|CAJA/i.test(r.forma_pago || "")) : [];
    if (efectivo.length) {
      const { data: tes } = await db.from("Users").select("email").eq("role", "usuario").is("usuario_prueba", null).eq("active", true);
      const suma = efectivo.reduce((s, r) => s + (Number(r.total) || Number(r.monto) || 0), 0);
      for (const t of (tes || []) as { email: string }[]) await pushAEmail(t.email, { title: `💵 ${efectivo.length} gasto${efectivo.length === 1 ? "" : "s"} por pagar`, body: `Dirección autorizó ${efectivo.map(r => r.folio).join(", ").slice(0, 120)}${suma ? ` · ${money(suma)}` : ""}`, url: "/dashboard/campo/autorizar", tag: "efectivo-autorizado" }).catch(() => {});
    }
  } catch (e) { log.error("avisos", { data: String(e) }); }

  log.info(action, { hechas: hechas.length, saltadas: saltadas.length, by: me });
  return { hechas: hechas.map(r => r.folio), saltadas };
}
