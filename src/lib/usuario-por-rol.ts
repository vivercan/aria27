/**
 * Una sola forma de encontrar "al de Compras", "al de Dirección", etc. (6-Nov-2026 · protocolo de notificaciones)
 * Antes había 8 versiones: unas con .single() que fallan (nadie recibe aviso) si hay dos usuarios con el mismo rol,
 * otras sin filtrar activos. Esta: activo, no es perfil de prueba, el más antiguo primero. Nunca truena.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type UsuarioRol = { id?: number; email: string; phone: string | null; name?: string | null; display_name?: string | null; role?: string | null };

export async function usuarioPorRol(db: SupabaseClient, role: string): Promise<UsuarioRol | null> {
  const { data } = await db.from("Users").select("id, email, phone, name, display_name, role").eq("role", role).is("usuario_prueba", null)
    .or("active.is.null,active.eq.true").order("id", { ascending: true }).limit(1);
  const u = (data || [])[0] as UsuarioRol | undefined;
  return u?.email ? u : null;
}
export async function usuariosPorRol(db: SupabaseClient, role: string): Promise<UsuarioRol[]> {
  const { data } = await db.from("Users").select("id, email, phone, name, display_name, role").eq("role", role).is("usuario_prueba", null)
    .or("active.is.null,active.eq.true").order("id", { ascending: true });
  return ((data || []) as UsuarioRol[]).filter(u => !!u.email);
}
/** Roles que NO reciben ni autorizan requisiciones aunque estén como responsable de una obra (JJ 6-Nov-2026) */
export const ROLES_SIN_REQUISICIONES = ["residente"];
