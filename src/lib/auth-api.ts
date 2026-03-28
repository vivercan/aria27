// src/lib/auth-api.ts â Middleware de autenticaciÃ³n para API routes
// PatrÃ³n: El frontend envÃ­a user_email en body/params, el middleware
// lo valida contra la tabla Users y verifica el rol.
// TODO: Migrar a Supabase Auth con JWT cuando estÃ© listo.

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export interface AuthResult {
  authorized: boolean;
  user?: {
    email: string;
    role: string;
    name: string;
    phone?: string;
  };
  error?: string;
}

/**
 * Valida que el usuario existe en la tabla Users y tiene uno de los roles permitidos.
 * @param userEmail - Email del usuario (viene del frontend via body o query param)
 * @param allowedRoles - Array de roles permitidos. Si vacÃ­o, cualquier usuario autenticado pasa.
 * @returns AuthResult con usuario validado o error
 */
export async function validateApiAuth(
  userEmail: string | null | undefined,
  allowedRoles: string[] = []
): Promise<AuthResult> {
  if (!userEmail) {
    return { authorized: false, error: "user_email requerido" };
  }

  const { data: user, error } = await supabase
    .from("Users")
    .select("email, role, name, phone")
    .eq("email", userEmail)
    .single();

  if (error || !user) {
    return { authorized: false, error: "Usuario no encontrado en el sistema" };
  }

  // Admin siempre tiene acceso
  if (user.role === "admin") {
    return { authorized: true, user };
  }

  // Si no se especifican roles, cualquier usuario autenticado pasa
  if (allowedRoles.length === 0) {
    return { authorized: true, user };
  }

  // Verificar que el rol del usuario estÃ¡ en la lista de permitidos
  if (!allowedRoles.includes(user.role)) {
    return {
      authorized: false,
      error: `Rol '${user.role}' no autorizado. Se requiere: ${allowedRoles.join(", ")}`,
    };
  }

  return { authorized: true, user };
}

/**
 * Helper para extraer user_email de body JSON o query params
 */
export function extractUserEmail(req: NextRequest, body?: any): string | null {
  // 1. Intentar del body
  if (body?.user_email) return body.user_email;

  // 2. Intentar del query param
  const emailParam = req.nextUrl.searchParams.get("user_email");
  if (emailParam) return emailParam;

  // 3. Intentar del header custom
  const emailHeader = req.headers.get("x-user-email");
  if (emailHeader) return emailHeader;

  return null;
}

/**
 * Respuesta estÃ¡ndar de error de autenticaciÃ³n
 */
export function unauthorizedResponse(message: string = "No autorizado"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}
