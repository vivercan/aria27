/**
 * ARIA27 Actividades · helpers de servidor (10-Oct-2026)
 * Avisos por WhatsApp con la plantilla aprobada aria_tarea_status (funciona fuera de la ventana de 24 h).
 * Meta no acepta saltos de linea en parametros: todo mensaje va en una sola linea.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendWhatsAppLogged } from "@/lib/whatsapp";

export type Persona = { nombre: string; email: string | null; phone: string | null };

const limpiar = (s: string) => String(s || "").replace(/[\r\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim();

/** Busca nombre y celular de una persona por correo de usuario (users) o por empleado. */
export async function personaPorEmail(db: SupabaseClient, email?: string | null): Promise<Persona | null> {
  const em = String(email || "").toLowerCase().trim();
  if (!em) return null;
  const { data: u } = await db.from("Users").select("email, name, display_name, phone").ilike("email", em).maybeSingle();
  const uu = u as { email?: string; name?: string; display_name?: string; phone?: string } | null;
  let phone = uu?.phone || null; let nombre = uu?.display_name || uu?.name || "";
  if (!phone || !nombre) {
    const { data: e } = await db.from("employees").select("full_name, whatsapp").or(`usuario_email.eq.${em},email.eq.${em}`).limit(1).maybeSingle();
    const ee = e as { full_name?: string; whatsapp?: string } | null;
    phone = phone || ee?.whatsapp || null; nombre = nombre || ee?.full_name || em;
  }
  return { nombre: nombre || em, email: em, phone };
}

export async function personaPorEmpleado(db: SupabaseClient, empleadoId?: string | null): Promise<Persona | null> {
  if (!empleadoId) return null;
  const { data: e } = await db.from("employees").select("full_name, whatsapp, email, usuario_email").eq("id", empleadoId).maybeSingle();
  const ee = e as { full_name?: string; whatsapp?: string; email?: string; usuario_email?: string } | null;
  if (!ee) return null;
  return { nombre: ee.full_name || "", email: (ee.usuario_email || ee.email || null)?.toLowerCase() || null, phone: ee.whatsapp || null };
}

export async function avisarWA(p: Persona | null, mensaje: string, origen: string, enviadoPor: string): Promise<boolean> {
  if (!p?.phone) return false;
  const nombre = limpiar(p.nombre).split(" ")[0] || "Hola";
  const r = await sendWhatsAppLogged("aria_tarea_status", [nombre, "0", limpiar(mensaje).slice(0, 700)], p.phone, { origen, enviadoPor });
  return !!r.success;
}

export async function registrarActualizacion(db: SupabaseClient, row: { tarea_id: string; autor_email: string; autor_nombre?: string | null; tipo: string; texto?: string | null; foto_url?: string | null; archivo_url?: string | null; archivo_nombre?: string | null }) {
  await db.from("tarea_actualizaciones").insert({ ...row, autor_nombre: row.autor_nombre || row.autor_email });
}

export function urlActividad(id: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://aria.jjcrm27.com";
  return `${base.replace(/\/$/, "")}/dashboard/actividades?abrir=${id}`;
}
